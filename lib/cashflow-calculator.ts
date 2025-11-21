import { addDays, addWeeks, addMonths, differenceInDays, isBefore, isAfter, startOfDay } from "date-fns";

export type PayFrequency = "weekly" | "fortnightly" | "monthly" | "quarterly" | "annually";
export type EnvelopeStatus = "on_track" | "behind" | "critical" | "overfunded";

export type FutureIncome = {
  date: Date;
  source: string;
  income_id: string;
  amount: number;
};

export type Suggestion = {
  type: "increase_allocation" | "one_time_income" | "reduce_bill" | "extend_due_date" | "lifestyle_change";
  message: string;
  action_amount?: number;
};

export type EnvelopePrediction = {
  envelope_id: string;
  current_balance: number;
  projected_balance: number;
  target_amount: number;
  gap: number;
  status: EnvelopeStatus;
  days_until_due: number;
  future_income: FutureIncome[];
  suggestions: Suggestion[];
};

export type RecurringIncome = {
  id: string;
  name: string;
  amount: number;
  frequency: PayFrequency;
  next_date: Date | string;
  allocation: Array<{
    envelopeId: string;
    amount: number;
  }>;
};

export type Envelope = {
  id: string;
  name: string;
  bill_amount?: number;
  frequency?: PayFrequency;
  due_date?: Date | string;
  target_amount?: number;
};

/**
 * Calculate the next pay dates for a given frequency until an end date
 */
export function calculatePayDates(
  frequency: PayFrequency,
  startDate: Date | string,
  endDate: Date | string
): Date[] {
  const payDates: Date[] = [];
  let currentDate = startOfDay(new Date(startDate));
  const end = startOfDay(new Date(endDate));

  // Safety limit to prevent infinite loops
  let iterations = 0;
  const MAX_ITERATIONS = 365; // Max 1 year of pay dates

  while (isBefore(currentDate, end) && iterations < MAX_ITERATIONS) {
    payDates.push(new Date(currentDate));

    switch (frequency) {
      case "weekly":
        currentDate = addWeeks(currentDate, 1);
        break;
      case "fortnightly":
        currentDate = addWeeks(currentDate, 2);
        break;
      case "monthly":
        currentDate = addMonths(currentDate, 1);
        break;
      case "quarterly":
        currentDate = addMonths(currentDate, 3);
        break;
      case "annually":
        currentDate = addMonths(currentDate, 12);
        break;
    }

    iterations++;
  }

  return payDates;
}

/**
 * Calculate how many pay periods remain until a due date
 */
export function calculatePayPeriodsRemaining(
  frequency: PayFrequency,
  daysUntilDue: number
): number {
  if (daysUntilDue <= 0) return 0;

  switch (frequency) {
    case "weekly":
      return Math.floor(daysUntilDue / 7);
    case "fortnightly":
      return Math.floor(daysUntilDue / 14);
    case "monthly":
      return Math.floor(daysUntilDue / 30);
    case "quarterly":
      return Math.floor(daysUntilDue / 90);
    case "annually":
      return Math.floor(daysUntilDue / 365);
    default:
      return 0;
  }
}

/**
 * Calculate target amount needed by due date based on bill frequency
 */
export function calculateTargetByDueDate(
  billAmount: number,
  billFrequency: PayFrequency,
  dueDate: Date | string
): number {
  // For one-time bills or bills with a specific due date,
  // the target is simply the bill amount
  return billAmount;
}

/**
 * Calculate per-pay amount needed to save for a bill
 */
export function calculatePerPayAmount(
  billAmount: number,
  billFrequency: PayFrequency,
  incomeFrequency: PayFrequency,
  daysUntilDue?: number
): number {
  // If bill is ongoing (e.g., groceries), calculate based on frequency match
  if (!daysUntilDue || daysUntilDue > 365) {
    // Convert bill frequency to weekly equivalent
    let billPerWeek = 0;
    switch (billFrequency) {
      case "weekly":
        billPerWeek = billAmount;
        break;
      case "fortnightly":
        billPerWeek = billAmount / 2;
        break;
      case "monthly":
        billPerWeek = billAmount / 4.33; // Average weeks per month
        break;
      case "quarterly":
        billPerWeek = billAmount / 13;
        break;
      case "annually":
        billPerWeek = billAmount / 52;
        break;
    }

    // Convert to income frequency
    switch (incomeFrequency) {
      case "weekly":
        return billPerWeek;
      case "fortnightly":
        return billPerWeek * 2;
      case "monthly":
        return billPerWeek * 4.33;
      case "quarterly":
        return billPerWeek * 13;
      case "annually":
        return billPerWeek * 52;
    }
  }

  // If bill has a due date, calculate how much needed per pay
  const payPeriodsRemaining = calculatePayPeriodsRemaining(incomeFrequency, daysUntilDue);
  if (payPeriodsRemaining <= 0) return billAmount;

  return billAmount / payPeriodsRemaining;
}

/**
 * Generate actionable suggestions for closing a funding gap
 */
export function generateSuggestions(
  gap: number,
  envelope: Envelope,
  incomes: RecurringIncome[],
  daysUntilDue: number
): Suggestion[] {
  if (gap <= 0) return [];

  const suggestions: Suggestion[] = [];
  const primaryIncome = incomes[0]; // Assume first income is primary

  if (primaryIncome && daysUntilDue > 0) {
    const payPeriodsRemaining = calculatePayPeriodsRemaining(primaryIncome.frequency, daysUntilDue);

    if (payPeriodsRemaining > 0) {
      const increaseNeeded = Math.ceil(gap / payPeriodsRemaining);
      suggestions.push({
        type: "increase_allocation",
        message: `Increase allocation by $${increaseNeeded} per pay to close gap`,
        action_amount: increaseNeeded,
      });
    }
  }

  suggestions.push({
    type: "one_time_income",
    message: `Find one-time income of $${Math.ceil(gap)} (sell items, extra shifts, etc.)`,
    action_amount: Math.ceil(gap),
  });

  suggestions.push({
    type: "reduce_bill",
    message: `Reduce bill amount or find cheaper alternative`,
  });

  if (daysUntilDue > 7) {
    suggestions.push({
      type: "extend_due_date",
      message: `Contact provider about payment plan or later due date`,
    });
  }

  suggestions.push({
    type: "lifestyle_change",
    message: `Consider lifestyle changes to reduce this expense`,
  });

  return suggestions;
}

/**
 * Main function: Calculate cashflow prediction for an envelope
 */
export function calculateEnvelopePrediction(
  envelope: Envelope,
  recurringIncomes: RecurringIncome[],
  currentBalance: number,
  endDate?: Date | string
): EnvelopePrediction {
  // Default end date is the envelope due date or 30 days from now
  const calculationEndDate = endDate
    ? new Date(endDate)
    : envelope.due_date
    ? new Date(envelope.due_date)
    : addDays(new Date(), 30);

  // 1. Calculate target amount needed by due date
  const targetAmount =
    envelope.target_amount ||
    (envelope.bill_amount && envelope.frequency
      ? calculateTargetByDueDate(envelope.bill_amount, envelope.frequency, calculationEndDate)
      : 0);

  // 2. Find all future income that funds this envelope
  const futureIncome: FutureIncome[] = [];

  for (const income of recurringIncomes) {
    const allocation = income.allocation?.find((a) => a.envelopeId === envelope.id);
    if (!allocation || allocation.amount <= 0) continue;

    // Calculate all pay dates until end date
    const payDates = calculatePayDates(income.frequency, income.next_date, calculationEndDate);

    for (const payDate of payDates) {
      futureIncome.push({
        date: payDate,
        source: income.name,
        income_id: income.id,
        amount: allocation.amount,
      });
    }
  }

  // 3. Calculate projected balance
  const futureTotal = futureIncome.reduce((sum, fi) => sum + fi.amount, 0);
  const projectedBalance = currentBalance + futureTotal;

  // 4. Calculate gap
  const gap = targetAmount - projectedBalance;

  // 5. Determine status
  const daysUntilDue = envelope.due_date
    ? differenceInDays(new Date(envelope.due_date), new Date())
    : 999;

  let status: EnvelopeStatus;
  if (gap <= 0) {
    status = gap < -10 ? "overfunded" : "on_track";
  } else if (gap > 0 && daysUntilDue > 14) {
    status = "behind";
  } else {
    status = "critical";
  }

  // 6. Generate actionable suggestions
  const suggestions = generateSuggestions(gap, envelope, recurringIncomes, daysUntilDue);

  return {
    envelope_id: envelope.id,
    current_balance: currentBalance,
    projected_balance: projectedBalance,
    target_amount: targetAmount,
    gap,
    status,
    days_until_due: daysUntilDue,
    future_income: futureIncome.sort((a, b) => a.date.getTime() - b.date.getTime()),
    suggestions,
  };
}

/**
 * Calculate predictions for all envelopes
 */
export function calculateAllPredictions(
  envelopes: Envelope[],
  recurringIncomes: RecurringIncome[],
  envelopeBalances: Map<string, number>
): EnvelopePrediction[] {
  return envelopes.map((envelope) => {
    const currentBalance = envelopeBalances.get(envelope.id) || 0;
    return calculateEnvelopePrediction(envelope, recurringIncomes, currentBalance);
  });
}
