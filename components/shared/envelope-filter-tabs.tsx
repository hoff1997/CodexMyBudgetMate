"use client";

import { cn } from "@/lib/cn";

export type StatusFilter = "all" | "healthy" | "attention" | "surplus" | "no-target" | "spending" | "tracking";

export interface FilterOption {
  key: StatusFilter;
  label: string;
}

export const FILTER_OPTIONS: FilterOption[] = [
  { key: "all", label: "All" },
  { key: "healthy", label: "On track" },
  { key: "attention", label: "Needs attention" },
  { key: "surplus", label: "Surplus" },
  { key: "no-target", label: "No target" },
  { key: "spending", label: "Spending" },
  { key: "tracking", label: "Tracking" },
];

interface EnvelopeFilterTabsProps {
  activeFilter: StatusFilter;
  onFilterChange: (filter: StatusFilter) => void;
  envelopeCounts: Record<StatusFilter, number>;
  className?: string;
}

/**
 * EnvelopeFilterTabs - Filter tabs for envelope status
 *
 * Status bucket logic:
 * - healthy: 80-104% funded (on track)
 * - attention: <80% funded (needs attention)
 * - surplus: >=105% funded
 * - no-target: no target set
 * - spending: spending envelopes
 * - tracking: tracking-only envelopes
 *
 * Uses style guide colors:
 * - sage for active state
 * - silver-very-light for inactive state
 */
export function EnvelopeFilterTabs({
  activeFilter,
  onFilterChange,
  envelopeCounts,
  className,
}: EnvelopeFilterTabsProps) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {FILTER_OPTIONS.map((filter) => (
        <button
          key={filter.key}
          type="button"
          onClick={() => onFilterChange(filter.key)}
          className={cn(
            "rounded-full px-2.5 py-1 text-[11px] font-medium transition whitespace-nowrap",
            activeFilter === filter.key
              ? "bg-sage text-white" // Style guide: sage for active state
              : "bg-silver-very-light text-text-medium hover:bg-silver-light border border-silver-light"
          )}
        >
          {filter.label}
          <span className="ml-0.5 text-[10px] opacity-80">
            ({envelopeCounts[filter.key] ?? 0})
          </span>
        </button>
      ))}
    </div>
  );
}

/**
 * Helper function to determine status bucket for an envelope
 * Returns the appropriate status filter key
 */
export function getStatusBucket(envelope: {
  is_tracking_only?: boolean | null;
  is_spending?: boolean | null;
  target_amount?: number | string | null;
  current_amount?: number | string | null;
}): StatusFilter {
  if (envelope.is_tracking_only) return "tracking";
  if (envelope.is_spending) return "spending";

  const target = Number(envelope.target_amount ?? 0);
  if (!target) return "no-target";

  const ratio = Number(envelope.current_amount ?? 0) / target;
  if (ratio >= 1.05) return "surplus";
  if (ratio >= 0.8) return "healthy";
  return "attention";
}

/**
 * Get display label for a status filter
 */
export function getStatusLabel(status: StatusFilter): string {
  switch (status) {
    case "healthy":
      return "On track";
    case "attention":
      return "Needs attention";
    case "surplus":
      return "Surplus";
    case "no-target":
      return "No target";
    case "spending":
      return "Spending";
    case "tracking":
      return "Tracking";
    default:
      return "All";
  }
}
