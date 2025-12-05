import { SupabaseClient } from '@supabase/supabase-js';

interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  amount: number;
  description: string;
  merchant?: string;
  transaction_date: string;
  category?: string;
  status: string;
}

interface IncomeSource {
  id: string;
  name: string;
  typical_amount: number | null;
  pay_cycle: string;
  is_active: boolean;
}

interface MatchResult {
  matched: boolean;
  income_source_id?: string;
  confidence: number;
  reason?: string;
}

/**
 * Detect if a transaction is likely an income transaction
 *
 * Criteria:
 * - Amount is positive (credit)
 * - Amount matches or is close to a known income source amount
 * - Description/merchant matches known income patterns
 * - Category is 'income' or 'transfer' (if set)
 */
export async function detectIncomeTransaction(
  supabase: SupabaseClient,
  transaction: Transaction
): Promise<MatchResult> {
  // Only process positive amounts (credits)
  if (transaction.amount <= 0) {
    return { matched: false, confidence: 0, reason: 'Negative amount' };
  }

  // Fetch user's income sources
  const { data: incomeSources, error } = await supabase
    .from('income_sources')
    .select('id, name, typical_amount, pay_cycle, is_active')
    .eq('user_id', transaction.user_id)
    .eq('is_active', true);

  if (error || !incomeSources || incomeSources.length === 0) {
    return { matched: false, confidence: 0, reason: 'No active income sources' };
  }

  // Match by amount (with tolerance)
  const amountTolerance = 0.05; // 5% tolerance
  let bestMatch: IncomeSource | null = null;
  let highestConfidence = 0;

  for (const income of incomeSources) {
    let confidence = 0;

    // Amount match (50% weight)
    if (income.typical_amount) {
      const amountDiff = Math.abs(transaction.amount - income.typical_amount);
      const amountDiffPercent = amountDiff / income.typical_amount;

      if (amountDiffPercent <= amountTolerance) {
        confidence += 0.5 * (1 - amountDiffPercent / amountTolerance);
      }
    }

    // Description/merchant match (30% weight)
    const searchText = `${transaction.description || ''} ${transaction.merchant || ''}`.toLowerCase();
    const incomeName = income.name.toLowerCase();

    if (searchText.includes(incomeName)) {
      confidence += 0.3;
    }

    // Category match (20% weight)
    if (transaction.category === 'income' || transaction.category === 'transfer') {
      confidence += 0.2;
    }

    if (confidence > highestConfidence) {
      highestConfidence = confidence;
      bestMatch = income;
    }
  }

  // Require at least 50% confidence to match
  if (highestConfidence >= 0.5 && bestMatch) {
    return {
      matched: true,
      income_source_id: bestMatch.id,
      confidence: highestConfidence,
      reason: `Matched to income source: ${bestMatch.name}`,
    };
  }

  return {
    matched: false,
    confidence: highestConfidence,
    reason: 'Confidence too low for automatic matching',
  };
}

/**
 * Get locked allocation rules for an income source
 */
export async function getLockedAllocations(
  supabase: SupabaseClient,
  userId: string,
  incomeSourceId: string
): Promise<Array<{ envelope_id: string; amount: number; envelope_name: string }>> {
  const { data, error } = await supabase
    .from('envelope_income_allocations')
    .select(`
      envelope_id,
      allocation_amount,
      envelopes (
        name
      )
    `)
    .eq('user_id', userId)
    .eq('income_source_id', incomeSourceId)
    .eq('allocation_locked', true);

  if (error || !data) {
    console.error('Failed to fetch locked allocations:', error);
    return [];
  }

  return data.map((alloc: any) => ({
    envelope_id: alloc.envelope_id,
    amount: alloc.allocation_amount,
    envelope_name: alloc.envelopes?.name || 'Unknown',
  }));
}

/**
 * Check if a transaction has already been processed for envelope allocation
 */
export async function isTransactionProcessed(
  supabase: SupabaseClient,
  transactionId: string
): Promise<boolean> {
  // Check if transaction has envelope splits already
  const { data, error } = await supabase
    .from('transaction_envelope_splits')
    .select('id')
    .eq('transaction_id', transactionId)
    .limit(1);

  if (error) {
    console.error('Failed to check transaction processed status:', error);
    return false;
  }

  return (data && data.length > 0) || false;
}

/**
 * Mark a transaction as an income transaction
 */
export async function markAsIncomeTransaction(
  supabase: SupabaseClient,
  transactionId: string,
  incomeSourceId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('transactions')
    .update({
      category: 'income',
      income_source_id: incomeSourceId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', transactionId);

  if (error) {
    console.error('Failed to mark transaction as income:', error);
    return false;
  }

  return true;
}

interface AdvancePayDateResult {
  success: boolean;
  previousDate: string | null;
  newDate: string | null;
  error?: string;
}

/**
 * Calculate the next pay date based on pay cycle
 */
function calculateNextPayDate(fromDate: Date, payCycle: string): Date {
  const result = new Date(fromDate);

  switch (payCycle) {
    case 'weekly':
      result.setDate(result.getDate() + 7);
      break;
    case 'fortnightly':
      result.setDate(result.getDate() + 14);
      break;
    case 'monthly':
      result.setMonth(result.getMonth() + 1);
      break;
    default:
      // Default to monthly
      result.setMonth(result.getMonth() + 1);
  }

  return result;
}

/**
 * Advance the next_pay_date for an income source after reconciliation
 *
 * This should only be called AFTER:
 * 1. A transaction has been matched to an income source
 * 2. The transaction has been successfully allocated to envelopes
 *
 * @param supabase - Supabase client
 * @param incomeSourceId - The income source to update
 * @param transactionId - The reconciled transaction ID
 * @param transactionDate - The date of the transaction (used as base for next date calculation)
 * @param transactionAmount - The actual transaction amount (for variance tracking)
 */
export async function advanceNextPayDate(
  supabase: SupabaseClient,
  incomeSourceId: string,
  transactionId: string,
  transactionDate: string,
  transactionAmount: number,
  allocationsCreated: number = 0,
  totalAllocated: number = 0
): Promise<AdvancePayDateResult> {
  try {
    // Get current income source details
    const { data: incomeSource, error: fetchError } = await supabase
      .from('income_sources')
      .select('id, user_id, next_pay_date, pay_cycle, typical_amount')
      .eq('id', incomeSourceId)
      .single();

    if (fetchError || !incomeSource) {
      return {
        success: false,
        previousDate: null,
        newDate: null,
        error: 'Income source not found',
      };
    }

    const previousDate = incomeSource.next_pay_date;
    const txDate = new Date(transactionDate);
    const newDate = calculateNextPayDate(txDate, incomeSource.pay_cycle);
    const newDateStr = newDate.toISOString().split('T')[0];

    // Update the income source with new next_pay_date and reconciliation info
    const { error: updateError } = await supabase
      .from('income_sources')
      .update({
        next_pay_date: newDateStr,
        last_reconciled_date: transactionDate,
        last_reconciled_transaction_id: transactionId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', incomeSourceId);

    if (updateError) {
      console.error('Failed to advance next_pay_date:', updateError);
      return {
        success: false,
        previousDate,
        newDate: null,
        error: updateError.message,
      };
    }

    // Log reconciliation event for audit trail
    const { error: eventError } = await supabase
      .from('income_reconciliation_events')
      .insert({
        user_id: incomeSource.user_id,
        income_source_id: incomeSourceId,
        transaction_id: transactionId,
        expected_amount: incomeSource.typical_amount,
        actual_amount: transactionAmount,
        expected_date: previousDate,
        actual_date: transactionDate,
        previous_next_pay_date: previousDate,
        new_next_pay_date: newDateStr,
        allocations_created: allocationsCreated,
        total_allocated: totalAllocated,
      });

    if (eventError) {
      // Log but don't fail - event logging is nice-to-have
      console.warn('Failed to log reconciliation event:', eventError);
    }

    return {
      success: true,
      previousDate,
      newDate: newDateStr,
    };
  } catch (error: any) {
    console.error('Error advancing next pay date:', error);
    return {
      success: false,
      previousDate: null,
      newDate: null,
      error: error.message,
    };
  }
}
