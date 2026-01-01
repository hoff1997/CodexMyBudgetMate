"use client";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TrendingUp, Thermometer, Sun, Info } from "lucide-react";
import { cn } from "@/lib/cn";
import type { SeasonalPatternType, LevelingData } from "@/lib/types/unified-envelope";
import { isHighSeason, getSeasonStatusMessage } from "@/lib/utils/leveled-bills";

interface LeveledBadgeProps {
  seasonalPattern: SeasonalPatternType;
  levelingData?: LevelingData;
  size?: "sm" | "md";
  showTooltip?: boolean;
  className?: string;
}

/**
 * Badge component to indicate a leveled bill envelope.
 * Shows seasonal pattern and current season status on hover.
 */
export function LeveledBadge({
  seasonalPattern,
  levelingData,
  size = "sm",
  showTooltip = true,
  className,
}: LeveledBadgeProps) {
  const currentMonth = new Date().getMonth();
  const inHighSeason = isHighSeason(seasonalPattern, currentMonth);
  const statusMessage = getSeasonStatusMessage(seasonalPattern, currentMonth);

  const getIcon = () => {
    if (seasonalPattern === "winter-peak") {
      return <Thermometer className={cn(size === "sm" ? "h-3 w-3" : "h-4 w-4")} />;
    }
    if (seasonalPattern === "summer-peak") {
      return <Sun className={cn(size === "sm" ? "h-3 w-3" : "h-4 w-4")} />;
    }
    return <TrendingUp className={cn(size === "sm" ? "h-3 w-3" : "h-4 w-4")} />;
  };

  const getLabel = () => {
    if (size === "sm") return "Leveled";
    if (seasonalPattern === "winter-peak") return "Winter Peak";
    if (seasonalPattern === "summer-peak") return "Summer Peak";
    return "Leveled";
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-NZ", {
      style: "currency",
      currency: "NZD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  const badge = (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 font-normal",
        size === "sm" ? "text-[10px] px-1.5 py-0" : "text-xs px-2 py-0.5",
        inHighSeason
          ? "bg-blue-light text-blue border-blue"
          : "bg-sage-very-light text-sage-dark border-sage-light",
        className
      )}
    >
      {getIcon()}
      {getLabel()}
    </Badge>
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1 text-xs">
            <p className="font-medium flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Leveled Bill
            </p>
            <p className="text-muted-foreground">{statusMessage}</p>
            {levelingData && (
              <div className="pt-1 border-t border-border mt-1 space-y-0.5">
                <p>
                  Monthly average:{" "}
                  <span className="font-medium">
                    {formatCurrency(levelingData.yearlyAverage)}
                  </span>
                </p>
                <p>
                  Buffer:{" "}
                  <span className="font-medium">{levelingData.bufferPercent}%</span>
                </p>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Inline indicator for leveled status in table cells
 */
export function LeveledIndicator({
  seasonalPattern,
  className,
}: {
  seasonalPattern: SeasonalPatternType;
  className?: string;
}) {
  const currentMonth = new Date().getMonth();
  const inHighSeason = isHighSeason(seasonalPattern, currentMonth);

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px]",
        inHighSeason ? "bg-blue-light text-blue" : "bg-sage-very-light text-sage",
        className
      )}
      title={`Leveled (${seasonalPattern})`}
    >
      {seasonalPattern === "winter-peak" ? "❄" : seasonalPattern === "summer-peak" ? "☀" : "📊"}
    </span>
  );
}
