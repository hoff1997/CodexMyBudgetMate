-- Migration: Teen Akahu Bank Linking System
-- Date: January 2026
-- Description: Enables teens to link their real bank accounts via Akahu with parental consent

-- =============================================================================
-- STEP 1: Teen Bank Link Requests (Parental Consent Flow)
-- =============================================================================

CREATE TABLE IF NOT EXISTS teen_bank_link_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_profile_id UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  parent_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  request_status TEXT NOT NULL CHECK (request_status IN ('pending', 'approved', 'denied', 'expired')) DEFAULT 'pending',
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  response_notes TEXT,

  -- Expires after 7 days if not responded to
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_link_requests_child ON teen_bank_link_requests(child_profile_id);
CREATE INDEX IF NOT EXISTS idx_bank_link_requests_parent ON teen_bank_link_requests(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_bank_link_requests_status ON teen_bank_link_requests(request_status) WHERE request_status = 'pending';

-- =============================================================================
-- STEP 2: Teen Akahu Connections
-- =============================================================================

CREATE TABLE IF NOT EXISTS teen_akahu_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_profile_id UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  parent_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Akahu connection details
  akahu_user_id TEXT,
  akahu_access_token TEXT, -- Encrypted in application layer
  akahu_refresh_token TEXT, -- Encrypted in application layer
  token_expires_at TIMESTAMPTZ,

  -- Connection status
  connection_status TEXT NOT NULL CHECK (connection_status IN ('pending', 'active', 'disconnected', 'error')) DEFAULT 'pending',
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,

  -- Parental controls
  parent_approved BOOLEAN DEFAULT false,
  parent_approved_at TIMESTAMPTZ,
  can_view_transactions BOOLEAN DEFAULT true,
  can_view_balances BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(child_profile_id)
);

CREATE INDEX IF NOT EXISTS idx_teen_akahu_child ON teen_akahu_connections(child_profile_id);
CREATE INDEX IF NOT EXISTS idx_teen_akahu_parent ON teen_akahu_connections(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_teen_akahu_status ON teen_akahu_connections(connection_status);

-- =============================================================================
-- STEP 3: Teen Linked Bank Accounts
-- =============================================================================

CREATE TABLE IF NOT EXISTS teen_linked_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_profile_id UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  teen_akahu_connection_id UUID NOT NULL REFERENCES teen_akahu_connections(id) ON DELETE CASCADE,

  -- Akahu account details
  akahu_account_id TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_type TEXT CHECK (account_type IN ('savings', 'transaction', 'other')),
  institution_name TEXT,
  institution_logo TEXT,

  -- Balance tracking
  current_balance NUMERIC(10,2) DEFAULT 0,
  available_balance NUMERIC(10,2),
  last_balance_update TIMESTAMPTZ,

  -- Link to child_bank_accounts for virtual envelope mapping
  child_bank_account_id UUID REFERENCES child_bank_accounts(id),

  -- Account status
  is_active BOOLEAN DEFAULT true,
  is_primary_savings BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(child_profile_id, akahu_account_id)
);

CREATE INDEX IF NOT EXISTS idx_teen_linked_child ON teen_linked_accounts(child_profile_id);
CREATE INDEX IF NOT EXISTS idx_teen_linked_connection ON teen_linked_accounts(teen_akahu_connection_id);
CREATE INDEX IF NOT EXISTS idx_teen_linked_akahu ON teen_linked_accounts(akahu_account_id);

-- =============================================================================
-- STEP 4: Teen Transaction Imports
-- =============================================================================

CREATE TABLE IF NOT EXISTS teen_imported_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_profile_id UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  teen_linked_account_id UUID NOT NULL REFERENCES teen_linked_accounts(id) ON DELETE CASCADE,

  -- Akahu transaction details
  akahu_transaction_id TEXT NOT NULL,
  transaction_date DATE NOT NULL,
  description TEXT,
  merchant_name TEXT,
  amount NUMERIC(10,2) NOT NULL,
  transaction_type TEXT CHECK (transaction_type IN ('credit', 'debit')),

  -- Categorization
  category TEXT,
  is_interest BOOLEAN DEFAULT false,

  -- Processing status
  is_processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(teen_linked_account_id, akahu_transaction_id)
);

CREATE INDEX IF NOT EXISTS idx_teen_txn_child ON teen_imported_transactions(child_profile_id);
CREATE INDEX IF NOT EXISTS idx_teen_txn_account ON teen_imported_transactions(teen_linked_account_id);
CREATE INDEX IF NOT EXISTS idx_teen_txn_date ON teen_imported_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_teen_txn_interest ON teen_imported_transactions(is_interest) WHERE is_interest = true;

-- =============================================================================
-- STEP 5: Add columns to child_profiles for bank linking settings
-- =============================================================================

ALTER TABLE child_profiles
ADD COLUMN IF NOT EXISTS bank_linking_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS bank_linking_approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS min_age_for_bank_linking INTEGER DEFAULT 13;

-- =============================================================================
-- STEP 6: RLS Policies
-- =============================================================================

ALTER TABLE teen_bank_link_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE teen_akahu_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE teen_linked_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE teen_imported_transactions ENABLE ROW LEVEL SECURITY;

-- Bank Link Requests Policies
CREATE POLICY "Parents can view their children's link requests"
  ON teen_bank_link_requests FOR SELECT
  USING (parent_user_id = auth.uid());

CREATE POLICY "Parents can respond to link requests"
  ON teen_bank_link_requests FOR UPDATE
  USING (parent_user_id = auth.uid());

CREATE POLICY "System can create link requests"
  ON teen_bank_link_requests FOR INSERT
  WITH CHECK (
    child_profile_id IN (
      SELECT id FROM child_profiles WHERE parent_user_id = auth.uid()
    )
  );

-- Akahu Connections Policies
CREATE POLICY "Parents can view their children's connections"
  ON teen_akahu_connections FOR SELECT
  USING (parent_user_id = auth.uid());

CREATE POLICY "Parents can manage their children's connections"
  ON teen_akahu_connections FOR ALL
  USING (parent_user_id = auth.uid());

-- Linked Accounts Policies
CREATE POLICY "Parents can view their children's linked accounts"
  ON teen_linked_accounts FOR SELECT
  USING (
    child_profile_id IN (
      SELECT id FROM child_profiles WHERE parent_user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can manage their children's linked accounts"
  ON teen_linked_accounts FOR ALL
  USING (
    child_profile_id IN (
      SELECT id FROM child_profiles WHERE parent_user_id = auth.uid()
    )
  );

-- Imported Transactions Policies
CREATE POLICY "Parents can view their children's transactions"
  ON teen_imported_transactions FOR SELECT
  USING (
    child_profile_id IN (
      SELECT id FROM child_profiles WHERE parent_user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert transactions"
  ON teen_imported_transactions FOR INSERT
  WITH CHECK (
    child_profile_id IN (
      SELECT id FROM child_profiles WHERE parent_user_id = auth.uid()
    )
  );

-- =============================================================================
-- STEP 7: Helper Functions
-- =============================================================================

-- Function to check if a child is old enough for bank linking
CREATE OR REPLACE FUNCTION check_teen_bank_linking_eligibility(p_child_profile_id UUID)
RETURNS TABLE (
  is_eligible BOOLEAN,
  age INTEGER,
  min_age INTEGER,
  reason TEXT
) AS $$
DECLARE
  v_dob DATE;
  v_age INTEGER;
  v_min_age INTEGER;
BEGIN
  SELECT date_of_birth, min_age_for_bank_linking
  INTO v_dob, v_min_age
  FROM child_profiles
  WHERE id = p_child_profile_id;

  IF v_dob IS NULL THEN
    RETURN QUERY SELECT false, NULL::INTEGER, v_min_age, 'Date of birth not set';
    RETURN;
  END IF;

  v_age := DATE_PART('year', AGE(v_dob));

  IF v_age < v_min_age THEN
    RETURN QUERY SELECT false, v_age, v_min_age, 'Too young for bank linking';
    RETURN;
  END IF;

  RETURN QUERY SELECT true, v_age, v_min_age, 'Eligible for bank linking';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to detect interest transactions
CREATE OR REPLACE FUNCTION detect_interest_transactions()
RETURNS TRIGGER AS $$
BEGIN
  -- Simple heuristic: small credits with "interest" in description
  IF NEW.transaction_type = 'credit'
     AND NEW.amount > 0
     AND NEW.amount < 100
     AND (
       LOWER(NEW.description) LIKE '%interest%'
       OR LOWER(NEW.merchant_name) LIKE '%interest%'
     ) THEN
    NEW.is_interest := true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER detect_interest_on_import
  BEFORE INSERT ON teen_imported_transactions
  FOR EACH ROW
  EXECUTE FUNCTION detect_interest_transactions();

-- =============================================================================
-- STEP 8: Verification
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teen_akahu_connections') THEN
    RAISE NOTICE 'Teen Akahu bank linking system created successfully';
  END IF;
END $$;
