import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createErrorResponse,
  createUnauthorizedError,
  createNotFoundError,
} from "@/lib/utils/api-error";

/**
 * POST /api/demo/dismiss-conversion
 * Track when user dismisses demo conversion prompt
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  try {
    // Get current demo session
    const { data: demoSession } = await supabase
      .from('demo_mode_sessions')
      .select('*')
      .eq('user_id', user.id)
      .is('converted_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    if (!demoSession) {
      return createNotFoundError("Demo session");
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
  } catch (error: unknown) {
    console.error('Demo dismissal tracking error:', error);
    return createErrorResponse(error as { message: string }, 500, "Failed to track demo dismissal");
  }
}
