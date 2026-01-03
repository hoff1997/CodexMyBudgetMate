"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";

interface PurchaseCelebrationProps {
  item: {
    name: string;
    star_cost: number;
    image_url?: string | null;
  } | null;
  newBalance: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContinueShopping: () => void;
}

export function PurchaseCelebration({
  item,
  newBalance,
  open,
  onOpenChange,
  onContinueShopping,
}: PurchaseCelebrationProps) {
  useEffect(() => {
    if (open && item) {
      // Trigger confetti celebration
      const duration = 2000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.7 },
          colors: ["#7A9E9A", "#D4A853", "#6B9ECE"],
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.7 },
          colors: ["#7A9E9A", "#D4A853", "#6B9ECE"],
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };

      frame();
    }
  }, [open, item]);

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm text-center">
        <div className="space-y-4 py-6">
          {/* Celebration Header */}
          <div className="text-6xl animate-bounce">🎉</div>
          <h2 className="text-2xl font-bold text-text-dark">You got it!</h2>

          {/* Item Display */}
          <div className="bg-sage-very-light rounded-xl p-6">
            <div className="w-24 h-24 mx-auto bg-white rounded-lg flex items-center justify-center mb-3">
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <span className="text-4xl">🎁</span>
              )}
            </div>
            <div className="text-xl font-semibold text-sage-dark">
              {item.name}
            </div>
          </div>

          {/* New Balance */}
          <div className="bg-gold-light p-4 rounded-lg">
            <div className="text-sm text-text-medium mb-1">Your new balance:</div>
            <div className="flex items-center justify-center gap-2 text-2xl font-bold text-gold-dark">
              <Star className="h-6 w-6 fill-gold text-gold" />
              {newBalance} stars
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4">
            <Button
              onClick={onContinueShopping}
              className="w-full bg-sage hover:bg-sage-dark"
            >
              Continue Shopping
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
