/**
 * Waterfall Allocator
 *
 * Allocates available funds to envelopes based on priority tiers:
 * 1. Essential Bills (must-pay bills with due dates)
 * 2. Essential Everything Else (essential spending/savings)
 * 3. Important (all important envelopes)
 * 4. Flexible (discretionary envelopes)
 *
 * Within each tier, sorts by due date (soonest first), then by name.
 */

// Types
export type AllocationStrategy = 'credit_first' | 'envelopes_only' | 'hybrid';

export type PayCycle = 'weekly' | 'fortnightly' | 'monthly';

export interface EnvelopeForAllocation {
  id: string;
  name: string;
  icon?: string;
  priority?: 'essential' | 'important' | 'discretionary';
  subtype?: 'bill' | 'spending' | 'savings' | 'goal' | 'tracking';
  targetAmount?: number;
  frequency?: string;
  dueDate?: number | string | Date;
  perPayAllocation?: number; // User's budgeted per-pay amount from Fund From selector
}

export interface EnvelopeAllocationResult {
  envelopeId: string;
  envelopeName: string;
  icon?: string;
  priority: 'essential' | 'important' | 'discretionary';
  subtype?: string;
  tier: 1 | 2 | 3 | 4;
  tierName: string;
  suggested: number;
  allocated: number;
  shortfall: number;
  isFullyFunded: boolean;
}

export interface WaterfallResult {
  allocations: Record<string, number>;
  results: EnvelopeAllocationResult[];
  totalAllocated: number;
  remaining: number;
  byTier: {
    tier1: EnvelopeAllocationResult[]; // Essential Bills
    tier2: EnvelopeAllocationResult[]; // Essential Other
    tier3: EnvelopeAllocationResult[]; // Important
    tier4: EnvelopeAllocationResult[]; // Flexible
  };
  byPriority: {
    essential: number;
    important: number;
    discretionary: number;
  };
}

export interface StrategyRecommendation {
  strategy: AllocationStrategy;
  reason: string;
  suggestedHybridAmount?: number;
}

/**
 * Get the tier number for an envelope based on priority and subtype
 */
function getEnvelopeTier(envelope: EnvelopeForAllocation): 1 | 2 | 3 | 4 {
  const priority = envelope.priority || 'discretionary';
  const subtype = envelope.subtype || 'spending';

  if (priority === 'essential') {
    return subtype === 'bill' ? 1 : 2;
  }
  if (priority === 'important') {
    return 3;
  }
  return 4; // discretionary
}

/**
 * Get tier name for display
 */
function getTierName(tier: 1 | 2 | 3 | 4): string {
  switch (tier) {
    case 1: return 'Essential Bills';
    case 2: return 'Essential Other';
    case 3: return 'Important';
    case 4: return 'Flexible';
  }
}

/**
 * Parse due date to day of month number for comparison
 */
function getDueDateSortValue(dueDate?: number | string | Date): number {
  if (!dueDate) return 32; // No due date = sort last within tier

  if (typeof dueDate === 'number') {
    return dueDate;
  }

  if (typeof dueDate === 'string') {
    // Try parsing as date string
    const parsed = new Date(dueDate);
    if (!isNaN(parsed.getTime())) {
      return parsed.getDate();
    }
    // Try parsing as number string
    const num = parseInt(dueDate, 10);
    if (!isNaN(num)) {
      return num;
    }
  }

  if (dueDate instanceof Date) {
    return dueDate.getDate();
  }

  return 32;
}

/**
 * Sort envelopes into priority tiers
 */
function sortEnvelopesByTier(envelopes: EnvelopeForAllocation[]): EnvelopeForAllocation[] {
  return [...envelopes].sort((a, b) => {
    // Primary sort: by tier
    const tierA = getEnvelopeTier(a);
    const tierB = getEnvelopeTier(b);
    if (tierA !== tierB) return tierA - tierB;

    // Secondary sort: by due date (soonest first)
    const dueDateA = getDueDateSortValue(a.dueDate);
    const dueDateB = getDueDateSortValue(b.dueDate);
    if (dueDateA !== dueDateB) return dueDateA - dueDateB;

    // Tertiary sort: by name
    return (a.name || '').localeCompare(b.name || '');
  });
}

/**
 * Calculate the suggested opening balance for an envelope
 *
 * Uses the user's actual per-pay allocation when available,
 * otherwise falls back to calculating from target amount.
 *
 * For bills: Calculate based on due date and per-pay allocation
 * For spending/savings: Use the per-pay allocation as the suggested opening
 */
function calculateSuggested(
  envelope: EnvelopeForAllocation,
  payCycle: PayCycle
): number {
  const targetAmount = envelope.targetAmount || 0;
  const perPayAllocation = envelope.perPayAllocation || 0;

  // Frequency maps
  const frequencyMap: Record<string, number> = {
    weekly: 52,
    fortnightly: 26,
    monthly: 12,
    quarterly: 4,
    annual: 1,
    annually: 1,
  };

  const payCycleMap: Record<string, number> = {
    weekly: 52,
    fortnightly: 26,
    monthly: 12,
  };

  const payTimesPerYear = payCycleMap[payCycle] || 12;

  // Handle bills - need enough to cover upcoming due date
  if (envelope.subtype === 'bill') {
    if (targetAmount <= 0) return 0;

    // Use user's per-pay allocation if set, otherwise calculate ideal
    const billTimesPerYear = frequencyMap[envelope.frequency || 'monthly'] || 12;
    const annualCost = targetAmount * billTimesPerYear;
    const idealPerPay = perPayAllocation > 0 ? perPayAllocation : (annualCost / payTimesPerYear);

    // If no due date, use one per-pay amount as starting point
    if (!envelope.dueDate) {
      return Math.round(idealPerPay * 100) / 100;
    }

    // Calculate pay cycles until due date
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    let dueDay: number;
    if (typeof envelope.dueDate === 'number') {
      dueDay = envelope.dueDate;
    } else if (typeof envelope.dueDate === 'string') {
      const parsed = new Date(envelope.dueDate);
      dueDay = !isNaN(parsed.getTime()) ? parsed.getDate() : parseInt(envelope.dueDate, 10) || 1;
    } else if (envelope.dueDate instanceof Date) {
      dueDay = envelope.dueDate.getDate();
    } else {
      dueDay = 1;
    }

    let dueDate = new Date(currentYear, currentMonth, dueDay);
    if (dueDate <= today) {
      dueDate = new Date(currentYear, currentMonth + 1, dueDay);
    }

    // Days until due
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // Convert to pay cycles
    const daysPerPayCycle = 365 / payTimesPerYear;
    const payCyclesUntilDue = Math.max(0, daysUntilDue / daysPerPayCycle);

    // What we'll accumulate vs what we need
    const willAccumulate = idealPerPay * payCyclesUntilDue;
    const suggestedOpening = Math.max(0, targetAmount - willAccumulate);

    return Math.round(suggestedOpening * 100) / 100;
  }

  // For spending envelopes: use user's per-pay allocation
  if (envelope.subtype === 'spending') {
    // If user has set a per-pay allocation, use that
    if (perPayAllocation > 0) {
      return Math.round(perPayAllocation * 100) / 100;
    }

    // Fallback: calculate from target amount
    if (targetAmount <= 0) return 0;
    const spendingTimesPerYear = frequencyMap[envelope.frequency || 'monthly'] || 12;
    const annualSpending = targetAmount * spendingTimesPerYear;
    const perPaySpending = annualSpending / payTimesPerYear;
    return Math.round(perPaySpending * 100) / 100;
  }

  // For savings/goal envelopes: use user's per-pay allocation
  if (envelope.subtype === 'savings' || envelope.subtype === 'goal') {
    // If user has set a per-pay allocation, use that
    if (perPayAllocation > 0) {
      return Math.round(perPayAllocation * 100) / 100;
    }

    // Fallback: calculate from target amount
    if (targetAmount <= 0) return 0;
    const savingsTimesPerYear = frequencyMap[envelope.frequency || 'monthly'] || 12;
    const annualSavings = targetAmount * savingsTimesPerYear;
    const perPaySavings = annualSavings / payTimesPerYear;
    return Math.round(perPaySavings * 100) / 100;
  }

  // Default: use per-pay allocation if set
  if (perPayAllocation > 0) {
    return Math.round(perPayAllocation * 100) / 100;
  }

  return 0;
}

/**
 * Main waterfall allocation function
 *
 * @param availableFunds - Total funds available for allocation
 * @param envelopes - Array of envelopes to allocate to
 * @param payCycle - User's pay cycle for calculating suggested amounts
 * @returns WaterfallResult with allocations and breakdown
 */
export function calculateWaterfallAllocation(
  availableFunds: number,
  envelopes: EnvelopeForAllocation[],
  payCycle: PayCycle
): WaterfallResult {
  // Filter out tracking-only envelopes
  const allocatableEnvelopes = envelopes.filter(
    e => e.subtype !== 'tracking'
  );

  // Sort by tier, then due date, then name
  const sortedEnvelopes = sortEnvelopesByTier(allocatableEnvelopes);

  let remaining = availableFunds;
  const allocations: Record<string, number> = {};
  const results: EnvelopeAllocationResult[] = [];

  // Process each envelope in priority order
  for (const envelope of sortedEnvelopes) {
    const tier = getEnvelopeTier(envelope);
    const suggested = calculateSuggested(envelope, payCycle);

    // Allocate what we can (up to suggested amount)
    const allocated = Math.min(Math.max(0, suggested), Math.max(0, remaining));
    allocations[envelope.id] = allocated;
    remaining -= allocated;

    results.push({
      envelopeId: envelope.id,
      envelopeName: envelope.name,
      icon: envelope.icon,
      priority: envelope.priority || 'discretionary',
      subtype: envelope.subtype,
      tier,
      tierName: getTierName(tier),
      suggested,
      allocated,
      shortfall: Math.max(0, suggested - allocated),
      isFullyFunded: allocated >= suggested,
    });
  }

  // Group by tier
  const byTier = {
    tier1: results.filter(r => r.tier === 1),
    tier2: results.filter(r => r.tier === 2),
    tier3: results.filter(r => r.tier === 3),
    tier4: results.filter(r => r.tier === 4),
  };

  // Calculate totals by priority
  const byPriority = {
    essential: results
      .filter(r => r.priority === 'essential')
      .reduce((sum, r) => sum + r.allocated, 0),
    important: results
      .filter(r => r.priority === 'important')
      .reduce((sum, r) => sum + r.allocated, 0),
    discretionary: results
      .filter(r => r.priority === 'discretionary')
      .reduce((sum, r) => sum + r.allocated, 0),
  };

  return {
    allocations,
    results,
    totalAllocated: availableFunds - Math.max(0, remaining),
    remaining: Math.max(0, remaining),
    byTier,
    byPriority,
  };
}

/**
 * Calculate available funds based on allocation strategy
 */
export function calculateAvailableFunds(
  bankBalance: number,
  creditCardDebt: number,
  strategy: AllocationStrategy,
  hybridAmount?: number
): { availableForEnvelopes: number; creditCardAllocation: number } {
  switch (strategy) {
    case 'credit_first':
      // Allocate full CC debt first, rest goes to envelopes
      const ccAllocation = Math.min(creditCardDebt, bankBalance);
      return {
        availableForEnvelopes: Math.max(0, bankBalance - creditCardDebt),
        creditCardAllocation: ccAllocation,
      };

    case 'envelopes_only':
      // All funds go to envelopes
      return {
        availableForEnvelopes: bankBalance,
        creditCardAllocation: 0,
      };

    case 'hybrid':
      // User specifies CC amount
      const hybridCC = Math.min(hybridAmount || 0, bankBalance);
      return {
        availableForEnvelopes: Math.max(0, bankBalance - hybridCC),
        creditCardAllocation: hybridCC,
      };

    default:
      return {
        availableForEnvelopes: bankBalance,
        creditCardAllocation: 0,
      };
  }
}

/**
 * Get recommended allocation strategy based on user's financial situation
 */
export function getRecommendedStrategy(
  bankBalance: number,
  creditCardDebt: number
): StrategyRecommendation {
  // No credit card debt
  if (creditCardDebt <= 0) {
    return {
      strategy: 'envelopes_only',
      reason: 'No credit card debt to cover',
    };
  }

  // Can easily cover debt with plenty left over (2x+)
  if (bankBalance >= creditCardDebt * 2) {
    return {
      strategy: 'credit_first',
      reason: 'You have enough to fully cover your credit card debt and still fund your envelopes',
    };
  }

  // Can cover debt but not much left
  if (bankBalance >= creditCardDebt * 1.2) {
    return {
      strategy: 'credit_first',
      reason: 'Covering your credit card debt will help you avoid interest charges',
    };
  }

  // Can partially cover debt
  if (bankBalance >= creditCardDebt * 0.5) {
    return {
      strategy: 'hybrid',
      reason: 'Split your funds between credit card and essential envelopes',
      suggestedHybridAmount: Math.round(bankBalance * 0.4), // 40% to CC
    };
  }

  // Very limited funds - prioritize essentials
  if (bankBalance < creditCardDebt * 0.5) {
    return {
      strategy: 'envelopes_only',
      reason: 'Focus on essential envelopes first - you can work on the credit card debt over time',
    };
  }

  // Default
  return {
    strategy: 'envelopes_only',
    reason: 'Allocate to your envelopes by priority',
  };
}

/**
 * Get a summary of the allocation result for display
 */
export function getAllocationSummary(result: WaterfallResult): {
  totalSuggested: number;
  totalAllocated: number;
  totalShortfall: number;
  fullyFundedCount: number;
  partiallyFundedCount: number;
  unfundedCount: number;
} {
  const totalSuggested = result.results.reduce((sum, r) => sum + r.suggested, 0);
  const totalShortfall = result.results.reduce((sum, r) => sum + r.shortfall, 0);

  let fullyFundedCount = 0;
  let partiallyFundedCount = 0;
  let unfundedCount = 0;

  for (const r of result.results) {
    if (r.isFullyFunded) {
      fullyFundedCount++;
    } else if (r.allocated > 0) {
      partiallyFundedCount++;
    } else {
      unfundedCount++;
    }
  }

  return {
    totalSuggested,
    totalAllocated: result.totalAllocated,
    totalShortfall,
    fullyFundedCount,
    partiallyFundedCount,
    unfundedCount,
  };
}
