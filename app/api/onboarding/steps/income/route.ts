import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import {
  createErrorResponse,
  createUnauthorizedError,
} from "@/lib/utils/api-error";

interface IncomeSourceInput {
  id: string; // Temporary client-side ID
  name: string;
  amount: number;
  frequency: "weekly" | "fortnightly" | "twice_monthly" | "monthly";
  nextPayDate?: string;
}

/**
 * POST /api/onboarding/steps/income
 * Upserts income sources to recurring_income table with is_onboarding_draft=true
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
    const { incomeSources, currentStep, highestStepReached } = body as {
      incomeSources: IncomeSourceInput[];
      currentStep?: number;
      highestStepReached?: number;
    };

    if (!incomeSources || !Array.isArray(incomeSources)) {
      return NextResponse.json(
        { success: false, error: "incomeSources array is required" },
        { status: 400 }
      );
    }

    // Get existing draft income sources to compare
    const { data: existingIncomes } = await supabase
      .from("recurring_income")
      .select("id, onboarding_temp_id, name")
      .eq("user_id", user.id)
      .eq("is_onboarding_draft", true);

    const existingTempIds = new Set(
      existingIncomes?.map((i) => i.onboarding_temp_id).filter(Boolean) || []
    );
    const incomingTempIds = new Set(incomeSources.map((i) => i.id));

    // Delete income sources that were removed
    const toDelete = existingIncomes?.filter(
      (i) => i.onboarding_temp_id && !incomingTempIds.has(i.onboarding_temp_id)
    );

    if (toDelete && toDelete.length > 0) {
      const deleteIds = toDelete.map((i) => i.id);
      await supabase.from("recurring_income").delete().in("id", deleteIds);
    }

    // Upsert each income source
    for (const income of incomeSources) {
      // Find existing by temp_id
      const existing = existingIncomes?.find(
        (i) => i.onboarding_temp_id === income.id
      );

      if (existing) {
        // Update existing
        const { error: updateError } = await supabase
          .from("recurring_income")
          .update({
            name: income.name,
            amount: income.amount,
            frequency: income.frequency,
            next_date: income.nextPayDate || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        if (updateError) {
          console.error("Error updating income source:", updateError);
        }
      } else {
        // Insert new
        const { error: insertError } = await supabase
          .from("recurring_income")
          .insert({
            user_id: user.id,
            name: income.name,
            amount: income.amount,
            frequency: income.frequency,
            next_date: income.nextPayDate || null,
            is_onboarding_draft: true,
            onboarding_temp_id: income.id,
            is_active: true,
            allocations: [],
          });

        if (insertError) {
          console.error("Error inserting income source:", insertError);
        }
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

    // Return the temp_id to real_id mapping for client reference
    const { data: updatedIncomes } = await supabase
      .from("recurring_income")
      .select("id, onboarding_temp_id, name")
      .eq("user_id", user.id)
      .eq("is_onboarding_draft", true);

    const idMapping: Record<string, string> = {};
    for (const income of updatedIncomes || []) {
      if (income.onboarding_temp_id) {
        idMapping[income.onboarding_temp_id] = income.id;
      }
    }

    return NextResponse.json({
      success: true,
      message: "Income sources saved",
      count: incomeSources.length,
      idMapping,
    });
  } catch (error) {
    console.error("Income save error:", error);
    return createErrorResponse(
      error as { message: string },
      500,
      "Internal server error"
    );
  }
}
