"use client";

/**
 * Dashboard V2 Client
 *
 * Main wrapper component for the rebuilt dashboard.
 * Receives server-fetched data and renders all sections.
 */

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { DashboardSummaryHeader } from "./dashboard-summary-header";
import { FinancialHealthSection, type FinancialHealthData } from "./financial-health-section";
import { EnvelopeStatusOverview, type EnvelopeStatusData } from "./envelope-status-overview";
import { CreditCardSection } from "./credit-card-section";
import { UpcomingNeedsSection, type UpcomingBill } from "./upcoming-needs-section";
import { WaterfallPreview, type WaterfallData } from "./waterfall-preview";
import { QuickActionsV2 } from "./quick-actions-v2";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";
import { RemyHelpPanel } from "@/components/coaching/RemyHelpPanel";

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
    category_id?: string;
    frequency?: string;
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

  // Allocation data
  allocationData: {
    creditCardHolding: number;
    priorityEnvelopes: number;
    flexibleEnvelopes: number;
  };

  // Flags
  onboardingCompleted: boolean;
}

interface DashboardV2ClientProps {
  data: DashboardV2Data;
  demoMode?: boolean;
}

export function DashboardV2Client({
  data,
  demoMode = false,
}: DashboardV2ClientProps) {
  const router = useRouter();

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

    // Unallocated
    const unallocated = bankBalance - envelopeBalance;

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

  // Financial health data for the 6-card section
  const financialHealthData: FinancialHealthData = {
    bankBalance: calculations.bankBalance,
    envelopeBalance: calculations.envelopeBalance,
    creditCardDebt: calculations.creditCardDebt,
    holdingBalance: calculations.holdingBalance,
    totalTarget: calculations.totalTarget,
    totalCurrent: calculations.envelopeBalance,
  };

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

  // Waterfall data
  const waterfallData: WaterfallData = {
    totalIncome: data.incomeThisMonth,
    creditCardHolding: data.allocationData.creditCardHolding,
    priorityEnvelopes: data.allocationData.priorityEnvelopes,
    flexibleEnvelopes: data.allocationData.flexibleEnvelopes,
    remaining: calculations.unallocated,
  };

  // Handle card clicks for navigation
  const handleCardClick = (cardId: string) => {
    switch (cardId) {
      case "bank-balance":
        router.push("/accounts");
        break;
      case "envelope-balance":
        router.push("/envelope-summary");
        break;
      case "credit-card-debt":
        router.push("/accounts");
        break;
      case "holding-balance":
        router.push("/envelope-summary");
        break;
      case "unallocated":
        router.push("/allocation");
        break;
      case "funding-gap":
        router.push("/envelope-planning");
        break;
    }
  };

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

      {/* Section 1: Summary Header with Remy Help */}
      <div className="relative">
        <div className="absolute top-2 right-2 z-10">
          <RemyHelpPanel pageId="dashboard" />
        </div>
        <DashboardSummaryHeader
          userName={data.userName}
          availableBalance={calculations.bankBalance}
          incomeThisMonth={data.incomeThisMonth}
          nextPayday={data.nextPayday}
          budgetHealthStatus={calculations.budgetHealthStatus}
        />
      </div>

      {/* Section 2: Quick Actions */}
      <QuickActionsV2 />

      {/* Section 3: Financial Health Cards (6-card grid) */}
      <FinancialHealthSection
        data={financialHealthData}
        onCardClick={handleCardClick}
      />

      {/* Section 4: Envelope Status (horizontal, full-width) */}
      <EnvelopeStatusOverview envelopes={envelopeStatusData} />

      {/* Section 5: Credit Cards */}
      {data.creditCards.length > 0 && (
        <CreditCardSection cards={data.creditCards} />
      )}

      {/* Section 6: Upcoming Bills */}
      <UpcomingNeedsSection bills={upcomingBills} incomeSources={data.incomeSources} />

      {/* Section 7: Waterfall Preview */}
      <WaterfallPreview data={waterfallData} />
    </div>
  );
}
