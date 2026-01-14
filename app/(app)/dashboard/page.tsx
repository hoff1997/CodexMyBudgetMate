import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "@/components/layout/dashboard-shell";
import { addDays, startOfMonth, endOfMonth } from "date-fns";
import { generateSuggestions, type SuggestionContext } from "@/lib/utils/smart-suggestion-generator";

type PageProps = {
  searchParams?: {
    demo?: string;
  };
};

export default async function DashboardPage({ searchParams }: PageProps) {
  const demoParam = searchParams?.demo;

  if (demoParam === "1") {
    redirect("/api/demo-mode/enter?redirect=/dashboard");
  }

  if (demoParam === "0") {
    redirect("/api/demo-mode/exit?redirect=/dashboard");
  }

  const cookieStore = cookies();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const authDisabled =
    process.env.NEXT_PUBLIC_AUTH_DISABLED === "true" || process.env.NODE_ENV !== "production";
  // Demo mode only if NO user exists
  const demoMode =
    !user && (cookieStore.get("demo-mode")?.value === "true" || authDisabled);

  if (!user && !authDisabled && !demoMode) {
    redirect("/login");
  }

  // Demo mode - return empty dashboard data
  if (!user && demoMode) {
    return (
      <DashboardShell
        profile={{ id: "demo-user", full_name: "Demo Budget Mate", avatar_url: null }}
        userId="demo-user"
        demoMode
        context={{
          envelopeCount: 0,
          transactionCount: 0,
          goalCount: 0,
          hasRecurringIncome: false,
          hasBankConnected: false,
          onboardingCompleted: false,
        }}
        dashboardData={{
          userName: "Demo User",
          accounts: [],
          envelopes: [],
          creditCards: [],
          incomeThisMonth: 0,
          nextPayday: null,
          allocationData: {
            creditCardHolding: 0,
            essentialEnvelopes: 0,
            importantEnvelopes: 0,
            extrasEnvelopes: 0,
            uncategorisedEnvelopes: 0,
            essentialCount: 0,
            importantCount: 0,
            extrasCount: 0,
            uncategorisedCount: 0,
          },
          onboardingCompleted: false,
        }}
      />
    );
  }

  const userId = user!.id;

  // Check if user has completed onboarding - if not, redirect to onboarding
  const { data: onboardingCheck } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", userId)
    .maybeSingle();

  if (!onboardingCheck?.onboarding_completed) {
    redirect("/onboarding");
  }

  const now = new Date();
  const monthStart = startOfMonth(now).toISOString();
  const monthEnd = endOfMonth(now).toISOString();

  // Fetch all data needed for the new dashboard
  const [
    { data: profile },
    { data: accounts },
    { data: envelopes },
    { data: creditCards },
    { data: recurringIncome },
    { data: incomeTransactions },
    { data: incomeSources },
    { data: incomeAllocations },
    { count: envelopeCount },
    { count: transactionCount },
    { count: goalCount },
    { count: bankConnectionCount },
    { count: pendingReconciliationCount },
  ] = await Promise.all([
    // Profile
    supabase
      .from("profiles")
      .select("id, full_name, avatar_url, user_persona, onboarding_completed")
      .eq("id", userId)
      .maybeSingle(),

    // All accounts (checking, savings, credit)
    supabase
      .from("accounts")
      .select("id, name, type, balance")
      .eq("user_id", userId),

    // All envelopes with full details + frequency for bill display
    supabase
      .from("envelopes")
      .select("id, name, icon, current_amount, target_amount, due_date, next_payment_due, priority, is_tracking_only, is_monitored, category_id, frequency, subtype")
      .eq("user_id", userId)
      .or("is_goal.is.null,is_goal.eq.false"),

    // Credit card accounts with cc_* fields
    supabase
      .from("accounts")
      .select("id, name, balance, cc_usage_type, cc_still_using, cc_starting_debt_amount, cc_payment_due_day")
      .eq("user_id", userId)
      .eq("type", "credit"),

    // Recurring income for next payday calculation
    supabase
      .from("recurring_income")
      .select("id, amount, frequency, next_payment_date")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("next_payment_date", { ascending: true })
      .limit(1),

    // Income transactions this month
    supabase
      .from("transactions")
      .select("amount")
      .eq("user_id", userId)
      .gte("occurred_at", monthStart)
      .lte("occurred_at", monthEnd)
      .gt("amount", 0),

    // Income sources for pay schedule calculation
    supabase
      .from("income_sources")
      .select("id, name, next_pay_date, pay_cycle, is_active, typical_amount")
      .eq("user_id", userId)
      .eq("is_active", true),

    // Envelope income allocations for calculating unallocated amount
    supabase
      .from("envelope_income_allocations")
      .select("allocation_amount")
      .eq("user_id", userId),

    // Counts for context
    supabase
      .from("envelopes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("goals")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("bank_connections")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),

    // Pending transactions for reconciliation alert
    supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "pending"),
  ]);

  // Calculate income this month
  const incomeThisMonth = (incomeTransactions ?? []).reduce(
    (sum, t) => sum + (t.amount || 0),
    0
  );

  // Get next payday from recurring income
  const nextPayday = recurringIncome?.[0]?.next_payment_date
    ? new Date(recurringIncome[0].next_payment_date)
    : null;

  // Get credit card holding envelopes
  const holdingEnvelopes = (envelopes ?? []).filter(
    (e) => e.name?.toLowerCase().includes("holding") || e.name?.toLowerCase().includes("credit card")
  );

  // Calculate allocation breakdown by priority
  const nonHoldingEnvelopes = (envelopes ?? []).filter(
    (e) => !e.name?.toLowerCase().includes("holding") && !e.name?.toLowerCase().includes("credit card")
  );

  const essentialEnvelopesList = nonHoldingEnvelopes.filter((e) => e.priority === "essential");
  const essentialEnvelopes = essentialEnvelopesList.reduce((sum, e) => sum + (e.current_amount || 0), 0);
  const essentialCount = essentialEnvelopesList.length;

  const importantEnvelopesList = nonHoldingEnvelopes.filter((e) => e.priority === "important");
  const importantEnvelopes = importantEnvelopesList.reduce((sum, e) => sum + (e.current_amount || 0), 0);
  const importantCount = importantEnvelopesList.length;

  const extrasEnvelopesList = nonHoldingEnvelopes.filter((e) => e.priority === "discretionary");
  const extrasEnvelopes = extrasEnvelopesList.reduce((sum, e) => sum + (e.current_amount || 0), 0);
  const extrasCount = extrasEnvelopesList.length;

  // Uncategorised = envelopes without a priority set
  const uncategorisedEnvelopesList = nonHoldingEnvelopes.filter((e) => !e.priority);
  const uncategorisedEnvelopes = uncategorisedEnvelopesList.reduce((sum, e) => sum + (e.current_amount || 0), 0);
  const uncategorisedCount = uncategorisedEnvelopesList.length;

  const creditCardHoldingAmount = holdingEnvelopes.reduce(
    (sum, e) => sum + (e.current_amount || 0),
    0
  );

  // Transform credit cards data
  const creditCardsData = (creditCards ?? []).map((card) => {
    // Find matching holding envelope
    const holdingEnvelope = holdingEnvelopes.find(
      (e) => e.name?.toLowerCase().includes(card.name?.toLowerCase() || "")
    );

    return {
      id: card.id,
      name: card.name,
      current_balance: card.balance || 0,
      cc_usage_type: (card.cc_usage_type || "pay_in_full") as "pay_in_full" | "paying_down" | "minimum_only",
      cc_still_using: card.cc_still_using ?? true,
      cc_starting_debt_amount: card.cc_starting_debt_amount || 0,
      payment_due_day: card.cc_payment_due_day || null,
      holding_envelope: holdingEnvelope ? {
        id: holdingEnvelope.id,
        name: holdingEnvelope.name,
        current_amount: holdingEnvelope.current_amount || 0,
      } : null,
    };
  });

  const showDemoCta = (envelopeCount ?? 0) === 0;

  // Calculate unallocated income for smart suggestions
  const totalIncome = (incomeSources ?? []).reduce(
    (sum, s) => sum + Number((s as any).typical_amount || 0),
    0
  );
  const totalAllocated = (incomeAllocations ?? []).reduce(
    (sum, a) => sum + Number(a.allocation_amount || 0),
    0
  );
  const unallocatedAmount = Math.max(0, totalIncome - totalAllocated);

  // Generate smart suggestions if there's unallocated income
  const suggestions = unallocatedAmount > 0
    ? generateSuggestions({
        envelopes: (envelopes ?? []).map(e => ({
          id: e.id,
          name: e.name,
          subtype: undefined,
          priority: e.priority || undefined,
          target_amount: e.target_amount,
          current_amount: e.current_amount,
        })),
        surplusAmount: unallocatedAmount,
        monthlyIncome: totalIncome,
        unallocatedIncome: unallocatedAmount,
      })
    : [];

  return (
    <DashboardShell
      profile={profile}
      userId={userId}
      demoMode={false}
      showDemoCta={showDemoCta}
      context={{
        envelopeCount: envelopeCount ?? 0,
        transactionCount: transactionCount ?? 0,
        goalCount: goalCount ?? 0,
        hasRecurringIncome: (recurringIncome?.length ?? 0) > 0,
        hasBankConnected: (bankConnectionCount ?? 0) > 0,
        onboardingCompleted: profile?.onboarding_completed ?? false,
      }}
      dashboardData={{
        userName: profile?.full_name?.split(" ")[0] || undefined,
        accounts: (accounts ?? []).map((a) => ({
          id: a.id,
          name: a.name,
          type: a.type,
          balance: a.balance || 0,
        })),
        envelopes: (envelopes ?? []).map((e) => ({
          id: e.id,
          name: e.name,
          icon: e.icon || undefined,
          current_amount: e.current_amount || 0,
          target_amount: e.target_amount || 0,
          // Use due_date if set, otherwise fallback to next_payment_due
          due_date: e.due_date || (e as any).next_payment_due || null,
          priority: e.priority || undefined,
          is_tracking_only: e.is_tracking_only || false,
          is_monitored: (e as any).is_monitored || false,
          category_id: e.category_id || undefined,
          frequency: (e as any).frequency || undefined,
          subtype: (e as any).subtype || undefined,
        })),
        creditCards: creditCardsData,
        incomeThisMonth,
        nextPayday,
        allocationData: {
          creditCardHolding: creditCardHoldingAmount,
          essentialEnvelopes,
          importantEnvelopes,
          extrasEnvelopes,
          uncategorisedEnvelopes,
          essentialCount,
          importantCount,
          extrasCount,
          uncategorisedCount,
        },
        onboardingCompleted: profile?.onboarding_completed ?? false,
        incomeSources: (incomeSources ?? []).map((s) => ({
          id: s.id,
          name: s.name,
          nextPayDate: s.next_pay_date,
          frequency: s.pay_cycle,
          isActive: s.is_active,
        })),
        suggestions,
        unallocatedAmount,
        pendingReconciliationCount: pendingReconciliationCount ?? 0,
      }}
    />
  );
}
