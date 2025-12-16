"use client";

import { useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

// Type for achievement records (table may not exist in generated types yet)
interface AchievementRecord {
  id: string;
  user_id: string;
  achievement_type: string;
  unlocked_at: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export function useAchievementCheck() {
  const supabase = createClient();

  const checkAndUnlock = useCallback(
    async (
      achievementId: string,
      condition: boolean
    ): Promise<{ unlocked: boolean; achievementId: string | null }> => {
      if (!condition) {
        return { unlocked: false, achievementId: null };
      }

      // Check if already unlocked - use type assertion for table that may not exist in types
      const { data: existing } = await (supabase as unknown as {
        from: (table: string) => {
          select: (cols: string) => {
            eq: (col: string, val: string) => {
              maybeSingle: () => Promise<{ data: AchievementRecord | null; error: unknown }>;
            };
          };
        };
      })
        .from("achievements")
        .select("id")
        .eq("achievement_type", achievementId)
        .maybeSingle();

      if (existing) {
        return { unlocked: false, achievementId: null };
      }

      // Unlock the achievement
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return { unlocked: false, achievementId: null };
      }

      // Use type assertion for insert
      const { error } = await (supabase as unknown as {
        from: (table: string) => {
          insert: (data: { user_id: string; achievement_type: string }) => Promise<{ error: unknown }>;
        };
      })
        .from("achievements")
        .insert({
          user_id: user.id,
          achievement_type: achievementId,
        });

      if (error) {
        console.error("Failed to unlock achievement:", error);
        return { unlocked: false, achievementId: null };
      }

      return { unlocked: true, achievementId };
    },
    [supabase]
  );

  const checkStarterStash = useCallback(
    async (emergencyFundBalance: number) => {
      return checkAndUnlock("starter-stash", emergencyFundBalance >= 1000);
    },
    [checkAndUnlock]
  );

  const checkFirstEnvelope = useCallback(
    async (envelopeCount: number) => {
      return checkAndUnlock("first-envelope", envelopeCount >= 1);
    },
    [checkAndUnlock]
  );

  const checkDebtFree = useCallback(
    async (totalDebt: number) => {
      return checkAndUnlock("debt-free", totalDebt === 0);
    },
    [checkAndUnlock]
  );

  const checkNetPositive = useCallback(
    async (previousNetWorth: number, currentNetWorth: number) => {
      return checkAndUnlock(
        "net-positive",
        previousNetWorth < 0 && currentNetWorth >= 0
      );
    },
    [checkAndUnlock]
  );

  const checkCenturyClub = useCallback(
    async (categorisedCount: number) => {
      return checkAndUnlock("century-club", categorisedCount >= 100);
    },
    [checkAndUnlock]
  );

  return {
    checkAndUnlock,
    checkStarterStash,
    checkFirstEnvelope,
    checkDebtFree,
    checkNetPositive,
    checkCenturyClub,
  };
}
