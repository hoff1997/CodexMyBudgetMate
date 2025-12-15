-- Credit Card Onboarding & Dashboard System
-- Comprehensive credit card configuration for onboarding with billing cycle tracking,
-- payment reconciliation, debt progress, and multi-card optimization support

-- =====================================================
-- ACCOUNTS TABLE - ADDITIONAL CC ONBOARDING FIELDS
-- =====================================================

-- Usage type for credit card (from onboarding)
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS cc_usage_type text
  CHECK (cc_usage_type IN ('pay_in_full', 'paying_down', 'minimum_only'));
COMMENT ON COLUMN accounts.cc_usage_type IS 'How the user uses this credit card: pay_in_full (Option A), paying_down (Option B), minimum_only (Option C)';

-- Whether user is still actively using the card
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS cc_still_using boolean DEFAULT true;
COMMENT ON COLUMN accounts.cc_still_using IS 'True if user is still using card for new purchases (hybrid mode), false if card is frozen (paydown only)';

-- Starting debt snapshot for progress tracking
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS cc_starting_debt_amount numeric(14,2);
COMMENT ON COLUMN accounts.cc_starting_debt_amount IS 'Debt amount at time of onboarding, for progress tracking';

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS cc_starting_debt_date date;
COMMENT ON COLUMN accounts.cc_starting_debt_date IS 'Date when starting debt was recorded';

-- Expected monthly spending (for pay-in-full users)
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS cc_expected_monthly_spending numeric(12,2);
COMMENT ON COLUMN accounts.cc_expected_monthly_spending IS 'Expected monthly spending on card for pay-in-full users';

-- Current outstanding (seeded into holding)
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS cc_current_outstanding numeric(14,2);
COMMENT ON COLUMN accounts.cc_current_outstanding IS 'Current outstanding amount that needs to be covered by holding (for pay-in-full users)';

-- Total interest paid (running total for progress tracking)
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS cc_total_interest_paid numeric(14,2) DEFAULT 0;
COMMENT ON COLUMN accounts.cc_total_interest_paid IS 'Running total of interest paid on this card since onboarding';

-- Payment reconciliation preference
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS cc_payment_split_preference text
  CHECK (cc_payment_split_preference IN ('ask_every_time', 'auto_split', 'all_to_debt'));
COMMENT ON COLUMN accounts.cc_payment_split_preference IS 'User preference for how to handle CC payments: ask each time, auto-split, or all to debt';

-- =====================================================
-- TRANSACTIONS TABLE - CARD IDENTIFIER TRACKING
-- =====================================================

-- Card identifier from import (e.g., last 4 digits, card network)
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS card_identifier text;
COMMENT ON COLUMN transactions.card_identifier IS 'Card identifier from import data (e.g., VISA *1234) for traceability';

-- Flag for credit card payment transactions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_cc_payment boolean DEFAULT false;
COMMENT ON COLUMN transactions.is_cc_payment IS 'True if this transaction is a payment TO a credit card';

-- Link to reconciliation record if payment was split
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS cc_payment_reconciliation_id uuid;
COMMENT ON COLUMN transactions.cc_payment_reconciliation_id IS 'Links to credit_card_payment_reconciliations if this payment was split';

-- =====================================================
-- PER-CYCLE HOLDING TRACKING TABLE
-- =====================================================
-- Tracks CC Holding balance per billing cycle for "This Statement" vs "Next Statement" display

CREATE TABLE IF NOT EXISTS credit_card_cycle_holdings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

  -- Billing cycle identifier (e.g., '2025-01' for January 2025 statement)
  billing_cycle text NOT NULL,

  -- Statement dates for this cycle
  statement_close_date date NOT NULL,
  payment_due_date date NOT NULL,

  -- Amounts tracked for this cycle
  spending_amount numeric(14,2) NOT NULL DEFAULT 0,
  covered_amount numeric(14,2) NOT NULL DEFAULT 0,

  -- Interest for this cycle
  interest_amount numeric(14,2) NOT NULL DEFAULT 0,

  -- Status
  is_current_cycle boolean DEFAULT false,
  is_closed boolean DEFAULT false,
  closed_at timestamptz,

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Unique constraint: one record per account per cycle
  UNIQUE(account_id, billing_cycle)
);

-- RLS policies
ALTER TABLE credit_card_cycle_holdings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own cycle holdings"
  ON credit_card_cycle_holdings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cycle holdings"
  ON credit_card_cycle_holdings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cycle holdings"
  ON credit_card_cycle_holdings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cycle holdings"
  ON credit_card_cycle_holdings FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cc_cycle_holdings_user ON credit_card_cycle_holdings(user_id);
CREATE INDEX IF NOT EXISTS idx_cc_cycle_holdings_account ON credit_card_cycle_holdings(account_id);
CREATE INDEX IF NOT EXISTS idx_cc_cycle_holdings_cycle ON credit_card_cycle_holdings(billing_cycle);
CREATE INDEX IF NOT EXISTS idx_cc_cycle_holdings_current ON credit_card_cycle_holdings(is_current_cycle) WHERE is_current_cycle = true;

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_credit_card_cycle_holdings_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_cc_cycle_holdings_updated_at
  BEFORE UPDATE ON credit_card_cycle_holdings
  FOR EACH ROW
  EXECUTE FUNCTION update_credit_card_cycle_holdings_updated_at();

-- =====================================================
-- PAYMENT RECONCILIATION TABLE
-- =====================================================
-- Records how credit card payments were split between holding, debt, and interest

CREATE TABLE IF NOT EXISTS credit_card_payment_reconciliations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  transaction_id uuid NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,

  -- Payment details
  total_payment_amount numeric(14,2) NOT NULL,
  payment_date date NOT NULL,

  -- Split amounts
  amount_to_holding numeric(14,2) NOT NULL DEFAULT 0,
  amount_to_debt numeric(14,2) NOT NULL DEFAULT 0,
  amount_to_interest numeric(14,2) NOT NULL DEFAULT 0,

  -- Billing cycle this payment applies to
  billing_cycle text,

  -- How reconciliation was done
  reconciliation_method text NOT NULL CHECK (reconciliation_method IN ('auto_split', 'user_split', 'all_to_debt', 'all_to_holding')),

  -- Timestamps
  created_at timestamptz DEFAULT now()
);

-- RLS policies
ALTER TABLE credit_card_payment_reconciliations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reconciliations"
  ON credit_card_payment_reconciliations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reconciliations"
  ON credit_card_payment_reconciliations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reconciliations"
  ON credit_card_payment_reconciliations FOR UPDATE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cc_reconciliations_user ON credit_card_payment_reconciliations(user_id);
CREATE INDEX IF NOT EXISTS idx_cc_reconciliations_account ON credit_card_payment_reconciliations(account_id);
CREATE INDEX IF NOT EXISTS idx_cc_reconciliations_transaction ON credit_card_payment_reconciliations(transaction_id);

-- =====================================================
-- DEBT PAYOFF PROJECTIONS TABLE
-- =====================================================
-- Stores calculated payoff projections for credit cards

CREATE TABLE IF NOT EXISTS credit_card_payoff_projections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

  -- Projection parameters
  monthly_payment_amount numeric(14,2) NOT NULL,
  apr_used numeric(5,2) NOT NULL,
  starting_balance numeric(14,2) NOT NULL,

  -- Projection results
  projected_payoff_date date NOT NULL,
  total_interest_projected numeric(14,2) NOT NULL,
  total_payments_projected numeric(14,2) NOT NULL,
  months_to_payoff integer NOT NULL,

  -- Projection type
  projection_type text NOT NULL CHECK (projection_type IN ('minimum_only', 'current_payment', 'custom')),

  -- When calculated
  calculated_at timestamptz DEFAULT now(),

  -- Unique per account per projection type (keeps latest only)
  UNIQUE(account_id, projection_type)
);

-- RLS policies
ALTER TABLE credit_card_payoff_projections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own projections"
  ON credit_card_payoff_projections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own projections"
  ON credit_card_payoff_projections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projections"
  ON credit_card_payoff_projections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projections"
  ON credit_card_payoff_projections FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cc_projections_user ON credit_card_payoff_projections(user_id);
CREATE INDEX IF NOT EXISTS idx_cc_projections_account ON credit_card_payoff_projections(account_id);

-- =====================================================
-- ENVELOPES TABLE - CC HOLDING LINK
-- =====================================================

-- Link CC Holding envelope to specific credit card account
ALTER TABLE envelopes ADD COLUMN IF NOT EXISTS cc_account_id uuid REFERENCES accounts(id) ON DELETE SET NULL;
COMMENT ON COLUMN envelopes.cc_account_id IS 'Links CC Holding envelope to specific credit card account';

-- Flag for CC Holding envelopes (distinct from is_credit_card_payment)
ALTER TABLE envelopes ADD COLUMN IF NOT EXISTS is_cc_holding boolean DEFAULT false;
COMMENT ON COLUMN envelopes.is_cc_holding IS 'True if this envelope is a Credit Card Holding envelope for tracking spending coverage';

-- Index for CC holding envelopes
CREATE INDEX IF NOT EXISTS idx_envelopes_cc_holding ON envelopes(is_cc_holding) WHERE is_cc_holding = true;
CREATE INDEX IF NOT EXISTS idx_envelopes_cc_account ON envelopes(cc_account_id) WHERE cc_account_id IS NOT NULL;

-- =====================================================
-- UPDATE ALLOCATIONS TABLE - ADD CYCLE TRACKING
-- =====================================================

ALTER TABLE credit_card_allocations ADD COLUMN IF NOT EXISTS billing_cycle text;
COMMENT ON COLUMN credit_card_allocations.billing_cycle IS 'Billing cycle this allocation belongs to (e.g., 2025-01)';

-- Index for cycle lookups
CREATE INDEX IF NOT EXISTS idx_cc_allocations_billing_cycle ON credit_card_allocations(billing_cycle) WHERE billing_cycle IS NOT NULL;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to calculate payoff projection
-- Returns: months to payoff, total interest, total payments, payoff date
CREATE OR REPLACE FUNCTION calculate_payoff_projection(
  p_balance numeric,
  p_apr numeric,
  p_monthly_payment numeric
)
RETURNS TABLE (
  months_to_payoff integer,
  total_interest numeric,
  total_payments numeric,
  payoff_date date
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_balance numeric := p_balance;
  v_monthly_rate numeric := p_apr / 100 / 12;
  v_months integer := 0;
  v_total_interest numeric := 0;
  v_interest numeric;
  v_original_balance numeric := p_balance;
BEGIN
  -- Handle edge cases
  IF p_balance <= 0 THEN
    RETURN QUERY SELECT 0, 0::numeric, 0::numeric, CURRENT_DATE;
    RETURN;
  END IF;

  IF p_monthly_payment <= 0 THEN
    RETURN QUERY SELECT 9999, 0::numeric, 0::numeric, NULL::date;
    RETURN;
  END IF;

  -- Calculate payoff month by month
  WHILE v_balance > 0 AND v_months < 600 LOOP -- Max 50 years
    v_interest := v_balance * v_monthly_rate;
    v_total_interest := v_total_interest + v_interest;
    v_balance := v_balance + v_interest - p_monthly_payment;
    v_months := v_months + 1;

    -- Check if payment doesn't cover interest (infinite loop prevention)
    IF v_interest >= p_monthly_payment AND v_months > 1 THEN
      RETURN QUERY SELECT 9999, 0::numeric, 0::numeric, NULL::date;
      RETURN;
    END IF;
  END LOOP;

  -- Handle case where final payment is less than full monthly payment
  IF v_balance < 0 THEN
    v_balance := 0;
  END IF;

  RETURN QUERY SELECT
    v_months,
    ROUND(v_total_interest, 2),
    ROUND(v_original_balance + v_total_interest, 2),
    (CURRENT_DATE + (v_months || ' months')::interval)::date;
END;
$$;

COMMENT ON FUNCTION calculate_payoff_projection IS 'Calculates debt payoff projection given balance, APR, and monthly payment. Returns months to payoff, total interest, total payments, and projected payoff date.';

-- Function to get current billing cycle for a credit card
CREATE OR REPLACE FUNCTION get_current_billing_cycle(
  p_statement_close_day integer
)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_today date := CURRENT_DATE;
  v_current_day integer := EXTRACT(DAY FROM v_today);
  v_year integer;
  v_month integer;
BEGIN
  -- If we're past the statement close day, we're in next month's cycle
  IF v_current_day > p_statement_close_day THEN
    v_year := EXTRACT(YEAR FROM (v_today + INTERVAL '1 month'));
    v_month := EXTRACT(MONTH FROM (v_today + INTERVAL '1 month'));
  ELSE
    v_year := EXTRACT(YEAR FROM v_today);
    v_month := EXTRACT(MONTH FROM v_today);
  END IF;

  RETURN v_year || '-' || LPAD(v_month::text, 2, '0');
END;
$$;

COMMENT ON FUNCTION get_current_billing_cycle IS 'Returns the current billing cycle identifier (YYYY-MM) based on statement close day';

-- Function to calculate cycle dates from billing cycle string
CREATE OR REPLACE FUNCTION calculate_cycle_dates(
  p_billing_cycle text,
  p_statement_close_day integer,
  p_payment_due_day integer
)
RETURNS TABLE (
  statement_close_date date,
  payment_due_date date
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_year integer;
  v_month integer;
  v_close_date date;
  v_due_date date;
BEGIN
  -- Parse billing cycle (YYYY-MM)
  v_year := SPLIT_PART(p_billing_cycle, '-', 1)::integer;
  v_month := SPLIT_PART(p_billing_cycle, '-', 2)::integer;

  -- Statement closes in the previous month (the cycle is named after when it's DUE)
  v_close_date := make_date(
    CASE WHEN v_month = 1 THEN v_year - 1 ELSE v_year END,
    CASE WHEN v_month = 1 THEN 12 ELSE v_month - 1 END,
    LEAST(p_statement_close_day,
      EXTRACT(DAY FROM (make_date(
        CASE WHEN v_month = 1 THEN v_year - 1 ELSE v_year END,
        CASE WHEN v_month = 1 THEN 12 ELSE v_month - 1 END,
        1
      ) + INTERVAL '1 month - 1 day')::date)::integer
    )
  );

  -- Payment due in the cycle month
  v_due_date := make_date(
    v_year,
    v_month,
    LEAST(p_payment_due_day,
      EXTRACT(DAY FROM (make_date(v_year, v_month, 1) + INTERVAL '1 month - 1 day')::date)::integer
    )
  );

  RETURN QUERY SELECT v_close_date, v_due_date;
END;
$$;

COMMENT ON FUNCTION calculate_cycle_dates IS 'Calculates statement close date and payment due date for a given billing cycle';

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE credit_card_cycle_holdings IS 'Tracks credit card spending and coverage per billing cycle for "This Statement" vs "Next Statement" display';
COMMENT ON TABLE credit_card_payment_reconciliations IS 'Records how credit card payments were split between covering new spending (holding), paying down debt, and covering interest';
COMMENT ON TABLE credit_card_payoff_projections IS 'Stores calculated payoff projections for credit cards based on different payment scenarios';
