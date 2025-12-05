import { SupabaseClient } from '@supabase/supabase-js';

interface OpeningBalanceAllocation {
  envelope_id: string;
  envelope_name: string;
  amount: number;
}

interface CreateOpeningBalanceResult {
  success: boolean;
  transactions_created: number;
  transactions: any[];
  error?: string;
}

/**
 * Create "Opening Balance Allocation" transactions for envelopes during onboarding
 *
 * This function automatically creates transactions that appear in envelope history
 * without requiring manual transfers from the user.
 *
 * @param supabase - Supabase client with user authentication
 * @param userId - User ID
 * @param allocations - Array of envelope allocations
 * @returns Result with created transactions
 */
export async function createOpeningBalanceTransactions(
  supabase: SupabaseClient,
  userId: string,
  allocations: OpeningBalanceAllocation[]
): Promise<CreateOpeningBalanceResult> {

  const transactionsCreated: any[] = [];

  try {
    // Get or create a virtual "Opening Balance" account
    let openingBalanceAccountId: string;

    const { data: existingAccount } = await supabase
      .from('accounts')
      .select('id')
      .eq('user_id', userId)
      .eq('name', 'Opening Balance')
      .eq('account_type', 'adjustment')
      .maybeSingle();

    if (existingAccount) {
      openingBalanceAccountId = existingAccount.id;
    } else {
      // Create virtual account for opening balance allocations
      const { data: newAccount, error: accountError } = await supabase
        .from('accounts')
        .insert({
          user_id: userId,
          name: 'Opening Balance',
          account_type: 'adjustment',
          balance: 0,
          institution: 'System',
          is_active: false, // Hidden from regular account lists
        })
        .select('id')
        .single();

      if (accountError || !newAccount) {
        throw new Error('Failed to create opening balance account');
      }

      openingBalanceAccountId = newAccount.id;
    }

    // Create a transaction for each envelope allocation
    for (const allocation of allocations) {
      if (allocation.amount <= 0) {
        continue; // Skip zero or negative allocations
      }

      // Create transaction
      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          account_id: openingBalanceAccountId,
          amount: allocation.amount,
          description: 'Opening Balance Allocation',
          merchant: 'Onboarding Setup',
          transaction_date: new Date().toISOString().split('T')[0],
          status: 'approved', // Auto-approved
          category: 'transfer',
        })
        .select()
        .single();

      if (transactionError || !transaction) {
        console.error(`Failed to create transaction for envelope ${allocation.envelope_id}:`, transactionError);
        continue;
      }

      // Create envelope allocation (split)
      const { error: splitError } = await supabase
        .from('transaction_envelope_splits')
        .insert({
          transaction_id: transaction.id,
          envelope_id: allocation.envelope_id,
          amount: allocation.amount,
          user_id: userId,
        });

      if (splitError) {
        console.error(`Failed to create envelope split for ${allocation.envelope_id}:`, splitError);
        // Rollback transaction
        await supabase
          .from('transactions')
          .delete()
          .eq('id', transaction.id);
        continue;
      }

      // Update envelope balance
      const { error: envelopeError } = await supabase.rpc(
        'update_envelope_balance',
        {
          p_envelope_id: allocation.envelope_id,
          p_amount: allocation.amount,
        }
      );

      if (envelopeError) {
        console.error(`Failed to update envelope balance for ${allocation.envelope_id}:`, envelopeError);
      }

      transactionsCreated.push({
        transaction_id: transaction.id,
        envelope_id: allocation.envelope_id,
        envelope_name: allocation.envelope_name,
        amount: allocation.amount,
      });
    }

    return {
      success: true,
      transactions_created: transactionsCreated.length,
      transactions: transactionsCreated,
    };

  } catch (error: any) {
    console.error('Error creating opening balance transactions:', error);
    return {
      success: false,
      transactions_created: 0,
      transactions: transactionsCreated,
      error: error.message,
    };
  }
}

/**
 * Calculate total opening balance allocations
 */
export function calculateTotalOpeningBalance(
  allocations: OpeningBalanceAllocation[]
): number {
  return allocations.reduce((sum, alloc) => sum + alloc.amount, 0);
}

/**
 * Validate opening balance allocations against available funds
 */
export function validateOpeningBalanceAllocations(
  allocations: OpeningBalanceAllocation[],
  availableFunds: number
): {
  valid: boolean;
  total: number;
  remaining: number;
  warnings: string[];
} {
  const total = calculateTotalOpeningBalance(allocations);
  const remaining = availableFunds - total;
  const warnings: string[] = [];

  if (total > availableFunds) {
    warnings.push(`Total allocations ($${total.toFixed(2)}) exceed available funds ($${availableFunds.toFixed(2)})`);
  }

  if (remaining < 0) {
    warnings.push(`Shortfall of $${Math.abs(remaining).toFixed(2)}`);
  }

  if (total === 0) {
    warnings.push('No opening balance allocations specified');
  }

  return {
    valid: total > 0 && total <= availableFunds,
    total,
    remaining,
    warnings,
  };
}
