"use client";

import { useEffect, useCallback, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RemyAvatar } from "@/components/onboarding/remy-tip";
import { PartyPopper } from "lucide-react";
import type { DetectedMilestone } from "@/lib/utils/milestone-detector";

// Import confetti for celebration effect
let confetti: typeof import("canvas-confetti").default | null = null;

interface MilestoneCompletionDialogProps {
  milestone: DetectedMilestone | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDismiss: () => Promise<void>;
}

/**
 * MilestoneCompletionDialog - Celebrates when users achieve financial milestones
 *
 * Features:
 * - Confetti animation on open
 * - Remy's celebrating avatar
 * - Personalized congratulations message
 * - Dismiss to prevent showing again
 */
export function MilestoneCompletionDialog({
  milestone,
  open,
  onOpenChange,
  onDismiss,
}: MilestoneCompletionDialogProps) {
  const [isDismissing, setIsDismissing] = useState(false);

  // Trigger confetti when dialog opens
  const triggerConfetti = useCallback(async () => {
    if (!confetti) {
      try {
        const confettiModule = await import("canvas-confetti");
        confetti = confettiModule.default;
      } catch (error) {
        console.error("Failed to load confetti:", error);
        return;
      }
    }

    if (confetti) {
      const colors = milestone?.confettiColors ?? ["#7A9E9A", "#D4A853", "#B8D4D0"];

      // First burst
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors,
      });

      // Second burst after short delay
      setTimeout(() => {
        if (confetti) {
          confetti({
            particleCount: 50,
            spread: 100,
            origin: { y: 0.5, x: 0.3 },
            colors,
          });
          confetti({
            particleCount: 50,
            spread: 100,
            origin: { y: 0.5, x: 0.7 },
            colors,
          });
        }
      }, 250);
    }
  }, [milestone?.confettiColors]);

  useEffect(() => {
    if (open && milestone) {
      triggerConfetti();
    }
  }, [open, milestone, triggerConfetti]);

  const handleDismiss = async () => {
    setIsDismissing(true);
    try {
      await onDismiss();
      onOpenChange(false);
    } finally {
      setIsDismissing(false);
    }
  };

  if (!milestone) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          {/* Celebration header with Remy */}
          <div className="flex flex-col items-center gap-4 mb-4">
            <div className="relative">
              <RemyAvatar pose="celebrating" size="lg" />
              <div className="absolute -top-2 -right-2 bg-gold text-white rounded-full p-2">
                <PartyPopper className="h-5 w-5" />
              </div>
            </div>

            <div className="text-4xl">{milestone.icon}</div>
          </div>

          <DialogTitle className="text-xl text-center text-sage-dark">
            {milestone.title}
          </DialogTitle>

          <DialogDescription className="text-center text-text-medium">
            {milestone.description}
          </DialogDescription>
        </DialogHeader>

        {/* Remy's message */}
        <div className="bg-sage-very-light rounded-lg p-4 my-4 border border-sage-light">
          <p className="text-sm text-sage-dark leading-relaxed">
            {milestone.remyMessage}
          </p>
          <p className="text-xs text-sage mt-3 font-medium text-right">
            — Remy
          </p>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Keep Celebrating
          </Button>
          <Button
            onClick={handleDismiss}
            disabled={isDismissing}
            className="w-full sm:w-auto bg-sage hover:bg-sage-dark"
          >
            {isDismissing ? "Saving..." : "Got it, thanks!"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
