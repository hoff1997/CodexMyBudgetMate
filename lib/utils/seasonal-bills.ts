/**
 * Seasonal Bills Utilities
 *
 * NZ-focused utilities for detecting and handling seasonal expenses
 * like power, gas, and water bills that vary throughout the year.
 */

// Keywords that indicate a bill might be seasonal
export const SEASONAL_BILL_KEYWORDS = [
  'power',
  'electricity',
  'electric',
  'gas',
  'natural gas',
  'water',
  'rates', // NZ council rates can have seasonal components
  'heating',
  'firewood',
  'lpg',
  'bottled gas',
] as const;

// NZ seasonal patterns
export type SeasonalPattern = 'winter-peak' | 'summer-peak' | 'custom';

// Months indexed 0-11 (Jan=0, Dec=11)
export const NZ_WINTER_MONTHS = [5, 6, 7] as const; // June, July, August
export const NZ_SUMMER_MONTHS = [11, 0, 1] as const; // December, January, February
export const NZ_SHOULDER_MONTHS = [2, 3, 4, 8, 9, 10] as const; // Mar-May, Sep-Nov

// Typical patterns for NZ seasonal bills
export const SEASONAL_PATTERNS: Record<SeasonalPattern, {
  name: string;
  description: string;
  peakMonths: readonly number[];
  lowMonths: readonly number[];
  examples: string[];
}> = {
  'winter-peak': {
    name: 'Winter Peak',
    description: 'Higher bills during winter (June-August) due to heating',
    peakMonths: NZ_WINTER_MONTHS,
    lowMonths: NZ_SUMMER_MONTHS,
    examples: ['Power', 'Electricity', 'Gas', 'Firewood', 'LPG'],
  },
  'summer-peak': {
    name: 'Summer Peak',
    description: 'Higher bills during summer (December-February) due to irrigation/cooling',
    peakMonths: NZ_SUMMER_MONTHS,
    lowMonths: NZ_WINTER_MONTHS,
    examples: ['Water (if irrigating)', 'Pool maintenance'],
  },
  'custom': {
    name: 'Custom Pattern',
    description: 'Custom seasonal pattern based on your specific situation',
    peakMonths: [],
    lowMonths: [],
    examples: [],
  },
};

/**
 * Detects if an envelope name suggests a seasonal bill
 *
 * @param envelopeName - The name of the envelope to check
 * @returns Object with detection result and suggested pattern
 */
export function detectSeasonalBill(envelopeName: string): {
  isLikelySeasonal: boolean;
  matchedKeyword: string | null;
  suggestedPattern: SeasonalPattern | null;
  confidence: 'high' | 'medium' | 'low';
} {
  const lowerName = envelopeName.toLowerCase().trim();

  // Check for exact or partial keyword matches
  for (const keyword of SEASONAL_BILL_KEYWORDS) {
    if (lowerName.includes(keyword.toLowerCase())) {
      // Determine pattern based on keyword
      let suggestedPattern: SeasonalPattern = 'winter-peak';
      let confidence: 'high' | 'medium' | 'low' = 'high';

      // Water is typically summer-peak in NZ (irrigation)
      if (keyword === 'water') {
        suggestedPattern = 'summer-peak';
        confidence = 'medium'; // Water usage varies more by household
      }

      // Power/electricity is very reliably winter-peak in NZ
      if (['power', 'electricity', 'electric', 'gas', 'heating', 'firewood', 'lpg'].includes(keyword)) {
        suggestedPattern = 'winter-peak';
        confidence = 'high';
      }

      // Rates are less predictable
      if (keyword === 'rates') {
        suggestedPattern = 'custom';
        confidence = 'low';
      }

      return {
        isLikelySeasonal: true,
        matchedKeyword: keyword,
        suggestedPattern,
        confidence,
      };
    }
  }

  return {
    isLikelySeasonal: false,
    matchedKeyword: null,
    suggestedPattern: null,
    confidence: 'low',
  };
}

/**
 * Calculates the yearly average from monthly amounts
 *
 * @param monthlyAmounts - Array of 12 monthly amounts (Jan=0 to Dec=11)
 * @returns The monthly average
 */
export function calculateYearlyAverage(monthlyAmounts: number[]): number {
  if (monthlyAmounts.length !== 12) {
    throw new Error('Monthly amounts must contain exactly 12 values');
  }

  const total = monthlyAmounts.reduce((sum, amount) => sum + amount, 0);
  return total / 12;
}

/**
 * Calculates total yearly cost from monthly amounts
 *
 * @param monthlyAmounts - Array of 12 monthly amounts
 * @returns Total yearly cost
 */
export function calculateYearlyTotal(monthlyAmounts: number[]): number {
  if (monthlyAmounts.length !== 12) {
    throw new Error('Monthly amounts must contain exactly 12 values');
  }

  return monthlyAmounts.reduce((sum, amount) => sum + amount, 0);
}

/**
 * Gets the current NZ season based on month
 *
 * @param month - Month index (0-11, where 0=January)
 * @returns Season name and whether it's peak for common patterns
 */
export function getNZSeason(month: number): {
  season: 'summer' | 'autumn' | 'winter' | 'spring';
  isWinterPeakSeason: boolean;
  isSummerPeakSeason: boolean;
} {
  // NZ seasons (opposite to Northern Hemisphere)
  if ([11, 0, 1].includes(month)) {
    return { season: 'summer', isWinterPeakSeason: false, isSummerPeakSeason: true };
  }
  if ([2, 3, 4].includes(month)) {
    return { season: 'autumn', isWinterPeakSeason: false, isSummerPeakSeason: false };
  }
  if ([5, 6, 7].includes(month)) {
    return { season: 'winter', isWinterPeakSeason: true, isSummerPeakSeason: false };
  }
  // [8, 9, 10] - September, October, November
  return { season: 'spring', isWinterPeakSeason: false, isSummerPeakSeason: false };
}

/**
 * Gets friendly month name
 */
export function getMonthName(monthIndex: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[monthIndex] || 'Unknown';
}

/**
 * Gets short month name
 */
export function getShortMonthName(monthIndex: number): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[monthIndex] || '???';
}
