"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ACHIEVEMENTS } from "@/lib/gamification/achievements";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface UnlockedAchievement {
  achievement_type: string;
  unlocked_at: string;
}

export function SidebarBadges() {
  const [unlockedAchievements, setUnlockedAchievements] = useState<
    UnlockedAchievement[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function fetchAchievements() {
      // Use type assertion for table that may not exist in generated types yet
      const { data, error } = await (supabase as unknown as {
        from: (table: string) => {
          select: (cols: string) => {
            order: (col: string, opts: { ascending: boolean }) => Promise<{
              data: UnlockedAchievement[] | null;
              error: unknown;
            }>;
          };
        };
      })
        .from("achievements")
        .select("achievement_type, unlocked_at")
        .order("unlocked_at", { ascending: false });

      if (!error && data) {
        setUnlockedAchievements(data);
      }
      setIsLoading(false);
    }

    fetchAchievements();

    // Subscribe to new achievements
    const channel = supabase
      .channel("achievements-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "achievements",
        },
        (payload) => {
          setUnlockedAchievements((prev) => [
            payload.new as UnlockedAchievement,
            ...prev,
          ]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (isLoading || unlockedAchievements.length === 0) {
    return null;
  }

  // Show latest 5 achievements
  const displayedAchievements = unlockedAchievements.slice(0, 5);

  return (
    <TooltipProvider>
      <div className="px-3 py-2 border-t border-border/50">
        <p className="text-xs text-muted-foreground mb-2">Achievements</p>
        <div className="flex gap-1 flex-wrap">
          {displayedAchievements.map((unlocked) => {
            const achievement = ACHIEVEMENTS[unlocked.achievement_type];
            if (!achievement) return null;

            return (
              <Tooltip key={unlocked.achievement_type}>
                <TooltipTrigger asChild>
                  <button
                    className="text-lg hover:scale-125 transition-transform focus:outline-none focus:ring-2 focus:ring-primary/50 rounded"
                    aria-label={achievement.title}
                  >
                    {achievement.icon}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <div className="text-center">
                    <p className="font-medium">{achievement.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {achievement.description}
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
          {unlockedAchievements.length > 5 && (
            <span className="text-xs text-muted-foreground self-center ml-1">
              +{unlockedAchievements.length - 5}
            </span>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
