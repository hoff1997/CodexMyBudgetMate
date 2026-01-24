import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import {
  createErrorResponse,
  createUnauthorizedError,
} from "@/lib/utils/api-error";

/**
 * POST /api/onboarding/steps/allocations
 * Updates envelope funding_sources based on income allocations
 * This maps the client-side allocation structure to the database structure
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
    const { envelopeAllocations, currentStep, highestStepReached } = body as {
      envelopeAllocations: { [envelopeTempId: string]: { [incomeTempId: string]: number } };
      currentStep?: number;
      highestStepReached?: number;
    };

    if (!envelopeAllocations || typeof envelopeAllocations !== "object") {
      return NextResponse.json(
        { success: false, error: "envelopeAllocations object is required" },
        { status: 400 }
      );
    }

    // Get mapping from temp IDs to real IDs for both envelopes and income sources
    const { data: envelopes } = await supabase
      .from("envelopes")
      .select("id, onboarding_temp_id, name")
      .eq("user_id", user.id)
      .eq("is_onboarding_draft", true);

    const { data: incomeSources } = await supabase
      .from("recurring_income")
      .select("id, onboarding_temp_id, name")
      .eq("user_id", user.id)
      .eq("is_onboarding_draft", true);

    if (!envelopes || envelopes.length === 0) {
      return NextResponse.json(
        { success: false, error: "No draft envelopes found" },
        { status: 400 }
      );
    }

    if (!incomeSources || incomeSources.length === 0) {
      return NextResponse.json(
        { success: false, error: "No draft income sources found" },
        { status: 400 }
      );
    }

    // Build lookup maps
    const envelopeTempToReal = new Map<string, string>();
    const envelopeRealToName = new Map<string, string>();
    for (const env of envelopes) {
      if (env.onboarding_temp_id) {
        envelopeTempToReal.set(env.onboarding_temp_id, env.id);
      }
      envelopeRealToName.set(env.id, env.name);
    }

    const incomeTempToReal = new Map<string, string>();
    const incomeRealToName = new Map<string, string>();
    for (const income of incomeSources) {
      if (income.onboarding_temp_id) {
        incomeTempToReal.set(income.onboarding_temp_id, income.id);
      }
      incomeRealToName.set(income.id, income.name);
    }

    // Update each envelope with its funding_sources
    let updatedCount = 0;

    for (const [envelopeTempId, incomeAllocations] of Object.entries(envelopeAllocations)) {
      const realEnvelopeId = envelopeTempToReal.get(envelopeTempId);
      if (!realEnvelopeId) {
        console.warn(`Could not find real envelope ID for temp ID: ${envelopeTempId}`);
        continue;
      }

      // Build funding_sources array
      const fundingSources: Array<{
        income_id: string;
        income_name: string;
        amount: number;
      }> = [];

      // Calculate total pay cycle amount
      let totalPayCycleAmount = 0;

      for (const [incomeTempId, amount] of Object.entries(incomeAllocations)) {
        if (amount <= 0) continue;

        const realIncomeId = incomeTempToReal.get(incomeTempId);
        if (!realIncomeId) {
          console.warn(`Could not find real income ID for temp ID: ${incomeTempId}`);
          continue;
        }

        const incomeName = incomeRealToName.get(realIncomeId) || "Unknown";

        fundingSources.push({
          income_id: realIncomeId,
          income_name: incomeName,
          amount,
        });

        totalPayCycleAmount += amount;
      }

      // Update envelope
      const { error: updateError } = await supabase
        .from("envelopes")
        .update({
          funding_sources: fundingSources,
          pay_cycle_amount: totalPayCycleAmount,
          updated_at: new Date().toISOString(),
        })
        .eq("id", realEnvelopeId);

      if (updateError) {
        console.error(`Error updating envelope ${realEnvelopeId}:`, updateError);
      } else {
        updatedCount++;
      }
    }

    // Also update recurring_income with their allocations
    for (const income of incomeSources) {
      const incomeAllocArray: Array<{ envelopeId: string; amount: number }> = [];

      for (const [envelopeTempId, incomeAllocations] of Object.entries(envelopeAllocations)) {
        const amount = incomeAllocations[income.onboarding_temp_id || ""] || 0;
        if (amount > 0) {
          const realEnvelopeId = envelopeTempToReal.get(envelopeTempId);
          if (realEnvelopeId) {
            incomeAllocArray.push({
              envelopeId: realEnvelopeId,
              amount,
            });
          }
        }
      }

      if (incomeAllocArray.length > 0) {
        await supabase
          .from("recurring_income")
          .update({
            allocations: incomeAllocArray,
            updated_at: new Date().toISOString(),
          })
          .eq("id", income.id);
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
      message: "Allocations saved",
      updatedCount,
    });
  } catch (error) {
    console.error("Allocations save error:", error);
    return createErrorResponse(
      error as { message: string },
      500,
      "Internal server error"
    );
  }
}
