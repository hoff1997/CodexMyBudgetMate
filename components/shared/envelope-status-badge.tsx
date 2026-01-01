"use client";

import { cn } from "@/lib/cn";

export type EnvelopeStatus = "on-track" | "needs-attention" | "surplus" | "no-target" | "spending" | "tracking";

interface EnvelopeStatusBadgeProps {
  status: EnvelopeStatus;
  size?: "sm" | "md";
  showDot?: boolean;
  className?: string;
}

/**
 * EnvelopeStatusBadge - Status indicator badge for envelopes
 *
 * Uses style guide colors:
 * - On track: sage-light bg, sage-dark text
 * - Needs attention: blue-light bg, blue text (informational, not punishing)
 * - Surplus: sage bg, white text
 * - No target/Spending/Tracking: silver-very-light bg, text-medium
 */
export function EnvelopeStatusBadge({
  status,
  size = "md",
  showDot = true,
  className,
}: EnvelopeStatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  const sizeClasses = {
    sm: "px-2 py-0.5 text-[10px]",
    md: "px-2.5 py-1 text-xs",
  }[size];

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium",
        config.bgColor,
        config.textColor,
        sizeClasses,
        className
      )}
    >
      {showDot && (
        <span className={cn("w-1.5 h-1.5 rounded-full", config.dotColor)} />
      )}
      <span>{config.label}</span>
    </div>
  );
}

/**
 * Configuration for each status type
 */
const STATUS_CONFIG: Record<EnvelopeStatus, {
  label: string;
  bgColor: string;
  textColor: string;
  dotColor: string;
}> = {
  "on-track": {
    label: "On track",
    bgColor: "bg-sage-light",
    textColor: "text-sage-dark",
    dotColor: "bg-sage",
  },
  "needs-attention": {
    label: "Needs attention",
    bgColor: "bg-blue-light",
    textColor: "text-blue",
    dotColor: "bg-blue",
  },
  "surplus": {
    label: "Surplus",
    bgColor: "bg-sage",
    textColor: "text-white",
    dotColor: "bg-white",
  },
  "no-target": {
    label: "No target",
    bgColor: "bg-silver-very-light",
    textColor: "text-text-medium",
    dotColor: "bg-silver",
  },
  "spending": {
    label: "Spending",
    bgColor: "bg-silver-very-light",
    textColor: "text-text-medium",
    dotColor: "bg-silver",
  },
  "tracking": {
    label: "Tracking",
    bgColor: "bg-silver-very-light",
    textColor: "text-text-medium",
    dotColor: "bg-silver",
  },
};

/**
 * Calculate the status of an envelope based on current vs target
 */
export function calculateEnvelopeStatus(envelope: {
  is_tracking_only?: boolean | null;
  is_spending?: boolean | null;
  target_amount?: number | string | null;
  current_amount?: number | string | null;
}): EnvelopeStatus {
  if (envelope.is_tracking_only) return "tracking";
  if (envelope.is_spending) return "spending";

  const target = Number(envelope.target_amount ?? 0);
  if (!target) return "no-target";

  const ratio = Number(envelope.current_amount ?? 0) / target;
  if (ratio >= 1.05) return "surplus";
  if (ratio >= 0.8) return "on-track";
  return "needs-attention";
}

/**
 * StatusDot - Compact dot-only indicator for tight spaces
 */
export function StatusDot({
  status,
  size = "md",
  className,
}: {
  status: EnvelopeStatus;
  size?: "sm" | "md";
  className?: string;
}) {
  const config = STATUS_CONFIG[status];

  const sizeClass = {
    sm: "w-2 h-2",
    md: "w-2.5 h-2.5",
  }[size];

  return (
    <span
      className={cn("rounded-full", config.dotColor, sizeClass, className)}
      title={config.label}
    />
  );
}
