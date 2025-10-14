import { cn } from "@/lib/cn";

interface Props {
  incomeTotal: number;
  expenseTotal: number;
  pendingCount: number;
}

export function IncomeExpenseOverview({ incomeTotal, expenseTotal, pendingCount }: Props) {
  const income = incomeTotal < 0 ? 0 : incomeTotal;
  const expenses = expenseTotal < 0 ? Math.abs(expenseTotal) : expenseTotal;
  const max = Math.max(income, expenses, 1);
  const incomeWidth = Math.round((income / max) * 100);
  const expenseWidth = Math.round((expenses / max) * 100);

  return (
    <div className="rounded-3xl border bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">This month so far</p>
          <h2 className="text-2xl font-semibold text-secondary">Income vs expenses</h2>
        </div>
        {pendingCount > 0 ? (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
            {pendingCount} pending approvals
          </span>
        ) : null}
      </div>

      <div className="mt-6 space-y-4">
        <Bar label="Income" value={income} percentage={incomeWidth} tone="positive" />
        <Bar label="Expenses" value={expenses} percentage={expenseWidth} tone="negative" />
      </div>

      <div className="mt-6 flex flex-wrap gap-4 text-sm text-muted-foreground">
        <p>
          Keep envelopes aligned by reconciling any pending transactions. Once approvals are cleared,
          the planner will recalculate per-pay contributions automatically.
        </p>
      </div>
    </div>
  );
}

function Bar({
  label,
  value,
  percentage,
  tone,
}: {
  label: string;
  value: number;
  percentage: number;
  tone: "positive" | "negative";
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm font-medium text-secondary">
        <span>{label}</span>
        <span>${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
      </div>
      <div className="mt-2 h-3 w-full rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full", tone === "positive" ? "bg-emerald-500" : "bg-rose-500")}
          style={{ width: `${Math.min(Math.max(percentage, 0), 100)}%` }}
        />
      </div>
    </div>
  );
}
