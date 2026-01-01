"use client";

import { cn } from "@/lib/cn";
import { CheckCircle2, AlertCircle } from "lucide-react";

interface IncomeProgressCardProps {
  name: string;
  amount: number;
  allocated: number;
  frequency: string;
  isPrimary?: boolean;
}

/**
 * Get frequency label for display (shorter version)
 */
function getFrequencyLabel(frequency: string): string {
  switch (frequency) {
    case 'weekly':
      return 'Weekly';
    case 'fortnightly':
      return 'Fortnightly';
    case 'twice_monthly':
      return 'Twice Monthly';
    case 'monthly':
      return 'Monthly';
    default:
      return '';
  }
}

/**
 * IncomeProgressCard - Compact single-line layout with progress bar in the middle
 *
 * Terminology:
 * - "Unallocated" = money not assigned to envelopes (should go to Surplus envelope)
 * - "Over Allocated" = committed more than income allows
 * - "Fully Allocated" = ideal state (100% assigned)
 */
export function IncomeProgressCard({
  name,
  amount,
  allocated,
  frequency,
  isPrimary = false,
}: IncomeProgressCardProps) {
  const unallocated = amount - allocated;
  const percentUsed = amount > 0 ? (allocated / amount) * 100 : 0;
  const isOverAllocated = allocated > amount;
  const isFullyAllocated = Math.abs(unallocated) < 0.01; // Within 1 cent

  // Use exact hex colors for consistency
  const accentColor = isPrimary ? '#7A9E9A' : '#B8D4D0'; // sage or sage-light

  // Progress bar color based on allocation status
  const progressBgColor = isFullyAllocated ? '#7A9E9A' : // sage for fully allocated
                          isOverAllocated ? '#6B9ECE' : // blue for over
                          '#D4A853'; // gold for under-allocated

  return (
    <div
      className="bg-white border border-silver-light rounded-lg px-2 py-1.5"
      style={{ borderLeftWidth: '2px', borderLeftColor: accentColor }}
    >
      {/* Single Row: Name/Frequency | Progress Bar | Stats | Status */}
      <div className="flex items-center gap-2">
        {/* Left: Icon, Name & Frequency */}
        <div className="flex items-center gap-1.5 min-w-0 flex-shrink-0" style={{ width: '130px' }}>
          <span className="text-xs">{isPrimary ? "💵" : "💰"}</span>
          <div className="min-w-0">
            <div className="font-medium text-xs text-text-dark truncate">
              {name}
            </div>
            <div className="text-[9px] text-text-medium">
              {getFrequencyLabel(frequency)}
            </div>
          </div>
        </div>

        {/* Middle: Progress Bar - fixed width */}
        <div className="flex-shrink-0" style={{ width: '70px' }}>
          <div className="h-1 bg-[#E5E7EB] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(percentUsed, 100)}%`,
                backgroundColor: progressBgColor
              }}
            />
          </div>
          <div className="text-[8px] text-text-medium text-center mt-0.5">
            {percentUsed.toFixed(0)}%
          </div>
        </div>

        {/* Stats & Status - tighter spacing */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Per Pay */}
          <div className="text-right">
            <div className="text-[9px] text-text-medium">Per Pay</div>
            <div className="text-[10px] font-semibold text-text-dark">
              ${amount.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
          </div>

          {/* Allocated */}
          <div className="text-right">
            <div className="text-[9px] text-text-medium">Allocated</div>
            <div className={cn(
              "text-[10px] font-semibold",
              isFullyAllocated ? "text-sage" :
              isOverAllocated ? "text-blue" : "text-gold"
            )}>
              ${allocated.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
          </div>

          {/* Status indicator */}
          <div className="text-[9px] text-right" style={{ width: '60px' }}>
            {isFullyAllocated ? (
              <div className="text-sage">
                <div className="flex items-center gap-0.5 justify-end">
                  <CheckCircle2 className="h-2 w-2" />
                  <span>Fully</span>
                </div>
                <div>allocated</div>
              </div>
            ) : isOverAllocated ? (
              <div className="text-blue">
                <div className="flex items-center gap-0.5 justify-end">
                  <AlertCircle className="h-2 w-2" />
                  <span>${Math.abs(unallocated).toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                </div>
                <div>over</div>
              </div>
            ) : (
              <div className="text-gold">
                <div className="flex items-center gap-0.5 justify-end">
                  <AlertCircle className="h-2 w-2" />
                  <span>${unallocated.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                </div>
                <div>unallocated</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
