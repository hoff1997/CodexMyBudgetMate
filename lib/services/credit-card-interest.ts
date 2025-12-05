/**
 * Credit Card Interest Calculation Service
 *
 * Handles interest calculation and tracking for credit card accounts.
 * Supports:
 * - Daily/monthly interest calculation
 * - Average Daily Balance method
 * - Interest transaction creation
 * - Interest charge history tracking
 */

export interface CreditCardAccount {
  id: string;
  name: string;
  current_balance: number; // Negative for credit cards (debt)
  apr?: number | null; // Annual Percentage Rate (e.g., 18.99)
  last_interest_charge_date?: string | null;
  last_interest_amount?: number | null;
}

export interface InterestCalculationResult {
  interestAmount: number;
  dailyRate: number;
  daysInPeriod: number;
  averageDailyBalance: number;
  balanceBefore: number;
  balanceAfter: number;
}

export interface InterestChargeRecord {
  accountId: string;
  chargeDate: string; // ISO date string
  interestAmount: number;
  dailyRate: number;
  daysInPeriod: number;
  averageDailyBalance: number;
  balanceBefore: number;
  balanceAfter: number;
  aprUsed: number;
}

/**
 * Calculate daily interest rate from APR
 * @param apr Annual Percentage Rate (e.g., 18.99 for 18.99%)
 * @returns Daily interest rate as a decimal (e.g., 0.00052 for 18.99% APR)
 */
export function calculateDailyRate(apr: number): number {
  return apr / 100 / 365;
}

/**
 * Calculate monthly interest charge using Average Daily Balance method
 *
 * Formula: Interest = Average Daily Balance × Daily Rate × Days in Period
 *
 * @param account Credit card account with balance and APR
 * @param averageDailyBalance Average balance over the statement period
 * @param daysInPeriod Number of days in the billing cycle (typically 28-31)
 * @returns Interest calculation result
 */
export function calculateMonthlyInterest(
  account: CreditCardAccount,
  averageDailyBalance: number,
  daysInPeriod: number = 30
): InterestCalculationResult {
  // If no APR is set, no interest
  if (!account.apr || account.apr <= 0) {
    return {
      interestAmount: 0,
      dailyRate: 0,
      daysInPeriod,
      averageDailyBalance,
      balanceBefore: Math.abs(account.current_balance),
      balanceAfter: Math.abs(account.current_balance),
    };
  }

  const dailyRate = calculateDailyRate(account.apr);
  const interestAmount = averageDailyBalance * dailyRate * daysInPeriod;

  // Credit card balances are stored as negative numbers
  const balanceBefore = Math.abs(account.current_balance);
  const balanceAfter = balanceBefore + interestAmount;

  return {
    interestAmount: Math.round(interestAmount * 100) / 100, // Round to 2 decimals
    dailyRate,
    daysInPeriod,
    averageDailyBalance,
    balanceBefore,
    balanceAfter,
  };
}

/**
 * Calculate interest using simple method (current balance)
 *
 * This is a simplified version that uses the current balance rather than
 * average daily balance. Useful for quick estimates.
 *
 * @param account Credit card account
 * @param daysInPeriod Number of days since last interest charge
 * @returns Interest calculation result
 */
export function calculateSimpleInterest(
  account: CreditCardAccount,
  daysInPeriod: number = 30
): InterestCalculationResult {
  const currentBalance = Math.abs(account.current_balance);
  return calculateMonthlyInterest(account, currentBalance, daysInPeriod);
}

/**
 * Calculate days since last interest charge
 *
 * @param lastChargeDate ISO date string of last interest charge
 * @param currentDate Optional current date (defaults to today)
 * @returns Number of days since last charge
 */
export function daysSinceLastCharge(
  lastChargeDate: string | null | undefined,
  currentDate: Date = new Date()
): number {
  if (!lastChargeDate) {
    // If never charged, assume 30 days
    return 30;
  }

  const lastDate = new Date(lastChargeDate);
  const diffTime = currentDate.getTime() - lastDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
}

/**
 * Check if interest should be charged based on last charge date
 *
 * @param lastChargeDate ISO date string of last interest charge
 * @param statementDay Day of month when statement closes (1-31)
 * @param currentDate Optional current date (defaults to today)
 * @returns True if interest should be charged
 */
export function shouldChargeInterest(
  lastChargeDate: string | null | undefined,
  statementDay: number = 1,
  currentDate: Date = new Date()
): boolean {
  const currentDay = currentDate.getDate();

  // If never charged before, charge if we've passed the statement day
  if (!lastChargeDate) {
    return currentDay >= statementDay;
  }

  const lastDate = new Date(lastChargeDate);
  const monthsSinceCharge =
    (currentDate.getFullYear() - lastDate.getFullYear()) * 12 +
    (currentDate.getMonth() - lastDate.getMonth());

  // Charge if it's been at least a month and we're past the statement day
  return monthsSinceCharge >= 1 && currentDay >= statementDay;
}

/**
 * Calculate interest for multiple credit card accounts
 *
 * @param accounts Array of credit card accounts
 * @param daysInPeriod Number of days in billing cycle
 * @returns Array of interest calculation results
 */
export function calculateInterestForAccounts(
  accounts: CreditCardAccount[],
  daysInPeriod: number = 30
): Array<InterestCalculationResult & { accountId: string; accountName: string }> {
  return accounts
    .filter(account => account.apr && account.apr > 0)
    .map(account => ({
      accountId: account.id,
      accountName: account.name,
      ...calculateSimpleInterest(account, daysInPeriod),
    }));
}

/**
 * Get total interest across all accounts
 *
 * @param accounts Array of credit card accounts
 * @param daysInPeriod Number of days in billing cycle
 * @returns Total interest amount
 */
export function getTotalInterest(
  accounts: CreditCardAccount[],
  daysInPeriod: number = 30
): number {
  const results = calculateInterestForAccounts(accounts, daysInPeriod);
  return results.reduce((sum, result) => sum + result.interestAmount, 0);
}

/**
 * Project future balance with interest
 *
 * @param currentBalance Current credit card balance (positive number)
 * @param apr Annual Percentage Rate
 * @param monthlyPayment Expected monthly payment amount
 * @param months Number of months to project
 * @returns Array of projected balances by month
 */
export function projectBalanceWithInterest(
  currentBalance: number,
  apr: number,
  monthlyPayment: number,
  months: number
): Array<{
  month: number;
  balance: number;
  interestCharged: number;
  principalPaid: number;
  paymentAmount: number;
}> {
  const projections: Array<{
    month: number;
    balance: number;
    interestCharged: number;
    principalPaid: number;
    paymentAmount: number;
  }> = [];

  let balance = currentBalance;
  const monthlyRate = apr / 100 / 12;

  for (let month = 1; month <= months; month++) {
    if (balance <= 0) {
      // Paid off
      projections.push({
        month,
        balance: 0,
        interestCharged: 0,
        principalPaid: 0,
        paymentAmount: 0,
      });
      continue;
    }

    // Calculate interest for this month
    const interestCharged = balance * monthlyRate;
    const newBalance = balance + interestCharged;

    // Apply payment
    const paymentAmount = Math.min(monthlyPayment, newBalance);
    const principalPaid = paymentAmount - interestCharged;
    balance = Math.max(0, newBalance - paymentAmount);

    projections.push({
      month,
      balance: Math.round(balance * 100) / 100,
      interestCharged: Math.round(interestCharged * 100) / 100,
      principalPaid: Math.round(principalPaid * 100) / 100,
      paymentAmount: Math.round(paymentAmount * 100) / 100,
    });
  }

  return projections;
}

/**
 * Calculate months to payoff with given payment amount
 *
 * @param currentBalance Current credit card balance
 * @param apr Annual Percentage Rate
 * @param monthlyPayment Monthly payment amount
 * @param maxMonths Maximum months to calculate (default 360 = 30 years)
 * @returns Number of months to pay off, or null if payment is too small
 */
export function calculateMonthsToPayoff(
  currentBalance: number,
  apr: number,
  monthlyPayment: number,
  maxMonths: number = 360
): number | null {
  if (currentBalance <= 0) return 0;

  const monthlyRate = apr / 100 / 12;
  const minPayment = currentBalance * monthlyRate;

  // Payment must be greater than monthly interest to make progress
  if (monthlyPayment <= minPayment) {
    return null; // Will never pay off
  }

  let balance = currentBalance;
  let months = 0;

  while (balance > 0 && months < maxMonths) {
    const interest = balance * monthlyRate;
    balance = balance + interest - monthlyPayment;
    months++;
  }

  return months < maxMonths ? months : null;
}

/**
 * Calculate total interest paid over payoff period
 *
 * @param currentBalance Current credit card balance
 * @param apr Annual Percentage Rate
 * @param monthlyPayment Monthly payment amount
 * @returns Total interest that will be paid, or null if won't pay off
 */
export function calculateTotalInterestPaid(
  currentBalance: number,
  apr: number,
  monthlyPayment: number
): number | null {
  const months = calculateMonthsToPayoff(currentBalance, apr, monthlyPayment);

  if (months === null) return null;

  const projections = projectBalanceWithInterest(
    currentBalance,
    apr,
    monthlyPayment,
    months
  );

  return projections.reduce((sum, p) => sum + p.interestCharged, 0);
}
