"use client";

import { useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { ACHIEVEMENTS, getAchievement } from "@/lib/gamification/achievements";

// Type for achievement records
interface AchievementRecord {
  id: string;
  user_id: string;
  achievement_key: string;
  achieved_at: string;
  metadata: Record<string, unknown>;
}

/**
 * Hook for checking and unlocking achievements
 *
 * Usage:
 * const { checkAndUnlock, checkEnvelopeCount, checkTransactionCount, ... } = useAchievementCheck();
 *
 * // In your component:
 * useEffect(() => {
 *   checkEnvelopeCount(envelopes.length);
 * }, [envelopes.length]);
 */
export function useAchievementCheck() {
  const supabase = createClient();

  /**
   * Core function to check and unlock an achievement
   */
  const checkAndUnlock = useCallback(
    async (
      achievementKey: string,
      condition: boolean,
      metadata?: Record<string, unknown>
    ): Promise<{ unlocked: boolean; achievementKey: string | null; points: number }> => {
      if (!condition) {
        return { unlocked: false, achievementKey: null, points: 0 };
      }

      // Verify achievement exists
      const achievement = getAchievement(achievementKey);
      if (!achievement) {
        console.warn(`Achievement "${achievementKey}" not found in definitions`);
        return { unlocked: false, achievementKey: null, points: 0 };
      }

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return { unlocked: false, achievementKey: null, points: 0 };
      }

      // Check if already unlocked
      // Note: Using type assertion because achievements table may not be in generated types
      const { data: existing } = await (supabase as any)
        .from("achievements")
        .select("id")
        .eq("user_id", user.id)
        .eq("achievement_key", achievementKey)
        .maybeSingle();

      if (existing) {
        return { unlocked: false, achievementKey: null, points: 0 };
      }

      // Unlock the achievement using upsert to handle race conditions
      const { error } = await (supabase as any).from("achievements").upsert(
        {
          user_id: user.id,
          achievement_key: achievementKey,
          achieved_at: new Date().toISOString(),
          metadata: metadata || {},
        },
        { onConflict: "user_id,achievement_key", ignoreDuplicates: true }
      );

      if (error) {
        console.error("Failed to unlock achievement:", error);
        return { unlocked: false, achievementKey: null, points: 0 };
      }

      return { unlocked: true, achievementKey, points: achievement.points };
    },
    [supabase]
  );

  // ============================================
  // GETTING STARTED ACHIEVEMENTS
  // ============================================

  /** Check if onboarding is complete */
  const checkOnboardingComplete = useCallback(
    async () => {
      return checkAndUnlock("onboarding_complete", true);
    },
    [checkAndUnlock]
  );

  /** Check first envelope created */
  const checkFirstEnvelope = useCallback(
    async (envelopeCount: number) => {
      return checkAndUnlock("first_envelope", envelopeCount >= 1);
    },
    [checkAndUnlock]
  );

  /** Check first transaction tracked */
  const checkFirstTransaction = useCallback(
    async (transactionCount: number) => {
      return checkAndUnlock("first_transaction", transactionCount >= 1);
    },
    [checkAndUnlock]
  );

  /** Check first reconciliation */
  const checkFirstReconciliation = useCallback(
    async (reconciliationCount: number) => {
      return checkAndUnlock("first_reconciliation", reconciliationCount >= 1);
    },
    [checkAndUnlock]
  );

  /** Check first budget complete (100% allocated) */
  const checkFirstBudgetComplete = useCallback(
    async (allocationPercent: number) => {
      return checkAndUnlock("first_budget_complete", allocationPercent >= 100);
    },
    [checkAndUnlock]
  );

  /** Check bank connected */
  const checkBankConnected = useCallback(
    async (bankConnectionCount: number) => {
      return checkAndUnlock("bank_connected", bankConnectionCount >= 1);
    },
    [checkAndUnlock]
  );

  // ============================================
  // MASTERY ACHIEVEMENTS
  // ============================================

  /** Check envelope count milestones */
  const checkEnvelopeCount = useCallback(
    async (count: number) => {
      const results = [];

      if (count >= 5) {
        results.push(await checkAndUnlock("envelopes_5", true, { count }));
      }
      if (count >= 10) {
        results.push(await checkAndUnlock("envelopes_10", true, { count }));
      }

      return results.find(r => r.unlocked) || { unlocked: false, achievementKey: null, points: 0 };
    },
    [checkAndUnlock]
  );

  /** Check transaction count milestones */
  const checkTransactionCount = useCallback(
    async (count: number) => {
      const results = [];

      if (count >= 10) {
        results.push(await checkAndUnlock("transactions_10", true, { count }));
      }
      if (count >= 50) {
        results.push(await checkAndUnlock("transactions_50", true, { count }));
      }
      if (count >= 100) {
        results.push(await checkAndUnlock("transactions_100", true, { count }));
      }

      return results.find(r => r.unlocked) || { unlocked: false, achievementKey: null, points: 0 };
    },
    [checkAndUnlock]
  );

  /** Check zero-based budget achieved */
  const checkZeroBudgetAchieved = useCallback(
    async (unallocatedAmount: number) => {
      return checkAndUnlock("zero_budget_achieved", unallocatedAmount === 0);
    },
    [checkAndUnlock]
  );

  // ============================================
  // GOALS ACHIEVEMENTS
  // ============================================

  /** Check first goal created */
  const checkFirstGoal = useCallback(
    async (goalCount: number) => {
      return checkAndUnlock("first_goal", goalCount >= 1);
    },
    [checkAndUnlock]
  );

  /** Check goal achieved */
  const checkGoalAchieved = useCallback(
    async (goalAchieved: boolean, goalName?: string) => {
      return checkAndUnlock("goal_achieved", goalAchieved, { goalName });
    },
    [checkAndUnlock]
  );

  /** Check milestone achieved */
  const checkMilestoneAchieved = useCallback(
    async (milestoneAchieved: boolean, milestoneName?: string) => {
      return checkAndUnlock("milestone_achieved", milestoneAchieved, { milestoneName });
    },
    [checkAndUnlock]
  );

  /** Check emergency fund started */
  const checkEmergencyFundStarted = useCallback(
    async (emergencyFundBalance: number) => {
      return checkAndUnlock("emergency_fund_started", emergencyFundBalance > 0);
    },
    [checkAndUnlock]
  );

  /** Check emergency fund complete (Starter Stash - $1000) */
  const checkStarterStash = useCallback(
    async (emergencyFundBalance: number) => {
      return checkAndUnlock("emergency_fund_complete", emergencyFundBalance >= 1000, {
        balance: emergencyFundBalance,
      });
    },
    [checkAndUnlock]
  );

  /** Check savings hit $1000 */
  const checkSavings1000 = useCallback(
    async (totalSavings: number) => {
      return checkAndUnlock("savings_1000", totalSavings >= 1000, { savings: totalSavings });
    },
    [checkAndUnlock]
  );

  // ============================================
  // DEBT ACHIEVEMENTS
  // ============================================

  /** Check debt journey started */
  const checkDebtJourneyStarted = useCallback(
    async (hasDebtEnvelopes: boolean) => {
      return checkAndUnlock("debt_journey_started", hasDebtEnvelopes);
    },
    [checkAndUnlock]
  );

  /** Check first debt payment */
  const checkFirstDebtPayment = useCallback(
    async (debtPaymentMade: boolean, amount?: number) => {
      return checkAndUnlock("first_debt_payment", debtPaymentMade, { amount });
    },
    [checkAndUnlock]
  );

  /** Check debt paid off */
  const checkDebtPaidOff = useCallback(
    async (debtPaidOff: boolean, debtName?: string) => {
      return checkAndUnlock("debt_paid_off", debtPaidOff, { debtName });
    },
    [checkAndUnlock]
  );

  /** Check all debts paid */
  const checkDebtFree = useCallback(
    async (totalDebt: number, hadDebt: boolean) => {
      return checkAndUnlock("all_debts_paid", totalDebt === 0 && hadDebt);
    },
    [checkAndUnlock]
  );

  /** Check high interest debt tackled */
  const checkHighInterestTackled = useCallback(
    async (highInterestDebtPaidOff: boolean) => {
      return checkAndUnlock("high_interest_tackled", highInterestDebtPaidOff);
    },
    [checkAndUnlock]
  );

  // ============================================
  // STREAKS ACHIEVEMENTS
  // ============================================

  /** Check streak milestones */
  const checkStreak = useCallback(
    async (streakDays: number) => {
      const results = [];

      if (streakDays >= 7) {
        results.push(await checkAndUnlock("week_streak", true, { days: streakDays }));
      }
      if (streakDays >= 30) {
        results.push(await checkAndUnlock("month_streak", true, { days: streakDays }));
      }
      if (streakDays >= 90) {
        results.push(await checkAndUnlock("quarter_streak", true, { days: streakDays }));
      }
      if (streakDays >= 365) {
        results.push(await checkAndUnlock("year_streak", true, { days: streakDays }));
      }

      return results.find(r => r.unlocked) || { unlocked: false, achievementKey: null, points: 0 };
    },
    [checkAndUnlock]
  );

  // ============================================
  // COMMUNITY ACHIEVEMENTS
  // ============================================

  /** Check Discord joined */
  const checkDiscordJoined = useCallback(
    async () => {
      return checkAndUnlock("discord_joined", true);
    },
    [checkAndUnlock]
  );

  /** Check first share */
  const checkFirstShare = useCallback(
    async () => {
      return checkAndUnlock("first_share", true);
    },
    [checkAndUnlock]
  );

  /** Check helper badge */
  const checkHelper = useCallback(
    async () => {
      return checkAndUnlock("helper", true);
    },
    [checkAndUnlock]
  );

  // ============================================
  // LEGACY COMPATIBILITY (from definitions.ts)
  // ============================================

  /** Check net positive (net worth goes from negative to positive) */
  const checkNetPositive = useCallback(
    async (previousNetWorth: number, currentNetWorth: number) => {
      return checkAndUnlock(
        "net-positive",
        previousNetWorth < 0 && currentNetWorth >= 0,
        { previousNetWorth, currentNetWorth }
      );
    },
    [checkAndUnlock]
  );

  /** Check century club (100 transactions categorised) */
  const checkCenturyClub = useCallback(
    async (categorisedCount: number) => {
      return checkAndUnlock("century-club", categorisedCount >= 100, { count: categorisedCount });
    },
    [checkAndUnlock]
  );

  // ============================================
  // BULK CHECK FUNCTION
  // ============================================

  /**
   * Check multiple achievements at once based on current user stats
   * Call this periodically (e.g., on dashboard load) to catch any missed achievements
   */
  const checkAllAchievements = useCallback(
    async (stats: {
      envelopeCount?: number;
      transactionCount?: number;
      reconciliationCount?: number;
      bankConnectionCount?: number;
      allocationPercent?: number;
      goalCount?: number;
      emergencyFundBalance?: number;
      totalSavings?: number;
      totalDebt?: number;
      hadDebt?: boolean;
      streakDays?: number;
      categorisedCount?: number;
    }) => {
      const results = [];

      // Getting Started
      if (stats.envelopeCount !== undefined && stats.envelopeCount >= 1) {
        results.push(await checkFirstEnvelope(stats.envelopeCount));
      }
      if (stats.transactionCount !== undefined && stats.transactionCount >= 1) {
        results.push(await checkFirstTransaction(stats.transactionCount));
      }
      if (stats.reconciliationCount !== undefined && stats.reconciliationCount >= 1) {
        results.push(await checkFirstReconciliation(stats.reconciliationCount));
      }
      if (stats.bankConnectionCount !== undefined && stats.bankConnectionCount >= 1) {
        results.push(await checkBankConnected(stats.bankConnectionCount));
      }
      if (stats.allocationPercent !== undefined && stats.allocationPercent >= 100) {
        results.push(await checkFirstBudgetComplete(stats.allocationPercent));
      }

      // Mastery
      if (stats.envelopeCount !== undefined) {
        results.push(await checkEnvelopeCount(stats.envelopeCount));
      }
      if (stats.transactionCount !== undefined) {
        results.push(await checkTransactionCount(stats.transactionCount));
      }

      // Goals
      if (stats.goalCount !== undefined && stats.goalCount >= 1) {
        results.push(await checkFirstGoal(stats.goalCount));
      }
      if (stats.emergencyFundBalance !== undefined) {
        if (stats.emergencyFundBalance > 0) {
          results.push(await checkEmergencyFundStarted(stats.emergencyFundBalance));
        }
        if (stats.emergencyFundBalance >= 1000) {
          results.push(await checkStarterStash(stats.emergencyFundBalance));
        }
      }
      if (stats.totalSavings !== undefined && stats.totalSavings >= 1000) {
        results.push(await checkSavings1000(stats.totalSavings));
      }

      // Debt
      if (stats.totalDebt !== undefined && stats.hadDebt) {
        if (stats.totalDebt === 0) {
          results.push(await checkDebtFree(stats.totalDebt, stats.hadDebt));
        }
      }

      // Streaks
      if (stats.streakDays !== undefined) {
        results.push(await checkStreak(stats.streakDays));
      }

      // Century Club
      if (stats.categorisedCount !== undefined && stats.categorisedCount >= 100) {
        results.push(await checkCenturyClub(stats.categorisedCount));
      }

      // Return first unlocked achievement for toast display
      return results.find(r => r.unlocked) || { unlocked: false, achievementKey: null, points: 0 };
    },
    [
      checkFirstEnvelope,
      checkFirstTransaction,
      checkFirstReconciliation,
      checkBankConnected,
      checkFirstBudgetComplete,
      checkEnvelopeCount,
      checkTransactionCount,
      checkFirstGoal,
      checkEmergencyFundStarted,
      checkStarterStash,
      checkSavings1000,
      checkDebtFree,
      checkStreak,
      checkCenturyClub,
    ]
  );

  return {
    // Core
    checkAndUnlock,
    checkAllAchievements,

    // Getting Started
    checkOnboardingComplete,
    checkFirstEnvelope,
    checkFirstTransaction,
    checkFirstReconciliation,
    checkFirstBudgetComplete,
    checkBankConnected,

    // Mastery
    checkEnvelopeCount,
    checkTransactionCount,
    checkZeroBudgetAchieved,

    // Goals
    checkFirstGoal,
    checkGoalAchieved,
    checkMilestoneAchieved,
    checkEmergencyFundStarted,
    checkStarterStash,
    checkSavings1000,

    // Debt
    checkDebtJourneyStarted,
    checkFirstDebtPayment,
    checkDebtPaidOff,
    checkDebtFree,
    checkHighInterestTackled,

    // Streaks
    checkStreak,

    // Community
    checkDiscordJoined,
    checkFirstShare,
    checkHelper,

    // Legacy
    checkNetPositive,
    checkCenturyClub,
  };
}
