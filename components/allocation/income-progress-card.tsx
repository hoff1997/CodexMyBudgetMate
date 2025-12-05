"use client";

import { cn } from "@/lib/cn";

interface IncomeProgressCardProps {
  name: string;
  amount: number;
  allocated: number;
  frequency: string;
  isPrimary?: boolean;
}

/**
 * Get frequency label for display
 */
function getFrequencyLabel(frequency: string): string {
  switch (frequency) {
    case 'weekly':
      return '/week';
    case 'fortnightly':
      return '/fortnight';
    case 'twice_monthly':
      return '/twice monthly';
    case 'monthly':
      return '/month';
    default:
      return '';
  }
}

/**
 * IncomeProgressCard - Shows an income source with a progress bar
 * indicating how much has been allocated vs. remaining
 */
export function IncomeProgressCard({
  name,
  amount,
  allocated,
  frequency,
  isPrimary = false,
}: IncomeProgressCardProps) {
  const remaining = amount - allocated;
  const percentUsed = amount > 0 ? (allocated / amount) * 100 : 0;
  const isOverAllocated = allocated > amount;

  // Color based on allocation percentage
  const getProgressColor = () => {
    if (isOverAllocated) return "bg-blue";
    if (percentUsed >= 95) return "bg-blue";
    if (percentUsed >= 80) return "bg-gold";
    return "bg-sage";
  };

  const getTextColor = () => {
    if (isOverAllocated) return "text-blue";
    if (percentUsed >= 95) return "text-blue";
    if (percentUsed >= 80) return "text-gold";
    return "text-sage";
  };

  return (
    <div className={cn(
      "rounded-lg border p-3",
      isPrimary ? "border-primary/30 bg-primary/5" : "border-border bg-muted/30"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-base">💼</span>
          <span className="font-medium text-sm">
            {isPrimary ? "PRIMARY" : "SECONDARY"}: {name}
          </span>
        </div>
        <span className="text-sm font-semibold">
          ${amount.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          <span className="text-muted-foreground font-normal">{getFrequencyLabel(frequency)}</span>
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-3 w-full bg-muted rounded-full overflow-hidden mb-2">
        <div
          className={cn("h-full transition-all duration-300", getProgressColor())}
          style={{ width: `${Math.min(percentUsed, 100)}%` }}
        />
      </div>

      {/* Stats */}
      <div className="flex justify-between text-xs">
        <span className={cn("font-medium", getTextColor())}>
          Allocated: ${allocated.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <span className={cn(
          "font-medium",
          isOverAllocated ? "text-blue" : "text-muted-foreground"
        )}>
          {isOverAllocated ? (
            <>Over by: ${Math.abs(remaining).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</>
          ) : (
            <>Remaining: ${remaining.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</>
          )}
        </span>
      </div>
    </div>
  );
}
