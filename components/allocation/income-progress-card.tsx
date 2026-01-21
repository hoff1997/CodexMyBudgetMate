"use client";

import { cn } from "@/lib/cn";

interface IncomeProgressCardProps {
  name: string;
  amount: number;
  allocated: number;
  frequency: string;
  isPrimary?: boolean;
  nextPayDate?: string; // ISO date string for next payment
}

/**
 * Get frequency label with pays per year
 */
function getFrequencyLabel(frequency: string): string {
  switch (frequency) {
    case 'weekly':
      return 'Weekly · 52 pays/yr';
    case 'fortnightly':
      return 'Fortnightly · 26 pays/yr';
    case 'twice_monthly':
      return 'Twice Monthly · 24 pays/yr';
    case 'monthly':
      return 'Monthly · 12 pays/yr';
    default:
      return '';
  }
}

/**
 * IncomeProgressCard - Full-width card with progress bar at bottom
 *
 * Terminology:
 * - "remaining" = money not assigned to envelopes yet
 * - "over" = committed more than income allows
 * - "allocated" = percentage assigned to envelopes
 */
/**
 * Format date as dd/mm/yyyy
 */
function formatNextPayDate(dateStr: string | undefined): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return '';
  }
}

export function IncomeProgressCard({
  name,
  amount,
  allocated,
  frequency,
  isPrimary = false,
  nextPayDate,
}: IncomeProgressCardProps) {
  const remaining = amount - allocated;
  const percentUsed = amount > 0 ? (allocated / amount) * 100 : 0;
  const isOverAllocated = allocated > amount;

  // Progress bar color - sage for normal, blue for over-allocated
  const progressBgColor = isOverAllocated ? '#6B9ECE' : '#7A9E9A';

  // Status text color
  const remainingColor = isOverAllocated ? 'text-blue' : 'text-text-medium';

  return (
    <div className="rounded-xl border border-sage-light overflow-hidden shadow-sm">
      {/* Header - matching My Budget Way style */}
      <div className="bg-sage-very-light border-b border-sage-light px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{isPrimary ? "💵" : "💰"}</span>
          <span className="font-semibold text-text-dark text-sm">
            {isPrimary ? "PRIMARY: " : ""}{name}
          </span>
          {nextPayDate && (
            <span className="text-xs text-text-medium italic">
              next payment {formatNextPayDate(nextPayDate)}
            </span>
          )}
          <span className="text-xs text-sage-dark">
            {getFrequencyLabel(frequency)}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white px-4 py-3">
        {/* Per Pay & Allocated Row */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs text-text-medium">Per Pay</div>
            <div className="text-lg font-semibold text-text-dark">
              ${amount.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-text-medium">Allocated</div>
            <div className={cn(
              "text-lg font-semibold",
              isOverAllocated ? "text-blue" : "text-sage"
            )}>
              ${allocated.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Progress Bar - full width */}
        <div className="h-2 bg-sage-very-light rounded-full overflow-hidden mb-2">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${Math.min(percentUsed, 100)}%`,
              backgroundColor: progressBgColor
            }}
          />
        </div>

        {/* Bottom Row: Percentage | Remaining */}
        <div className="flex items-center justify-between text-sm">
          <span className={cn(
            "font-medium",
            isOverAllocated ? "text-blue" : "text-sage"
          )}>
            {percentUsed.toFixed(0)}% allocated
          </span>
          <span className={remainingColor}>
            {isOverAllocated ? (
              <>${Math.abs(remaining).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} over</>
            ) : (
              <>${remaining.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} remaining</>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
