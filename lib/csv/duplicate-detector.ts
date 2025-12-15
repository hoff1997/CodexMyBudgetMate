/**
 * Duplicate Detection
 *
 * Detects potential duplicate transactions when importing CSV data.
 * Uses amount matching, date proximity, and description similarity.
 */

import type { ParsedTransaction, DuplicateMatch, DuplicateCheckResult } from "./types";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Configuration for duplicate detection
 */
export const DUPLICATE_CONFIG = {
  /** Number of days to check around transaction date */
  DATE_RANGE_DAYS: 1,
  /** Minimum similarity score for description match (0-1) */
  DESCRIPTION_SIMILARITY_THRESHOLD: 0.8,
  /** Weight for amount match in confidence score */
  AMOUNT_WEIGHT: 40,
  /** Weight for date match in confidence score */
  DATE_WEIGHT: 30,
  /** Weight for description match in confidence score */
  DESCRIPTION_WEIGHT: 30,
};

/**
 * Existing transaction from database for comparison
 */
interface ExistingTransaction {
  id: string;
  merchant_name: string;
  amount: number;
  occurred_at: string;
}

/**
 * Calculate string similarity using Levenshtein distance
 * Returns a value between 0 (no match) and 1 (exact match)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  // Quick check - if one contains the other
  if (s1.includes(s2) || s2.includes(s1)) {
    return 0.9;
  }

  // Levenshtein distance
  const matrix: number[][] = [];

  for (let i = 0; i <= s1.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= s2.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const maxLength = Math.max(s1.length, s2.length);
  return 1 - matrix[s1.length][s2.length] / maxLength;
}

/**
 * Check if two amounts match (considering floating point precision)
 */
function amountsMatch(amount1: number, amount2: number): boolean {
  return Math.abs(amount1 - amount2) < 0.01;
}

/**
 * Check if a date falls within range of another date
 */
function dateInRange(
  date1: string,
  date2: string,
  rangeDays: number
): boolean {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffMs = Math.abs(d1.getTime() - d2.getTime());
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays <= rangeDays;
}

/**
 * Calculate confidence score for a potential duplicate match
 */
function calculateDuplicateConfidence(
  parsed: ParsedTransaction,
  existing: ExistingTransaction
): { confidence: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // Amount match (exact)
  if (amountsMatch(parsed.amount, existing.amount)) {
    score += DUPLICATE_CONFIG.AMOUNT_WEIGHT;
    reasons.push("Exact amount match");
  }

  // Date match
  if (dateInRange(parsed.occurredAt, existing.occurred_at, 0)) {
    // Same day
    score += DUPLICATE_CONFIG.DATE_WEIGHT;
    reasons.push("Same date");
  } else if (
    dateInRange(
      parsed.occurredAt,
      existing.occurred_at,
      DUPLICATE_CONFIG.DATE_RANGE_DAYS
    )
  ) {
    // Within range
    score += DUPLICATE_CONFIG.DATE_WEIGHT * 0.7;
    reasons.push("Date within 1 day");
  }

  // Description similarity
  const similarity = calculateSimilarity(
    parsed.merchantName,
    existing.merchant_name
  );
  if (similarity >= DUPLICATE_CONFIG.DESCRIPTION_SIMILARITY_THRESHOLD) {
    score += DUPLICATE_CONFIG.DESCRIPTION_WEIGHT * similarity;
    reasons.push(`Description ${Math.round(similarity * 100)}% similar`);
  }

  return {
    confidence: Math.round(score),
    reasons,
  };
}

/**
 * Check a batch of transactions for duplicates
 *
 * @param supabase - Supabase client
 * @param userId - User ID
 * @param accountId - Target account ID
 * @param transactions - Transactions to check
 * @returns Duplicate check results
 */
export async function checkForDuplicates(
  supabase: SupabaseClient,
  userId: string,
  accountId: string,
  transactions: ParsedTransaction[]
): Promise<DuplicateCheckResult> {
  if (transactions.length === 0) {
    return {
      duplicates: [],
      checkedCount: 0,
      duplicateCount: 0,
    };
  }

  // Get date range for query
  const dates = transactions.map((t) => new Date(t.occurredAt));
  const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));

  // Expand range by duplicate check range
  minDate.setDate(minDate.getDate() - DUPLICATE_CONFIG.DATE_RANGE_DAYS);
  maxDate.setDate(maxDate.getDate() + DUPLICATE_CONFIG.DATE_RANGE_DAYS);

  // Query existing transactions in the date range
  const { data: existingTransactions, error } = await supabase
    .from("transactions")
    .select("id, merchant_name, amount, occurred_at")
    .eq("user_id", userId)
    .eq("account_id", accountId)
    .gte("occurred_at", minDate.toISOString().split("T")[0])
    .lte("occurred_at", maxDate.toISOString().split("T")[0]);

  if (error) {
    console.error("Error querying existing transactions:", error);
    return {
      duplicates: [],
      checkedCount: transactions.length,
      duplicateCount: 0,
    };
  }

  const duplicates: Array<{ tempId: string; match: DuplicateMatch }> = [];

  // Check each transaction against existing ones
  for (const parsed of transactions) {
    let bestMatch: DuplicateMatch | null = null;

    for (const existing of existingTransactions || []) {
      // Quick filter: amount must match
      if (!amountsMatch(parsed.amount, existing.amount)) {
        continue;
      }

      // Quick filter: date must be in range
      if (
        !dateInRange(
          parsed.occurredAt,
          existing.occurred_at,
          DUPLICATE_CONFIG.DATE_RANGE_DAYS
        )
      ) {
        continue;
      }

      // Calculate confidence
      const { confidence, reasons } = calculateDuplicateConfidence(
        parsed,
        existing
      );

      // Only consider matches above threshold
      if (confidence >= 60 && (!bestMatch || confidence > bestMatch.confidence)) {
        bestMatch = {
          existingTransactionId: existing.id,
          existingMerchantName: existing.merchant_name,
          existingAmount: existing.amount,
          existingDate: existing.occurred_at,
          confidence,
          matchReasons: reasons,
        };
      }
    }

    if (bestMatch) {
      duplicates.push({
        tempId: parsed.tempId,
        match: bestMatch,
      });
    }
  }

  return {
    duplicates,
    checkedCount: transactions.length,
    duplicateCount: duplicates.length,
  };
}

/**
 * Mark transactions with duplicate information
 * Mutates the transactions array in place
 */
export function markDuplicates(
  transactions: ParsedTransaction[],
  duplicateResult: DuplicateCheckResult
): void {
  const duplicateMap = new Map(
    duplicateResult.duplicates.map((d) => [d.tempId, d.match])
  );

  for (const transaction of transactions) {
    const match = duplicateMap.get(transaction.tempId);
    if (match) {
      transaction.isDuplicate = true;
      transaction.duplicateMatch = match;
    }
  }
}
