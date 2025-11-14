"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Share2, Lock } from "lucide-react";
import { getAchievement, getAchievementTier, type AchievementCategory } from "@/lib/gamification/achievements";
import { format } from "date-fns";

interface UserAchievement {
  achievement_key: string;
  earned_at: string;
  points: number;
  metadata?: any;
}

interface BadgeDisplayProps {
  achievements: UserAchievement[];
  totalPoints: number;
  onShareBadge?: (achievementKey: string) => void;
  compact?: boolean;
}

export function BadgeDisplay({
  achievements,
  totalPoints,
  onShareBadge,
  compact = false,
}: BadgeDisplayProps) {
  const tier = getAchievementTier(totalPoints);

  // Group by category
  const achievementsByCategory = achievements.reduce((acc, userAch) => {
    const achievement = getAchievement(userAch.achievement_key);
    if (!achievement) return acc;

    if (!acc[achievement.category]) {
      acc[achievement.category] = [];
    }
    acc[achievement.category].push({ ...userAch, achievement });
    return acc;
  }, {} as Record<AchievementCategory, Array<UserAchievement & { achievement: any }>>);

  const categoryLabels: Record<AchievementCategory, string> = {
    getting_started: 'Getting Started',
    mastery: 'Mastery',
    goals: 'Goals',
    debt: 'Debt Freedom',
    streaks: 'Consistency',
    community: 'Community',
  };

  if (compact) {
    return (
      <div className="space-y-4">
        {/* Tier badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className={`h-5 w-5 ${tier.color}`} />
            <div>
              <p className="font-medium">{tier.label}</p>
              <p className="text-xs text-muted-foreground">{totalPoints} points</p>
            </div>
          </div>
          <Badge variant="outline">{achievements.length} badges</Badge>
        </div>

        {/* Recent badges */}
        <div className="flex gap-2 flex-wrap">
          {achievements.slice(0, 6).map((userAch) => {
            const achievement = getAchievement(userAch.achievement_key);
            if (!achievement) return null;

            return (
              <div
                key={userAch.achievement_key}
                className="text-3xl"
                title={achievement.title}
              >
                {achievement.icon}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with tier */}
      <Card className="bg-gradient-to-r from-emerald-500 to-blue-500 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="h-6 w-6" />
                <h3 className="text-2xl font-bold">{tier.label}</h3>
              </div>
              <p className="text-white/90">
                {totalPoints} points • {achievements.length} achievements earned
              </p>
            </div>
            <div className="text-5xl">{achievements.length > 0 ? '🏆' : '🌟'}</div>
          </div>
        </CardContent>
      </Card>

      {/* Achievements by category */}
      {Object.entries(achievementsByCategory).map(([category, categoryAchievements]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="text-lg">
              {categoryLabels[category as AchievementCategory]}
            </CardTitle>
            <CardDescription>
              {categoryAchievements.length} earned
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {categoryAchievements.map((userAch) => {
                const { achievement } = userAch;

                return (
                  <div
                    key={userAch.achievement_key}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:shadow-md transition-shadow"
                  >
                    {/* Icon */}
                    <div className="text-3xl flex-shrink-0">{achievement.icon}</div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-sm">{achievement.title}</h4>
                        <Badge variant="secondary" className="text-xs">
                          +{achievement.points}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {achievement.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Earned {format(new Date(userAch.earned_at), 'MMM d, yyyy')}
                      </p>
                    </div>

                    {/* Share button */}
                    {onShareBadge && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onShareBadge(userAch.achievement_key)}
                        className="flex-shrink-0"
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Empty state */}
      {achievements.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-6xl mb-4">🌟</div>
            <h3 className="font-semibold text-lg mb-2">Start Your Journey!</h3>
            <p className="text-muted-foreground">
              Complete actions to earn badges and build momentum.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Locked badge preview (for showing unearned achievements)
 */
export function LockedBadge({ achievementKey }: { achievementKey: string }) {
  const achievement = getAchievement(achievementKey);

  if (!achievement) return null;

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/50 opacity-60">
      {/* Locked icon */}
      <div className="relative text-3xl flex-shrink-0">
        <span className="opacity-30">{achievement.icon}</span>
        <Lock className="h-4 w-4 absolute top-0 right-0 text-muted-foreground" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-semibold text-sm text-muted-foreground">
            {achievement.title}
          </h4>
          <Badge variant="outline" className="text-xs">
            +{achievement.points}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {achievement.description}
        </p>
      </div>
    </div>
  );
}
