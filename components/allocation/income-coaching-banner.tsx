"use client";

import { useState, useEffect } from "react";
import { X, Lightbulb, DollarSign, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/**
 * IncomeInfoButton - Standalone info button to show income coaching
 */
export function IncomeInfoButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="p-1 rounded-full text-text-light hover:text-blue hover:bg-blue-light/50 transition-colors flex-shrink-0"
      title="About Income Cards"
      aria-label="Show income coaching information"
    >
      <Info className="h-3.5 w-3.5" />
    </button>
  );
}

/**
 * IncomeCoachingBanner - Explains income cards to users
 *
 * Key messaging:
 * - This is a one-off setup
 * - Only update if income changes OR envelope budget changes
 * - All income should be 100% allocated (including to Surplus)
 * - Uses "Unallocated" not "Surplus" for income cards
 */
export function IncomeCoachingBanner({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void }) {
  const [isDismissed, setIsDismissed] = useState(true); // Start hidden until we check localStorage

  // Load dismissal state on mount
  useEffect(() => {
    const dismissed = localStorage.getItem('income-coaching-dismissed');
    setIsDismissed(dismissed === 'true');
  }, []);

  // Handle dismiss
  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('income-coaching-dismissed', 'true');
    onClose?.();
  };

  // If controlled via props, use that
  if (isOpen !== undefined) {
    if (!isOpen) return null;
  } else {
    // Show info icon when dismissed - returns null, parent should render the icon
    if (isDismissed) {
      return null;
    }
  }

  return (
    <Card className="border-blue-light bg-[#DDEAF5]/30 mb-6 relative">
      <div className="p-4">
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDismiss}
          className="absolute top-2 right-2 h-6 w-6 hover:bg-blue-light/50"
          aria-label="Dismiss coaching message"
        >
          <X className="h-4 w-4 text-blue" />
        </Button>

        {/* Content */}
        <div className="flex gap-3 pr-8">
          {/* Icon */}
          <div className="flex-shrink-0">
            <div className="h-10 w-10 rounded-full bg-blue-light border border-blue flex items-center justify-center">
              <Lightbulb className="h-5 w-5 text-blue" />
            </div>
          </div>

          {/* Message */}
          <div className="flex-1">
            <h3 className="font-semibold text-text-dark mb-2 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue" />
              About Your Income Cards
            </h3>
            <div className="text-sm text-text-dark space-y-2">
              <p>
                These cards show your income sources and how much you&apos;ve committed
                from each one. <strong>This is a one-off setup</strong> - you only
                need to touch these if your income changes or you change an envelope&apos;s
                budget.
              </p>
              <div className="bg-white/50 rounded-lg p-3 mt-3">
                <p className="font-medium text-sage-dark mb-1">How it works:</p>
                <ul className="text-xs space-y-1 ml-4 list-disc">
                  <li>
                    <strong>Per Pay</strong> - How much you earn each pay cycle
                  </li>
                  <li>
                    <strong>Allocated</strong> - How much you&apos;ve committed to envelopes
                    (should be 100%)
                  </li>
                  <li>
                    <strong>Unallocated</strong> - If anything isn&apos;t assigned to an
                    envelope yet
                  </li>
                </ul>
              </div>
              <p className="text-xs text-sage-dark italic mt-3">
                Tip: All your income should be allocated, including
                to your Surplus envelope. If you see &quot;unallocated&quot; money, assign it to
                an envelope.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
