"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ACHIEVEMENTS,
  Achievement,
  AchievementCategory,
} from "@/lib/gamification/achievements";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface UnlockedAchievement {
  achievement_type: string;
  unlocked_at: string;
}

interface AchievementCardProps {
  achievement: Achievement;
  unlocked: boolean;
  unlockedAt?: string;
}

function AchievementCard({
  achievement,
  unlocked,
}: AchievementCardProps) {
  return (
    <div
      className={cn(
        "relative flex items-start gap-2 px-2 py-1.5 rounded-md border transition-all",
        unlocked
          ? "bg-card border-primary/30"
          : "bg-muted/30 border-border/50 opacity-50"
      )}
    >
      {/* Badge icon */}
      <div
        className={cn(
          "w-6 h-6 flex items-center justify-center text-base flex-shrink-0 mt-0.5",
          unlocked ? "" : "grayscale"
        )}
      >
        {achievement.icon}
      </div>

      {/* Achievement name and description */}
      <div className="flex-1 min-w-0">
        <div
          className={cn(
            "text-[11px] leading-tight font-medium truncate",
            unlocked ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {achievement.title}
        </div>
        <div className="text-[10px] text-muted-foreground leading-tight truncate">
          {achievement.description}
        </div>
      </div>

      {/* Completed tick or locked indicator */}
      {unlocked ? (
        <div className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-primary flex items-center justify-center">
          <Check className="w-2.5 h-2.5 text-white" />
        </div>
      ) : (
        <div className="absolute top-0.5 right-0.5 text-[10px] opacity-40">🔒</div>
      )}
    </div>
  );
}

export function AchievementGallery() {
  const [unlockedMap, setUnlockedMap] = useState<
    Record<string, UnlockedAchievement>
  >({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function fetchAchievements() {
      // Use type assertion for table that may not exist in generated types yet
      const { data, error } = await (supabase as unknown as {
        from: (table: string) => {
          select: (cols: string) => Promise<{
            data: UnlockedAchievement[] | null;
            error: unknown;
          }>;
        };
      })
        .from("achievements")
        .select("achievement_type, unlocked_at");

      if (!error && data) {
        const map: Record<string, UnlockedAchievement> = {};
        data.forEach((a) => {
          map[a.achievement_type] = a;
        });
        setUnlockedMap(map);
      }
      setIsLoading(false);
    }

    fetchAchievements();
  }, []);

  const allAchievements = Object.values(ACHIEVEMENTS);
  const unlockedCount = Object.keys(unlockedMap).length;
  const totalCount = allAchievements.length;

  // Group by category (from gamification achievements)
  const categories: Record<AchievementCategory, Achievement[]> = {
    getting_started: allAchievements.filter((a) => a.category === "getting_started"),
    mastery: allAchievements.filter((a) => a.category === "mastery"),
    goals: allAchievements.filter((a) => a.category === "goals"),
    debt: allAchievements.filter((a) => a.category === "debt"),
    streaks: allAchievements.filter((a) => a.category === "streaks"),
    community: allAchievements.filter((a) => a.category === "community"),
  };

  const categoryLabels: Record<AchievementCategory, string> = {
    getting_started: "Getting Started",
    mastery: "Mastery",
    goals: "Goals",
    debt: "Debt Freedom",
    streaks: "Streaks",
    community: "Community",
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Achievements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Achievements</CardTitle>
          <span className="text-sm text-muted-foreground">
            {unlockedCount} / {totalCount} unlocked
          </span>
        </div>
        {/* Progress bar */}
        <div className="w-full bg-muted rounded-full h-2 mt-2">
          <div
            className="bg-primary h-2 rounded-full transition-all"
            style={{ width: `${(unlockedCount / totalCount) * 100}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {(Object.keys(categories) as Array<AchievementCategory>).map(
          (category) =>
            categories[category].length > 0 && (
              <div key={category}>
                <h4 className="text-xs font-medium text-muted-foreground mb-2">
                  {categoryLabels[category]}
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
                  {categories[category].map((achievement) => (
                    <AchievementCard
                      key={achievement.key}
                      achievement={achievement}
                      unlocked={!!unlockedMap[achievement.key]}
                      unlockedAt={unlockedMap[achievement.key]?.unlocked_at}
                    />
                  ))}
                </div>
              </div>
            )
        )}
      </CardContent>
    </Card>
  );
}
