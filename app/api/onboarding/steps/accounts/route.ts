import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import {
  createErrorResponse,
  createUnauthorizedError,
} from "@/lib/utils/api-error";

interface BankAccountInput {
  id: string; // Temporary client-side ID
  name: string;
  type: "transaction" | "savings" | "credit_card";
  balance: number;
}

/**
 * POST /api/onboarding/steps/accounts
 * Upserts bank accounts to accounts table with is_onboarding_draft=true
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
    const { bankAccounts, currentStep, highestStepReached } = body as {
      bankAccounts: BankAccountInput[];
      currentStep?: number;
      highestStepReached?: number;
    };

    if (!bankAccounts || !Array.isArray(bankAccounts)) {
      return NextResponse.json(
        { success: false, error: "bankAccounts array is required" },
        { status: 400 }
      );
    }

    // Get existing draft accounts to compare
    const { data: existingAccounts } = await supabase
      .from("accounts")
      .select("id, onboarding_temp_id, name")
      .eq("user_id", user.id)
      .eq("is_onboarding_draft", true);

    const existingTempIds = new Set(
      existingAccounts?.map((a) => a.onboarding_temp_id).filter(Boolean) || []
    );
    const incomingTempIds = new Set(bankAccounts.map((a) => a.id));

    // Delete accounts that were removed
    const toDelete = existingAccounts?.filter(
      (a) => a.onboarding_temp_id && !incomingTempIds.has(a.onboarding_temp_id)
    );

    if (toDelete && toDelete.length > 0) {
      const deleteIds = toDelete.map((a) => a.id);
      await supabase.from("accounts").delete().in("id", deleteIds);
    }

    // Upsert each account
    for (const account of bankAccounts) {
      // For credit cards, use negative balance (debt)
      const balanceValue =
        account.type === "credit_card"
          ? -Math.abs(account.balance)
          : account.balance;

      // Map credit_card to debt type for database
      const dbType = account.type === "credit_card" ? "debt" : account.type;

      // Find existing by temp_id
      const existing = existingAccounts?.find(
        (a) => a.onboarding_temp_id === account.id
      );

      if (existing) {
        // Update existing
        const { error: updateError } = await supabase
          .from("accounts")
          .update({
            name: account.name,
            type: dbType,
            current_balance: balanceValue,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        if (updateError) {
          console.error("Error updating account:", updateError);
        }
      } else {
        // Insert new
        const { error: insertError } = await supabase.from("accounts").insert({
          user_id: user.id,
          name: account.name,
          type: dbType,
          current_balance: balanceValue,
          is_onboarding_draft: true,
          onboarding_temp_id: account.id,
        });

        if (insertError) {
          console.error("Error inserting account:", insertError);
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
    const { data: updatedAccounts } = await supabase
      .from("accounts")
      .select("id, onboarding_temp_id, name")
      .eq("user_id", user.id)
      .eq("is_onboarding_draft", true);

    const idMapping: Record<string, string> = {};
    for (const account of updatedAccounts || []) {
      if (account.onboarding_temp_id) {
        idMapping[account.onboarding_temp_id] = account.id;
      }
    }

    return NextResponse.json({
      success: true,
      message: "Bank accounts saved",
      count: bankAccounts.length,
      idMapping,
    });
  } catch (error) {
    console.error("Accounts save error:", error);
    return createErrorResponse(
      error as { message: string },
      500,
      "Internal server error"
    );
  }
}
