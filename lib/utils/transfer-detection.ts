/**
 * Transfer Detection Utilities
 *
 * Algorithms for detecting potential transfers between a user's own accounts.
 * Uses confidence scoring based on amount matching, date proximity, and description hints.
 */

import {
  type TransactionForMatching,
  type TransferMatch,
  type TransferConfidence,
  type TransferDetectionResult,
  TRANSFER_THRESHOLDS,
  TRANSFER_KEYWORDS,
} from '@/lib/types/transfer';

// =====================================================
// CONFIDENCE SCORING
// =====================================================

/**
 * Check if a description contains transfer-related keywords
 */
function hasTransferKeyword(description: string | null, merchantName: string): boolean {
  if (!description && !merchantName) return false;

  const text = `${description || ''} ${merchantName}`.toLowerCase();
  return TRANSFER_KEYWORDS.some(keyword => text.includes(keyword.toLowerCase()));
}

/**
 * Calculate the number of days between two dates
 */
function daysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Calculate confidence score for a potential transfer match
 */
export function calculateTransferConfidence(
  source: TransactionForMatching,
  candidate: TransactionForMatching
): TransferConfidence {
  const factors = {
    amountMatch: 0,
    dateMatch: 0,
    descriptionHint: 0,
    amountTolerance: 0,
  };

  // Amount matching (max 40 points)
  // Transfers should have inverse amounts (one positive, one negative)
  const sourceAmount = source.amount;
  const candidateAmount = candidate.amount;

  // Check if amounts are inverse (opposite signs)
  const areInverse = (sourceAmount > 0 && candidateAmount < 0) ||
                     (sourceAmount < 0 && candidateAmount > 0);

  if (areInverse) {
    const absSource = Math.abs(sourceAmount);
    const absCandidate = Math.abs(candidateAmount);
    const difference = Math.abs(absSource - absCandidate);

    // Exact match
    if (difference === 0) {
      factors.amountMatch = 40;
    } else {
      // Check within tolerance
      const percentDiff = (difference / Math.max(absSource, absCandidate)) * 100;
      const withinPercentTolerance = percentDiff <= TRANSFER_THRESHOLDS.AMOUNT_TOLERANCE_PERCENT;
      const withinAbsoluteTolerance = difference <= TRANSFER_THRESHOLDS.AMOUNT_TOLERANCE_ABSOLUTE;

      if (withinPercentTolerance || withinAbsoluteTolerance) {
        // Give partial credit but penalize
        factors.amountMatch = 35;
        factors.amountTolerance = -5; // Small penalty for not exact match
      }
    }
  }

  // Date proximity (max 30 points)
  const daysDiff = daysBetween(source.occurred_at, candidate.occurred_at);

  if (daysDiff === 0) {
    factors.dateMatch = 30; // Same day
  } else if (daysDiff === 1) {
    factors.dateMatch = 25; // Next day (common for bank processing)
  } else if (daysDiff === 2) {
    factors.dateMatch = 20;
  } else if (daysDiff <= TRANSFER_THRESHOLDS.MAX_DAYS_APART) {
    factors.dateMatch = 15;
  }

  // Description hints (max 20 points)
  const sourceHasKeyword = hasTransferKeyword(source.description, source.merchant_name);
  const candidateHasKeyword = hasTransferKeyword(candidate.description, candidate.merchant_name);

  if (sourceHasKeyword && candidateHasKeyword) {
    factors.descriptionHint = 20;
  } else if (sourceHasKeyword || candidateHasKeyword) {
    factors.descriptionHint = 15;
  }

  // Calculate total score
  const score = Math.max(0, Math.min(100,
    factors.amountMatch + factors.dateMatch + factors.descriptionHint + factors.amountTolerance
  ));

  // Generate explanation
  let explanation = '';
  if (score >= TRANSFER_THRESHOLDS.AUTO_LINK) {
    explanation = 'High confidence match: amounts are inverse, dates align, and descriptions suggest transfer.';
  } else if (score >= TRANSFER_THRESHOLDS.SUGGEST) {
    explanation = 'Possible transfer: ';
    const reasons: string[] = [];
    if (factors.amountMatch > 0) reasons.push('amounts match');
    if (factors.dateMatch > 0) reasons.push(`${daysDiff} day(s) apart`);
    if (factors.descriptionHint > 0) reasons.push('description hints at transfer');
    explanation += reasons.join(', ') + '.';
  } else {
    explanation = 'Low confidence: insufficient matching criteria.';
  }

  return {
    score,
    factors,
    explanation,
  };
}

// =====================================================
// TRANSFER DETECTION
// =====================================================

interface AccountInfo {
  id: string;
  name: string;
  nickname: string | null;
}

/**
 * Detect potential transfers for a given transaction
 */
export function detectPotentialTransfers(
  sourceTransaction: TransactionForMatching,
  candidateTransactions: TransactionForMatching[],
  accountsMap: Map<string, AccountInfo>
): TransferDetectionResult {
  const potentialMatches: TransferMatch[] = [];

  for (const candidate of candidateTransactions) {
    // Skip if same transaction
    if (candidate.id === sourceTransaction.id) continue;

    // Skip if same account (transfers must be between different accounts)
    if (candidate.account_id === sourceTransaction.account_id) continue;

    // Skip if already linked
    if (candidate.linked_transaction_id) continue;

    // Skip if date too far apart
    const daysDiff = daysBetween(sourceTransaction.occurred_at, candidate.occurred_at);
    if (daysDiff > TRANSFER_THRESHOLDS.MAX_DAYS_APART) continue;

    // Calculate confidence
    const confidence = calculateTransferConfidence(sourceTransaction, candidate);

    // Only include if above ignore threshold
    if (confidence.score >= TRANSFER_THRESHOLDS.IGNORE) {
      const accountInfo = accountsMap.get(candidate.account_id);

      potentialMatches.push({
        transaction: candidate,
        confidence,
        accountName: accountInfo?.name || 'Unknown Account',
        accountNickname: accountInfo?.nickname || null,
        amountDifference: Math.abs(
          Math.abs(sourceTransaction.amount) - Math.abs(candidate.amount)
        ),
      });
    }
  }

  // Sort by confidence score descending
  potentialMatches.sort((a, b) => b.confidence.score - a.confidence.score);

  // Determine suggested action
  const highestConfidence = potentialMatches[0]?.confidence.score || 0;
  let suggestedAction: TransferDetectionResult['suggestedAction'];

  if (highestConfidence >= TRANSFER_THRESHOLDS.AUTO_LINK) {
    suggestedAction = 'auto_link';
  } else if (highestConfidence >= TRANSFER_THRESHOLDS.SUGGEST) {
    suggestedAction = 'prompt_user';
  } else if (sourceTransaction.amount > 0 && hasTransferKeyword(sourceTransaction.description, sourceTransaction.merchant_name)) {
    // Incoming transaction with transfer keywords but no match found
    suggestedAction = 'mark_pending';
  } else {
    suggestedAction = 'treat_as_expense';
  }

  return {
    sourceTransaction,
    potentialMatches,
    isLikelyTransfer: highestConfidence >= TRANSFER_THRESHOLDS.SUGGEST,
    highestConfidence,
    suggestedAction,
  };
}

// =====================================================
// BATCH DETECTION
// =====================================================

/**
 * Find all potential transfer pairs in a list of transactions
 * Returns unique pairs (avoiding A→B and B→A duplicates)
 */
export function findAllPotentialTransferPairs(
  transactions: TransactionForMatching[],
  accountsMap: Map<string, AccountInfo>
): TransferDetectionResult[] {
  const results: TransferDetectionResult[] = [];
  const processedPairs = new Set<string>();

  // Only check unlinked transactions
  const unlinked = transactions.filter(t => !t.linked_transaction_id);

  for (const source of unlinked) {
    const detection = detectPotentialTransfers(source, unlinked, accountsMap);

    if (detection.isLikelyTransfer && detection.potentialMatches.length > 0) {
      // Create a unique key for this pair to avoid duplicates
      const bestMatch = detection.potentialMatches[0];
      const pairKey = [source.id, bestMatch.transaction.id].sort().join('-');

      if (!processedPairs.has(pairKey)) {
        processedPairs.add(pairKey);
        results.push(detection);
      }
    }
  }

  // Sort by confidence (highest first)
  results.sort((a, b) => b.highestConfidence - a.highestConfidence);

  return results;
}

// =====================================================
// HISTORICAL DATA MIGRATION
// =====================================================

/**
 * Determine transaction type based on amount sign
 * Used for setting transaction_type on historical data
 */
export function inferTransactionType(amount: number): 'income' | 'expense' {
  return amount >= 0 ? 'income' : 'expense';
}

/**
 * Check if a transaction should be considered for transfer detection
 * based on its current state
 */
export function shouldCheckForTransfer(transaction: TransactionForMatching): boolean {
  // Already linked - no need to check
  if (transaction.linked_transaction_id) return false;

  // Already marked as transfer
  if (transaction.transaction_type === 'transfer') return false;

  return true;
}

// =====================================================
// DISPLAY HELPERS
// =====================================================

/**
 * Get display name for an account (nickname preferred, falls back to name)
 */
export function getAccountDisplayName(account: AccountInfo): string {
  return account.nickname || account.name;
}

/**
 * Format a transfer description for display
 */
export function formatTransferDescription(
  fromAccountName: string,
  toAccountName: string,
  amount: number
): string {
  const formattedAmount = new Intl.NumberFormat('en-NZ', {
    style: 'currency',
    currency: 'NZD',
  }).format(Math.abs(amount));

  return `Transfer ${formattedAmount} from ${fromAccountName} to ${toAccountName}`;
}

/**
 * Get confidence level label
 */
export function getConfidenceLabel(score: number): 'high' | 'medium' | 'low' {
  if (score >= TRANSFER_THRESHOLDS.AUTO_LINK) return 'high';
  if (score >= TRANSFER_THRESHOLDS.SUGGEST) return 'medium';
  return 'low';
}

/**
 * Get confidence level color class
 */
export function getConfidenceColorClass(score: number): string {
  if (score >= TRANSFER_THRESHOLDS.AUTO_LINK) return 'text-green-600 bg-green-50';
  if (score >= TRANSFER_THRESHOLDS.SUGGEST) return 'text-amber-600 bg-amber-50';
  return 'text-gray-600 bg-gray-50';
}
