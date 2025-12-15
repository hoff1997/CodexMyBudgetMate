/**
 * Transfers API - Detection Endpoint
 *
 * GET /api/transfers - Get potential transfer matches for all unlinked transactions
 * POST /api/transfers/detect - Detect transfers for a specific transaction
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  findAllPotentialTransferPairs,
  detectPotentialTransfers,
} from '@/lib/utils/transfer-detection';
import type { TransactionForMatching } from '@/lib/types/transfer';

interface AccountInfo {
  id: string;
  name: string;
  nickname: string | null;
}

/**
 * GET /api/transfers
 *
 * Find all potential transfer pairs in the user's transactions.
 * Returns unlinked transactions that likely represent internal transfers.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  // Fetch unlinked transactions from the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: transactions, error: txError } = await supabase
    .from('transactions')
    .select(`
      id,
      user_id,
      account_id,
      amount,
      occurred_at,
      merchant_name,
      description,
      transaction_type,
      linked_transaction_id
    `)
    .eq('user_id', user.id)
    .is('linked_transaction_id', null)
    .gte('occurred_at', thirtyDaysAgo.toISOString())
    .order('occurred_at', { ascending: false });

  if (txError) {
    return NextResponse.json({ error: txError.message }, { status: 500 });
  }

  // Fetch user's accounts
  const { data: accounts, error: accError } = await supabase
    .from('accounts')
    .select('id, name, nickname')
    .eq('user_id', user.id);

  if (accError) {
    return NextResponse.json({ error: accError.message }, { status: 500 });
  }

  // Build accounts map
  const accountsMap = new Map<string, AccountInfo>();
  for (const account of accounts || []) {
    accountsMap.set(account.id, {
      id: account.id,
      name: account.name,
      nickname: account.nickname,
    });
  }

  // Cast transactions to the correct type
  const typedTransactions: TransactionForMatching[] = (transactions || []).map((t) => ({
    id: t.id,
    user_id: t.user_id,
    account_id: t.account_id,
    amount: t.amount,
    occurred_at: t.occurred_at,
    merchant_name: t.merchant_name,
    description: t.description,
    transaction_type: t.transaction_type || 'expense',
    linked_transaction_id: t.linked_transaction_id,
  }));

  // Find potential transfer pairs
  const potentialPairs = findAllPotentialTransferPairs(typedTransactions, accountsMap);

  return NextResponse.json({
    potentialTransfers: potentialPairs,
    totalUnlinked: typedTransactions.length,
    pairsFound: potentialPairs.length,
  });
}

/**
 * POST /api/transfers
 *
 * Detect potential transfers for a specific transaction.
 *
 * Body: { transactionId: string }
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const body = await request.json();
  const { transactionId } = body;

  if (!transactionId) {
    return NextResponse.json(
      { error: 'transactionId is required' },
      { status: 400 }
    );
  }

  // Fetch the source transaction
  const { data: sourceTransaction, error: sourceError } = await supabase
    .from('transactions')
    .select(`
      id,
      user_id,
      account_id,
      amount,
      occurred_at,
      merchant_name,
      description,
      transaction_type,
      linked_transaction_id
    `)
    .eq('id', transactionId)
    .eq('user_id', user.id)
    .single();

  if (sourceError || !sourceTransaction) {
    return NextResponse.json(
      { error: 'Transaction not found' },
      { status: 404 }
    );
  }

  // If already linked, return the link info
  if (sourceTransaction.linked_transaction_id) {
    const { data: linkedTransaction } = await supabase
      .from('transactions')
      .select(`
        id,
        account_id,
        amount,
        occurred_at,
        merchant_name,
        accounts(id, name, nickname)
      `)
      .eq('id', sourceTransaction.linked_transaction_id)
      .eq('user_id', user.id)
      .single();

    return NextResponse.json({
      isLinked: true,
      linkedTransaction,
      message: 'Transaction is already linked as a transfer',
    });
  }

  // Fetch candidate transactions (same user, different accounts, within 3 days)
  const sourceDate = new Date(sourceTransaction.occurred_at);
  const minDate = new Date(sourceDate);
  minDate.setDate(minDate.getDate() - 3);
  const maxDate = new Date(sourceDate);
  maxDate.setDate(maxDate.getDate() + 3);

  const { data: candidates, error: candError } = await supabase
    .from('transactions')
    .select(`
      id,
      user_id,
      account_id,
      amount,
      occurred_at,
      merchant_name,
      description,
      transaction_type,
      linked_transaction_id
    `)
    .eq('user_id', user.id)
    .neq('id', transactionId)
    .neq('account_id', sourceTransaction.account_id)
    .is('linked_transaction_id', null)
    .gte('occurred_at', minDate.toISOString())
    .lte('occurred_at', maxDate.toISOString());

  if (candError) {
    return NextResponse.json({ error: candError.message }, { status: 500 });
  }

  // Fetch user's accounts
  const { data: accounts, error: accError } = await supabase
    .from('accounts')
    .select('id, name, nickname')
    .eq('user_id', user.id);

  if (accError) {
    return NextResponse.json({ error: accError.message }, { status: 500 });
  }

  // Build accounts map
  const accountsMap = new Map<string, AccountInfo>();
  for (const account of accounts || []) {
    accountsMap.set(account.id, {
      id: account.id,
      name: account.name,
      nickname: account.nickname,
    });
  }

  // Cast to proper types
  const typedSource: TransactionForMatching = {
    id: sourceTransaction.id,
    user_id: sourceTransaction.user_id,
    account_id: sourceTransaction.account_id,
    amount: sourceTransaction.amount,
    occurred_at: sourceTransaction.occurred_at,
    merchant_name: sourceTransaction.merchant_name,
    description: sourceTransaction.description,
    transaction_type: sourceTransaction.transaction_type || 'expense',
    linked_transaction_id: sourceTransaction.linked_transaction_id,
  };

  const typedCandidates: TransactionForMatching[] = (candidates || []).map((t) => ({
    id: t.id,
    user_id: t.user_id,
    account_id: t.account_id,
    amount: t.amount,
    occurred_at: t.occurred_at,
    merchant_name: t.merchant_name,
    description: t.description,
    transaction_type: t.transaction_type || 'expense',
    linked_transaction_id: t.linked_transaction_id,
  }));

  // Detect potential transfers
  const detection = detectPotentialTransfers(typedSource, typedCandidates, accountsMap);

  return NextResponse.json({
    isLinked: false,
    detection,
  });
}
