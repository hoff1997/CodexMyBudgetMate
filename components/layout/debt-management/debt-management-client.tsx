"use client";

import { useMemo, useState, type ComponentType } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Calculator,
  Calendar,
  CheckCircle2,
  CreditCard,
  Target,
  TrendingDown,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/finance";
import type { DebtEnvelope, DebtLiability } from "@/lib/types/debt";
import { DebtPayoffCalculator, type DebtWithPayment, type Strategy } from "./debt-payoff-calculator";

type Props = {
  liabilities: DebtLiability[];
  envelopes: DebtEnvelope[];
  demoMode: boolean;
};

const strategyOptions: Array<{ id: Strategy; label: string; description: string }> = [
  {
    id: "snowball",
    label: "Snowball",
    description: "Knock out the smallest balances first to build momentum.",
  },
  {
    id: "avalanche",
    label: "Avalanche",
    description: "Attack the highest interest rates to minimise total cost.",
  },
  {
    id: "hybrid",
    label: "Hybrid",
    description: "Blend quick wins and smart maths for a balanced approach.",
  },
];

export function DebtManagementClient({ liabilities, envelopes, demoMode }: Props) {
  const debtEnvelopes = useMemo(
    () => envelopes.filter((envelope) => isDebtEnvelope(envelope.name)),
    [envelopes],
  );

  const debts: DebtWithPayment[] = useMemo(() => {
    return liabilities.map((liability) => {
      const envelopeMatch = matchEnvelope(liability, debtEnvelopes);
      const envelopeAmount = envelopeMatch?.payCycleAmount ?? 0;
      return {
        ...liability,
        minimumPayment: estimateMinimumPayment(liability, envelopeAmount),
      };
    });
  }, [liabilities, debtEnvelopes]);

  const totalDebt = useMemo(
    () => debts.reduce((sum, debt) => sum + Math.max(0, debt.balance), 0),
    [debts],
  );

  const highestInterestDebt = useMemo(() => {
    return debts.reduce<DebtWithPayment | null>((highest, current) => {
      if (!highest || current.interestRate > highest.interestRate) {
        return current;
      }
      return highest;
    }, null);
  }, [debts]);

  const totalMinimumPayments = useMemo(
    () => debts.reduce((sum, debt) => sum + Math.min(debt.minimumPayment, debt.balance), 0),
    [debts],
  );

  const totalDebtBudget = useMemo(
    () => debtEnvelopes.reduce((sum, envelope) => sum + Math.max(0, envelope.payCycleAmount), 0),
    [debtEnvelopes],
  );

  const extraPaymentCapacity = Math.max(0, totalDebtBudget - totalMinimumPayments);

  const [strategy, setStrategy] = useState<Strategy>("snowball");

  const milestones = useMemo(() => {
    const base = [
      {
        id: "list-debts",
        title: "List every balance",
        description: "Track all credit cards, loans, and hire purchases.",
        completed: debts.length > 0,
        icon: CreditCard,
      },
      {
        id: "set-strategy",
        title: "Choose a strategy",
        description: "Pick snowball, avalanche, or hybrid to guide payments.",
        completed: Boolean(strategy),
        icon: Calculator,
      },
      {
        id: "budget-payments",
        title: "Budget repayments",
        description: "Tie minimums to envelopes so you never miss a due date.",
        completed: debtEnvelopes.length > 0,
        icon: Calendar,
      },
      {
        id: "accelerate",
        title: "Activate extra payments",
        description: "Use surplus cash to speed up the timeline.",
        completed: extraPaymentCapacity > 0,
        icon: Zap,
      },
    ];

    if (totalDebt <= 0) {
      base.push({
        id: "celebrate",
        title: "Debt freedom",
        description: "Stay focused on saving and investing for future goals.",
        completed: true,
        icon: CheckCircle2,
      });
    }

    return base;
  }, [debts.length, strategy, debtEnvelopes.length, extraPaymentCapacity, totalDebt]);

  const completedMilestones = milestones.filter((entry) => entry.completed).length;
  const progressPercentage = Math.min(100, (completedMilestones / milestones.length) * 100 || 0);

  const quickActions = useMemo(() => {
    return [
      {
        title: "Add missing debts",
        description: "Keep liability balances up to date for accurate projections.",
        href: "/financial-position",
        urgent: debts.length === 0,
      },
      {
        title: "Budget debt payments",
        description: "Create envelopes that match each repayment so money is ready.",
        href: "/envelope-summary?tab=debt",
        urgent: debtEnvelopes.length === 0,
      },
      {
        title: "Find extra dollars",
        description: "Review spending to free cash for accelerated paydown.",
        href: "/envelope-summary?tab=zero-budget",
        urgent: extraPaymentCapacity < totalDebt * 0.015,
      },
      {
        title: "Track transactions",
        description: "Stay on top of card swipes and loan activity with live feeds.",
        href: "/transactions",
        urgent: false,
      },
    ];
  }, [debts.length, debtEnvelopes.length, extraPaymentCapacity, totalDebt]);

  const urgentActions = quickActions.filter((action) => action.urgent);

  if (!debts.length || totalDebt <= 0) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 pb-24 pt-12 md:px-10 md:pb-12">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
              Debt free and thriving
            </CardTitle>
            <CardDescription>
              No active balances are tracked right now. Keep momentum by redirecting payments into
              savings and investing goals.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Button asChild>
              <Link href="/envelope-summary">
                Build emergency fund
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/financial-position">
                Start investing
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 pb-24 pt-12 md:px-10 md:pb-12">
      <header className="space-y-2">
        <Badge variant="secondary" className="w-fit uppercase tracking-wide">
          Debt tools {demoMode ? "· demo data" : ""}
        </Badge>
        <h1 className="text-2xl md:text-3xl font-semibold text-secondary">Debt management</h1>
        <p className="text-base text-muted-foreground">
          See every balance, pick a payoff strategy, and celebrate milestones as you move towards
          financial freedom.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={Target}
          title="Total balance"
          value={formatCurrency(totalDebt)}
          helper={`${debts.length} liability${debts.length === 1 ? "" : "ies"}`}
          tone="negative"
        />
        <MetricCard
          icon={DollarSignIcon}
          title="Minimum payments"
          value={formatCurrency(totalMinimumPayments)}
          helper="Monthly commitment"
          tone="neutral"
        />
        <MetricCard
          icon={Zap}
          title="Extra payment power"
          value={formatCurrency(extraPaymentCapacity)}
          helper={
            extraPaymentCapacity > 0
              ? "Ready to accelerate"
              : "Set aside surplus in envelopes"
          }
          tone={extraPaymentCapacity > 0 ? "positive" : "neutral"}
        />
        <MetricCard
          icon={TrendingDown}
          title="Highest interest"
          value={
            highestInterestDebt
              ? `${highestInterestDebt.interestRate.toFixed(2)}%`
              : "—"
          }
          helper={highestInterestDebt ? highestInterestDebt.name : "Add rates to liabilities"}
          tone="neutral"
        />
      </section>

      {urgentActions.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
          <div className="flex items-start gap-3 text-amber-900">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">
                You have {urgentActions.length} urgent debt task{urgentActions.length === 1 ? "" : "s"}.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {urgentActions.map((action) => (
                  <Button key={action.title} asChild size="sm" variant="outline">
                    <Link href={action.href}>
                      {action.title}
                      <ArrowRight className="ml-1.5 h-3 w-3" />
                    </Link>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Debt freedom progress</CardTitle>
          <CardDescription>Tick off milestones as you build payoff momentum.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-secondary">
              {completedMilestones} of {milestones.length} milestones complete
            </span>
            <span className="text-muted-foreground">{progressPercentage.toFixed(0)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2 rounded-full" />
          <div className="grid gap-3 md:grid-cols-2">
            {milestones.map((milestone) => (
              <div
                key={milestone.id}
                className="flex items-start gap-3 rounded-lg border border-dashed bg-muted/40 p-3"
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${
                    milestone.completed ? "bg-emerald-100 text-emerald-600" : "bg-muted text-muted-foreground"
                  }`}
                >
                  <milestone.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-secondary">{milestone.title}</p>
                  <p className="text-sm text-muted-foreground">{milestone.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pick your payoff strategy</CardTitle>
          <CardDescription>Switch between approaches to see which fits your whānau.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs
            value={strategy}
            onValueChange={(value) => setStrategy(value as Strategy)}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3">
              {strategyOptions.map((option) => (
                <TabsTrigger key={option.id} value={option.id} className="flex-1">
                  {option.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <p className="text-sm text-muted-foreground">
            {strategyOptions.find((option) => option.id === strategy)?.description}
          </p>
          <DebtPayoffCalculator debts={debts} strategy={strategy} suggestedExtra={extraPaymentCapacity} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick actions</CardTitle>
          <CardDescription>Stay organised with focused to-dos for the month ahead.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {quickActions.map((action) => (
              <Link
                key={action.title}
                href={action.href}
                className={`block rounded-lg border p-4 transition hover:border-primary hover:bg-primary/5 ${
                  action.urgent ? "border-amber-300 bg-amber-50" : "border-border bg-background"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium text-secondary">{action.title}</p>
                  {action.urgent && (
                    <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-900">
                      Urgent
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{action.description}</p>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function isDebtEnvelope(name: string) {
  const candidate = name.toLowerCase();
  return ["debt", "loan", "repay", "credit", "card", "hire"].some((token) => candidate.includes(token));
}

function matchEnvelope(liability: DebtLiability, envelopes: DebtEnvelope[]) {
  const normalizedName = liability.name.toLowerCase();
  return envelopes.find((envelope) => {
    const envelopeName = envelope.name.toLowerCase();
    if (normalizedName.includes(envelopeName) || envelopeName.includes(normalizedName)) {
      return true;
    }
    const tokens = envelopeName.split(/[\s-]+/).filter((token) => token.length > 2);
    return tokens.some((token) => normalizedName.includes(token));
  });
}

function estimateMinimumPayment(liability: DebtLiability, envelopeAmount: number) {
  const balance = Math.max(0, liability.balance);
  if (balance === 0) return 0;

  const type = (liability.liabilityType ?? "").toLowerCase();
  const name = liability.name.toLowerCase();
  let rate = 0.02;

  if (type.includes("credit") || type.includes("card") || name.includes("card")) {
    rate = 0.03;
  } else if (type.includes("store") || type.includes("hire")) {
    rate = 0.035;
  } else if (type.includes("mortgage") || type.includes("student")) {
    rate = 0.01;
  }

  const estimated = Math.max(balance * rate, balance < 200 ? balance : 25);
  const withEnvelope = envelopeAmount > 0 ? Math.max(envelopeAmount, estimated) : estimated;
  return Number(Math.min(withEnvelope, balance).toFixed(2));
}

type MetricCardProps = {
  icon: ComponentType<{ className?: string }>;
  title: string;
  value: string;
  helper?: string;
  tone: "positive" | "negative" | "neutral";
};

function MetricCard({ icon: Icon, title, value, helper, tone }: MetricCardProps) {
  const toneClass =
    tone === "positive"
      ? "text-emerald-600"
      : tone === "negative"
        ? "text-rose-600"
        : "text-secondary";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          {helper && <CardDescription>{helper}</CardDescription>}
        </div>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-semibold ${toneClass}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function DollarSignIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className ?? "h-5 w-5 text-muted-foreground"}
    >
      <path
        fill="currentColor"
        d="M12 2a1 1 0 0 1 1 1v1.09c2.28.34 4 1.86 4 4 0 2.53-2.23 3.73-4.66 4.32L12 12.6V17h3a1 1 0 1 1 0 2h-3v1a1 1 0 1 1-2 0v-1H8a1 1 0 1 1 0-2h2v-4.4c-2.62-.38-4.5-1.83-4.5-4.23 0-2.4 1.92-3.94 4.5-4.34V3a1 1 0 0 1 1-1h1Zm-1 6.05v4.02l.42-.11C13.8 11.43 15 10.68 15 9c0-1.3-1.13-2.08-3-2.31Z"
      />
    </svg>
  );
}
