import { createClient } from "@/lib/supabase/server";
import { BudgetSummaryCards } from "@/components/layout/overview/budget-summary-cards";
import { RecentTransactions } from "@/components/layout/overview/recent-transactions";
import { AkahuConnect } from "@/components/layout/overview/akahu-connect";
import type { EnvelopeRow, TransactionRow } from "@/lib/auth/types";
import { IncomeExpenseOverview } from "@/components/layout/dashboard/income-expense-overview";
import {
  OverdueEnvelope,
  OverdueEnvelopesCard,
} from "@/components/layout/dashboard/overdue-envelopes-card";
import {
  CelebrationEvent,
  CelebrationTimeline,
} from "@/components/layout/dashboard/celebration-timeline";
import { differenceInCalendarDays } from "date-fns";
import { getEnvelopeStatus } from "@/lib/finance";

interface Props {
  userId: string;
  demoMode?: boolean;
}

const demoEnvelopes: EnvelopeRow[] = [
  {
    id: "demo-envelope-rent",
    name: "Rent",
    target_amount: 2200,
    current_amount: 1800,
    due_date: "2025-08-01",
    frequency: "Monthly",
  },
  {
    id: "demo-envelope-groceries",
    name: "Groceries",
    target_amount: 600,
    current_amount: 420,
    due_date: null,
    frequency: "Weekly",
  },
  {
    id: "demo-envelope-holiday",
    name: "Holiday fund",
    target_amount: 2000,
    current_amount: 950,
    due_date: "2025-12-10",
    frequency: "Fortnightly",
  },
];

const demoTransactions: TransactionRow[] = [
  {
    id: "demo-tx-1",
    merchant_name: "Countdown Ponsonby",
    amount: -142.5,
    occurred_at: new Date().toISOString(),
    envelope_name: "Groceries",
    account_name: "Everyday account",
  },
  {
    id: "demo-tx-2",
    merchant_name: "KiwiSaver Contribution",
    amount: -90,
    occurred_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    envelope_name: "Investments",
    account_name: "Savings booster",
  },
  {
    id: "demo-tx-3",
    merchant_name: "Rent payment",
    amount: -2200,
    occurred_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    envelope_name: "Rent",
    account_name: "Everyday account",
  },
];

export async function BudgetOverview({ userId, demoMode = false }: Props) {
  if (demoMode) {
    const demoIncome = 4500;
    const demoExpenses = 3820;
    const demoPending = 2;
    const overdue: OverdueEnvelope[] = demoEnvelopes
      .filter((env) => env.due_date)
      .map((env) => {
        const dueDate = new Date(env.due_date!);
        const dueInDays = differenceInCalendarDays(dueDate, new Date());
        const target = Number(env.target_amount ?? 0);
        const current = Number(env.current_amount ?? 0);
        return {
          id: env.id,
          name: env.name,
          targetAmount: target,
          currentAmount: current,
          dueDate,
          dueInDays,
          fundingGap: Math.max(0, target - current),
        };
      })
      .filter((env) => env.fundingGap > 0 && env.dueInDays <= 14);

    const celebrations: CelebrationEvent[] = demoEnvelopes
      .filter((env) => Number(env.current_amount ?? 0) >= Number(env.target_amount ?? 0))
      .map((env, index) => ({
        id: env.id,
        title: `${env.name} fully funded`,
        description: "Celebrating consistent contributions hitting the target.",
        achievedAt: new Date(Date.now() - index * 1000 * 60 * 60 * 24 * 7),
      }));

    return (
      <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <IncomeExpenseOverview
            incomeTotal={demoIncome}
            expenseTotal={demoExpenses}
            pendingCount={demoPending}
          />
          <OverdueEnvelopesCard envelopes={overdue} />
        </div>
        <AkahuConnect hasConnection={false} />
        <BudgetSummaryCards envelopes={demoEnvelopes} />
        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <RecentTransactions transactions={demoTransactions} />
          <CelebrationTimeline events={celebrations} />
        </div>
      </div>
    );
  }

  const supabase = await createClient();

  const [
    { data: envelopes, error: envelopesError },
    { data: transactions, error: transactionsError },
    { data: connection, error: connectionError },
  ] = await Promise.all([
    supabase
      .from("envelopes")
      .select("id, name, target_amount, current_amount, due_date, frequency, next_payment_due, notes, updated_at"),
      supabase
        .from("transactions_view")
        .select(
          "id, merchant_name, description, amount, occurred_at, status, envelope_name, account_name, bank_reference, bank_memo",
        )
      .order("occurred_at", { ascending: false })
      .limit(5),
    supabase
      .from("akahu_tokens")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  const connectUrl =
    process.env.AKAHU_CLIENT_ID && process.env.AKAHU_REDIRECT_URI
      ? `https://connect.akahu.io/?client=${process.env.AKAHU_CLIENT_ID}&redirect=${encodeURIComponent(process.env.AKAHU_REDIRECT_URI)}`
      : undefined;

  const safeEnvelopes = envelopesError ? [] : envelopes ?? [];
  const safeTransactions = transactionsError ? [] : transactions ?? [];
  const hasConnection = !connectionError && Boolean(connection);

  const incomeTotal = safeTransactions.reduce((sum, tx) => {
    const amount = Number(tx.amount ?? 0);
    return amount > 0 ? sum + amount : sum;
  }, 0);

  const expenseTotal = safeTransactions.reduce((sum, tx) => {
    const amount = Number(tx.amount ?? 0);
    return amount < 0 ? sum + amount : sum;
  }, 0);

  const pendingCount = safeTransactions.filter((tx) => (tx.status ?? "").toLowerCase() === "pending").length;

  const overdueEnvelopes: OverdueEnvelope[] = safeEnvelopes
    .map((envelope) => {
      const target = Number(envelope.target_amount ?? 0);
      const current = Number(envelope.current_amount ?? 0);
      const dueDate = envelope.due_date ? new Date(envelope.due_date) : null;
      const fundingGap = Math.max(0, target - current);
      const dueInDays = dueDate ? differenceInCalendarDays(dueDate, new Date()) : Infinity;
      return {
        id: envelope.id,
        name: envelope.name,
        targetAmount: target,
        currentAmount: current,
        dueDate,
        dueInDays,
        fundingGap,
      };
    })
    .filter((env) => env.dueDate && env.fundingGap > 0 && env.dueInDays <= 14)
    .map((env) => ({
      ...env,
      dueDate: env.dueDate!,
    }));

  const celebrationEvents: CelebrationEvent[] = safeEnvelopes
    .map((envelope) => {
      const target = Number(envelope.target_amount ?? 0);
      const current = Number(envelope.current_amount ?? 0);
      if (!target || current < target) return null;
      const status = getEnvelopeStatus(envelope);
      return {
        id: envelope.id,
        title: `${envelope.name} ${status.label.toLowerCase()}`,
        description: `Hit ${Math.round((current / target) * 100)}% of target. Keep it up!`,
        achievedAt: new Date(envelope.updated_at ?? envelope.due_date ?? new Date()),
      } as CelebrationEvent & { achievedAt: Date };
    })
    .filter(Boolean) as CelebrationEvent[];

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <IncomeExpenseOverview
          incomeTotal={incomeTotal}
          expenseTotal={Math.abs(expenseTotal)}
          pendingCount={pendingCount}
        />
        <OverdueEnvelopesCard envelopes={overdueEnvelopes} />
      </div>
      <AkahuConnect hasConnection={hasConnection} connectUrl={connectUrl} />
      <BudgetSummaryCards envelopes={safeEnvelopes} />
      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <RecentTransactions transactions={safeTransactions} />
        <CelebrationTimeline events={celebrationEvents} />
      </div>
    </div>
  );
}
