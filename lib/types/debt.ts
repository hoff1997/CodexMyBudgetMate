/**
 * Debt Types
 * Types for debt tracking within the unified debt envelope system
 */

/**
 * Type of debt
 */
export type DebtType = 'credit_card' | 'personal_loan' | 'car_loan' | 'student_loan' | 'afterpay' | 'hp' | 'other';

/**
 * Debt type options for dropdowns/selects
 */
export const DEBT_TYPE_OPTIONS = [
  { value: 'credit_card' as DebtType, label: 'Credit Card', icon: '💳' },
  { value: 'personal_loan' as DebtType, label: 'Personal Loan', icon: '🏦' },
  { value: 'car_loan' as DebtType, label: 'Car Loan', icon: '🚗' },
  { value: 'student_loan' as DebtType, label: 'Student Loan', icon: '🎓' },
  { value: 'afterpay' as DebtType, label: 'Afterpay / BNPL', icon: '📱' },
  { value: 'hp' as DebtType, label: 'Hire Purchase', icon: '📋' },
  { value: 'other' as DebtType, label: 'Other', icon: '📦' },
] as const;

/**
 * Get debt type label from value
 */
export function getDebtTypeLabel(debtType: DebtType): string {
  return DEBT_TYPE_OPTIONS.find(opt => opt.value === debtType)?.label || 'Other';
}

/**
 * Get debt type icon from value
 */
export function getDebtTypeIcon(debtType: DebtType): string {
  return DEBT_TYPE_OPTIONS.find(opt => opt.value === debtType)?.icon || '📦';
}

/**
 * Individual debt item within a debt envelope (database record)
 */
export interface DebtItem {
  id: string;
  user_id: string;
  envelope_id: string;
  name: string;
  debt_type: DebtType;
  linked_account_id: string | null;
  starting_balance: number;
  current_balance: number;
  interest_rate: number | null;
  minimum_payment: number | null;
  display_order: number;
  paid_off_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Debt item for form/dialog use (without database metadata)
 */
export interface DebtItemInput {
  id?: string;
  name: string;
  debt_type: DebtType;
  linked_account_id?: string | null;
  starting_balance: number;
  current_balance: number;
  interest_rate?: number | null;
  minimum_payment?: number | null;
}

/**
 * Debt item with calculated fields for display
 */
export interface DebtItemWithProgress extends DebtItem {
  progress_percent: number;  // (starting - current) / starting * 100
  amount_paid_off: number;   // starting - current
  is_paid_off: boolean;
}

/**
 * Calculate progress for a debt item
 */
export function calculateDebtProgress(item: DebtItem): DebtItemWithProgress {
  const amountPaidOff = Math.max(0, item.starting_balance - item.current_balance);
  const progressPercent = item.starting_balance > 0
    ? Math.min(100, (amountPaidOff / item.starting_balance) * 100)
    : 0;
  const isPaidOff = item.current_balance <= 0;

  return {
    ...item,
    progress_percent: progressPercent,
    amount_paid_off: amountPaidOff,
    is_paid_off: isPaidOff,
  };
}

/**
 * Sort debt items by snowball method (smallest balance first)
 */
export function sortBySnowball(items: DebtItem[]): DebtItem[] {
  return [...items].sort((a, b) => {
    // Paid off items go to the end
    if (a.paid_off_at && !b.paid_off_at) return 1;
    if (!a.paid_off_at && b.paid_off_at) return -1;

    // Sort by current balance ascending (smallest first)
    return a.current_balance - b.current_balance;
  });
}

/**
 * Linked credit card account (for CC auto-detection)
 */
export interface LinkedCreditCard {
  id: string;
  name: string;
  current_balance: number;
  is_already_linked: boolean;  // True if already linked to a debt_item
}

/**
 * Debt envelope summary
 */
export interface DebtEnvelopeSummary {
  total_debt: number;
  total_paid_off: number;
  total_starting: number;
  progress_percent: number;
  debt_count: number;
  paid_off_count: number;
  next_to_payoff: DebtItem | null;  // Smallest balance debt that's not paid off
}

/**
 * Calculate summary for a list of debt items
 */
export function calculateDebtSummary(items: DebtItem[]): DebtEnvelopeSummary {
  const totalStarting = items.reduce((sum, item) => sum + item.starting_balance, 0);
  const totalCurrent = items.reduce((sum, item) => sum + item.current_balance, 0);
  const totalPaidOff = totalStarting - totalCurrent;
  const progressPercent = totalStarting > 0 ? (totalPaidOff / totalStarting) * 100 : 0;
  const paidOffCount = items.filter(item => item.paid_off_at !== null).length;

  // Find smallest unpaid debt
  const unpaidItems = items.filter(item => item.paid_off_at === null && item.current_balance > 0);
  const nextToPayoff = unpaidItems.length > 0
    ? unpaidItems.reduce((smallest, item) =>
        item.current_balance < smallest.current_balance ? item : smallest
      )
    : null;

  return {
    total_debt: totalCurrent,
    total_paid_off: totalPaidOff,
    total_starting: totalStarting,
    progress_percent: progressPercent,
    debt_count: items.length,
    paid_off_count: paidOffCount,
    next_to_payoff: nextToPayoff,
  };
}

/**
 * Payoff projection for a debt
 */
export interface PayoffProjection {
  months_to_payoff: number;
  total_interest: number;
  total_payment: number;
  monthly_payment: number;
}

/**
 * Calculate payoff projection for a debt
 * Uses simple amortization calculation
 */
export function calculatePayoffProjection(
  currentBalance: number,
  interestRate: number | null,
  monthlyPayment: number
): PayoffProjection | null {
  if (currentBalance <= 0 || monthlyPayment <= 0) return null;

  const apr = interestRate || 0;
  const monthlyRate = apr / 100 / 12;

  let balance = currentBalance;
  let months = 0;
  let totalInterest = 0;
  const maxMonths = 360; // 30 year cap

  while (balance > 0 && months < maxMonths) {
    const interestCharge = balance * monthlyRate;
    totalInterest += interestCharge;
    const principal = Math.min(monthlyPayment - interestCharge, balance);

    if (principal <= 0) {
      // Payment doesn't cover interest - will never pay off
      return null;
    }

    balance -= principal;
    months++;
  }

  if (months >= maxMonths) return null;

  return {
    months_to_payoff: months,
    total_interest: Math.round(totalInterest * 100) / 100,
    total_payment: Math.round((currentBalance + totalInterest) * 100) / 100,
    monthly_payment: monthlyPayment,
  };
}

/**
 * Compare two payment amounts for savings display
 */
export interface PaymentComparison {
  minimum: PayoffProjection | null;
  increased: PayoffProjection | null;
  months_saved: number;
  interest_saved: number;
}

/**
 * Compare minimum payment vs increased payment
 */
export function comparePayments(
  currentBalance: number,
  interestRate: number | null,
  minimumPayment: number,
  increasedPayment: number
): PaymentComparison {
  const minimum = calculatePayoffProjection(currentBalance, interestRate, minimumPayment);
  const increased = calculatePayoffProjection(currentBalance, interestRate, increasedPayment);

  return {
    minimum,
    increased,
    months_saved: minimum && increased ? minimum.months_to_payoff - increased.months_to_payoff : 0,
    interest_saved: minimum && increased ? minimum.total_interest - increased.total_interest : 0,
  };
}

/**
 * API response types
 */
export interface DebtItemsResponse {
  items: DebtItem[];
  summary: DebtEnvelopeSummary;
}

/**
 * Debt allocation dialog props
 */
export interface DebtAllocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  envelope: {
    id: string;
    name: string;
    icon: string;
    is_debt: boolean;
    target_amount: number;
    current_amount: number;
  };
  existingDebtItems?: DebtItem[];
  availableCreditCards?: LinkedCreditCard[];
  onSave: (items: DebtItemInput[], budgetChange: number) => Promise<void>;
}

// ============================================
// Legacy types (kept for backwards compatibility)
// ============================================

export type DebtLiability = {
  id: string;
  name: string;
  liabilityType: string;
  balance: number;
  interestRate: number;
};

export type DebtEnvelope = {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  payCycleAmount: number;
  frequency: string | null;
  nextPaymentDue: string | null;
};
