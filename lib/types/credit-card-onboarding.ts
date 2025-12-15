/**
 * Credit Card Onboarding & Dashboard Types
 *
 * Type definitions for the credit card configuration system including:
 * - Usage type selection (pay_in_full, paying_down, minimum_only)
 * - Billing cycle tracking
 * - Payment reconciliation
 * - Payoff projections
 */

import type { AccountRow as Account } from './accounts';
// Envelope type is only used for documentation - using minimal inline type

// =====================================================
// ENUMS & UNION TYPES
// =====================================================

/**
 * How the user uses their credit card
 * - pay_in_full: Pays off balance each month (Option A)
 * - paying_down: Carrying a balance they want to reduce (Option B)
 * - minimum_only: Just tracking minimum payments (Option C)
 */
export type CreditCardUsageType = 'pay_in_full' | 'paying_down' | 'minimum_only';

/**
 * User preference for how CC payments should be split
 */
export type PaymentSplitPreference = 'ask_every_time' | 'auto_split' | 'all_to_debt';

/**
 * How a payment reconciliation was performed
 */
export type ReconciliationMethod = 'auto_split' | 'user_split' | 'all_to_debt' | 'all_to_holding';

/**
 * Type of payoff projection calculation
 */
export type ProjectionType = 'minimum_only' | 'current_payment' | 'custom';

/**
 * Card network identifier
 */
export type CardNetwork = 'visa' | 'mastercard' | 'amex' | 'discover' | 'other';

// =====================================================
// ONBOARDING CONFIGURATION
// =====================================================

/**
 * Credit card configuration collected during onboarding
 */
export interface CreditCardConfig {
  /** Account ID of the credit card */
  accountId: string;

  /** Display name of the account */
  accountName: string;

  /** How the user uses this card */
  usageType: CreditCardUsageType;

  /** Billing cycle information */
  billingCycle?: {
    /** Day of month when statement closes (1-31) */
    statementCloseDay: number;
    /** Day of month when payment is due (1-31) */
    paymentDueDay: number;
  };

  // Interest tracking
  /** Annual Percentage Rate */
  apr?: number;

  // Pay-in-full specific (Option A)
  /** Current outstanding that needs to be covered */
  currentOutstanding?: number;

  /** Expected monthly spending on this card */
  expectedMonthlySpending?: number;

  // Paying-down / minimum-only specific (Options B/C)
  /** Whether user is still using this card for new purchases */
  stillUsing?: boolean;

  /** Starting debt amount at time of onboarding */
  startingDebtAmount?: number;

  /** Date when starting debt was recorded */
  startingDebtDate?: string;

  /** Minimum payment amount */
  minimumPayment?: number;
}

/**
 * Payment split for reconciliation dialog
 */
export interface PaymentSplit {
  /** Amount from holding envelope */
  holdingPortion: number;
  /** Amount toward interest */
  interestPortion: number;
  /** Extra amount toward principal */
  extraPrincipal: number;
}

/**
 * Validation result for credit card configuration
 */
export interface CreditCardConfigValidation {
  isValid: boolean;
  errors: {
    field: keyof CreditCardConfig;
    message: string;
  }[];
  warnings: {
    field: keyof CreditCardConfig;
    message: string;
  }[];
}

// =====================================================
// BILLING CYCLE TRACKING
// =====================================================

/**
 * Credit card cycle holding record
 * Tracks spending and coverage per billing cycle
 */
export interface CreditCardCycleHolding {
  id: string;
  userId: string;
  accountId: string;

  /** Billing cycle identifier (YYYY-MM) */
  billingCycle: string;

  /** Date when this statement closes */
  statementCloseDate: Date;

  /** Date when payment is due */
  paymentDueDate: Date;

  /** Total spending in this cycle */
  spendingAmount: number;

  /** Amount covered by holding envelope */
  coveredAmount: number;

  /** Interest charged this cycle */
  interestAmount: number;

  /** Is this the current active cycle */
  isCurrentCycle: boolean;

  /** Has this cycle been closed */
  isClosed: boolean;

  /** When the cycle was closed */
  closedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Computed values for a billing cycle
 */
export interface CycleComputedValues {
  /** Amount still uncovered in this cycle */
  uncoveredAmount: number;

  /** Coverage percentage (0-100) */
  coveragePercent: number;

  /** Days until statement closes */
  daysUntilClose: number;

  /** Days until payment is due */
  daysUntilDue: number;

  /** Is payment overdue */
  isOverdue: boolean;
}

// =====================================================
// PAYMENT RECONCILIATION
// =====================================================

/**
 * Payment reconciliation record
 * Records how a CC payment was split
 */
export interface PaymentReconciliation {
  id: string;
  userId: string;
  accountId: string;
  transactionId: string;

  /** Total payment amount */
  totalPaymentAmount: number;

  /** Date of payment */
  paymentDate: Date;

  /** Amount applied to holding (covers new spending) */
  amountToHolding: number;

  /** Amount applied to debt principal */
  amountToDebt: number;

  /** Amount applied to interest */
  amountToInterest: number;

  /** Billing cycle this payment applies to */
  billingCycle: string;

  /** How the reconciliation was done */
  reconciliationMethod: ReconciliationMethod;

  createdAt: Date;
}

/**
 * Suggested payment split calculation
 */
export interface PaymentSplitSuggestion {
  /** Amount to apply to holding */
  toHolding: number;

  /** Amount to apply to interest */
  toInterest: number;

  /** Amount to apply to debt principal */
  toDebt: number;

  /** Explanation text for the user */
  explanation: string;

  /** Whether this covers all current spending */
  coversAllSpending: boolean;
}

// =====================================================
// PAYOFF PROJECTIONS
// =====================================================

/**
 * Payoff projection record
 */
export interface PayoffProjection {
  id?: string;
  userId?: string;
  accountId: string;

  /** Monthly payment used for calculation */
  monthlyPaymentAmount: number;

  /** APR used for calculation */
  aprUsed: number;

  /** Starting balance for calculation */
  startingBalance: number;

  /** Projected date debt will be paid off */
  projectedPayoffDate: Date | null;

  /** Total interest that will be paid */
  totalInterestProjected: number;

  /** Total of all payments */
  totalPaymentsProjected: number;

  /** Number of months to payoff */
  monthsToPayoff: number;

  /** Type of projection */
  projectionType: ProjectionType;

  /** When this was calculated */
  calculatedAt: Date;
}

/**
 * Comparison between two payment scenarios
 */
export interface PayoffComparison {
  /** Projection with current/lower payment */
  current: PayoffProjection;

  /** Projection with higher payment */
  alternative: PayoffProjection;

  /** Months saved with higher payment */
  monthsSaved: number;

  /** Interest saved with higher payment */
  interestSaved: number;

  /** Additional monthly payment needed */
  additionalMonthlyPayment: number;
}

// =====================================================
// DASHBOARD DATA
// =====================================================

/**
 * Debt progress tracking
 */
export interface DebtProgress {
  /** Starting debt at time of onboarding */
  startingDebt: number;

  /** Current debt amount */
  currentDebt: number;

  /** Amount paid off (startingDebt - currentDebt) */
  paidOff: number;

  /** Percentage complete (0-100) */
  percentComplete: number;

  /** Total interest paid since onboarding */
  totalInterestPaid: number;
}

/**
 * Complete dashboard data for a credit card
 */
export interface CreditCardDashboardData {
  /** The credit card account */
  account: Account;

  /** Configuration from onboarding */
  config: CreditCardConfig;

  /** Current billing cycle data */
  currentCycle: CreditCardCycleHolding | null;

  /** Next billing cycle data (if spending has started) */
  nextCycle: CreditCardCycleHolding | null;

  /** CC Holding envelope (if applicable) */
  holdingEnvelope: { id: string; name: string; current_amount: number } | null;

  /** CC Payment envelope */
  paymentEnvelope: { id: string; name: string; current_amount: number; target_amount: number | null } | null;

  /** Current payoff projection (for paying-down cards) */
  payoffProjection: PayoffProjection | null;

  // Computed values
  /** Spending in current/this statement period */
  thisStatementSpending: number;

  /** Amount covered for this statement */
  thisStatementCovered: number;

  /** Spending in next statement period */
  nextStatementSpending: number;

  /** Amount covered for next statement */
  nextStatementCovered: number;

  /** Total uncovered across all cycles */
  totalUncovered: number;

  /** Total interest paid since onboarding */
  totalInterestPaid: number;

  /** Debt payoff progress (for paying-down cards) */
  debtProgress: DebtProgress | null;

  /** Days until next event (close or due) */
  daysUntilNextEvent: number;

  /** Description of next event */
  nextEventDescription: string;
}

// =====================================================
// MULTI-CARD OPTIMIZATION
// =====================================================

/**
 * Payment strategy type
 */
export type PaymentStrategy = 'avalanche' | 'snowball' | 'custom';

/**
 * Recommended payment for a single card
 */
export interface CardPaymentRecommendation {
  accountId: string;
  accountName: string;
  currentBalance: number;
  apr: number;
  minimumPayment: number;
  recommendedPayment: number;
  priority: number;
  reason: string;
}

/**
 * Multi-card optimization result
 */
export interface MultiCardOptimization {
  strategy: PaymentStrategy;
  totalMonthlyPayment: number;
  recommendations: CardPaymentRecommendation[];
  projectedPayoffDate: Date;
  totalInterestProjected: number;
  comparisonToMinimumOnly: {
    monthsSaved: number;
    interestSaved: number;
  };
}

// =====================================================
// API PAYLOADS
// =====================================================

/**
 * Payload for creating CC configuration during onboarding
 */
export interface CreateCreditCardConfigPayload {
  configs: CreditCardConfig[];
}

/**
 * Payload for recording a payment reconciliation
 */
export interface RecordPaymentReconciliationPayload {
  accountId: string;
  transactionId: string;
  totalPaymentAmount: number;
  paymentDate: string;
  amountToHolding: number;
  amountToDebt: number;
  amountToInterest: number;
  reconciliationMethod: ReconciliationMethod;
  rememberPreference?: boolean;
}

/**
 * Payload for updating cycle holding
 */
export interface UpdateCycleHoldingPayload {
  accountId: string;
  billingCycle: string;
  spendingDelta?: number;
  coveredDelta?: number;
  interestDelta?: number;
}
