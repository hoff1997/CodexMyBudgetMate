"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SummaryEnvelope } from "@/components/layout/envelopes/envelope-summary-card";
import { EnvelopeEditSheet } from "@/components/layout/envelopes/envelope-edit-sheet";
import { EnvelopeTransferDialog } from "@/components/layout/envelopes/envelope-transfer-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/finance";
import { PlannerFrequency, calculateDueProgress, frequencyOptions } from "@/lib/planner/calculations";
import { differenceInCalendarDays } from "date-fns";
import type { TransferHistoryItem } from "@/lib/types/envelopes";

const statusFilters = [
  { key: "all", label: "All" },
  { key: "healthy", label: "On track" },
  { key: "attention", label: "Needs attention" },
  { key: "surplus", label: "Surplus" },
] as const;

type StatusFilter = (typeof statusFilters)[number]["key"];

type TransferSuggestion = {
  key: string;
  from: SummaryEnvelope;
  to: SummaryEnvelope;
  amount: number;
  deficit: number;
  dueLabel: string;
  daysUntil: number;
};

interface Props {
  envelopes: SummaryEnvelope[];
  categories: { id: string; name: string }[];
  canEdit: boolean;
  transferHistory: TransferHistoryItem[];
}

export function EnvelopeManagerClient({ envelopes, categories, canEdit, transferHistory }: Props) {
  const router = useRouter();
  const [selectedEnvelope, setSelectedEnvelope] = useState<SummaryEnvelope | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferDefaults, setTransferDefaults] = useState<{ fromId?: string; toId?: string; amount?: number }>({});
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [newEnvelope, setNewEnvelope] = useState({
    name: "",
    categoryId: "",
    targetAmount: "",
    payCycleAmount: "",
    frequency: "monthly" as PlannerFrequency,
  });

  const filteredEnvelopes = useMemo(() => {
    return envelopes.filter((envelope) => {
      if (categoryFilter !== "all" && String(envelope.category_id ?? "uncategorised") !== categoryFilter) {
        return false;
      }
      if (statusFilter !== "all" && getStatusBucket(envelope) !== statusFilter) {
        return false;
      }
      if (search && !envelope.name.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [envelopes, categoryFilter, statusFilter, search]);

  const totals = useMemo(
    () =>
      filteredEnvelopes.reduce(
        (acc, envelope) => {
          acc.target += Number(envelope.target_amount ?? 0);
          acc.current += Number(envelope.current_amount ?? 0);
          return acc;
        },
        { target: 0, current: 0 },
      ),
    [filteredEnvelopes],
  );
  const suggestions = useMemo(() => buildTransferSuggestions(envelopes), [envelopes]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 pb-24 pt-12 md:px-10 md:pb-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-secondary">Manage envelopes</h1>
        <p className="text-base text-muted-foreground">
          Create, edit, transfer, and monitor envelopes. Changes sync with the planner, dashboard,
          and recurring income tools.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard title="Total target" value={formatCurrency(totals.target)} />
        <MetricCard title="Current balance" value={formatCurrency(totals.current)} />
        <MetricCard title="Funding gap" value={formatCurrency(Math.max(0, totals.target - totals.current))} />
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {statusFilters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => setStatusFilter(filter.key)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                statusFilter === filter.key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-muted text-muted-foreground hover:border-primary/40"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            className="h-9 rounded-md border px-3 text-sm"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
          >
            <option value="all">All categories</option>
            <option value="uncategorised">Uncategorised</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <Input
            placeholder="Search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-9 w-full sm:w-48"
          />
          <Button
            variant="outline"
            onClick={() => {
              setTransferDefaults({});
              setTransferOpen(true);
            }}
          >
            Transfer funds
          </Button>
          <Button variant="outline" asChild>
            <Link href="/envelope-planning">Open planner</Link>
          </Button>
        </div>
      </div>

      <TransferOptimizer
        suggestions={suggestions}
        onSelect={(suggestion) => {
          setTransferDefaults({
            fromId: suggestion.from.id,
            toId: suggestion.to.id,
            amount: suggestion.amount,
          });
          setTransferOpen(true);
        }}
        disabled={!canEdit || suggestions.length === 0}
      />

      <form
        className="grid gap-3 rounded-3xl border border-dashed border-primary/30 bg-primary/5 p-4 md:grid-cols-5"
        onSubmit={async (event) => {
          event.preventDefault();
          setCreating(true);
          try {
            const response = await fetch("/api/envelopes", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: newEnvelope.name,
                categoryId: newEnvelope.categoryId || undefined,
                targetAmount: Number(newEnvelope.targetAmount || 0),
                payCycleAmount: Number(newEnvelope.payCycleAmount || 0),
                frequency: newEnvelope.frequency,
              }),
            });
            if (!response.ok) {
              throw new Error("Failed to create envelope");
            }
            setNewEnvelope({ name: "", categoryId: "", targetAmount: "", payCycleAmount: "", frequency: "monthly" });
            router.refresh();
          } finally {
            setCreating(false);
          }
        }}
      >
        <Input
          placeholder="Envelope name"
          required
          value={newEnvelope.name}
          onChange={(event) => setNewEnvelope((prev) => ({ ...prev, name: event.target.value }))}
        />
        <select
          className="h-10 rounded-md border px-3 text-sm"
          value={newEnvelope.categoryId}
          onChange={(event) => setNewEnvelope((prev) => ({ ...prev, categoryId: event.target.value }))}
        >
          <option value="">Select category</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <Input
          placeholder="Target"
          type="number"
          step="0.01"
          value={newEnvelope.targetAmount}
          onChange={(event) => setNewEnvelope((prev) => ({ ...prev, targetAmount: event.target.value }))}
        />
        <Input
          placeholder="Per pay"
          type="number"
          step="0.01"
          value={newEnvelope.payCycleAmount}
          onChange={(event) => setNewEnvelope((prev) => ({ ...prev, payCycleAmount: event.target.value }))}
        />
        <select
          className="h-10 rounded-md border px-3 text-sm"
          value={newEnvelope.frequency}
          onChange={(event) =>
            setNewEnvelope((prev) => ({ ...prev, frequency: event.target.value as PlannerFrequency }))
          }
        >
          {frequencyOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Button type="submit" className="md:col-span-5" disabled={creating}>
          {creating ? "Adding…" : "Quick add envelope"}
        </Button>
      </form>

      <div className="overflow-x-auto rounded-3xl border">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Per pay</th>
              <th className="px-4 py-3">Target</th>
              <th className="px-4 py-3">Current</th>
              <th className="px-4 py-3">Frequency</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredEnvelopes.map((envelope) => (
              <tr key={envelope.id} className="text-sm">
                <td className="px-4 py-3">
                  <div className="font-medium text-secondary">{envelope.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatStatusBadge(envelope)}
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {envelope.category_name ?? "Uncategorised"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {envelope.pay_cycle_amount
                    ? formatCurrency(Number(envelope.pay_cycle_amount))
                    : "—"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatCurrency(Number(envelope.target_amount ?? 0))}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatCurrency(Number(envelope.current_amount ?? 0))}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {envelope.frequency ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedEnvelope(envelope)}
                      disabled={!canEdit}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setTransferDefaults({ fromId: envelope.id });
                        setTransferOpen(true);
                      }}
                      disabled={!canEdit}
                    >
                      Transfer
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <EnvelopeEditSheet
        envelope={selectedEnvelope}
        onClose={() => setSelectedEnvelope(null)}
        onSave={async (payload) => {
          await fetch(`/api/envelopes/${payload.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: payload.name,
              target_amount: Number(payload.target_amount ?? 0),
              pay_cycle_amount: Number(payload.pay_cycle_amount ?? 0),
              frequency: payload.frequency,
              next_payment_due: payload.next_payment_due ?? payload.due_date,
              notes: payload.notes,
            }),
          });
          router.refresh();
        }}
      />

      <EnvelopeTransferDialog
        open={transferOpen}
        onOpenChange={(value) => {
          setTransferOpen(value);
          if (!value) {
            setTransferDefaults({});
          }
        }}
        envelopes={envelopes}
        defaultFromId={transferDefaults.fromId}
        defaultToId={transferDefaults.toId}
        defaultAmount={transferDefaults.amount}
        history={transferHistory}
        onTransferComplete={() => router.refresh()}
      />

      <MobileNav />
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold text-secondary">{value}</p>
      </CardContent>
    </Card>
  );
}

function getStatusBucket(envelope: SummaryEnvelope): StatusFilter {
  const target = Number(envelope.target_amount ?? 0);
  if (!target) return "attention";
  const ratio = Number(envelope.current_amount ?? 0) / target;
  if (ratio >= 1.05) return "surplus";
  if (ratio >= 0.8) return "healthy";
  return "attention";
}

function formatStatusBadge(envelope: SummaryEnvelope) {
  const status = getStatusBucket(envelope);
  switch (status) {
    case "healthy":
      return "On track";
    case "surplus":
      return "Surplus available";
    case "attention":
    default:
      return "Needs attention";
  }
}

function TransferOptimizer({
  suggestions,
  onSelect,
  disabled,
}: {
  suggestions: TransferSuggestion[];
  onSelect: (suggestion: TransferSuggestion) => void;
  disabled: boolean;
}) {
  return (
    <div className="rounded-3xl border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-secondary">Optimisation helper</h2>
          <p className="text-xs text-muted-foreground">
            Suggested moves based on surplus envelopes and upcoming needs.
          </p>
        </div>
      </div>
      {suggestions.length ? (
        <ul className="mt-4 space-y-3">
          {suggestions.map((suggestion) => (
            <li
              key={suggestion.key}
              className="flex flex-col gap-3 rounded-2xl border bg-muted/30 p-4 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between"
            >
              <div className="space-y-1">
                <p className="font-medium text-secondary">
                  Move {formatCurrency(suggestion.amount)} from {suggestion.from.name} to {suggestion.to.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  Needs {formatCurrency(suggestion.deficit)} · {suggestion.dueLabel}
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => onSelect(suggestion)}
                disabled={disabled}
                className="md:self-end"
              >
                Apply suggestion
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          No optimisation needed. All envelopes with targets are funded to plan.
        </p>
      )}
    </div>
  );
}

function MobileNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 border-t bg-background/95 shadow-lg backdrop-blur md:hidden">
      <div className="flex items-center justify-around px-4 py-3 text-xs">
        <Link href="/dashboard" className="text-muted-foreground transition hover:text-primary">
          Dashboard
        </Link>
        <Link href="/envelope-summary" className="text-muted-foreground transition hover:text-primary">
          Summary
        </Link>
        <Link href="/envelopes" className="text-primary font-semibold">
          Envelopes
        </Link>
        <Link href="/envelope-planning" className="text-muted-foreground transition hover:text-primary">
          Planner
        </Link>
      </div>
    </nav>
  );
}

function buildTransferSuggestions(envelopes: SummaryEnvelope[]): TransferSuggestion[] {
  if (!envelopes.length) return [];
  const today = new Date();
  const deficits = envelopes
    .map((envelope) => {
      const target = Number(envelope.target_amount ?? 0);
      const current = Number(envelope.current_amount ?? 0);
      const deficit = Math.max(0, target - current);
      if (deficit <= 1) return null;
      const dueDate = envelope.next_payment_due ?? envelope.due_date ?? null;
      let daysUntil = Number.POSITIVE_INFINITY;
      if (dueDate) {
        const parsed = new Date(dueDate);
        if (!Number.isNaN(parsed.getTime())) {
          daysUntil = Math.max(0, differenceInCalendarDays(parsed, today));
        }
      }
      const dueInfo = calculateDueProgress(dueDate);
      return {
        envelope,
        deficit,
        dueLabel: dueInfo.label,
        daysUntil,
      };
    })
    .filter(Boolean) as Array<{ envelope: SummaryEnvelope; deficit: number; dueLabel: string; daysUntil: number }>;

  const surplus = envelopes
    .map((envelope) => {
      const target = Number(envelope.target_amount ?? 0);
      const current = Number(envelope.current_amount ?? 0);
      const extra = Math.max(0, current - target);
      if (extra <= 1) return null;
      return { envelope, surplus: extra };
    })
    .filter(Boolean) as Array<{ envelope: SummaryEnvelope; surplus: number }>;

  if (!deficits.length || !surplus.length) return [];

  deficits.sort((a, b) => {
    if (a.daysUntil === b.daysUntil) {
      return b.deficit - a.deficit;
    }
    return a.daysUntil - b.daysUntil;
  });
  surplus.sort((a, b) => b.surplus - a.surplus);

  const remaining = new Map<string, number>();
  surplus.forEach((entry) => remaining.set(entry.envelope.id, entry.surplus));

  const results: TransferSuggestion[] = [];

  for (const deficit of deficits) {
    let outstanding = deficit.deficit;
    for (const source of surplus) {
      if (source.envelope.id === deficit.envelope.id) continue;
      const available = remaining.get(source.envelope.id) ?? 0;
      if (available <= 0.5) continue;
      const amount = Math.min(outstanding, available);
      if (amount <= 0.5) continue;
      results.push({
        key: `${source.envelope.id}-${deficit.envelope.id}-${results.length}`,
        from: source.envelope,
        to: deficit.envelope,
        amount: Number(amount.toFixed(2)),
        deficit: Number(deficit.deficit.toFixed(2)),
        dueLabel: deficit.dueLabel,
        daysUntil: deficit.daysUntil,
      });
      remaining.set(source.envelope.id, available - amount);
      outstanding -= amount;
      if (results.length >= 5) {
        return results;
      }
      if (outstanding <= 0.5) {
        break;
      }
    }
  }

  return results;
}
