"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/finance";
import type { ReportsData, SpendingPoint, IncomePoint, DebtReportRow } from "@/lib/types/reports";
import type { TransferHistoryItem } from "@/lib/types/envelopes";
import { formatDistanceToNow, startOfMonth, subMonths } from "date-fns";
import { cn } from "@/lib/cn";

type Props = {
  data: ReportsData;
};

const RANGE_OPTIONS = [3, 6, 12] as const;
const UNASSIGNED_LABEL = "Unassigned";

export function ReportsClient({ data }: Props) {
  const plannedMonthly = data.plannedMonthly ?? 0;
  const transactions = data.transactions;

  const labelOptions = useMemo(() => {
    if (data.labels && data.labels.length) {
      return data.labels;
    }
    const set = new Set<string>();
    transactions.forEach((tx) => {
      (tx.labels ?? []).forEach((label) => {
        if (label) set.add(label);
      });
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [data.labels, transactions]);

  const allAccounts = useMemo(() => {
    const source = data.accounts.length ? data.accounts : transactions.map((tx) => tx.account);
    const unique = Array.from(
      new Set(source.map((account) => account ?? UNASSIGNED_LABEL)),
    );
    return unique.sort((a, b) => a.localeCompare(b));
  }, [data.accounts, transactions]);

  const allEnvelopes = useMemo(() => {
    const source = data.envelopes.length ? data.envelopes : transactions.map((tx) => tx.envelope);
    const unique = Array.from(
      new Set(source.map((envelope) => envelope ?? UNASSIGNED_LABEL)),
    );
    return unique.sort((a, b) => a.localeCompare(b));
  }, [data.envelopes, transactions]);

  const [rangeMonths, setRangeMonths] = useState<number>(6);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>(allAccounts);
  const [selectedEnvelopes, setSelectedEnvelopes] = useState<string[]>(allEnvelopes);
  const [selectedLabels, setSelectedLabels] = useState<string[]>(labelOptions);
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");

  useEffect(() => {
    setSelectedAccounts(allAccounts);
  }, [allAccounts]);

  useEffect(() => {
    setSelectedEnvelopes(allEnvelopes);
  }, [allEnvelopes]);

  useEffect(() => {
    setSelectedLabels(labelOptions);
  }, [labelOptions]);

  const toggleAccount = (account: string) => {
    if (!allAccounts.length) return;
    setSelectedAccounts((prev) => {
      const set = new Set(prev);
      if (set.has(account)) {
        set.delete(account);
        if (set.size === 0) {
          return allAccounts;
        }
      } else {
        set.add(account);
      }
      return allAccounts.filter((item) => set.has(item));
    });
  };

  const toggleEnvelope = (envelope: string) => {
    if (!allEnvelopes.length) return;
    setSelectedEnvelopes((prev) => {
      const set = new Set(prev);
      if (set.has(envelope)) {
        set.delete(envelope);
        if (set.size === 0) {
          return allEnvelopes;
        }
      } else {
        set.add(envelope);
      }
      return allEnvelopes.filter((item) => set.has(item));
    });
  };

  const toggleLabel = (label: string) => {
    if (!labelOptions.length) return;
    setSelectedLabels((prev) => {
      const set = new Set(prev);
      if (set.has(label)) {
        set.delete(label);
        if (set.size === 0) {
          return labelOptions;
        }
      } else {
        set.add(label);
      }
      return labelOptions.filter((item) => set.has(item));
    });
  };

  const limitAccounts =
    selectedAccounts.length > 0 && selectedAccounts.length < allAccounts.length;
  const limitEnvelopes =
    selectedEnvelopes.length > 0 && selectedEnvelopes.length < allEnvelopes.length;
  const limitLabels = selectedLabels.length > 0 && selectedLabels.length < labelOptions.length;

  const monthBuckets = useMemo(() => buildMonthBuckets(rangeMonths), [rangeMonths]);

  const rangeStart = useMemo(() => startOfMonth(subMonths(new Date(), rangeMonths - 1)), [rangeMonths]);
  const rangeEnd = useMemo(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return end;
  }, []);

  const filteredTransactions = useMemo(() => {
    if (!transactions.length) return [];
    const accountSet = new Set(selectedAccounts);
    const envelopeSet = new Set(selectedEnvelopes);
    const labelSet = new Set(selectedLabels.map((label) => label.toLowerCase()));
    const min = amountMin.trim() ? Number(amountMin) : null;
    const max = amountMax.trim() ? Number(amountMax) : null;

    return transactions.filter((transaction) => {
      const occurred = new Date(transaction.occurredAt);
      if (occurred < rangeStart) return false;
      const accountLabel = transaction.account ?? UNASSIGNED_LABEL;
      const envelopeLabel = transaction.envelope ?? UNASSIGNED_LABEL;
      if (limitAccounts && !accountSet.has(accountLabel)) return false;
      if (limitEnvelopes && !envelopeSet.has(envelopeLabel)) return false;
      const amount = transaction.amount;
      if (min !== null && Number.isFinite(min) && amount < min) return false;
      if (max !== null && Number.isFinite(max) && amount > max) return false;
      if (limitLabels) {
        const labels = (transaction.labels ?? []).map((label) => label.toLowerCase());
        const hasMatch = labels.some((label) => labelSet.has(label));
        if (!hasMatch) return false;
      }
      return true;
    });
  }, [transactions, rangeStart, selectedAccounts, selectedEnvelopes, selectedLabels, amountMin, amountMax, limitAccounts, limitEnvelopes, limitLabels]);

  const spendingSeries: SpendingPoint[] = useMemo(() => {
    if (!transactions.length) {
      return data.spending.slice(-rangeMonths);
    }
    const plannedValue = plannedMonthly || (data.spending[0]?.planned ?? 0);
    const bucketMap = new Map<string, { planned: number; actual: number }>();
    monthBuckets.forEach((bucket) => {
      bucketMap.set(bucket.key, { planned: plannedValue, actual: 0 });
    });

    filteredTransactions.forEach((transaction) => {
      const amount = transaction.amount;
      if (amount >= 0) return;
      const occurred = new Date(transaction.occurredAt);
      const key = monthKey(occurred);
      const bucket = bucketMap.get(key);
      if (!bucket) return;
      bucket.actual += Math.abs(amount);
    });

    return monthBuckets.map((bucket) => {
      const entry = bucketMap.get(bucket.key) ?? { planned: plannedValue, actual: 0 };
      return {
        month: bucket.label,
        planned: entry.planned,
        actual: entry.actual,
        variance: entry.actual - entry.planned,
      };
    });
  }, [transactions.length, filteredTransactions, monthBuckets, plannedMonthly, data.spending, rangeMonths]);

  const incomeSeries: IncomePoint[] = useMemo(() => {
    if (!transactions.length) {
      return data.income.slice(-rangeMonths);
    }
    const bucketMap = new Map<string, number>();
    monthBuckets.forEach((bucket) => bucketMap.set(bucket.key, 0));

    filteredTransactions.forEach((transaction) => {
      const amount = transaction.amount;
      if (amount <= 0) return;
      const key = monthKey(new Date(transaction.occurredAt));
      bucketMap.set(key, (bucketMap.get(key) ?? 0) + amount);
    });

    return monthBuckets.map((bucket) => ({
      month: bucket.label,
      amount: bucketMap.get(bucket.key) ?? 0,
    }));
  }, [transactions.length, filteredTransactions, monthBuckets, data.income, rangeMonths]);

  const summary = useMemo(() => {
    const totalSpent = spendingSeries.reduce((sum, point) => sum + point.actual, 0);
    const planVariance = spendingSeries.reduce((sum, point) => sum + point.variance, 0);
    const incomeMonths = incomeSeries.filter((point) => point.amount > 0);
    const avgIncome = incomeMonths.length
      ? incomeMonths.reduce((sum, point) => sum + point.amount, 0) / incomeMonths.length
      : 0;
    const debtsRemaining = data.debts.filter((debt) => debt.balance > 0.5).length;
    return { totalSpent, planVariance, avgIncome, debtsRemaining };
  }, [spendingSeries, incomeSeries, data.debts]);

  const variance = summary.planVariance;
  const varianceTone = variance <= 0 ? "text-emerald-600" : "text-rose-600";
  const varianceLabel =
    (variance >= 0 ? "+" : "-") + formatCurrency(Math.abs(variance));

  const showAccountFilters = allAccounts.length > 1;
  const showEnvelopeFilters = allEnvelopes.length > 1;
  const showLabelFilters = labelOptions.length > 0;

  const buildTransactionExportUrl = (format: "csv" | "xlsx") => {
    const params = new URLSearchParams();
    params.set("format", format);
    params.set("from", rangeStart.toISOString());
    params.set("to", rangeEnd.toISOString());
    if (limitAccounts) selectedAccounts.forEach((account) => params.append("account", account));
    if (limitEnvelopes) selectedEnvelopes.forEach((envelope) => params.append("envelope", envelope));
    if (limitLabels) selectedLabels.forEach((label) => params.append("label", label));
    if (amountMin.trim()) params.set("min", amountMin.trim());
    if (amountMax.trim()) params.set("max", amountMax.trim());
    return `/api/reports/transactions?${params.toString()}`;
  };

  const compactSummary = [
    {
      id: "spend",
      label: "Total spend",
      value: formatCurrency(summary.totalSpent),
      helper: `${rangeMonths} month window`,
    },
    {
      id: "variance",
      label: "Spend vs plan",
      value: varianceLabel,
      helper: variance <= 0 ? "Under plan" : "Over plan",
      emphasis: variance <= 0 ? "positive" : "negative",
    },
    {
      id: "income",
      label: "Avg. monthly income",
      value: formatCurrency(summary.avgIncome),
    },
    {
      id: "debts",
      label: "Active debts",
      value: summary.debtsRemaining.toString(),
      helper: summary.debtsRemaining === 0 ? "All paid off" : "Still paying down",
      emphasis: summary.debtsRemaining === 0 ? "positive" : undefined,
    },
  ] as const;

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

      <div className="md:hidden">
        <MobileSummaryList items={compactSummary} />
      </div>
      <section className="hidden gap-4 md:grid md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard title="Total spend" value={formatCurrency(summary.totalSpent)} />
        <SummaryCard title="Spend vs plan" value={varianceLabel} tone={varianceTone} />
        <SummaryCard title="Avg. monthly income" value={formatCurrency(summary.avgIncome)} />
        <SummaryCard
          title="Active debts"
          value={summary.debtsRemaining.toString()}
          tone={summary.debtsRemaining === 0 ? "text-emerald-600" : "text-secondary"}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Report filters</CardTitle>
          <p className="text-sm text-muted-foreground">
            Focus the charts by timeframe, account, or envelope. Filters also drive the summary above.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Time range
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {RANGE_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setRangeMonths(option)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    rangeMonths === option
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-muted text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {option} months
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Amount range
            </p>
            <div className="mt-2 flex gap-2">
              <Input
                type="number"
                step="0.01"
                placeholder="Min"
                value={amountMin}
                onChange={(event) => setAmountMin(event.target.value)}
                className="w-28"
              />
              <Input
                type="number"
                step="0.01"
                placeholder="Max"
                value={amountMax}
                onChange={(event) => setAmountMax(event.target.value)}
                className="w-28"
              />
            </div>
          </div>
          {showLabelFilters ? (
            <FilterChipGroup
              label="Labels"
              items={labelOptions}
              selected={selectedLabels}
              onToggle={toggleLabel}
              onReset={() => setSelectedLabels(labelOptions)}
            />
          ) : null}
          {showAccountFilters ? (
            <FilterChipGroup
              label="Accounts"
              items={allAccounts}
              selected={selectedAccounts}
              onToggle={toggleAccount}
              onReset={() => setSelectedAccounts(allAccounts)}
            />
          ) : null}
          {showEnvelopeFilters ? (
            <FilterChipGroup
              label="Envelopes"
              items={allEnvelopes}
              selected={selectedEnvelopes}
              onToggle={toggleEnvelope}
              onReset={() => setSelectedEnvelopes(allEnvelopes)}
            />
          ) : null}
        </CardContent>
      </Card>

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
          <SpendingPlanChart data={spendingSeries} />
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
          <IncomeTrendChart data={incomeSeries} />
          <div className="grid gap-2 sm:grid-cols-3 md:grid-cols-6">
            {incomeSeries.map((point) => (
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
          <Button variant="outline" asChild>
            <Link href="/api/reports/balance-sheet?format=csv">Balance sheet (CSV)</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/api/reports/balance-sheet?format=xlsx">Balance sheet (Excel)</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={buildTransactionExportUrl("csv")}>
              Filtered transactions (CSV)
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={buildTransactionExportUrl("xlsx")}>
              Filtered transactions (Excel)
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/api/reports/net-worth/pdf">Net worth summary (PDF)</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/api/reports/envelopes/pdf">Envelope summary (PDF)</Link>
          </Button>
        </CardContent>
      </Card>

      <TransferHistoryCard transfers={data.transfers} />
    </div>
  );
}

function FilterChipGroup({
  label,
  items,
  selected,
  onToggle,
  onReset,
}: {
  label: string;
  items: string[];
  selected: string[];
  onToggle: (item: string) => void;
  onReset: () => void;
}) {
  if (!items.length) return null;
  const allSelected = selected.length === items.length;
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onReset}
          className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
            allSelected
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-muted text-muted-foreground hover:border-primary/40"
          }`}
        >
          All
        </button>
        {items.map((item) => {
          const isActive = selected.includes(item);
          return (
            <button
              key={item}
              type="button"
              onClick={() => onToggle(item)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                isActive
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-muted text-muted-foreground hover:border-primary/40"
              }`}
            >
              {item}
            </button>
          );
        })}
      </div>
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

type MobileSummaryItem = {
  id: string;
  label: string;
  value: string;
  helper?: string;
  emphasis?: "positive" | "negative";
};

function MobileSummaryList({ items }: { items: readonly MobileSummaryItem[] }) {
  return (
    <div className="rounded-2xl border border-border bg-muted/20">
      <h2 className="px-4 pt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Snapshot
      </h2>
      <ul className="divide-y divide-border text-sm">
        {items.map((item) => {
          const tone =
            item.emphasis === "positive"
              ? "text-emerald-600"
              : item.emphasis === "negative"
              ? "text-rose-600"
              : "text-secondary";
          return (
            <li key={item.id} className="px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {item.label}
              </p>
              <div className="mt-1 flex items-end justify-between gap-3">
                {item.helper ? (
                  <span className="text-xs text-muted-foreground">{item.helper}</span>
                ) : (
                  <span />
                )}
                <span className={cn("text-base font-semibold", tone)}>{item.value}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function TransferHistoryCard({ transfers }: { transfers: TransferHistoryItem[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>Recent envelope transfers</CardTitle>
          <p className="text-sm text-muted-foreground">
            Track how you’re rebalancing envelopes between pay cycles. These changes help explain spending vs plan variances.
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        {transfers.length ? (
          transfers.slice(0, 6).map((transfer) => (
            <div
              key={transfer.id}
              className="rounded-xl border border-border bg-muted/20 px-4 py-3 text-secondary"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>
                  {transfer.from.name ?? "Unassigned"} → {transfer.to.name ?? "Unassigned"}
                </span>
                <span>{formatDistanceToNow(new Date(transfer.createdAt), { addSuffix: true })}</span>
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm font-semibold text-secondary">
                <span>{transfer.note ?? "No note"}</span>
                <span>{formatCurrency(transfer.amount)}</span>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            No transfers recorded yet. Use the transfer dialog to capture envelope-to-envelope movements.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function buildMonthBuckets(count: number) {
  const formatter = new Intl.DateTimeFormat("en-NZ", { month: "short" });
  const buckets: Array<{ key: string; label: string }> = [];
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const date = startOfMonth(subMonths(new Date(), offset));
    const label = `${formatter.format(date)} ${date.getFullYear().toString().slice(-2)}`;
    buckets.push({ key: monthKey(date), label });
  }
  return buckets;
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}`;
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
