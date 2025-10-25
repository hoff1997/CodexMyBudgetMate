import type { PlannerFrequency } from "@/lib/planner/calculations";

export type PayPlanAllocation = {
  envelopeId: string | null;
  envelopeName: string;
  amount: number;
  annualAmount: number;
  perPayAmount: number;
};

export type PayPlanStream = {
  id: string;
  name: string;
  frequency: PlannerFrequency;
  amount: number;
  annualAmount: number;
  allocations: PayPlanAllocation[];
  allocationsTotal: number;
  allocationsAnnual: number;
  surplus: number;
  surplusAnnual: number;
};

export type PayPlanEnvelope = {
  envelopeId: string;
  envelopeName: string;
  annualAmount: number;
  perPayAmount: number;
};

export type PayPlanTotals = {
  annualIncome: number;
  annualAllocated: number;
  annualSurplus: number;
  perPayIncome: number;
  perPayAllocated: number;
  perPaySurplus: number;
};

export type PayPlanSummary = {
  streams: PayPlanStream[];
  envelopes: PayPlanEnvelope[];
  totals: PayPlanTotals;
  primaryFrequency: PlannerFrequency;
};
