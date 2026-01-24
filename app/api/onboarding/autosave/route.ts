import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import {
  createErrorResponse,
  createUnauthorizedError,
} from "@/lib/utils/api-error";

/**
 * GET /api/onboarding/autosave
 * Retrieves the user's onboarding draft from main tables (with is_onboarding_draft=true)
 * Falls back to legacy onboarding_drafts table for backward compatibility
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return createUnauthorizedError();
    }

    // Check profile for onboarding progress first
    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "full_name, onboarding_current_step, onboarding_highest_step, onboarding_started_at, onboarding_last_saved_at, onboarding_use_template, onboarding_credit_card_allocation, envelope_category_order, has_onboarding_draft"
      )
      .eq("id", user.id)
      .single();

    // If using new direct-to-main-tables system (onboarding_current_step > 0)
    if (profile?.onboarding_current_step && profile.onboarding_current_step > 0) {
      // Query all draft data from main tables in parallel
      const [envelopesResult, incomeResult, accountsResult, categoriesResult] =
        await Promise.all([
          // Envelopes with their gift recipients and debt items
          supabase
            .from("envelopes")
            .select(
              `
              id, onboarding_temp_id, name, icon, subtype, category_id,
              target_amount, pay_cycle_amount, frequency, due_date, priority,
              opening_balance, current_amount, sort_order, notes, funding_sources,
              is_spending, is_goal, is_tracking_only, is_debt, is_celebration,
              is_leveled, leveling_data, seasonal_pattern,
              gift_recipients(id, recipient_name, gift_amount, party_amount, celebration_date, notes, needs_gift),
              debt_items(id, name, debt_type, starting_balance, current_balance, interest_rate, minimum_payment, linked_account_id)
            `
            )
            .eq("user_id", user.id)
            .eq("is_onboarding_draft", true)
            .order("sort_order"),

          // Income sources
          supabase
            .from("recurring_income")
            .select("id, onboarding_temp_id, name, amount, frequency, next_date, allocations")
            .eq("user_id", user.id)
            .eq("is_onboarding_draft", true),

          // Bank accounts
          supabase
            .from("accounts")
            .select("id, onboarding_temp_id, name, type, current_balance")
            .eq("user_id", user.id)
            .eq("is_onboarding_draft", true),

          // Custom categories
          supabase
            .from("envelope_categories")
            .select("id, name, icon, display_order")
            .eq("user_id", user.id)
            .eq("is_onboarding_draft", true)
            .order("display_order"),
        ]);

      const envelopes = envelopesResult.data || [];
      const incomeSources = incomeResult.data || [];
      const bankAccounts = accountsResult.data || [];
      const customCategories = categoriesResult.data || [];

      // Transform database records to client format
      const transformedEnvelopes = envelopes.map((env: any) => ({
        id: env.onboarding_temp_id || env.id,
        name: env.name,
        icon: env.icon,
        type: env.subtype || "bill",
        category: env.category_id,
        sortOrder: env.sort_order,
        billAmount: env.subtype === "bill" ? env.target_amount : undefined,
        monthlyBudget: env.subtype === "spending" ? env.target_amount : undefined,
        savingsAmount: env.subtype === "savings" || env.subtype === "goal" ? env.target_amount : undefined,
        payCycleAmount: env.pay_cycle_amount,
        frequency: env.frequency,
        dueDate: env.due_date,
        priority: env.priority,
        is_leveled: env.is_leveled,
        leveling_data: env.leveling_data,
        seasonal_pattern: env.seasonal_pattern,
        is_celebration: env.is_celebration,
        is_debt: env.is_debt,
        giftRecipients: env.gift_recipients || [],
        debtItems: env.debt_items || [],
      }));

      const transformedIncome = incomeSources.map((inc: any) => ({
        id: inc.onboarding_temp_id || inc.id,
        name: inc.name,
        amount: inc.amount,
        frequency: inc.frequency,
        nextPayDate: inc.next_date,
      }));

      const transformedAccounts = bankAccounts.map((acc: any) => ({
        id: acc.onboarding_temp_id || acc.id,
        name: acc.name,
        type: acc.type === "debt" ? "credit_card" : acc.type,
        balance: acc.type === "debt" ? Math.abs(acc.current_balance) : acc.current_balance,
      }));

      const transformedCategories = customCategories.map((cat: any) => ({
        id: cat.id,
        label: cat.name,
        icon: cat.icon || "",
      }));

      // Build envelope allocations from funding_sources
      const envelopeAllocations: Record<string, Record<string, number>> = {};
      for (const env of envelopes) {
        const tempId = env.onboarding_temp_id || env.id;
        if (env.funding_sources && Array.isArray(env.funding_sources)) {
          envelopeAllocations[tempId] = {};
          for (const source of env.funding_sources) {
            // Find income temp ID from the real income ID
            const incomeRecord = incomeSources.find(
              (inc: any) => inc.id === source.income_id
            );
            const incomeTempId = incomeRecord?.onboarding_temp_id || source.income_id;
            envelopeAllocations[tempId][incomeTempId] = source.amount;
          }
        }
      }

      // Build opening balances from envelope data
      const openingBalances: Record<string, number> = {};
      for (const env of envelopes) {
        const tempId = env.onboarding_temp_id || env.id;
        if (env.opening_balance && env.opening_balance > 0) {
          openingBalances[tempId] = env.opening_balance;
        }
      }

      return NextResponse.json({
        hasDraft: true,
        isDirectToMain: true, // Flag to indicate new system
        draft: {
          currentStep: profile.onboarding_current_step,
          highestStepReached: profile.onboarding_highest_step || profile.onboarding_current_step,
          fullName: profile.full_name,
          bankAccounts: transformedAccounts,
          creditCardConfigs: [], // TODO: Implement CC configs in new system
          incomeSources: transformedIncome,
          useTemplate: profile.onboarding_use_template ?? true,
          envelopes: transformedEnvelopes,
          customCategories: transformedCategories,
          categoryOrder: profile.envelope_category_order || [],
          envelopeAllocations,
          openingBalances,
          creditCardOpeningAllocation: profile.onboarding_credit_card_allocation || 0,
          lastSavedAt: profile.onboarding_last_saved_at,
        },
      });
    }

    // =========================================================================
    // LEGACY: Fall back to old onboarding_drafts table
    // =========================================================================
    const { data: draft, error } = await supabase
      .from("onboarding_drafts")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching onboarding draft:", error);
      return createErrorResponse(error, 500, "Failed to fetch draft");
    }

    if (!draft) {
      return NextResponse.json({ hasDraft: false });
    }

    return NextResponse.json({
      hasDraft: true,
      isDirectToMain: false, // Flag to indicate legacy system
      draft: {
        currentStep: draft.current_step,
        highestStepReached: draft.highest_step_reached || draft.current_step,
        fullName: draft.full_name,
        bankAccounts: draft.bank_accounts || [],
        creditCardConfigs: draft.credit_card_configs || [],
        incomeSources: draft.income_sources || [],
        useTemplate: draft.use_template,
        envelopes: draft.envelopes || [],
        customCategories: draft.custom_categories || [],
        categoryOrder: draft.category_order || [],
        envelopeAllocations: draft.envelope_allocations || {},
        openingBalances: draft.opening_balances || {},
        creditCardOpeningAllocation: draft.credit_card_opening_allocation || 0,
        lastSavedAt: draft.last_saved_at,
      },
    });
  } catch (error) {
    console.error("Autosave GET error:", error);
    return createErrorResponse(
      error as { message: string },
      500,
      "Internal server error"
    );
  }
}

/**
 * POST /api/onboarding/autosave
 * LEGACY: Saves to onboarding_drafts table
 * New system uses step-specific endpoints: /api/onboarding/steps/*
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
    const {
      currentStep,
      highestStepReached,
      fullName,
      bankAccounts,
      creditCardConfigs,
      incomeSources,
      useTemplate,
      envelopes,
      customCategories,
      categoryOrder,
      envelopeAllocations,
      openingBalances,
      creditCardOpeningAllocation,
      useDirectToMain, // Flag to use new system
    } = body;

    // If client requests new direct-to-main system, redirect to step endpoints
    // For now, we continue supporting legacy system for backward compatibility
    if (useDirectToMain) {
      return NextResponse.json({
        success: false,
        error: "Please use step-specific endpoints: /api/onboarding/steps/*",
        redirectEndpoints: {
          profile: "/api/onboarding/steps/profile",
          income: "/api/onboarding/steps/income",
          accounts: "/api/onboarding/steps/accounts",
          envelopes: "/api/onboarding/steps/envelopes",
          allocations: "/api/onboarding/steps/allocations",
          openingBalances: "/api/onboarding/steps/opening-balances",
          progress: "/api/onboarding/steps/progress",
        },
      });
    }

    // =========================================================================
    // CRITICAL: Server-side data protection
    // Prevent saving corrupted/empty data over good data
    // =========================================================================

    // Check existing draft to prevent overwriting good data with empty data
    const { data: existingDraft } = await supabase
      .from("onboarding_drafts")
      .select("envelopes, envelope_allocations, current_step")
      .eq("user_id", user.id)
      .maybeSingle();

    // If existing draft has envelopes with amounts, but new data has none, BLOCK the update
    const existingEnvelopesArray = existingDraft?.envelopes as any[] | null | undefined;
    if (existingEnvelopesArray && existingEnvelopesArray.length > 5) {
      const existingHasAmounts = existingEnvelopesArray.some(
        (env: any) =>
          (env.billAmount || 0) > 0 ||
          (env.monthlyBudget || 0) > 0 ||
          (env.savingsAmount || 0) > 0
      );
      const newHasAmounts = envelopes?.some(
        (env: any) =>
          (env.billAmount || 0) > 0 ||
          (env.monthlyBudget || 0) > 0 ||
          (env.savingsAmount || 0) > 0
      );

      // Block if existing has amounts but new data doesn't (potential corruption)
      if (existingHasAmounts && !newHasAmounts && (envelopes?.length || 0) > 0) {
        console.error(
          "[Autosave] BLOCKED: Attempted to overwrite envelope amounts with $0 values"
        );
        return NextResponse.json(
          {
            success: false,
            error:
              "Data protection: Cannot overwrite existing amounts with empty values",
          },
          { status: 400 }
        );
      }

      // Block if trying to clear all envelopes
      if ((envelopes?.length || 0) === 0) {
        console.error("[Autosave] BLOCKED: Attempted to clear all envelopes");
        return NextResponse.json(
          {
            success: false,
            error: "Data protection: Cannot clear all envelopes",
          },
          { status: 400 }
        );
      }
    }

    // Upsert the draft
    const { error } = await supabase.from("onboarding_drafts").upsert(
      {
        user_id: user.id,
        current_step: currentStep,
        highest_step_reached: highestStepReached || currentStep,
        full_name: fullName || null,
        bank_accounts: bankAccounts || [],
        credit_card_configs: creditCardConfigs || [],
        income_sources: incomeSources || [],
        use_template: useTemplate ?? true,
        envelopes: envelopes || [],
        custom_categories: customCategories || [],
        category_order: categoryOrder || [],
        envelope_allocations: envelopeAllocations || {},
        opening_balances: openingBalances || {},
        credit_card_opening_allocation: creditCardOpeningAllocation || 0,
      },
      {
        onConflict: "user_id",
      }
    );

    if (error) {
      console.error("Error saving onboarding draft:", error);
      return createErrorResponse(error, 500, "Failed to save draft");
    }

    // Update profile to mark that there's a draft
    await supabase
      .from("profiles")
      .update({ has_onboarding_draft: true })
      .eq("id", user.id);

    return NextResponse.json({
      success: true,
      message: "Draft saved",
    });
  } catch (error) {
    console.error("Autosave POST error:", error);
    return createErrorResponse(
      error as { message: string },
      500,
      "Internal server error"
    );
  }
}

/**
 * DELETE /api/onboarding/autosave
 * Deletes the user's onboarding draft (called when onboarding completes)
 * For direct-to-main system, use /api/onboarding/complete instead
 */
export async function DELETE() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return createUnauthorizedError();
    }

    // Delete the legacy draft
    const { error } = await supabase
      .from("onboarding_drafts")
      .delete()
      .eq("user_id", user.id);

    if (error) {
      console.error("Error deleting onboarding draft:", error);
      return createErrorResponse(error, 500, "Failed to delete draft");
    }

    // Update profile to mark that there's no draft
    await supabase
      .from("profiles")
      .update({ has_onboarding_draft: false })
      .eq("id", user.id);

    return NextResponse.json({
      success: true,
      message: "Draft deleted",
    });
  } catch (error) {
    console.error("Autosave DELETE error:", error);
    return createErrorResponse(
      error as { message: string },
      500,
      "Internal server error"
    );
  }
}
