/**
 * Suggested Envelopes: "The My Budget Way"
 *
 * Creates suggested envelopes for new users after onboarding:
 * - Starter Stash: $1,000 emergency fund to get started
 * - CC Holding: Credit card payment holding envelope
 * - Safety Net: 3 months of essential expenses (auto-calculated)
 */

import { SupabaseClient } from "@supabase/supabase-js";

export const SUGGESTED_ENVELOPE_CATEGORY = "The My Budget Way";

export type SuggestionType = 'starter-stash' | 'cc-holding' | 'safety-net';

export interface SuggestedEnvelope {
  name: string;
  suggestion_type: SuggestionType;
  target_amount: number;
  auto_calculate_target: boolean;
  description: string;
  icon: string;
  subtype: string;
  priority?: string;
}

// Order matters: Starter Stash first, then CC Holding, then Safety Net
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
 */
export async function createSuggestedEnvelopes(
  supabase: SupabaseClient,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if suggested envelopes already exist
    const { data: existing } = await supabase
      .from("envelopes")
      .select("id")
      .eq("user_id", userId)
      .eq("is_suggested", true)
      .limit(1);

    if (existing && existing.length > 0) {
      // Already has suggested envelopes, skip
      return { success: true };
    }

    // Create the category
    const categoryId = await createSuggestedCategory(supabase, userId);

    // Calculate Safety Net target
    const { target: safetyNetTarget, monthlyEssential } = await calculateSafetyNetTarget(
      supabase,
      userId
    );

    // Create the envelopes
    const envelopesToCreate = SUGGESTED_ENVELOPES.map((env) => ({
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
    }));

    const { error } = await supabase.from("envelopes").insert(envelopesToCreate);

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
