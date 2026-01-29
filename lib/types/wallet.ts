/**
 * Wallet (Cash on Hand) Types
 *
 * The Wallet feature tracks physical cash for both adults and kids.
 * Adults use the accounts table with is_wallet=true.
 * Kids use child_bank_accounts with account_type='wallet'.
 */

// ============================================
// Adult Wallet Types
// ============================================

export type WalletTransactionSource =
  | "manual"
  | "atm_withdrawal"
  | "gift"
  | "spending"
  | "transfer";

export interface WalletTransaction {
  id: string;
  user_id: string;
  wallet_account_id: string;
  amount: number; // positive = deposit, negative = withdrawal
  source: WalletTransactionSource;
  description?: string | null;
  linked_bank_transaction_id?: string | null;
  created_at: string;
}

export interface WalletAccount {
  id: string;
  user_id: string;
  name: string;
  current_balance: number;
  is_wallet: true;
  account_type: "cash";
  created_at?: string;
  updated_at?: string;
}

export interface WalletSummary {
  account: WalletAccount | null;
  balance: number;
  recentTransactions: WalletTransaction[];
  hasWallet: boolean;
}

// ============================================
// Kid Wallet Types
// ============================================

export type KidWalletTransactionSource =
  | "manual"
  | "pocket_money"
  | "gift"
  | "spending"
  | "chore_payment";

export interface KidWalletTransaction {
  id: string;
  child_profile_id: string;
  amount: number; // positive = deposit, negative = withdrawal
  source: KidWalletTransactionSource;
  description?: string | null;
  created_at: string;
}

export interface KidWalletAccount {
  id: string;
  child_profile_id: string;
  account_type: "wallet";
  balance: number;
  created_at?: string;
}

export interface KidWalletSummary {
  account: KidWalletAccount | null;
  balance: number;
  recentTransactions: KidWalletTransaction[];
}

// ============================================
// API Request/Response Types
// ============================================

export interface CreateWalletTransactionRequest {
  amount: number;
  source: WalletTransactionSource;
  description?: string;
  linked_bank_transaction_id?: string;
}

export interface CreateKidWalletTransactionRequest {
  amount: number;
  source: KidWalletTransactionSource;
  description?: string;
}

export interface WalletBalanceResponse {
  balance: number;
  account_id: string | null;
  has_wallet: boolean;
}

// ============================================
// Source Labels (for UI display)
// ============================================

export const WALLET_SOURCE_LABELS: Record<WalletTransactionSource, string> = {
  manual: "Manual Entry",
  atm_withdrawal: "ATM Withdrawal",
  gift: "Gift Received",
  spending: "Cash Spent",
  transfer: "Transfer",
};

export const KID_WALLET_SOURCE_LABELS: Record<KidWalletTransactionSource, string> = {
  manual: "Manual Entry",
  pocket_money: "Pocket Money",
  gift: "Gift Received",
  spending: "Cash Spent",
  chore_payment: "Chore Payment",
};

// ============================================
// Utility Functions
// ============================================

/**
 * Format wallet transaction for display
 */
export function formatWalletTransaction(transaction: WalletTransaction | KidWalletTransaction): {
  amountDisplay: string;
  isDeposit: boolean;
  sourceLabel: string;
} {
  const isDeposit = transaction.amount > 0;
  const amountDisplay = `${isDeposit ? "+" : ""}$${Math.abs(transaction.amount).toFixed(2)}`;

  const sourceLabel =
    "wallet_account_id" in transaction
      ? WALLET_SOURCE_LABELS[transaction.source as WalletTransactionSource]
      : KID_WALLET_SOURCE_LABELS[transaction.source as KidWalletTransactionSource];

  return {
    amountDisplay,
    isDeposit,
    sourceLabel,
  };
}

/**
 * Calculate wallet balance from transactions (for verification)
 */
export function calculateWalletBalance(transactions: Array<{ amount: number }>): number {
  return transactions.reduce((sum, t) => sum + t.amount, 0);
}
