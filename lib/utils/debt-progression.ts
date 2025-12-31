/**
 * Debt Progression Utilities
 *
 * Manages the debt snowball progression through phases:
 * 1. Starter Stash - Build $1,000 emergency buffer (minimum CC payments only)
 * 2. Debt Payoff - Aggressive debt elimination with snowball effect
 * 3. Safety Net - Build 3-month emergency fund
 * 4. Complete - All debts paid, CC Holding unlocked
 *
 * The snowball method pays debts smallest-to-largest. When one debt is paid off,
 * its payment amount "rolls" to the next debt, creating a growing payment momentum.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { unlockCCHolding } from "./cc-holding-lock";

export type DebtPhase = "starter_stash" | "debt_payoff" | "safety_net" | "complete";

export interface DebtSnowballPlan {
  id: string;
  user_id: string;
  plan_type: string;
  phase: DebtPhase;
  starter_stash_monthly: number | null;
  total_debt_monthly: number | null;
  debts: DebtInfo[];
  created_at: string;
  updated_at: string;
}

export interface DebtInfo {
  card_name: string;
  balance: number;
  envelope_id: string;
  minimum_payment: number;
  order: number;
  paid_off_at: string | null;
}

/**
 * Get the current debt snowball plan for a user
 */
export async function getDebtPlan(
  supabase: SupabaseClient,
  userId: string
): Promise<DebtSnowballPlan | null> {
  const { data, error } = await supabase
    .from("debt_snowball_plan")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching debt plan:", error);
    return null;
  }

  return data as DebtSnowballPlan | null;
}

/**
 * Called when Starter Stash ($1,000) is complete
 * Transitions from starter_stash phase to debt_payoff phase
 * Updates the first debt in snowball to aggressive payment
 */
export async function onStarterStashComplete(
  supabase: SupabaseClient,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const plan = await getDebtPlan(supabase, userId);

  if (!plan) {
    return { success: false, error: "No debt plan found" };
  }

  // If no debts, skip to safety_net phase
  if (!plan.debts || plan.debts.length === 0) {
    const { error } = await supabase
      .from("debt_snowball_plan")
      .update({
        phase: "safety_net",
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  }

  // Get the first unpaid debt in the snowball
  const firstDebt = plan.debts.find((d) => !d.paid_off_at);
  if (!firstDebt) {
    // All debts already paid, move to complete
    await supabase
      .from("debt_snowball_plan")
      .update({
        phase: "complete",
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    await unlockCCHolding(supabase, userId);
    return { success: true };
  }

  // Calculate aggressive payment (use total_debt_monthly or 3x minimum)
  const aggressivePayment = plan.total_debt_monthly || firstDebt.minimum_payment * 3;

  // Update the first debt's envelope to aggressive payment
  const { error: envelopeError } = await supabase
    .from("envelopes")
    .update({ target_amount: aggressivePayment })
    .eq("id", firstDebt.envelope_id);

  if (envelopeError) {
    console.error("Error updating envelope target:", envelopeError);
  }

  // Update plan phase
  const { error } = await supabase
    .from("debt_snowball_plan")
    .update({
      phase: "debt_payoff",
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Called when a debt is fully paid off
 * Implements the snowball effect: rolls payment to next debt
 */
export async function onDebtPaidOff(
  supabase: SupabaseClient,
  envelopeId: string,
  userId: string
): Promise<{
  success: boolean;
  nextDebt: DebtInfo | null;
  allPaidOff: boolean;
  error?: string;
}> {
  const plan = await getDebtPlan(supabase, userId);

  if (!plan) {
    return { success: false, nextDebt: null, allPaidOff: false, error: "No debt plan found" };
  }

  // Find the paid debt
  const paidDebtIndex = plan.debts.findIndex((d) => d.envelope_id === envelopeId);
  if (paidDebtIndex === -1) {
    return { success: false, nextDebt: null, allPaidOff: false, error: "Debt not found in plan" };
  }

  const paidDebt = plan.debts[paidDebtIndex];

  // Get the paid envelope's target amount for snowball calculation
  const { data: paidEnvelope } = await supabase
    .from("envelopes")
    .select("target_amount")
    .eq("id", envelopeId)
    .single();

  // Mark debt as paid off
  const updatedDebts = [...plan.debts];
  updatedDebts[paidDebtIndex] = {
    ...paidDebt,
    paid_off_at: new Date().toISOString(),
  };

  // Find the next unpaid debt
  const nextDebt = updatedDebts.find((d, i) => i > paidDebtIndex && !d.paid_off_at);

  if (nextDebt) {
    // Roll payment to next debt (snowball effect)
    const { data: nextEnvelope } = await supabase
      .from("envelopes")
      .select("target_amount")
      .eq("id", nextDebt.envelope_id)
      .single();

    const rolledPayment =
      (Number(paidEnvelope?.target_amount) || 0) + (Number(nextEnvelope?.target_amount) || 0);

    await supabase
      .from("envelopes")
      .update({ target_amount: rolledPayment })
      .eq("id", nextDebt.envelope_id);

    // Update plan with paid debt
    await supabase
      .from("debt_snowball_plan")
      .update({
        debts: updatedDebts,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    return { success: true, nextDebt, allPaidOff: false };
  } else {
    // All debts paid off - unlock CC Holding and move to next phase
    await unlockCCHolding(supabase, userId);

    // Update plan to complete (or safety_net if they still need to build that)
    await supabase
      .from("debt_snowball_plan")
      .update({
        debts: updatedDebts,
        phase: "complete",
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    return { success: true, nextDebt: null, allPaidOff: true };
  }
}

/**
 * Recalculate the debt snowball order based on current balances
 * Called when user adds new debt or balances change significantly
 */
export async function recalculateSnowballOrder(
  supabase: SupabaseClient,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const plan = await getDebtPlan(supabase, userId);

  if (!plan) {
    return { success: false, error: "No debt plan found" };
  }

  // Get current balances for all debt envelopes
  const envelopeIds = plan.debts.map((d) => d.envelope_id);
  const { data: envelopes } = await supabase
    .from("envelopes")
    .select("id, current_amount")
    .in("id", envelopeIds);

  if (!envelopes) {
    return { success: false, error: "Could not fetch envelope balances" };
  }

  // Create balance lookup
  const balanceLookup = new Map(envelopes.map((e) => [e.id, Number(e.current_amount) || 0]));

  // Sort debts by remaining balance (smallest first), keeping paid-off debts in place
  const unpaidDebts = plan.debts.filter((d) => !d.paid_off_at);
  const paidDebts = plan.debts.filter((d) => d.paid_off_at);

  unpaidDebts.sort((a, b) => {
    const balanceA = a.balance - (balanceLookup.get(a.envelope_id) || 0);
    const balanceB = b.balance - (balanceLookup.get(b.envelope_id) || 0);
    return balanceA - balanceB;
  });

  // Reassign order
  const reorderedDebts = [
    ...paidDebts,
    ...unpaidDebts.map((d, i) => ({ ...d, order: paidDebts.length + i })),
  ];

  const { error } = await supabase
    .from("debt_snowball_plan")
    .update({
      debts: reorderedDebts,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Add a new debt to the snowball plan
 * Inserts in correct position based on balance (smallest first)
 */
export async function addDebtToSnowball(
  supabase: SupabaseClient,
  userId: string,
  newDebt: Omit<DebtInfo, "order" | "paid_off_at">
): Promise<{ success: boolean; error?: string }> {
  let plan = await getDebtPlan(supabase, userId);

  if (!plan) {
    // Create new plan
    const { error } = await supabase.from("debt_snowball_plan").insert({
      user_id: userId,
      plan_type: "balanced",
      phase: "starter_stash",
      debts: [{ ...newDebt, order: 0, paid_off_at: null }],
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  }

  // Add to existing plan, maintaining smallest-first order
  const updatedDebts = [...plan.debts, { ...newDebt, order: plan.debts.length, paid_off_at: null }]
    .sort((a, b) => {
      // Keep paid debts at their original position
      if (a.paid_off_at && !b.paid_off_at) return -1;
      if (!a.paid_off_at && b.paid_off_at) return 1;
      if (a.paid_off_at && b.paid_off_at) return 0;
      // Sort unpaid by balance
      return a.balance - b.balance;
    })
    .map((d, i) => ({ ...d, order: i }));

  const { error } = await supabase
    .from("debt_snowball_plan")
    .update({
      debts: updatedDebts,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
