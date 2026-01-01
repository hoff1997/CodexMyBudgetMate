/**
 * Leveled Bills Utilities
 *
 * Helper functions for calculating and managing leveled bill allocations.
 * Leveling allows users to save a consistent amount each pay cycle to cover
 * seasonal variations in bills like power and gas.
 */

import {
  SeasonalPattern,
  NZ_WINTER_MONTHS,
  NZ_SUMMER_MONTHS,
  calculateYearlyAverage,
  calculateYearlyTotal,
  getNZSeason,
} from './seasonal-bills';

// Default buffer percentage to add to leveled amounts
export const DEFAULT_BUFFER_PERCENT = 10;

// Leveling data structure stored in database
export interface LevelingData {
  monthlyAmounts: number[]; // 12 values, Jan=0 to Dec=11
  yearlyAverage: number;
  bufferPercent: number;
  estimationType: '12-month' | 'quick-estimate';
  highSeasonEstimate?: number; // For quick-estimate only
  lowSeasonEstimate?: number; // For quick-estimate only
  lastUpdated: string; // ISO date string
}

/**
 * Creates leveling data from 12 monthly amounts
 *
 * @param monthlyAmounts - Array of 12 monthly amounts
 * @param bufferPercent - Buffer percentage to add (default 10%)
 * @returns LevelingData object ready for database storage
 */
export function createLevelingDataFrom12Months(
  monthlyAmounts: number[],
  bufferPercent: number = DEFAULT_BUFFER_PERCENT
): LevelingData {
  if (monthlyAmounts.length !== 12) {
    throw new Error('Must provide exactly 12 monthly amounts');
  }

  const yearlyAverage = calculateYearlyAverage(monthlyAmounts);

  return {
    monthlyAmounts,
    yearlyAverage,
    bufferPercent,
    estimationType: '12-month',
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Creates leveling data from high/low season estimates
 *
 * Uses NZ seasonal patterns to interpolate monthly amounts:
 * - Peak months get the high estimate
 * - Low months get the low estimate
 * - Shoulder months get a gradual transition
 *
 * @param highSeasonAmount - Typical bill during peak season
 * @param lowSeasonAmount - Typical bill during low season
 * @param pattern - Seasonal pattern (winter-peak or summer-peak)
 * @param bufferPercent - Buffer percentage to add (default 10%)
 * @returns LevelingData object ready for database storage
 */
export function createLevelingDataFromQuickEstimate(
  highSeasonAmount: number,
  lowSeasonAmount: number,
  pattern: 'winter-peak' | 'summer-peak',
  bufferPercent: number = DEFAULT_BUFFER_PERCENT
): LevelingData {
  const peakMonths = pattern === 'winter-peak' ? NZ_WINTER_MONTHS : NZ_SUMMER_MONTHS;
  const lowMonths = pattern === 'winter-peak' ? NZ_SUMMER_MONTHS : NZ_WINTER_MONTHS;

  // Calculate shoulder season amount (average of high and low)
  const shoulderAmount = (highSeasonAmount + lowSeasonAmount) / 2;

  // Build monthly amounts array
  const monthlyAmounts: number[] = [];
  for (let month = 0; month < 12; month++) {
    if ((peakMonths as readonly number[]).includes(month)) {
      monthlyAmounts.push(highSeasonAmount);
    } else if ((lowMonths as readonly number[]).includes(month)) {
      monthlyAmounts.push(lowSeasonAmount);
    } else {
      // Shoulder months - gradual transition
      monthlyAmounts.push(shoulderAmount);
    }
  }

  const yearlyAverage = calculateYearlyAverage(monthlyAmounts);

  return {
    monthlyAmounts,
    yearlyAverage,
    bufferPercent,
    estimationType: 'quick-estimate',
    highSeasonEstimate: highSeasonAmount,
    lowSeasonEstimate: lowSeasonAmount,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Calculates the leveled amount per pay cycle including buffer
 *
 * @param levelingData - The leveling data object
 * @param payFrequency - Pay frequency (weekly, fortnightly, twice_monthly, monthly)
 * @returns Amount to save each pay cycle
 */
export function calculateLeveledPayCycleAmount(
  levelingData: LevelingData,
  payFrequency: 'weekly' | 'fortnightly' | 'twice_monthly' | 'monthly'
): number {
  const { yearlyAverage, bufferPercent } = levelingData;

  // Add buffer
  const monthlyWithBuffer = yearlyAverage * (1 + bufferPercent / 100);

  // Convert to per-pay-cycle amount
  const payCyclesPerYear: Record<typeof payFrequency, number> = {
    weekly: 52,
    fortnightly: 26,
    twice_monthly: 24,
    monthly: 12,
  };

  const yearlyTotal = monthlyWithBuffer * 12;
  return yearlyTotal / payCyclesPerYear[payFrequency];
}

/**
 * Calculates the current buffer status
 *
 * Compares actual envelope balance against what should be saved by now
 * to determine if the user is ahead, on track, or behind.
 *
 * @param levelingData - The leveling data object
 * @param currentBalance - Current envelope balance
 * @param startMonth - Month when leveling started (0-11)
 * @param currentMonth - Current month (0-11), defaults to now
 * @returns Buffer status information
 */
export function calculateBufferStatus(
  levelingData: LevelingData,
  currentBalance: number,
  startMonth: number,
  currentMonth: number = new Date().getMonth()
): {
  expectedBalance: number;
  actualBalance: number;
  bufferAmount: number;
  status: 'ahead' | 'on-track' | 'behind' | 'critical';
  percentageOfExpected: number;
} {
  const { monthlyAmounts, bufferPercent } = levelingData;

  // Calculate what should have been spent from start to now
  let totalExpected = 0;
  let month = startMonth;
  while (month !== currentMonth) {
    totalExpected += monthlyAmounts[month];
    month = (month + 1) % 12;
  }
  totalExpected += monthlyAmounts[currentMonth]; // Include current month

  // Calculate what should have been saved (yearly average * months * buffer)
  const monthsElapsed = ((currentMonth - startMonth + 12) % 12) + 1;
  const expectedSaved = levelingData.yearlyAverage * monthsElapsed * (1 + bufferPercent / 100);

  // Expected balance = expected saved - expected spent + any actual spending difference
  const expectedBalance = expectedSaved - totalExpected;

  const percentageOfExpected = expectedBalance > 0 ? (currentBalance / expectedBalance) * 100 : 100;

  let status: 'ahead' | 'on-track' | 'behind' | 'critical';
  if (percentageOfExpected >= 110) {
    status = 'ahead';
  } else if (percentageOfExpected >= 90) {
    status = 'on-track';
  } else if (percentageOfExpected >= 50) {
    status = 'behind';
  } else {
    status = 'critical';
  }

  return {
    expectedBalance,
    actualBalance: currentBalance,
    bufferAmount: currentBalance - expectedBalance,
    status,
    percentageOfExpected,
  };
}

/**
 * Checks if currently in high season for the given pattern
 *
 * @param pattern - Seasonal pattern
 * @param month - Month to check (0-11), defaults to current month
 * @returns True if in high season
 */
export function isHighSeason(
  pattern: SeasonalPattern,
  month: number = new Date().getMonth()
): boolean {
  if (pattern === 'custom') {
    return false; // Custom patterns need specific logic
  }

  const seasonInfo = getNZSeason(month);
  if (pattern === 'winter-peak') {
    return seasonInfo.isWinterPeakSeason;
  }
  return seasonInfo.isSummerPeakSeason;
}

/**
 * Gets a human-readable description of the current season status
 *
 * @param pattern - Seasonal pattern
 * @param month - Month to check (0-11), defaults to current month
 * @returns Description of season status
 */
export function getSeasonStatusMessage(
  pattern: SeasonalPattern,
  month: number = new Date().getMonth()
): string {
  if (pattern === 'custom') {
    return 'Custom seasonal pattern';
  }

  const seasonInfo = getNZSeason(month);
  const inHighSeason = isHighSeason(pattern, month);

  if (pattern === 'winter-peak') {
    if (inHighSeason) {
      return `Currently in high season (${seasonInfo.season}) - bills will be higher`;
    }
    if (seasonInfo.season === 'autumn') {
      return 'Approaching high season - building buffer';
    }
    if (seasonInfo.season === 'spring') {
      return 'Past peak season - replenishing buffer';
    }
    return `Currently in low season (${seasonInfo.season}) - building reserves`;
  }

  // summer-peak pattern
  if (inHighSeason) {
    return `Currently in high season (${seasonInfo.season}) - bills will be higher`;
  }
  return `Currently in low season (${seasonInfo.season}) - building reserves`;
}

/**
 * Estimates what this month's bill will be based on leveling data
 *
 * @param levelingData - The leveling data object
 * @param month - Month to estimate (0-11), defaults to current month
 * @returns Estimated bill amount for the month
 */
export function getEstimatedMonthlyBill(
  levelingData: LevelingData,
  month: number = new Date().getMonth()
): number {
  return levelingData.monthlyAmounts[month];
}

/**
 * Calculates the yearly savings from leveling vs paying as-you-go
 *
 * Leveling helps avoid overdraft fees, late payments, and financial stress
 * during high season. This calculates the "peace of mind" value.
 *
 * @param levelingData - The leveling data object
 * @returns Analysis of the leveling benefit
 */
export function analyzeLevelingBenefit(levelingData: LevelingData): {
  yearlyTotal: number;
  monthlyAverage: number;
  peakMonthAmount: number;
  lowMonthAmount: number;
  peakToAverageRatio: number;
  variationPercent: number;
} {
  const { monthlyAmounts, yearlyAverage } = levelingData;
  const yearlyTotal = calculateYearlyTotal(monthlyAmounts);
  const peakMonthAmount = Math.max(...monthlyAmounts);
  const lowMonthAmount = Math.min(...monthlyAmounts);
  const peakToAverageRatio = peakMonthAmount / yearlyAverage;
  const variationPercent = ((peakMonthAmount - lowMonthAmount) / yearlyAverage) * 100;

  return {
    yearlyTotal,
    monthlyAverage: yearlyAverage,
    peakMonthAmount,
    lowMonthAmount,
    peakToAverageRatio,
    variationPercent,
  };
}

/**
 * Formats leveling data for display
 *
 * @param levelingData - The leveling data object
 * @returns Formatted display values
 */
export function formatLevelingForDisplay(levelingData: LevelingData): {
  averageFormatted: string;
  bufferFormatted: string;
  lastUpdatedFormatted: string;
  estimationTypeLabel: string;
} {
  const formatter = new Intl.NumberFormat('en-NZ', {
    style: 'currency',
    currency: 'NZD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  const bufferAmount = levelingData.yearlyAverage * (levelingData.bufferPercent / 100);
  const lastUpdated = new Date(levelingData.lastUpdated);

  return {
    averageFormatted: formatter.format(levelingData.yearlyAverage),
    bufferFormatted: formatter.format(bufferAmount),
    lastUpdatedFormatted: lastUpdated.toLocaleDateString('en-NZ', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
    estimationTypeLabel:
      levelingData.estimationType === '12-month'
        ? 'Based on 12 months of bills'
        : 'Quick estimate',
  };
}
