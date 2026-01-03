"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";

interface AchievementCelebrationProps {
  achievement: {
    name: string;
    description: string;
    icon: string;
    bonus_stars?: number;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AchievementCelebration({
  achievement,
  open,
  onOpenChange,
}: AchievementCelebrationProps) {
  useEffect(() => {
    if (open && achievement) {
      // Fire confetti
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.6 },
          colors: ["#7A9E9A", "#D4A853", "#6B9ECE"],
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.6 },
          colors: ["#7A9E9A", "#D4A853", "#6B9ECE"],
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };

      frame();
    }
  }, [open, achievement]);

  if (!achievement) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm text-center border-2 border-gold">
        <div className="space-y-4 py-6">
          {/* Achievement Icon */}
          <div className="relative inline-block">
            <div className="text-7xl animate-bounce">{achievement.icon}</div>
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-gold rounded-full flex items-center justify-center animate-pulse">
              <Star className="h-4 w-4 text-white fill-white" />
            </div>
          </div>

          {/* Title */}
          <div>
            <div className="text-sm text-gold font-medium uppercase tracking-wide mb-1">
              Achievement Unlocked!
            </div>
            <h2 className="text-2xl font-bold text-text-dark">
              {achievement.name}
            </h2>
            <p className="text-sm text-text-medium mt-2">
              {achievement.description}
            </p>
          </div>

          {/* Bonus Stars */}
          {achievement.bonus_stars && achievement.bonus_stars > 0 && (
            <div className="bg-gold-light p-4 rounded-xl">
              <div className="text-sm text-text-medium mb-1">Bonus Reward</div>
              <div className="flex items-center justify-center gap-2">
                <Star className="h-6 w-6 text-gold fill-gold" />
                <span className="text-3xl font-bold text-gold">
                  +{achievement.bonus_stars}
                </span>
                <span className="text-lg text-gold-dark">stars</span>
              </div>
            </div>
          )}

          {/* Close Button */}
          <Button
            onClick={() => onOpenChange(false)}
            className="w-full bg-sage hover:bg-sage-dark text-lg py-6"
          >
            Awesome!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
