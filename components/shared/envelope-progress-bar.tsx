"use client";

import { cn } from "@/lib/cn";

interface EnvelopeProgressBarProps {
  current: number;
  target: number;
  showPercentage?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * EnvelopeProgressBar - Reusable sage gradient progress bar
 *
 * Uses style guide colors:
 * - Background: sage-very-light (#E2EEEC)
 * - Fill: sage gradient from sage-very-light -> sage-light -> sage
 *
 * Positive-only presentation - just shows progress intensity
 */
export function EnvelopeProgressBar({
  current,
  target,
  showPercentage = true,
  size = "md",
  className,
}: EnvelopeProgressBarProps) {
  const percentage = target > 0 ? Math.min(100, Math.max(0, Math.round((current / target) * 100))) : 0;

  const heightClass = {
    sm: "h-1.5",
    md: "h-2",
    lg: "h-3",
  }[size];

  return (
    <div className={cn("w-full", className)}>
      {/* Progress bar track */}
      <div className={cn("bg-sage-very-light rounded-full overflow-hidden", heightClass)}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${percentage}%`,
            background: getProgressGradient(percentage),
          }}
        />
      </div>

      {/* Optional percentage label */}
      {showPercentage && (
        <div className="flex items-center justify-center mt-1">
          <span className="text-[10px] text-muted-foreground">
            {percentage}%
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Get the sage gradient color based on progress percentage
 * Uses style guide gradient: sage-very-light -> sage-light -> sage
 */
function getProgressGradient(percentage: number): string {
  // Full gradient for all progress levels
  return "linear-gradient(90deg, #E2EEEC 0%, #B8D4D0 50%, #7A9E9A 100%)";
}

/**
 * Get a solid color based on percentage (alternative styling)
 * Used when gradient isn't appropriate
 */
export function getProgressColor(percentage: number): string {
  if (percentage >= 100) return "#7A9E9A"; // sage - fully funded
  if (percentage >= 80) return "#B8D4D0"; // sage-light - on track
  if (percentage >= 50) return "#B8D4D0"; // sage-light - making progress
  return "#E2EEEC"; // sage-very-light - just started
}

/**
 * Compact progress indicator for table cells
 * Just shows the bar without percentage
 */
export function CompactProgressBar({
  current,
  target,
  className,
}: {
  current: number;
  target: number;
  className?: string;
}) {
  const percentage = target > 0 ? Math.min(100, Math.max(0, Math.round((current / target) * 100))) : 0;

  return (
    <div className={cn("w-full h-1.5 bg-sage-very-light rounded-full overflow-hidden", className)}>
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{
          width: `${percentage}%`,
          backgroundColor: getProgressColor(percentage),
        }}
      />
    </div>
  );
}
