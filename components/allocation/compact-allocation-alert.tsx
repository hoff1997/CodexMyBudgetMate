"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, AlertTriangle, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";

interface CompactAllocationAlertProps {
  allocationState: "balanced" | "under" | "over";
  unallocatedAmount?: number;
  overAllocatedAmount?: number;
}

export function CompactAllocationAlert({
  allocationState,
  unallocatedAmount = 0,
  overAllocatedAmount = 0,
}: CompactAllocationAlertProps) {
  const router = useRouter();
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Only dismiss for 'balanced' state
    if (allocationState === "balanced") {
      const dismissed = localStorage.getItem("allocation-alert-dismissed");
      setIsDismissed(dismissed === "true");
    }
  }, [allocationState]);

  const handleDismiss = () => {
    localStorage.setItem("allocation-alert-dismissed", "true");
    setIsDismissed(true);
  };

  // Critical states always show
  const isCritical = allocationState === "over" || allocationState === "under";

  if (isDismissed && !isCritical) {
    return null;
  }

  // Over-allocated (critical - can't dismiss)
  if (allocationState === "over") {
    return (
      <div className="rounded-xl border border-blue bg-blue-light/30 p-3">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-blue-light flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="h-4 w-4 text-blue" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-text-dark">
              <strong className="text-blue">
                Over-allocated by ${overAllocatedAmount.toFixed(2)}
              </strong>{" "}
              - reduce envelope allocations below to balance your budget.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Unallocated (important - can't dismiss)
  if (allocationState === "under") {
    return (
      <div className="rounded-xl border border-gold bg-gold-light/30 p-3">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gold-light flex items-center justify-center flex-shrink-0">
            <span className="text-lg">💵</span>
          </div>
          <div className="flex-1">
            <p className="text-sm text-text-dark">
              You have{" "}
              <strong className="text-gold">
                ${unallocatedAmount.toFixed(2)} unallocated
              </strong>{" "}
              income.
              <Button
                variant="link"
                size="sm"
                onClick={() => router.push("/dashboard#suggestions")}
                className="text-sage-dark hover:text-sage p-0 h-auto text-sm inline ml-1"
              >
                Check dashboard for suggestions
                <ExternalLink className="h-3 w-3 ml-1 inline" />
              </Button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // All good (dismissible)
  return (
    <div className="rounded-xl border border-sage-light bg-sage-very-light p-3">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-sage-light flex items-center justify-center flex-shrink-0">
          <span className="text-lg">✓</span>
        </div>
        <div className="flex-1">
          <p className="text-sm text-sage-dark">
            Budget fully allocated. Use the table below to adjust allocations
            anytime.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="h-7 w-7 p-0 flex-shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
