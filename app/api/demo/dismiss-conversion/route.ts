import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/demo/dismiss-conversion
 * Track when user dismisses demo conversion prompt
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get current demo session
    const { data: demoSession } = await supabase
      .from('demo_mode_sessions')
      .select('*')
      .eq('user_id', session.user.id)
      .is('converted_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    if (!demoSession) {
      return NextResponse.json(
        { error: "No active demo session found" },
        { status: 404 }
      );
    }

    // Increment dismissal count in metadata
    const currentMetadata = demoSession.session_metadata || {};
    const dismissalCount = (currentMetadata.conversion_dismissals || 0) + 1;

    await supabase
      .from('demo_mode_sessions')
      .update({
        session_metadata: {
          ...currentMetadata,
          conversion_dismissals: dismissalCount,
          last_dismissal_at: new Date().toISOString(),
        },
      })
      .eq('id', demoSession.id);

    return NextResponse.json({
      ok: true,
      dismissalCount,
    });
  } catch (error: any) {
    console.error('Demo dismissal tracking error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
