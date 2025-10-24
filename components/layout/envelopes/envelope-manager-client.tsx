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
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/finance";
import { PlannerFrequency, calculateDueProgress, frequencyOptions } from "@/lib/planner/calculations";
import { differenceInCalendarDays, format, isValid } from "date-fns";
import type { TransferHistoryItem } from "@/lib/types/envelopes";
import { Progress } from "@/components/ui/progress";
import * as Dialog from "@radix-ui/react-dialog";
import { Info } from "lucide-react";

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
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
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
  const categoryNameLookup = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((category) => map.set(String(category.id), category.name));
    return map;
  }, [categories]);

  const groupedEnvelopes = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        name: string;
        envelopes: SummaryEnvelope[];
      }
    >();

    filteredEnvelopes.forEach((envelope) => {
      const categoryId = String(envelope.category_id ?? "uncategorised");
      const name = envelope.category_name ?? categoryNameLookup.get(categoryId) ?? "Uncategorised";
      if (!map.has(categoryId)) {
        map.set(categoryId, { id: categoryId, name, envelopes: [] });
      }
      map.get(categoryId)!.envelopes.push(envelope);
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredEnvelopes, categoryNameLookup]);

  const handleToggleCategory = (categoryId: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const handleCollapseAll = () => {
    setCollapsedCategories(new Set(groupedEnvelopes.map((group) => group.id)));
  };

  const handleExpandAll = () => {
    setCollapsedCategories(new Set());
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 pb-24 pt-12 md:px-10 md:pb-12">
      <header className="space-y-2">
        <div className="flex items-start gap-3">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold text-secondary">Manage envelopes</h1>
            <p className="text-base text-muted-foreground">
              Create, edit, transfer, and monitor envelopes. Changes sync with the planner, dashboard,
              and recurring income tools.
            </p>
          </div>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="ml-auto h-9 w-9 shrink-0"
            onClick={() => setGuideOpen(true)}
            aria-label="Show envelope manager guide"
          >
            <Info className="h-4 w-4" />
          </Button>
        </div>
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

      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={handleExpandAll}>
          Expand all
        </Button>
        <Button variant="outline" size="sm" onClick={handleCollapseAll}>
          Collapse all
        </Button>
      </div>

      <div className="space-y-3">
        {groupedEnvelopes.length ? (
          groupedEnvelopes.map((group) => {
            const collapsed = collapsedCategories.has(group.id);
            return (
              <Card key={group.id} className="overflow-hidden">
                <CardHeader
                  className="cursor-pointer bg-muted/40 px-4 py-3 hover:bg-muted/60"
                  onClick={() => handleToggleCategory(group.id)}
                >
                  <CardTitle className="flex items-center justify-between text-sm font-semibold">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{collapsed ? "▶" : "▼"}</span>
                      <span>{group.name}</span>
                      <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                        {group.envelopes.length}
                      </Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                {!collapsed && (
                  <CardContent className="p-0">
                    {group.envelopes.map((envelope, index) => {
                      const badge = getStatusBadgeProps(envelope);
                      const progress = getProgress(envelope);
                      const dueDetails = getDueDetails(envelope);
                      const requiredPerPay = calculateRequiredPerPay(envelope);
                      const requiredLabel =
                        requiredPerPay > 0
                          ? `${formatCurrency(requiredPerPay)} / ${formatFrequency(
                              (envelope.frequency as PlannerFrequency) ?? "monthly",
                            )}`
                          : dueDetails?.status === "overdue"
                          ? "Overdue"
                          : "Ready";

                      return (
                        <div
                          key={envelope.id}
                          className={`px-4 py-4 ${index > 0 ? "border-t border-border/40" : ""}`}
                        >
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div className="flex flex-1 items-start gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-lg">
                                {envelope.icon ?? "💼"}
                              </div>
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-sm font-semibold text-secondary">
                                    {envelope.name}
                                  </span>
                                  <Badge className={`text-[10px] ${badge.className}`}>{badge.text}</Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {envelope.category_name ?? "Uncategorised"}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col items-start gap-2 text-sm md:items-end">
                              <span className="font-semibold text-secondary">
                                {formatCurrency(Number(envelope.current_amount ?? 0))}
                              </span>
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
                            </div>
                          </div>

                          <div className="mt-4 space-y-2">
                            <Progress value={progress.value} indicatorClassName={progress.colour} />
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                              <span>
                                Target {formatCurrency(Number(envelope.target_amount ?? 0))}
                                {dueDetails?.formatted ? ` · Due ${dueDetails.formatted}` : ""}
                              </span>
                              <span className="font-medium text-blue-600">{requiredLabel}</span>
                            </div>
                            {dueDetails?.relative ? (
                              <p className="text-xs text-muted-foreground">{dueDetails.relative}</p>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                )}
              </Card>
            );
          })
        ) : (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              No envelopes match these filters. Try adjusting the category, status, or search term.
            </CardContent>
          </Card>
        )}
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

      <FeatureGuideDialog open={guideOpen} onOpenChange={setGuideOpen} />
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

function getStatusBadgeProps(envelope: SummaryEnvelope) {
  const due = envelope.next_payment_due ?? envelope.due_date ?? null;
  if (due) {
    const dueDate = new Date(due);
    if (!Number.isNaN(dueDate.getTime())) {
      const daysUntil = differenceInCalendarDays(dueDate, new Date());
      if (daysUntil <= 3 && daysUntil >= 0) {
        return { text: "Due soon", className: "bg-yellow-100 text-yellow-800 border-yellow-200" };
      }
    }
  }

  const status = getStatusBucket(envelope);
  switch (status) {
    case "surplus":
      return { text: "Surplus", className: "bg-purple-100 text-purple-800 border-purple-200" };
    case "healthy":
      return { text: "On track", className: "bg-green-100 text-green-800 border-green-200" };
    case "attention":
    default:
      return { text: "Needs attention", className: "bg-red-100 text-red-800 border-red-200" };
  }
}

function getProgress(envelope: SummaryEnvelope) {
  const current = Number(envelope.current_amount ?? 0);
  const target = Number(envelope.target_amount ?? 0);
  if (!target) {
    return { value: 0, colour: "bg-primary" };
  }
  const value = Math.min(100, Math.max(0, (current / target) * 100));
  const status = getStatusBucket(envelope);
  if (status === "surplus") {
    return { value, colour: "bg-sky-500" };
  }
  if (status === "healthy") {
    return { value, colour: "bg-emerald-500" };
  }
  return { value, colour: "bg-rose-500" };
}

function calculateRequiredPerPay(envelope: SummaryEnvelope) {
  const dueRaw = envelope.next_payment_due ?? envelope.due_date ?? null;
  if (!dueRaw) return 0;
  const dueDate = new Date(dueRaw);
  if (!isValid(dueDate)) return 0;

  const target = Number(envelope.target_amount ?? 0);
  const current = Number(envelope.current_amount ?? 0);
  const remaining = Math.max(0, target - current);
  if (remaining === 0) return 0;

  const today = new Date();
  const daysUntilDue = Math.max(1, differenceInCalendarDays(dueDate, today));
  const daysPerCycle = getDaysPerCycle((envelope.frequency as PlannerFrequency) ?? "fortnightly");
  const paysUntilDue = Math.max(1, Math.ceil(daysUntilDue / daysPerCycle));
  return remaining / paysUntilDue;
}

function getDaysPerCycle(frequency: PlannerFrequency) {
  switch (frequency) {
    case "weekly":
      return 7;
    case "fortnightly":
      return 14;
    case "monthly":
      return 30;
    case "quarterly":
      return 90;
    case "annually":
      return 365;
    case "none":
    default:
      return 30;
  }
}

function getDueDetails(envelope: SummaryEnvelope) {
  const dueRaw = envelope.next_payment_due ?? envelope.due_date ?? null;
  if (!dueRaw) return null;
  const dueDate = new Date(dueRaw);
  if (!isValid(dueDate)) return null;
  const daysUntil = differenceInCalendarDays(dueDate, new Date());
  let relative: string | undefined;
  let status: "overdue" | "upcoming" | undefined;
  if (daysUntil < 0) {
    relative = "Overdue";
    status = "overdue";
  } else if (daysUntil === 0) {
    relative = "Due today";
  } else if (daysUntil === 1) {
    relative = "Due tomorrow";
  } else {
    relative = `Due in ${daysUntil} days`;
  }
  return { formatted: format(dueDate, "dd/MM/yyyy"), relative, status };
}

function formatFrequency(frequency: PlannerFrequency) {
  const match = frequencyOptions.find((option) => option.value === frequency);
  return match ? match.label.toLowerCase() : "pay";
}

function FeatureGuideDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (value: boolean) => void }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="fixed inset-0 z-50 mx-auto flex max-w-3xl flex-col gap-4 overflow-y-auto rounded-3xl bg-background p-6 shadow-2xl md:top-12 md:h-[80vh]">
          <Dialog.Title className="text-xl font-semibold text-secondary">Envelope manager guide</Dialog.Title>
          <Dialog.Description className="text-sm text-muted-foreground">
            Review this checklist whenever features are redesigned so the planner remains feature-complete.
          </Dialog.Description>

          <div className="space-y-6 text-sm text-muted-foreground">
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-secondary uppercase tracking-wide">Navigation & filters</h2>
              <ul className="list-disc space-y-1 pl-4">
                <li>Status chips toggle All / On track / Needs attention / Surplus.</li>
                <li>Category filter supports All, Uncategorised, and individual categories.</li>
                <li>Search filters by envelope name.</li>
                <li>Buttons for Transfer funds and Open planner are present.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-secondary uppercase tracking-wide">Metrics & quick add</h2>
              <ul className="list-disc space-y-1 pl-4">
                <li>Total target, current balance, and funding gap metric cards render.</li>
                <li>Quick add form accepts name, category, target, per pay, frequency.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-secondary uppercase tracking-wide">Category groups</h2>
              <ul className="list-disc space-y-1 pl-4">
                <li>Envelopes are grouped by category with per-group collapse/expand.</li>
                <li>Global expand all / collapse all buttons function.</li>
                <li>Category headers show envelope counts.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-secondary uppercase tracking-wide">Envelope cards</h2>
              <ul className="list-disc space-y-1 pl-4">
                <li>Status badges cover On track, Surplus, Needs attention, Due soon (within 3 days).</li>
                <li>Progress bar reflects current vs target with colour-coded fill.</li>
                <li>Target amount, formatted due date, and relative due copy display.</li>
                <li>Required per pay amount shows when additional funding is needed.</li>
                <li>Per-envelope Edit and Transfer actions open their respective dialogs.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-secondary uppercase tracking-wide">Optimisation & history</h2>
              <ul className="list-disc space-y-1 pl-4">
                <li>Optimisation helper lists up to five suggested transfers.</li>
                <li>Transfers trigger history updates and refresh envelope balances.</li>
              </ul>
            </section>
          </div>

          <div className="flex justify-end gap-2">
            <Dialog.Close asChild>
              <Button variant="outline">Close</Button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
