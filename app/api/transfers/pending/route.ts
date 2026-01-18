/**
 * Pending Transfers API
 *
 * GET /api/transfers/pending - Get all pending transfers (one-sided)
 * POST /api/transfers/pending - Mark a transaction as pending transfer
 * DELETE /api/transfers/pending - Clear pending status
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

const pendingSchema = z.object({
  transactionId: z.string().uuid(),
});

/**
 * GET /api/transfers/pending
 *
 * Get all transactions marked as pending transfer.
 * These are transactions waiting for their matching counterpart to appear.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const { data: pendingTransfers, error } = await supabase
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
    .eq('user_id', user.id)
    .eq('transfer_pending', true)
    .is('linked_transaction_id', null)
    .order('occurred_at', { ascending: false });

  if (error) {
    return createErrorResponse(error, 500, 'Failed to fetch pending transfers');
  }

  return NextResponse.json({
    pendingTransfers: pendingTransfers || [],
    count: pendingTransfers?.length || 0,
  });
}

/**
 * POST /api/transfers/pending
 *
 * Mark a transaction as a pending transfer.
 * Use this when user knows a transaction is a transfer but the other side
 * hasn't appeared yet.
 *
 * Body: { transactionId: string }
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
  const parsed = pendingSchema.safeParse(body);

  if (!parsed.success) {
    return createValidationError('Invalid request body');
  }

  const { transactionId } = parsed.data;

  // Verify the transaction exists and belongs to user
  const { data: transaction, error: txError } = await supabase
    .from('transactions')
    .select('id, linked_transaction_id, transfer_pending')
    .eq('id', transactionId)
    .eq('user_id', user.id)
    .single();

  if (txError || !transaction) {
    return createNotFoundError('Transaction');
  }

  // Check if already linked
  if (transaction.linked_transaction_id) {
    return createValidationError('Transaction is already linked to a transfer');
  }

  // Mark as pending
  const { data: updatedTransaction, error: updateError } = await supabase
    .from('transactions')
    .update({
      transfer_pending: true,
      transaction_type: 'transfer',
      envelope_id: null, // Pending transfers don't affect envelopes
    })
    .eq('id', transactionId)
    .eq('user_id', user.id)
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
    .single();

  if (updateError) {
    return createErrorResponse(updateError, 500, 'Failed to mark transaction as pending');
  }

  return NextResponse.json({
    success: true,
    message: 'Transaction marked as pending transfer',
    transaction: updatedTransaction,
  });
}

/**
 * DELETE /api/transfers/pending
 *
 * Clear the pending transfer status from a transaction.
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
  const parsed = pendingSchema.safeParse(body);

  if (!parsed.success) {
    return createValidationError('Invalid request body');
  }

  const { transactionId } = parsed.data;

  // Verify the transaction exists and belongs to user
  const { data: transaction, error: txError } = await supabase
    .from('transactions')
    .select('id, amount')
    .eq('id', transactionId)
    .eq('user_id', user.id)
    .single();

  if (txError || !transaction) {
    return createNotFoundError('Transaction');
  }

  // Determine the original transaction type based on amount
  const originalType = transaction.amount >= 0 ? 'income' : 'expense';

  // Clear pending status
  const { data: updatedTransaction, error: updateError } = await supabase
    .from('transactions')
    .update({
      transfer_pending: false,
      transaction_type: originalType,
    })
    .eq('id', transactionId)
    .eq('user_id', user.id)
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
    .single();

  if (updateError) {
    return createErrorResponse(updateError, 500, 'Failed to clear pending status');
  }

  return NextResponse.json({
    success: true,
    message: 'Pending transfer status cleared',
    transaction: updatedTransaction,
  });
}
