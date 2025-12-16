import { createClient } from '@/lib/supabase/server';
import { Subscription, SubscriptionPlan, PlanLimits, Feature } from '@/lib/types/subscription';

// Check if we're in beta mode (everyone gets full access)
export function isBetaMode(): boolean {
  return process.env.BETA_MODE === 'true';
}

// Get current user's subscription
export async function getSubscription(): Promise<Subscription | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select(`
      *,
      plan:subscription_plans(*)
    `)
    .eq('user_id', user.id)
    .single();

  return subscription;
}

// Get all available plans
export async function getPlans(): Promise<SubscriptionPlan[]> {
  const supabase = await createClient();

  const { data: plans } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');

  return plans || [];
}

// Check if user has active subscription
export async function hasActiveSubscription(): Promise<boolean> {
  // Beta mode = everyone has access
  if (isBetaMode()) return true;

  const subscription = await getSubscription();

  return subscription?.status === 'active' || subscription?.status === 'trialing';
}

// Check if user can access a specific feature
export async function canAccessFeature(feature: Feature): Promise<boolean> {
  // Beta mode = all features unlocked
  if (isBetaMode()) return true;

  const subscription = await getSubscription();

  // No subscription = free plan features only
  if (!subscription || subscription.status === 'inactive') {
    const freePlan = await getFreePlan();
    return freePlan?.features.includes(feature) || false;
  }

  // Check if plan includes feature
  const features = subscription.plan?.features || [];
  return features.includes(feature);
}

// Check if user is within plan limits
export async function isWithinLimit(
  limitType: keyof PlanLimits,
  currentCount: number
): Promise<boolean> {
  // Beta mode = no limits
  if (isBetaMode()) return true;

  const subscription = await getSubscription();

  let limits: PlanLimits;

  if (!subscription || subscription.status === 'inactive') {
    const freePlan = await getFreePlan();
    limits = freePlan?.limits || { envelopes: 10, accounts: 2, income_sources: 1 };
  } else {
    limits = subscription.plan?.limits || { envelopes: -1, accounts: -1, income_sources: -1 };
  }

  const limit = limits[limitType];

  // -1 = unlimited
  if (limit === -1) return true;

  return currentCount < limit;
}

// Get remaining count for a limit
export async function getRemainingLimit(
  limitType: keyof PlanLimits,
  currentCount: number
): Promise<number | null> {
  // Beta mode = unlimited
  if (isBetaMode()) return null;

  const subscription = await getSubscription();

  let limits: PlanLimits;

  if (!subscription || subscription.status === 'inactive') {
    const freePlan = await getFreePlan();
    limits = freePlan?.limits || { envelopes: 10, accounts: 2, income_sources: 1 };
  } else {
    limits = subscription.plan?.limits || { envelopes: -1, accounts: -1, income_sources: -1 };
  }

  const limit = limits[limitType];

  // -1 = unlimited
  if (limit === -1) return null;

  return Math.max(0, limit - currentCount);
}

// Helper to get free plan
async function getFreePlan(): Promise<SubscriptionPlan | null> {
  const supabase = await createClient();

  const { data: plan } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('slug', 'free')
    .single();

  return plan;
}

// Get user's Stripe customer ID (or create one)
export async function getOrCreateStripeCustomer(userId: string, email: string): Promise<string> {
  const supabase = await createClient();

  // Check if user already has a subscription record with customer ID
  const { data: existing } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .single();

  if (existing?.stripe_customer_id) {
    return existing.stripe_customer_id;
  }

  // Create new Stripe customer
  const { stripe } = await import('@/lib/stripe/server');

  const customer = await stripe.customers.create({
    email,
    metadata: {
      supabase_user_id: userId,
    },
  });

  // Save customer ID
  await supabase.from('subscriptions').upsert({
    user_id: userId,
    stripe_customer_id: customer.id,
    status: 'inactive',
  });

  return customer.id;
}
