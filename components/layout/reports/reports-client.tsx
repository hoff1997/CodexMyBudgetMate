"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/finance";
import type { ReportsData, SpendingPoint, IncomePoint, DebtReportRow } from "@/lib/types/reports";

type Props = {
  data: ReportsData;
};

export function ReportsClient({ data }: Props) {
  const variance = data.summary.planVariance;
  const varianceTone = variance <= 0 ? "text-emerald-600" : "text-rose-600";
  const varianceLabel =
    (variance >= 0 ? "+" : "-") + formatCurrency(Math.abs(variance));

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 pb-24 pt-12 md:px-10 md:pb-12">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Insights</p>
          <h1 className="text-3xl font-semibold text-secondary md:text-4xl">Reports dashboard</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Keep envelopes, income, and debt payoff on track with visual snapshots and exportable
            summaries you can share with your whānau or coach.
          </p>
        </div>
        {data.demoMode ? (
          <Badge variant="secondary" className="uppercase tracking-wide">
            Demo data
          </Badge>
        ) : null}
      </header>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard title="Total spend (6 months)" value={formatCurrency(data.summary.totalSpent)} />
        <SummaryCard title="Spend vs plan" value={varianceLabel} tone={varianceTone} />
        <SummaryCard
          title="Avg. monthly income"
          value={formatCurrency(data.summary.avgIncome)}
        />
        <SummaryCard
          title="Active debts"
          value={data.summary.debtsRemaining.toString()}
          tone={data.summary.debtsRemaining === 0 ? "text-emerald-600" : "text-secondary"}
        />
      </section>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Spending vs plan</CardTitle>
            <p className="text-sm text-muted-foreground">
              Track how actual envelope spend compares to planned contributions each month.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-secondary" /> Planned
            </div>
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-primary" /> Actual
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <SpendingPlanChart data={data.spending} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Income trend</CardTitle>
          <p className="text-sm text-muted-foreground">
            See how regular pay, contracting, or side hustle income shifts month-to-month.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <IncomeTrendChart data={data.income} />
          <div className="grid gap-2 sm:grid-cols-3 md:grid-cols-6">
            {data.income.map((point) => (
              <div key={point.month} className="rounded-md border bg-muted/30 p-3 text-center">
                <p className="text-xs font-medium text-muted-foreground">{point.month}</p>
                <p className="text-sm font-semibold text-secondary">{formatCurrency(point.amount)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Debt payoff progress</CardTitle>
          <p className="text-sm text-muted-foreground">
            Monitor balances, repayments, and projected payoff dates for liabilities tied to your
            debt envelopes.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.debts.length ? (
            data.debts.map((debt) => <DebtRow key={debt.id} debt={debt} />)
          ) : (
            <p className="text-sm text-muted-foreground">
              No liabilities recorded yet. Add debts from the Net Worth page to unlock this report.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Export & share</CardTitle>
          <p className="text-sm text-muted-foreground">
            Download detailed CSV or PDF snapshots for planning sessions, coaching, or record keeping.
          </p>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {data.exportLinks.map((link) => (
            <Button key={link.label} variant="outline" asChild>
              <Link href={link.href}>{link.label}</Link>
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  tone = "text-secondary",
}: {
  title: string;
  value: string;
  tone?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-semibold ${tone}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function SpendingPlanChart({ data }: { data: SpendingPoint[] }) {
  const maxValue =
    data.reduce((max, point) => Math.max(max, point.actual, point.planned), 0) || 1;

  return (
    <div className="space-y-3">
      {data.map((point) => {
        const plannedWidth = Math.max(2, (point.planned / maxValue) * 100);
        const actualWidth = Math.max(2, (point.actual / maxValue) * 100);
        const varianceTone =
          point.variance <= 0 ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50";
        return (
          <div key={point.month} className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-medium text-secondary">{point.month}</span>
              <span className={`rounded-full px-2 py-0.5 font-medium ${varianceTone}`}>
                {point.variance <= 0 ? "Under plan" : "Over plan"} {formatCurrency(Math.abs(point.variance))}
              </span>
            </div>
            <div className="mt-3 flex flex-col gap-2">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Planned</span>
                  <span>{formatCurrency(point.planned)}</span>
                </div>
                <div className="h-2 rounded-full bg-secondary/30">
                  <div
                    className="h-2 rounded-full bg-secondary transition-all"
                    style={{ width: `${plannedWidth}%` }}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Actual</span>
                  <span>{formatCurrency(point.actual)}</span>
                </div>
                <div className="h-2 rounded-full bg-primary/20">
                  <div
                    className="h-2 rounded-full bg-primary transition-all"
                    style={{ width: `${actualWidth}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function IncomeTrendChart({ data }: { data: IncomePoint[] }) {
  if (!data.length) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
        No income data yet. Once transactions import, trends will appear here.
      </div>
    );
  }

  const width = Math.max(320, data.length * 80);
  const height = 160;
  const min = Math.min(...data.map((point) => point.amount));
  const max = Math.max(...data.map((point) => point.amount));
  const range = max - min || 1;
  const points = data.map((point, index) => {
    const x = (index / Math.max(data.length - 1, 1)) * (width - 40) + 20;
    const y = height - ((point.amount - min) / range) * (height - 40) - 20;
    return `${x},${y}`;
  });

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-40 w-full min-w-[320px] text-primary">
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          points={points.join(" ")}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((point, index) => {
          const [x, y] = point.split(",").map(Number);
          return (
            <g key={data[index].month}>
              <circle cx={x} cy={y} r={4} className="fill-primary" />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function DebtRow({ debt }: { debt: DebtReportRow }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-secondary">{debt.name}</p>
          <p className="text-xs text-muted-foreground">
            {debt.interestRate ? `${debt.interestRate.toFixed(2)}% APR` : "No rate recorded"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-secondary">{formatCurrency(debt.balance)}</p>
          <p className="text-xs text-muted-foreground">
            {debt.projectedPayoff ? `Projected payoff ${debt.projectedPayoff}` : "Add payment plan"}
          </p>
        </div>
      </div>
      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Monthly payment</span>
          <span>{debt.monthlyPayment ? formatCurrency(debt.monthlyPayment) : "Not set"}</span>
        </div>
        <Progress value={Math.min(100, debt.progress)} />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Momentum</span>
          <span>{Math.round(Math.min(100, debt.progress))}% of annual goal</span>
        </div>
      </div>
    </div>
  );
}
