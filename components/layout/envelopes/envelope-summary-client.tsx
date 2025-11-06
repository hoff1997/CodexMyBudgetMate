"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import type { SummaryEnvelope } from "@/components/layout/envelopes/envelope-summary-card";
import { EnvelopeCategoryGroup } from "@/components/layout/envelopes/envelope-category-group";
import { EnvelopeEditSheet } from "@/components/layout/envelopes/envelope-edit-sheet";
import { EnvelopeCreateDialog } from "@/components/layout/envelopes/envelope-create-dialog";
import { ZeroBudgetManager } from "@/app/(app)/envelope-summary/zero-budget-manager";
import { formatCurrency } from "@/lib/finance";
import { cn } from "@/lib/cn";
import { toast } from "sonner";
import type { TransferHistoryItem } from "@/lib/types/envelopes";
import type { PayPlanSummary } from "@/lib/types/pay-plan";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "healthy", label: "On track" },
  { key: "attention", label: "Needs attention" },
  { key: "surplus", label: "Surplus" },
  { key: "no-target", label: "No target" },
  { key: "spending", label: "Spending" },
] as const;

type StatusFilter = (typeof FILTERS)[number]["key"];

type CategoryOption = { id: string; name: string };

export function EnvelopeSummaryClient({
  list,
  totals,
  transferHistory,
  defaultTab,
  celebrations,
  payPlan,
  categories: categoryOptions = [],
}: {
  list: SummaryEnvelope[];
  totals: { target: number; current: number };
  transferHistory: TransferHistoryItem[];
  defaultTab?: string;
  celebrations: Array<{ id: string; title: string; description: string | null; achievedAt: string }>;
  payPlan?: PayPlanSummary | null;
  categories?: CategoryOption[];
}) {
  const router = useRouter();
  const [orderedEnvelopes, setOrderedEnvelopes] = useState<SummaryEnvelope[]>([]);
  const [selectedEnvelope, setSelectedEnvelope] = useState<SummaryEnvelope | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [collapseAll, setCollapseAll] = useState(false);

  const payPlanMap = useMemo(() => {
    if (!payPlan) return new Map<string, { perPay: number; annual: number }>();
    return new Map(
      payPlan.envelopes.map((entry) => [
        entry.envelopeId,
        { perPay: entry.perPayAmount, annual: entry.annualAmount },
      ]),
    );
  }, [payPlan]);
  const planFrequency = payPlan?.primaryFrequency ?? null;

  useEffect(() => {
    const sorted = [...list]
      .sort((a, b) => {
        const orderA = a.sort_order ?? Number.MAX_SAFE_INTEGER;
        const orderB = b.sort_order ?? Number.MAX_SAFE_INTEGER;
        if (orderA !== orderB) return orderA - orderB;
        return a.name.localeCompare(b.name);
      })
      .map((envelope, index) => ({
        ...envelope,
        sort_order: index,
        is_spending: Boolean(envelope.is_spending),
      }));
    setOrderedEnvelopes(sorted);
  }, [list]);

  const statusCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = {
      all: orderedEnvelopes.length,
      healthy: 0,
      attention: 0,
      surplus: 0,
      "no-target": 0,
      spending: 0,
    };
    orderedEnvelopes.forEach((envelope) => {
      const bucket = getStatusBucket(envelope);
      counts[bucket] += 1;
    });
    return counts;
  }, [orderedEnvelopes]);

  const filteredEnvelopes = useMemo(() => {
    if (statusFilter === "all") return orderedEnvelopes;
    return orderedEnvelopes.filter((envelope) => getStatusBucket(envelope) === statusFilter);
  }, [orderedEnvelopes, statusFilter]);

  const groupedCategories = useMemo(() => {
    const map = new Map<string, { id: string; name: string; envelopes: SummaryEnvelope[] }>();

    filteredEnvelopes.forEach((envelope) => {
      const id = envelope.category_id ? String(envelope.category_id) : "uncategorised";
      const name = envelope.category_name ?? "Uncategorised";
      if (!map.has(id)) {
        map.set(id, { id, name, envelopes: [] });
      }
      map.get(id)!.envelopes.push(envelope);
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredEnvelopes]);

  const persistOrder = useCallback(async (envelopes: SummaryEnvelope[]) => {
    try {
      await Promise.all(
        envelopes.map((envelope, index) =>
          fetch(`/api/envelopes/${envelope.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sort_order: index }),
          }),
        ),
      );
      toast.success("Envelope order saved");
    } catch (error) {
      console.error(error);
      toast.info("Order updated locally. Connect the reorder API to persist.");
    }
  }, []);

  const handleReorder = useCallback(
    (categoryId: string, fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) return;
      setOrderedEnvelopes((prev) => {
        const next = [...prev];
        const matches = next
          .map((envelope, index) => ({ envelope, index }))
          .filter(({ envelope }) => {
            const key = envelope.category_id ? String(envelope.category_id) : "uncategorised";
            return key === categoryId;
          });

        const sourceEntry = matches[fromIndex];
        const targetEntry = matches[toIndex];
        if (!sourceEntry || !targetEntry) return prev;

        const [moved] = next.splice(sourceEntry.index, 1);
        next.splice(targetEntry.index, 0, moved);

        const remapped = next.map((envelope, index) => ({
          ...envelope,
          sort_order: index,
          is_spending: Boolean(envelope.is_spending),
        }));
        void persistOrder(remapped);
        return remapped;
      });
    },
    [persistOrder],
  );

  const defaultValue = defaultTab === "zero-budget" ? "zero-budget" : "summary";

  const selectedPlan = selectedEnvelope ? payPlanMap.get(selectedEnvelope.id) : undefined;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 pb-24 pt-12 md:px-10 md:pb-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-secondary">Envelope summary</h1>
        <p className="text-base text-muted-foreground">
          Snapshot of every envelope with progress markers so you can quickly see what needs topping
          up before the next payday. Switch tabs to access the full Zero Budget Manager from the
          Replit build.
        </p>
      </header>
      <Tabs defaultValue={defaultValue} className="space-y-6">
        <TabsList>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="zero-budget">Zero budget manager</TabsTrigger>
        </TabsList>
        <TabsContent value="summary" className="space-y-6">
          <div className="flex justify-center rounded-3xl border border-dashed border-primary/30 bg-primary/5 p-6">
            <Button
              type="button"
              className="gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold shadow-sm hover:bg-primary/90"
              onClick={() => setCreateOpen(true)}
            >
              <span className="text-lg">+</span>
              Add New Envelope
            </Button>
          </div>
          <section className="grid gap-4 md:grid-cols-3">
            <MetricCard
              title="Total target"
              value={formatCurrency(totals.target)}
              description={`Across ${orderedEnvelopes.length} envelopes`}
            />
            <MetricCard title="Current balance" value={formatCurrency(totals.current)} description="Inclusive of pending envelopes" />
            <MetricCard
              title="Funding gap"
              value={formatCurrency(Math.max(0, totals.target - totals.current))}
              description="What is still required to hit targets"
            />
          </section>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setStatusFilter(filter.key)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition",
                    statusFilter === filter.key
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-muted text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {filter.label}
                  <span className="ml-1 text-[10px] opacity-80">({statusCounts[filter.key]})</span>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setCollapseAll(false)}>
                Expand all
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCollapseAll(true)}>
                Collapse all
              </Button>
            </div>
          </div>

          <div className="space-y-4 md:hidden">
            <MobileEnvelopeList envelopes={filteredEnvelopes} onSelect={setSelectedEnvelope} />
          </div>
          <div className="hidden md:block">
            <div className="space-y-4">
              {groupedCategories.length ? (
                groupedCategories.map((category) => (
                  <EnvelopeCategoryGroup
                    key={category.id}
                    category={category}
                    collapsedAll={collapseAll}
                    onSelectEnvelope={setSelectedEnvelope}
                    onReorder={(from, to) => handleReorder(category.id, from, to)}
                  />
                ))
              ) : (
                <Card>
                  <CardContent className="p-8 text-center text-sm text-muted-foreground">
                    No envelopes match this filter yet. Try widening your filter or add a new envelope.
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
        <TabsContent value="zero-budget">
          <ZeroBudgetManager
            envelopes={orderedEnvelopes}
            transferHistory={transferHistory}
            celebrations={celebrations}
          />
        </TabsContent>
      </Tabs>

      <EnvelopeEditSheet
        envelope={selectedEnvelope}
        planPerPay={selectedPlan?.perPay}
        planAnnual={selectedPlan?.annual}
        planFrequency={planFrequency ?? undefined}
        categories={categoryOptions}
        onClose={() => setSelectedEnvelope(null)}
        onSave={async (updated) => {
          await fetch(`/api/envelopes/${updated.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: updated.name,
              target_amount: Number(updated.target_amount ?? 0),
              pay_cycle_amount: Number(updated.pay_cycle_amount ?? 0),
              frequency: updated.frequency,
              next_payment_due: updated.next_payment_due ?? updated.due_date,
              notes: updated.notes,
              is_spending: Boolean(updated.is_spending),
              category_id: updated.category_id ?? null,
              icon: updated.icon ?? null,
              opening_balance: Number(updated.opening_balance ?? 0),
            }),
          });
          router.refresh();
        }}
      />

      <EnvelopeCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        categories={categoryOptions}
        onCreated={() => {
          router.refresh();
        }}
      />

      <nav className="fixed inset-x-0 bottom-0 border-t bg-background/95 shadow-lg backdrop-blur md:hidden">
        <div className="flex items-center justify-around px-4 py-3 text-xs">
          <Link href="/dashboard" className="text-muted-foreground transition hover:text-primary">
            Dashboard
          </Link>
          <Link href="/reconcile" className="text-muted-foreground transition hover:text-primary">
            Reconcile
          </Link>
          <Link href="/envelope-summary" className="text-primary font-semibold">
            Envelopes
          </Link>
          <Link href="/envelope-planning" className="text-muted-foreground transition hover:text-primary">
            Planner
          </Link>
        </div>
      </nav>
    </div>
  );
}

function MobileEnvelopeList({
  envelopes,
  onSelect,
}: {
  envelopes: SummaryEnvelope[];
  onSelect: (envelope: SummaryEnvelope) => void;
}) {
  if (!envelopes.length) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          No envelopes match this filter yet. Try widening your filter or add a new envelope.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-muted/20">
      <h2 className="px-4 pt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Envelopes
      </h2>
      <ul className="divide-y divide-border">
        {envelopes.map((envelope) => {
          const current = Number(envelope.current_amount ?? 0);
          const target = Number(envelope.target_amount ?? 0);
          const status = getStatusBucket(envelope);
          const statusLabel = getStatusLabel(status);
          const ratio = target ? Math.min(100, Math.round((current / target) * 100)) : null;
          return (
            <li key={envelope.id}>
              <button
                type="button"
                onClick={() => onSelect(envelope)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-secondary">{envelope.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {envelope.category_name ?? "Uncategorised"} · {statusLabel}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-secondary">{formatCurrency(current)}</p>
                  {target ? (
                    <p className="text-xs text-muted-foreground">
                      {ratio}% of {formatCurrency(target)}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">No target</p>
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function MetricCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold text-secondary">{value}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function getStatusBucket(envelope: SummaryEnvelope): StatusFilter {
  if (envelope.is_spending) return "spending";
  const target = Number(envelope.target_amount ?? 0);
  if (!target) return "no-target";
  const ratio = Number(envelope.current_amount ?? 0) / target;
  if (ratio >= 1.05) return "surplus";
  if (ratio >= 0.8) return "healthy";
  return "attention";
}

function getStatusLabel(status: StatusFilter) {
  switch (status) {
    case "healthy":
      return "On track";
    case "attention":
      return "Needs attention";
    case "surplus":
      return "Surplus";
    case "no-target":
      return "No target";
    case "spending":
      return "Spending";
    default:
      return "All";
  }
}
