/**
 * Ideal Allocation Calculator - "The Magic" of My Budget Mate
 *
 * This calculator implements the core innovation that makes My Budget Mate unique:
 * calculating the ideal steady-state allocation for each envelope based solely on
 * the bill's target amount, frequency, and user's pay cycle.
 *
 * Key Principle: The ideal allocation NEVER changes unless bill details change.
 * It is independent of due dates, current balance, or opening balance.
 */

export type PayCycle = 'weekly' | 'fortnightly' | 'twice_monthly' | 'monthly';
export type BillFrequency = 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'annual' | 'once';

interface Envelope {
  id: string;
  target_amount: number;
  frequency: BillFrequency;
  due_date?: string | null;
  current_amount?: number;
  opening_balance?: number;
}

interface IncomeAllocation {
  income_source_id: string;
  allocation_amount: number;
  pay_cycle: PayCycle;
}

/**
 * Get the number of cycles per year for a given frequency
 */
export function getCyclesPerYear(frequency: PayCycle | BillFrequency | string): number {
  switch (frequency) {
    case 'weekly':
      return 52;
    case 'fortnightly':
      return 26;
    case 'twice_monthly':
      return 24;
    case 'monthly':
      return 12;
    case 'quarterly':
      return 4;
    case 'annual':
    case 'annually':
      return 1;
    case 'once':
      return 1;
    default:
      return 12; // Default to monthly
  }
}

/**
 * Normalize an income amount from source frequency to user's pay cycle
 *
 * This converts income amounts from different frequencies to a common
 * denominator (user's pay cycle) for accurate total calculations.
 *
 * @param amount - The income amount per source's frequency
 * @param sourceFrequency - The frequency of the income source
 * @param userPayCycle - The user's pay cycle frequency
 * @returns The normalized amount per user's pay cycle
 *
 * @example
 * // Weekly $1000 income, user pays fortnightly
 * normalizeToUserPayCycle(1000, 'weekly', 'fortnightly')
 * // Returns: 2000 (two weeks of weekly income)
 *
 * @example
 * // Monthly $3000 income, user pays fortnightly
 * normalizeToUserPayCycle(3000, 'monthly', 'fortnightly')
 * // Returns: 1384.62 (3000 × 12 ÷ 26)
 */
export function normalizeToUserPayCycle(
  amount: number,
  sourceFrequency: string,
  userPayCycle: string
): number {
  const sourceCyclesPerYear = getCyclesPerYear(sourceFrequency);
  const userCyclesPerYear = getCyclesPerYear(userPayCycle);

  // Annual amount = amount × source cycles per year
  // Per user cycle = annual amount ÷ user cycles per year
  const normalizedAmount = (amount * sourceCyclesPerYear) / userCyclesPerYear;

  return Math.round(normalizedAmount * 100) / 100;
}

/**
 * Get short label for frequency (for compact UI display)
 */
export function getFrequencyShortLabel(frequency: string): string {
  switch (frequency) {
    case 'weekly':
      return 'Wkly';
    case 'fortnightly':
      return 'F/N';
    case 'twice_monthly':
      return '2×/mo';
    case 'monthly':
      return 'Mthly';
    case 'quarterly':
      return 'Qtly';
    case 'annual':
    case 'annually':
      return 'Ann';
    default:
      return frequency;
  }
}

/**
 * Calculate the ideal per-pay allocation for an envelope
 *
 * Formula: idealPerPay = (targetAmount ÷ billCyclesPerYear) ÷ userPayCyclesPerYear
 *
 * @param envelope - The envelope with target amount and frequency
 * @param userPayCycle - The user's pay cycle frequency
 * @returns The ideal amount to allocate per pay cycle
 *
 * @example
 * // Annual $1,000 bill, user pays fortnightly
 * calculateIdealAllocation({ target_amount: 1000, frequency: 'annual' }, 'fortnightly')
 * // Returns: 38.46
 *
 * @example
 * // Monthly $200 bill, user pays fortnightly
 * calculateIdealAllocation({ target_amount: 200, frequency: 'monthly' }, 'fortnightly')
 * // Returns: 92.31
 */
export function calculateIdealAllocation(
  envelope: Pick<Envelope, 'target_amount' | 'frequency'>,
  userPayCycle: PayCycle
): number {
  const targetAmount = envelope.target_amount || 0;
  const billCyclesPerYear = getCyclesPerYear(envelope.frequency);
  const userPayCyclesPerYear = getCyclesPerYear(userPayCycle);

  // For monthly bills, annualize first
  const annualAmount = envelope.frequency === 'monthly'
    ? targetAmount * 12
    : targetAmount;

  const billAmountPerYear = annualAmount / billCyclesPerYear;
  const idealPerPay = billAmountPerYear / userPayCyclesPerYear;

  return Math.round(idealPerPay * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate the ideal per-pay allocation from multiple income sources
 *
 * This sums up all allocations from different income sources, converting them
 * to the user's primary pay cycle for a unified view.
 *
 * @param incomeAllocations - Array of allocations from different income sources
 * @param userPayCycle - The user's primary pay cycle frequency
 * @returns Total ideal allocation per user's pay cycle
 */
export function calculateIdealAllocationMultiIncome(
  incomeAllocations: IncomeAllocation[],
  userPayCycle: PayCycle
): number {
  const userPayCyclesPerYear = getCyclesPerYear(userPayCycle);

  let totalAnnual = 0;

  for (const allocation of incomeAllocations) {
    const sourceCyclesPerYear = getCyclesPerYear(allocation.pay_cycle);
    // Convert allocation to annual amount
    const annualFromSource = allocation.allocation_amount * sourceCyclesPerYear;
    totalAnnual += annualFromSource;
  }

  // Convert back to user's pay cycle
  const idealPerPay = totalAnnual / userPayCyclesPerYear;

  return Math.round(idealPerPay * 100) / 100;
}

/**
 * Calculate the number of pay cycles elapsed since a start date
 *
 * @param startDate - The start date (e.g., bill cycle start or onboarding date)
 * @param currentDate - Current date
 * @param payC - Pay cycle frequency
 * @returns Number of pay cycles that have elapsed
 */
export function calculatePayCyclesElapsed(
  startDate: Date,
  currentDate: Date,
  payCycle: PayCycle
): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysDiff = Math.floor((currentDate.getTime() - startDate.getTime()) / msPerDay);

  let daysPerCycle: number;
  switch (payCycle) {
    case 'weekly':
      daysPerCycle = 7;
      break;
    case 'fortnightly':
      daysPerCycle = 14;
      break;
    case 'twice_monthly':
      daysPerCycle = 15.2; // Approximate (365/24)
      break;
    case 'monthly':
      daysPerCycle = 30.42; // Approximate (365/12)
      break;
    default:
      daysPerCycle = 30.42;
  }

  return Math.floor(daysDiff / daysPerCycle);
}

/**
 * Calculate the number of pay cycles until a due date
 *
 * @param currentDate - Current date
 * @param dueDate - Due date for the bill
 * @param payCycle - Pay cycle frequency
 * @returns Number of pay cycles until due
 */
export function calculatePayCyclesUntilDue(
  currentDate: Date,
  dueDate: Date,
  payCycle: PayCycle
): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysDiff = Math.ceil((dueDate.getTime() - currentDate.getTime()) / msPerDay);

  if (daysDiff <= 0) return 0;

  let daysPerCycle: number;
  switch (payCycle) {
    case 'weekly':
      daysPerCycle = 7;
      break;
    case 'fortnightly':
      daysPerCycle = 14;
      break;
    case 'twice_monthly':
      daysPerCycle = 15.2;
      break;
    case 'monthly':
      daysPerCycle = 30.42;
      break;
    default:
      daysPerCycle = 30.42;
  }

  return Math.ceil(daysDiff / daysPerCycle);
}

/**
 * Calculate the gap between expected and actual balance
 *
 * Gap Analysis - The Discipline Mechanism:
 * - expectedBalance = idealPerPay × payCyclesElapsed
 * - gap = actualBalance - expectedBalance
 *
 * Positive gap = ahead of schedule (good!)
 * Negative gap = behind schedule (needs attention)
 *
 * @param envelope - The envelope with current balance
 * @param idealPerPay - The ideal allocation per pay cycle
 * @param billCycleStartDate - When the bill cycle started (user specified)
 * @param currentDate - Current date
 * @param userPayCycle - User's pay cycle frequency
 * @returns Gap object with expected balance and gap amount
 */
export function calculateEnvelopeGap(
  envelope: Pick<Envelope, 'current_amount' | 'opening_balance'>,
  idealPerPay: number,
  billCycleStartDate: Date,
  currentDate: Date,
  userPayCycle: PayCycle
): {
  expectedBalance: number;
  actualBalance: number;
  gap: number;
  payCyclesElapsed: number;
  status: 'on_track' | 'slight_deviation' | 'needs_attention';
} {
  const payCyclesElapsed = calculatePayCyclesElapsed(
    billCycleStartDate,
    currentDate,
    userPayCycle
  );

  const expectedBalance = idealPerPay * payCyclesElapsed;
  const actualBalance = (envelope.current_amount || 0) + (envelope.opening_balance || 0);
  const gap = actualBalance - expectedBalance;

  // Determine status based on gap
  let status: 'on_track' | 'slight_deviation' | 'needs_attention';
  const percentageOff = expectedBalance > 0 ? Math.abs(gap) / expectedBalance : 0;

  if (percentageOff <= 0.05) {
    // Within 5% - on track
    status = 'on_track';
  } else if (percentageOff <= 0.15) {
    // Within 15% - slight deviation
    status = 'slight_deviation';
  } else {
    // More than 15% off - needs attention
    status = 'needs_attention';
  }

  return {
    expectedBalance: Math.round(expectedBalance * 100) / 100,
    actualBalance: Math.round(actualBalance * 100) / 100,
    gap: Math.round(gap * 100) / 100,
    payCyclesElapsed,
    status,
  };
}

/**
 * Calculate suggested opening balance for an envelope
 *
 * Formula: suggestedOpeningBalance = targetAmount - (idealPerPay × payCyclesUntilDue)
 *
 * This works backward from the due date to determine how much should be
 * allocated upfront to reach the target by the due date.
 *
 * @param envelope - The envelope with target and due date
 * @param idealPerPay - The ideal allocation per pay cycle
 * @param currentDate - Current date (onboarding date)
 * @param userPayCycle - User's pay cycle frequency
 * @returns Suggested opening balance amount
 */
export function calculateSuggestedOpeningBalance(
  envelope: Pick<Envelope, 'target_amount' | 'due_date'>,
  idealPerPay: number,
  currentDate: Date,
  userPayCycle: PayCycle
): number {
  if (!envelope.due_date) {
    // No due date - suggest 0 opening balance
    return 0;
  }

  const dueDate = new Date(envelope.due_date);
  const payCyclesUntilDue = calculatePayCyclesUntilDue(currentDate, dueDate, userPayCycle);

  const willAccumulate = idealPerPay * payCyclesUntilDue;
  const suggestedOpening = envelope.target_amount - willAccumulate;

  // Don't suggest negative opening balance
  return Math.max(0, Math.round(suggestedOpening * 100) / 100);
}

/**
 * Get visual indicator emoji for gap status
 */
export function getGapStatusEmoji(status: 'on_track' | 'slight_deviation' | 'needs_attention'): string {
  switch (status) {
    case 'on_track':
      return '🟢';
    case 'slight_deviation':
      return '🟡';
    case 'needs_attention':
      return '🔴';
  }
}

/**
 * Get status text for gap status
 */
export function getGapStatusText(status: 'on_track' | 'slight_deviation' | 'needs_attention'): string {
  switch (status) {
    case 'on_track':
      return 'On track';
    case 'slight_deviation':
      return 'Slight deviation';
    case 'needs_attention':
      return 'Needs attention';
  }
}
