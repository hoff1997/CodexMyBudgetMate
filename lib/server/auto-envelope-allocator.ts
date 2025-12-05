import { SupabaseClient } from '@supabase/supabase-js';

interface AllocationRule {
  envelope_id: string;
  amount: number;
  envelope_name: string;
}

interface AllocationResult {
  success: boolean;
  allocations_created: number;
  total_allocated: number;
  allocations: Array<{
    envelope_id: string;
    envelope_name: string;
    amount: number;
    split_id: string;
  }>;
  error?: string;
}

/**
 * Automatically allocate income to envelopes based on locked allocation rules
 *
 * This is "The Magic" - when income arrives, automatically distribute it to envelopes
 * based on the ideal allocation rules that were locked during setup.
 *
 * @param supabase - Supabase client with user authentication
 * @param userId - User ID
 * @param transactionId - The income transaction ID
 * @param allocationRules - Array of locked allocation rules for this income source
 * @returns Result with created allocations
 */
export async function autoAllocateToEnvelopes(
  supabase: SupabaseClient,
  userId: string,
  transactionId: string,
  allocationRules: AllocationRule[]
): Promise<AllocationResult> {
  const allocationsCreated: Array<{
    envelope_id: string;
    envelope_name: string;
    amount: number;
    split_id: string;
  }> = [];

  let totalAllocated = 0;

  try {
    // Create envelope splits for each allocation rule
    for (const rule of allocationRules) {
      if (rule.amount <= 0) {
        continue; // Skip zero or negative allocations
      }

      // Create transaction envelope split
      const { data: split, error: splitError } = await supabase
        .from('transaction_envelope_splits')
        .insert({
          transaction_id: transactionId,
          envelope_id: rule.envelope_id,
          amount: rule.amount,
          user_id: userId,
        })
        .select('id')
        .single();

      if (splitError || !split) {
        console.error(
          `Failed to create envelope split for ${rule.envelope_id}:`,
          splitError
        );
        continue;
      }

      // Update envelope balance using RPC function
      const { error: balanceError } = await supabase.rpc('update_envelope_balance', {
        p_envelope_id: rule.envelope_id,
        p_amount: rule.amount,
      });

      if (balanceError) {
        console.error(
          `Failed to update envelope balance for ${rule.envelope_id}:`,
          balanceError
        );
        // Rollback the split if balance update fails
        await supabase
          .from('transaction_envelope_splits')
          .delete()
          .eq('id', split.id);
        continue;
      }

      allocationsCreated.push({
        envelope_id: rule.envelope_id,
        envelope_name: rule.envelope_name,
        amount: rule.amount,
        split_id: split.id,
      });

      totalAllocated += rule.amount;
    }

    return {
      success: true,
      allocations_created: allocationsCreated.length,
      total_allocated: totalAllocated,
      allocations: allocationsCreated,
    };
  } catch (error: any) {
    console.error('Error in auto-allocation:', error);
    return {
      success: false,
      allocations_created: 0,
      total_allocated: 0,
      allocations: allocationsCreated,
      error: error.message,
    };
  }
}

/**
 * Process a newly created/imported transaction for automatic allocation
 *
 * This is the main entry point that:
 * 1. Detects if transaction is income
 * 2. Matches to income source
 * 3. Gets locked allocation rules
 * 4. Automatically allocates to envelopes
 * 5. Advances next_pay_date after successful reconciliation
 */
export async function processTransactionForAllocation(
  supabase: SupabaseClient,
  transactionId: string,
  userId: string
): Promise<{
  processed: boolean;
  income_detected: boolean;
  allocated: boolean;
  allocations_count: number;
  next_pay_date_advanced: boolean;
  new_next_pay_date?: string;
  message: string;
}> {
  try {
    // Get transaction details
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .eq('user_id', userId)
      .single();

    if (txError || !transaction) {
      return {
        processed: false,
        income_detected: false,
        allocated: false,
        allocations_count: 0,
        next_pay_date_advanced: false,
        message: 'Transaction not found',
      };
    }

    // Import detection functions
    const {
      detectIncomeTransaction,
      getLockedAllocations,
      markAsIncomeTransaction,
      advanceNextPayDate,
    } = await import('./income-transaction-matcher');

    // Detect if this is an income transaction
    const matchResult = await detectIncomeTransaction(supabase, transaction);

    if (!matchResult.matched || !matchResult.income_source_id) {
      return {
        processed: true,
        income_detected: false,
        allocated: false,
        allocations_count: 0,
        next_pay_date_advanced: false,
        message: matchResult.reason || 'Not detected as income',
      };
    }

    // Mark transaction as income
    await markAsIncomeTransaction(supabase, transactionId, matchResult.income_source_id);

    // Get locked allocation rules for this income source
    const allocationRules = await getLockedAllocations(
      supabase,
      userId,
      matchResult.income_source_id
    );

    if (allocationRules.length === 0) {
      return {
        processed: true,
        income_detected: true,
        allocated: false,
        allocations_count: 0,
        next_pay_date_advanced: false,
        message: 'No locked allocation rules found',
      };
    }

    // Automatically allocate to envelopes
    const result = await autoAllocateToEnvelopes(
      supabase,
      userId,
      transactionId,
      allocationRules
    );

    // If allocation was successful, advance the next_pay_date
    // This is "reconciliation" - marking the income as received and scheduling next expected date
    let nextPayDateAdvanced = false;
    let newNextPayDate: string | undefined;

    if (result.success && result.allocations_created > 0) {
      const advanceResult = await advanceNextPayDate(
        supabase,
        matchResult.income_source_id,
        transactionId,
        transaction.transaction_date,
        transaction.amount,
        result.allocations_created,
        result.total_allocated
      );

      nextPayDateAdvanced = advanceResult.success;
      newNextPayDate = advanceResult.newDate || undefined;

      if (!advanceResult.success) {
        console.warn('Failed to advance next_pay_date:', advanceResult.error);
      }
    }

    return {
      processed: true,
      income_detected: true,
      allocated: result.success,
      allocations_count: result.allocations_created,
      next_pay_date_advanced: nextPayDateAdvanced,
      new_next_pay_date: newNextPayDate,
      message: result.success
        ? `Allocated ${result.total_allocated.toFixed(2)} to ${result.allocations_created} envelopes${
            nextPayDateAdvanced ? `. Next pay date: ${newNextPayDate}` : ''
          }`
        : result.error || 'Allocation failed',
    };
  } catch (error: any) {
    console.error('Error processing transaction for allocation:', error);
    return {
      processed: false,
      income_detected: false,
      allocated: false,
      allocations_count: 0,
      next_pay_date_advanced: false,
      message: error.message || 'Processing error',
    };
  }
}
