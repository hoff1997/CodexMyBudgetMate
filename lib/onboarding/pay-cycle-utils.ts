/**
 * Utility functions for pay cycle calculations
 */

export type PayFrequency = "weekly" | "fortnightly" | "twice_monthly" | "monthly";
export type BillFrequency = "monthly" | "quarterly" | "annual" | "custom";

// Pay cycles per year
const PAY_CYCLES_PER_YEAR: Record<PayFrequency, number> = {
  weekly: 52,
  fortnightly: 26,
  twice_monthly: 24,
  monthly: 12,
};

// Bill frequency to months conversion
const BILL_FREQUENCY_MONTHS: Record<BillFrequency, number> = {
  monthly: 1,
  quarterly: 3,
  annual: 12,
  custom: 1, // Default to monthly for custom
};

/**
 * Calculate how much to allocate per paycheck for an envelope
 * @param amount - The bill/budget amount
 * @param billFrequency - How often the bill occurs
 * @param payFrequency - How often the user gets paid
 * @returns Amount to allocate per paycheck
 */
export function calculatePayCycleAmount(
  amount: number,
  billFrequency: BillFrequency | string,
  payFrequency: PayFrequency
): number {
  if (amount <= 0) return 0;

  // Get cycles per year
  const payCyclesPerYear = PAY_CYCLES_PER_YEAR[payFrequency];

  // Convert bill amount to annual amount
  const months = BILL_FREQUENCY_MONTHS[billFrequency as BillFrequency] || 1;
  const annualAmount = (amount * 12) / months;

  // Divide annual amount by pay cycles
  const payCycleAmount = annualAmount / payCyclesPerYear;

  return Math.round(payCycleAmount * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate total monthly allocation from all envelopes
 */
export function calculateTotalMonthlyAllocation(
  envelopes: Array<{ payCycleAmount?: number }>,
  payFrequency: PayFrequency
): number {
  const payCyclesPerYear = PAY_CYCLES_PER_YEAR[payFrequency];
  const totalPerCycle = envelopes.reduce((sum, env) => sum + (env.payCycleAmount || 0), 0);
  const monthlyTotal = (totalPerCycle * payCyclesPerYear) / 12;

  return Math.round(monthlyTotal * 100) / 100;
}

/**
 * Calculate remaining income after envelope allocations
 */
export function calculateRemainingIncome(
  totalIncome: number,
  totalAllocation: number
): number {
  return Math.round((totalIncome - totalAllocation) * 100) / 100;
}
