// Core types for budget planning and scenario calculations

export type PayCycle = "weekly" | "fortnightly" | "monthly";
export type Frequency = "weekly" | "fortnightly" | "monthly" | "quarterly" | "annual" | "once";
export type EnvelopePriority = "essential" | "important" | "discretionary";

export type Envelope = {
  id: string;
  name: string;
  envelope_type: "income" | "expense";
  priority: EnvelopePriority;
  target_amount: number;
  annual_amount: number | null;
  pay_cycle_amount: number | null;
  current_amount: number;
  frequency: Frequency | null;
  next_payment_due: string | null;
  category_id: string | null;
};

export type EnvelopeHealth = {
  envelopeId: string;
  name: string;
  priority: EnvelopePriority;
  dueDate: string | null;
  totalDueAmount: number;

  // Current state
  currentBalance: number;

  // Where you SHOULD be
  shouldHaveSaved: number;

  // Gap analysis
  gap: number; // shouldHaveSaved - currentBalance (positive = behind, negative = ahead)
  gapStatus: "ahead" | "on-track" | "behind";
  percentComplete: number;

  // Regular contribution
  regularPerPay: number;

  // Timeline
  daysUntilDue: number | null;
  paysUntilDue: number | null;

  // Priority for surplus allocation
  priorityScore: number;
  priorityReason: string;
};

export type Scenario = {
  id: string;
  name: string;
  description: string;
  duration: number; // in pay cycles
  affectedPriorities: EnvelopePriority[];
  reduction: number; // percentage (0-100)
  specificEnvelopes?: string[]; // optional: target specific envelope names
};

export type ImpactedEnvelope = {
  envelopeId: string;
  name: string;
  priority: EnvelopePriority;
  currentPerPay: number;
  newPerPay: number;
  savedPerPay: number;
};

export type ScenarioResult = {
  scenario: Scenario;
  savingsPerPay: number;
  savingsPerMonth: number;
  totalSavingsOverPeriod: number;
  impactedEnvelopes: ImpactedEnvelope[];

  projection: {
    currentGap: number;
    gapAfterScenario: number;
    timeToCloseGap: number; // pay cycles
    bufferAfterGap: number;
    onTrackAfterPays: number;
  };

  healthAfterScenario: {
    essential: EnvelopeHealth[];
    important: EnvelopeHealth[];
    discretionary: EnvelopeHealth[];
  };
};

export const PRIORITY_DEFINITIONS = {
  essential: {
    label: "Essential",
    description: "Must pay to maintain basic living",
    color: "red",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    textColor: "text-red-700",
    icon: "🔴",
    examples: [
      "Mortgage/Rent",
      "Electricity",
      "Water",
      "Groceries",
      "Petrol",
      "Car Insurance",
      "Health Insurance",
    ],
  },
  important: {
    label: "Important",
    description: "Should pay to maintain quality of life and obligations",
    color: "amber",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    textColor: "text-amber-700",
    icon: "🟡",
    examples: [
      "Phone",
      "Internet",
      "Home Insurance",
      "Life Insurance",
      "School Fees",
      "Loan Repayments",
    ],
  },
  discretionary: {
    label: "Discretionary",
    description: "Nice to have, can pause or reduce without immediate impact",
    color: "blue",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    textColor: "text-blue-700",
    icon: "🔵",
    examples: [
      "Netflix",
      "Spotify",
      "Eating Out",
      "Takeaways",
      "Entertainment",
      "Gym Membership",
      "Hobbies",
    ],
  },
} as const;
