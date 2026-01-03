"use client";

/**
 * Dashboard V2 Client
 *
 * Main wrapper component for the rebuilt dashboard.
 * Receives server-fetched data and renders all sections.
 *
 * Layout:
 * 1. Header - greeting + key totals + Remy
 * 2. Quick Actions - action buttons row
 * 3. Envelope Status - full width health check
 * 4. Quick Glance + Upcoming Bills - side by side (50/50)
 * 5. Allocation Flow - full width breakdown
 */

import { useMemo, useState, useCallback, useRef } from "react";
import { DashboardSummaryHeader } from "./dashboard-summary-header";
import { EnvelopeStatusOverview, type EnvelopeStatusData } from "./envelope-status-overview";
import { UpcomingNeedsSection, type UpcomingBill } from "./upcoming-needs-section";
import { WaterfallPreview, type WaterfallData } from "./waterfall-preview";
import { QuickActionsV2 } from "./quick-actions-v2";
import { QuickGlanceWidget } from "./quick-glance-widget";
import { ReconciliationAlertWidget } from "./reconciliation-alert-widget";
import { SmartSuggestionsWidget } from "@/components/dashboard/smart-suggestions-widget";
import { CoachingWidget } from "@/components/coaching/coaching-widget";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";
import { RemyHelpPanel } from "@/components/coaching/RemyHelpPanel";
import { CelebrationRemindersWidget } from "./celebration-reminders-widget";
import type { SmartSuggestion } from "@/lib/utils/smart-suggestion-generator";

export interface DashboardV2Data {
  // User info
  userName?: string;

  // Accounts
  accounts: Array<{
    id: string;
    name: string;
    type: string;
    balance: number;
  }>;

  // Envelopes
  envelopes: Array<{
    id: string;
    name: string;
    icon?: string;
    current_amount: number;
    target_amount: number;
    due_date?: string | null;
    priority?: string;
    is_tracking_only?: boolean;
    is_monitored?: boolean;
    category_id?: string;
    frequency?: string;
    subtype?: string;
  }>;

  // Credit cards
  creditCards: Array<{
    id: string;
    name: string;
    current_balance: number;
    cc_usage_type: "pay_in_full" | "paying_down" | "minimum_only";
    cc_still_using: boolean;
    cc_starting_debt_amount: number;
    payment_due_day: number | null;
    holding_envelope?: {
      id: string;
      name: string;
      current_amount: number;
    } | null;
  }>;

  // Income sources for pay schedule
  incomeSources?: Array<{
    id: string;
    name: string;
    nextPayDate?: string | null;
    frequency?: string | null;
    isActive?: boolean;
  }>;

  // Income
  incomeThisMonth: number;
  nextPayday?: Date | null;

  // Allocation data - priority breakdown
  allocationData: {
    creditCardHolding: number;
    essentialEnvelopes: number;
    importantEnvelopes: number;
    extrasEnvelopes: number;
    uncategorisedEnvelopes: number;
    essentialCount: number;
    importantCount: number;
    extrasCount: number;
    uncategorisedCount: number;
  };

  // Flags
  onboardingCompleted: boolean;

  // Smart suggestions for unallocated income
  suggestions?: SmartSuggestion[];
  unallocatedAmount?: number;

  // Reconciliation
  pendingReconciliationCount?: number;
}

interface DashboardV2ClientProps {
  data: DashboardV2Data;
  demoMode?: boolean;
}

export function DashboardV2Client({
  data,
  demoMode = false,
}: DashboardV2ClientProps) {
  // Local envelope state for optimistic updates
  const [envelopeMonitorStates, setEnvelopeMonitorStates] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    data.envelopes.forEach((env) => {
      initial[env.id] = env.is_monitored ?? false;
    });
    return initial;
  });

  // Ref for debounced toggle - tracks pending toggles by envelope ID
  const toggleTimeoutRefs = useRef<Record<string, NodeJS.Timeout>>({});

  // Handle toggling monitored status with debounce
  const handleToggleMonitored = useCallback(async (envelopeId: string, isMonitored: boolean) => {
    // Optimistic update immediately
    setEnvelopeMonitorStates((prev) => ({
      ...prev,
      [envelopeId]: isMonitored,
    }));

    // Clear any existing timeout for this envelope
    if (toggleTimeoutRefs.current[envelopeId]) {
      clearTimeout(toggleTimeoutRefs.current[envelopeId]);
    }

    // Debounce: wait 500ms before persisting to avoid rapid toggle spam
    toggleTimeoutRefs.current[envelopeId] = setTimeout(async () => {
      try {
        const response = await fetch(`/api/envelopes/${envelopeId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_monitored: isMonitored }),
        });

        if (!response.ok) {
          // Revert on failure
          setEnvelopeMonitorStates((prev) => ({
            ...prev,
            [envelopeId]: !isMonitored,
          }));
        }
      } catch {
        // Revert on error
        setEnvelopeMonitorStates((prev) => ({
          ...prev,
          [envelopeId]: !isMonitored,
        }));
      }
      delete toggleTimeoutRefs.current[envelopeId];
    }, 500);
  }, []);

  // Envelopes with current monitored state
  const envelopesWithMonitorState = useMemo(() => {
    return data.envelopes.map((env) => ({
      ...env,
      is_monitored: envelopeMonitorStates[env.id] ?? env.is_monitored ?? false,
    }));
  }, [data.envelopes, envelopeMonitorStates]);

  // Calculate derived values
  const calculations = useMemo(() => {
    // Bank balance (checking + savings, not credit cards)
    const bankBalance = data.accounts
      .filter((acc) => acc.type !== "credit")
      .reduce((sum, acc) => sum + acc.balance, 0);

    // Envelope balance
    const envelopeBalance = data.envelopes.reduce(
      (sum, env) => sum + (env.current_amount || 0),
      0
    );

    // Total targets
    const totalTarget = data.envelopes.reduce(
      (sum, env) => sum + (env.target_amount || 0),
      0
    );

    // Credit card debt
    const creditCardDebt = data.creditCards.reduce(
      (sum, card) => sum + Math.abs(card.current_balance),
      0
    );

    // Holding balance
    const holdingBalance = data.creditCards.reduce(
      (sum, card) => sum + (card.holding_envelope?.current_amount || 0),
      0
    );

    // Unallocated - add back CC holding since it's not truly "allocated" yet
    const unallocated = bankBalance - envelopeBalance + holdingBalance;

    // Funding gap
    const fundingGap = Math.max(0, totalTarget - envelopeBalance);

    // Budget health status
    const healthyEnvelopes = data.envelopes.filter((env) => {
      if (!env.target_amount || env.target_amount <= 0) return true;
      return (env.current_amount / env.target_amount) >= 0.8;
    }).length;
    const healthRatio = data.envelopes.length > 0
      ? healthyEnvelopes / data.envelopes.length
      : 1;

    const budgetHealthStatus: "healthy" | "attention" | "critical" =
      healthRatio >= 0.7 ? "healthy" :
      healthRatio >= 0.4 ? "attention" : "critical";

    return {
      bankBalance,
      envelopeBalance,
      totalTarget,
      creditCardDebt,
      holdingBalance,
      unallocated,
      fundingGap,
      budgetHealthStatus,
    };
  }, [data]);

  // Envelope status data
  const envelopeStatusData: EnvelopeStatusData[] = data.envelopes.map((env) => ({
    id: env.id,
    name: env.name,
    current: env.current_amount || 0,
    target: env.target_amount || 0,
    isTracking: env.is_tracking_only,
  }));

  // Upcoming bills data - include frequency and priority
  const upcomingBills: UpcomingBill[] = data.envelopes
    .filter((env) => env.due_date)
    .map((env) => ({
      id: env.id,
      name: env.name,
      icon: env.icon,
      dueDate: new Date(env.due_date!),
      targetAmount: env.target_amount || 0,
      currentAmount: env.current_amount || 0,
      frequency: env.frequency,
      priority: env.priority,
    }));

  // Allocation distribution data with priority breakdown
  const allocationDistribution: WaterfallData = {
    totalIncome: data.incomeThisMonth,
    creditCardHolding: data.allocationData.creditCardHolding,
    essentialEnvelopes: data.allocationData.essentialEnvelopes,
    importantEnvelopes: data.allocationData.importantEnvelopes,
    extrasEnvelopes: data.allocationData.extrasEnvelopes,
    uncategorisedEnvelopes: data.allocationData.uncategorisedEnvelopes,
    essentialCount: data.allocationData.essentialCount,
    importantCount: data.allocationData.importantCount,
    extrasCount: data.allocationData.extrasCount,
    uncategorisedCount: data.allocationData.uncategorisedCount,
    remaining: calculations.unallocated,
  };

  // Calculate total allocated for coaching widget
  const totalAllocated = useMemo(() => {
    return (
      data.allocationData.creditCardHolding +
      data.allocationData.essentialEnvelopes +
      data.allocationData.importantEnvelopes +
      data.allocationData.extrasEnvelopes +
      data.allocationData.uncategorisedEnvelopes
    );
  }, [data.allocationData]);

  // Convert envelopes to coaching widget format
  const coachingEnvelopes = useMemo(() => {
    return data.envelopes.map((env) => ({
      id: env.id,
      name: env.name,
      icon: env.icon,
      priority: env.priority,
      targetAmount: env.target_amount,
      currentAmount: env.current_amount,
      is_tracking_only: env.is_tracking_only,
    }));
  }, [data.envelopes]);

  // Convert income sources for coaching widget
  const coachingIncomeSources = useMemo(() => {
    return (data.incomeSources || []).map((src) => ({
      id: src.id,
      name: src.name,
      amount: 0, // Dashboard doesn't have per-pay amounts
    }));
  }, [data.incomeSources]);

  // Empty state for new users
  if (!data.onboardingCompleted && data.envelopes.length === 0) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6 md:py-8">
        <Card className="bg-gradient-to-br from-sage-light/30 to-white border-sage/30">
          <CardContent className="p-8 text-center">
            <Sparkles className="h-12 w-12 mx-auto mb-4 text-sage" />
            <h2 className="text-2xl font-bold text-text-dark mb-2">
              Welcome to My Budget Mate
            </h2>
            <p className="text-text-medium mb-6 max-w-md mx-auto">
              Let&apos;s get your budget set up. We&apos;ll guide you through
              creating your first envelopes and organizing your finances.
            </p>
            <Button asChild size="lg" className="bg-sage hover:bg-sage/90">
              <Link href="/onboarding">
                Get Started <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6 md:py-8 space-y-6">
      {/* Demo Mode Banner */}
      {demoMode && (
        <Card className="bg-gold-light/30 border-gold/30">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-gold" />
              <span className="text-sm font-medium text-text-dark">
                You&apos;re viewing demo data
              </span>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/login">Sign Up to Save</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Celebration Reminders (shown when reminders are due) */}
      <CelebrationRemindersWidget />

      {/* Section 1: Summary Header with Remy Help */}
      <DashboardSummaryHeader
        userName={data.userName}
        availableBalance={calculations.bankBalance - calculations.holdingBalance}
        incomeThisMonth={data.incomeThisMonth}
        nextPayday={data.nextPayday}
        budgetHealthStatus={calculations.budgetHealthStatus}
        remyHelp={<RemyHelpPanel pageId="dashboard" />}
      />

      {/* Section 2: Quick Actions (full width) */}
      <QuickActionsV2 />

      {/* Section 2.5: Coaching Widget (Budget vs Envelope status) */}
      <CoachingWidget
        envelopes={coachingEnvelopes}
        incomeSources={coachingIncomeSources}
        currentPage="dashboard"
        totalAllocated={totalAllocated}
        totalIncome={data.incomeThisMonth}
      />

      {/* Section 3: Envelope Status (full width) */}
      <EnvelopeStatusOverview envelopes={envelopeStatusData} />

      {/* Reconciliation Alert - shows if there are pending items */}
      <ReconciliationAlertWidget pendingCount={data.pendingReconciliationCount ?? 0} />

      {/* Section 4: Quick Glance + Upcoming Bills side-by-side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Quick Glance */}
        <QuickGlanceWidget
          envelopes={envelopesWithMonitorState}
          onToggleMonitored={handleToggleMonitored}
          surplusAmount={calculations.unallocated > 0 ? calculations.unallocated : 0}
          ccHoldingAmount={calculations.holdingBalance}
        />

        {/* Right: Upcoming Bills */}
        <UpcomingNeedsSection bills={upcomingBills} incomeSources={data.incomeSources} />
      </div>

      {/* Section 5: Allocation Flow (full width) */}
      <WaterfallPreview data={allocationDistribution} />
    </div>
  );
}
