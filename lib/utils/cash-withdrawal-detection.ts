/**
 * Cash Withdrawal Detection Utility
 *
 * Detects ATM withdrawals and cash-out transactions during reconciliation
 * to prompt users to add the amount to their Wallet.
 */

/**
 * Patterns that indicate a cash withdrawal transaction
 * These are common NZ bank transaction descriptions for ATM withdrawals
 */
const ATM_PATTERNS = [
  /\bATM\b/i, // "ATM WITHDRAWAL", "ATM 123 QUEEN ST"
  /\bCASH\s*OUT\b/i, // "CASH OUT", "CASHOUT"
  /\bWITHDRAWAL\b/i, // "WITHDRAWAL", "CASH WITHDRAWAL"
  /\bCASH\s*BACK\b/i, // "CASH BACK", "CASHBACK"
  /\bTELLER\b/i, // "TELLER WITHDRAWAL"
  /\bCASH\s*ADV/i, // "CASH ADVANCE"
  /\bWITHDRW\b/i, // Abbreviated form
  /\bCASH\s*W\/D\b/i, // "CASH W/D"
  /\bKIWIBANK\s*ATM\b/i, // "KIWIBANK ATM"
  /\bANZ\s*ATM\b/i, // "ANZ ATM"
  /\bBNZ\s*ATM\b/i, // "BNZ ATM"
  /\bASB\s*ATM\b/i, // "ASB ATM"
  /\bWESTPAC\s*ATM\b/i, // "WESTPAC ATM"
];

/**
 * Patterns to exclude (transfers, not actual cash withdrawals)
 */
const EXCLUDE_PATTERNS = [
  /\bTRANSFER\b/i, // Internal transfers
  /\bEFTPOS\b/i, // EFTPOS transactions (card payments, not cash)
  /\bPURCHASE\b/i, // Purchases
  /\bDIRECT\s*DEBIT\b/i, // Direct debits
  /\bAUTOMATIC\s*PAYMENT\b/i, // Automatic payments
];

/**
 * Check if a transaction description indicates a cash withdrawal
 *
 * @param description - The transaction description from the bank feed
 * @returns true if the transaction appears to be a cash withdrawal
 */
export function isCashWithdrawal(description: string | null | undefined): boolean {
  if (!description) return false;

  const normalizedDescription = description.trim();

  // First check exclusions - if any exclude pattern matches, it's not a cash withdrawal
  if (EXCLUDE_PATTERNS.some((pattern) => pattern.test(normalizedDescription))) {
    return false;
  }

  // Then check if any ATM pattern matches
  return ATM_PATTERNS.some((pattern) => pattern.test(normalizedDescription));
}

/**
 * Extract the cash amount from a transaction
 * Cash withdrawals are typically negative in bank feeds (money leaving the account)
 *
 * @param amount - The transaction amount (can be negative or positive)
 * @returns The absolute amount (always positive)
 */
export function extractCashAmount(amount: number | null | undefined): number {
  if (amount === null || amount === undefined) return 0;
  return Math.abs(amount);
}

/**
 * Get a user-friendly label for the cash withdrawal type
 *
 * @param description - The transaction description
 * @returns A friendly label for the withdrawal type
 */
export function getCashWithdrawalLabel(description: string | null | undefined): string {
  if (!description) return "Cash Withdrawal";

  const normalizedDescription = description.toUpperCase();

  if (/ATM/.test(normalizedDescription)) {
    return "ATM Withdrawal";
  }
  if (/CASH\s*BACK/.test(normalizedDescription)) {
    return "Cash Back";
  }
  if (/TELLER/.test(normalizedDescription)) {
    return "Teller Withdrawal";
  }
  if (/CASH\s*ADV/.test(normalizedDescription)) {
    return "Cash Advance";
  }

  return "Cash Withdrawal";
}

/**
 * Information about a detected cash withdrawal
 */
export interface CashWithdrawalInfo {
  isCashWithdrawal: boolean;
  amount: number;
  label: string;
  originalDescription: string;
}

/**
 * Analyze a transaction for cash withdrawal characteristics
 *
 * @param transaction - The transaction to analyze
 * @returns Information about the potential cash withdrawal
 */
export function analyzeCashWithdrawal(transaction: {
  description?: string | null;
  amount?: number | null;
}): CashWithdrawalInfo {
  const description = transaction.description || "";
  const isWithdrawal = isCashWithdrawal(description);

  return {
    isCashWithdrawal: isWithdrawal,
    amount: isWithdrawal ? extractCashAmount(transaction.amount) : 0,
    label: isWithdrawal ? getCashWithdrawalLabel(description) : "",
    originalDescription: description,
  };
}
