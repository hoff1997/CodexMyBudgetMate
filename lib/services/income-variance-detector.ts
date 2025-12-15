/**
 * Income Variance Detection Service
 *
 * Detects when actual income differs from expected income and provides
 * guidance on handling the variance (bonus, shortfall, permanent change).
 */

import type { IncomeSource } from "@/lib/types/unified-envelope";

/**
 * Represents a detected variance between expected and actual income
 */
export interface IncomeVariance {
  incomeSourceId: string;
  incomeSourceName: string;
  expectedAmount: number;     // The typical_amount from income source
  actualAmount: number;       // The actual transaction amount
  difference: number;         // positive = extra, negative = shortfall
  percentageChange: number;   // percentage difference from expected
  transactionId: string;
  varianceType: "bonus" | "shortfall";
}

/**
 * Configuration for variance detection thresholds
 */
export interface VarianceThresholdConfig {
  /** Minimum percentage difference to trigger variance detection (default: 1%) */
  percentageThreshold: number;
  /** Minimum absolute difference to trigger variance detection (default: $1) */
  absoluteThreshold: number;
}

const DEFAULT_THRESHOLDS: VarianceThresholdConfig = {
  percentageThreshold: 0.01, // 1%
  absoluteThreshold: 1.00,   // $1
};

/**
 * Detects if a transaction amount differs significantly from expected income
 *
 * @param transaction - The income transaction with amount and linked income source
 * @param incomeSource - The expected income source details
 * @param thresholds - Optional custom thresholds for variance detection
 * @returns IncomeVariance if variance detected, null otherwise
 *
 * @example
 * // Detect variance for a paycheck
 * const variance = detectIncomeVariance(
 *   { amount: 3200, income_source_id: 'abc', id: 'txn-123' },
 *   { id: 'abc', name: 'Primary Job', rawAmount: 3000, ... }
 * );
 * // Returns: { difference: 200, percentageChange: 6.67, varianceType: 'bonus', ... }
 */
export function detectIncomeVariance(
  transaction: { amount: number; income_source_id: string; id: string },
  incomeSource: IncomeSource,
  thresholds: VarianceThresholdConfig = DEFAULT_THRESHOLDS
): IncomeVariance | null {
  // Use rawAmount (the original amount per source's frequency) for comparison
  const expectedAmount = incomeSource.rawAmount ?? incomeSource.amount;

  if (expectedAmount <= 0) {
    // Can't detect variance if no expected amount
    return null;
  }

  const difference = transaction.amount - expectedAmount;
  const absoluteDiff = Math.abs(difference);
  const percentageChange = (difference / expectedAmount) * 100;
  const absolutePercentage = Math.abs(percentageChange);

  // Check if variance exceeds thresholds
  const exceedsPercentage = absolutePercentage >= thresholds.percentageThreshold * 100;
  const exceedsAbsolute = absoluteDiff >= thresholds.absoluteThreshold;

  // Must exceed both thresholds to be considered significant
  if (!exceedsPercentage || !exceedsAbsolute) {
    return null;
  }

  return {
    incomeSourceId: incomeSource.id,
    incomeSourceName: incomeSource.name,
    expectedAmount,
    actualAmount: transaction.amount,
    difference,
    percentageChange,
    transactionId: transaction.id,
    varianceType: difference > 0 ? "bonus" : "shortfall",
  };
}

/**
 * Formats a variance for display
 *
 * @param variance - The detected variance
 * @returns Formatted strings for UI display
 */
export function formatVarianceForDisplay(variance: IncomeVariance): {
  title: string;
  expectedFormatted: string;
  actualFormatted: string;
  differenceFormatted: string;
  percentageFormatted: string;
  description: string;
} {
  const sign = variance.difference > 0 ? "+" : "";

  return {
    title: variance.varianceType === "bonus"
      ? `Extra Income: ${variance.incomeSourceName}`
      : `Income Shortfall: ${variance.incomeSourceName}`,
    expectedFormatted: `$${variance.expectedAmount.toFixed(2)}`,
    actualFormatted: `$${variance.actualAmount.toFixed(2)}`,
    differenceFormatted: `${sign}$${variance.difference.toFixed(2)}`,
    percentageFormatted: `${sign}${variance.percentageChange.toFixed(1)}%`,
    description: variance.varianceType === "bonus"
      ? `You received $${variance.difference.toFixed(2)} more than expected.`
      : `You received $${Math.abs(variance.difference).toFixed(2)} less than expected.`,
  };
}

/**
 * Determines suggested actions based on variance type
 *
 * @param variance - The detected variance
 * @returns Array of suggested action options
 */
export function getSuggestedActions(variance: IncomeVariance): Array<{
  id: string;
  label: string;
  description: string;
  action: "one_time" | "permanent_change";
}> {
  if (variance.varianceType === "bonus") {
    return [
      {
        id: "one_time_bonus",
        label: "One-time bonus",
        description: `Add $${variance.difference.toFixed(2)} to Surplus envelope for later allocation`,
        action: "one_time",
      },
      {
        id: "permanent_increase",
        label: "My pay has permanently changed",
        description: `Update income to $${variance.actualAmount.toFixed(2)} and go to Budget Manager`,
        action: "permanent_change",
      },
    ];
  } else {
    return [
      {
        id: "one_time_reduction",
        label: "One-time reduction",
        description: "Choose which envelopes to reduce this cycle",
        action: "one_time",
      },
      {
        id: "permanent_decrease",
        label: "My pay has permanently changed",
        description: `Update income to $${variance.actualAmount.toFixed(2)} and go to Budget Manager`,
        action: "permanent_change",
      },
    ];
  }
}

/**
 * Groups envelopes by priority for shortfall reduction
 *
 * @param envelopes - Array of envelopes with allocations
 * @returns Grouped envelopes sorted by priority (discretionary first)
 */
export function groupEnvelopesByPriority<T extends {
  id: string;
  name: string;
  priority?: string;
  incomeAllocations?: Record<string, number>;
}>(
  envelopes: T[],
  incomeSourceId: string
): Array<{
  priority: "discretionary" | "important" | "essential";
  label: string;
  color: string;
  envelopes: Array<T & { allocationFromSource: number }>;
}> {
  const priorityOrder = ["discretionary", "important", "essential"] as const;
  const priorityLabels: Record<string, string> = {
    discretionary: "Flexible",
    important: "Important",
    essential: "Essential (last resort)",
  };
  const priorityColors: Record<string, string> = {
    discretionary: "text-green-600",
    important: "text-amber-600",
    essential: "text-red-600",
  };

  return priorityOrder.map((priority) => ({
    priority,
    label: priorityLabels[priority],
    color: priorityColors[priority],
    envelopes: envelopes
      .filter((env) => (env.priority || "important") === priority)
      .map((env) => ({
        ...env,
        allocationFromSource: env.incomeAllocations?.[incomeSourceId] || 0,
      }))
      .filter((env) => env.allocationFromSource > 0)
      .sort((a, b) => b.allocationFromSource - a.allocationFromSource),
  })).filter((group) => group.envelopes.length > 0);
}
