import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import {
  createErrorResponse,
  createUnauthorizedError,
} from "@/lib/utils/api-error";

interface GiftRecipientInput {
  recipient_name: string;
  gift_amount: number;
  party_amount?: number;
  celebration_date?: string | Date | null;
  notes?: string;
  needs_gift?: boolean;
}

interface DebtItemInput {
  id?: string;
  name: string;
  debt_type: string;
  starting_balance: number;
  current_balance: number;
  interest_rate?: number;
  minimum_payment?: number;
  linked_account_id?: string;
}

interface EnvelopeInput {
  id: string; // Temporary client-side ID
  name: string;
  icon: string;
  type: "bill" | "spending" | "savings" | "tracking" | "debt";
  category?: string;
  sortOrder?: number;

  // Bill fields
  billAmount?: number;
  frequency?: string;
  dueDate?: number | string;
  priority?: string;

  // Spending fields
  monthlyBudget?: number;

  // Savings fields
  savingsAmount?: number;
  goalType?: string;
  targetDate?: string;

  // Per-pay amount (calculated)
  payCycleAmount?: number;

  // Leveled bill fields
  is_leveled?: boolean;
  leveling_data?: object;
  seasonal_pattern?: string;

  // Celebration fields
  is_celebration?: boolean;
  giftRecipients?: GiftRecipientInput[];

  // Debt fields
  is_debt?: boolean;
  debtItems?: DebtItemInput[];

  // Income allocations (keyed by income source temp ID)
  incomeAllocations?: { [incomeId: string]: number };
}

interface CustomCategoryInput {
  id: string;
  label: string;
  icon: string;
}

/**
 * POST /api/onboarding/steps/envelopes
 * Upserts envelopes to envelopes table with is_onboarding_draft=true
 * Also handles gift_recipients and debt_items for celebration/debt envelopes
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
      envelopes,
      customCategories,
      categoryOrder,
      currentStep,
      highestStepReached,
    } = body as {
      envelopes: EnvelopeInput[];
      customCategories?: CustomCategoryInput[];
      categoryOrder?: string[];
      currentStep?: number;
      highestStepReached?: number;
    };

    if (!envelopes || !Array.isArray(envelopes)) {
      return NextResponse.json(
        { success: false, error: "envelopes array is required" },
        { status: 400 }
      );
    }

    // =========================================================================
    // DATA PROTECTION: Check for potential corruption
    // =========================================================================
    const { data: existingEnvelopes } = await supabase
      .from("envelopes")
      .select("id, onboarding_temp_id, name, target_amount, pay_cycle_amount")
      .eq("user_id", user.id)
      .eq("is_onboarding_draft", true);

    // Check if existing envelopes have significant data
    if (existingEnvelopes && existingEnvelopes.length > 5) {
      const existingHasAmounts = existingEnvelopes.some(
        (env) => (env.target_amount || 0) > 0 || (env.pay_cycle_amount || 0) > 0
      );
      const newHasAmounts = envelopes.some(
        (env) =>
          (env.billAmount || 0) > 0 ||
          (env.monthlyBudget || 0) > 0 ||
          (env.savingsAmount || 0) > 0 ||
          (env.payCycleAmount || 0) > 0
      );

      // Block if existing has amounts but new data doesn't
      if (existingHasAmounts && !newHasAmounts && envelopes.length > 0) {
        console.error(
          "[Envelopes API] BLOCKED: Attempted to overwrite envelope amounts with $0 values"
        );
        return NextResponse.json(
          {
            success: false,
            error: "Data protection: Cannot overwrite existing amounts with empty values",
          },
          { status: 400 }
        );
      }

      // Block if trying to clear all envelopes
      if (envelopes.length === 0) {
        console.error("[Envelopes API] BLOCKED: Attempted to clear all envelopes");
        return NextResponse.json(
          {
            success: false,
            error: "Data protection: Cannot clear all envelopes",
          },
          { status: 400 }
        );
      }
    }

    // =========================================================================
    // 1. Handle custom categories first (we need their IDs for envelopes)
    // =========================================================================
    const categoryIdMap = new Map<string, string>();

    // Get existing draft categories
    const { data: existingCategories } = await supabase
      .from("envelope_categories")
      .select("id, name, is_onboarding_draft")
      .eq("user_id", user.id);

    // Map existing categories by name (case-insensitive)
    const existingCatByName = new Map<string, string>();
    for (const cat of existingCategories || []) {
      existingCatByName.set(cat.name.toLowerCase(), cat.id);
    }

    // Process custom categories
    if (customCategories && customCategories.length > 0) {
      for (let index = 0; index < customCategories.length; index++) {
        const category = customCategories[index];
        const sortOrder = categoryOrder?.indexOf(category.id) ?? index;

        // Check if exists by name
        const existingId = existingCatByName.get(category.label.toLowerCase());

        if (existingId) {
          categoryIdMap.set(category.id, existingId);
        } else {
          // Create new category
          const { data: created, error } = await supabase
            .from("envelope_categories")
            .insert({
              user_id: user.id,
              name: category.label,
              icon: category.icon,
              display_order: sortOrder,
              is_onboarding_draft: true,
            })
            .select("id")
            .single();

          if (created) {
            categoryIdMap.set(category.id, created.id);
            existingCatByName.set(category.label.toLowerCase(), created.id);
          } else if (error) {
            console.error("Category creation error:", error);
          }
        }
      }
    }

    // Map built-in category names to IDs
    const builtInCategoryLabels: Record<string, string> = {
      housing: "Housing",
      utilities: "Utilities",
      transport: "Transport",
      insurance: "Insurance",
      food: "Food & Dining",
      health: "Health",
      children: "Children",
      pets: "Pets",
      personal: "Personal Care",
      entertainment: "Entertainment",
      subscriptions: "Subscriptions",
      debt: "Debt",
      savings: "Savings & Goals",
      giving: "Giving",
      other: "Other",
    };

    // Get or create built-in categories used by envelopes
    for (const envelope of envelopes) {
      if (envelope.category && !envelope.category.startsWith("custom-")) {
        if (!categoryIdMap.has(envelope.category)) {
          const label =
            builtInCategoryLabels[envelope.category] || envelope.category;
          const existingId = existingCatByName.get(label.toLowerCase());

          if (existingId) {
            categoryIdMap.set(envelope.category, existingId);
          } else {
            // Create the category
            const sortOrder = categoryOrder?.indexOf(envelope.category) ?? 999;
            const { data: created } = await supabase
              .from("envelope_categories")
              .insert({
                user_id: user.id,
                name: label,
                display_order: sortOrder,
                is_onboarding_draft: true,
              })
              .select("id")
              .single();

            if (created) {
              categoryIdMap.set(envelope.category, created.id);
              existingCatByName.set(label.toLowerCase(), created.id);
            }
          }
        }
      }
    }

    // =========================================================================
    // 2. Process envelopes
    // =========================================================================
    const existingTempIds = new Set(
      existingEnvelopes?.map((e) => e.onboarding_temp_id).filter(Boolean) || []
    );
    const incomingTempIds = new Set(envelopes.map((e) => e.id));

    // Delete envelopes that were removed (cascades to gift_recipients and debt_items)
    const toDelete = existingEnvelopes?.filter(
      (e) => e.onboarding_temp_id && !incomingTempIds.has(e.onboarding_temp_id)
    );

    if (toDelete && toDelete.length > 0) {
      const deleteIds = toDelete.map((e) => e.id);
      await supabase.from("envelopes").delete().in("id", deleteIds);
    }

    // Map to track envelope IDs
    const envelopeIdMap = new Map<string, string>();

    // Upsert each envelope
    for (const envelope of envelopes) {
      // Build envelope data
      const categoryId = envelope.category
        ? categoryIdMap.get(envelope.category)
        : null;

      const envelopeData: Record<string, unknown> = {
        user_id: user.id,
        name: envelope.name,
        icon: envelope.icon,
        subtype: envelope.type,
        category_id: categoryId,
        sort_order: envelope.sortOrder ?? 0,
        is_onboarding_draft: true,
        onboarding_temp_id: envelope.id,
        pay_cycle_amount: envelope.payCycleAmount || 0,
        is_spending: envelope.type === "spending",
        is_goal: envelope.type === "savings",
        is_tracking_only: envelope.type === "tracking",
        is_debt: envelope.type === "debt",
        is_celebration: envelope.is_celebration || false,
        is_leveled: envelope.is_leveled || false,
        leveling_data: envelope.leveling_data || null,
        seasonal_pattern: envelope.seasonal_pattern || null,
      };

      // Type-specific fields
      if (envelope.type === "bill") {
        envelopeData.target_amount = envelope.billAmount || 0;
        envelopeData.frequency = envelope.frequency || "monthly";
        envelopeData.priority = envelope.priority || "important";

        // Handle due date
        if (envelope.dueDate) {
          if (typeof envelope.dueDate === "string") {
            envelopeData.due_date = new Date(envelope.dueDate);
          } else if (typeof envelope.dueDate === "number") {
            const now = new Date();
            envelopeData.due_date = new Date(
              now.getFullYear(),
              now.getMonth(),
              envelope.dueDate
            );
          }
        }
      } else if (envelope.type === "spending") {
        envelopeData.target_amount = envelope.monthlyBudget || 0;
        envelopeData.priority = envelope.priority || "discretionary";
      } else if (envelope.type === "savings") {
        envelopeData.target_amount = envelope.savingsAmount || 0;
        if (envelope.targetDate) {
          envelopeData.goal_target_date = envelope.targetDate;
        }
      } else if (envelope.type === "debt") {
        envelopeData.priority = "essential";
      }

      // Find existing envelope by temp_id
      const existing = existingEnvelopes?.find(
        (e) => e.onboarding_temp_id === envelope.id
      );

      let envelopeId: string;

      if (existing) {
        // Update existing
        const { error: updateError } = await supabase
          .from("envelopes")
          .update({
            ...envelopeData,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        if (updateError) {
          console.error("Error updating envelope:", updateError);
        }
        envelopeId = existing.id;
      } else {
        // Insert new
        const { data: created, error: insertError } = await supabase
          .from("envelopes")
          .insert(envelopeData)
          .select("id")
          .single();

        if (insertError || !created) {
          console.error("Error inserting envelope:", insertError);
          continue;
        }
        envelopeId = created.id;
      }

      envelopeIdMap.set(envelope.id, envelopeId);

      // =========================================================================
      // 3. Handle gift recipients for celebration envelopes
      // =========================================================================
      if (envelope.is_celebration && envelope.giftRecipients) {
        // Delete existing gift recipients for this envelope
        await supabase
          .from("gift_recipients")
          .delete()
          .eq("envelope_id", envelopeId);

        // Insert new gift recipients
        for (const recipient of envelope.giftRecipients) {
          let celebrationDate: string | null = null;
          if (recipient.celebration_date) {
            if (recipient.celebration_date instanceof Date) {
              celebrationDate = recipient.celebration_date.toISOString().split("T")[0];
            } else if (typeof recipient.celebration_date === "string") {
              celebrationDate = recipient.celebration_date.split("T")[0];
            }
          }

          const { error: recipientError } = await supabase
            .from("gift_recipients")
            .insert({
              user_id: user.id,
              envelope_id: envelopeId,
              recipient_name: recipient.recipient_name,
              gift_amount: recipient.gift_amount || 0,
              party_amount: recipient.party_amount || 0,
              celebration_date: celebrationDate,
              notes: recipient.notes || null,
              needs_gift: recipient.needs_gift ?? true,
              is_onboarding_draft: true,
            });

          if (recipientError) {
            console.error("Gift recipient error:", recipientError);
          }
        }
      }

      // =========================================================================
      // 4. Handle debt items for debt envelopes
      // =========================================================================
      if (envelope.is_debt && envelope.debtItems) {
        // Delete existing debt items for this envelope
        await supabase.from("debt_items").delete().eq("envelope_id", envelopeId);

        // Insert new debt items
        for (const debtItem of envelope.debtItems) {
          const { error: debtError } = await supabase
            .from("debt_items")
            .insert({
              user_id: user.id,
              envelope_id: envelopeId,
              name: debtItem.name,
              debt_type: debtItem.debt_type || "other",
              starting_balance: debtItem.starting_balance || debtItem.current_balance,
              current_balance: debtItem.current_balance,
              interest_rate: debtItem.interest_rate || null,
              minimum_payment: debtItem.minimum_payment || null,
              linked_account_id: debtItem.linked_account_id || null,
              is_onboarding_draft: true,
            });

          if (debtError) {
            console.error("Debt item error:", debtError);
          }
        }
      }
    }

    // =========================================================================
    // 5. Update profile step progress and save category order
    // =========================================================================
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

    if (categoryOrder) {
      profileUpdate.envelope_category_order = categoryOrder;
    }

    await supabase.from("profiles").update(profileUpdate).eq("id", user.id);

    // Build ID mapping response
    const idMapping: Record<string, string> = {};
    for (const [tempId, realId] of envelopeIdMap) {
      idMapping[tempId] = realId;
    }

    return NextResponse.json({
      success: true,
      message: "Envelopes saved",
      count: envelopes.length,
      idMapping,
      categoryIdMapping: Object.fromEntries(categoryIdMap),
    });
  } catch (error) {
    console.error("Envelopes save error:", error);
    return createErrorResponse(
      error as { message: string },
      500,
      "Internal server error"
    );
  }
}
