-- Debt Snowball Plan System
-- Tracks debt payoff progression through phases:
-- starter_stash -> debt_payoff -> safety_net -> complete

-- Create debt_snowball_plan table
CREATE TABLE IF NOT EXISTS debt_snowball_plan (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_type TEXT NOT NULL DEFAULT 'balanced',
  phase TEXT NOT NULL DEFAULT 'starter_stash',
  starter_stash_monthly DECIMAL(10,2),
  total_debt_monthly DECIMAL(10,2),
  debts JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Add CC holding lock columns to accounts table
ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS cc_holding_locked BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS cc_holding_unlocked_at TIMESTAMPTZ;

-- Enable RLS on debt_snowball_plan
ALTER TABLE debt_snowball_plan ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only manage their own debt plan
CREATE POLICY "Users can view their own debt plan"
  ON debt_snowball_plan
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own debt plan"
  ON debt_snowball_plan
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own debt plan"
  ON debt_snowball_plan
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own debt plan"
  ON debt_snowball_plan
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_debt_snowball_plan_user_id ON debt_snowball_plan(user_id);

-- Function to check and unlock CC Holding when all debt is paid off
CREATE OR REPLACE FUNCTION check_cc_holding_unlock()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_debt DECIMAL(10,2);
BEGIN
  -- Calculate total CC debt for this user
  -- Credit card balances are stored as negative numbers for debt
  SELECT COALESCE(SUM(ABS(current_balance)), 0) INTO total_debt
  FROM accounts
  WHERE user_id = NEW.user_id
    AND type = 'debt'
    AND current_balance < 0;

  -- If debt is zero or positive (paid off), unlock CC Holding
  IF total_debt = 0 THEN
    UPDATE accounts
    SET cc_holding_locked = false,
        cc_holding_unlocked_at = NOW()
    WHERE user_id = NEW.user_id
      AND is_credit_card_holding = true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists (for re-running migration)
DROP TRIGGER IF EXISTS unlock_cc_holding_trigger ON accounts;

-- Create trigger to auto-unlock CC Holding when debt changes
CREATE TRIGGER unlock_cc_holding_trigger
AFTER UPDATE OF current_balance ON accounts
FOR EACH ROW
WHEN (OLD.type = 'debt' AND NEW.type = 'debt')
EXECUTE FUNCTION check_cc_holding_unlock();

-- Add comment for documentation
COMMENT ON TABLE debt_snowball_plan IS 'Tracks debt payoff progression using snowball method. Phases: starter_stash, debt_payoff, safety_net, complete';
COMMENT ON COLUMN debt_snowball_plan.phase IS 'Current phase: starter_stash (build $1k buffer), debt_payoff (aggressive payments), safety_net (3-month fund), complete (all done)';
COMMENT ON COLUMN debt_snowball_plan.debts IS 'JSONB array of debts: [{card_name, balance, envelope_id, minimum_payment, order, paid_off_at}]';
COMMENT ON COLUMN accounts.cc_holding_locked IS 'Whether CC Holding feature is locked (true until all CC debt is paid off)';
COMMENT ON COLUMN accounts.cc_holding_unlocked_at IS 'Timestamp when CC Holding was unlocked (debt-free milestone)';
