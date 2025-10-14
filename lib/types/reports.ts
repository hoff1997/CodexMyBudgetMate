export type SpendingPoint = {
  month: string;
  planned: number;
  actual: number;
  variance: number;
};

export type IncomePoint = {
  month: string;
  amount: number;
};

export type DebtReportRow = {
  id: string;
  name: string;
  balance: number;
  interestRate: number;
  monthlyPayment: number;
  projectedPayoff: string | null;
  progress: number;
};

export type ReportsSummary = {
  totalSpent: number;
  planVariance: number;
  avgIncome: number;
  debtsRemaining: number;
};

export type ReportsData = {
  summary: ReportsSummary;
  spending: SpendingPoint[];
  income: IncomePoint[];
  debts: DebtReportRow[];
  exportLinks: { label: string; href: string }[];
  demoMode: boolean;
};
