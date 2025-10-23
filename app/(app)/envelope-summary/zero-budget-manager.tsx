"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { formatDistanceToNow } from "date-fns";
import type { EnvelopeRow } from "@/lib/auth/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/finance";
import { toast } from "sonner";
import type { TransferHistoryItem } from "@/lib/types/envelopes";
import { CelebrationTimeline, type CelebrationEvent } from "@/components/layout/dashboard/celebration-timeline";
import { useRegisterCommand } from "@/providers/command-palette-provider";

const demoBudget: EnvelopeRow[] = [
  {
    id: "demo-income-1",
    name: "Salary",
    target_amount: 4200,
    current_amount: 4200,
    due_date: null,
    frequency: "fortnightly",
  },
  {
    id: "demo-income-2",
    name: "Side hustle",
    target_amount: 600,
    current_amount: 460,
    due_date: null,
    frequency: "monthly",
  },
  {
    id: "demo-expense-1",
    name: "Rent",
    target_amount: 2200,
    current_amount: 2200,
    due_date: "2025-08-01",
    frequency: "monthly",
  },
  {
    id: "demo-expense-2",
    name: "Groceries",
    target_amount: 600,
    current_amount: 480,
    due_date: null,
    frequency: "weekly",
  },
  {
    id: "demo-expense-3",
    name: "Kids activities",
    target_amount: 220,
    current_amount: 260,
    due_date: null,
    frequency: "fortnightly",
  },
];

type ManagerRow = EnvelopeRow & { type: "income" | "expense" };

type CelebrationRecord = {
  id: string;
  title: string;
  description: string | null;
  achievedAt: string;
};

type CelebrationState = {
  id: string;
  title: string;
  description: string | null;
  achievedAt: Date;
};

function enrichRows(rows: EnvelopeRow[]): ManagerRow[] {
  if (!rows.length) {
    return demoBudget.map((row) => ({ ...row, type: row.name === "Salary" || row.name === "Side hustle" ? "income" : "expense" }));
  }

  return rows.map((row) => ({
    ...row,
    type: row.name.toLowerCase().includes("income") || row.target_amount && Number(row.target_amount) < 0 ? "income" : "expense",
  }));
}

export function ZeroBudgetManager({
  envelopes,
  transferHistory = [],
  celebrations = [],
}: {
  envelopes: EnvelopeRow[];
  transferHistory?: TransferHistoryItem[];
  celebrations?: CelebrationRecord[];
}) {
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [tableRows, setTableRows] = useState(() => enrichRows(envelopes));
  const [showTransferHistory, setShowTransferHistory] = useState(false);
  const [showCelebrationHistory, setShowCelebrationHistory] = useState(false);
  const [celebrationLoading, setCelebrationLoading] = useState(false);
  const [highlightCelebration, setHighlightCelebration] = useState<CelebrationState | null>(null);
  const deficitsSectionRef = useRef<HTMLDivElement | null>(null);
  const [celebrationsState, setCelebrationsState] = useState<CelebrationState[]>(() =>
    (celebrations ?? []).map((entry) => ({
      id: entry.id,
      title: entry.title,
      description: entry.description,
      achievedAt: new Date(entry.achievedAt),
    })),
  );

  useEffect(() => {
    setCelebrationsState(
      (celebrations ?? []).map((entry) => ({
        id: entry.id,
        title: entry.title,
        description: entry.description,
        achievedAt: new Date(entry.achievedAt),
      })),
    );
  }, [celebrations]);

  const metrics = useMemo(() => {
    const totals = tableRows.reduce(
      (acc, row) => {
        const target = Number(row.target_amount ?? 0);
        const current = Number(row.current_amount ?? 0);
        if (row.type === "income") {
          acc.incomeTarget += target;
          acc.incomeActual += current;
        } else {
          acc.expenseTarget += target;
          acc.expenseActual += current;
        }
        return acc;
      },
      {
        incomeTarget: 0,
        incomeActual: 0,
        expenseTarget: 0,
        expenseActual: 0,
      },
    );

    const netTarget = totals.incomeTarget - totals.expenseTarget;
    const netActual = totals.incomeActual - totals.expenseActual;

    return {
      ...totals,
      netTarget,
      netActual,
      status: Math.abs(netActual) < 5 ? "balanced" : netActual > 0 ? "surplus" : "overspent",
      delta: netActual,
    };
  }, [tableRows]);

  const transfersPreview = useMemo(() => transferHistory.slice(0, 4), [transferHistory]);

  const deficits = tableRows
    .map((row) => {
      const target = Number(row.target_amount ?? 0);
      const current = Number(row.current_amount ?? 0);
      return {
        id: row.id,
        name: row.name,
        gap: Math.max(0, target - current),
      };
    })
    .filter((item) => item.gap > 0)
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 3);

  const allocationPlan = useMemo(() => {
    if (metrics.status !== "surplus") {
      return [] as Array<{ id: string; name: string; allocation: number }>;
    }
    let remaining = metrics.delta;
    return deficits
      .map((item) => {
        if (remaining <= 0) return { ...item, allocation: 0 };
        const allocation = Math.min(item.gap, remaining);
        remaining -= allocation;
        return { ...item, allocation };
      })
      .filter((item) => item.allocation > 0);
  }, [deficits, metrics]);

  const overspentEnvelopes = useMemo(() => {
    return tableRows
      .filter((row) => row.type === "expense")
      .map((row) => {
        const target = Number(row.target_amount ?? 0);
        const current = Number(row.current_amount ?? 0);
        return {
          id: row.id,
          name: row.name,
          diff: current - target,
          note: notes[row.id],
        };
      })
      .filter((entry) => entry.diff > 5)
      .sort((a, b) => b.diff - a.diff)
      .slice(0, 3);
  }, [tableRows, notes]);

  const overspendTotal = overspentEnvelopes.reduce((sum, item) => sum + item.diff, 0);

  const celebrationEvents: CelebrationEvent[] = useMemo(
    () =>
      celebrationsState.map((entry) => ({
        id: entry.id,
        title: entry.title,
        description: entry.description ?? "",
        achievedAt: entry.achievedAt,
      })),
    [celebrationsState],
  );

  const handleCelebrate = useCallback(async () => {
    if (celebrationLoading) return;
    setCelebrationLoading(true);
    try {
      const title =
        metrics.status === "balanced"
          ? "Zero budget balanced"
          : "Budget celebration";
      const description =
        metrics.status === "balanced"
          ? "Your envelopes now align with this cycle's income."
          : `Manual celebration logged with delta ${formatCurrency(metrics.delta)}.`;

      const response = await fetch("/api/zero-budget/celebrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      });

      const result = await response
        .json()
        .catch(() => ({ error: "Unable to log celebration" }));

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to log celebration");
      }

      const celebration: CelebrationState = {
        id: result.celebration.id,
        title: result.celebration.title,
        description: result.celebration.description ?? null,
        achievedAt: new Date(result.celebration.achieved_at),
      };

      setCelebrationsState((prev) => [celebration, ...prev]);
      setHighlightCelebration(celebration);
      toast.success("Celebration saved");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Unable to log celebration");
    } finally {
      setCelebrationLoading(false);
    }
  }, [celebrationLoading, metrics]);

  const scrollToDeficits = useCallback(() => {
    if (deficitsSectionRef.current) {
      deficitsSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      deficitsSectionRef.current.focus?.({ preventScroll: true });
    }
  }, []);

  const deficitsAction = useMemo(
    () => ({
      id: "zero-budget-deficits",
      label: "Jump to zero-budget deficits",
      description: deficits.length
        ? `${deficits.length} envelope${deficits.length === 1 ? "" : "s"} need a top up`
        : "All envelopes are on track",
      onSelect: () => {
        if (!deficits.length) {
          toast.info("No deficits detected right now");
          return;
        }
        scrollToDeficits();
      },
    }),
    [deficits.length, scrollToDeficits],
  );
  useRegisterCommand(deficitsAction);

  const celebrationAction = useMemo(
    () => ({
      id: "zero-budget-celebrate",
      label: "Log zero-budget celebration",
      description:
        metrics.status === "balanced"
          ? "Celebrate a balanced cycle"
          : "Balance your plan to unlock celebration",
      onSelect: () => {
        if (metrics.status === "balanced") {
          void handleCelebrate();
        } else {
          toast.info("Balance your plan before logging a celebration");
        }
      },
    }),
    [metrics.status, handleCelebrate],
  );
  useRegisterCommand(celebrationAction);

  function handleCapturePlan() {
    toast.success("Surplus allocation noted (demo mode)");
  }

  async function handleCopyPlan() {
    const lines = allocationPlan.map((item) => `${item.name}: ${formatCurrency(item.allocation)}`);
    const payload =
      lines.length > 0
        ? `Surplus plan\n${lines.join("\n")}`
        : "No surplus available for allocation";
    try {
      await navigator.clipboard.writeText(payload);
      toast.success("Plan copied to clipboard");
    } catch (error) {
      console.error(error);
      toast.error("Clipboard unavailable");
    }
  }

  function handleAmountChange(id: string, field: "target_amount" | "current_amount", value: number) {
    setTableRows((rows) =>
      rows.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 rounded-xl border bg-muted/20 p-6 md:grid-cols-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Income vs Expense</p>
          <p className="text-2xl font-semibold text-secondary">
            {formatCurrency(metrics.incomeActual - metrics.expenseActual)}
          </p>
          <p className="text-xs text-muted-foreground">
            Target {formatCurrency(metrics.incomeTarget - metrics.expenseTarget)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
          <p
            className="text-2xl font-semibold"
            style={{
              color:
                metrics.status === "balanced"
                  ? "hsl(154 45% 35%)"
                  : metrics.status === "surplus"
                    ? "hsl(210 80% 45%)"
                    : "hsl(4 86% 58%)",
            }}
          >
            {metrics.status === "balanced"
              ? "Zero budget achieved"
              : metrics.status === "surplus"
                ? "Surplus available"
                : "Overspent"}
          </p>
          <p className="text-xs text-muted-foreground">Delta {formatCurrency(metrics.delta)}</p>
        </div>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            Celebrate when the delta hits zero and keep a log of milestones to look back on. You can also
            review recent envelope transfers to understand how surplus moves through your plan.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowCelebrationHistory(true)}>
              View celebration history
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowTransferHistory(true)}>
              View transfer history
            </Button>
            {metrics.status === "balanced" ? (
              <Button size="sm" onClick={handleCelebrate} disabled={celebrationLoading}>
                {celebrationLoading ? "Saving…" : "Log celebration"}
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="min-w-full divide-y">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Envelope</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Target</th>
              <th className="px-4 py-3">Actual</th>
              <th className="px-4 py-3">Per pay</th>
              <th className="px-4 py-3">Next due</th>
              <th className="px-4 py-3">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {tableRows.map((row) => {
              const target = Number(row.target_amount ?? 0);
              const current = Number(row.current_amount ?? 0);
              const perPay = row.frequency ? target / (row.frequency.includes("week") ? 1 : row.frequency.includes("fortnight") ? 2 : 4) : 0;
              const overspent = row.type === "expense" && current > target;

              return (
                <tr key={row.id} className="text-sm">
                  <td className="px-4 py-3 font-medium text-secondary">
                    <div>{row.name}</div>
                    {notes[row.id] ? (
                      <p className="text-xs italic text-muted-foreground">{notes[row.id]}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 capitalize text-muted-foreground">{row.type}</td>
                  <td className="px-4 py-3">
                    <Input
                      type="number"
                      step="0.01"
                      className="h-8"
                      defaultValue={target}
                      onChange={(event) => handleAmountChange(row.id, "target_amount", Number(event.target.value))}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Input
                      type="number"
                      step="0.01"
                      className={`h-8 ${overspent ? "border-destructive text-destructive" : ""}`}
                      defaultValue={current}
                      onChange={(event) => handleAmountChange(row.id, "current_amount", Number(event.target.value))}
                    />
                    {overspent && (
                      <p className="text-xs text-destructive">Overspent by {formatCurrency(current - target)}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{perPay ? formatCurrency(perPay) : "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {row.due_date ? new Intl.DateTimeFormat("en-NZ").format(new Date(row.due_date)) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <textarea
                      rows={2}
                      className="w-full rounded-md border px-2 py-1 text-xs"
                      placeholder="Milestones, memories…"
                      defaultValue={notes[row.id] ?? ""}
                      onBlur={(event) => setNotes((prev) => ({ ...prev, [row.id]: event.target.value }))}
                    />
                    <div className="mt-1 flex gap-2">
                      <Button variant="ghost" size="sm">
                        View history
                      </Button>
                      <Button variant="ghost" size="sm">
                        Surplus suggestions
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {transferHistory.length ? (
        <div className="rounded-xl border border-muted/40 bg-muted/10 px-6 py-5 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-secondary">Recent envelope transfers</p>
            <Button size="sm" variant="outline" onClick={() => setShowTransferHistory(true)}>
              View full history
            </Button>
          </div>
          <ul className="mt-3 space-y-2">
            {transfersPreview.map((transfer) => (
              <li
                key={transfer.id}
                className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-muted-foreground"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-secondary">
                    {transfer.from.name ?? "Unassigned"} → {transfer.to.name ?? "Unassigned"}
                  </span>
                  <span className="font-semibold text-secondary">{formatCurrency(transfer.amount)}</span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <span>{transfer.note ?? "No note"}</span>
                  <span>{formatDistanceToNow(new Date(transfer.createdAt), { addSuffix: true })}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-muted/40 bg-muted/10 px-6 py-5 text-sm text-muted-foreground">
          No transfers recorded yet. Move funds between envelopes from the transfer dialog to build
          a history.
        </div>
      )}

      {metrics.status === "balanced" ? (
        <div className="rounded-xl border border-primary/40 bg-primary/5 px-6 py-5 text-sm text-primary">
          🎉 Ka pai! Zero budget achieved. Keep an eye on reconciliation to maintain the streak.
        </div>
      ) : null}

      {metrics.status === "surplus" && allocationPlan.length ? (
        <div
          ref={deficitsSectionRef}
          tabIndex={-1}
          className="rounded-xl border border-dashed border-secondary/40 bg-secondary/5 px-6 py-5 text-sm text-secondary focus:outline-none"
        >
          You have surplus available. Proposed top-ups:
          <ul className="mt-3 space-y-1">
            {allocationPlan.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between rounded-md bg-white/60 px-3 py-2 text-secondary"
              >
                <span>{item.name}</span>
                <span className="font-medium">{formatCurrency(item.allocation)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" onClick={handleCapturePlan}>
              Mark as allocated
            </Button>
            <Button size="sm" variant="outline" onClick={handleCopyPlan}>
              Copy plan
            </Button>
          </div>
        </div>
      ) : null}

      {metrics.status === "overspent" && overspentEnvelopes.length ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-6 py-5 text-sm text-destructive">
          Overspend alert: you are over by {formatCurrency(overspendTotal)} this cycle. Focus on these envelopes:
          <ul className="mt-3 space-y-1">
            {overspentEnvelopes.map((item) => (
              <li
                key={item.id}
                className="rounded-md border border-destructive/30 bg-background px-3 py-2"
              >
                <div className="flex items-center justify-between">
                  <span>{item.name}</span>
                  <span className="font-medium">{formatCurrency(item.diff)}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Tip: Review recent transactions and pause discretionary spend for this envelope.
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <CelebrationTimeline events={celebrationEvents} />

      <TransferHistoryDialog
        open={showTransferHistory}
        onOpenChange={setShowTransferHistory}
        transfers={transferHistory}
      />
      <CelebrationHistoryDialog
        open={showCelebrationHistory}
        onOpenChange={setShowCelebrationHistory}
        celebrations={celebrationsState}
      />
      <CelebrationOverlay celebration={highlightCelebration} onClose={() => setHighlightCelebration(null)} />
    </div>
  );
}

function TransferHistoryDialog({
  open,
  onOpenChange,
  transfers,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  transfers: TransferHistoryItem[];
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40" />
        <Dialog.Content className="fixed inset-0 flex items-center justify-center px-4">
          <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-3xl border bg-background p-6 shadow-xl">
            <Dialog.Title className="text-lg font-semibold text-secondary">
              Envelope transfer history
            </Dialog.Title>
            <Dialog.Description className="text-sm text-muted-foreground">
              Latest envelope-to-envelope movements. Use transfers to rebalance your plan between pay cycles.
            </Dialog.Description>
            <ul className="mt-4 space-y-3">
              {transfers.length ? (
                transfers.map((transfer) => (
                  <li key={transfer.id} className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-secondary">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold">
                        {transfer.from.name ?? "Unassigned"} → {transfer.to.name ?? "Unassigned"}
                      </span>
                      <span className="font-semibold">{formatCurrency(transfer.amount)}</span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {transfer.note ?? "No note added"}
                    </p>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      {formatDistanceToNow(new Date(transfer.createdAt), { addSuffix: true })}
                    </p>
                  </li>
                ))
              ) : (
                <li className="rounded-xl border border-dashed border-primary/20 bg-background p-4 text-xs text-muted-foreground">
                  No transfers yet. Use the transfer dialog to move funds between envelopes and build a history.
                </li>
              )}
            </ul>
            <div className="mt-6 text-right">
              <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function CelebrationHistoryDialog({
  open,
  onOpenChange,
  celebrations,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  celebrations: CelebrationState[];
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40" />
        <Dialog.Content className="fixed inset-0 flex items-center justify-center px-4">
          <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-3xl border bg-background p-6 shadow-xl">
            <Dialog.Title className="text-lg font-semibold text-secondary">
              Celebration history
            </Dialog.Title>
            <Dialog.Description className="text-sm text-muted-foreground">
              A log of balanced budgets and milestones tracked over time.
            </Dialog.Description>
            <ul className="mt-4 space-y-3">
              {celebrations.length ? (
                celebrations.map((entry) => (
                  <li key={entry.id} className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-secondary">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold">{entry.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(entry.achievedAt, { addSuffix: true })}
                      </span>
                    </div>
                    {entry.description ? (
                      <p className="mt-2 text-xs text-muted-foreground">{entry.description}</p>
                    ) : null}
                  </li>
                ))
              ) : (
                <li className="rounded-xl border border-dashed border-primary/20 bg-background p-4 text-xs text-muted-foreground">
                  No celebrations recorded yet. Balance your plan or log a custom milestone to populate this list.
                </li>
              )}
            </ul>
            <div className="mt-6 text-right">
              <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function CelebrationOverlay({
  celebration,
  onClose,
}: {
  celebration: CelebrationState | null;
  onClose: () => void;
}) {
  if (!celebration) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6">
      <div className="relative flex max-w-xl flex-col items-center gap-4 rounded-3xl border border-primary/40 bg-white p-10 text-center shadow-2xl">
        <div className="text-5xl">🎉</div>
        <h3 className="text-2xl font-semibold text-secondary">{celebration.title}</h3>
        {celebration.description ? (
          <p className="text-sm text-muted-foreground">{celebration.description}</p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          Logged {formatDistanceToNow(celebration.achievedAt, { addSuffix: true })}
        </p>
        <Button onClick={onClose}>Close</Button>
      </div>
    </div>
  );
}
