import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe/server';
import { getOrCreateStripeCustomer } from '@/lib/subscription';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { priceId, interval } = await request.json();

    if (!priceId) {
      return NextResponse.json({ error: 'Price ID required' }, { status: 400 });
    }

    // Get or create Stripe customer
    const customerId = await getOrCreateStripeCustomer(user.id, user.email!);

    // Check if user already has an active/trialing subscription (no trial for returning users)
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('id, status')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .maybeSingle();

    const isFirstSubscription = !existingSub;

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      billing_address_collection: 'auto',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      allow_promotion_codes: true,
      // Grant 14-day free trial for first-time subscribers
      ...(isFirstSubscription && {
        subscription_data: {
          trial_period_days: 14,
        },
      }),
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?subscription=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?subscription=cancelled`,
      metadata: {
        user_id: user.id,
        interval: interval || 'monthly',
      },
    });

    return NextResponse.json({ url: session.url });

  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
