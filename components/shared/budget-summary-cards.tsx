"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, Wallet, TrendingDown, RefreshCw } from "lucide-react";
import { cn } from "@/lib/cn";

interface BudgetSummaryCardsProps {
  totalTarget: number;
  totalCurrent: number;
  isLoading?: boolean;
  className?: string;
}

/**
 * BudgetSummaryCards - Reusable summary cards showing budget totals
 *
 * Displays:
 * - Total Target (what you need)
 * - Current Balance (what you have)
 * - Funding Gap (what you still need)
 *
 * Uses style guide colors:
 * - sage-very-light for current balance (positive)
 * - blue-light for gap (informational, not punishing)
 */
export function BudgetSummaryCards({
  totalTarget,
  totalCurrent,
  isLoading = false,
  className,
}: BudgetSummaryCardsProps) {
  const fundingGap = Math.max(0, totalTarget - totalCurrent);
  const isFunded = totalCurrent >= totalTarget;

  if (isLoading) {
    return (
      <div className={cn("grid grid-cols-1 md:grid-cols-3 gap-4", className)}>
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-silver-very-light rounded w-24" />
            </CardHeader>
            <CardContent>
              <div className="h-7 bg-silver-very-light rounded w-32 mb-1" />
              <div className="h-3 bg-silver-very-light rounded w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-3 gap-4", className)}>
      {/* Total Target */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-text-medium">
            <Target className="h-4 w-4" />
            Total Target
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-text-dark">
            {formatCurrency(totalTarget)}
          </p>
          <p className="text-xs text-muted-foreground">
            What you need
          </p>
        </CardContent>
      </Card>

      {/* Current Balance */}
      <Card className="bg-sage-very-light border-sage-light">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-sage-dark">
            <Wallet className="h-4 w-4" />
            Current Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-sage-dark">
            {formatCurrency(totalCurrent)}
          </p>
          <p className="text-xs text-sage-dark/70">
            What you have
          </p>
        </CardContent>
      </Card>

      {/* Funding Gap */}
      <Card className={cn(
        isFunded
          ? "bg-sage-very-light border-sage-light"
          : "bg-blue-light border-blue"
      )}>
        <CardHeader className="pb-2">
          <CardTitle className={cn(
            "text-sm font-medium flex items-center gap-2",
            isFunded ? "text-sage-dark" : "text-blue"
          )}>
            <TrendingDown className="h-4 w-4" />
            {isFunded ? "Fully Funded" : "Funding Gap"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className={cn(
            "text-2xl font-bold",
            isFunded ? "text-sage-dark" : "text-blue"
          )}>
            {isFunded ? "All sorted!" : formatCurrency(fundingGap)}
          </p>
          <p className={cn(
            "text-xs",
            isFunded ? "text-sage-dark/70" : "text-blue/70"
          )}>
            {isFunded ? "You're on track" : "Still to save"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: "NZD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}
