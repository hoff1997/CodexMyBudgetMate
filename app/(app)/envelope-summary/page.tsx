import { createClient } from "@/lib/supabase/server";
import type { SummaryEnvelope } from "@/components/layout/envelopes/envelope-summary-card";
import { EnvelopeSummaryClient, type CreditCardDebtData } from "@/components/layout/envelopes/envelope-summary-client";
import { mapTransferHistory, type RawTransferRow } from "@/lib/types/envelopes";
import { getPayPlanSummary } from "@/lib/server/pay-plan";

// Force dynamic rendering and disable caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function EnvelopeSummaryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <EnvelopeSummaryClient
        list={[]}
        totals={{ target: 0, current: 0 }}
        transferHistory={[]}
        celebrations={[]}
        payPlan={null}
        categories={[]}
      />
    );
  }

  const { data: envelopes } = await supabase
    .from("envelopes")
    .select(
      "id, name, target_amount, current_amount, due_date, frequency, next_payment_due, notes, pay_cycle_amount, opening_balance, category_id, icon, sort_order, is_spending, priority, is_suggested, suggestion_type, is_dismissed, description, snoozed_until",
    )
    .eq("user_id", user.id)
    .or("is_goal.is.null,is_goal.eq.false") // Exclude goals
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  const { data: categories } = await supabase
    .from("envelope_categories")
    .select("id, name")
    .eq("user_id", user.id)
    .order("name", { ascending: true });

  // Fetch income sources for pay schedule calculation
  const { data: incomeSources } = await supabase
    .from("income_sources")
    .select("id, name, next_pay_date, pay_cycle, is_active")
    .eq("user_id", user.id)
    .eq("is_active", true);

  // Fetch credit card debt data for CC Holding progress display
  // Get current CC debt from accounts
  const { data: ccAccounts } = await supabase
    .from("accounts")
    .select("id, name, current_balance, type")
    .eq("user_id", user.id)
    .eq("type", "debt");

  // Get debt snowball plan for starting debt information
  const { data: debtPlan } = await supabase
    .from("debt_snowball_plan")
    .select("debts, phase")
    .eq("user_id", user.id)
    .maybeSingle();

  // Calculate total current CC debt (balances are negative for debt)
  const currentCCDebt = (ccAccounts ?? []).reduce((sum, acc) => {
    const balance = Number(acc.current_balance ?? 0);
    // Only count negative balances as debt
    return sum + (balance < 0 ? Math.abs(balance) : 0);
  }, 0);

  // Calculate starting debt from snowball plan
  const startingCCDebt = debtPlan?.debts
    ? (debtPlan.debts as Array<{ balance: number }>).reduce((sum, d) => sum + (d.balance ?? 0), 0)
    : currentCCDebt; // Fallback to current if no plan exists

  // Find the smallest debt (active target for snowball method)
  const activeDebtAccount = (ccAccounts ?? [])
    .filter(acc => {
      const balance = Number(acc.current_balance ?? 0);
      return balance < 0; // Negative = debt
    })
    .sort((a, b) => Math.abs(Number(a.current_balance)) - Math.abs(Number(b.current_balance)))[0];

  const creditCardDebtData: CreditCardDebtData = {
    currentDebt: currentCCDebt,
    startingDebt: startingCCDebt,
    phase: debtPlan?.phase ?? 'starter_stash',
    hasDebt: currentCCDebt > 0,
    activeDebt: activeDebtAccount ? {
      name: activeDebtAccount.name,
      balance: Math.abs(Number(activeDebtAccount.current_balance)),
    } : null,
  };

  const { data: transfers } = await supabase
    .from("envelope_transfers")
    .select(
      "id, amount, note, created_at, from_envelope:from_envelope_id(id, name), to_envelope:to_envelope_id(id, name)",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  let celebrationRows: Array<{
    id: string;
    title: string;
    description: string | null;
    achieved_at: string;
  }> = [];

  if (user) {
    const { data: celebrationData } = await supabase
      .from("zero_budget_celebrations")
      .select("id, title, description, achieved_at")
      .eq("user_id", user.id)
      .order("achieved_at", { ascending: false })
      .limit(20);

    celebrationRows = celebrationData ?? [];
  } else {
    celebrationRows = [
      {
        id: crypto.randomUUID(),
        title: "Emergency fund milestone",
        description: "Demo celebration while exploring My Budget Mate.",
        achieved_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
      },
    ];
  }

  const categoryLookup = new Map<string, string>();
  (categories ?? []).forEach((category) => {
    categoryLookup.set(category.id, category.name);
  });

  const list: SummaryEnvelope[] = (envelopes ?? []).map((envelope, index) => {
    const sortOrder =
      typeof envelope.sort_order === "number"
        ? envelope.sort_order
        : Number(envelope.sort_order ?? index);
    return {
      ...envelope,
      category_name: envelope.category_id ? categoryLookup.get(envelope.category_id) ?? null : null,
      sort_order: sortOrder,
      is_spending: envelope.is_spending ?? false,
      priority: (envelope as any).priority ?? 'discretionary',
      is_suggested: (envelope as any).is_suggested ?? false,
      suggestion_type: (envelope as any).suggestion_type ?? null,
      is_dismissed: (envelope as any).is_dismissed ?? false,
      description: (envelope as any).description ?? null,
      snoozed_until: (envelope as any).snoozed_until ?? null,
    };
  });

  const totals = list.reduce(
    (acc, envelope) => {
      acc.target += Number(envelope.target_amount ?? 0);
      acc.current += Number(envelope.current_amount ?? 0);
      return acc;
    },
    { target: 0, current: 0 },
  );

  const transferRows: RawTransferRow[] = (transfers ?? []).map((row: any) => ({
    ...row,
    from_envelope: Array.isArray(row.from_envelope) ? row.from_envelope[0] ?? null : row.from_envelope,
    to_envelope: Array.isArray(row.to_envelope) ? row.to_envelope[0] ?? null : row.to_envelope,
  }));

  const transferHistory = mapTransferHistory(transferRows);

  const celebrations = celebrationRows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    achievedAt: row.achieved_at,
  }));

  const payPlan = await getPayPlanSummary(supabase, user?.id);

  return (
    <EnvelopeSummaryClient
      list={list}
      totals={totals}
      transferHistory={transferHistory}
      celebrations={celebrations}
      payPlan={payPlan}
      categories={(categories ?? []).map((category) => ({ id: category.id, name: category.name }))}
      incomeSources={(incomeSources ?? []).map((source) => ({
        id: source.id,
        name: source.name,
        nextPayDate: source.next_pay_date,
        frequency: source.pay_cycle,
        isActive: source.is_active,
      }))}
      creditCardDebt={creditCardDebtData}
    />
  );
}
