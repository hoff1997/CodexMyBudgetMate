import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { createSuggestedEnvelopes } from "@/lib/utils/suggested-envelopes";
import {
  createErrorResponse,
  createUnauthorizedError,
  createValidationError,
} from "@/lib/utils/api-error";

const schema = z.object({
  dataChoice: z.enum(['demo', 'akahu', 'csv', 'manual']).optional(),
  completedAt: z.string(),
  useDirectToMain: z.boolean().optional(), // Flag to use new direct-to-main system
});

/**
 * POST /api/onboarding/complete
 * Complete onboarding and transition data from draft state to live
 *
 * For direct-to-main system (new):
 *   - Flips is_onboarding_draft=false on all records
 *   - Resets profile onboarding progress
 *
 * For legacy system:
 *   - Just marks profile as complete (data already committed via /api/onboarding/unified)
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return createValidationError("Invalid payload");
  }

  const { dataChoice, completedAt, useDirectToMain } = parsed.data;

  try {
    // =========================================================================
    // NEW SYSTEM: Direct-to-main completion (flip draft flags)
    // =========================================================================
    if (useDirectToMain) {
      // Use the database function to complete onboarding
      const { error: completeError } = await supabase.rpc('complete_onboarding', {
        p_user_id: user.id,
      });

      if (completeError) {
        // Fallback to manual updates if function doesn't exist yet
        console.warn('complete_onboarding function error, falling back to manual:', completeError);

        // Mark all draft envelopes as complete
        await supabase
          .from('envelopes')
          .update({ is_onboarding_draft: false, onboarding_temp_id: null })
          .eq('user_id', user.id)
          .eq('is_onboarding_draft', true);

        // Mark all draft income sources as complete
        await supabase
          .from('recurring_income')
          .update({ is_onboarding_draft: false, onboarding_temp_id: null })
          .eq('user_id', user.id)
          .eq('is_onboarding_draft', true);

        // Mark all draft accounts as complete
        await supabase
          .from('accounts')
          .update({ is_onboarding_draft: false, onboarding_temp_id: null })
          .eq('user_id', user.id)
          .eq('is_onboarding_draft', true);

        // Mark all draft categories as complete
        await supabase
          .from('envelope_categories')
          .update({ is_onboarding_draft: false })
          .eq('user_id', user.id)
          .eq('is_onboarding_draft', true);

        // Mark all draft gift recipients as complete
        await supabase
          .from('gift_recipients')
          .update({ is_onboarding_draft: false })
          .eq('user_id', user.id)
          .eq('is_onboarding_draft', true);

        // Mark all draft debt items as complete
        await supabase
          .from('debt_items')
          .update({ is_onboarding_draft: false })
          .eq('user_id', user.id)
          .eq('is_onboarding_draft', true);

        // Update profile
        await supabase
          .from('profiles')
          .update({
            onboarding_completed: true,
            onboarding_current_step: 0,
            has_onboarding_draft: false,
            show_onboarding_menu: false,
            last_activity_context: {
              action: 'onboarding_complete',
              timestamp: completedAt,
              dataChoice,
              system: 'direct-to-main',
            },
          })
          .eq('id', user.id);
      }
    } else {
      // =========================================================================
      // LEGACY SYSTEM: Just mark profile as complete
      // =========================================================================
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
        .eq('id', user.id);

      if (profileError) {
        console.error('Profile update error:', profileError);
        return createErrorResponse(profileError, 400, "Failed to update profile");
      }
    }

    // Create "The My Budget Way" suggested envelopes (for both systems)
    const suggestedResult = await createSuggestedEnvelopes(supabase, user.id);
    if (!suggestedResult.success) {
      console.error('Suggested envelopes error:', suggestedResult.error);
      // Don't fail the request, just log
    }

    // Track onboarding completion feature
    const { error: progressError } = await supabase.rpc('track_feature_usage', {
      p_user_id: user.id,
      p_feature_key: 'onboarding',
      p_metadata: { dataChoice, completedAt, useDirectToMain: !!useDirectToMain },
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

    // Delete legacy onboarding_drafts record if exists (cleanup)
    if (useDirectToMain) {
      await supabase
        .from('onboarding_drafts')
        .delete()
        .eq('user_id', user.id);
    }

    return NextResponse.json({
      ok: true,
      dataChoice,
      system: useDirectToMain ? 'direct-to-main' : 'legacy',
    });
  } catch (error) {
    console.error('Onboarding completion error:', error);
    return createErrorResponse(error as { message: string }, 500, "Internal server error");
  }
}
