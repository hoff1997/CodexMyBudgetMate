/**
 * Multi-Account Reconciliation API
 *
 * GET /api/reconciliation - Get full reconciliation report
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  calculateMultiAccountReconciliation,
  calculateSurplus,
  formatMultiAccountReconciliation,
} from '@/lib/utils/reconciliation-calculator';
import type { AccountRow } from '@/lib/types/accounts';

/**
 * GET /api/reconciliation
 *
 * Get a comprehensive multi-account reconciliation report.
 * Shows how bank balances align with envelope allocations.
 *
 * Formula: Sum(All Accounts) = Sum(All Envelopes) - CC Holding + Surplus
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  // Fetch all accounts
  const { data: accounts, error: accountsError } = await supabase
    .from('accounts')
    .select('id, name, type, current_balance, institution, nickname')
    .eq('user_id', user.id);

  if (accountsError) {
    return NextResponse.json({ error: accountsError.message }, { status: 500 });
  }

  // Fetch all envelopes
  const { data: envelopes, error: envelopesError } = await supabase
    .from('envelopes')
    .select('id, name, current_amount, is_cc_holding')
    .eq('user_id', user.id);

  if (envelopesError) {
    return NextResponse.json({ error: envelopesError.message }, { status: 500 });
  }

  // Get transaction counts and last transaction dates per account
  const { data: accountStats, error: statsError } = await supabase
    .from('transactions')
    .select('account_id')
    .eq('user_id', user.id);

  // Count transactions per account
  const transactionCounts = new Map<string, number>();
  const lastTransactionDates = new Map<string, string>();

  if (!statsError && accountStats) {
    for (const tx of accountStats) {
      const current = transactionCounts.get(tx.account_id) || 0;
      transactionCounts.set(tx.account_id, current + 1);
    }

    // Get last transaction dates
    for (const accountId of transactionCounts.keys()) {
      const { data: lastTx } = await supabase
        .from('transactions')
        .select('occurred_at')
        .eq('user_id', user.id)
        .eq('account_id', accountId)
        .order('occurred_at', { ascending: false })
        .limit(1)
        .single();

      if (lastTx) {
        lastTransactionDates.set(accountId, lastTx.occurred_at);
      }
    }
  }

  // Type assertion for accounts
  const typedAccounts: AccountRow[] = (accounts || []).map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    current_balance: a.current_balance,
    institution: a.institution,
    nickname: a.nickname,
  }));

  // Calculate surplus first
  const surplus = calculateSurplus(typedAccounts, envelopes || []);

  // Calculate full reconciliation
  const reconciliation = calculateMultiAccountReconciliation(
    typedAccounts,
    envelopes || [],
    surplus
  );

  // Get formatted output
  const formatted = formatMultiAccountReconciliation(reconciliation);

  // Get pending transfer count
  const { count: pendingTransferCount } = await supabase
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('transfer_pending', true)
    .is('linked_transaction_id', null);

  // Get linked transfer count
  const { count: linkedTransferCount } = await supabase
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('transaction_type', 'transfer')
    .not('linked_transaction_id', 'is', null);

  return NextResponse.json({
    reconciliation,
    formatted,
    transfers: {
      pendingCount: pendingTransferCount || 0,
      linkedCount: Math.floor((linkedTransferCount || 0) / 2), // Each transfer is 2 transactions
    },
    metadata: {
      accountCount: reconciliation.accounts.length,
      envelopeCount: envelopes?.length || 0,
      hasCCHolding: reconciliation.ccHoldingBalance > 0,
      timestamp: new Date().toISOString(),
    },
  });
}
