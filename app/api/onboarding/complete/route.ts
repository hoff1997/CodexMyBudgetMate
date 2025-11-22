import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const schema = z.object({
  persona: z.enum(['beginner', 'optimiser', 'wealth_builder']).optional(),
  dataChoice: z.enum(['demo', 'akahu', 'csv', 'manual']).optional(),
  completedAt: z.string(),
});

/**
 * POST /api/onboarding/complete
 * Save onboarding completion state
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error },
      { status: 400 }
    );
  }

  const { persona, dataChoice, completedAt } = parsed.data;

  try {
    // Update profile with onboarding completion
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        user_persona: persona,
        onboarding_completed: true,
        onboarding_step: 5,
        show_onboarding_menu: false,
        last_activity_context: {
          action: 'onboarding_complete',
          timestamp: completedAt,
          dataChoice,
        },
      })
      .eq('user_id', session.user.id);

    if (profileError) {
      console.error('Profile update error:', profileError);
      return NextResponse.json(
        { error: profileError.message },
        { status: 400 }
      );
    }

    // Track onboarding completion feature
    const { error: progressError } = await supabase.rpc('track_feature_usage', {
      p_user_id: session.user.id,
      p_feature_key: 'onboarding',
      p_metadata: { persona, dataChoice, completedAt },
    });

    if (progressError) {
      console.error('Progress tracking error:', progressError);
      // Don't fail the request, just log
    }

    // If demo mode, create demo session
    if (dataChoice === 'demo') {
      const { error: demoError } = await supabase
        .from('demo_mode_sessions')
        .insert({
          user_id: session.user.id,
          started_at: completedAt,
          session_metadata: { persona, source: 'onboarding' },
        });

      if (demoError) {
        console.error('Demo session error:', demoError);
        // Don't fail the request
      }
    }

    return NextResponse.json({ ok: true, persona, dataChoice });
  } catch (error: any) {
    console.error('Onboarding completion error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
