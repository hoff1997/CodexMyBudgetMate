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
 * IncomeProgressCard - Shows an income source with a progress bar
 * Matches the HTML mockup design with left accent border
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

  // Use exact hex colors for consistency
  // Primary: sage, Secondary: sage-light (lighter sage instead of gold)
  const accentColor = isPrimary ? '#7A9E9A' : '#B8D4D0'; // sage or sage-light
  const progressBgColor = isPrimary ? '#7A9E9A' : '#B8D4D0'; // sage or sage-light

  return (
    <div
      className="bg-white border border-silver-light rounded-lg p-4"
      style={{ borderLeftWidth: '4px', borderLeftColor: accentColor }}
    >
      {/* Top section: Icon, labels, and stats */}
      <div className="flex justify-between items-center mb-3">
        {/* Left: Icon and labels */}
        <div className="flex items-center gap-3">
          <span className="text-xl">{isPrimary ? "💵" : "💰"}</span>
          <div>
            <div className="font-semibold text-sm text-text-dark">
              {isPrimary ? "PRIMARY" : "SECONDARY"}: {name}
            </div>
            <div className="text-xs text-text-medium">
              {getFrequencyLabel(frequency)}
            </div>
          </div>
        </div>

        {/* Right: Stats */}
        <div className="flex items-center gap-8">
          {/* Per Pay */}
          <div className="text-right">
            <div className="text-[11px] text-text-medium">Per Pay</div>
            <div className="text-base font-semibold text-text-dark">
              ${amount.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          {/* Allocated */}
          <div className="text-right">
            <div className="text-[11px] text-text-medium">Allocated</div>
            <div className={cn(
              "text-base font-semibold",
              isOverAllocated ? "text-blue" :
              percentUsed >= 80 ? "text-gold" : "text-sage"
            )}>
              ${allocated.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      {/* Progress bar - full width */}
      <div className="w-full">
        <div className="h-2 bg-[#E5E7EB] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${Math.min(percentUsed, 100)}%`,
              backgroundColor: progressBgColor
            }}
          />
        </div>
        <div className="flex justify-between items-center mt-1.5">
          <div className="text-[11px] text-text-medium">
            {percentUsed.toFixed(0)}% allocated
          </div>
          <div className="text-[11px] text-text-medium">
            {isOverAllocated ? (
              <span className="text-blue">
                ${Math.abs(remaining).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} over
              </span>
            ) : (
              <>${remaining.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} remaining</>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
