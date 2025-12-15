"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import HelpTooltip from "@/components/ui/help-tooltip";
import { RemyHelpPanel } from "@/components/coaching/RemyHelpPanel";
import { PRIORITY_CONFIG, type SummaryEnvelope, type PriorityLevel } from "@/components/layout/envelopes/envelope-summary-card";
import { EnvelopeCategoryGroup, CATEGORY_ICONS } from "@/components/layout/envelopes/envelope-category-group";
import { EnvelopeCreateDialog } from "@/components/layout/envelopes/envelope-create-dialog";
import { EnvelopeTransferDialog } from "@/components/layout/envelopes/envelope-transfer-dialog";
import { CreditCardHoldingWidget } from "@/components/layout/credit-card/credit-card-holding-widget";
import { formatCurrency } from "@/lib/finance";
import { cn } from "@/lib/cn";
import { toast } from "sonner";
import { Target, Wallet, TrendingDown, Printer } from "lucide-react";
import type { TransferHistoryItem } from "@/lib/types/envelopes";
import type { PayPlanSummary } from "@/lib/types/pay-plan";
import { getPrimaryPaySchedule, type PaySchedule } from "@/lib/utils/pays-until-due";
import { EnvelopeSummaryPrintView } from "@/components/layout/envelopes/envelope-summary-print-view";

// Income source type for pay schedule calculation
interface IncomeSourceForSchedule {
  id: string;
  name: string;
  nextPayDate?: string | null;
  frequency?: string | null;
  isActive?: boolean;
}

const FILTERS = [
  { key: "all", label: "All" },
  { key: "healthy", label: "On track" },
  { key: "attention", label: "Needs attention" },
  { key: "surplus", label: "Surplus" },
  { key: "no-target", label: "No target" },
  { key: "spending", label: "Spending" },
  { key: "tracking", label: "Tracking" },
] as const;

// Auto-categorization function for envelopes without explicit categories
function guessCategory(envelopeName: string): { id: string; name: string; icon: string } {
  const name = envelopeName.toLowerCase();

  // Housing
  if (/rent|mortgage|home|house|property|rates|body corp|strata/i.test(name)) {
    return { id: 'housing', name: 'Housing', icon: '🏠' };
  }
  // Utilities
  if (/electric|gas|water|power|energy|internet|phone|mobile|telstra|optus|vodafone|nbn/i.test(name)) {
    return { id: 'utilities', name: 'Utilities', icon: '💡' };
  }
  // Transport
  if (/car|fuel|petrol|rego|registration|insurance|transport|uber|lyft|parking|toll/i.test(name)) {
    return { id: 'transport', name: 'Transport', icon: '🚗' };
  }
  // Food & Groceries
  if (/grocer|food|woolworth|coles|aldi|iga|dining|restaurant|takeaway|coffee/i.test(name)) {
    return { id: 'food', name: 'Food & Groceries', icon: '🍽️' };
  }
  // Healthcare
  if (/health|medical|doctor|dentist|pharmacy|medibank|bupa|hcf|nib/i.test(name)) {
    return { id: 'healthcare', name: 'Healthcare', icon: '🏥' };
  }
  // Insurance
  if (/insurance|life cover|income protection|tpd/i.test(name)) {
    return { id: 'insurance', name: 'Insurance', icon: '🛡️' };
  }
  // Subscriptions
  if (/netflix|spotify|disney|stan|amazon prime|subscription|youtube|apple music/i.test(name)) {
    return { id: 'subscriptions', name: 'Subscriptions', icon: '📱' };
  }
  // Savings
  if (/saving|emergency|rainy day|buffer|goal/i.test(name)) {
    return { id: 'savings', name: 'Savings', icon: '💰' };
  }
  // Debt
  if (/debt|loan|credit card|cc |afterpay|zip pay|klarna/i.test(name)) {
    return { id: 'debt', name: 'Debt', icon: '💳' };
  }
  // Personal
  if (/personal|clothing|haircut|gym|fitness|hobby/i.test(name)) {
    return { id: 'personal', name: 'Personal', icon: '👤' };
  }
  // Entertainment
  if (/entertainment|movie|game|fun|leisure|vacation|holiday|travel/i.test(name)) {
    return { id: 'entertainment', name: 'Entertainment', icon: '🎬' };
  }
  // Pets
  if (/pet|dog|cat|vet/i.test(name)) {
    return { id: 'pets', name: 'Pets', icon: '🐾' };
  }
  // Kids
  if (/kid|child|school|daycare|childcare/i.test(name)) {
    return { id: 'kids', name: 'Kids', icon: '👶' };
  }
  // Gifts
  if (/gift|birthday|christmas|present/i.test(name)) {
    return { id: 'gifts', name: 'Gifts', icon: '🎁' };
  }

  // Default to Uncategorised
  return { id: 'uncategorised', name: 'Uncategorised', icon: '📁' };
}

type StatusFilter = (typeof FILTERS)[number]["key"];

type CategoryOption = { id: string; name: string; sortOrder?: number; icon?: string };

export function EnvelopeSummaryClient({
  list,
  totals,
  transferHistory,
  celebrations,
  payPlan,
  categories: categoryOptions = [],
  incomeSources = [],
}: {
  list: SummaryEnvelope[];
  totals: { target: number; current: number };
  transferHistory: TransferHistoryItem[];
  celebrations: Array<{ id: string; title: string; description: string | null; achievedAt: string }>;
  payPlan?: PayPlanSummary | null;
  categories?: CategoryOption[];
  incomeSources?: IncomeSourceForSchedule[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [orderedEnvelopes, setOrderedEnvelopes] = useState<SummaryEnvelope[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [collapseAll, setCollapseAll] = useState(false);

  // Handle ?action=transfer query param from dashboard quick actions
  useEffect(() => {
    if (searchParams.get("action") === "transfer") {
      setTransferOpen(true);
      // Clear the query param after opening
      router.replace("/envelope-summary", { scroll: false });
    }
  }, [searchParams, router]);

  // Handle envelope edit by navigating to Budget Manager with deep link
  const handleEnvelopeEdit = useCallback((envelope: SummaryEnvelope) => {
    router.push(`/budget-manager?envelope=${envelope.id}`);
  }, [router]);

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

  // Compute pay schedule from income sources for "Due In" column
  const paySchedule = useMemo<PaySchedule | null>(() => {
    if (!incomeSources || incomeSources.length === 0) return null;
    return getPrimaryPaySchedule(
      incomeSources.map(s => ({
        nextPayDate: s.nextPayDate ?? undefined,
        frequency: s.frequency ?? undefined,
        isActive: s.isActive,
      }))
    );
  }, [incomeSources]);

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
      tracking: 0,
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

  // Group by category (Housing, Transport, etc.) with "Uncategorised" last
  // Uses guessCategory() to auto-categorize envelopes without explicit categories
  const groupedByCategory = useMemo(() => {
    const map = new Map<string, {
      id: string;
      name: string;
      icon: string;
      sortOrder: number;
      envelopes: SummaryEnvelope[]
    }>();

    // Define sort order for auto-generated categories
    const categoryOrder: Record<string, number> = {
      housing: 1,
      utilities: 2,
      transport: 3,
      food: 4,
      healthcare: 5,
      insurance: 6,
      subscriptions: 7,
      savings: 8,
      debt: 9,
      personal: 10,
      entertainment: 11,
      pets: 12,
      kids: 13,
      gifts: 14,
      uncategorised: 999,
    };

    filteredEnvelopes.forEach((envelope) => {
      // If envelope has explicit category, use it; otherwise guess from name
      let categoryId: string;
      let categoryName: string;
      let icon: string;

      if (envelope.category_id && envelope.category_name) {
        // Use explicit category from database
        categoryId = envelope.category_id;
        categoryName = envelope.category_name;
        const categoryOption = categoryOptions.find(c => c.id === categoryId);
        icon = categoryOption?.icon || CATEGORY_ICONS[categoryName.toLowerCase()] || '📁';
      } else {
        // Auto-categorize based on envelope name
        const guessed = guessCategory(envelope.name);
        categoryId = guessed.id;
        categoryName = guessed.name;
        icon = guessed.icon;
      }

      if (!map.has(categoryId)) {
        const categoryOption = categoryOptions.find(c => c.id === categoryId);
        map.set(categoryId, {
          id: categoryId,
          name: categoryName,
          icon,
          sortOrder: categoryOption?.sortOrder ?? categoryOrder[categoryId] ?? 50,
          envelopes: [],
        });
      }
      map.get(categoryId)!.envelopes.push(envelope);
    });

    // Sort by sortOrder, then by name, with Uncategorised last
    return Array.from(map.values())
      .filter(cat => cat.envelopes.length > 0)
      .sort((a, b) => {
        if (a.id === 'uncategorised') return 1;
        if (b.id === 'uncategorised') return -1;
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return a.name.localeCompare(b.name);
      });
  }, [filteredEnvelopes, categoryOptions]);

  const persistOrder = useCallback(async (envelopes: SummaryEnvelope[]) => {
    try {
      await Promise.all(
        envelopes.map((envelope, index) =>
          fetch(`/api/envelopes/${envelope.id}`, {
            method: "PATCH",
            credentials: "include",
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
            const envCategoryId = envelope.category_id || 'uncategorised';
            return envCategoryId === categoryId;
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

  return (
    <div className="flex w-full flex-col gap-3 px-4 pb-8 pt-4 sm:px-6 lg:px-8 md:pb-6 md:gap-4">
      {/* Ultra-compact print view - shows only when printing */}
      <EnvelopeSummaryPrintView envelopes={orderedEnvelopes} totals={totals} />

      <header className="space-y-1 no-print">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-secondary">Envelope summary</h1>
            <HelpTooltip
              title="Envelope Summary"
              content={[
                "Monitor envelope health and track progress toward your budget goals. View balances, identify envelopes needing attention, and manage transfers between envelopes."
              ]}
            />
          </div>
          <RemyHelpPanel pageId="envelope-summary" />
        </div>
        <p className="text-sm text-muted-foreground">
          Snapshot of every envelope with progress markers so you can quickly see what needs topping
          up before the next payday.
        </p>
      </header>
      <div className="space-y-3 no-print">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-secondary">Envelope Summary</h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="gap-1.5"
            >
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/budget-manager">Budget Manager</Link>
            </Button>
          </div>
        </div>
        <div className="space-y-3">
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <MetricCard
              title="Total target"
              value={formatCurrency(totals.target)}
              description={`Across ${orderedEnvelopes.length} envelopes`}
              icon={Target}
            />
            <MetricCard
              title="Current balance"
              value={formatCurrency(totals.current)}
              description="Inclusive of pending envelopes"
              icon={Wallet}
            />
            <MetricCard
              title="Funding gap"
              value={formatCurrency(Math.max(0, totals.target - totals.current))}
              description="What is still required to hit targets"
              icon={TrendingDown}
            />
          </section>

          {/* Full-width Credit Card Widget */}
          <CreditCardHoldingWidget horizontal />

          <div className="flex flex-wrap items-center justify-between gap-2 md:gap-3">
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setStatusFilter(filter.key)}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-xs font-medium transition",
                    statusFilter === filter.key
                      ? "bg-sage text-white"  // Style guide: sage for active state
                      : "bg-silver-very-light text-text-medium hover:bg-silver-light border border-silver-light",
                  )}
                >
                  {filter.label}
                  <span className="ml-1 text-[10px] opacity-80">({statusCounts[filter.key]})</span>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => setTransferOpen(true)}
                className="bg-sage hover:bg-sage-dark text-white"
              >
                Transfer Funds
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCollapseAll(false)}>
                Expand all
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCollapseAll(true)}>
                Collapse all
              </Button>
            </div>
          </div>

          <div className="space-y-2 md:hidden">
            <MobileEnvelopeList envelopes={filteredEnvelopes} onSelect={handleEnvelopeEdit} />
          </div>
          <div className="hidden md:block">
            <div className="space-y-3">
              {groupedByCategory.length ? (
                groupedByCategory.map((category) => (
                  <EnvelopeCategoryGroup
                    key={category.id}
                    category={category}
                    collapsedAll={collapseAll}
                    isDragDisabled={statusFilter !== "all"}
                    paySchedule={paySchedule}
                    onSelectEnvelope={handleEnvelopeEdit}
                    onReorder={(from, to) => handleReorder(category.id, from, to)}
                  />
                ))
              ) : (
                <Card>
                  <CardContent className="p-4 text-center text-sm text-muted-foreground">
                    No envelopes match this filter yet. Try widening your filter or add a new envelope.
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      <EnvelopeCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        categories={categoryOptions}
        onCreated={() => {
          router.refresh();
        }}
      />

      <EnvelopeTransferDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
        envelopes={orderedEnvelopes}
        history={transferHistory}
        onTransferComplete={() => {
          router.refresh();
        }}
      />

      <nav className="fixed inset-x-0 bottom-0 border-t bg-background/95 shadow-lg backdrop-blur md:hidden">
        <div className="flex items-center justify-around px-4 py-2.5 text-xs">
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
        <CardContent className="p-4 text-center text-sm text-muted-foreground">
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
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <span className={cn(
                      "h-2 w-2 rounded-full",
                      PRIORITY_CONFIG[envelope.priority ?? 'discretionary'].dotColor
                    )} />
                    {PRIORITY_CONFIG[envelope.priority ?? 'discretionary'].label} · {statusLabel}
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
  icon: Icon,
}: {
  title: string;
  value: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4" />}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-secondary">{value}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function getStatusBucket(envelope: SummaryEnvelope): StatusFilter {
  if (envelope.is_tracking_only) return "tracking";
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
    case "tracking":
      return "Tracking";
    default:
      return "All";
  }
}
