-- ============================================
-- Wallet (Cash on Hand) Feature
-- Migration: 0089_wallet_cash_on_hand.sql
-- ============================================

-- ============================================
-- ADULTS: Wallet uses existing accounts table
-- ============================================

-- 1. Add is_wallet flag to accounts table (similar to is_credit_card_holding)
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS is_wallet BOOLEAN DEFAULT false;

-- 2. Add is_wallet flag to envelopes table (links envelope to wallet account)
ALTER TABLE envelopes ADD COLUMN IF NOT EXISTS is_wallet BOOLEAN DEFAULT false;
ALTER TABLE envelopes ADD COLUMN IF NOT EXISTS linked_wallet_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;

-- 3. Wallet transaction log (for history/audit, balance lives on accounts.current_balance)
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL, -- positive = deposit, negative = withdrawal
  source TEXT NOT NULL CHECK (source IN ('manual', 'atm_withdrawal', 'gift', 'spending', 'transfer')),
  description TEXT,
  linked_bank_transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- KIDS: Wallet is 5th envelope type
-- ============================================

-- 4. Add 'wallet' to kid envelope types
-- First drop the existing constraint if it exists
ALTER TABLE child_bank_accounts
  DROP CONSTRAINT IF EXISTS child_bank_accounts_account_type_check;

-- Then add the new constraint with 'wallet' included
ALTER TABLE child_bank_accounts
  ADD CONSTRAINT child_bank_accounts_account_type_check
  CHECK (account_type IN ('spend', 'save', 'invest', 'give', 'wallet'));

-- 5. Kid wallet transactions (simpler than adult - just amount tracking)
CREATE TABLE IF NOT EXISTS kid_wallet_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_profile_id UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL, -- positive = deposit, negative = withdrawal
  source TEXT NOT NULL CHECK (source IN ('manual', 'pocket_money', 'gift', 'spending', 'chore_payment')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- RLS Policies
-- ============================================

ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE kid_wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Adult wallet transactions: users can manage their own
DROP POLICY IF EXISTS "Users can view own wallet transactions" ON wallet_transactions;
CREATE POLICY "Users can view own wallet transactions"
  ON wallet_transactions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own wallet transactions" ON wallet_transactions;
CREATE POLICY "Users can insert own wallet transactions"
  ON wallet_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own wallet transactions" ON wallet_transactions;
CREATE POLICY "Users can update own wallet transactions"
  ON wallet_transactions FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own wallet transactions" ON wallet_transactions;
CREATE POLICY "Users can delete own wallet transactions"
  ON wallet_transactions FOR DELETE
  USING (auth.uid() = user_id);

-- Kid wallet transactions: parents can manage their children's
DROP POLICY IF EXISTS "Parents can view kid wallet transactions" ON kid_wallet_transactions;
CREATE POLICY "Parents can view kid wallet transactions"
  ON kid_wallet_transactions FOR SELECT
  USING (child_profile_id IN (
    SELECT id FROM child_profiles WHERE parent_user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Parents can insert kid wallet transactions" ON kid_wallet_transactions;
CREATE POLICY "Parents can insert kid wallet transactions"
  ON kid_wallet_transactions FOR INSERT
  WITH CHECK (child_profile_id IN (
    SELECT id FROM child_profiles WHERE parent_user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Parents can update kid wallet transactions" ON kid_wallet_transactions;
CREATE POLICY "Parents can update kid wallet transactions"
  ON kid_wallet_transactions FOR UPDATE
  USING (child_profile_id IN (
    SELECT id FROM child_profiles WHERE parent_user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Parents can delete kid wallet transactions" ON kid_wallet_transactions;
CREATE POLICY "Parents can delete kid wallet transactions"
  ON kid_wallet_transactions FOR DELETE
  USING (child_profile_id IN (
    SELECT id FROM child_profiles WHERE parent_user_id = auth.uid()
  ));

-- ============================================
-- Indexes for Performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_account ON wallet_transactions(wallet_account_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created ON wallet_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kid_wallet_transactions_child ON kid_wallet_transactions(child_profile_id);
CREATE INDEX IF NOT EXISTS idx_kid_wallet_transactions_created ON kid_wallet_transactions(created_at DESC);

-- ============================================
-- Auto-create wallet for existing kids
-- ============================================

-- Add wallet account to existing child profiles that don't have one
INSERT INTO child_bank_accounts (id, child_profile_id, account_type, balance, created_at)
SELECT
  uuid_generate_v4(),
  cp.id,
  'wallet',
  0,
  NOW()
FROM child_profiles cp
WHERE NOT EXISTS (
  SELECT 1 FROM child_bank_accounts cba
  WHERE cba.child_profile_id = cp.id AND cba.account_type = 'wallet'
);

-- ============================================
-- Trigger to auto-create wallet for new kids
-- ============================================

CREATE OR REPLACE FUNCTION create_kid_wallet_on_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Create wallet account for new child profile
  INSERT INTO child_bank_accounts (id, child_profile_id, account_type, balance, created_at)
  VALUES (uuid_generate_v4(), NEW.id, 'wallet', 0, NOW());

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS create_kid_wallet_trigger ON child_profiles;
CREATE TRIGGER create_kid_wallet_trigger
  AFTER INSERT ON child_profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_kid_wallet_on_profile();

-- ============================================
-- Helper function to get wallet balance
-- ============================================

CREATE OR REPLACE FUNCTION get_wallet_balance(p_user_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_balance NUMERIC;
BEGIN
  SELECT current_balance INTO v_balance
  FROM accounts
  WHERE user_id = p_user_id AND is_wallet = true
  LIMIT 1;

  RETURN COALESCE(v_balance, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Helper function to get kid wallet balance
-- ============================================

CREATE OR REPLACE FUNCTION get_kid_wallet_balance(p_child_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_balance NUMERIC;
BEGIN
  SELECT balance INTO v_balance
  FROM child_bank_accounts
  WHERE child_profile_id = p_child_id AND account_type = 'wallet'
  LIMIT 1;

  RETURN COALESCE(v_balance, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
