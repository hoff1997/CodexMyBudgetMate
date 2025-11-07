"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, TrendingUp, TrendingDown, Minus, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type BudgetImpact = {
  currentTotalRegular: number;
  newTotalRegular: number;
  difference: number;
  userPayAmount: number | null;
  currentSurplus: number | null;
  newSurplus: number | null;
  status: "unknown" | "improved" | "worsened" | "creates_shortfall" | "unchanged";
  warning: string | null;
  suggestion: string | null;
  payCycle: string;
};

export function BudgetImpactWidget({
  action,
  envelopeId,
  payCycleAmount,
  priority,
}: {
  action: "add" | "edit";
  envelopeId?: string;
  payCycleAmount: number;
  priority?: "essential" | "important" | "discretionary";
}) {
  const [impact, setImpact] = useState<BudgetImpact | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Debounce API calls
    const timeout = setTimeout(() => {
      if (payCycleAmount > 0) {
        fetchImpact();
      } else {
        setImpact(null);
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [payCycleAmount, action, envelopeId, priority]);

  async function fetchImpact() {
    setLoading(true);
    try {
      const response = await fetch("/api/planner/budget-impact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          envelopeId,
          payCycleAmount,
          priority,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setImpact(data);
      }
    } catch (error) {
      console.error("Failed to fetch budget impact:", error);
    } finally {
      setLoading(false);
    }
  }

  if (!impact || payCycleAmount === 0) {
    return null;
  }

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  // Color scheme based on status
  const statusStyles = {
    improved: "bg-green-50 border-green-200",
    unchanged: "bg-blue-50 border-blue-200",
    worsened: "bg-amber-50 border-amber-200",
    creates_shortfall: "bg-red-50 border-red-200",
    unknown: "bg-gray-50 border-gray-200",
  };

  const statusTextStyles = {
    improved: "text-green-900",
    unchanged: "text-blue-900",
    worsened: "text-amber-900",
    creates_shortfall: "text-red-900",
    unknown: "text-gray-900",
  };

  const statusIcons = {
    improved: <TrendingUp className="h-5 w-5 text-green-600" />,
    unchanged: <Minus className="h-5 w-5 text-blue-600" />,
    worsened: <TrendingDown className="h-5 w-5 text-amber-600" />,
    creates_shortfall: <AlertTriangle className="h-5 w-5 text-red-600" />,
    unknown: <Minus className="h-5 w-5 text-gray-600" />,
  };

  return (
    <div
      className={`space-y-3 rounded-2xl border p-4 ${statusStyles[impact.status]}`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{statusIcons[impact.status]}</div>
        <div className="flex-1 space-y-2">
          <p className={`font-semibold text-sm ${statusTextStyles[impact.status]}`}>
            Budget Impact
          </p>

          <div className={`space-y-1 text-sm ${statusTextStyles[impact.status]}`}>
            <div className="flex justify-between">
              <span>Current total allocations:</span>
              <span className="font-medium">
                {formatCurrency(impact.currentTotalRegular)}/{impact.payCycle}
              </span>
            </div>
            <div className="flex justify-between">
              <span>New total with this envelope:</span>
              <span className="font-medium">
                {formatCurrency(impact.newTotalRegular)}/{impact.payCycle}
              </span>
            </div>
            {impact.difference !== 0 && (
              <div className="flex justify-between font-semibold pt-1 border-t border-current/20">
                <span>Change:</span>
                <span>
                  {impact.difference > 0 ? "+" : ""}
                  {formatCurrency(impact.difference)}/{impact.payCycle}
                </span>
              </div>
            )}
          </div>

          {impact.warning && (
            <p className={`text-sm font-medium mt-2 ${statusTextStyles[impact.status]}`}>
              {impact.warning}
            </p>
          )}

          {impact.suggestion && (
            <p className={`text-xs mt-1 opacity-90 ${statusTextStyles[impact.status]}`}>
              {impact.suggestion}
            </p>
          )}

          {impact.status === "creates_shortfall" && (
            <div className={`mt-3 pt-3 border-t border-current/20 ${statusTextStyles[impact.status]}`}>
              <p className="text-xs font-medium mb-2">To resolve this shortfall:</p>
              <div className="flex gap-2">
                <Link href="/scenario-planner" target="_blank">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-8 gap-1 border-red-300 hover:bg-red-100"
                  >
                    <span>Explore Scenarios</span>
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </Link>
                <Link href="/payday-allocator" target="_blank">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-8 gap-1 border-red-300 hover:bg-red-100"
                  >
                    <span>View Full Budget</span>
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-2xl">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
    </div>
  );
}
