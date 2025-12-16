"use client";

import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AchievementDefinition } from "@/lib/achievements/definitions";

interface CelebrationModalProps {
  achievement: AchievementDefinition | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CelebrationModal({
  achievement,
  isOpen,
  onClose,
}: CelebrationModalProps) {
  const hasConfettiFired = useRef(false);

  useEffect(() => {
    if (isOpen && achievement && !hasConfettiFired.current) {
      hasConfettiFired.current = true;

      // Fire confetti from both sides
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        // Left side confetti
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.6 },
          colors: ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"],
        });

        // Right side confetti
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.6 },
          colors: ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"],
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };

      frame();
    }

    // Reset when modal closes
    if (!isOpen) {
      hasConfettiFired.current = false;
    }
  }, [isOpen, achievement]);

  if (!achievement) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold">
            {achievement.celebrationTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-4">
          {/* Achievement Icon */}
          <div className="text-7xl animate-bounce">{achievement.icon}</div>

          {/* Achievement Name & Description */}
          <div className="text-center">
            <h3 className="text-xl font-semibold text-foreground">
              {achievement.name}
            </h3>
            <p className="text-muted-foreground mt-1">
              {achievement.description}
            </p>
          </div>

          {/* Celebration Message */}
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-foreground">
              {achievement.celebrationMessage}
            </p>
          </div>

          {/* Remy's Message */}
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 w-full">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🐀</span>
              <div>
                <p className="text-sm font-medium text-primary mb-1">
                  Remy says:
                </p>
                <p className="text-sm text-foreground italic">
                  &ldquo;{achievement.remyMessage}&rdquo;
                </p>
              </div>
            </div>
          </div>

          {/* Close Button */}
          <Button onClick={onClose} className="w-full">
            Awesome!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
