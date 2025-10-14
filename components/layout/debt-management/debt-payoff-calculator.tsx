"use client";

import { useMemo, useState, type ComponentType } from "react";
import { addMonths, format } from "date-fns";
import {
  CalendarDays,
  Flag,
  PiggyBank,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/finance";
import type { DebtLiability } from "@/lib/types/debt";

export type Strategy = "snowball" | "avalanche" | "hybrid";

export type DebtWithPayment = DebtLiability & {
  minimumPayment: number;
};

type PayoffPoint = {
  month: number;
  balance: number;
};

type PayoffOrder = {
  id: string;
  name: string;
  month: number;
};

type PayoffResult = {
  months: number;
  interestPaid: number;
  payoffDate: Date;
  payoffOrder: PayoffOrder[];
  history: PayoffPoint[];
  warnings: string[];
  monthlyCommitment: number;
  stalled: boolean;
};

type DebtPayoffCalculatorProps = {
  debts: DebtWithPayment[];
  strategy: Strategy;
  suggestedExtra: number;
};

export function DebtPayoffCalculator({ debts, strategy, suggestedExtra }: DebtPayoffCalculatorProps) {
  const minimumCommitment = useMemo(
    () =>
      debts.reduce(
        (sum, debt) => sum + Math.min(Number.isFinite(debt.minimumPayment) ? debt.minimumPayment : 0, debt.balance),
        0,
      ),
    [debts],
  );

  const [extra, setExtra] = useState(() => Math.max(0, Math.round(suggestedExtra)));

  const baseScenario = useMemo(() => {
    if (!debts.length || minimumCommitment <= 0) {
      return null;
    }
    return simulatePayoff(debts, strategy, minimumCommitment);
  }, [debts, strategy, minimumCommitment]);

  const activeScenario = useMemo(() => {
    if (!debts.length || minimumCommitment <= 0) {
      return null;
    }
    return simulatePayoff(debts, strategy, minimumCommitment + extra);
  }, [debts, strategy, minimumCommitment, extra]);

  const interestSaved =
    baseScenario && activeScenario ? Math.max(0, baseScenario.interestPaid - activeScenario.interestPaid) : 0;
  const monthsSaved =
    baseScenario && activeScenario ? Math.max(0, baseScenario.months - activeScenario.months) : 0;

  const firstPayoff = activeScenario?.payoffOrder[0];

  const payoffDurationLabel = activeScenario
    ? formatDuration(activeScenario.months)
    : baseScenario
      ? formatDuration(baseScenario.months)
      : null;

  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle>Debt payoff calculator</CardTitle>
        <CardDescription>
          Project how long it takes to clear your balances using the selected strategy.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-[1.1fr,1fr]">
          <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
            <p className="text-sm font-medium text-secondary">Monthly commitment</p>
            <p className="text-2xl font-semibold tracking-tight">
              {formatCurrency(minimumCommitment + extra)}
            </p>
            <p className="text-xs text-muted-foreground">
              Includes minimum payments of {formatCurrency(minimumCommitment)} plus{" "}
              {extra ? formatCurrency(extra) : "no"} extra payment.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExtra((value) => Math.max(0, Math.round(value - 25)))}
              >
                − $25
              </Button>
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                step={5}
                className="h-10 w-24"
                value={extra}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  setExtra(Number.isFinite(next) && next >= 0 ? Math.round(next) : 0);
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExtra((value) => Math.max(0, Math.round(value + 25)))}
              >
                + $25
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <MetricTile
              icon={Flag}
              label="Debt-free in"
              value={payoffDurationLabel ?? "—"}
              accent="text-emerald-600"
            />
            <MetricTile
              icon={CalendarDays}
              label="Projected date"
              value={activeScenario ? format(activeScenario.payoffDate, "MMM yyyy") : "TBC"}
              accent="text-secondary"
            />
            <MetricTile
              icon={TrendingDown}
              label="Interest paid"
              value={activeScenario ? formatCurrency(activeScenario.interestPaid) : "—"}
              accent="text-rose-600"
              helper={
                interestSaved
                  ? `Saves ${formatCurrency(interestSaved)} vs minimum payments`
                  : "Matches minimum payments"
              }
            />
            <MetricTile
              icon={PiggyBank}
              label="Gains from extra"
              value={interestSaved ? formatCurrency(interestSaved) : "—"}
              accent="text-primary"
              helper={
                monthsSaved
                  ? `${monthsSaved} month${monthsSaved === 1 ? "" : "s"} faster`
                  : "Try increasing extra payments"
              }
            />
          </div>
        </div>

        {activeScenario ? (
          <>
            <div className="rounded-lg border bg-background p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-secondary">Overall progress</p>
                  <p className="text-xs text-muted-foreground">
                    Tracking payoff momentum with a {strategyLabel(strategy)} focus.
                  </p>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  {formatCurrency(activeScenario.monthlyCommitment)} per month
                </span>
              </div>
              <div className="mt-3 space-y-2">
                <Progress
                  value={historyProgress(activeScenario.history)}
                  className="h-2 rounded-full bg-muted"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Start: {formatCurrency(totalStartingBalance(debts))}</span>
                  <span>
                    Month {activeScenario.history.at(-1)?.month ?? 0}:{" "}
                    {formatCurrency(activeScenario.history.at(-1)?.balance ?? 0)}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.3fr,1fr]">
              <div className="rounded-lg border bg-background p-4">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-secondary">
                  <Zap className="h-4 w-4 text-primary" />
                  Payoff order
                </h3>
                <ul className="space-y-2">
                  {activeScenario.payoffOrder.map((entry, index) => (
                    <li
                      key={entry.id}
                      className="flex items-center justify-between rounded-md border border-dashed px-3 py-2 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {index + 1}
                        </span>
                        <span className="font-medium text-secondary">{entry.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Month {entry.month}
                      </span>
                    </li>
                  ))}
                  {!activeScenario.payoffOrder.length && (
                    <li className="text-sm text-muted-foreground">
                      Increase payments to start eliminating balances faster.
                    </li>
                  )}
                </ul>
              </div>

              <div className="rounded-lg border bg-background p-4">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-secondary">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Milestone checkpoints
                </h3>
                <ul className="space-y-2">
                  <li className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-sm">
                    <span className="text-secondary">
                      {firstPayoff ? `${firstPayoff.name} clears first` : "Awaiting first payoff"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {firstPayoff ? `Month ${firstPayoff.month}` : "Adjust payments"}
                    </span>
                  </li>
                  <li className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-sm">
                    <span className="text-secondary">Halfway mark</span>
                    <span className="text-xs text-muted-foreground">
                      {halfwayMarker(activeScenario.history)}
                    </span>
                  </li>
                  <li className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-sm">
                    <span className="text-secondary">Debt-free celebration</span>
                    <span className="text-xs text-muted-foreground">
                      {format(activeScenario.payoffDate, "MMM yyyy")}
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            {activeScenario.warnings.length > 0 && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                <p className="font-semibold">Heads up</p>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  {activeScenario.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <div className="rounded-lg border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            Add at least one active debt to forecast a payoff timeline.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function simulatePayoff(debts: DebtWithPayment[], strategy: Strategy, monthlyBudget: number): PayoffResult | null {
  const activeDebts = debts
    .filter((debt) => debt.balance > 0)
    .map((debt) => ({
      id: debt.id,
      name: debt.name,
      balance: debt.balance,
      rate: Math.max(0, debt.interestRate) / 100,
      minimumPayment: Math.max(0, Math.min(debt.minimumPayment, debt.balance)),
      paidOff: false,
    }));

  if (!activeDebts.length || monthlyBudget <= 0) {
    return null;
  }

  const ordered = [...activeDebts].sort((a, b) => {
    if (strategy === "snowball") {
      return a.balance - b.balance;
    }
    if (strategy === "avalanche") {
      return b.rate - a.rate;
    }
    // hybrid: prioritise rate, but break ties with balance
    const rateDifference = Math.abs(a.rate - b.rate);
    if (rateDifference <= 0.015) {
      return a.balance - b.balance;
    }
    return b.rate - a.rate;
  });

  let minimumRequired = ordered.reduce((sum, debt) => sum + Math.min(debt.minimumPayment, debt.balance), 0);
  minimumRequired = Number(minimumRequired.toFixed(2));
  const committed = Math.max(monthlyBudget, minimumRequired);

  let month = 0;
  let totalInterest = 0;
  let remaining = ordered.reduce((sum, debt) => sum + debt.balance, 0);
  let stagnation = 0;
  let lastBalance = remaining;
  const history: PayoffPoint[] = [{ month: 0, balance: Number(remaining.toFixed(2)) }];
  const payoffOrder: PayoffOrder[] = [];
  const warnings: string[] = [];

  while (remaining > 0.5 && month < 600) {
    month += 1;
    let pool = committed;

    for (const debt of ordered) {
      if (debt.balance <= 0) continue;
      const rate = debt.rate / 12;
      if (!rate) continue;
      const interest = debt.balance * rate;
      debt.balance += interest;
      totalInterest += interest;
    }

    for (const debt of ordered) {
      if (debt.balance <= 0 || pool <= 0) continue;
      const due = Math.min(debt.minimumPayment, debt.balance);
      const payment = Math.min(due, pool);
      debt.balance = Math.max(0, debt.balance - payment);
      pool -= payment;
    }

    for (const debt of ordered) {
      if (pool <= 0) break;
      if (debt.balance <= 0) continue;
      const payment = Math.min(debt.balance, pool);
      debt.balance = Math.max(0, debt.balance - payment);
      pool -= payment;
    }

    remaining = ordered.reduce((sum, debt) => sum + debt.balance, 0);
    const roundedRemaining = Number(remaining.toFixed(2));
    history.push({ month, balance: roundedRemaining });

    for (const debt of ordered) {
      if (!debt.paidOff && debt.balance <= 0.5) {
        debt.paidOff = true;
        payoffOrder.push({ id: debt.id, name: debt.name, month });
      }
    }

    if (roundedRemaining >= lastBalance - 0.5) {
      stagnation += 1;
    } else {
      stagnation = 0;
    }
    lastBalance = roundedRemaining;

    if (stagnation >= 3) {
      warnings.push("Payments are barely covering interest. Increase your commitment to see progress.");
      break;
    }
  }

  if (month >= 600 && remaining > 0.5) {
    warnings.push("Projection exceeds 50 years. Increase payments or review the debt details.");
  }

  const payoffDate = addMonths(new Date(), month);
  return {
    months: month,
    interestPaid: Number(totalInterest.toFixed(2)),
    payoffDate,
    payoffOrder,
    history,
    warnings,
    monthlyCommitment: committed,
    stalled: remaining > 0.5,
  };
}

function formatDuration(months: number) {
  if (!Number.isFinite(months) || months <= 0) {
    return null;
  }
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  if (years && remainingMonths) {
    return `${years}y ${remainingMonths}m`;
  }
  if (years) {
    return `${years}y`;
  }
  return `${months}m`;
}

function strategyLabel(strategy: Strategy) {
  switch (strategy) {
    case "snowball":
      return "snowball";
    case "avalanche":
      return "avalanche";
    default:
      return "hybrid";
  }
}

function totalStartingBalance(debts: DebtWithPayment[]) {
  return debts.reduce((sum, debt) => sum + Math.max(0, debt.balance), 0);
}

function historyProgress(history: PayoffPoint[]) {
  if (!history.length) return 0;
  const start = history[0]?.balance ?? 0;
  const last = history.at(-1)?.balance ?? 0;
  if (!start) return 0;
  const cleared = Math.max(0, start - last);
  return Math.min(100, Number(((cleared / start) * 100).toFixed(1)));
}

function halfwayMarker(history: PayoffPoint[]) {
  if (!history.length) return "TBC";
  const start = history[0]?.balance ?? 0;
  if (!start) return "TBC";
  const halfway = start / 2;
  const point = history.find((entry) => entry.balance <= halfway);
  return point ? `Month ${point.month}` : "Not yet reached";
}

type MetricTileProps = {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent?: string;
  helper?: string;
};

function MetricTile({ icon: Icon, label, value, accent, helper }: MetricTileProps) {
  return (
    <div className="rounded-lg border bg-background p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-4 w-4 text-primary" />
        {label}
      </div>
      <p className={`mt-2 text-lg font-semibold ${accent ?? "text-secondary"}`}>{value}</p>
      {helper && <p className="mt-1 text-xs text-muted-foreground">{helper}</p>}
    </div>
  );
}
