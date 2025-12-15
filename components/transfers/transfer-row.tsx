"use client";

/**
 * Transfer Row Component
 *
 * Compact reusable row for displaying envelope info in transfer dialogs.
 * Fixed 40px height with inline progress bar.
 */

import { cn } from "@/lib/cn";
import { getProgressColor } from "@/lib/utils/progress-colors";
import { formatCurrency } from "@/lib/finance";
import type { SummaryEnvelope } from "@/components/layout/envelopes/envelope-summary-card";

interface TransferRowProps {
  envelope: SummaryEnvelope;
  /** Amount needed to reach target (shortfall) */
  needs: number;
  /** Optional checkbox for selection */
  selected?: boolean;
  onSelectChange?: (selected: boolean) => void;
  /** Fill amount input value */
  fillAmount?: number;
  onFillAmountChange?: (amount: number) => void;
  /** Per-row action button (for manual transfer) */
  actionButton?: React.ReactNode;
  /** Status text or badge */
  statusContent?: React.ReactNode;
  /** Whether this row is disabled */
  disabled?: boolean;
  /** Show checkbox column */
  showCheckbox?: boolean;
}

export function TransferRow({
  envelope,
  needs,
  selected,
  onSelectChange,
  fillAmount,
  onFillAmountChange,
  actionButton,
  statusContent,
  disabled = false,
  showCheckbox = false,
}: TransferRowProps) {
  const current = Number(envelope.current_amount ?? 0);
  const target = Number(envelope.target_amount ?? 0);
  const percentage = target > 0 ? Math.min(100, Math.max(0, Math.round((current / target) * 100))) : 0;
  const isSpending = Boolean(envelope.is_spending);

  return (
    <div
      className={cn(
        "grid items-center px-3 py-1.5 border-b border-silver-light/40 last:border-b-0",
        "hover:bg-sage-very-light/30 transition-colors",
        disabled && "opacity-50 pointer-events-none"
      )}
      style={{
        gridTemplateColumns: showCheckbox
          ? "32px 1fr 80px 80px 80px 80px 80px"
          : "1fr 80px 80px 80px 80px 80px",
        height: "40px",
      }}
    >
      {/* Checkbox (optional) */}
      {showCheckbox && (
        <div className="flex items-center justify-center">
          <input
            type="checkbox"
            checked={selected ?? false}
            onChange={(e) => onSelectChange?.(e.target.checked)}
            className="h-4 w-4 rounded border-silver text-sage focus:ring-sage cursor-pointer"
            disabled={disabled}
          />
        </div>
      )}

      {/* Envelope Name + Icon */}
      <div className="flex items-center gap-2 min-w-0 pr-2">
        <span className="text-sm flex-shrink-0">{envelope.icon ?? "📁"}</span>
        <span className="text-sm font-medium text-text-dark truncate">
          {envelope.name}
        </span>
      </div>

      {/* Current Amount */}
      <div className="text-right text-sm text-text-dark">
        {formatCurrency(current)}
      </div>

      {/* Progress Bar (compact inline) */}
      <div className="flex items-center justify-center">
        {!isSpending && target > 0 ? (
          <div className="w-12 h-1.5 bg-silver-very-light rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(percentage, 100)}%`,
                backgroundColor: getProgressColor(percentage),
              }}
            />
          </div>
        ) : (
          <span className="text-xs text-text-light">—</span>
        )}
      </div>

      {/* Needs (shortfall) */}
      <div className="text-right">
        {needs > 0 ? (
          <span className="text-sm font-medium text-blue">
            -${needs.toFixed(0)}
          </span>
        ) : (
          <span className="text-xs text-text-light">—</span>
        )}
      </div>

      {/* Fill Amount Input OR Action Button */}
      <div className="flex items-center justify-center">
        {onFillAmountChange !== undefined ? (
          <input
            type="number"
            min="0"
            max={needs}
            step="1"
            value={fillAmount ?? ""}
            onChange={(e) => {
              const val = Number(e.target.value);
              onFillAmountChange(Math.max(0, Math.min(val, needs)));
            }}
            className="w-16 h-7 px-2 text-sm text-right border border-silver-light rounded focus:border-sage focus:ring-1 focus:ring-sage"
            placeholder="0"
            disabled={disabled}
          />
        ) : actionButton ? (
          actionButton
        ) : (
          <span className="text-xs text-text-light">—</span>
        )}
      </div>

      {/* Status */}
      <div className="flex items-center justify-center">
        {statusContent ?? <span className="text-xs text-text-light">—</span>}
      </div>
    </div>
  );
}

/**
 * Priority Group Header - thin divider with label
 */
export function PriorityGroupHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-silver-very-light/50">
      <div className="flex-1 h-px bg-silver-light" />
      <span className="text-[10px] font-semibold uppercase tracking-wider text-text-light">
        {label}
      </span>
      <div className="flex-1 h-px bg-silver-light" />
    </div>
  );
}

/**
 * Transfer Table Header
 */
export function TransferTableHeader({ showCheckbox = false }: { showCheckbox?: boolean }) {
  return (
    <div
      className="grid items-center px-3 py-2 bg-silver-very-light/70 border-b border-silver-light text-[10px] font-semibold uppercase tracking-wide text-text-light"
      style={{
        gridTemplateColumns: showCheckbox
          ? "32px 1fr 80px 80px 80px 80px 80px"
          : "1fr 80px 80px 80px 80px 80px",
        height: "32px",
      }}
    >
      {showCheckbox && <div></div>}
      <div>Envelope</div>
      <div className="text-right">Current</div>
      <div className="text-center">Progress</div>
      <div className="text-right">Needs</div>
      <div className="text-center">Fill</div>
      <div className="text-center">Status</div>
    </div>
  );
}
