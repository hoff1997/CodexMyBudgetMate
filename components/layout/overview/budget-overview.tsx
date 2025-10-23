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
import { differenceInCalendarDays, formatDistanceToNow } from "date-fns";
import { formatCurrency, getEnvelopeStatus } from "@/lib/finance";
import { cn } from "@/lib/cn";
import {
  DashboardWidgetGrid,
  type DashboardWidget,
} from "@/components/layout/overview/dashboard-widget-grid";

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

const WIDGET_STORAGE_KEY = "mbm-dashboard-widget-order";
const DEFAULT_WIDGET_ORDER = [
  "income-expense",
  "overdue",
  "akahu",
  "summary",
  "recent",
  "celebrations",
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

    const demoWidgets: DashboardWidget[] = [
      {
        id: "income-expense",
        className: "lg:col-span-2",
        node: (
          <IncomeExpenseOverview
            incomeTotal={demoIncome}
            expenseTotal={demoExpenses}
            pendingCount={demoPending}
          />
        ),
      },
      {
        id: "overdue",
        className: "lg:col-span-1",
        node: <OverdueEnvelopesCard envelopes={overdue} />, 
      },
      {
        id: "akahu",
        className: "lg:col-span-3",
        node: <AkahuConnect hasConnection={false} />, 
      },
      {
        id: "summary",
        className: "lg:col-span-3",
        node: <BudgetSummaryCards envelopes={demoEnvelopes} />,
      },
      {
        id: "recent",
        className: "lg:col-span-2",
        node: <RecentTransactions transactions={demoTransactions} />, 
      },
      {
        id: "celebrations",
        className: "lg:col-span-1",
        node: <CelebrationTimeline events={celebrations} />, 
      },
    ];

    return (
      <div className="space-y-6">
        <DashboardWidgetGrid widgets={demoWidgets} storageKey={null} defaultOrder={DEFAULT_WIDGET_ORDER} />
      </div>
    );
  }

  const supabase = await createClient();

  const [
    { data: envelopes, error: envelopesError },
    { data: transactions, error: transactionsError },
    { data: connections, error: connectionsError },
  ] = await Promise.all([
    supabase
      .from("envelopes")
      .select(
        "id, name, target_amount, current_amount, due_date, frequency, next_payment_due, notes, updated_at",
      ),
    supabase
      .from("transactions")
      .select(
        `id, merchant_name, description, amount, occurred_at, status,
          account:accounts(name),
          envelope:envelopes(name)`
      )
      .order("occurred_at", { ascending: false })
      .limit(5),
    supabase
      .from("bank_connections")
      .select("provider, status, last_synced_at")
      .eq("user_id", userId)
      .order("last_synced_at", { ascending: false }),
  ]);

  const connectUrl =
    process.env.AKAHU_CLIENT_ID && process.env.AKAHU_REDIRECT_URI
      ? `https://connect.akahu.io/?client=${process.env.AKAHU_CLIENT_ID}&redirect=${encodeURIComponent(process.env.AKAHU_REDIRECT_URI)}&metadata[user_id]=${encodeURIComponent(userId)}`
      : undefined;

  const safeEnvelopes = envelopesError ? [] : envelopes ?? [];
  const safeTransactions = transactionsError
    ? []
    : (transactions ?? []).map((transaction: any) => ({
        ...transaction,
        envelope_name: transaction.envelope?.name ?? null,
        account_name: transaction.account?.name ?? null,
      }));
  const primaryConnection = !connectionsError && Array.isArray(connections) ? connections[0] ?? null : null;
  const hasConnection = Boolean(primaryConnection);
  const formatStatusLabel = (status: string) =>
    status
      .split(/[_\s]+/)
      .filter(Boolean)
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(" ");

  const connectionStatusLabel = hasConnection
    ? formatStatusLabel(primaryConnection?.status ?? "connected")
    : "Disconnected";
  const connectionTone = hasConnection
    ? connectionStatusLabel.toLowerCase().includes("connected")
      ? "positive"
      : "negative"
    : "action";
  const lastSyncedRelative = primaryConnection?.last_synced_at
    ? formatDistanceToNow(new Date(primaryConnection.last_synced_at), { addSuffix: true })
    : null;

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
      } as CelebrationEvent;
    })
    .filter(Boolean) as CelebrationEvent[];

  const widgetConfig: DashboardWidget[] = [
    {
      id: "income-expense",
      className: "lg:col-span-2",
      node: (
        <IncomeExpenseOverview
          incomeTotal={incomeTotal}
          expenseTotal={Math.abs(expenseTotal)}
          pendingCount={pendingCount}
        />
      ),
    },
    {
      id: "overdue",
      className: "lg:col-span-1",
      node: <OverdueEnvelopesCard envelopes={overdueEnvelopes} />, 
    },
    {
      id: "akahu",
      className: "lg:col-span-3",
      node: (
        <AkahuConnect
          hasConnection={hasConnection}
          connectUrl={connectUrl}
          statusLabel={connectionStatusLabel}
          lastSyncedAt={primaryConnection?.last_synced_at ?? null}
        />
      ), 
    },
    {
      id: "summary",
      className: "lg:col-span-3",
      node: <BudgetSummaryCards envelopes={safeEnvelopes} />, 
    },
    {
      id: "recent",
      className: "lg:col-span-2",
      node: <RecentTransactions transactions={safeTransactions} />, 
    },
    {
      id: "celebrations",
      className: "lg:col-span-1",
      node: <CelebrationTimeline events={celebrationEvents} />, 
    },
  ];

  const nextOverdue = overdueEnvelopes.length
    ? overdueEnvelopes.reduce((earliest, envelope) => {
        if (!earliest) return envelope;
        return envelope.dueDate < earliest.dueDate ? envelope : earliest;
      })
    : null;

  const compactStats = [
    {
      id: "income",
      label: "Income this period",
      value: formatCurrency(incomeTotal),
      helper: pendingCount ? `${pendingCount} transactions pending` : "All reconciled",
    },
    {
      id: "expenses",
      label: "Expenses this period",
      value: formatCurrency(Math.abs(expenseTotal)),
      helper: expenseTotal ? "Includes pending spend" : "No expenses logged",
    },
    {
      id: "overdue",
      label: "Envelopes needing top-up",
      value: overdueEnvelopes.length ? `${overdueEnvelopes.length}` : "0",
      helper: nextOverdue
        ? `${nextOverdue.name} due in ${Math.max(0, nextOverdue.dueInDays)} days`
        : "All envelopes on track",
    },
    {
      id: "celebrations",
      label: "Recent celebrations",
      value: celebrationEvents.length ? `${celebrationEvents.length}` : "—",
      helper: celebrationEvents.length ? "Keep the streak going!" : "No celebrations yet",
    },
    {
      id: "akahu",
      label: "Bank connection",
      value: hasConnection ? connectionStatusLabel : "Connect now",
      helper: hasConnection
        ? lastSyncedRelative
          ? `Last sync ${lastSyncedRelative}`
          : "Sync scheduled"
        : connectUrl
        ? "Link an account to import data"
        : "Set AKAHU env vars to enable sync",
      emphasis: connectionTone,
      href: hasConnection ? "/settings#bank-connections" : connectUrl,
    },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="md:hidden">
        <MobileCompactStatList items={compactStats} />
      </div>
      <div className="hidden md:block">
        <DashboardWidgetGrid
          widgets={widgetConfig}
          storageKey={WIDGET_STORAGE_KEY}
          defaultOrder={DEFAULT_WIDGET_ORDER}
        />
      </div>
    </div>
  );
}

type CompactStat = {
  id: string;
  label: string;
  value: string;
  helper?: string;
  emphasis?: "positive" | "negative" | "action";
  href?: string;
};

function MobileCompactStatList({ items }: { items: readonly CompactStat[] }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-muted/20 p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Overview
      </h2>
      <ul className="divide-y divide-border text-sm">
        {items.map((item) => {
          const tone =
            item.emphasis === "positive"
              ? "text-emerald-600"
              : item.emphasis === "negative"
              ? "text-rose-600"
              : item.emphasis === "action"
              ? "text-primary"
              : "text-secondary";
          const content = (
            <div className="flex w-full items-start justify-between gap-3 py-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {item.label}
                </p>
                {item.helper ? (
                  <p className="mt-1 text-sm text-muted-foreground">{item.helper}</p>
                ) : null}
              </div>
              <p className={cn("text-base font-semibold", tone)}>{item.value}</p>
            </div>
          );
          return (
            <li key={item.id}>
              {item.href ? (
                <a
                  href={item.href}
                  className="block rounded-lg px-2 transition hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {content}
                </a>
              ) : (
                content
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
