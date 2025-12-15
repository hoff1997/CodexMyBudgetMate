/**
 * Reconciliation Calculator Utilities
 *
 * Functions for calculating available cash, net worth, and validating
 * reconciliation when CC holding is factored in.
 *
 * Key formulas:
 * - Available Cash = Bank Balance - CC Holding Balance
 * - Multi-Account Reconciliation: Sum(All Accounts) = Sum(All Envelopes) - CC Holding + Surplus
 *
 * IMPORTANT: Transfers between own accounts are neutral - they don't affect
 * envelope balances or surplus. Envelopes track PURPOSE, accounts track LOCATION.
 */

import type { AccountRow as Account } from '@/lib/types/accounts';
import type { AccountSummary, MultiAccountReconciliation } from '@/lib/types/transfer';

// Minimal envelope shape needed for reconciliation
interface Envelope {
  id: string;
  name: string;
  current_amount: number;
  is_cc_holding?: boolean;
}

// Helper to safely convert balance to number
function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
}

// =====================================================
// AVAILABLE CASH CALCULATION
// =====================================================

/**
 * Calculate available cash (bank balance minus CC holding)
 *
 * The CC Holding envelope holds money that's already "spent" on credit cards
 * but not yet paid. This money shouldn't be considered available.
 *
 * @param bankBalance - Total balance in checking/savings accounts
 * @param ccHoldingBalance - Total balance in CC Holding envelopes
 * @returns Available cash that can be spent/allocated
 */
export function calculateAvailableCash(bankBalance: number, ccHoldingBalance: number): number {
  return bankBalance - ccHoldingBalance;
}

/**
 * Calculate available cash from accounts and envelopes
 */
export function calculateAvailableCashFromData(
  accounts: Account[],
  envelopes: Envelope[]
): number {
  // Sum up bank account balances (checking + savings)
  const bankBalance = accounts
    .filter(a => a.type === 'checking' || a.type === 'savings')
    .reduce((sum, a) => sum + toNumber(a.current_balance), 0);

  // Sum up CC Holding envelope balances
  const ccHoldingBalance = envelopes
    .filter(e => e.is_cc_holding)
    .reduce((sum, e) => sum + (e.current_amount || 0), 0);

  return calculateAvailableCash(bankBalance, ccHoldingBalance);
}

// =====================================================
// NET WORTH CALCULATION
// =====================================================

/**
 * Calculate true net worth including all accounts
 *
 * Net Worth = Assets (bank accounts) - Liabilities (credit card debt)
 *
 * Note: CC Holding is NOT subtracted from net worth because it's already
 * accounted for in the bank balance (it's money in the bank earmarked for CC).
 */
export function calculateTrueNetWorth(accounts: Account[]): number {
  let assets = 0;
  let liabilities = 0;

  for (const account of accounts) {
    const balance = toNumber(account.current_balance);

    if (account.type === 'checking' || account.type === 'savings' || account.type === 'investment') {
      assets += balance;
    } else if (account.type === 'debt' || account.type === 'credit_card') {
      // Debt balances are typically negative, but let's handle both cases
      liabilities += Math.abs(balance);
    }
  }

  return assets - liabilities;
}

/**
 * Calculate net worth with breakdown
 */
export function calculateNetWorthBreakdown(accounts: Account[]): {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  breakdown: {
    checking: number;
    savings: number;
    investments: number;
    creditCards: number;
    otherDebt: number;
  };
} {
  const breakdown = {
    checking: 0,
    savings: 0,
    investments: 0,
    creditCards: 0,
    otherDebt: 0,
  };

  for (const account of accounts) {
    const balance = toNumber(account.current_balance);

    switch (account.type) {
      case 'checking':
        breakdown.checking += balance;
        break;
      case 'savings':
        breakdown.savings += balance;
        break;
      case 'investment':
        breakdown.investments += balance;
        break;
      case 'debt':
      case 'credit_card':
        // Credit card balances are typically negative (debt)
        if (account.type === 'credit_card' || account.name.toLowerCase().includes('credit')) {
          breakdown.creditCards += Math.abs(balance);
        } else {
          breakdown.otherDebt += Math.abs(balance);
        }
        break;
    }
  }

  const totalAssets = breakdown.checking + breakdown.savings + breakdown.investments;
  const totalLiabilities = breakdown.creditCards + breakdown.otherDebt;

  return {
    totalAssets,
    totalLiabilities,
    netWorth: totalAssets - totalLiabilities,
    breakdown,
  };
}

// =====================================================
// RECONCILIATION VALIDATION
// =====================================================

export interface ReconciliationResult {
  /** Whether the books are balanced */
  isBalanced: boolean;
  /** Discrepancy amount (positive = more in bank than envelopes) */
  discrepancy: number;
  /** Breakdown of the calculation */
  breakdown: {
    bankBalance: number;
    envelopeTotal: number;
    ccHoldingBalance: number;
    adjustedEnvelopeTotal: number;
  };
  /** Explanation of the result */
  explanation: string;
}

/**
 * Validate reconciliation with CC holding factored in
 *
 * The reconciliation formula with CC Holding is:
 * Bank Balance = Envelope Total - CC Holding Balance
 *
 * Or equivalently:
 * Bank Balance + CC Holding Balance (as liability) = Envelope Total
 *
 * This is because CC Holding represents money that's in the bank but already
 * "spent" via credit card - it will leave when the CC is paid.
 */
export function validateReconciliation(
  bankBalance: number,
  envelopeTotal: number,
  ccHoldingBalance: number
): ReconciliationResult {
  // The money in the bank should equal:
  // - All envelope balances
  // - MINUS the CC Holding (which is money committed to pay CC)
  const adjustedEnvelopeTotal = envelopeTotal - ccHoldingBalance;
  const discrepancy = bankBalance - adjustedEnvelopeTotal;
  const isBalanced = Math.abs(discrepancy) < 0.01; // Allow for rounding

  let explanation: string;
  if (isBalanced) {
    explanation = 'Your books are balanced! Bank balance matches your envelope allocations.';
  } else if (discrepancy > 0) {
    explanation = `You have $${discrepancy.toFixed(2)} more in the bank than allocated to envelopes. Consider allocating this surplus.`;
  } else {
    explanation = `Your envelopes total $${Math.abs(discrepancy).toFixed(2)} more than your bank balance. You may be over-allocated.`;
  }

  return {
    isBalanced,
    discrepancy: Math.round(discrepancy * 100) / 100,
    breakdown: {
      bankBalance,
      envelopeTotal,
      ccHoldingBalance,
      adjustedEnvelopeTotal,
    },
    explanation,
  };
}

/**
 * Validate reconciliation from raw data
 */
export function validateReconciliationFromData(
  accounts: Account[],
  envelopes: Envelope[]
): ReconciliationResult {
  // Sum bank account balances
  const bankBalance = accounts
    .filter(a => a.type === 'checking' || a.type === 'savings')
    .reduce((sum, a) => sum + toNumber(a.current_balance), 0);

  // Sum all envelope balances
  const envelopeTotal = envelopes
    .reduce((sum, e) => sum + (e.current_amount || 0), 0);

  // Sum CC Holding envelope balances
  const ccHoldingBalance = envelopes
    .filter(e => e.is_cc_holding)
    .reduce((sum, e) => sum + (e.current_amount || 0), 0);

  return validateReconciliation(bankBalance, envelopeTotal, ccHoldingBalance);
}

// =====================================================
// BALANCE SUMMARY
// =====================================================

export interface BalanceSummary {
  /** Total in bank accounts */
  bankTotal: number;
  /** Total in credit cards (as positive debt number) */
  creditCardDebt: number;
  /** Total allocated to envelopes */
  envelopeTotal: number;
  /** Amount in CC Holding envelopes */
  ccHoldingTotal: number;
  /** Truly available cash (bank - CC holding) */
  availableCash: number;
  /** Unallocated surplus or deficit */
  unallocated: number;
  /** Net worth */
  netWorth: number;
}

/**
 * Generate a complete balance summary
 */
export function generateBalanceSummary(
  accounts: Account[],
  envelopes: Envelope[]
): BalanceSummary {
  // Bank total (checking + savings)
  const bankTotal = accounts
    .filter(a => a.type === 'checking' || a.type === 'savings')
    .reduce((sum, a) => sum + toNumber(a.current_balance), 0);

  // Credit card debt (as positive number)
  const creditCardDebt = accounts
    .filter(a => a.type === 'debt' || a.type === 'credit_card')
    .reduce((sum, a) => sum + Math.abs(toNumber(a.current_balance)), 0);

  // Envelope total
  const envelopeTotal = envelopes
    .reduce((sum, e) => sum + (e.current_amount || 0), 0);

  // CC Holding total
  const ccHoldingTotal = envelopes
    .filter(e => e.is_cc_holding)
    .reduce((sum, e) => sum + (e.current_amount || 0), 0);

  // Available cash
  const availableCash = bankTotal - ccHoldingTotal;

  // Unallocated (bank - envelope total + CC holding, since holding is part of envelopes)
  // Or simply: bank - (envelopes - holding) = bank - envelopes + holding
  const unallocated = bankTotal - envelopeTotal + ccHoldingTotal;

  // Net worth
  const netWorth = bankTotal - creditCardDebt;

  return {
    bankTotal,
    creditCardDebt,
    envelopeTotal,
    ccHoldingTotal,
    availableCash,
    unallocated: Math.round(unallocated * 100) / 100,
    netWorth,
  };
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Check if CC Holding should affect available balance display
 */
export function shouldShowCCHoldingAdjustment(ccHoldingBalance: number): boolean {
  return ccHoldingBalance > 0.01;
}

/**
 * Format balance for display with CC holding note
 */
export function formatBalanceWithCCNote(
  bankBalance: number,
  ccHoldingBalance: number
): {
  displayBalance: number;
  note: string | null;
} {
  if (!shouldShowCCHoldingAdjustment(ccHoldingBalance)) {
    return {
      displayBalance: bankBalance,
      note: null,
    };
  }

  return {
    displayBalance: bankBalance - ccHoldingBalance,
    note: `$${ccHoldingBalance.toFixed(2)} is held for credit card payments`,
  };
}

// =====================================================
// MULTI-ACCOUNT RECONCILIATION
// =====================================================

// Bank account types that should be included in reconciliation
const BANK_ACCOUNT_TYPES = ['checking', 'savings', 'transaction', 'cash'] as const;

/**
 * Check if an account type is a bank account (not credit card or debt)
 */
export function isBankAccount(accountType: string): boolean {
  return BANK_ACCOUNT_TYPES.includes(accountType as typeof BANK_ACCOUNT_TYPES[number]);
}

/**
 * Get display name for an account (nickname preferred)
 */
function getAccountDisplayName(account: Account): string {
  return account.nickname || account.name;
}

/**
 * Generate account summaries for multi-account reconciliation display
 */
export function generateAccountSummaries(
  accounts: Account[],
  transactionCounts?: Map<string, number>,
  lastTransactionDates?: Map<string, string>
): AccountSummary[] {
  return accounts
    .filter(a => isBankAccount(a.type))
    .map(account => ({
      accountId: account.id,
      displayName: getAccountDisplayName(account),
      accountName: account.name,
      accountType: account.type,
      institution: account.institution || null,
      currentBalance: toNumber(account.current_balance),
      transactionCount: transactionCounts?.get(account.id) || 0,
      lastTransactionDate: lastTransactionDates?.get(account.id) || null,
    }));
}

/**
 * Calculate multi-account reconciliation
 *
 * The reconciliation formula with multiple accounts:
 * Sum(All Bank Accounts) = Sum(All Envelopes) - CC Holding + Surplus
 *
 * Rearranged to solve for expected bank balance:
 * Expected Bank Balance = Sum(All Envelopes) - CC Holding + Surplus
 *
 * Where Surplus is the unallocated amount (can be positive or negative)
 *
 * @param accounts All user accounts
 * @param envelopes All user envelopes
 * @param surplus Current surplus/unallocated amount (defaults to 0)
 * @returns Multi-account reconciliation result
 */
export function calculateMultiAccountReconciliation(
  accounts: Account[],
  envelopes: Envelope[],
  surplus: number = 0
): MultiAccountReconciliation {
  // Generate account summaries for bank accounts only
  const accountSummaries = generateAccountSummaries(accounts);

  // Sum up all bank account balances
  const totalBankBalance = accountSummaries.reduce(
    (sum, a) => sum + a.currentBalance,
    0
  );

  // Sum all envelope balances
  const totalEnvelopeBalance = envelopes.reduce(
    (sum, e) => sum + (e.current_amount || 0),
    0
  );

  // Sum CC Holding envelope balances
  const ccHoldingBalance = envelopes
    .filter(e => e.is_cc_holding)
    .reduce((sum, e) => sum + (e.current_amount || 0), 0);

  // Calculate expected bank balance
  // Formula: Expected = Envelopes - CC Holding + Surplus
  const expectedBankBalance = totalEnvelopeBalance - ccHoldingBalance + surplus;

  // Calculate discrepancy
  const discrepancy = Math.round((totalBankBalance - expectedBankBalance) * 100) / 100;
  const isBalanced = Math.abs(discrepancy) < 0.01;

  // Generate explanation
  let explanation: string;
  if (isBalanced) {
    if (accountSummaries.length === 1) {
      explanation = 'Your account is balanced with your envelope allocations.';
    } else {
      explanation = `All ${accountSummaries.length} accounts are balanced with your envelope allocations.`;
    }
  } else if (discrepancy > 0) {
    explanation = `You have $${discrepancy.toFixed(2)} more in your accounts than expected. This could be unallocated income.`;
  } else {
    explanation = `Your envelopes expect $${Math.abs(discrepancy).toFixed(2)} more than is in your accounts. Review recent transactions.`;
  }

  return {
    totalBankBalance: Math.round(totalBankBalance * 100) / 100,
    accounts: accountSummaries,
    totalEnvelopeBalance: Math.round(totalEnvelopeBalance * 100) / 100,
    ccHoldingBalance: Math.round(ccHoldingBalance * 100) / 100,
    surplus: Math.round(surplus * 100) / 100,
    expectedBankBalance: Math.round(expectedBankBalance * 100) / 100,
    discrepancy,
    isBalanced,
    explanation,
  };
}

/**
 * Calculate surplus from accounts and envelopes
 *
 * Surplus = Total Bank Balance - (Total Envelopes - CC Holding)
 * Or: Surplus = Bank Balance - Envelopes + CC Holding
 *
 * This represents money in the bank that hasn't been allocated to any envelope.
 */
export function calculateSurplus(
  accounts: Account[],
  envelopes: Envelope[]
): number {
  // Sum up all bank account balances
  const totalBankBalance = accounts
    .filter(a => isBankAccount(a.type))
    .reduce((sum, a) => sum + toNumber(a.current_balance), 0);

  // Sum all envelope balances
  const totalEnvelopeBalance = envelopes.reduce(
    (sum, e) => sum + (e.current_amount || 0),
    0
  );

  // Sum CC Holding envelope balances
  const ccHoldingBalance = envelopes
    .filter(e => e.is_cc_holding)
    .reduce((sum, e) => sum + (e.current_amount || 0), 0);

  // Surplus = Bank - (Envelopes - CC Holding) = Bank - Envelopes + CC Holding
  const surplus = totalBankBalance - totalEnvelopeBalance + ccHoldingBalance;

  return Math.round(surplus * 100) / 100;
}

/**
 * Quick check if a transfer would affect reconciliation
 *
 * Transfers between own bank accounts do NOT affect reconciliation because:
 * - The total bank balance remains the same
 * - Envelope allocations are unchanged
 * - Surplus is unchanged
 *
 * @returns false - transfers never affect reconciliation
 */
export function doesTransferAffectReconciliation(
  _fromAccountId: string,
  _toAccountId: string,
  _accounts: Account[]
): boolean {
  // Transfers between own accounts are always neutral
  // The money is just moving from one "jar" to another
  return false;
}

/**
 * Format multi-account reconciliation for display
 */
export function formatMultiAccountReconciliation(
  reconciliation: MultiAccountReconciliation
): {
  lines: Array<{ label: string; value: string; type: 'header' | 'account' | 'subtotal' | 'result' }>;
  statusColor: 'green' | 'amber' | 'red';
} {
  const lines: Array<{ label: string; value: string; type: 'header' | 'account' | 'subtotal' | 'result' }> = [];

  // Header
  lines.push({
    label: 'Bank Accounts',
    value: '',
    type: 'header',
  });

  // Individual accounts
  for (const account of reconciliation.accounts) {
    lines.push({
      label: account.displayName,
      value: formatCurrency(account.currentBalance),
      type: 'account',
    });
  }

  // Total bank balance
  lines.push({
    label: 'Total Bank Balance',
    value: formatCurrency(reconciliation.totalBankBalance),
    type: 'subtotal',
  });

  // Envelope breakdown
  lines.push({
    label: 'Envelope Allocations',
    value: formatCurrency(reconciliation.totalEnvelopeBalance),
    type: 'account',
  });

  if (reconciliation.ccHoldingBalance > 0) {
    lines.push({
      label: 'Less: CC Holding',
      value: `(${formatCurrency(reconciliation.ccHoldingBalance)})`,
      type: 'account',
    });
  }

  if (Math.abs(reconciliation.surplus) > 0.01) {
    lines.push({
      label: reconciliation.surplus >= 0 ? 'Plus: Surplus' : 'Less: Deficit',
      value: formatCurrency(Math.abs(reconciliation.surplus)),
      type: 'account',
    });
  }

  // Expected balance
  lines.push({
    label: 'Expected Bank Balance',
    value: formatCurrency(reconciliation.expectedBankBalance),
    type: 'subtotal',
  });

  // Result
  const resultLabel = reconciliation.isBalanced
    ? '✓ Balanced'
    : reconciliation.discrepancy > 0
    ? `↑ Over by ${formatCurrency(reconciliation.discrepancy)}`
    : `↓ Under by ${formatCurrency(Math.abs(reconciliation.discrepancy))}`;

  lines.push({
    label: 'Reconciliation',
    value: resultLabel,
    type: 'result',
  });

  // Determine status color
  let statusColor: 'green' | 'amber' | 'red';
  if (reconciliation.isBalanced) {
    statusColor = 'green';
  } else if (Math.abs(reconciliation.discrepancy) < 10) {
    statusColor = 'amber';
  } else {
    statusColor = 'red';
  }

  return { lines, statusColor };
}

/**
 * Format currency for display
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-NZ', {
    style: 'currency',
    currency: 'NZD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
