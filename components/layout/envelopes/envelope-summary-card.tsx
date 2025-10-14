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
      className="w-full rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition hover:border-primary/40 hover:shadow"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-lg">
            {envelope.icon ?? "💼"}
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {envelope.category_name ?? "Uncategorised"}
            </p>
            <h3 className="text-base font-semibold text-secondary">{envelope.name}</h3>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <StatusBadge status={statusLabel} />
          {isSpending ? (
            <span className="rounded-full border border-dashed border-primary/60 px-3 py-1 text-xs font-medium text-primary">
              Spending account
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-1 text-muted-foreground">
          {isSpending ? (
            <span>Set targets to enable projections</span>
          ) : (
            <>
              <span>{percentage}%</span>
              {dueDate ? <span>· Due {format(new Date(dueDate), "dd/MM/yyyy")}</span> : null}
            </>
          )}
        </div>
        {!isSpending && (
          <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            {perPay > 0 ? `$${perPay.toFixed(0)} / ${(envelope.frequency ?? "pay").toLowerCase()}` : "On target"}
          </div>
        )}
      </div>

      <div className="mt-3 space-y-3">
        <Progress
          value={isSpending ? 0 : percentage}
          indicatorClassName={indicatorClass}
          className={isSpending ? "opacity-40" : undefined}
        />
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>Current ${current.toFixed(2)}</span>
          <span>Target ${target.toFixed(2)}</span>
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
