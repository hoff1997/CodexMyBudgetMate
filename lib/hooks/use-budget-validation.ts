import { useMemo } from "react";

export type BudgetStatus = 'balanced' | 'surplus' | 'overspent';

export interface BudgetValidation {
  totalIncome: number;
  totalAllocated: number;
  difference: number;
  status: BudgetStatus;
  isBalanced: boolean;
  canSave: boolean;
  hasSurplus: boolean;
  isOverspent: boolean;
  message: string;
}

/**
 * Hook to validate budget state and provide helpful status information
 *
 * @param totalIncome - Total income from all sources
 * @param totalAllocated - Total amount allocated across all envelopes
 * @returns BudgetValidation object with status and helper flags
 */
export function useBudgetValidation(
  totalIncome: number,
  totalAllocated: number
): BudgetValidation {
  return useMemo(() => {
    const difference = totalIncome - totalAllocated;

    // Determine status
    let status: BudgetStatus;
    if (Math.abs(difference) < 0.01) {
      status = 'balanced';
    } else if (difference > 0) {
      status = 'surplus';
    } else {
      status = 'overspent';
    }

    const isBalanced = status === 'balanced';
    const hasSurplus = difference > 0.01;
    const isOverspent = difference < -0.01;
    const canSave = !isOverspent; // Can save if balanced or has surplus

    // Generate helpful message
    let message: string;
    if (isBalanced) {
      message = 'Your budget is perfectly balanced!';
    } else if (hasSurplus) {
      message = `You have $${difference.toFixed(2)} unallocated. Consider allocating to Surplus.`;
    } else {
      message = `Your budget is overspent by $${Math.abs(difference).toFixed(2)}. Please adjust allocations.`;
    }

    return {
      totalIncome,
      totalAllocated,
      difference,
      status,
      isBalanced,
      canSave,
      hasSurplus,
      isOverspent,
      message,
    };
  }, [totalIncome, totalAllocated]);
}

/**
 * Get income source breakdown of unallocated amounts
 *
 * @param incomeSources - Array of income sources with their amounts and allocations
 * @returns Array of income sources with unallocated amounts
 */
export function calculateUnallocatedBySource(
  incomeSources: Array<{
    id: string;
    name: string;
    amount: number;
    totalAllocated: number;
  }>
): Array<{
  id: string;
  name: string;
  amount: number; // Unallocated amount
}> {
  return incomeSources
    .map(source => ({
      id: source.id,
      name: source.name,
      amount: source.amount - source.totalAllocated,
    }))
    .filter(source => source.amount > 0.01);
}
