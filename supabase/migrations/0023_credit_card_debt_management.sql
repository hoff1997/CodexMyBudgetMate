-- Credit Card Debt Management System
-- Adds comprehensive fields for tracking credit card debt, interest, payment strategies, and payoff goals

-- =====================================================
-- ACCOUNTS TABLE ENHANCEMENTS
-- =====================================================
-- Add credit card specific fields to accounts table

-- Interest and payment tracking
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS apr numeric(5,2) DEFAULT NULL;
COMMENT ON COLUMN accounts.apr IS 'Annual Percentage Rate for credit cards (e.g., 18.99)';

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS credit_limit numeric(14,2) DEFAULT NULL;
COMMENT ON COLUMN accounts.credit_limit IS 'Credit limit for credit card accounts';

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS minimum_payment_amount numeric(12,2) DEFAULT NULL;
COMMENT ON COLUMN accounts.minimum_payment_amount IS 'Fixed minimum payment amount';

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS minimum_payment_percentage numeric(5,2) DEFAULT NULL;
COMMENT ON COLUMN accounts.minimum_payment_percentage IS 'Alternative percentage-based minimum payment (e.g., 2.00 for 2%)';

-- Payment schedule
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS payment_due_day integer DEFAULT NULL CHECK (payment_due_day >= 1 AND payment_due_day <= 31);
COMMENT ON COLUMN accounts.payment_due_day IS 'Day of month when payment is due (1-31)';

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS statement_closing_day integer DEFAULT NULL CHECK (statement_closing_day >= 1 AND statement_closing_day <= 31);
COMMENT ON COLUMN accounts.statement_closing_day IS 'Day of month when statement closes (1-31)';

-- Payment strategy
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS payment_strategy text DEFAULT 'pay_off' CHECK (
  payment_strategy IN ('pay_off', 'minimum_only', 'avalanche', 'snowball', 'custom')
);
COMMENT ON COLUMN accounts.payment_strategy IS 'Debt payment strategy: pay_off (monthly), minimum_only, avalanche (highest APR), snowball (lowest balance), custom';

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS payoff_priority integer DEFAULT NULL;
COMMENT ON COLUMN accounts.payoff_priority IS 'Custom priority order for debt payoff (lower number = higher priority)';

-- Interest tracking
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS last_interest_charge_date date DEFAULT NULL;
COMMENT ON COLUMN accounts.last_interest_charge_date IS 'Date when interest was last applied to this account';

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS last_interest_amount numeric(12,2) DEFAULT NULL;
COMMENT ON COLUMN accounts.last_interest_amount IS 'Amount of last interest charge';

-- Amount due tracking
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS amount_due_next_statement numeric(12,2) DEFAULT NULL;
COMMENT ON COLUMN accounts.amount_due_next_statement IS 'Total amount due on next statement to pay off completely';

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS next_statement_date date DEFAULT NULL;
COMMENT ON COLUMN accounts.next_statement_date IS 'Date of next statement';

-- =====================================================
-- ENVELOPES TABLE ENHANCEMENTS
-- =====================================================
-- Link CC debt envelopes to actual accounts

ALTER TABLE envelopes ADD COLUMN IF NOT EXISTS linked_account_id uuid DEFAULT NULL REFERENCES accounts(id) ON DELETE SET NULL;
COMMENT ON COLUMN envelopes.linked_account_id IS 'Link credit card payment envelope to the actual credit card account';

ALTER TABLE envelopes ADD COLUMN IF NOT EXISTS is_auto_minimum_payment boolean DEFAULT false;
COMMENT ON COLUMN envelopes.is_auto_minimum_payment IS 'Whether the envelope amount is automatically calculated based on minimum payments';

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_envelopes_linked_account ON envelopes(linked_account_id) WHERE linked_account_id IS NOT NULL;

-- =====================================================
-- CREDIT CARD PAYMENT HISTORY TABLE
-- =====================================================
-- Track payment history for analytics and projections

CREATE TABLE IF NOT EXISTS credit_card_payment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

  -- Payment details
  payment_date date NOT NULL,
  payment_amount numeric(12,2) NOT NULL CHECK (payment_amount >= 0),

  -- Balance tracking
  balance_before numeric(14,2) NOT NULL,
  balance_after numeric(14,2) NOT NULL,

  -- Payment breakdown
  principal_paid numeric(12,2) NOT NULL DEFAULT 0 CHECK (principal_paid >= 0),
  interest_paid numeric(12,2) NOT NULL DEFAULT 0 CHECK (interest_paid >= 0),
  fees_paid numeric(12,2) NOT NULL DEFAULT 0 CHECK (fees_paid >= 0),

  -- Metadata
  payment_type text DEFAULT 'manual' CHECK (payment_type IN ('manual', 'automatic', 'minimum', 'extra')),
  notes text,

  -- Transaction link
  transaction_id uuid REFERENCES transactions(id) ON DELETE SET NULL,

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS policies for payment history
ALTER TABLE credit_card_payment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payment history"
  ON credit_card_payment_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own payment history"
  ON credit_card_payment_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payment history"
  ON credit_card_payment_history FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own payment history"
  ON credit_card_payment_history FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cc_payment_history_user ON credit_card_payment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_cc_payment_history_account ON credit_card_payment_history(account_id);
CREATE INDEX IF NOT EXISTS idx_cc_payment_history_date ON credit_card_payment_history(payment_date DESC);

-- =====================================================
-- INTEREST CHARGE TRACKING TABLE
-- =====================================================
-- Track interest charges separately for transparency

CREATE TABLE IF NOT EXISTS credit_card_interest_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

  -- Interest details
  charge_date date NOT NULL,
  interest_amount numeric(12,2) NOT NULL CHECK (interest_amount >= 0),
  daily_rate numeric(10,8) NOT NULL,
  days_in_period integer NOT NULL CHECK (days_in_period > 0),

  -- Balance details
  average_daily_balance numeric(14,2) NOT NULL,
  balance_before numeric(14,2) NOT NULL,
  balance_after numeric(14,2) NOT NULL,

  -- Calculation metadata
  apr_used numeric(5,2) NOT NULL,
  calculation_method text DEFAULT 'average_daily_balance',

  -- Transaction link (if interest is recorded as a transaction)
  transaction_id uuid REFERENCES transactions(id) ON DELETE SET NULL,

  -- Timestamps
  created_at timestamptz DEFAULT now()
);

-- RLS policies for interest charges
ALTER TABLE credit_card_interest_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own interest charges"
  ON credit_card_interest_charges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own interest charges"
  ON credit_card_interest_charges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own interest charges"
  ON credit_card_interest_charges FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cc_interest_user ON credit_card_interest_charges(user_id);
CREATE INDEX IF NOT EXISTS idx_cc_interest_account ON credit_card_interest_charges(account_id);
CREATE INDEX IF NOT EXISTS idx_cc_interest_date ON credit_card_interest_charges(charge_date DESC);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to calculate credit card utilization percentage
CREATE OR REPLACE FUNCTION calculate_credit_utilization(account_id_param uuid)
RETURNS numeric(5,2)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_bal numeric(14,2);
  credit_lim numeric(14,2);
  utilization numeric(5,2);
BEGIN
  SELECT current_balance, credit_limit
  INTO current_bal, credit_lim
  FROM accounts
  WHERE id = account_id_param;

  -- Return NULL if no credit limit set
  IF credit_lim IS NULL OR credit_lim = 0 THEN
    RETURN NULL;
  END IF;

  -- Calculate utilization as percentage (balance / limit * 100)
  utilization := (ABS(current_bal) / credit_lim) * 100;

  -- Cap at 100%
  IF utilization > 100 THEN
    utilization := 100;
  END IF;

  RETURN ROUND(utilization, 2);
END;
$$;

-- Function to calculate minimum payment for a credit card
CREATE OR REPLACE FUNCTION calculate_minimum_payment(account_id_param uuid)
RETURNS numeric(12,2)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_bal numeric(14,2);
  min_payment_amt numeric(12,2);
  min_payment_pct numeric(5,2);
  calculated_payment numeric(12,2);
BEGIN
  SELECT
    ABS(current_balance),
    minimum_payment_amount,
    minimum_payment_percentage
  INTO
    current_bal,
    min_payment_amt,
    min_payment_pct
  FROM accounts
  WHERE id = account_id_param;

  -- If fixed amount is set, use it
  IF min_payment_amt IS NOT NULL AND min_payment_amt > 0 THEN
    calculated_payment := min_payment_amt;

  -- Otherwise use percentage if set
  ELSIF min_payment_pct IS NOT NULL AND min_payment_pct > 0 THEN
    calculated_payment := current_bal * (min_payment_pct / 100);

  -- Default: no minimum payment configured
  ELSE
    RETURN NULL;
  END IF;

  -- Don't charge more than the balance
  IF calculated_payment > current_bal THEN
    calculated_payment := current_bal;
  END IF;

  RETURN ROUND(calculated_payment, 2);
END;
$$;

-- =====================================================
-- UPDATE TRIGGERS
-- =====================================================

-- Update trigger for payment history
CREATE OR REPLACE FUNCTION update_credit_card_payment_history_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_cc_payment_history_updated_at
  BEFORE UPDATE ON credit_card_payment_history
  FOR EACH ROW
  EXECUTE FUNCTION update_credit_card_payment_history_updated_at();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE credit_card_payment_history IS 'Tracks historical payments made to credit card accounts for analytics and payoff projections';
COMMENT ON TABLE credit_card_interest_charges IS 'Tracks interest charges applied to credit card accounts with detailed calculation metadata';
COMMENT ON FUNCTION calculate_credit_utilization(uuid) IS 'Calculates the credit utilization percentage for a credit card account';
COMMENT ON FUNCTION calculate_minimum_payment(uuid) IS 'Calculates the minimum payment due for a credit card account based on configured rules';
