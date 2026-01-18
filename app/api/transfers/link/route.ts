/**
 * Transfer Link API
 *
 * POST /api/transfers/link - Link two transactions as a transfer
 * DELETE /api/transfers/link - Unlink a transfer
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import {
  createErrorResponse,
  createUnauthorizedError,
  createValidationError,
  createNotFoundError,
} from '@/lib/utils/api-error';

const linkSchema = z.object({
  transactionId1: z.string().uuid(),
  transactionId2: z.string().uuid(),
});

const unlinkSchema = z.object({
  transactionId: z.string().uuid(),
});

/**
 * POST /api/transfers/link
 *
 * Link two transactions as a transfer.
 * Both transactions must belong to the user and be in different accounts.
 *
 * Body: { transactionId1: string, transactionId2: string }
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const body = await request.json();
  const parsed = linkSchema.safeParse(body);

  if (!parsed.success) {
    return createValidationError('Invalid request body');
  }

  const { transactionId1, transactionId2 } = parsed.data;

  // Prevent linking to self
  if (transactionId1 === transactionId2) {
    return createValidationError('Cannot link a transaction to itself');
  }

  // Fetch both transactions and verify ownership
  const { data: transactions, error: txError } = await supabase
    .from('transactions')
    .select('id, user_id, account_id, amount, linked_transaction_id, transaction_type')
    .in('id', [transactionId1, transactionId2])
    .eq('user_id', user.id);

  if (txError) {
    return createErrorResponse(txError, 500, 'Failed to fetch transactions');
  }

  if (!transactions || transactions.length !== 2) {
    return createNotFoundError('One or both transactions');
  }

  const tx1 = transactions.find((t) => t.id === transactionId1);
  const tx2 = transactions.find((t) => t.id === transactionId2);

  if (!tx1 || !tx2) {
    return createNotFoundError('Transactions');
  }

  // Verify different accounts
  if (tx1.account_id === tx2.account_id) {
    return createValidationError('Transactions must be from different accounts to be a transfer');
  }

  // Check if either is already linked
  if (tx1.linked_transaction_id || tx2.linked_transaction_id) {
    return createValidationError('One or both transactions are already linked');
  }

  // Determine which is outgoing (negative) and which is incoming (positive)
  // This helps set transfer_to_account_id correctly
  const outgoing = tx1.amount < 0 ? tx1 : tx2;
  const incoming = tx1.amount < 0 ? tx2 : tx1;

  // Link the transactions using a database function or manual updates
  // Update transaction 1
  const { error: update1Error } = await supabase
    .from('transactions')
    .update({
      linked_transaction_id: transactionId2,
      transaction_type: 'transfer',
      transfer_to_account_id: outgoing.id === tx1.id ? incoming.account_id : null,
      transfer_pending: false,
      envelope_id: null, // Transfers don't affect envelopes
    })
    .eq('id', transactionId1)
    .eq('user_id', user.id);

  if (update1Error) {
    return createErrorResponse(update1Error, 500, 'Failed to link transaction');
  }

  // Update transaction 2
  const { error: update2Error } = await supabase
    .from('transactions')
    .update({
      linked_transaction_id: transactionId1,
      transaction_type: 'transfer',
      transfer_to_account_id: outgoing.id === tx2.id ? incoming.account_id : null,
      transfer_pending: false,
      envelope_id: null, // Transfers don't affect envelopes
    })
    .eq('id', transactionId2)
    .eq('user_id', user.id);

  if (update2Error) {
    // Try to rollback the first update
    await supabase
      .from('transactions')
      .update({
        linked_transaction_id: null,
        transaction_type: tx1.transaction_type || 'expense',
        transfer_to_account_id: null,
      })
      .eq('id', transactionId1)
      .eq('user_id', user.id);

    return createErrorResponse(update2Error, 500, 'Failed to link second transaction');
  }

  // Fetch the updated transactions with account info
  const { data: updatedTransactions } = await supabase
    .from('transactions')
    .select(`
      id,
      user_id,
      account_id,
      envelope_id,
      merchant_name,
      description,
      amount,
      occurred_at,
      status,
      transaction_type,
      linked_transaction_id,
      transfer_to_account_id,
      transfer_pending,
      created_at,
      accounts(id, name, nickname)
    `)
    .in('id', [transactionId1, transactionId2])
    .eq('user_id', user.id);

  return NextResponse.json({
    success: true,
    message: 'Transactions linked as transfer',
    transactions: updatedTransactions,
  });
}

/**
 * DELETE /api/transfers/link
 *
 * Unlink a transfer, reverting both transactions to their original type.
 *
 * Body: { transactionId: string }
 */
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const body = await request.json();
  const parsed = unlinkSchema.safeParse(body);

  if (!parsed.success) {
    return createValidationError('Invalid request body');
  }

  const { transactionId } = parsed.data;

  // Fetch the transaction
  const { data: transaction, error: txError } = await supabase
    .from('transactions')
    .select('id, user_id, linked_transaction_id, amount')
    .eq('id', transactionId)
    .eq('user_id', user.id)
    .single();

  if (txError || !transaction) {
    return createNotFoundError('Transaction');
  }

  if (!transaction.linked_transaction_id) {
    return createValidationError('Transaction is not linked to a transfer');
  }

  const linkedTransactionId = transaction.linked_transaction_id;

  // Determine original transaction type based on amount
  const getOriginalType = (amount: number) => (amount >= 0 ? 'income' : 'expense');

  // Unlink transaction 1
  const { error: update1Error } = await supabase
    .from('transactions')
    .update({
      linked_transaction_id: null,
      transaction_type: getOriginalType(transaction.amount),
      transfer_to_account_id: null,
      transfer_pending: false,
    })
    .eq('id', transactionId)
    .eq('user_id', user.id);

  if (update1Error) {
    return createErrorResponse(update1Error, 500, 'Failed to unlink transaction');
  }

  // Fetch the linked transaction to get its amount for type inference
  const { data: linkedTx } = await supabase
    .from('transactions')
    .select('amount')
    .eq('id', linkedTransactionId)
    .eq('user_id', user.id)
    .single();

  // Unlink transaction 2
  const { error: update2Error } = await supabase
    .from('transactions')
    .update({
      linked_transaction_id: null,
      transaction_type: getOriginalType(linkedTx?.amount || 0),
      transfer_to_account_id: null,
      transfer_pending: false,
    })
    .eq('id', linkedTransactionId)
    .eq('user_id', user.id);

  if (update2Error) {
    // Try to rollback the first update
    await supabase
      .from('transactions')
      .update({
        linked_transaction_id: linkedTransactionId,
        transaction_type: 'transfer',
      })
      .eq('id', transactionId)
      .eq('user_id', user.id);

    return createErrorResponse(update2Error, 500, 'Failed to unlink second transaction');
  }

  // Fetch the updated transactions
  const { data: updatedTransactions } = await supabase
    .from('transactions')
    .select(`
      id,
      user_id,
      account_id,
      envelope_id,
      merchant_name,
      description,
      amount,
      occurred_at,
      status,
      transaction_type,
      linked_transaction_id,
      transfer_to_account_id,
      transfer_pending,
      created_at,
      accounts(id, name, nickname)
    `)
    .in('id', [transactionId, linkedTransactionId])
    .eq('user_id', user.id);

  return NextResponse.json({
    success: true,
    message: 'Transfer unlinked',
    transactions: updatedTransactions,
  });
}
