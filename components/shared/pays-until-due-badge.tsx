"use client";

import { cn } from "@/lib/cn";
import type { PaysUntilDue } from "@/lib/utils/pays-until-due";

/**
 * Pays Until Due Badge Component
 *
 * Displays bill urgency using a calm blue color scheme per STYLE-GUIDE.md.
 * Avoids anxiety-inducing red/amber colors for financial states.
 */

interface PaysUntilDueBadgeProps {
  urgency: PaysUntilDue['urgency'];
  displayText: string;
  isFunded: boolean;
  className?: string;
}

// Blue-based color scheme following STYLE-GUIDE.md
// Uses calm blue instead of red/amber to avoid financial anxiety
const urgencyStyles: Record<PaysUntilDue['urgency'], { bg: string; text: string }> = {
  overdue: {
    bg: 'bg-[#DDEAF5]',      // blue-light
    text: 'text-[#4A7BA8]',  // darker blue for contrast
  },
  high: {
    bg: 'bg-[#DDEAF5]',      // blue-light
    text: 'text-[#6B9ECE]',  // blue
  },
  medium: {
    bg: 'bg-[#F3F4F6]',      // silver-very-light
    text: 'text-[#6B6B6B]',  // text-medium
  },
  low: {
    bg: 'bg-transparent',
    text: 'text-[#9CA3AF]',  // text-light
  },
  none: {
    bg: 'bg-transparent',
    text: 'text-[#9CA3AF]',  // text-light
  },
};

export function PaysUntilDueBadge({
  urgency,
  displayText,
  isFunded,
  className,
}: PaysUntilDueBadgeProps) {
  // Funded bills show subtle styling regardless of timing
  if (isFunded && urgency !== 'overdue') {
    return (
      <span className={cn("text-xs text-[#9CA3AF]", className)}>
        {displayText}
      </span>
    );
  }

  const style = urgencyStyles[urgency];

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs whitespace-nowrap",
        style.bg,
        style.text,
        className
      )}
    >
      {displayText}
    </span>
  );
}

/**
 * Placeholder badge for non-bill envelopes or bills without due dates
 */
export function PaysUntilDuePlaceholder({ className }: { className?: string }) {
  return (
    <span className={cn("text-xs text-[#D1D5DB]", className)}>—</span>
  );
}
