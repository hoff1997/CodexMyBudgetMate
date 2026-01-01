"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
  Edit2,
  BarChart3,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { LevelingData, SeasonalPatternType } from "@/lib/types/unified-envelope";
import {
  calculateBufferStatus,
  getSeasonStatusMessage,
  getEstimatedMonthlyBill,
  formatLevelingForDisplay,
  isHighSeason,
} from "@/lib/utils/leveled-bills";
import { getShortMonthName } from "@/lib/utils/seasonal-bills";

interface LeveledBillCardProps {
  envelopeName: string;
  envelopeIcon: string;
  levelingData: LevelingData;
  seasonalPattern: SeasonalPatternType;
  currentBalance: number;
  startMonth?: number; // Month when leveling started (0-11), defaults to January
  onEdit?: () => void;
  className?: string;
}

/**
 * Card component showing leveled bill status, buffer health, and seasonal context.
 * Used in envelope detail views and dashboard widgets.
 */
export function LeveledBillCard({
  envelopeName,
  envelopeIcon,
  levelingData,
  seasonalPattern,
  currentBalance,
  startMonth = 0,
  onEdit,
  className,
}: LeveledBillCardProps) {
  const currentMonth = new Date().getMonth();

  // Calculate buffer status
  const bufferStatus = useMemo(
    () => calculateBufferStatus(levelingData, currentBalance, startMonth, currentMonth),
    [levelingData, currentBalance, startMonth, currentMonth]
  );

  // Get seasonal context
  const seasonMessage = getSeasonStatusMessage(seasonalPattern, currentMonth);
  const estimatedThisMonth = getEstimatedMonthlyBill(levelingData, currentMonth);
  const inHighSeason = isHighSeason(seasonalPattern, currentMonth);
  const displayData = formatLevelingForDisplay(levelingData);

  // Status colors and icons
  const getStatusConfig = () => {
    switch (bufferStatus.status) {
      case "ahead":
        return {
          color: "text-sage-dark",
          bgColor: "bg-sage-very-light",
          borderColor: "border-sage-light",
          icon: <TrendingUp className="h-4 w-4" />,
          label: "Ahead of schedule",
        };
      case "on-track":
        return {
          color: "text-sage",
          bgColor: "bg-sage-very-light",
          borderColor: "border-sage-light",
          icon: <CheckCircle2 className="h-4 w-4" />,
          label: "On track",
        };
      case "behind":
        return {
          color: "text-gold-dark",
          bgColor: "bg-gold-light",
          borderColor: "border-gold",
          icon: <TrendingDown className="h-4 w-4" />,
          label: "Slightly behind",
        };
      case "critical":
        return {
          color: "text-blue",
          bgColor: "bg-blue-light",
          borderColor: "border-blue",
          icon: <AlertCircle className="h-4 w-4" />,
          label: "Needs attention",
        };
    }
  };

  const statusConfig = getStatusConfig();

  // Format currency
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-NZ", {
      style: "currency",
      currency: "NZD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{envelopeIcon}</span>
            <CardTitle className="text-base">{envelopeName}</CardTitle>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px]",
                inHighSeason
                  ? "bg-blue-light text-blue border-blue"
                  : "bg-silver-very-light text-text-medium border-silver-light"
              )}
            >
              {seasonalPattern === "winter-peak"
                ? "❄ Winter Peak"
                : seasonalPattern === "summer-peak"
                ? "☀ Summer Peak"
                : "📊 Custom"}
            </Badge>
          </div>
          {onEdit && (
            <Button variant="ghost" size="sm" onClick={onEdit} className="h-7 px-2">
              <Edit2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Buffer Status */}
        <div
          className={cn(
            "p-3 rounded-lg border",
            statusConfig.bgColor,
            statusConfig.borderColor
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className={statusConfig.color}>{statusConfig.icon}</span>
              <span className={cn("font-medium text-sm", statusConfig.color)}>
                {statusConfig.label}
              </span>
            </div>
            <span className={cn("text-sm font-semibold", statusConfig.color)}>
              {bufferStatus.percentageOfExpected.toFixed(0)}%
            </span>
          </div>
          <Progress
            value={Math.min(bufferStatus.percentageOfExpected, 150)}
            className="h-2"
          />
          <p className="text-xs text-muted-foreground mt-2">
            {bufferStatus.bufferAmount >= 0 ? (
              <>
                {formatCurrency(bufferStatus.bufferAmount)} buffer built up
              </>
            ) : (
              <>
                {formatCurrency(Math.abs(bufferStatus.bufferAmount))} behind expected
              </>
            )}
          </p>
        </div>

        {/* Current Season Info */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <p>{seasonMessage}</p>
        </div>

        {/* Monthly Breakdown */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <BarChart3 className="h-4 w-4 text-sage" />
            Monthly Pattern
          </div>
          <div className="flex gap-0.5">
            {levelingData.monthlyAmounts.map((amount, idx) => {
              const isCurrentMonth = idx === currentMonth;
              const maxAmount = Math.max(...levelingData.monthlyAmounts);
              const heightPercent = maxAmount > 0 ? (amount / maxAmount) * 100 : 0;

              return (
                <div
                  key={idx}
                  className="flex-1 flex flex-col items-center gap-0.5"
                  title={`${getShortMonthName(idx)}: ${formatCurrency(amount)}`}
                >
                  <div className="w-full h-12 relative bg-silver-very-light rounded-sm overflow-hidden">
                    <div
                      className={cn(
                        "absolute bottom-0 w-full rounded-sm transition-all",
                        isCurrentMonth ? "bg-sage" : "bg-sage-light"
                      )}
                      style={{ height: `${heightPercent}%` }}
                    />
                  </div>
                  <span
                    className={cn(
                      "text-[8px]",
                      isCurrentMonth ? "font-bold text-sage-dark" : "text-muted-foreground"
                    )}
                  >
                    {getShortMonthName(idx).charAt(0)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Average</p>
            <p className="font-semibold text-sm">{displayData.averageFormatted}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">This Month</p>
            <p className="font-semibold text-sm">{formatCurrency(estimatedThisMonth)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Balance</p>
            <p className="font-semibold text-sm">{formatCurrency(currentBalance)}</p>
          </div>
        </div>

        {/* Estimation type note */}
        <p className="text-[10px] text-muted-foreground text-center">
          {displayData.estimationTypeLabel} • Updated {displayData.lastUpdatedFormatted}
        </p>
      </CardContent>
    </Card>
  );
}
