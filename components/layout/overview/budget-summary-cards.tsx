import { Card } from "@/components/ui/card";
import { formatCurrency, getEnvelopeStatus } from "@/lib/finance";
import type { EnvelopeRow } from "@/lib/auth/types";

interface Props {
  envelopes: EnvelopeRow[];
}

export function BudgetSummaryCards({ envelopes }: Props) {
  const totals = envelopes.reduce(
    (acc, envelope) => {
      acc.target += Number(envelope.target_amount ?? 0);
      acc.current += Number(envelope.current_amount ?? 0);
      return acc;
    },
    { target: 0, current: 0 },
  );

  const fundedRatio = totals.target
    ? Math.min(100, Math.round((totals.current / totals.target) * 100))
    : 0;

  const delta = totals.current - totals.target;
  const zeroBudgetStatus = delta === 0 ? "Balanced" : delta > 0 ? "Surplus" : "Overspent";
  const zeroBudgetColour =
    delta === 0 ? "text-emerald-700" : delta > 0 ? "text-sky-700" : "text-rose-700";

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card className="space-y-2 p-6 md:col-span-2">
        <p className="text-sm font-medium text-muted-foreground">Zero budget status</p>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <p className={`text-3xl font-semibold capitalize ${zeroBudgetColour}`}>
            {zeroBudgetStatus}
          </p>
          <p className="text-lg font-semibold text-secondary">
            {formatCurrency(delta)}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Current {formatCurrency(totals.current)} vs target {formatCurrency(totals.target)}
        </p>
      </Card>
      <Card className="space-y-2 p-6">
        <p className="text-sm font-medium text-muted-foreground">Target allocated</p>
        <p className="text-3xl font-semibold">{formatCurrency(totals.target)}</p>
      </Card>
      <Card className="space-y-2 p-6">
        <p className="text-sm font-medium text-muted-foreground">Current balance</p>
        <p className="text-3xl font-semibold">{formatCurrency(totals.current)}</p>
      </Card>
      <Card className="space-y-2 p-6">
        <p className="text-sm font-medium text-muted-foreground">Funded</p>
        <div>
          <p className="text-3xl font-semibold">{fundedRatio}%</p>
          <p className="text-xs text-muted-foreground">based on active envelopes</p>
        </div>
      </Card>
      {envelopes.slice(0, 3).map((envelope) => {
        const status = getEnvelopeStatus(envelope);
        return (
          <Card key={envelope.id} className="space-y-3 p-6">
            <div className="flex items-center justify-between">
              <p className="text-base font-semibold">{envelope.name}</p>
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {status.label}
              </span>
            </div>
            <div>
              <p className="text-2xl font-semibold">
                {formatCurrency(Number(envelope.current_amount ?? 0))}
              </p>
              <p className="text-xs text-muted-foreground">
                Target {formatCurrency(Number(envelope.target_amount ?? 0))}
              </p>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full`}
                style={{
                  width: `${Math.min(100, status.ratio)}%`,
                  backgroundColor: status.colour,
                }}
              />
            </div>
          </Card>
        );
      })}
    </div>
  );
}
