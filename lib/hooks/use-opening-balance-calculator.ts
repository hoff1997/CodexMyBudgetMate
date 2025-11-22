import type {
  FrequencyType,
  OpeningBalanceCalculatorInput,
  OpeningBalanceCalculatorResult,
} from '@/lib/types/unified-envelope';

/**
 * Calculate how many pay cycles until a due date
 */
function calculateCyclesUntilDue(
  dueDate: number | Date | undefined,
  payCycle: 'weekly' | 'fortnightly' | 'twice_monthly' | 'monthly'
): number {
  if (!dueDate) return 0;

  const today = new Date();
  let targetDate: Date;

  // If dueDate is a number, treat it as day of month for bills
  if (typeof dueDate === 'number') {
    targetDate = new Date(today.getFullYear(), today.getMonth(), dueDate);

    // If the date has already passed this month, use next month
    if (targetDate < today) {
      targetDate = new Date(today.getFullYear(), today.getMonth() + 1, dueDate);
    }
  } else {
    targetDate = new Date(dueDate);
  }

  const daysUntilDue = Math.max(0, Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

  // Calculate cycles based on pay cycle
  const daysPerCycle = payCycle === 'weekly' ? 7
    : payCycle === 'fortnightly' ? 14
    : payCycle === 'twice_monthly' ? 15
    : 30;
  return Math.max(1, Math.ceil(daysUntilDue / daysPerCycle));
}

/**
 * Calculate smart opening balance needed for an envelope
 *
 * Formula: opening_needed = MAX(0, target - (per_cycle_allocation × cycles_until_due))
 *
 * Example:
 * - Bank balance: $1,500
 * - Rates bill: $2,200 target, due in 90 days
 * - Allocated: $200 per fortnight
 * - Cycles until due: 90 / 14 = 6 cycles
 * - Will accumulate: $200 × 6 = $1,200
 * - Opening balance needed: $2,200 - $1,200 = $1,000
 *
 * @param input Calculator configuration
 * @returns Opening balance calculation result
 */
export function calculateOpeningBalance(
  input: OpeningBalanceCalculatorInput
): OpeningBalanceCalculatorResult {
  const {
    targetAmount,
    frequency,
    dueDate,
    totalPerCycleAllocation,
    payCycle,
  } = input;

  // For spending envelopes with no target or due date, no opening balance needed
  if (!targetAmount || targetAmount <= 0) {
    return {
      openingBalanceNeeded: 0,
      cyclesUntilDue: 0,
      projectedAccumulation: 0,
      isFullyFunded: true,
    };
  }

  // Calculate cycles until due
  const cyclesUntilDue = calculateCyclesUntilDue(dueDate, payCycle);

  // Calculate how much will be accumulated from income allocations
  const projectedAccumulation = totalPerCycleAllocation * cyclesUntilDue;

  // Calculate opening balance needed
  const openingBalanceNeeded = Math.max(0, targetAmount - projectedAccumulation);

  // Check if fully funded
  const isFullyFunded = openingBalanceNeeded === 0;

  // Generate warning if needed
  let warning: string | undefined;
  if (openingBalanceNeeded > 0) {
    warning = `Need $${openingBalanceNeeded.toFixed(2)} from bank to reach target by due date`;
  } else if (projectedAccumulation > targetAmount * 1.1) {
    warning = `Will accumulate $${(projectedAccumulation - targetAmount).toFixed(2)} more than needed`;
  }

  return {
    openingBalanceNeeded,
    cyclesUntilDue,
    projectedAccumulation,
    isFullyFunded,
    warning,
  };
}

/**
 * Hook version for use in React components (at top level only)
 * For use in loops/callbacks, use calculateOpeningBalance() directly
 */
export function useOpeningBalanceCalculator(
  input: OpeningBalanceCalculatorInput
): OpeningBalanceCalculatorResult {
  return calculateOpeningBalance(input);
}

/**
 * Calculate total opening balance needed across all envelopes
 */
export function calculateTotalOpeningBalanceNeeded(
  envelopes: Array<{
    targetAmount: number;
    frequency?: FrequencyType;
    dueDate?: number | Date;
    totalPerCycleAllocation: number;
  }>,
  payCycle: 'weekly' | 'fortnightly' | 'twice_monthly' | 'monthly'
): number {
  return envelopes.reduce((total, envelope) => {
    const result = calculateOpeningBalance({
      targetAmount: envelope.targetAmount,
      frequency: envelope.frequency || 'monthly',
      dueDate: envelope.dueDate,
      totalPerCycleAllocation: envelope.totalPerCycleAllocation,
      payCycle,
    });
    return total + result.openingBalanceNeeded;
  }, 0);
}
