import { addMonths, format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { ReportsClient } from "@/components/layout/reports/reports-client";
import type { ReportsData, SpendingPoint, IncomePoint, DebtReportRow } from "@/lib/types/reports";
import { mapTransferHistory } from "@/lib/types/envelopes";
import type { TransferHistoryItem } from "@/lib/types/envelopes";

type EnvelopeRecord = {
  id: string;
  name: string;
  pay_cycle_amount: number | string | null;
  target_amount: number | string | null;
  frequency: string | null;
};

type TransactionRecord = {
  id: string;
  amount: number | string | null;
  occurred_at: string;
  account_name: string | null;
  envelope_name: string | null;
  labels: string[];
};

type LiabilityRecord = {
  id: string;
  name: string;
  current_balance: number | string | null;
  interest_rate: number | string | null;
};

const UNASSIGNED_LABEL = "Unassigned";

export default async function ReportsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let envelopes: EnvelopeRecord[] = [];
  let transactions: TransactionRecord[] = [];
  let liabilities: LiabilityRecord[] = [];
  let transfers: TransferHistoryItem[] = [];

  if (user) {
    const monthsBack = 12;
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - (monthsBack - 1), 1);
    startDate.setHours(0, 0, 0, 0);

    const [envelopeRes, transactionRes, liabilityRes, transfersRes] = await Promise.all([
      supabase
        .from("envelopes")
        .select("id, name, pay_cycle_amount, target_amount, frequency")
        .order("name"),
      supabase
        .from("transactions")
        .select(
          `id, amount, occurred_at,
            account:accounts(name),
            envelope:envelopes(name),
            transaction_labels:transaction_labels(label:labels(name))`
        )
        .gte("occurred_at", startDate.toISOString())
        .order("occurred_at", { ascending: true }),
      supabase.from("liabilities").select("id, name, current_balance, interest_rate"),
      supabase
        .from("envelope_transfers")
        .select(
          "id, amount, note, created_at, from_envelope:from_envelope_id(id, name), to_envelope:to_envelope_id(id, name)",
        )
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    envelopes = (envelopeRes.data ?? []) as EnvelopeRecord[];
    transactions = (transactionRes.data ?? []).map((transaction: any) => ({
      id: transaction.id,
      amount: transaction.amount,
      occurred_at: transaction.occurred_at,
      account_name: transaction.account?.name ?? null,
      envelope_name: transaction.envelope?.name ?? null,
      labels: Array.isArray(transaction.transaction_labels)
        ? transaction.transaction_labels
            .map((entry: any) => entry?.label?.name)
            .filter(Boolean)
        : [],
    }));
    liabilities = (liabilityRes.data ?? []) as LiabilityRecord[];
    transfers = mapTransferHistory(transfersRes.data as any);
  }

  const data = buildReportsData({
    envelopes,
    transactions,
    liabilities,
    transfers,
    demoMode: !session,
    monthsBack: session ? 12 : 6,
  });

  return <ReportsClient data={data} />;
}

function buildReportsData({
  envelopes,
  transactions,
  liabilities,
  transfers,
  demoMode,
  monthsBack,
}: {
  envelopes: EnvelopeRecord[];
  transactions: TransactionRecord[];
  liabilities: LiabilityRecord[];
  transfers: TransferHistoryItem[];
  demoMode: boolean;
  monthsBack: number;
}): ReportsData {
  if (demoMode) {
    return getDemoReportsData();
  }

  const months = createMonthBuckets(monthsBack);
  const spendMap = new Map<string, number>();
  const incomeMap = new Map<string, number>();
  const accountSet = new Set<string>();
  const envelopeSet = new Set<string>();
  const labelSet = new Set<string>();

  transactions.forEach((transaction) => {
    const amount = toNumber(transaction.amount);
    if (!amount || !transaction.occurred_at) return;
    const accountLabel = transaction.account_name ?? UNASSIGNED_LABEL;
    const envelopeLabel = transaction.envelope_name ?? UNASSIGNED_LABEL;
    if (accountLabel) accountSet.add(accountLabel);
    if (envelopeLabel) envelopeSet.add(envelopeLabel);
    const key = monthKey(new Date(transaction.occurred_at));
    if (amount < 0) {
      spendMap.set(key, (spendMap.get(key) ?? 0) + Math.abs(amount));
    } else {
      incomeMap.set(key, (incomeMap.get(key) ?? 0) + amount);
    }
    (transaction.labels ?? []).forEach((label) => {
      if (label) labelSet.add(label);
    });
  });

  let plannedMonthly = envelopes.reduce((sum, envelope) => sum + toNumber(envelope.pay_cycle_amount), 0);
  if (!plannedMonthly) {
    plannedMonthly = envelopes.reduce(
      (sum, envelope) => sum + toNumber(envelope.target_amount) / 12,
      0,
    );
  }

  const spending: SpendingPoint[] = months.map((entry) => {
    const actual = spendMap.get(entry.key) ?? 0;
    return {
      month: entry.label,
      planned: plannedMonthly,
      actual,
      variance: actual - plannedMonthly,
    };
  });

  const income: IncomePoint[] = months.map((entry) => ({
    month: entry.label,
    amount: incomeMap.get(entry.key) ?? 0,
  }));

  const debtEnvelopes = envelopes.filter((envelope) => isDebtEnvelope(envelope.name));
  const debts: DebtReportRow[] = liabilities.map((liability) => {
    const balance = toNumber(liability.current_balance);
    const interestRate = toNumber(liability.interest_rate);
    const envelope = matchEnvelope(liability.name, debtEnvelopes);
    const monthlyPayment = envelope ? Math.max(0, toNumber(envelope.pay_cycle_amount)) : 0;
    const projectedMonths =
      monthlyPayment > 0 ? Math.ceil(balance / Math.max(monthlyPayment, 1)) : null;
    const projectedPayoff =
      projectedMonths && isFinite(projectedMonths)
        ? format(addMonths(new Date(), projectedMonths), "MMM yyyy")
        : null;
    const progress =
      monthlyPayment > 0 ? Math.min(100, (monthlyPayment * 12) / Math.max(balance, 1) * 100) : 0;

    return {
      id: liability.id,
      name: liability.name,
      balance,
      interestRate,
      monthlyPayment,
      projectedPayoff,
      progress,
    };
  });

  const totalSpent = spending.reduce((sum, point) => sum + point.actual, 0);
  const totalPlanned = spending.reduce((sum, point) => sum + point.planned, 0);
  const planVariance = totalSpent - totalPlanned;
  const incomeMonths = income.filter((point) => point.amount > 0);
  const avgIncome =
    incomeMonths.length > 0
      ? incomeMonths.reduce((sum, point) => sum + point.amount, 0) / incomeMonths.length
      : 0;
  const debtsRemaining = debts.filter((debt) => debt.balance > 0.5).length;

  return {
    summary: {
      totalSpent,
      planVariance,
      avgIncome,
      debtsRemaining,
    },
    spending,
    income,
    debts,
    exportLinks: [
      { label: "Balance sheet (CSV)", href: "/api/reports/balance-sheet?format=csv" },
      { label: "Balance sheet (Excel)", href: "/api/reports/balance-sheet?format=xlsx" },
      { label: "Transactions (CSV)", href: "/api/reports/transactions?format=csv" },
      { label: "Transactions (Excel)", href: "/api/reports/transactions?format=xlsx" },
      { label: "Net worth summary (PDF)", href: "/api/reports/net-worth/pdf" },
      { label: "Envelope summary (PDF)", href: "/api/reports/envelopes/pdf" },
    ],
    demoMode,
    transfers,
    plannedMonthly,
    accounts: Array.from(accountSet).sort((a, b) => a.localeCompare(b)),
    envelopes: Array.from(envelopeSet).sort((a, b) => a.localeCompare(b)),
    labels: Array.from(labelSet).sort((a, b) => a.localeCompare(b)),
    transactions: transactions.map((transaction) => ({
      id: transaction.id,
      occurredAt: transaction.occurred_at,
      amount: toNumber(transaction.amount),
      account: transaction.account_name ?? UNASSIGNED_LABEL,
      envelope: transaction.envelope_name ?? UNASSIGNED_LABEL,
      labels: transaction.labels ?? [],
    })),
  };
}

function getDemoReportsData(): ReportsData {
  const now = new Date();
  const months = createMonthBuckets(6);
  const planned = 4200;
  const spending: SpendingPoint[] = months.map((entry, index) => {
    const seasonalSwing = Math.sin(index * 0.75) * 160;
    const actual = planned + seasonalSwing + (index === months.length - 1 ? -120 : 0);
    const safeActual = Math.max(3200, actual);
    return {
      month: entry.label,
      planned,
      actual: safeActual,
      variance: safeActual - planned,
    };
  });

  const income: IncomePoint[] = months.map((entry, index) => ({
    month: entry.label,
    amount: 5150 + index * 55 + (index % 2 === 0 ? 90 : -60),
  }));

  const debts: DebtReportRow[] = [
    {
      id: "demo-anz",
      name: "ANZ credit card",
      balance: 4200,
      interestRate: 19.95,
      monthlyPayment: 260,
      projectedPayoff: format(addMonths(now, 18), "MMM yyyy"),
      progress: 48,
    },
    {
      id: "demo-westpac",
      name: "Westpac personal loan",
      balance: 11800,
      interestRate: 12.5,
      monthlyPayment: 410,
      projectedPayoff: format(addMonths(now, 32), "MMM yyyy"),
      progress: 36,
    },
    {
      id: "demo-studylink",
      name: "StudyLink student loan",
      balance: 26400,
      interestRate: 3.9,
      monthlyPayment: 280,
      projectedPayoff: format(addMonths(now, 56), "MMM yyyy"),
      progress: 22,
    },
  ];

  return {
    summary: {
      totalSpent: spending.reduce((sum, point) => sum + point.actual, 0),
      planVariance: spending.reduce((sum, point) => sum + point.variance, 0),
      avgIncome: income.reduce((sum, point) => sum + point.amount, 0) / income.length,
      debtsRemaining: debts.length,
    },
    spending,
    income,
    debts,
    exportLinks: [
      { label: "Balance sheet (CSV)", href: "#" },
      { label: "Balance sheet (Excel)", href: "#" },
      { label: "Transactions (CSV)", href: "#" },
      { label: "Transactions (Excel)", href: "#" },
      { label: "Net worth summary (PDF)", href: "#" },
      { label: "Envelope summary (PDF)", href: "#" },
    ],
    demoMode: true,
    transfers: [
      {
        id: "demo-transfer-1",
        amount: 150,
        note: "Top up groceries after long weekend",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
        from: { id: "demo-emergency", name: "Emergency fund" },
        to: { id: "demo-groceries", name: "Groceries" },
      },
      {
        id: "demo-transfer-2",
        amount: 220,
        note: "Shift surplus to holidays envelope",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
        from: { id: "demo-surplus", name: "Surplus" },
        to: { id: "demo-holiday", name: "Holiday savings" },
      },
    ],
    plannedMonthly: planned,
    accounts: ["Everyday account", "Holiday savings"],
    envelopes: ["Groceries", "Holiday savings", "Emergency fund", "Income"],
    labels: ["Groceries", "Income", "Holiday"],
    transactions: [
      {
        id: "demo-tx-1",
        occurredAt: new Date().toISOString(),
        amount: -320,
        account: "Everyday account",
        envelope: "Groceries",
        labels: ["Groceries"],
      },
      {
        id: "demo-tx-2",
        occurredAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString(),
        amount: 5200,
        account: "Everyday account",
        envelope: "Income",
        labels: ["Income"],
      },
      {
        id: "demo-tx-3",
        occurredAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45).toISOString(),
        amount: -180,
        account: "Holiday savings",
        envelope: "Holiday savings",
        labels: ["Holiday"],
      },
    ],
  };
}

function createMonthBuckets(count: number) {
  const formatter = new Intl.DateTimeFormat("en-NZ", { month: "short" });
  const months: Array<{ key: string; label: string }> = [];
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setMonth(date.getMonth() - offset, 1);
    const label = `${formatter.format(date)} ${date.getFullYear().toString().slice(-2)}`;
    months.push({ key: monthKey(date), label });
  }
  return months;
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}`;
}

function toNumber(value: number | string | null | undefined) {
  const parsed = typeof value === "string" ? Number.parseFloat(value) : value ?? 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

function isDebtEnvelope(name: string) {
  const tokens = ["debt", "loan", "repay", "credit", "card", "hire"];
  const lower = name.toLowerCase();
  return tokens.some((token) => lower.includes(token));
}

function matchEnvelope(name: string, envelopes: EnvelopeRecord[]) {
  const lowerName = name.toLowerCase();
  return envelopes.find((envelope) => {
    const candidate = envelope.name.toLowerCase();
    if (lowerName.includes(candidate) || candidate.includes(lowerName)) {
      return true;
    }
    const parts = candidate.split(/[\s-]+/).filter((part) => part.length > 2);
    return parts.some((part) => lowerName.includes(part));
  });
}
