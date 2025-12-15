/**
 * Transfer Types
 *
 * Type definitions for internal account transfers and multi-account reconciliation.
 * Transfers between own accounts are neutral to envelope balances.
 */

// =====================================================
// TRANSACTION TYPES
// =====================================================

/**
 * Transaction type classification
 */
export type TransactionType = 'income' | 'expense' | 'transfer';

/**
 * Extended transaction with transfer fields
 */
export interface TransactionWithTransfer {
  id: string;
  user_id: string;
  account_id: string;
  envelope_id: string | null;
  merchant_name: string;
  description: string | null;
  amount: number;
  occurred_at: string;
  status: string;
  transaction_type: TransactionType;
  linked_transaction_id: string | null;
  transfer_to_account_id: string | null;
  transfer_pending: boolean;
  created_at: string;
  // Joined fields
  account_name?: string;
  account_nickname?: string;
  envelope_name?: string;
  linked_account_name?: string;
}

/**
 * Transaction for transfer detection
 */
export interface TransactionForMatching {
  id: string;
  user_id: string;
  account_id: string;
  amount: number;
  occurred_at: string;
  merchant_name: string;
  description: string | null;
  transaction_type: TransactionType;
  linked_transaction_id: string | null;
}

// =====================================================
// TRANSFER DETECTION
// =====================================================

/**
 * Confidence scoring for transfer detection
 */
export interface TransferConfidence {
  /** Overall confidence score 0-100 */
  score: number;
  /** Breakdown of confidence factors */
  factors: {
    /** Points for exact inverse amount match (max 40) */
    amountMatch: number;
    /** Points for date proximity (max 30) */
    dateMatch: number;
    /** Points for description hints like "transfer", "TFR" (max 20) */
    descriptionHint: number;
    /** Points deducted if amount within tolerance but not exact */
    amountTolerance: number;
  };
  /** Human-readable explanation */
  explanation: string;
}

/**
 * Potential transfer match
 */
export interface TransferMatch {
  /** The transaction that might be the other side of a transfer */
  transaction: TransactionForMatching;
  /** Confidence scoring */
  confidence: TransferConfidence;
  /** Account name for display */
  accountName: string;
  /** Account nickname for display */
  accountNickname: string | null;
  /** Amount difference (if any, for bank fees) */
  amountDifference: number;
}

/**
 * Result of transfer detection
 */
export interface TransferDetectionResult {
  /** The original transaction being analyzed */
  sourceTransaction: TransactionForMatching;
  /** Potential matches found, sorted by confidence */
  potentialMatches: TransferMatch[];
  /** Is this likely a transfer? (has matches above threshold) */
  isLikelyTransfer: boolean;
  /** Highest confidence score among matches */
  highestConfidence: number;
  /** Suggested action */
  suggestedAction: 'auto_link' | 'prompt_user' | 'treat_as_expense' | 'mark_pending';
}

// =====================================================
// TRANSFER LINKING
// =====================================================

/**
 * Request to link two transactions as a transfer
 */
export interface LinkTransferRequest {
  /** ID of the first transaction (typically outgoing) */
  transactionId1: string;
  /** ID of the second transaction (typically incoming) */
  transactionId2: string;
}

/**
 * Request to unlink a transfer
 */
export interface UnlinkTransferRequest {
  /** ID of either transaction in the linked pair */
  transactionId: string;
}

/**
 * Result of linking/unlinking operation
 */
export interface TransferLinkResult {
  success: boolean;
  error?: string;
  /** Updated transactions after the operation */
  transactions?: TransactionWithTransfer[];
}

// =====================================================
// MULTI-ACCOUNT RECONCILIATION
// =====================================================

/**
 * Account summary for reconciliation display
 */
export interface AccountSummary {
  accountId: string;
  displayName: string;
  accountName: string;
  accountType: string;
  institution: string | null;
  currentBalance: number;
  transactionCount: number;
  lastTransactionDate: string | null;
}

/**
 * Multi-account reconciliation result
 */
export interface MultiAccountReconciliation {
  /** Total across all bank accounts (checking + savings + transaction + cash) */
  totalBankBalance: number;
  /** Individual account breakdowns */
  accounts: AccountSummary[];
  /** Total envelope balances */
  totalEnvelopeBalance: number;
  /** CC Holding balance (to subtract) */
  ccHoldingBalance: number;
  /** Unallocated surplus */
  surplus: number;
  /** Expected bank balance (envelopes - CC holding + surplus) */
  expectedBankBalance: number;
  /** Discrepancy between actual and expected */
  discrepancy: number;
  /** Is the reconciliation balanced? */
  isBalanced: boolean;
  /** Human-readable explanation */
  explanation: string;
}

// =====================================================
// TRANSFER DISPLAY
// =====================================================

/**
 * Transfer pair for display purposes
 */
export interface TransferPair {
  /** Outgoing transaction (negative amount) */
  outgoing: TransactionWithTransfer;
  /** Incoming transaction (positive amount) */
  incoming: TransactionWithTransfer;
  /** Net effect (should be 0 for perfect transfers) */
  netAmount: number;
  /** Date of the transfer (use outgoing date) */
  transferDate: string;
  /** Description to display */
  displayDescription: string;
}

/**
 * Constants for transfer detection thresholds
 */
export const TRANSFER_THRESHOLDS = {
  /** Auto-link without prompting */
  AUTO_LINK: 90,
  /** Show in suggestions dialog */
  SUGGEST: 70,
  /** Ignore as potential transfer */
  IGNORE: 70,
  /** Amount tolerance for matching (percentage) */
  AMOUNT_TOLERANCE_PERCENT: 0.5,
  /** Amount tolerance for matching (absolute, for small amounts) */
  AMOUNT_TOLERANCE_ABSOLUTE: 1,
  /** Maximum days apart for transfer match */
  MAX_DAYS_APART: 3,
} as const;

/**
 * Keywords that suggest a transaction is a transfer
 */
export const TRANSFER_KEYWORDS = [
  'transfer',
  'tfr',
  'xfer',
  'internal',
  'from savings',
  'to savings',
  'to bills',
  'from bills',
  'to cheque',
  'from cheque',
  'to checking',
  'from checking',
  'move',
  'sweep',
] as const;
