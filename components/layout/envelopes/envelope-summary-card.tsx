import { format } from "date-fns";
import { cn } from "@/lib/cn";
import { getEnvelopeStatus } from "@/lib/finance";
import { getProgressColor } from "@/lib/utils/progress-colors";
import type { EnvelopeRow } from "@/lib/auth/types";

export type PriorityLevel = 'essential' | 'important' | 'discretionary';

export interface SummaryEnvelope extends EnvelopeRow {
  category_name?: string | null;
  pay_cycle_amount?: number | string | null;
  sort_order?: number | null;
  is_spending?: boolean | null;
  is_tracking_only?: boolean | null;
  priority?: PriorityLevel | null;
  // Suggested envelope fields (The My Budget Way)
  is_suggested?: boolean | null;
  suggestion_type?: string | null;
  is_dismissed?: boolean | null;
  description?: string | null;
  snoozed_until?: string | null;
}

// Priority configuration for consistent styling across components
export const PRIORITY_CONFIG: Record<PriorityLevel, {
  label: string;
  dotColor: string;
  bgColor: string;
  borderColor: string;
}> = {
  essential: {
    label: "ESSENTIAL",
    dotColor: "bg-sage-dark",
    bgColor: "bg-sage-very-light",
    borderColor: "border-sage-light",
  },
  important: {
    label: "IMPORTANT",
    dotColor: "bg-silver",
    bgColor: "bg-silver-very-light",
    borderColor: "border-silver-light",
  },
  discretionary: {
    label: "FLEXIBLE",
    dotColor: "bg-blue",
    bgColor: "bg-blue-light",
    borderColor: "border-blue",
  },
};

interface Props {
  envelope: SummaryEnvelope;
  onSelect?: (envelope: SummaryEnvelope) => void;
}

export function EnvelopeSummaryCard({ envelope, onSelect }: Props) {
  const isSpending = Boolean(envelope.is_spending);
  const status = getEnvelopeStatus(envelope);
  const statusLabel = isSpending ? "Spending" : status.label;
  const current = Number(envelope.current_amount ?? 0);
  const target = Number(envelope.target_amount ?? 0);
  const perPay = Number(envelope.pay_cycle_amount ?? 0);
  const percentage = target ? Math.min(100, Math.max(0, Math.round((current / target) * 100))) : 0;

  // Calculate surplus/shortfall
  const difference = current - target;
  const surplusShortfall = {
    amount: Math.abs(difference),
    type: difference >= 0 ? 'surplus' : 'shortfall' as const,
  };

  return (
    <button
      type="button"
      onClick={() => onSelect?.(envelope)}
      className="w-full rounded-lg border border-border bg-card p-3 text-left shadow-sm transition hover:border-primary/40 hover:shadow"
    >
      <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">

        {/* LEFT SECTION: Icon + Name + Bill Info */}
        <div className="flex items-center gap-2 min-w-0 md:flex-[0_0_240px]">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm">
            {envelope.icon ?? "💼"}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-secondary truncate">
              {envelope.name}
            </h3>
            {isSpending ? (
              <p className="text-xs text-muted-foreground">
                {current >= 0 ? '+' : ''}{formatCurrency(current)}
              </p>
            ) : perPay > 0 ? (
              <p className="text-xs text-muted-foreground">
                ${perPay.toFixed(0)}/{(envelope.frequency ?? "month").toLowerCase()}
              </p>
            ) : null}
          </div>
        </div>

        {/* CENTER SECTION: Sage Gradient Progress Bar (non-spending only) */}
        {!isSpending && target > 0 ? (
          <div className="flex items-center flex-1 min-w-0 md:min-w-[120px] md:max-w-[200px]">
            <div className="w-full">
              {/* Custom sage gradient progress bar per style guide */}
              <div className="h-2 bg-sage-very-light rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(percentage, 100)}%`,
                    backgroundColor: getProgressColor(percentage),
                  }}
                />
              </div>
              <div className="flex items-center justify-center mt-1">
                <span className="text-[10px] text-muted-foreground">
                  {percentage}%
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="hidden md:block flex-1 min-w-0" />
        )}

        {/* RIGHT SECTION: Status Indicator + Amounts + Surplus/Shortfall */}
        <div className="flex flex-wrap items-center gap-2 md:flex-[0_0_280px] md:justify-end">
          {/* Status Indicator */}
          <StatusIndicator status={statusLabel} />

          {/* Current/Target Amounts */}
          {!isSpending && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
              <span className="font-semibold text-secondary">
                ${current.toFixed(0)}
              </span>
              <span>/</span>
              <span>${target.toFixed(0)}</span>
            </div>
          )}

          {/* Surplus/Shortfall - sage for surplus, blue for shortfall (never red) */}
          {!isSpending && target > 0 && (
            <span className={cn(
              "text-xs font-medium whitespace-nowrap",
              surplusShortfall.type === 'surplus'
                ? "text-sage-dark"
                : "text-blue"
            )}>
              {surplusShortfall.type === 'surplus' ? 'Surplus:' : 'Shortfall:'} ${surplusShortfall.amount.toFixed(0)}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// Status indicator component (dot + text) - Using style guide colors
function StatusIndicator({ status }: { status: string }) {
  const tone = status.toLowerCase();

  // Style guide: sage for positive, blue for negative (never red)
  let dotColor = "bg-sage"; // Default: on track
  let textColor = "text-sage-dark";

  if (tone.includes("over") || tone.includes("surplus")) {
    dotColor = "bg-sage-dark";
    textColor = "text-sage-dark";
  } else if (tone.includes("needs") || tone.includes("under") || tone.includes("attention")) {
    dotColor = "bg-blue"; // Blue for "needs attention" - informational, not punishing
    textColor = "text-blue";
  } else if (tone.includes("spending") || tone.includes("tracking")) {
    dotColor = "bg-silver";
    textColor = "text-text-medium";
  } else if (tone.includes("no target")) {
    dotColor = "bg-silver";
    textColor = "text-text-medium";
  }

  return (
    <div className="flex items-center gap-1.5">
      <div className={cn("h-2 w-2 rounded-full", dotColor)} />
      <span className={cn("text-xs font-medium", textColor)}>
        {status}
      </span>
    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: "NZD",
    minimumFractionDigits: 0,
  }).format(value);
}
