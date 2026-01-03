"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import HelpTooltip from "@/components/ui/help-tooltip";
import { RemyHelpPanel } from "@/components/coaching/RemyHelpPanel";
import { PRIORITY_CONFIG, type SummaryEnvelope, type PriorityLevel } from "@/components/layout/envelopes/envelope-summary-card";
import { EnvelopeCategoryGroup, CATEGORY_ICONS } from "@/components/layout/envelopes/envelope-category-group";
import { EnvelopeTransferDialog } from "@/components/layout/envelopes/envelope-transfer-dialog";
import { formatCurrency } from "@/lib/finance";
import { cn } from "@/lib/cn";
import { toast } from "sonner";
import { Target, Wallet, TrendingDown, Printer, ChevronDown, ChevronRight, AlarmClock, RotateCw, Lock, CheckCircle2, Circle, Bell, X, Clock, Plus } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { TransferHistoryItem } from "@/lib/types/envelopes";
import type { PayPlanSummary } from "@/lib/types/pay-plan";
import { getPrimaryPaySchedule, type PaySchedule } from "@/lib/utils/pays-until-due";
import { EnvelopeSummaryPrintView } from "@/components/layout/envelopes/envelope-summary-print-view";
import { MyBudgetWayWidget, type MilestoneProgress as WidgetMilestoneProgress } from "@/components/my-budget-way";
import { EnvelopeFilterTabs, type StatusFilter as SharedStatusFilter } from "@/components/shared/envelope-filter-tabs";

// Income source type for pay schedule calculation
interface IncomeSourceForSchedule {
  id: string;
  name: string;
  nextPayDate?: string | null;
  frequency?: string | null;
  isActive?: boolean;
}

// Credit card debt data for CC Holding progress display
export interface CreditCardDebtData {
  currentDebt: number;
  startingDebt: number;
  phase: string;
  hasDebt: boolean;
  // Active debt being attacked (smallest first - snowball method)
  activeDebt?: {
    name: string;
    balance: number;
  } | null;
}

// FILTERS constant removed - now using shared EnvelopeFilterTabs component

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

// Use SharedStatusFilter from the shared component for consistency
type StatusFilter = SharedStatusFilter;

type CategoryOption = { id: string; name: string; sortOrder?: number; icon?: string };

export function EnvelopeSummaryClient({
  list,
  totals,
  transferHistory,
  celebrations,
  payPlan,
  categories: categoryOptions = [],
  incomeSources = [],
  creditCardDebt,
}: {
  list: SummaryEnvelope[];
  totals: { target: number; current: number };
  transferHistory: TransferHistoryItem[];
  celebrations: Array<{ id: string; title: string; description: string | null; achievedAt: string }>;
  payPlan?: PayPlanSummary | null;
  categories?: CategoryOption[];
  incomeSources?: IncomeSourceForSchedule[];
  creditCardDebt?: CreditCardDebtData;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [orderedEnvelopes, setOrderedEnvelopes] = useState<SummaryEnvelope[]>([]);
  const [transferOpen, setTransferOpen] = useState(false);
  // Status filter with URL persistence
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(() => {
    const urlFilter = searchParams.get('filter');
    if (urlFilter && ['all', 'healthy', 'attention', 'surplus', 'no-target', 'spending', 'tracking'].includes(urlFilter)) {
      return urlFilter as StatusFilter;
    }
    return 'all';
  });
  const [collapseAll, setCollapseAll] = useState(false);
  const [myBudgetWayExpanded, setMyBudgetWayExpanded] = useState(true);

  // Handle filter change with URL persistence
  const handleFilterChange = useCallback((filter: StatusFilter) => {
    setStatusFilter(filter);

    // Update URL params
    const params = new URLSearchParams(searchParams.toString());
    if (filter !== 'all') {
      params.set('filter', filter);
    } else {
      params.delete('filter');
    }
    const newUrl = params.toString() ? `?${params.toString()}` : '/envelope-summary';
    router.replace(newUrl, { scroll: false });
  }, [searchParams, router]);

  // Handle ?action=transfer query param from dashboard quick actions
  useEffect(() => {
    if (searchParams.get("action") === "transfer") {
      setTransferOpen(true);
      // Clear the query param after opening
      router.replace("/envelope-summary", { scroll: false });
    }
  }, [searchParams, router]);

  // Handle envelope click by navigating to envelope detail page
  const handleEnvelopeClick = useCallback((envelope: SummaryEnvelope) => {
    router.push(`/envelopes/${envelope.id}`);
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

  // Get suggested envelopes (The My Budget Way) - sorted by type
  const suggestedEnvelopes = useMemo(() => {
    const now = new Date();
    const SUGGESTION_ORDER: Record<string, number> = {
      'starter-stash': 0,
      'safety-net': 1,
      'cc-holding': 2,
    };
    return list
      .filter(e => {
        if (!e.is_suggested || e.is_dismissed) return false;
        if (e.snoozed_until && new Date(e.snoozed_until) > now) return false;
        return true;
      })
      .sort((a, b) => {
        const orderA = SUGGESTION_ORDER[a.suggestion_type || ''] ?? 99;
        const orderB = SUGGESTION_ORDER[b.suggestion_type || ''] ?? 99;
        return orderA - orderB;
      });
  }, [list]);

  // Get hidden suggested envelopes (snoozed or dismissed) for restore button
  const hiddenSuggestedEnvelopes = useMemo(() => {
    const now = new Date();
    return list.filter(e => {
      if (!e.is_suggested) return false;
      if (e.is_dismissed) return true;
      if (e.snoozed_until && new Date(e.snoozed_until) > now) return true;
      return false;
    });
  }, [list]);

  // Check if Starter Stash is complete ($1,000 funded)
  // Used to show lock icons on Safety Net and CC Holding
  const starterStashComplete = useMemo(() => {
    const starterStash = suggestedEnvelopes.find(e => e.suggestion_type === 'starter-stash');
    if (!starterStash) return false;
    const current = Number(starterStash.current_amount ?? 0);
    const target = Number(starterStash.target_amount ?? 1000);
    return current >= target;
  }, [suggestedEnvelopes]);

  // Calculate milestone progress for the summary widget
  const milestoneProgress = useMemo(() => {
    // Filter out suggested envelopes for milestone calculation
    const regularEnvelopes = orderedEnvelopes.filter(e => !e.is_suggested);

    // Separate by priority
    const priority1 = regularEnvelopes.filter(e => e.priority === 'essential');
    const priority2 = regularEnvelopes.filter(e => e.priority === 'important');
    const extras = regularEnvelopes.filter(e => e.priority === 'discretionary' || !e.priority);

    // Calculate funding ratios for each group
    const calcGroupFunding = (envelopes: SummaryEnvelope[]) => {
      const totalTarget = envelopes.reduce((sum, e) => sum + Number(e.target_amount ?? 0), 0);
      const totalCurrent = envelopes.reduce((sum, e) => sum + Number(e.current_amount ?? 0), 0);
      if (totalTarget === 0) return 1; // No target means "complete"
      return Math.min(1, totalCurrent / totalTarget);
    };

    const p1Funded = calcGroupFunding(priority1);
    const p2Funded = calcGroupFunding(priority2);

    // My Budget Way progress (suggested envelopes)
    const myBudgetWayTarget = suggestedEnvelopes.reduce((sum, e) => sum + Number(e.target_amount ?? 0), 0);
    const myBudgetWayCurrent = suggestedEnvelopes.reduce((sum, e) => sum + Number(e.current_amount ?? 0), 0);
    const myBudgetWayFunded = myBudgetWayTarget > 0 ? Math.min(1, myBudgetWayCurrent / myBudgetWayTarget) : 1;

    const extrasFunded = calcGroupFunding(extras);

    // Overall progress (all envelopes including suggested)
    const allEnvelopes = [...regularEnvelopes, ...suggestedEnvelopes];
    const totalTarget = allEnvelopes.reduce((sum, e) => sum + Number(e.target_amount ?? 0), 0);
    const totalCurrent = allEnvelopes.reduce((sum, e) => sum + Number(e.current_amount ?? 0), 0);
    const overallProgress = totalTarget > 0 ? Math.min(100, (totalCurrent / totalTarget) * 100) : 100;

    // Define milestones with their thresholds
    const milestones = [
      {
        id: 'p1',
        label: 'Essentials Covered',
        threshold: 33,
        achieved: p1Funded >= 1,
        inProgress: p1Funded > 0 && p1Funded < 1,
        progress: p1Funded
      },
      {
        id: 'p2',
        label: 'Important Covered',
        threshold: 50,
        achieved: p1Funded >= 1 && p2Funded >= 1,
        inProgress: p1Funded >= 1 && p2Funded > 0 && p2Funded < 1,
        progress: p2Funded
      },
      {
        id: 'mbw',
        label: 'My Budget Way Complete',
        threshold: 65,
        achieved: myBudgetWayFunded >= 1,
        inProgress: myBudgetWayFunded > 0 && myBudgetWayFunded < 1,
        progress: myBudgetWayFunded
      },
      {
        id: 'extras',
        label: 'Extras Funded',
        threshold: 80,
        achieved: extrasFunded >= 1,
        inProgress: extrasFunded > 0 && extrasFunded < 1,
        progress: extrasFunded
      },
      {
        id: 'complete',
        label: 'Everything On Track',
        threshold: 100,
        achieved: overallProgress >= 100,
        inProgress: overallProgress >= 80 && overallProgress < 100,
        progress: overallProgress / 100
      },
    ];

    // Find next milestone (first non-achieved)
    const nextMilestone = milestones.find(m => !m.achieved);

    // Count funded envelopes (current >= target, with target > 0)
    const fundedCount = regularEnvelopes.filter(e => {
      const target = Number(e.target_amount ?? 0);
      const current = Number(e.current_amount ?? 0);
      return target > 0 && current >= target;
    }).length;
    const totalCount = regularEnvelopes.length;

    // Calculate show/hide logic for "Fill Your Envelopes" row
    // Check if any Priority 1 (Essential) envelopes are underfunded
    const essentialsUnderfunded = priority1.some(e => {
      const target = Number(e.target_amount ?? 0);
      const current = Number(e.current_amount ?? 0);
      return target > 0 && current < target;
    });

    // Count envelopes needing funding (for description)
    const needsFunding = regularEnvelopes.filter(e => {
      const target = Number(e.target_amount ?? 0);
      const current = Number(e.current_amount ?? 0);
      return target > 0 && current < target;
    }).length;

    // Determine if row should show
    // Show when: less than 95% funded OR any essentials underfunded
    const shouldShowEnvelopeRow =
      overallProgress < 95 ||      // Less than 95% funded overall
      essentialsUnderfunded;        // Any essentials need funding

    return {
      overallProgress,
      milestones,
      nextMilestone,
      totalTarget,
      totalCurrent,
      fundingGap: Math.max(0, totalTarget - totalCurrent),
      fundedCount,
      totalCount,
      // New fields for dynamic row visibility
      essentialsUnderfunded,
      needsFunding,
      shouldShowEnvelopeRow,
    };
  }, [orderedEnvelopes, suggestedEnvelopes]);

  // Check if CC Holding is locked (has debt to pay off)
  const isCCHoldingLocked = useMemo(() => {
    return creditCardDebt?.hasDebt ?? false;
  }, [creditCardDebt]);

  // Check if an envelope should show as locked (not yet unlocked in progression)
  // CRITICAL: Safety Net and CC Holding are BOTH locked until ALL DEBT = $0
  const isEnvelopeLocked = useCallback((suggestionType: string | null | undefined): boolean => {
    if (!suggestionType) return false;
    // Starter Stash is NEVER locked
    if (suggestionType === 'starter-stash') return false;
    // Safety Net is locked until ALL DEBT = $0 (not just Starter Stash!)
    if (suggestionType === 'safety-net') {
      return creditCardDebt?.hasDebt ?? false;
    }
    // CC Holding is locked until ALL DEBT = $0
    if (suggestionType === 'cc-holding') {
      return creditCardDebt?.hasDebt ?? false;
    }
    return false;
  }, [creditCardDebt?.hasDebt]);

  // Handle snoozing a suggested envelope
  const handleSnoozeSuggested = useCallback(async (envelopeId: string, days: number) => {
    try {
      const response = await fetch('/api/envelopes/suggested/snooze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ envelopeId, days }),
      });

      if (!response.ok) {
        throw new Error('Failed to snooze envelope');
      }

      toast.success(`Snoozed for ${days} days`);
      router.refresh();
    } catch (error) {
      console.error('Error snoozing suggested envelope:', error);
      toast.error('Failed to snooze');
    }
  }, [router]);

  // Handle restoring all hidden (snoozed or dismissed) suggested envelopes
  const handleRestoreAllHidden = useCallback(async () => {
    try {
      await Promise.all(
        hiddenSuggestedEnvelopes.map(async env => {
          if (env.snoozed_until) {
            await fetch('/api/envelopes/suggested/snooze', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ envelopeId: env.id }),
            });
          }
          if (env.is_dismissed) {
            await fetch('/api/envelopes/suggested/dismiss', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ envelopeId: env.id, dismiss: false }),
            });
          }
        })
      );

      toast.success('Restored all goals');
      router.refresh();
    } catch (error) {
      console.error('Error restoring hidden envelopes:', error);
      toast.error('Failed to restore');
    }
  }, [hiddenSuggestedEnvelopes, router]);

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

  // Ref for debounced reorder timeout
  const reorderTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingReorderRef = useRef<SummaryEnvelope[] | null>(null);

  const persistOrder = useCallback(async (envelopes: SummaryEnvelope[]) => {
    // Store the latest order to persist
    pendingReorderRef.current = envelopes;

    // Clear any existing timeout
    if (reorderTimeoutRef.current) {
      clearTimeout(reorderTimeoutRef.current);
    }

    // Debounce: wait 1000ms before persisting to avoid multiple API calls during rapid reordering
    reorderTimeoutRef.current = setTimeout(async () => {
      const orderToPersist = pendingReorderRef.current;
      if (!orderToPersist) return;

      try {
        await Promise.all(
          orderToPersist.map((envelope, index) =>
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
      pendingReorderRef.current = null;
    }, 1000);
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

      {/* Page Header */}
      <div className="flex items-center justify-between no-print">
        <h1 className="text-2xl font-bold text-text-dark">Envelope Summary</h1>
        <div className="flex items-center gap-3">
          <RemyHelpPanel pageId="envelope-summary" />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => router.push("/budgetallocation?openCreateEnvelope=true")}
              className="bg-sage hover:bg-sage-dark text-white gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Add Envelope
            </Button>
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
              <Link href="/budgetallocation">Budget Allocation</Link>
            </Button>
          </div>
        </div>
      </div>
      <div className="space-y-3 no-print">
        <div className="space-y-3">
          {/* THE MY BUDGET WAY - Using new reusable widget */}
          <MyBudgetWayWidget
            mode="status"
            suggestedEnvelopes={suggestedEnvelopes}
            creditCardDebt={creditCardDebt}
            milestoneProgress={milestoneProgress as WidgetMilestoneProgress}
            hiddenCount={hiddenSuggestedEnvelopes.length}
            onSnooze={handleSnoozeSuggested}
            onRestoreHidden={handleRestoreAllHidden}
            onEnvelopeClick={(envelope) => router.push(`/envelopes/${envelope.id}`)}
            defaultExpanded={myBudgetWayExpanded}
          />

          <div className="flex flex-wrap items-center justify-between gap-2 md:gap-3">
            {/* Use shared EnvelopeFilterTabs component */}
            <EnvelopeFilterTabs
              activeFilter={statusFilter}
              onFilterChange={handleFilterChange}
              envelopeCounts={statusCounts}
            />
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
            <MobileEnvelopeList envelopes={filteredEnvelopes} onSelect={handleEnvelopeClick} />
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
                    onSelectEnvelope={handleEnvelopeClick}
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

interface Milestone {
  id: string;
  label: string;
  threshold: number;
  achieved: boolean;
  inProgress: boolean;
  progress: number;
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

