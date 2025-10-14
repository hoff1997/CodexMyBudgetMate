export type DebtLiability = {
  id: string;
  name: string;
  liabilityType: string;
  balance: number;
  interestRate: number;
};

export type DebtEnvelope = {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  payCycleAmount: number;
  frequency: string | null;
  nextPaymentDue: string | null;
};
