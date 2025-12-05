/**
 * Credit Card Payment Strategy Service
 *
 * Implements various debt payoff strategies:
 * - Pay Off: Pay full balance monthly (no debt accumulation)
 * - Minimum Only: Pay only minimum payments
 * - Avalanche: Pay minimums + extra to highest APR card
 * - Snowball: Pay minimums + extra to lowest balance card
 * - Custom: User-defined priority order
 *
 * Also calculates surplus available for debt paydown after budgeted expenses.
 */

import { calculateMonthsToPayoff, calculateTotalInterestPaid } from './credit-card-interest';

export type PaymentStrategy = 'pay_off' | 'minimum_only' | 'avalanche' | 'snowball' | 'custom';

export interface CreditCardForStrategy {
  id: string;
  name: string;
  currentBalance: number; // Positive number (debt amount)
  apr: number;
  minimumPayment: number;
  creditLimit?: number;
  payoffPriority?: number; // For custom strategy
}

export interface PaymentAllocation {
  accountId: string;
  accountName: string;
  minimumPayment: number;
  extraPayment: number;
  totalPayment: number;
  isTargetCard: boolean; // The card receiving extra payments
}

export interface PaymentStrategyResult {
  strategy: PaymentStrategy;
  totalMinimumPayment: number;
  surplusAvailable: number;
  surplusAllocated: number;
  allocations: PaymentAllocation[];
  projectedPayoffMonths: number | null;
  projectedTotalInterest: number | null;
  targetCardId: string | null; // The card being focused on
}

/**
 * Calculate minimum payment for a credit card
 *
 * Uses the account's configured minimum payment, or falls back to
 * a default of 2% of balance or $25, whichever is greater.
 *
 * @param account Credit card account
 * @returns Minimum payment amount
 */
export function calculateMinimumPayment(account: CreditCardForStrategy): number {
  if (account.minimumPayment && account.minimumPayment > 0) {
    return account.minimumPayment;
  }

  // Default: 2% of balance or $25, whichever is greater
  const percentagePayment = account.currentBalance * 0.02;
  return Math.max(percentagePayment, 25);
}

/**
 * Calculate total minimum payments across all cards
 *
 * @param accounts Array of credit card accounts
 * @returns Total minimum payment amount
 */
export function calculateTotalMinimumPayment(accounts: CreditCardForStrategy[]): number {
  return accounts.reduce((sum, account) => {
    return sum + calculateMinimumPayment(account);
  }, 0);
}

/**
 * Sort cards by Avalanche method (highest APR first)
 *
 * @param accounts Array of credit card accounts
 * @returns Sorted array (highest APR first)
 */
export function sortByAvalanche(accounts: CreditCardForStrategy[]): CreditCardForStrategy[] {
  return [...accounts].sort((a, b) => b.apr - a.apr);
}

/**
 * Sort cards by Snowball method (lowest balance first)
 *
 * @param accounts Array of credit card accounts
 * @returns Sorted array (lowest balance first)
 */
export function sortBySnowball(accounts: CreditCardForStrategy[]): CreditCardForStrategy[] {
  return [...accounts].sort((a, b) => a.currentBalance - b.currentBalance);
}

/**
 * Sort cards by custom priority (lowest priority number first)
 *
 * @param accounts Array of credit card accounts
 * @returns Sorted array (lowest priority number first)
 */
export function sortByCustomPriority(accounts: CreditCardForStrategy[]): CreditCardForStrategy[] {
  return [...accounts].sort((a, b) => {
    const aPriority = a.payoffPriority ?? 999;
    const bPriority = b.payoffPriority ?? 999;
    return aPriority - bPriority;
  });
}

/**
 * Distribute surplus funds according to payment strategy
 *
 * @param accounts Array of credit card accounts
 * @param strategy Payment strategy to use
 * @param surplusAvailable Total surplus available for extra payments
 * @returns Payment allocations for each account
 */
export function distributePayments(
  accounts: CreditCardForStrategy[],
  strategy: PaymentStrategy,
  surplusAvailable: number
): PaymentAllocation[] {
  if (accounts.length === 0) {
    return [];
  }

  // Pay Off strategy: allocate full balance to each card
  if (strategy === 'pay_off') {
    return accounts.map(account => ({
      accountId: account.id,
      accountName: account.name,
      minimumPayment: 0,
      extraPayment: account.currentBalance,
      totalPayment: account.currentBalance,
      isTargetCard: false,
    }));
  }

  // Calculate minimum payments for all accounts
  const allocations: PaymentAllocation[] = accounts.map(account => ({
    accountId: account.id,
    accountName: account.name,
    minimumPayment: calculateMinimumPayment(account),
    extraPayment: 0,
    totalPayment: calculateMinimumPayment(account),
    isTargetCard: false,
  }));

  // Minimum Only strategy: no extra payments
  if (strategy === 'minimum_only') {
    return allocations;
  }

  // Determine target card based on strategy
  let sortedAccounts: CreditCardForStrategy[];

  switch (strategy) {
    case 'avalanche':
      sortedAccounts = sortByAvalanche(accounts);
      break;
    case 'snowball':
      sortedAccounts = sortBySnowball(accounts);
      break;
    case 'custom':
      sortedAccounts = sortByCustomPriority(accounts);
      break;
    default:
      sortedAccounts = accounts;
  }

  // Allocate surplus to target cards
  let remainingSurplus = surplusAvailable;

  for (const targetAccount of sortedAccounts) {
    if (remainingSurplus <= 0) break;

    // Find the allocation for this account
    const allocation = allocations.find(a => a.accountId === targetAccount.id);
    if (!allocation) continue;

    // Calculate how much extra payment can go to this card
    const maxExtraPayment = targetAccount.currentBalance - allocation.minimumPayment;
    const extraPayment = Math.min(maxExtraPayment, remainingSurplus);

    if (extraPayment > 0) {
      allocation.extraPayment = extraPayment;
      allocation.totalPayment = allocation.minimumPayment + extraPayment;
      allocation.isTargetCard = true;
      remainingSurplus -= extraPayment;

      // If this card can be paid off completely with surplus, continue to next card
      if (extraPayment < maxExtraPayment) {
        // Surplus exhausted, this is the main target
        break;
      }
    }
  }

  return allocations;
}

/**
 * Calculate payment strategy result with projections
 *
 * @param accounts Array of credit card accounts
 * @param strategy Payment strategy to use
 * @param surplusAvailable Total surplus available for extra payments
 * @returns Complete payment strategy result with projections
 */
export function calculatePaymentStrategy(
  accounts: CreditCardForStrategy[],
  strategy: PaymentStrategy,
  surplusAvailable: number
): PaymentStrategyResult {
  if (accounts.length === 0) {
    return {
      strategy,
      totalMinimumPayment: 0,
      surplusAvailable: 0,
      surplusAllocated: 0,
      allocations: [],
      projectedPayoffMonths: 0,
      projectedTotalInterest: 0,
      targetCardId: null,
    };
  }

  const totalMinimumPayment = calculateTotalMinimumPayment(accounts);
  const allocations = distributePayments(accounts, strategy, surplusAvailable);

  // Calculate surplus actually allocated
  const surplusAllocated = allocations.reduce((sum, a) => sum + a.extraPayment, 0);

  // Find the target card (receiving extra payments)
  const targetAllocation = allocations.find(a => a.isTargetCard);
  const targetCardId = targetAllocation?.accountId || null;

  // Project payoff time and total interest
  // For simplicity, project based on the target card if using avalanche/snowball/custom
  // For pay_off, it's immediate (0 months)
  // For minimum_only, calculate based on minimum payments
  let projectedPayoffMonths: number | null = null;
  let projectedTotalInterest: number | null = null;

  if (strategy === 'pay_off') {
    projectedPayoffMonths = 0;
    projectedTotalInterest = 0;
  } else if (targetCardId) {
    const targetAccount = accounts.find(a => a.id === targetCardId);
    const targetAlloc = allocations.find(a => a.accountId === targetCardId);

    if (targetAccount && targetAlloc) {
      projectedPayoffMonths = calculateMonthsToPayoff(
        targetAccount.currentBalance,
        targetAccount.apr,
        targetAlloc.totalPayment
      );

      projectedTotalInterest = calculateTotalInterestPaid(
        targetAccount.currentBalance,
        targetAccount.apr,
        targetAlloc.totalPayment
      );
    }
  }

  return {
    strategy,
    totalMinimumPayment,
    surplusAvailable,
    surplusAllocated,
    allocations,
    projectedPayoffMonths,
    projectedTotalInterest,
    targetCardId,
  };
}

/**
 * Compare different payment strategies
 *
 * @param accounts Array of credit card accounts
 * @param surplusAvailable Total surplus available
 * @returns Results for each strategy
 */
export function compareStrategies(
  accounts: CreditCardForStrategy[],
  surplusAvailable: number
): Record<PaymentStrategy, PaymentStrategyResult> {
  const strategies: PaymentStrategy[] = ['pay_off', 'minimum_only', 'avalanche', 'snowball', 'custom'];

  const results: Record<string, PaymentStrategyResult> = {};

  for (const strategy of strategies) {
    results[strategy] = calculatePaymentStrategy(accounts, strategy, surplusAvailable);
  }

  return results as Record<PaymentStrategy, PaymentStrategyResult>;
}

/**
 * Calculate surplus available after budgeted expenses
 *
 * @param totalIncome Total income per pay cycle
 * @param totalBudgeted Total budgeted expenses (excluding CC payments)
 * @param totalMinimumPayments Total minimum CC payments required
 * @returns Surplus available for extra CC payments
 */
export function calculateSurplusForDebtPaydown(
  totalIncome: number,
  totalBudgeted: number,
  totalMinimumPayments: number
): number {
  // Surplus = Income - Budgeted Expenses - Minimum Payments
  const surplus = totalIncome - totalBudgeted - totalMinimumPayments;
  return Math.max(0, surplus);
}

/**
 * Get recommended payment strategy based on user's situation
 *
 * @param accounts Array of credit card accounts
 * @param surplusAvailable Surplus available for extra payments
 * @returns Recommended strategy and reason
 */
export function getRecommendedStrategy(
  accounts: CreditCardForStrategy[],
  surplusAvailable: number
): { strategy: PaymentStrategy; reason: string } {
  if (accounts.length === 0) {
    return {
      strategy: 'pay_off',
      reason: 'No credit cards to manage',
    };
  }

  const totalBalance = accounts.reduce((sum, a) => sum + a.currentBalance, 0);
  const totalMinimum = calculateTotalMinimumPayment(accounts);

  // If surplus can pay off all cards, recommend pay_off
  if (surplusAvailable >= totalBalance) {
    return {
      strategy: 'pay_off',
      reason: 'You have enough funds to pay off all cards completely this month!',
    };
  }

  // If no surplus, recommend minimum_only
  if (surplusAvailable < totalMinimum * 0.1) {
    // Less than 10% extra
    return {
      strategy: 'minimum_only',
      reason: 'Focus on building emergency savings before attacking debt aggressively',
    };
  }

  // If there's significant APR variation (>5%), recommend avalanche
  const aprValues = accounts.map(a => a.apr);
  const maxApr = Math.max(...aprValues);
  const minApr = Math.min(...aprValues);

  if (maxApr - minApr > 5) {
    return {
      strategy: 'avalanche',
      reason: 'Avalanche method will save you the most money on interest',
    };
  }

  // If balances are small, recommend snowball for motivation
  const avgBalance = totalBalance / accounts.length;
  if (avgBalance < 2000) {
    return {
      strategy: 'snowball',
      reason: 'Snowball method will help you see progress quickly with small balances',
    };
  }

  // Default to avalanche (saves most money)
  return {
    strategy: 'avalanche',
    reason: 'Avalanche method will minimize total interest paid',
  };
}

/**
 * Format payment strategy for display
 *
 * @param strategy Payment strategy enum value
 * @returns Human-readable strategy name
 */
export function formatStrategyName(strategy: PaymentStrategy): string {
  const names: Record<PaymentStrategy, string> = {
    pay_off: 'Pay Off Completely',
    minimum_only: 'Minimum Payments Only',
    avalanche: 'Avalanche (Highest APR First)',
    snowball: 'Snowball (Lowest Balance First)',
    custom: 'Custom Priority',
  };

  return names[strategy] || strategy;
}

/**
 * Get strategy description
 *
 * @param strategy Payment strategy enum value
 * @returns Strategy description
 */
export function getStrategyDescription(strategy: PaymentStrategy): string {
  const descriptions: Record<PaymentStrategy, string> = {
    pay_off: 'Pay the full balance on all credit cards every month to avoid interest charges.',
    minimum_only: 'Pay only the minimum required payment on each card. Use this if you need to preserve cash flow.',
    avalanche: 'Pay minimum on all cards, then put extra toward the card with the highest APR. Saves the most money on interest.',
    snowball: 'Pay minimum on all cards, then put extra toward the card with the lowest balance. Builds momentum with quick wins.',
    custom: 'Pay cards in your own preferred order using priority settings.',
  };

  return descriptions[strategy] || '';
}
