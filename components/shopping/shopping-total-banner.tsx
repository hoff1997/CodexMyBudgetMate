"use client";

import { useState, useEffect } from "react";
import { RemyAvatar } from "@/components/onboarding/remy-tip";
import { Button } from "@/components/ui/button";
import { X, DollarSign, Wallet } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/utils/format";

const STORAGE_KEY = "shopping-price-disclaimer-dismissed";

interface ShoppingTotalBannerProps {
  estimatedTotal: number;
  linkedEnvelopeBalance?: number | null;
  linkedEnvelopeName?: string | null;
  className?: string;
}

export function ShoppingTotalBanner({
  estimatedTotal,
  linkedEnvelopeBalance,
  linkedEnvelopeName,
  className,
}: ShoppingTotalBannerProps) {
  const [isDismissed, setIsDismissed] = useState(true); // Start dismissed to avoid flash

  // Load dismissed state from localStorage
  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    setIsDismissed(dismissed === "true");
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setIsDismissed(true);
  };

  // Don't show if no estimated total
  if (estimatedTotal <= 0) {
    return null;
  }

  // Determine if over budget
  const isOverBudget = linkedEnvelopeBalance !== null &&
    linkedEnvelopeBalance !== undefined &&
    estimatedTotal > linkedEnvelopeBalance;

  return (
    <div className={cn("space-y-2", className)}>
      {/* Main total display - always visible */}
      <div className="flex items-center justify-between gap-4 bg-white border border-silver-light rounded-lg px-4 py-3">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Estimated Total */}
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-sage" />
            <div>
              <span className="text-xs text-text-medium">Approx Total</span>
              <p className="text-lg font-semibold text-text-dark">
                {formatMoney(estimatedTotal)}
              </p>
            </div>
          </div>

          {/* Linked Envelope Balance */}
          {linkedEnvelopeBalance !== null && linkedEnvelopeBalance !== undefined && linkedEnvelopeName && (
            <>
              <div className="h-8 w-px bg-silver-light" />
              <div className="flex items-center gap-2">
                <Wallet className={cn(
                  "h-4 w-4",
                  isOverBudget ? "text-gold" : "text-sage"
                )} />
                <div>
                  <span className="text-xs text-text-medium">{linkedEnvelopeName}</span>
                  <p className={cn(
                    "text-lg font-semibold",
                    isOverBudget ? "text-gold" : "text-sage-dark"
                  )}>
                    {formatMoney(linkedEnvelopeBalance)}
                    <span className="text-xs font-normal text-text-medium ml-1">available</span>
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Over budget warning */}
        {isOverBudget && (
          <div className="text-xs text-gold bg-gold-light px-2 py-1 rounded">
            Over budget by {formatMoney(estimatedTotal - linkedEnvelopeBalance!)}
          </div>
        )}
      </div>

      {/* Remy's dismissable message */}
      {!isDismissed && (
        <div className="relative flex items-start gap-3 bg-sage-very-light border border-sage-light rounded-lg p-3">
          <RemyAvatar pose="small" size="sm" className="!w-8 !h-8 !border-0 !shadow-none flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-text-dark">
              Just a heads up - these prices are based on what you've entered.
              Actual prices at the checkout might be different, so think of this
              as a ballpark figure rather than exact.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="flex-shrink-0 h-6 w-6 p-0 -mt-1 -mr-1 hover:bg-sage-light"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
