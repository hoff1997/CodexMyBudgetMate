import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isBetaMode } from '@/lib/subscription';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get subscription with plan details
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select(`
        *,
        plan:subscription_plans(*)
      `)
      .eq('user_id', user.id)
      .single();

    // Get free plan as fallback
    const { data: freePlan } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('slug', 'free')
      .single();

    // Calculate trial info
    const trialInfo = subscription?.status === 'trialing' && subscription?.trial_end
      ? {
          isTrialing: true,
          trialEndsAt: subscription.trial_end,
          daysRemaining: Math.max(0, Math.ceil(
            (new Date(subscription.trial_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          )),
        }
      : { isTrialing: false, trialEndsAt: null, daysRemaining: null };

    return NextResponse.json({
      subscription: subscription || null,
      currentPlan: subscription?.plan || freePlan,
      isActive: subscription?.status === 'active' || subscription?.status === 'trialing',
      isBetaMode: isBetaMode(),
      trial: trialInfo,
    });

  } catch (error) {
    console.error('Subscription fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
      { status: 500 }
    );
  }
}
