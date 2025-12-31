/**
 * CC Holding Lock Utilities
 *
 * The CC Holding envelope is LOCKED until all credit card debt is paid off.
 * This prevents users from using the CC Holding feature (responsible CC usage)
 * while they still have debt to pay down.
 *
 * Progression:
 * 1. User has CC debt → CC Holding is locked
 * 2. User pays off all CC debt → CC Holding unlocks automatically
 * 3. User can now use CC Holding for responsible credit card usage
 */

import { SupabaseClient } from "@supabase/supabase-js";

export interface CCHoldingLockStatus {
  isLocked: boolean;
  totalDebt: number;
  unlockedAt: string | null;
}

/**
 * Check the lock status of CC Holding for a user
 *
 * @param supabase - Supabase client
 * @param userId - User ID to check
 * @returns Lock status including whether locked, total debt, and unlock timestamp
 */
export async function checkCCHoldingLockStatus(
  supabase: SupabaseClient,
  userId: string
): Promise<CCHoldingLockStatus> {
  // Get all credit card (debt) accounts
  const { data: accounts } = await supabase
    .from("accounts")
    .select("current_balance, cc_holding_unlocked_at")
    .eq("user_id", userId)
    .eq("type", "debt");

  // Calculate total debt (debt balances are negative, so we use absolute value)
  const totalDebt =
    accounts?.reduce((sum, acc) => {
      const balance = Number(acc.current_balance) || 0;
      // Only count negative balances as debt
      return sum + (balance < 0 ? Math.abs(balance) : 0);
    }, 0) || 0;

  // Check if CC Holding account exists and when it was unlocked
  const { data: holdingAccount } = await supabase
    .from("accounts")
    .select("cc_holding_locked, cc_holding_unlocked_at")
    .eq("user_id", userId)
    .eq("is_credit_card_holding", true)
    .maybeSingle();

  return {
    isLocked: totalDebt > 0 || holdingAccount?.cc_holding_locked !== false,
    totalDebt,
    unlockedAt: holdingAccount?.cc_holding_unlocked_at || null,
  };
}

/**
 * Manually unlock CC Holding for a user
 * This is typically called automatically by the database trigger when debt = 0
 *
 * @param supabase - Supabase client
 * @param userId - User ID to unlock
 */
export async function unlockCCHolding(
  supabase: SupabaseClient,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from("accounts")
    .update({
      cc_holding_locked: false,
      cc_holding_unlocked_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("is_credit_card_holding", true);

  if (error) {
    console.error("Error unlocking CC Holding:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Lock CC Holding for a user (if they take on new debt)
 *
 * @param supabase - Supabase client
 * @param userId - User ID to lock
 */
export async function lockCCHolding(
  supabase: SupabaseClient,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from("accounts")
    .update({
      cc_holding_locked: true,
      // Don't clear unlocked_at - keep historical record
    })
    .eq("user_id", userId)
    .eq("is_credit_card_holding", true);

  if (error) {
    console.error("Error locking CC Holding:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
