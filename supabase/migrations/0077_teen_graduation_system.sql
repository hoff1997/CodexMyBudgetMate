-- Migration: 0077_teen_graduation_system.sql
-- Description: Teen Mode & Graduation System
-- Purpose: Enable teens (13+) to transition from Kids Module to independent users
--
-- Features:
-- 1. Teen Mode: Expanded features within parent ecosystem (FREE)
-- 2. Full Graduation: Independent account with data migration (6 months FREE)
-- 3. Family Links: Post-graduation connections with sharing controls
--
-- Conversion Safeguards:
-- - DOB required for teen mode (prevents gaming the system)
-- - Auto-graduation at 18 with 90-day grace period
-- - 6 envelope limit in teen mode
-- - 2 external income source limit

-- =============================================================================
-- PART 1: Modify child_profiles for Teen Mode
-- =============================================================================

-- Add teen mode columns
ALTER TABLE child_profiles
ADD COLUMN IF NOT EXISTS is_teen_mode BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS teen_mode_enabled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS can_reconcile_transactions BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS can_add_external_income BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS graduation_status TEXT DEFAULT 'child',
ADD COLUMN IF NOT EXISTS graduated_user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS auto_graduation_date DATE,
ADD COLUMN IF NOT EXISTS graduation_warning_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS graduation_warning_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS graduation_grace_ends_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS teen_mode_expired_at TIMESTAMPTZ;

-- Add check constraint for graduation_status
ALTER TABLE child_profiles
DROP CONSTRAINT IF EXISTS child_profiles_graduation_status_check;

ALTER TABLE child_profiles
ADD CONSTRAINT child_profiles_graduation_status_check
CHECK (graduation_status IN ('child', 'teen_mode', 'graduating', 'graduated', 'expired'));

-- CRITICAL: DOB required for teen mode (prevents perpetual free users)
-- This constraint ensures parents can't game the system
ALTER TABLE child_profiles
DROP CONSTRAINT IF EXISTS teen_mode_requires_dob;

ALTER TABLE child_profiles
ADD CONSTRAINT teen_mode_requires_dob
CHECK (
  (is_teen_mode = false) OR
  (is_teen_mode = true AND date_of_birth IS NOT NULL)
);

-- Trigger to auto-calculate graduation date (18th birthday)
CREATE OR REPLACE FUNCTION calculate_auto_graduation_date()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.date_of_birth IS NOT NULL THEN
    NEW.auto_graduation_date := NEW.date_of_birth + INTERVAL '18 years';
  ELSE
    NEW.auto_graduation_date := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_auto_graduation_date ON child_profiles;

CREATE TRIGGER set_auto_graduation_date
BEFORE INSERT OR UPDATE OF date_of_birth ON child_profiles
FOR EACH ROW EXECUTE FUNCTION calculate_auto_graduation_date();

-- Update existing rows to calculate auto_graduation_date
UPDATE child_profiles
SET auto_graduation_date = date_of_birth + INTERVAL '18 years'
WHERE date_of_birth IS NOT NULL AND auto_graduation_date IS NULL;

-- =============================================================================
-- PART 2: Teen Linked Bank Accounts
-- =============================================================================

CREATE TABLE IF NOT EXISTS teen_linked_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_profile_id UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,

  -- Account details
  account_name TEXT NOT NULL,
  bank_name TEXT,
  account_number_masked TEXT, -- Last 4 digits only for display

  -- Akahu integration (optional)
  akahu_account_id TEXT,
  akahu_connection_id TEXT,

  -- Balance tracking
  current_balance NUMERIC(12,2) DEFAULT 0,
  last_synced_at TIMESTAMPTZ,

  -- Status
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_teen_linked_accounts_child
ON teen_linked_accounts(child_profile_id);

CREATE INDEX IF NOT EXISTS idx_teen_linked_accounts_akahu
ON teen_linked_accounts(akahu_account_id) WHERE akahu_account_id IS NOT NULL;

-- RLS
ALTER TABLE teen_linked_accounts ENABLE ROW LEVEL SECURITY;

-- Parents can manage their children's linked accounts
CREATE POLICY "Parents can manage teen linked accounts"
ON teen_linked_accounts
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM child_profiles cp
    WHERE cp.id = teen_linked_accounts.child_profile_id
    AND cp.parent_user_id = auth.uid()
  )
);

-- =============================================================================
-- PART 3: Teen External Income Sources
-- =============================================================================

CREATE TABLE IF NOT EXISTS teen_external_income (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_profile_id UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,

  -- Income details
  name TEXT NOT NULL,
  employer_name TEXT,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'fortnightly', 'monthly')),
  next_pay_date DATE,

  -- Bank account link (optional)
  linked_bank_account_id UUID REFERENCES teen_linked_accounts(id) ON DELETE SET NULL,

  -- Status
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_teen_external_income_child
ON teen_external_income(child_profile_id);

CREATE INDEX IF NOT EXISTS idx_teen_external_income_active
ON teen_external_income(child_profile_id, is_active) WHERE is_active = true;

-- RLS
ALTER TABLE teen_external_income ENABLE ROW LEVEL SECURITY;

-- Parents can manage their children's external income
CREATE POLICY "Parents can manage teen external income"
ON teen_external_income
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM child_profiles cp
    WHERE cp.id = teen_external_income.child_profile_id
    AND cp.parent_user_id = auth.uid()
  )
);

-- =============================================================================
-- PART 4: Teen Envelopes (Full 6-type system)
-- =============================================================================

CREATE TABLE IF NOT EXISTS teen_envelopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_profile_id UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,

  -- Core fields (matching adult envelopes structure)
  name TEXT NOT NULL,
  icon TEXT DEFAULT '📦',
  subtype TEXT NOT NULL CHECK (subtype IN ('bill', 'spending', 'savings', 'goal', 'tracking', 'debt')),

  -- Amounts
  target_amount NUMERIC(12,2) DEFAULT 0,
  current_amount NUMERIC(12,2) DEFAULT 0,

  -- Bill-specific fields
  frequency TEXT CHECK (frequency IN ('weekly', 'fortnightly', 'monthly', 'quarterly', 'annually')),
  due_date INTEGER CHECK (due_date >= 1 AND due_date <= 31),
  priority TEXT CHECK (priority IN ('essential', 'important', 'discretionary')),

  -- Allocation
  pay_cycle_amount NUMERIC(12,2) DEFAULT 0,

  -- Metadata
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_teen_envelopes_child
ON teen_envelopes(child_profile_id);

CREATE INDEX IF NOT EXISTS idx_teen_envelopes_active
ON teen_envelopes(child_profile_id, is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_teen_envelopes_subtype
ON teen_envelopes(child_profile_id, subtype);

-- RLS
ALTER TABLE teen_envelopes ENABLE ROW LEVEL SECURITY;

-- Parents can manage their children's envelopes
CREATE POLICY "Parents can manage teen envelopes"
ON teen_envelopes
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM child_profiles cp
    WHERE cp.id = teen_envelopes.child_profile_id
    AND cp.parent_user_id = auth.uid()
  )
);

-- =============================================================================
-- PART 5: Teen Envelope Allocations
-- =============================================================================

CREATE TABLE IF NOT EXISTS teen_envelope_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_profile_id UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  teen_envelope_id UUID NOT NULL REFERENCES teen_envelopes(id) ON DELETE CASCADE,

  -- Income source type and reference
  income_source_type TEXT NOT NULL CHECK (income_source_type IN ('pocket_money', 'external_income')),
  income_source_id UUID NOT NULL,

  -- Allocation amount per pay cycle of the income source
  allocation_amount NUMERIC(12,2) NOT NULL CHECK (allocation_amount >= 0),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One allocation per envelope/income pair
  UNIQUE(teen_envelope_id, income_source_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_teen_envelope_allocations_child
ON teen_envelope_allocations(child_profile_id);

CREATE INDEX IF NOT EXISTS idx_teen_envelope_allocations_envelope
ON teen_envelope_allocations(teen_envelope_id);

CREATE INDEX IF NOT EXISTS idx_teen_envelope_allocations_income
ON teen_envelope_allocations(income_source_id);

-- RLS
ALTER TABLE teen_envelope_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can manage teen envelope allocations"
ON teen_envelope_allocations
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM child_profiles cp
    WHERE cp.id = teen_envelope_allocations.child_profile_id
    AND cp.parent_user_id = auth.uid()
  )
);

-- =============================================================================
-- PART 6: Teen Graduation Requests
-- =============================================================================

CREATE TABLE IF NOT EXISTS teen_graduation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_profile_id UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  parent_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Request type
  request_type TEXT NOT NULL CHECK (request_type IN ('teen_mode', 'full_graduation')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')) DEFAULT 'pending',

  -- Teen mode activation (Phase 1)
  teen_mode_enabled_at TIMESTAMPTZ,

  -- Full graduation details (Phase 2)
  graduated_user_id UUID REFERENCES auth.users(id),
  graduation_email TEXT,
  graduation_token TEXT, -- Magic link token
  graduation_token_expires_at TIMESTAMPTZ,
  graduation_started_at TIMESTAMPTZ,
  graduation_completed_at TIMESTAMPTZ,

  -- Sharing preferences set during graduation
  initial_share_budget_overview BOOLEAN DEFAULT false,
  initial_share_savings_goals BOOLEAN DEFAULT false,
  initial_share_spending_categories BOOLEAN DEFAULT false,
  initial_share_bank_balance BOOLEAN DEFAULT false,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_graduation_requests_child
ON teen_graduation_requests(child_profile_id);

CREATE INDEX IF NOT EXISTS idx_graduation_requests_parent
ON teen_graduation_requests(parent_user_id);

CREATE INDEX IF NOT EXISTS idx_graduation_requests_status
ON teen_graduation_requests(status);

CREATE INDEX IF NOT EXISTS idx_graduation_requests_token
ON teen_graduation_requests(graduation_token) WHERE graduation_token IS NOT NULL;

-- RLS
ALTER TABLE teen_graduation_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can manage graduation requests"
ON teen_graduation_requests
FOR ALL
USING (parent_user_id = auth.uid());

-- =============================================================================
-- PART 7: Graduated Family Links
-- =============================================================================

CREATE TABLE IF NOT EXISTS graduated_family_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  graduated_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original_child_profile_id UUID NOT NULL,

  -- Sharing controls (teen decides what to share)
  share_budget_overview BOOLEAN DEFAULT false,
  share_savings_goals BOOLEAN DEFAULT false,
  share_spending_categories BOOLEAN DEFAULT false,
  share_bank_balance BOOLEAN DEFAULT false,

  -- Household Hub access
  can_access_shopping_lists BOOLEAN DEFAULT true,
  can_access_recipes BOOLEAN DEFAULT true,
  can_access_meal_planner BOOLEAN DEFAULT false,
  can_access_todos BOOLEAN DEFAULT true,
  can_access_calendar BOOLEAN DEFAULT true,
  can_access_birthdays BOOLEAN DEFAULT true,

  -- Link status
  status TEXT NOT NULL CHECK (status IN ('active', 'suspended', 'revoked')) DEFAULT 'active',
  linked_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  revoked_by TEXT CHECK (revoked_by IN ('teen', 'parent', 'system')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One link per graduated user/parent pair
  UNIQUE(graduated_user_id, parent_user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_family_links_graduated
ON graduated_family_links(graduated_user_id);

CREATE INDEX IF NOT EXISTS idx_family_links_parent
ON graduated_family_links(parent_user_id);

CREATE INDEX IF NOT EXISTS idx_family_links_active
ON graduated_family_links(graduated_user_id, status) WHERE status = 'active';

-- RLS
ALTER TABLE graduated_family_links ENABLE ROW LEVEL SECURITY;

-- Graduated teens can manage their own links
CREATE POLICY "Graduated teens can manage their family links"
ON graduated_family_links
FOR ALL
USING (graduated_user_id = auth.uid());

-- Parents can view links where they are the parent
CREATE POLICY "Parents can view family links"
ON graduated_family_links
FOR SELECT
USING (parent_user_id = auth.uid());

-- =============================================================================
-- PART 8: Graduation Promo Codes
-- =============================================================================

CREATE TABLE IF NOT EXISTS graduation_promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  graduated_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Promo details
  months_free INTEGER DEFAULT 6,
  is_used BOOLEAN DEFAULT false,
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,

  -- Stripe integration
  stripe_coupon_id TEXT,
  stripe_promotion_code_id TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_promo_codes_user
ON graduation_promo_codes(graduated_user_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_promo_codes_code
ON graduation_promo_codes(code);

CREATE INDEX IF NOT EXISTS idx_promo_codes_unused
ON graduation_promo_codes(is_used, expires_at) WHERE is_used = false;

-- RLS
ALTER TABLE graduation_promo_codes ENABLE ROW LEVEL SECURITY;

-- Users can only see their own promo codes
CREATE POLICY "Users can view their promo codes"
ON graduation_promo_codes
FOR SELECT
USING (graduated_user_id = auth.uid());

-- =============================================================================
-- PART 9: Modify subscriptions table for graduation tracking
-- =============================================================================

ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS is_graduated_teen BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS graduated_from_parent_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS graduation_promo_code_id UUID REFERENCES graduation_promo_codes(id);

-- Index for finding graduated teen subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_graduated_teen
ON subscriptions(is_graduated_teen) WHERE is_graduated_teen = true;

-- =============================================================================
-- PART 10: Helper Functions
-- =============================================================================

-- Function to count active teen envelopes (for limit checking)
CREATE OR REPLACE FUNCTION count_teen_envelopes(p_child_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM teen_envelopes
  WHERE child_profile_id = p_child_id
  AND is_active = true;
$$ LANGUAGE sql STABLE;

-- Function to count active external income sources (for limit checking)
CREATE OR REPLACE FUNCTION count_teen_external_income(p_child_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM teen_external_income
  WHERE child_profile_id = p_child_id
  AND is_active = true;
$$ LANGUAGE sql STABLE;

-- Function to check if teen can add more envelopes (limit: 6)
CREATE OR REPLACE FUNCTION can_teen_add_envelope(p_child_id UUID)
RETURNS BOOLEAN AS $$
  SELECT count_teen_envelopes(p_child_id) < 6;
$$ LANGUAGE sql STABLE;

-- Function to check if teen can add more income sources (limit: 2)
CREATE OR REPLACE FUNCTION can_teen_add_income(p_child_id UUID)
RETURNS BOOLEAN AS $$
  SELECT count_teen_external_income(p_child_id) < 2;
$$ LANGUAGE sql STABLE;

-- Function to get days until auto-graduation
CREATE OR REPLACE FUNCTION days_until_graduation(p_child_id UUID)
RETURNS INTEGER AS $$
  SELECT GREATEST(0, (auto_graduation_date - CURRENT_DATE))::INTEGER
  FROM child_profiles
  WHERE id = p_child_id
  AND auto_graduation_date IS NOT NULL;
$$ LANGUAGE sql STABLE;

-- Function to check if teen is in grace period
CREATE OR REPLACE FUNCTION is_in_grace_period(p_child_id UUID)
RETURNS BOOLEAN AS $$
  SELECT
    graduation_grace_ends_at IS NOT NULL
    AND graduation_grace_ends_at > NOW()
  FROM child_profiles
  WHERE id = p_child_id;
$$ LANGUAGE sql STABLE;

-- =============================================================================
-- PART 11: Comments for documentation
-- =============================================================================

COMMENT ON TABLE teen_linked_accounts IS
'Bank accounts linked by teens for transaction import. Limited to 1 in teen mode.';

COMMENT ON TABLE teen_external_income IS
'External income sources for teens (jobs, side gigs). Limited to 2 in teen mode.';

COMMENT ON TABLE teen_envelopes IS
'Full envelope system for teens (6 types). Limited to 6 envelopes in teen mode.';

COMMENT ON TABLE teen_envelope_allocations IS
'Links teen income sources to teen envelopes with allocation amounts.';

COMMENT ON TABLE teen_graduation_requests IS
'Tracks parent-initiated requests for teen mode or full graduation.';

COMMENT ON TABLE graduated_family_links IS
'Maintains family connections after graduation. Teen controls sharing settings.';

COMMENT ON TABLE graduation_promo_codes IS
'6-month free trial promo codes for graduated teens.';

COMMENT ON COLUMN child_profiles.is_teen_mode IS
'Whether teen mode is enabled. Requires date_of_birth to be set.';

COMMENT ON COLUMN child_profiles.auto_graduation_date IS
'Computed 18th birthday. Teen mode ends and graduation required.';

COMMENT ON COLUMN child_profiles.graduation_grace_ends_at IS
'90-day grace period after 18th birthday to complete graduation.';

COMMENT ON COLUMN child_profiles.graduation_status IS
'child = Kids Module, teen_mode = Teen Mode, graduating = In progress, graduated = Own account, expired = Grace period ended';
