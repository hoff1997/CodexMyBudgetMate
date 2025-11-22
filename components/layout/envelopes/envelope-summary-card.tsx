import { format } from "date-fns";
import { cn } from "@/lib/cn";
import { Progress } from "@/components/ui/progress";
import { getEnvelopeStatus } from "@/lib/finance";
import type { EnvelopeRow } from "@/lib/auth/types";

export interface SummaryEnvelope extends EnvelopeRow {
  category_name?: string | null;
  pay_cycle_amount?: number | string | null;
  sort_order?: number | null;
  is_spending?: boolean | null;
}

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
  const dueDate = envelope.next_payment_due ?? envelope.due_date;

  let indicatorClass = "bg-emerald-500";
  if (!target) {
    indicatorClass = "bg-primary";
  } else if (status.label.toLowerCase().includes("needs")) {
    indicatorClass = "bg-rose-500";
  } else if (status.label.toLowerCase().includes("surplus") || status.label.toLowerCase().includes("over")) {
    indicatorClass = "bg-sky-500";
  }

  return (
    <button
      type="button"
      onClick={() => onSelect?.(envelope)}
      className="w-full rounded-lg border border-border bg-card p-2 text-left shadow-sm transition hover:border-primary/40 hover:shadow"
    >
      <div className="flex items-center gap-3">
        {/* Icon and Name */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm">
            {envelope.icon ?? "💼"}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-secondary truncate">{envelope.name}</h3>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="hidden md:flex flex-col flex-1 max-w-[200px]">
          <Progress
            value={isSpending ? 0 : percentage}
            indicatorClassName={indicatorClass}
            className={cn("h-2", isSpending && "opacity-40")}
          />
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-[10px] text-muted-foreground">${current.toFixed(0)}</span>
            <span className="text-[10px] text-muted-foreground">${target.toFixed(0)}</span>
          </div>
        </div>

        {/* Status and Amount Info */}
        <div className="flex items-center gap-2">
          <StatusBadge status={statusLabel} />
          {!isSpending && perPay > 0 && (
            <span className="hidden lg:inline-block text-xs text-muted-foreground whitespace-nowrap">
              ${perPay.toFixed(0)}/{(envelope.frequency ?? "pay").toLowerCase()}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone = status.toLowerCase();
  const colour =
    tone.includes("over") || tone.includes("surplus")
      ? "bg-purple-100 text-purple-700 border-purple-200"
      : tone.includes("needs") || tone.includes("under")
      ? "bg-rose-100 text-rose-700 border-rose-200"
      : tone.includes("spending")
      ? "bg-sky-100 text-sky-700 border-sky-200"
      : "bg-emerald-100 text-emerald-700 border-emerald-200";
  return (
    <span className={cn("rounded-full border px-3 py-1 text-xs font-medium", colour)}>{status}</span>
  );
}
