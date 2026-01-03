"use client";

import { formatCurrency } from "@/lib/finance";
import { EnvelopePrediction, EnvelopeStatus } from "@/lib/cashflow-calculator";
import { Check, AlertCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/cn";

type EnvelopeProgressBarProps = {
  prediction: EnvelopePrediction;
  showDetails?: boolean;
  compact?: boolean;
};

export function EnvelopeProgressBar({
  prediction,
  showDetails = true,
  compact = false,
}: EnvelopeProgressBarProps) {
  const {
    current_balance,
    projected_balance,
    target_amount,
    gap,
    status,
    days_until_due,
    future_income,
  } = prediction;

  // Calculate percentages
  const currentPercent = target_amount > 0 ? Math.min((current_balance / target_amount) * 100, 100) : 0;
  const projectedPercent = target_amount > 0 ? Math.min((projected_balance / target_amount) * 100, 100) : 0;

  // Determine colors based on status - using style guide colors (sage/gold/blue)
  const getStatusColor = (s: EnvelopeStatus) => {
    switch (s) {
      case "on_track":
      case "overfunded":
        return {
          bg: "bg-sage",
          text: "text-sage-dark",
          border: "border-sage-light",
          bgLight: "bg-sage-very-light",
          icon: Check,
        };
      case "behind":
        return {
          bg: "bg-gold",
          text: "text-gold-dark",
          border: "border-gold-light",
          bgLight: "bg-gold-light/30",
          icon: AlertTriangle,
        };
      case "critical":
        return {
          bg: "bg-blue",
          text: "text-blue",
          border: "border-blue-light",
          bgLight: "bg-blue-light/30",
          icon: AlertCircle,
        };
    }
  };

  const colors = getStatusColor(status);
  const StatusIcon = colors.icon;

  // Format days message
  const daysMessage =
    days_until_due <= 0
      ? "Due today!"
      : days_until_due === 1
      ? "Due tomorrow"
      : days_until_due < 7
      ? `Due in ${days_until_due} days`
      : days_until_due < 30
      ? `Due in ${Math.floor(days_until_due / 7)} weeks`
      : `Due in ${Math.floor(days_until_due / 30)} months`;

  if (compact) {
    return (
      <div className="space-y-1">
        {/* Progress bar */}
        <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={cn("h-full transition-all duration-500", colors.bg)}
            style={{ width: `${currentPercent}%` }}
          />
          {projectedPercent > currentPercent && (
            <div
              className={cn("absolute top-0 h-full opacity-40", colors.bg)}
              style={{
                left: `${currentPercent}%`,
                width: `${projectedPercent - currentPercent}%`,
              }}
            />
          )}
        </div>

        {/* Status text */}
        <div className="flex items-center justify-between text-xs">
          <span className={colors.text}>
            {formatCurrency(current_balance)} / {formatCurrency(target_amount)}
          </span>
          <span className="text-muted-foreground">{Math.round(currentPercent)}%</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2 rounded-lg border p-3", colors.border, colors.bgLight)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusIcon className={cn("h-4 w-4", colors.text)} />
          <span className={cn("text-sm font-medium", colors.text)}>
            {status === "on_track" && "On Track"}
            {status === "overfunded" && "Overfunded"}
            {status === "behind" && "Behind Schedule"}
            {status === "critical" && "Critical - Short Funds"}
          </span>
        </div>
        {days_until_due < 999 && (
          <span className="text-xs text-muted-foreground">{daysMessage}</span>
        )}
      </div>

      {/* Progress bar */}
      <div className="relative h-3 bg-white/60 rounded-full overflow-hidden">
        {/* Current balance */}
        <div
          className={cn("h-full transition-all duration-500", colors.bg)}
          style={{ width: `${currentPercent}%` }}
        />
        {/* Projected balance (if different from current) */}
        {projectedPercent > currentPercent && (
          <div
            className={cn(
              "absolute top-0 h-full opacity-40 transition-all duration-500",
              colors.bg
            )}
            style={{
              left: `${currentPercent}%`,
              width: `${projectedPercent - currentPercent}%`,
            }}
            title={`Will be ${formatCurrency(projected_balance)} after future income`}
          />
        )}
      </div>

      {/* Details */}
      {showDetails && (
        <div className="space-y-1 text-xs">
          {/* Current vs Target */}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Current Balance:</span>
            <span className={cn("font-medium", colors.text)}>
              {formatCurrency(current_balance)} / {formatCurrency(target_amount)} (
              {Math.round(currentPercent)}%)
            </span>
          </div>

          {/* Future income message */}
          {future_income.length > 0 && projected_balance !== current_balance && (
            <div className={cn("text-xs", gap <= 0 ? "text-sage-dark" : "text-gold-dark")}>
              {gap <= 0 ? "✅" : "⚠️"} After future income: {formatCurrency(projected_balance)}
              {gap <= 0
                ? " - Will be ready by due date!"
                : ` - Still need ${formatCurrency(Math.abs(gap))} more`}
            </div>
          )}

          {/* Critical warning */}
          {status === "critical" && gap > 0 && (
            <div className="text-xs text-blue font-medium">
              ⚠️ SHORT {formatCurrency(Math.abs(gap))}! Even with future income, won't be fully
              funded.
            </div>
          )}

          {/* Overfunded message */}
          {status === "overfunded" && (
            <div className="text-xs text-sage-dark">
              💡 Overfunded by {formatCurrency(Math.abs(gap))} - consider reducing allocation
            </div>
          )}
        </div>
      )}
    </div>
  );
}
