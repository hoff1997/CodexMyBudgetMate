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

    return NextResponse.json({
      subscription: subscription || null,
      currentPlan: subscription?.plan || freePlan,
      isActive: subscription?.status === 'active' || subscription?.status === 'trialing',
      isBetaMode: isBetaMode(),
    });

  } catch (error) {
    console.error('Subscription fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
      { status: 500 }
    );
  }
}
