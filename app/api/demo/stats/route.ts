import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createErrorResponse,
  createUnauthorizedError,
} from "@/lib/utils/api-error";

/**
 * GET /api/demo/stats
 * Get demo mode statistics for current user
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  try {
    // Get active demo session
    const { data: demoSession } = await supabase
      .from('demo_mode_sessions')
      .select('*')
      .eq('user_id', user.id)
      .is('converted_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    if (!demoSession) {
      return NextResponse.json({
        isDemo: false,
      });
    }

    // Calculate days in demo
    const startDate = new Date(demoSession.started_at);
    const now = new Date();
    const daysInDemo = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    // Get user achievements
    const { data: achievements, count: achievementCount } = await supabase
      .from('user_achievements')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id);

    // Get envelope count
    const { count: envelopeCount } = await supabase
      .from('envelopes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // Get transaction count
    const { count: transactionCount } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // Get goal count
    const { count: goalCount } = await supabase
      .from('goals')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // Get dismissal count from metadata
    const metadata = demoSession.session_metadata || {};
    const dismissalCount = metadata.conversion_dismissals || 0;

    return NextResponse.json({
      isDemo: true,
      daysInDemo,
      startedAt: demoSession.started_at,
      achievementsEarned: achievementCount || 0,
      envelopesCreated: envelopeCount || 0,
      transactionsTracked: transactionCount || 0,
      goalsCreated: goalCount || 0,
      dismissalCount,
      lastDismissalAt: metadata.last_dismissal_at || null,
    });
  } catch (error: unknown) {
    console.error('Demo stats error:', error);
    return createErrorResponse(error as { message: string }, 500, "Failed to fetch demo stats");
  }
}
