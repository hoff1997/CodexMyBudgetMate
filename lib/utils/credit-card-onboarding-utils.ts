/**
 * Credit Card Onboarding Utilities
 *
 * Helper functions for credit card configuration, envelope creation,
 * billing cycle calculations, and payment detection.
 */

import type {
  CreditCardConfig,
  CreditCardConfigValidation,
  CreditCardCycleHolding,
  CycleComputedValues,
  PaymentSplitSuggestion,
} from '@/lib/types/credit-card-onboarding';
import type { AccountRow as Account } from '@/lib/types/accounts';
import { SupabaseClient } from "@supabase/supabase-js";

// =====================================================
// CATEGORY HELPERS
// =====================================================

/**
 * Find or create the "Debt" category for payoff envelopes
 * Returns the category ID
 */
export async function findOrCreateDebtCategory(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  // Check if "Debt" category already exists
  const { data: existing } = await supabase
    .from("envelope_categories")
    .select("id")
    .eq("user_id", userId)
    .eq("name", "Debt")
    .maybeSingle();

  if (existing) {
    return existing.id;
  }

  // Create new "Debt" category
  const { data, error } = await supabase
    .from("envelope_categories")
    .insert({
      user_id: userId,
      name: "Debt",
      icon: "💳",
      sort_order: 1, // Show near top
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error creating Debt category:", error);
    return null;
  }

  return data?.id || null;
}

// =====================================================
// ENVELOPE CREATION
// =====================================================

export interface EnvelopeCreatePayload {
  name: string;
  category_id?: string;
  subtype: 'bill' | 'spending' | 'savings' | 'goal' | 'tracking';
  target_amount?: number;
  current_amount: number;
  frequency?: string;
  due_day?: number;
  priority?: number;
  is_cc_holding?: boolean;
  is_credit_card_payment?: boolean;
  cc_account_id?: string;
  linked_account_id?: string;
  notes?: string;
}

/**
 * Create CC Holding envelope payload for a credit card
 */
export function createCCHoldingEnvelope(config: CreditCardConfig): EnvelopeCreatePayload {
  const seedAmount = calculateHoldingSeedAmount(config);

  return {
    name: `${config.accountName} Holding`,
    subtype: 'tracking', // Holding envelopes are tracking type
    current_amount: seedAmount,
    is_cc_holding: true,
    cc_account_id: config.accountId,
    priority: 1, // Essential priority
    notes: `Tracks spending coverage for ${config.accountName}`,
  };
}

/**
 * Create CC Payoff envelope (bill type) for a credit card with debt
 * This envelope is used to track and allocate money for debt elimination
 */
export function createCCPayoffEnvelope(config: CreditCardConfig): EnvelopeCreatePayload {
  // Target amount is the minimum payment for debt payoff
  const targetAmount = config.minimumPayment || Math.ceil((config.startingDebtAmount || 0) * 0.02);

  return {
    name: `${config.accountName} Payoff`,
    subtype: 'bill',
    target_amount: targetAmount,
    current_amount: 0,
    frequency: 'monthly',
    due_day: config.billingCycle?.paymentDueDay,
    priority: 1, // Essential priority - CC payments are must-pay
    is_credit_card_payment: true,
    linked_account_id: config.accountId,
    notes: `Debt payoff for ${config.accountName}`,
  };
}

/**
 * Create CC Payment envelope (bill type) for a credit card (pay-in-full users)
 * @deprecated Use createCCPayoffEnvelope for debt, this is for pay-in-full cards
 */
export function createCCPaymentEnvelope(config: CreditCardConfig): EnvelopeCreatePayload {
  // Determine target amount based on usage type
  let targetAmount: number;
  if (config.usageType === 'pay_in_full') {
    targetAmount = config.expectedMonthlySpending || 0;
  } else {
    targetAmount = config.minimumPayment || 0;
  }

  return {
    name: `${config.accountName} Payment`,
    subtype: 'bill',
    target_amount: targetAmount,
    current_amount: 0,
    frequency: 'monthly',
    due_day: config.billingCycle?.paymentDueDay,
    priority: 1, // Essential priority - CC payments are must-pay
    is_credit_card_payment: true,
    linked_account_id: config.accountId,
    notes: config.usageType === 'pay_in_full'
      ? `Monthly payment for ${config.accountName}`
      : `Minimum payment for ${config.accountName} (paying down debt)`,
  };
}

/**
 * Calculate the seed amount for a CC Holding envelope
 */
export function calculateHoldingSeedAmount(config: CreditCardConfig): number {
  switch (config.usageType) {
    case 'pay_in_full':
      // Seed with current outstanding - this is what they need to cover
      return config.currentOutstanding || 0;

    case 'paying_down':
    case 'minimum_only':
      // Hybrid users (still using card): seed with $0, track new spending from now
      // Frozen users: no holding envelope created
      if (config.stillUsing) {
        return 0;
      }
      // Frozen cards don't get holding envelopes
      return 0;

    default:
      return 0;
  }
}

/**
 * Determine if a holding envelope should be created for this config
 */
export function shouldCreateHoldingEnvelope(config: CreditCardConfig): boolean {
  if (config.usageType === 'pay_in_full') {
    return true;
  }

  // For paying_down and minimum_only, only create if still using card (hybrid mode)
  return config.stillUsing === true;
}

// =====================================================
// BILLING CYCLE CALCULATIONS
// =====================================================

/**
 * Get the current billing cycle identifier (YYYY-MM)
 * The cycle is named after when the payment is DUE, not when spending occurs
 */
export function getCurrentBillingCycle(statementCloseDay: number): string {
  const today = new Date();
  const currentDay = today.getDate();

  let year = today.getFullYear();
  let month = today.getMonth() + 1; // 1-indexed

  // If we're past the statement close day, we're spending towards next month's cycle
  if (currentDay > statementCloseDay) {
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  return `${year}-${String(month).padStart(2, '0')}`;
}

/**
 * Get the previous billing cycle identifier
 */
export function getPreviousBillingCycle(billingCycle: string): string {
  const [year, month] = billingCycle.split('-').map(Number);

  let prevYear = year;
  let prevMonth = month - 1;

  if (prevMonth < 1) {
    prevMonth = 12;
    prevYear -= 1;
  }

  return `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
}

/**
 * Get the next billing cycle identifier
 */
export function getNextBillingCycle(billingCycle: string): string {
  const [year, month] = billingCycle.split('-').map(Number);

  let nextYear = year;
  let nextMonth = month + 1;

  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }

  return `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
}

/**
 * Calculate the actual dates for a billing cycle
 */
export function calculateCycleDates(
  statementCloseDay: number,
  paymentDueDay: number,
  billingCycle: string
): { statementCloseDate: Date; paymentDueDate: Date } {
  const [year, month] = billingCycle.split('-').map(Number);

  // Statement closes in the previous month
  let closeYear = year;
  let closeMonth = month - 1;
  if (closeMonth < 1) {
    closeMonth = 12;
    closeYear -= 1;
  }

  // Handle months with fewer days
  const daysInCloseMonth = new Date(closeYear, closeMonth, 0).getDate();
  const actualCloseDay = Math.min(statementCloseDay, daysInCloseMonth);

  const daysInDueMonth = new Date(year, month, 0).getDate();
  const actualDueDay = Math.min(paymentDueDay, daysInDueMonth);

  return {
    statementCloseDate: new Date(closeYear, closeMonth - 1, actualCloseDay),
    paymentDueDate: new Date(year, month - 1, actualDueDay),
  };
}

/**
 * Get the next payment due date
 */
export function getNextPaymentDueDate(paymentDueDay: number): Date {
  const today = new Date();
  const currentDay = today.getDate();

  let dueDate = new Date(today.getFullYear(), today.getMonth(), paymentDueDay);

  // If we're past the due day this month, use next month
  if (currentDay > paymentDueDay) {
    dueDate.setMonth(dueDate.getMonth() + 1);
  }

  // Handle months with fewer days
  const daysInMonth = new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, 0).getDate();
  if (paymentDueDay > daysInMonth) {
    dueDate.setDate(daysInMonth);
  }

  return dueDate;
}

/**
 * Compute derived values for a billing cycle
 */
export function computeCycleValues(cycle: CreditCardCycleHolding): CycleComputedValues {
  const today = new Date();
  const closeDate = new Date(cycle.statementCloseDate);
  const dueDate = new Date(cycle.paymentDueDate);

  const uncoveredAmount = Math.max(0, cycle.spendingAmount - cycle.coveredAmount);
  const coveragePercent = cycle.spendingAmount > 0
    ? Math.min(100, (cycle.coveredAmount / cycle.spendingAmount) * 100)
    : 100;

  const daysUntilClose = Math.ceil((closeDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  return {
    uncoveredAmount,
    coveragePercent,
    daysUntilClose,
    daysUntilDue,
    isOverdue: daysUntilDue < 0,
  };
}

// =====================================================
// PAYMENT DETECTION & SPLITTING
// =====================================================

/**
 * Detect if a transaction is likely a credit card payment
 */
export function detectCCPaymentTransaction(
  transaction: { amount: number; description: string; account_id?: string },
  creditCards: Account[]
): Account | null {
  // Payment to a CC is typically a positive amount TO the credit card account
  // or a negative amount FROM a bank account with CC-related description

  // Check if transaction is TO a credit card account
  if (transaction.account_id) {
    const targetCard = creditCards.find(cc => cc.id === transaction.account_id);
    if (targetCard && transaction.amount > 0) {
      return targetCard;
    }
  }

  // Check description for CC payment keywords
  const paymentKeywords = [
    'credit card payment',
    'cc payment',
    'card payment',
    'visa payment',
    'mastercard payment',
    'amex payment',
    'discover payment',
  ];

  const descLower = transaction.description.toLowerCase();
  if (paymentKeywords.some(keyword => descLower.includes(keyword))) {
    // Try to match to a specific card by name in description
    for (const card of creditCards) {
      if (descLower.includes(card.name.toLowerCase())) {
        return card;
      }
    }
    // Return first credit card if can't determine which one
    return creditCards[0] || null;
  }

  return null;
}

/**
 * Calculate suggested payment split
 */
export function calculatePaymentSplit(
  paymentAmount: number,
  holdingBalance: number,
  interestDue: number
): PaymentSplitSuggestion {
  // Priority: Interest first, then holding, then debt
  let toInterest = 0;
  let toHolding = 0;
  let toDebt = 0;
  let remaining = paymentAmount;

  // 1. Cover interest first
  if (interestDue > 0 && remaining > 0) {
    toInterest = Math.min(interestDue, remaining);
    remaining -= toInterest;
  }

  // 2. Cover holding (new spending) next
  if (holdingBalance > 0 && remaining > 0) {
    toHolding = Math.min(holdingBalance, remaining);
    remaining -= toHolding;
  }

  // 3. Remainder goes to debt principal
  toDebt = remaining;

  const coversAllSpending = toHolding >= holdingBalance;

  let explanation: string;
  if (toHolding > 0 && toDebt > 0) {
    explanation = `$${toHolding.toFixed(2)} covers your recent spending, $${toDebt.toFixed(2)} pays down your debt`;
  } else if (toHolding > 0) {
    explanation = `$${toHolding.toFixed(2)} covers your recent spending`;
  } else if (toDebt > 0) {
    explanation = `$${toDebt.toFixed(2)} goes toward paying down your debt`;
  } else {
    explanation = 'Payment amount is zero';
  }

  if (toInterest > 0) {
    explanation = `$${toInterest.toFixed(2)} covers interest, ` + explanation;
  }

  return {
    toHolding,
    toInterest,
    toDebt,
    explanation,
    coversAllSpending,
  };
}

// =====================================================
// VALIDATION
// =====================================================

/**
 * Validate a credit card configuration
 */
export function validateCreditCardConfig(config: CreditCardConfig): CreditCardConfigValidation {
  const errors: CreditCardConfigValidation['errors'] = [];
  const warnings: CreditCardConfigValidation['warnings'] = [];

  // Required fields
  if (!config.accountId) {
    errors.push({ field: 'accountId', message: 'Account is required' });
  }

  if (!config.usageType) {
    errors.push({ field: 'usageType', message: 'Please select how you use this card' });
  }

  // Billing cycle is required for all types
  const statementCloseDay = config.billingCycle?.statementCloseDay;
  if (!statementCloseDay || statementCloseDay < 1 || statementCloseDay > 31) {
    errors.push({ field: 'billingCycle', message: 'Statement close day must be between 1 and 31' });
  }

  const paymentDueDay = config.billingCycle?.paymentDueDay;
  if (!paymentDueDay || paymentDueDay < 1 || paymentDueDay > 31) {
    errors.push({ field: 'billingCycle', message: 'Payment due day must be between 1 and 31' });
  }

  // Type-specific validation
  if (config.usageType === 'pay_in_full') {
    if (config.currentOutstanding === undefined || config.currentOutstanding < 0) {
      warnings.push({ field: 'currentOutstanding', message: 'Current outstanding should be specified' });
    }
  }

  if (config.usageType === 'paying_down' || config.usageType === 'minimum_only') {
    // APR is important for debt calculations
    if (!config.apr || config.apr <= 0) {
      warnings.push({ field: 'apr', message: 'APR helps us calculate your payoff projection' });
    }

    // Minimum payment needed
    if (!config.minimumPayment || config.minimumPayment <= 0) {
      warnings.push({ field: 'minimumPayment', message: 'Minimum payment helps track your obligations' });
    }

    // Check for $0 balance on "paying down"
    if (config.usageType === 'paying_down' && Math.abs(config.startingDebtAmount || 0) < 1) {
      warnings.push({
        field: 'startingDebtAmount',
        message: 'Balance is $0 - consider selecting "Pay in full" instead'
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Check if all credit card configs are valid
 */
export function validateAllConfigs(configs: CreditCardConfig[]): {
  isValid: boolean;
  validationResults: Map<string, CreditCardConfigValidation>;
} {
  const results = new Map<string, CreditCardConfigValidation>();
  let allValid = true;

  for (const config of configs) {
    const validation = validateCreditCardConfig(config);
    results.set(config.accountId, validation);
    if (!validation.isValid) {
      allValid = false;
    }
  }

  return { isValid: allValid, validationResults: results };
}

// =====================================================
// FORMATTING HELPERS
// =====================================================

/**
 * Format a billing cycle for display (e.g., "January 2025")
 */
export function formatBillingCycle(billingCycle: string): string {
  const [year, month] = billingCycle.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/**
 * Format days until event
 */
export function formatDaysUntil(days: number, event: 'close' | 'due'): string {
  if (days < 0) {
    const absDays = Math.abs(days);
    return event === 'due'
      ? `Payment overdue by ${absDays} day${absDays !== 1 ? 's' : ''}`
      : `Statement closed ${absDays} day${absDays !== 1 ? 's' : ''} ago`;
  }

  if (days === 0) {
    return event === 'due' ? 'Payment due today' : 'Statement closes today';
  }

  if (days === 1) {
    return event === 'due' ? 'Payment due tomorrow' : 'Statement closes tomorrow';
  }

  return event === 'due'
    ? `Payment due in ${days} days`
    : `Statement closes in ${days} days`;
}

/**
 * Get usage type label for display
 */
export function getUsageTypeLabel(usageType: CreditCardConfig['usageType']): string {
  switch (usageType) {
    case 'pay_in_full':
      return 'Pay in Full';
    case 'paying_down':
      return 'Paying Down';
    case 'minimum_only':
      return 'Minimum Only';
    default:
      return 'Unknown';
  }
}

/**
 * Get usage type description
 */
export function getUsageTypeDescription(usageType: CreditCardConfig['usageType']): string {
  switch (usageType) {
    case 'pay_in_full':
      return 'You pay off the balance each month';
    case 'paying_down':
      return 'You\'re working to pay down the balance';
    case 'minimum_only':
      return 'You\'re tracking minimum payments';
    default:
      return '';
  }
}
