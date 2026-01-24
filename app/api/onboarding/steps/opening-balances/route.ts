import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import {
  createErrorResponse,
  createUnauthorizedError,
} from "@/lib/utils/api-error";

/**
 * POST /api/onboarding/steps/opening-balances
 * Updates envelope opening_balance and current_amount fields
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return createUnauthorizedError();
    }

    const body = await request.json();
    const { openingBalances, currentStep, highestStepReached } = body as {
      openingBalances: { [envelopeTempId: string]: number };
      currentStep?: number;
      highestStepReached?: number;
    };

    if (!openingBalances || typeof openingBalances !== "object") {
      return NextResponse.json(
        { success: false, error: "openingBalances object is required" },
        { status: 400 }
      );
    }

    // Get mapping from temp IDs to real IDs
    const { data: envelopes } = await supabase
      .from("envelopes")
      .select("id, onboarding_temp_id, name")
      .eq("user_id", user.id)
      .eq("is_onboarding_draft", true);

    if (!envelopes || envelopes.length === 0) {
      return NextResponse.json(
        { success: false, error: "No draft envelopes found" },
        { status: 400 }
      );
    }

    // Build lookup map
    const envelopeTempToReal = new Map<string, string>();
    for (const env of envelopes) {
      if (env.onboarding_temp_id) {
        envelopeTempToReal.set(env.onboarding_temp_id, env.id);
      }
    }

    // Update each envelope with its opening balance
    let updatedCount = 0;

    for (const [envelopeTempId, amount] of Object.entries(openingBalances)) {
      const realEnvelopeId = envelopeTempToReal.get(envelopeTempId);
      if (!realEnvelopeId) {
        console.warn(`Could not find real envelope ID for temp ID: ${envelopeTempId}`);
        continue;
      }

      const { error: updateError } = await supabase
        .from("envelopes")
        .update({
          opening_balance: amount,
          current_amount: amount, // Set current to opening initially
          updated_at: new Date().toISOString(),
        })
        .eq("id", realEnvelopeId);

      if (updateError) {
        console.error(`Error updating envelope ${realEnvelopeId}:`, updateError);
      } else {
        updatedCount++;
      }
    }

    // Update profile step progress
    const profileUpdate: Record<string, unknown> = {
      onboarding_last_saved_at: new Date().toISOString(),
      has_onboarding_draft: true,
    };

    if (typeof currentStep === "number") {
      profileUpdate.onboarding_current_step = currentStep;
    }

    if (typeof highestStepReached === "number") {
      profileUpdate.onboarding_highest_step = highestStepReached;
    }

    await supabase.from("profiles").update(profileUpdate).eq("id", user.id);

    return NextResponse.json({
      success: true,
      message: "Opening balances saved",
      updatedCount,
    });
  } catch (error) {
    console.error("Opening balances save error:", error);
    return createErrorResponse(
      error as { message: string },
      500,
      "Internal server error"
    );
  }
}
