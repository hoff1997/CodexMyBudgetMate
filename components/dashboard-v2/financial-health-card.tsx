"use client";

/**
 * Financial Health Card
 *
 * A single metric card following the calm color style guide:
 * - Sage (#7A9E9A) for positive values
 * - Blue (#6B9ECE) for negative/neutral values (never red)
 * - Gold (#D4A853) for celebrations/milestones
 * - Silver (#F3F4F6) for UI structure
 */

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import type { LucideIcon } from "lucide-react";

export type HealthCardVariant = "positive" | "neutral" | "negative" | "warning" | "celebration";

interface FinancialHealthCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  variant?: HealthCardVariant;
  trend?: {
    direction: "up" | "down" | "stable";
    label: string;
  };
  onClick?: () => void;
  className?: string;
}

const variantStyles: Record<HealthCardVariant, { bg: string; icon: string; value: string }> = {
  positive: {
    bg: "bg-sage-light/20 border-sage/30",
    icon: "text-sage",
    value: "text-sage",
  },
  neutral: {
    bg: "bg-silver-light/30 border-silver/30",
    icon: "text-text-medium",
    value: "text-text-dark",
  },
  negative: {
    bg: "bg-blue-light/20 border-blue/30",
    icon: "text-blue",
    value: "text-blue",
  },
  warning: {
    bg: "bg-blue-light/30 border-blue/30",
    icon: "text-blue",
    value: "text-blue",
  },
  celebration: {
    bg: "bg-gold-light/20 border-gold/30",
    icon: "text-gold",
    value: "text-gold",
  },
};

export function FinancialHealthCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = "neutral",
  trend,
  onClick,
  className,
}: FinancialHealthCardProps) {
  const styles = variantStyles[variant];

  return (
    <Card
      className={cn(
        "transition-all duration-200",
        styles.bg,
        onClick && "cursor-pointer hover:shadow-md",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <p className="text-xs font-medium text-text-medium uppercase tracking-wide">
            {title}
          </p>
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center bg-white/50", styles.icon)}>
            <Icon className="h-4 w-4" />
          </div>
        </div>

        <div className="space-y-1">
          <p className={cn("text-2xl font-bold", styles.value)}>
            {value}
          </p>

          {subtitle && (
            <p className="text-xs text-text-light">
              {subtitle}
            </p>
          )}

          {trend && (
            <div className="flex items-center gap-1 mt-1">
              <span className={cn(
                "text-xs font-medium",
                trend.direction === "up" && "text-sage",
                trend.direction === "down" && "text-blue",
                trend.direction === "stable" && "text-text-medium"
              )}>
                {trend.direction === "up" && "↑"}
                {trend.direction === "down" && "↓"}
                {trend.direction === "stable" && "→"}
                {" "}{trend.label}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
