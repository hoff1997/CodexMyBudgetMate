"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ACHIEVEMENTS,
  AchievementDefinition,
  getAllAchievements,
} from "@/lib/achievements/definitions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface UnlockedAchievement {
  achievement_type: string;
  unlocked_at: string;
}

interface AchievementCardProps {
  achievement: AchievementDefinition;
  unlocked: boolean;
  unlockedAt?: string;
}

function AchievementCard({
  achievement,
  unlocked,
  unlockedAt,
}: AchievementCardProps) {
  return (
    <div
      className={cn(
        "relative p-4 rounded-lg border transition-all",
        unlocked
          ? "bg-card border-primary/30 shadow-sm"
          : "bg-muted/30 border-border/50 opacity-60"
      )}
    >
      {/* Badge icon */}
      <div
        className={cn(
          "text-4xl mb-3",
          unlocked ? "" : "grayscale opacity-50"
        )}
      >
        {achievement.icon}
      </div>

      {/* Achievement info */}
      <h3
        className={cn(
          "font-semibold text-sm",
          unlocked ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {achievement.name}
      </h3>
      <p className="text-xs text-muted-foreground mt-1">
        {achievement.description}
      </p>

      {/* Unlocked date */}
      {unlocked && unlockedAt && (
        <p className="text-xs text-primary mt-2">
          Unlocked {new Date(unlockedAt).toLocaleDateString()}
        </p>
      )}

      {/* Locked overlay indicator */}
      {!unlocked && (
        <div className="absolute top-2 right-2 text-lg opacity-50">🔒</div>
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

  const allAchievements = getAllAchievements();
  const unlockedCount = Object.keys(unlockedMap).length;
  const totalCount = allAchievements.length;

  // Group by category
  const categories = {
    savings: allAchievements.filter((a) => a.category === "savings"),
    debt: allAchievements.filter((a) => a.category === "debt"),
    budgeting: allAchievements.filter((a) => a.category === "budgeting"),
    consistency: allAchievements.filter((a) => a.category === "consistency"),
  };

  const categoryLabels = {
    savings: "Savings",
    debt: "Debt Freedom",
    budgeting: "Budgeting",
    consistency: "Consistency",
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
      <CardContent className="space-y-6">
        {(Object.keys(categories) as Array<keyof typeof categories>).map(
          (category) => (
            <div key={category}>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">
                {categoryLabels[category]}
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {categories[category].map((achievement) => (
                  <AchievementCard
                    key={achievement.id}
                    achievement={achievement}
                    unlocked={!!unlockedMap[achievement.id]}
                    unlockedAt={unlockedMap[achievement.id]?.unlocked_at}
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
