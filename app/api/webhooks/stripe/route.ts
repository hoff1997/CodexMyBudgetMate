import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe/server';
import { createClient } from '@supabase/supabase-js';

// Use service role for webhooks (no user context)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutComplete(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id;

  if (!userId) {
    console.error('No user_id in checkout session metadata');
    return;
  }

  // Subscription is created via customer.subscription.created event
  // Just log the successful checkout
  console.log(`Checkout completed for user ${userId}`);
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  // Find user by Stripe customer ID
  const { data: existingSub } = await supabaseAdmin
    .from('subscriptions')
    .select('user_id, plan_id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!existingSub) {
    console.error(`No subscription found for customer ${customerId}`);
    return;
  }

  // Get the Pro plan ID
  const { data: proPlan } = await supabaseAdmin
    .from('subscription_plans')
    .select('id')
    .eq('slug', 'pro')
    .single();

  // Map Stripe status to our status
  const statusMap: Record<string, string> = {
    'active': 'active',
    'trialing': 'trialing',
    'past_due': 'past_due',
    'canceled': 'cancelled',
    'unpaid': 'past_due',
    'incomplete': 'inactive',
    'incomplete_expired': 'inactive',
    'paused': 'inactive',
  };

  // Get period dates from subscription items (new API structure)
  const subItem = subscription.items.data[0];
  const periodStart = (subscription as unknown as { current_period_start?: number }).current_period_start;
  const periodEnd = (subscription as unknown as { current_period_end?: number }).current_period_end;

  // Update subscription in database
  await supabaseAdmin
    .from('subscriptions')
    .update({
      plan_id: proPlan?.id,
      stripe_subscription_id: subscription.id,
      stripe_price_id: subItem?.price.id,
      status: statusMap[subscription.status] || 'inactive',
      current_period_start: periodStart
        ? new Date(periodStart * 1000).toISOString()
        : null,
      current_period_end: periodEnd
        ? new Date(periodEnd * 1000).toISOString()
        : null,
      cancel_at_period_end: subscription.cancel_at_period_end,
      trial_start: subscription.trial_start
        ? new Date(subscription.trial_start * 1000).toISOString()
        : null,
      trial_end: subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_customer_id', customerId);

  console.log(`Subscription updated for customer ${customerId}: ${subscription.status}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  // Get the Free plan ID
  const { data: freePlan } = await supabaseAdmin
    .from('subscription_plans')
    .select('id')
    .eq('slug', 'free')
    .single();

  // Downgrade to free plan
  await supabaseAdmin
    .from('subscriptions')
    .update({
      plan_id: freePlan?.id,
      stripe_subscription_id: null,
      stripe_price_id: null,
      status: 'inactive',
      current_period_start: null,
      current_period_end: null,
      cancel_at_period_end: false,
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_customer_id', customerId);

  console.log(`Subscription deleted for customer ${customerId}`);
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  // Find user
  const { data: subscription } = await supabaseAdmin
    .from('subscriptions')
    .select('user_id, id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!subscription) return;

  // Get payment intent from invoice (handle both string and object formats)
  const paymentIntent = (invoice as unknown as { payment_intent?: string | { id: string } | null }).payment_intent;
  const paymentIntentId = typeof paymentIntent === 'string'
    ? paymentIntent
    : paymentIntent?.id ?? null;

  // Record payment
  await supabaseAdmin.from('payments').insert({
    user_id: subscription.user_id,
    subscription_id: subscription.id,
    stripe_payment_intent_id: paymentIntentId,
    stripe_invoice_id: invoice.id,
    amount: (invoice.amount_paid || 0) / 100, // Convert from cents
    currency: invoice.currency,
    status: 'succeeded',
    description: invoice.description || 'Subscription payment',
  });

  console.log(`Payment succeeded for customer ${customerId}: $${(invoice.amount_paid || 0) / 100}`);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  // Find user
  const { data: subscription } = await supabaseAdmin
    .from('subscriptions')
    .select('user_id, id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!subscription) return;

  // Get payment intent from invoice (handle both string and object formats)
  const paymentIntent = (invoice as unknown as { payment_intent?: string | { id: string } | null }).payment_intent;
  const paymentIntentId = typeof paymentIntent === 'string'
    ? paymentIntent
    : paymentIntent?.id ?? null;

  // Record failed payment
  await supabaseAdmin.from('payments').insert({
    user_id: subscription.user_id,
    subscription_id: subscription.id,
    stripe_payment_intent_id: paymentIntentId,
    stripe_invoice_id: invoice.id,
    amount: (invoice.amount_due || 0) / 100,
    currency: invoice.currency,
    status: 'failed',
    description: 'Payment failed',
  });

  // Update subscription status
  await supabaseAdmin
    .from('subscriptions')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_customer_id', customerId);

  console.log(`Payment failed for customer ${customerId}`);
}
