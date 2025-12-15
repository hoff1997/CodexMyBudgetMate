/**
 * Interest Calculator Utilities
 *
 * Functions for calculating credit card interest, payoff projections,
 * and comparing different payment scenarios.
 */

import type { PayoffProjection, PayoffComparison, ProjectionType } from '@/lib/types/credit-card-onboarding';

// =====================================================
// BASIC INTEREST CALCULATIONS
// =====================================================

/**
 * Calculate monthly interest on a balance
 * @param balance - Current balance (positive number)
 * @param apr - Annual Percentage Rate (e.g., 18.99 for 18.99%)
 * @returns Monthly interest amount
 */
export function calculateMonthlyInterest(balance: number, apr: number): number {
  if (balance <= 0 || apr <= 0) {
    return 0;
  }

  const monthlyRate = apr / 100 / 12;
  return balance * monthlyRate;
}

/**
 * Calculate daily interest on a balance
 * @param balance - Current balance (positive number)
 * @param apr - Annual Percentage Rate
 * @returns Daily interest amount
 */
export function calculateDailyInterest(balance: number, apr: number): number {
  if (balance <= 0 || apr <= 0) {
    return 0;
  }

  const dailyRate = apr / 100 / 365;
  return balance * dailyRate;
}

/**
 * Calculate average daily balance interest (more accurate method)
 * @param balances - Array of daily balances
 * @param apr - Annual Percentage Rate
 * @param daysInPeriod - Number of days in the billing period
 * @returns Interest for the period
 */
export function calculateAverageDailyBalanceInterest(
  balances: number[],
  apr: number,
  daysInPeriod: number
): number {
  if (balances.length === 0 || apr <= 0) {
    return 0;
  }

  const averageBalance = balances.reduce((sum, bal) => sum + bal, 0) / balances.length;
  const dailyRate = apr / 100 / 365;

  return averageBalance * dailyRate * daysInPeriod;
}

// =====================================================
// PAYOFF PROJECTIONS
// =====================================================

/**
 * Calculate payoff projection for a credit card
 * @param balance - Current balance (positive number)
 * @param apr - Annual Percentage Rate
 * @param monthlyPayment - Monthly payment amount
 * @param projectionType - Type of projection
 * @returns Payoff projection details
 */
export function calculatePayoffProjection(
  balance: number,
  apr: number,
  monthlyPayment: number,
  projectionType: ProjectionType = 'current_payment'
): PayoffProjection {
  const startDate = new Date();

  // Handle edge cases
  if (balance <= 0) {
    return {
      accountId: '',
      monthlyPaymentAmount: monthlyPayment,
      aprUsed: apr,
      startingBalance: balance,
      projectedPayoffDate: startDate,
      totalInterestProjected: 0,
      totalPaymentsProjected: 0,
      monthsToPayoff: 0,
      projectionType,
      calculatedAt: startDate,
    };
  }

  if (monthlyPayment <= 0) {
    return {
      accountId: '',
      monthlyPaymentAmount: monthlyPayment,
      aprUsed: apr,
      startingBalance: balance,
      projectedPayoffDate: null,
      totalInterestProjected: 0,
      totalPaymentsProjected: 0,
      monthsToPayoff: 9999,
      projectionType,
      calculatedAt: startDate,
    };
  }

  const monthlyRate = apr / 100 / 12;
  let currentBalance = balance;
  let months = 0;
  let totalInterest = 0;
  const maxMonths = 600; // 50 years max

  while (currentBalance > 0 && months < maxMonths) {
    const interest = currentBalance * monthlyRate;
    totalInterest += interest;

    // Check if payment doesn't cover interest
    if (interest >= monthlyPayment && months > 0) {
      return {
        accountId: '',
        monthlyPaymentAmount: monthlyPayment,
        aprUsed: apr,
        startingBalance: balance,
        projectedPayoffDate: null,
        totalInterestProjected: 0,
        totalPaymentsProjected: 0,
        monthsToPayoff: 9999,
        projectionType,
        calculatedAt: startDate,
      };
    }

    currentBalance = currentBalance + interest - monthlyPayment;
    months++;
  }

  // Handle overpayment in final month
  if (currentBalance < 0) {
    // We overpaid, adjust
    currentBalance = 0;
  }

  const payoffDate = new Date(startDate);
  payoffDate.setMonth(payoffDate.getMonth() + months);

  return {
    accountId: '',
    monthlyPaymentAmount: monthlyPayment,
    aprUsed: apr,
    startingBalance: balance,
    projectedPayoffDate: payoffDate,
    totalInterestProjected: Math.round(totalInterest * 100) / 100,
    totalPaymentsProjected: Math.round((balance + totalInterest) * 100) / 100,
    monthsToPayoff: months,
    projectionType,
    calculatedAt: startDate,
  };
}

/**
 * Calculate minimum payment for a balance
 * Common formulas: 2% of balance or $25, whichever is greater
 */
export function calculateMinimumPayment(
  balance: number,
  options: {
    percentageRate?: number;
    minimumFloor?: number;
    includeInterest?: boolean;
    apr?: number;
  } = {}
): number {
  const {
    percentageRate = 2,
    minimumFloor = 25,
    includeInterest = true,
    apr = 0,
  } = options;

  if (balance <= 0) {
    return 0;
  }

  let minPayment = balance * (percentageRate / 100);

  // Add monthly interest if applicable
  if (includeInterest && apr > 0) {
    const monthlyInterest = calculateMonthlyInterest(balance, apr);
    minPayment = Math.max(minPayment, monthlyInterest + 1); // At least cover interest + $1
  }

  // Apply floor
  minPayment = Math.max(minPayment, minimumFloor);

  // Don't exceed balance
  minPayment = Math.min(minPayment, balance);

  return Math.round(minPayment * 100) / 100;
}

// =====================================================
// COMPARISON & OPTIMIZATION
// =====================================================

/**
 * Calculate interest savings between two payment scenarios
 */
export function calculateInterestSavings(
  balance: number,
  apr: number,
  currentPayment: number,
  newPayment: number
): { monthsSaved: number; interestSaved: number } {
  const currentProjection = calculatePayoffProjection(balance, apr, currentPayment);
  const newProjection = calculatePayoffProjection(balance, apr, newPayment);

  // Handle cases where payoff isn't possible
  if (currentProjection.monthsToPayoff === 9999 || newProjection.monthsToPayoff === 9999) {
    return {
      monthsSaved: 0,
      interestSaved: 0,
    };
  }

  return {
    monthsSaved: currentProjection.monthsToPayoff - newProjection.monthsToPayoff,
    interestSaved: Math.round(
      (currentProjection.totalInterestProjected - newProjection.totalInterestProjected) * 100
    ) / 100,
  };
}

/**
 * Compare two payment scenarios
 */
export function comparePaymentScenarios(
  balance: number,
  apr: number,
  currentPayment: number,
  alternativePayment: number
): PayoffComparison {
  const current = calculatePayoffProjection(balance, apr, currentPayment, 'current_payment');
  const alternative = calculatePayoffProjection(balance, apr, alternativePayment, 'custom');

  let monthsSaved = 0;
  let interestSaved = 0;

  if (current.monthsToPayoff !== 9999 && alternative.monthsToPayoff !== 9999) {
    monthsSaved = current.monthsToPayoff - alternative.monthsToPayoff;
    interestSaved = current.totalInterestProjected - alternative.totalInterestProjected;
  }

  return {
    current,
    alternative,
    monthsSaved,
    interestSaved: Math.round(interestSaved * 100) / 100,
    additionalMonthlyPayment: alternativePayment - currentPayment,
  };
}

/**
 * Calculate the payment needed to pay off in a specific number of months
 */
export function calculatePaymentForPayoffInMonths(
  balance: number,
  apr: number,
  targetMonths: number
): number {
  if (balance <= 0 || targetMonths <= 0) {
    return 0;
  }

  if (apr === 0) {
    return Math.ceil((balance / targetMonths) * 100) / 100;
  }

  const monthlyRate = apr / 100 / 12;

  // Use the annuity payment formula: P = (r * PV) / (1 - (1 + r)^-n)
  const payment = (monthlyRate * balance) / (1 - Math.pow(1 + monthlyRate, -targetMonths));

  return Math.ceil(payment * 100) / 100;
}

/**
 * Calculate when debt-free date would be with extra payment
 */
export function calculateDebtFreeDate(
  balance: number,
  apr: number,
  monthlyPayment: number,
  extraPayment: number = 0
): Date | null {
  const projection = calculatePayoffProjection(balance, apr, monthlyPayment + extraPayment);
  return projection.projectedPayoffDate;
}

// =====================================================
// MULTI-CARD OPTIMIZATION
// =====================================================

interface CardDebt {
  accountId: string;
  balance: number;
  apr: number;
  minimumPayment: number;
}

/**
 * Calculate optimal payment distribution using avalanche method (highest APR first)
 */
export function calculateAvalanchePayments(
  cards: CardDebt[],
  totalMonthlyBudget: number
): Map<string, number> {
  const payments = new Map<string, number>();

  // Sort by APR descending
  const sortedCards = [...cards].sort((a, b) => b.apr - a.apr);

  // First, allocate minimum payments to all cards
  let remaining = totalMonthlyBudget;
  for (const card of sortedCards) {
    const minPayment = Math.min(card.minimumPayment, card.balance);
    payments.set(card.accountId, minPayment);
    remaining -= minPayment;
  }

  // Then, allocate remaining to highest APR card
  for (const card of sortedCards) {
    if (remaining <= 0) break;

    const currentPayment = payments.get(card.accountId) || 0;
    const maxAdditional = card.balance - currentPayment;

    if (maxAdditional > 0) {
      const additional = Math.min(remaining, maxAdditional);
      payments.set(card.accountId, currentPayment + additional);
      remaining -= additional;
    }
  }

  return payments;
}

/**
 * Calculate optimal payment distribution using snowball method (lowest balance first)
 */
export function calculateSnowballPayments(
  cards: CardDebt[],
  totalMonthlyBudget: number
): Map<string, number> {
  const payments = new Map<string, number>();

  // Sort by balance ascending
  const sortedCards = [...cards].sort((a, b) => a.balance - b.balance);

  // First, allocate minimum payments to all cards
  let remaining = totalMonthlyBudget;
  for (const card of sortedCards) {
    const minPayment = Math.min(card.minimumPayment, card.balance);
    payments.set(card.accountId, minPayment);
    remaining -= minPayment;
  }

  // Then, allocate remaining to lowest balance card
  for (const card of sortedCards) {
    if (remaining <= 0) break;

    const currentPayment = payments.get(card.accountId) || 0;
    const maxAdditional = card.balance - currentPayment;

    if (maxAdditional > 0) {
      const additional = Math.min(remaining, maxAdditional);
      payments.set(card.accountId, currentPayment + additional);
      remaining -= additional;
    }
  }

  return payments;
}

/**
 * Compare avalanche vs snowball strategies
 */
export function comparePayoffStrategies(
  cards: CardDebt[],
  totalMonthlyBudget: number
): {
  avalanche: { totalInterest: number; monthsToPayoff: number };
  snowball: { totalInterest: number; monthsToPayoff: number };
  interestDifference: number;
  monthsDifference: number;
  recommended: 'avalanche' | 'snowball';
} {
  // Simulate both strategies
  const avalancheResult = simulatePayoffStrategy(cards, totalMonthlyBudget, 'avalanche');
  const snowballResult = simulatePayoffStrategy(cards, totalMonthlyBudget, 'snowball');

  const interestDifference = snowballResult.totalInterest - avalancheResult.totalInterest;
  const monthsDifference = snowballResult.monthsToPayoff - avalancheResult.monthsToPayoff;

  return {
    avalanche: avalancheResult,
    snowball: snowballResult,
    interestDifference: Math.round(interestDifference * 100) / 100,
    monthsDifference,
    recommended: interestDifference > 50 ? 'avalanche' : 'snowball', // Recommend avalanche if significant savings
  };
}

function simulatePayoffStrategy(
  cards: CardDebt[],
  totalMonthlyBudget: number,
  strategy: 'avalanche' | 'snowball'
): { totalInterest: number; monthsToPayoff: number } {
  // Clone cards for simulation
  const simCards = cards.map(c => ({ ...c }));
  let totalInterest = 0;
  let months = 0;
  const maxMonths = 600;

  while (simCards.some(c => c.balance > 0) && months < maxMonths) {
    // Get payments for this month
    const payments = strategy === 'avalanche'
      ? calculateAvalanchePayments(simCards, totalMonthlyBudget)
      : calculateSnowballPayments(simCards, totalMonthlyBudget);

    // Apply interest and payments
    for (const card of simCards) {
      if (card.balance <= 0) continue;

      // Add interest
      const interest = calculateMonthlyInterest(card.balance, card.apr);
      totalInterest += interest;
      card.balance += interest;

      // Apply payment
      const payment = payments.get(card.accountId) || 0;
      card.balance = Math.max(0, card.balance - payment);
    }

    months++;
  }

  return {
    totalInterest: Math.round(totalInterest * 100) / 100,
    monthsToPayoff: months,
  };
}
