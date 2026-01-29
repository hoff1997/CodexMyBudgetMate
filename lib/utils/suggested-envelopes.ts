/**
 * Suggested Envelopes: "The My Budget Way"
 *
 * Creates suggested envelopes for new users after onboarding:
 * - Starter Stash: $1,000 emergency fund to get started (Step 1)
 * - Debt Destroyer: Pay off all debt using snowball method (Step 2)
 * - CC Holding: Credit card payment holding envelope
 * - Safety Net: 3 months of essential expenses (Step 3)
 *
 * NOTE: These may already exist from onboarding if user selected them.
 * The createSuggestedEnvelopes function checks by name to avoid duplicates.
 */

import { SupabaseClient } from "@supabase/supabase-js";

export const SUGGESTED_ENVELOPE_CATEGORY = "The My Budget Way";

export type SuggestionType = 'starter-stash' | 'debt-destroyer' | 'cc-holding' | 'safety-net' | 'wallet';

export interface SuggestedEnvelope {
  name: string;
  suggestion_type: SuggestionType;
  target_amount: number;
  auto_calculate_target: boolean;
  description: string;
  icon: string;
  subtype: string;
  priority?: string;
  creates_account?: boolean; // If true, also creates an account (e.g., Wallet creates cash account)
  is_wallet?: boolean; // Flag for wallet envelopes
}

// Order matters: Starter Stash (Step 1), Debt Destroyer (Step 2), CC Holding, Safety Net (Step 3)
export const SUGGESTED_ENVELOPES: SuggestedEnvelope[] = [
  {
    name: "Starter Stash",
    suggestion_type: "starter-stash",
    target_amount: 1000,
    auto_calculate_target: false,
    description: "Your first $1,000 emergency buffer. A safety cushion for life's little surprises.",
    icon: "🌱",
    subtype: "savings",
    priority: "essential",
  },
  {
    name: "Debt Destroyer",
    suggestion_type: "debt-destroyer",
    target_amount: 0, // No target - contains debt_items
    auto_calculate_target: false,
    description: "Pay off all debt as fast as possible using snowball method (My Budget Way Step 2). Add your debts inside this envelope.",
    icon: "💪",
    subtype: "debt",
    priority: "essential",
  },
  {
    name: "CC Holding",
    suggestion_type: "cc-holding",
    target_amount: 0, // Tracking envelope, no target
    auto_calculate_target: false,
    description: "Tracks money set aside for credit card payments. Spend on CC, transfer here.",
    icon: "💳",
    subtype: "tracking",
    priority: "essential",
  },
  {
    name: "Safety Net",
    suggestion_type: "safety-net",
    target_amount: 0, // Calculated dynamically
    auto_calculate_target: true,
    description: "No worries about this one yet! Once your budget's sorted, we'll look at building your full emergency fund.",
    icon: "🛡️",
    subtype: "savings",
    priority: "essential",
  },
  {
    name: "Wallet",
    suggestion_type: "wallet",
    target_amount: 0, // No target - tracks balance in linked account
    auto_calculate_target: false,
    description: "Track your cash on hand. Record ATM withdrawals, gifts received, and cash spending.",
    icon: "💵",
    subtype: "tracking",
    priority: "essential",
    creates_account: true, // Creates a cash account linked to this envelope
    is_wallet: true,
  },
];

/**
 * Create "The My Budget Way" category for a user
 */
export async function createSuggestedCategory(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  // Check if category already exists
  const { data: existing } = await supabase
    .from("envelope_categories")
    .select("id")
    .eq("user_id", userId)
    .eq("name", SUGGESTED_ENVELOPE_CATEGORY)
    .maybeSingle();

  if (existing) {
    return existing.id;
  }

  // Create the category
  const { data: category, error } = await supabase
    .from("envelope_categories")
    .insert({
      user_id: userId,
      name: SUGGESTED_ENVELOPE_CATEGORY,
      icon: "✨",
      sort_order: -1, // Show first
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error creating suggested category:", error);
    return null;
  }

  return category.id;
}

/**
 * Calculate Safety Net target based on essential envelope targets
 */
export async function calculateSafetyNetTarget(
  supabase: SupabaseClient,
  userId: string
): Promise<{ target: number; monthlyEssential: number }> {
  // Get all essential priority envelopes
  const { data: essentialEnvelopes } = await supabase
    .from("envelopes")
    .select("target_amount, frequency")
    .eq("user_id", userId)
    .eq("priority", "essential")
    .eq("is_suggested", false); // Don't include other suggested envelopes

  if (!essentialEnvelopes || essentialEnvelopes.length === 0) {
    return { target: 0, monthlyEssential: 0 };
  }

  // Convert all targets to monthly amounts
  const frequencyMultipliers: Record<string, number> = {
    weekly: 52 / 12,
    fortnightly: 26 / 12,
    monthly: 1,
    quarterly: 1 / 3,
    annually: 1 / 12,
  };

  let monthlyTotal = 0;
  for (const env of essentialEnvelopes) {
    const multiplier = frequencyMultipliers[env.frequency || "monthly"] || 1;
    monthlyTotal += (env.target_amount || 0) * multiplier;
  }

  // Safety Net = 3 months of essential expenses
  return {
    target: Math.round(monthlyTotal * 3),
    monthlyEssential: Math.round(monthlyTotal),
  };
}

/**
 * Create suggested envelopes for a user after onboarding
 *
 * Checks by name to avoid duplicates - envelopes may already exist
 * from onboarding if user selected them from the master envelope list.
 */
export async function createSuggestedEnvelopes(
  supabase: SupabaseClient,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get all existing envelopes by name (case-insensitive) to avoid duplicates
    const { data: existingEnvelopes } = await supabase
      .from("envelopes")
      .select("id, name")
      .eq("user_id", userId);

    const existingNames = new Set(
      (existingEnvelopes || []).map(e => e.name.toLowerCase())
    );

    // Filter to only envelopes that don't already exist
    const envelopesToCreate = SUGGESTED_ENVELOPES.filter(
      env => !existingNames.has(env.name.toLowerCase())
    );

    if (envelopesToCreate.length === 0) {
      // All suggested envelopes already exist
      return { success: true };
    }

    // Create the category (if any envelopes need to be created)
    const categoryId = await createSuggestedCategory(supabase, userId);

    // Calculate Safety Net target
    const { target: safetyNetTarget, monthlyEssential } = await calculateSafetyNetTarget(
      supabase,
      userId
    );

    // Handle Wallet envelope specially - needs to create account first
    const walletEnvelope = envelopesToCreate.find(env => env.suggestion_type === "wallet");
    let walletAccountId: string | null = null;

    if (walletEnvelope) {
      // Check if wallet account already exists
      const { data: existingWalletAccount } = await supabase
        .from("accounts")
        .select("id")
        .eq("user_id", userId)
        .eq("is_wallet", true)
        .maybeSingle();

      if (existingWalletAccount) {
        walletAccountId = existingWalletAccount.id;
      } else {
        // Create the wallet account
        const { data: newWalletAccount, error: accountError } = await supabase
          .from("accounts")
          .insert({
            user_id: userId,
            name: "Wallet",
            account_type: "cash",
            current_balance: 0,
            is_wallet: true,
          })
          .select("id")
          .single();

        if (accountError) {
          console.error("Error creating wallet account:", accountError);
          return { success: false, error: accountError.message };
        }

        walletAccountId = newWalletAccount.id;
      }
    }

    // Build envelope records
    const envelopeRecords = envelopesToCreate.map((env) => ({
      user_id: userId,
      name: env.name,
      category_id: categoryId,
      target_amount: env.suggestion_type === "safety-net" ? safetyNetTarget : env.target_amount,
      current_amount: 0,
      icon: env.icon,
      subtype: env.subtype,
      is_suggested: true,
      suggestion_type: env.suggestion_type,
      is_dismissed: false,
      auto_calculate_target: env.auto_calculate_target,
      description:
        env.suggestion_type === "safety-net" && monthlyEssential > 0
          ? `No worries about this one yet! Your goal: 3 months of essentials ($${monthlyEssential.toLocaleString()}/mo × 3)`
          : env.description,
      // CC Holding envelope should be flagged for reconciliation
      is_cc_holding: env.suggestion_type === "cc-holding" ? true : false,
      // Debt Destroyer should be flagged as debt envelope
      is_debt: env.suggestion_type === "debt-destroyer" ? true : false,
      // Wallet envelope fields
      is_wallet: env.is_wallet || false,
      linked_wallet_account_id: env.suggestion_type === "wallet" ? walletAccountId : null,
    }));

    const { error } = await supabase.from("envelopes").insert(envelopeRecords);

    if (error) {
      console.error("Error creating suggested envelopes:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in createSuggestedEnvelopes:", message);
    return { success: false, error: message };
  }
}

/**
 * Dismiss a suggested envelope
 */
export async function dismissSuggestedEnvelope(
  supabase: SupabaseClient,
  userId: string,
  envelopeId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from("envelopes")
    .update({ is_dismissed: true })
    .eq("id", envelopeId)
    .eq("user_id", userId)
    .eq("is_suggested", true);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Restore a dismissed suggested envelope
 */
export async function restoreSuggestedEnvelope(
  supabase: SupabaseClient,
  userId: string,
  envelopeId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from("envelopes")
    .update({ is_dismissed: false })
    .eq("id", envelopeId)
    .eq("user_id", userId)
    .eq("is_suggested", true);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get dismissed suggested envelopes for settings page
 */
export async function getDismissedSuggestedEnvelopes(
  supabase: SupabaseClient,
  userId: string
) {
  const { data, error } = await supabase
    .from("envelopes")
    .select("id, name, suggestion_type, icon")
    .eq("user_id", userId)
    .eq("is_suggested", true)
    .eq("is_dismissed", true);

  if (error) {
    console.error("Error fetching dismissed envelopes:", error);
    return [];
  }

  return data || [];
}

/**
 * Snooze a suggested envelope for a specified number of days
 */
export async function snoozeSuggestedEnvelope(
  supabase: SupabaseClient,
  userId: string,
  envelopeId: string,
  days: number
): Promise<{ success: boolean; snoozedUntil?: string; error?: string }> {
  // Calculate snooze end date
  const now = new Date();
  const snoozedUntil = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const { error } = await supabase
    .from("envelopes")
    .update({ snoozed_until: snoozedUntil.toISOString() })
    .eq("id", envelopeId)
    .eq("user_id", userId)
    .eq("is_suggested", true);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, snoozedUntil: snoozedUntil.toISOString() };
}

/**
 * Unsnooze a suggested envelope (clear snooze)
 */
export async function unsnoozeSuggestedEnvelope(
  supabase: SupabaseClient,
  userId: string,
  envelopeId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from("envelopes")
    .update({ snoozed_until: null })
    .eq("id", envelopeId)
    .eq("user_id", userId)
    .eq("is_suggested", true);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Recalculate Safety Net target based on current essential expenses
 * Call this whenever essential envelopes are added/updated/deleted
 */
export async function recalculateSafetyNetTarget(
  supabase: SupabaseClient,
  userId: string
): Promise<{ success: boolean; newTarget: number; error?: string }> {
  // Calculate new target
  const { target: newTarget, monthlyEssential } = await calculateSafetyNetTarget(
    supabase,
    userId
  );

  // Update the Safety Net envelope
  const newDescription =
    monthlyEssential > 0
      ? `Your full emergency fund goal: 3 months of essentials ($${monthlyEssential.toLocaleString()}/mo × 3)`
      : "No worries about this one yet! Once your budget's sorted, we'll look at building your full emergency fund.";

  const { error } = await supabase
    .from("envelopes")
    .update({
      target_amount: newTarget,
      description: newDescription,
    })
    .eq("user_id", userId)
    .eq("suggestion_type", "safety-net")
    .eq("auto_calculate_target", true);

  if (error) {
    console.error("Error updating Safety Net target:", error);
    return { success: false, newTarget: 0, error: error.message };
  }

  return { success: true, newTarget };
}
