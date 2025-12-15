"use client";

import { CreditCard, Check, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import type { AllocationStrategy } from "@/lib/utils/waterfall-allocator";

interface CreditCardHoldingSectionProps {
  totalDebt: number;
  allocatedAmount: number;
  strategy: AllocationStrategy;
  bankBalance: number;
}

export function CreditCardHoldingSection({
  totalDebt,
  allocatedAmount,
  strategy,
  bankBalance,
}: CreditCardHoldingSectionProps) {
  // Don't show if no credit card debt
  if (totalDebt <= 0) {
    return null;
  }

  const shortfall = Math.max(0, totalDebt - allocatedAmount);
  const coveragePercent = totalDebt > 0 ? Math.min(100, (allocatedAmount / totalDebt) * 100) : 0;
  const isFullyCovered = allocatedAmount >= totalDebt;
  const isPartialCoverage = allocatedAmount > 0 && allocatedAmount < totalDebt;
  const isNoCoverage = allocatedAmount === 0;

  // Get status styling
  const getStatusBadge = () => {
    if (isFullyCovered) {
      return (
        <Badge className="bg-sage-very-light text-sage-dark border-sage-light">
          <Check className="h-3 w-3 mr-1" />
          Fully Covered
        </Badge>
      );
    }
    if (isPartialCoverage) {
      return (
        <Badge className="bg-gold-light text-[#8B7035] border-gold">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Partial Coverage
        </Badge>
      );
    }
    if (strategy === "envelopes_only") {
      return (
        <Badge variant="outline" className="bg-blue-light text-blue border-blue">
          Not Allocated
        </Badge>
      );
    }
    return null;
  };

  // Message based on strategy and coverage
  const getMessage = () => {
    if (isFullyCovered) {
      return "Your credit card debt is fully covered. This will help you avoid interest charges.";
    }
    if (strategy === "envelopes_only") {
      return "You've chosen to focus on envelopes first. You can transfer funds to cover your credit card later.";
    }
    if (isPartialCoverage) {
      return `You're covering ${coveragePercent.toFixed(0)}% of your credit card debt. The remaining $${shortfall.toLocaleString()} can be addressed in future pay cycles.`;
    }
    return "Consider allocating some funds to cover your credit card debt.";
  };

  return (
    <Card className={cn(
      "p-4 border-2",
      isFullyCovered
        ? "border-sage-light bg-sage-very-light/50"
        : isPartialCoverage
        ? "border-gold bg-gold-light/30"
        : "border-blue bg-blue-light/30"
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center",
            isFullyCovered ? "bg-sage" : isPartialCoverage ? "bg-gold" : "bg-blue"
          )}>
            <CreditCard className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-text-dark">Credit Card Holding</h3>
            <p className="text-xs text-text-medium">
              Funds set aside to pay your credit card statement
            </p>
          </div>
        </div>
        {getStatusBadge()}
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-text-medium mb-1">
          <span>Coverage</span>
          <span>{coveragePercent.toFixed(0)}%</span>
        </div>
        <Progress
          value={coveragePercent}
          className={cn(
            "h-2",
            isFullyCovered
              ? "[&>div]:bg-sage"
              : isPartialCoverage
              ? "[&>div]:bg-gold"
              : "[&>div]:bg-blue"
          )}
        />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-3">
        <div>
          <div className="text-[10px] text-text-light uppercase tracking-wide">
            Total Debt
          </div>
          <div className="text-lg font-semibold text-blue">
            ${totalDebt.toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-text-light uppercase tracking-wide">
            Allocated
          </div>
          <div className={cn(
            "text-lg font-semibold",
            allocatedAmount > 0 ? "text-sage" : "text-text-light"
          )}>
            ${allocatedAmount.toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-text-light uppercase tracking-wide">
            Shortfall
          </div>
          <div className={cn(
            "text-lg font-semibold",
            shortfall > 0 ? "text-blue" : "text-sage"
          )}>
            {shortfall > 0 ? `$${shortfall.toLocaleString()}` : "—"}
          </div>
        </div>
      </div>

      {/* Message */}
      <p className="text-xs text-text-medium leading-relaxed">
        {getMessage()}
      </p>
    </Card>
  );
}
