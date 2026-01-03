import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { createSuggestedEnvelopes } from "@/lib/utils/suggested-envelopes";

const schema = z.object({
  dataChoice: z.enum(['demo', 'akahu', 'csv', 'manual']).optional(),
  completedAt: z.string(),
});

/**
 * POST /api/onboarding/complete
 * Save onboarding completion state (legacy endpoint)
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
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

  const { dataChoice, completedAt } = parsed.data;

  try {
    // Update profile with onboarding completion
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        onboarding_completed: true,
        onboarding_step: 5,
        show_onboarding_menu: false,
        last_activity_context: {
          action: 'onboarding_complete',
          timestamp: completedAt,
          dataChoice,
        },
      })
      .eq('user_id', user.id);

    if (profileError) {
      console.error('Profile update error:', profileError);
      return NextResponse.json(
        { error: profileError.message },
        { status: 400 }
      );
    }

    // Create "The My Budget Way" suggested envelopes
    const suggestedResult = await createSuggestedEnvelopes(supabase, user.id);
    if (!suggestedResult.success) {
      console.error('Suggested envelopes error:', suggestedResult.error);
      // Don't fail the request, just log
    }

    // Track onboarding completion feature
    const { error: progressError } = await supabase.rpc('track_feature_usage', {
      p_user_id: user.id,
      p_feature_key: 'onboarding',
      p_metadata: { dataChoice, completedAt },
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
          user_id: user.id,
          started_at: completedAt,
          session_metadata: { source: 'onboarding' },
        });

      if (demoError) {
        console.error('Demo session error:', demoError);
        // Don't fail the request
      }
    }

    return NextResponse.json({ ok: true, dataChoice });
  } catch (error: any) {
    console.error('Onboarding completion error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
