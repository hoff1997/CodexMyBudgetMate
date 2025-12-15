-- Multi-Account Reconciliation & Transfer Tracking
-- Migration: 0030_multi_account_transfers.sql
-- Purpose: Add transfer tracking fields to transactions table and support multi-account reconciliation
--
-- Key Concepts:
-- - transaction_type: income | expense | transfer
-- - linked_transaction_id: Links two transactions that form a transfer pair
-- - transfer_to_account_id: The destination account for outgoing transfers
-- - transfer_pending: Flag for one-sided imports awaiting match

-- =====================================================
-- STEP 1: Add transfer tracking columns to transactions
-- =====================================================

-- Transaction type: income, expense, or transfer
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS transaction_type TEXT DEFAULT 'expense'
  CHECK (transaction_type IN ('income', 'expense', 'transfer'));

-- Link to the other side of a transfer (bidirectional)
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS linked_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL;

-- For outgoing transfers, which account did it go to?
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS transfer_to_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL;

-- Flag for potential transfers awaiting their match
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS transfer_pending BOOLEAN DEFAULT FALSE;

-- =====================================================
-- STEP 2: Set default transaction_type based on amount
-- =====================================================

-- Set existing transactions: positive = income, negative = expense
UPDATE public.transactions
SET transaction_type = CASE
  WHEN amount > 0 THEN 'income'
  ELSE 'expense'
END
WHERE transaction_type IS NULL OR transaction_type = 'expense';

-- =====================================================
-- STEP 3: Create indexes for performance
-- =====================================================

-- Index for finding linked transactions
CREATE INDEX IF NOT EXISTS idx_transactions_linked
ON public.transactions(linked_transaction_id)
WHERE linked_transaction_id IS NOT NULL;

-- Index for transfer detection queries (user, account, amount, date)
CREATE INDEX IF NOT EXISTS idx_transactions_transfer_detection
ON public.transactions(user_id, account_id, amount, occurred_at);

-- Index for pending transfers
CREATE INDEX IF NOT EXISTS idx_transactions_transfer_pending
ON public.transactions(user_id, transfer_pending)
WHERE transfer_pending = TRUE;

-- Index for transaction type filtering
CREATE INDEX IF NOT EXISTS idx_transactions_type
ON public.transactions(user_id, transaction_type);

-- =====================================================
-- STEP 4: Add account nickname for user-friendly display
-- =====================================================

ALTER TABLE public.accounts
ADD COLUMN IF NOT EXISTS nickname TEXT;

-- Update account type constraint to include more types
-- First drop the existing constraint if it exists
ALTER TABLE public.accounts
DROP CONSTRAINT IF EXISTS accounts_type_check;

-- Re-add with expanded types including checking and credit_card
ALTER TABLE public.accounts
ADD CONSTRAINT accounts_type_check
CHECK (type IN ('transaction', 'checking', 'savings', 'debt', 'credit_card', 'investment', 'cash', 'liability'));

-- =====================================================
-- STEP 5: Create helper function for transfer linking
-- =====================================================

CREATE OR REPLACE FUNCTION public.link_transfer_transactions(
  p_transaction1_id UUID,
  p_transaction2_id UUID,
  p_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_tx1 RECORD;
  v_tx2 RECORD;
BEGIN
  -- Fetch both transactions
  SELECT * INTO v_tx1 FROM public.transactions WHERE id = p_transaction1_id AND user_id = p_user_id;
  SELECT * INTO v_tx2 FROM public.transactions WHERE id = p_transaction2_id AND user_id = p_user_id;

  -- Verify both exist and belong to user
  IF v_tx1.id IS NULL OR v_tx2.id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Verify they're from different accounts
  IF v_tx1.account_id = v_tx2.account_id THEN
    RETURN FALSE;
  END IF;

  -- Update both transactions to be linked transfers
  UPDATE public.transactions
  SET
    transaction_type = 'transfer',
    linked_transaction_id = p_transaction2_id,
    transfer_to_account_id = v_tx2.account_id,
    transfer_pending = FALSE,
    envelope_id = NULL  -- Transfers don't have envelope assignments
  WHERE id = p_transaction1_id AND user_id = p_user_id;

  UPDATE public.transactions
  SET
    transaction_type = 'transfer',
    linked_transaction_id = p_transaction1_id,
    transfer_to_account_id = v_tx1.account_id,
    transfer_pending = FALSE,
    envelope_id = NULL  -- Transfers don't have envelope assignments
  WHERE id = p_transaction2_id AND user_id = p_user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 6: Create helper function to unlink transfers
-- =====================================================

CREATE OR REPLACE FUNCTION public.unlink_transfer_transactions(
  p_transaction_id UUID,
  p_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_linked_id UUID;
  v_tx_amount NUMERIC;
BEGIN
  -- Get the linked transaction ID and amount
  SELECT linked_transaction_id, amount INTO v_linked_id, v_tx_amount
  FROM public.transactions
  WHERE id = p_transaction_id AND user_id = p_user_id;

  IF v_linked_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Unlink and reset both transactions
  UPDATE public.transactions
  SET
    transaction_type = CASE WHEN amount > 0 THEN 'income' ELSE 'expense' END,
    linked_transaction_id = NULL,
    transfer_to_account_id = NULL,
    transfer_pending = FALSE
  WHERE id = p_transaction_id AND user_id = p_user_id;

  UPDATE public.transactions
  SET
    transaction_type = CASE WHEN amount > 0 THEN 'income' ELSE 'expense' END,
    linked_transaction_id = NULL,
    transfer_to_account_id = NULL,
    transfer_pending = FALSE
  WHERE id = v_linked_id AND user_id = p_user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 7: Create view for multi-account summary
-- =====================================================

CREATE OR REPLACE VIEW public.account_summary_view AS
SELECT
  a.user_id,
  a.id as account_id,
  COALESCE(a.nickname, a.name) as display_name,
  a.name as account_name,
  a.type as account_type,
  a.institution,
  a.current_balance,
  (SELECT COUNT(*) FROM public.transactions t WHERE t.account_id = a.id) as transaction_count,
  (SELECT MAX(t.occurred_at) FROM public.transactions t WHERE t.account_id = a.id) as last_transaction_date
FROM public.accounts a;

-- =====================================================
-- STEP 8: Create function to get total bank balance
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_total_bank_balance(p_user_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_total NUMERIC;
BEGIN
  SELECT COALESCE(SUM(current_balance), 0) INTO v_total
  FROM public.accounts
  WHERE user_id = p_user_id
    AND type IN ('transaction', 'checking', 'savings', 'cash');

  RETURN v_total;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- STEP 9: Grant permissions
-- =====================================================

GRANT EXECUTE ON FUNCTION public.link_transfer_transactions(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unlink_transfer_transactions(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_total_bank_balance(UUID) TO authenticated;
GRANT SELECT ON public.account_summary_view TO authenticated;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON COLUMN public.transactions.transaction_type IS 'Type of transaction: income (money in), expense (money out), or transfer (between own accounts)';
COMMENT ON COLUMN public.transactions.linked_transaction_id IS 'For transfers: ID of the corresponding transaction in the other account';
COMMENT ON COLUMN public.transactions.transfer_to_account_id IS 'For outgoing transfers: the destination account ID';
COMMENT ON COLUMN public.transactions.transfer_pending IS 'True if this appears to be a transfer but the matching transaction has not been found yet';
COMMENT ON COLUMN public.accounts.nickname IS 'User-friendly display name for the account (e.g., "Bills Account")';
