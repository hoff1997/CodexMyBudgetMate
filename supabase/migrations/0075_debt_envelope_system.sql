-- Debt Envelope System
-- Tracks individual debts within a single "Debt" envelope
-- Implements debt snowball methodology (smallest balance first)

-- ============================================
-- 1. Add is_debt flag to envelopes table
-- ============================================
ALTER TABLE envelopes ADD COLUMN IF NOT EXISTS is_debt BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN envelopes.is_debt IS 'True for debt envelopes that track multiple debt items (credit cards, loans, etc.)';

-- ============================================
-- 2. Create debt_items table
-- ============================================
CREATE TABLE IF NOT EXISTS debt_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  envelope_id UUID NOT NULL REFERENCES envelopes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,  -- Creditor name (e.g., "ANZ Visa", "Car Loan", "Afterpay")
  debt_type TEXT NOT NULL DEFAULT 'other' CHECK (debt_type IN ('credit_card', 'personal_loan', 'car_loan', 'student_loan', 'afterpay', 'hp', 'other')),
  linked_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,  -- For CC auto-sync
  starting_balance NUMERIC(12, 2) NOT NULL DEFAULT 0,  -- Original debt amount
  current_balance NUMERIC(12, 2) NOT NULL DEFAULT 0,   -- Current remaining balance
  interest_rate NUMERIC(5, 2),  -- APR as percentage (e.g., 19.99)
  minimum_payment NUMERIC(10, 2),  -- Minimum monthly payment
  display_order INTEGER DEFAULT 0,  -- For manual ordering (snowball auto-sorts by balance)
  paid_off_at TIMESTAMPTZ,  -- Set when balance reaches 0 - triggers celebration
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint: one debt per name per envelope
  UNIQUE(envelope_id, name)
);

-- ============================================
-- 3. Add indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_debt_items_user_id ON debt_items(user_id);
CREATE INDEX IF NOT EXISTS idx_debt_items_envelope_id ON debt_items(envelope_id);
CREATE INDEX IF NOT EXISTS idx_debt_items_linked_account ON debt_items(linked_account_id);
CREATE INDEX IF NOT EXISTS idx_debt_items_current_balance ON debt_items(current_balance);  -- For snowball ordering

-- ============================================
-- 4. Enable Row Level Security
-- ============================================
ALTER TABLE debt_items ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. RLS Policies (following gift_recipients pattern)
-- ============================================

-- Users can view their own debt items
CREATE POLICY "Users can view their own debt items"
  ON debt_items
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own debt items
CREATE POLICY "Users can insert their own debt items"
  ON debt_items
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own debt items
CREATE POLICY "Users can update their own debt items"
  ON debt_items
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own debt items
CREATE POLICY "Users can delete their own debt items"
  ON debt_items
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 6. Trigger to update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_debt_items_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS debt_items_updated_at ON debt_items;
CREATE TRIGGER debt_items_updated_at
  BEFORE UPDATE ON debt_items
  FOR EACH ROW
  EXECUTE FUNCTION update_debt_items_updated_at();

-- ============================================
-- 7. Trigger to auto-set paid_off_at when balance reaches 0
-- ============================================
CREATE OR REPLACE FUNCTION check_debt_paid_off()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If balance was > 0 and is now <= 0, mark as paid off
  IF OLD.current_balance > 0 AND NEW.current_balance <= 0 AND NEW.paid_off_at IS NULL THEN
    NEW.paid_off_at = NOW();
  END IF;

  -- If balance goes back above 0, clear paid_off_at
  IF NEW.current_balance > 0 AND NEW.paid_off_at IS NOT NULL THEN
    NEW.paid_off_at = NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS debt_items_paid_off_check ON debt_items;
CREATE TRIGGER debt_items_paid_off_check
  BEFORE UPDATE ON debt_items
  FOR EACH ROW
  EXECUTE FUNCTION check_debt_paid_off();

-- ============================================
-- 8. Trigger to sync CC balance to debt_items
-- When accounts.current_balance changes for linked accounts,
-- update the corresponding debt_item.current_balance
-- ============================================
CREATE OR REPLACE FUNCTION sync_cc_balance_to_debt_item()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only sync if balance actually changed
  IF OLD.current_balance IS DISTINCT FROM NEW.current_balance THEN
    -- Update any debt_items linked to this account
    -- Credit card balances are negative in accounts table, so we take absolute value
    UPDATE debt_items
    SET current_balance = ABS(NEW.current_balance)
    WHERE linked_account_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_cc_to_debt_item_trigger ON accounts;
CREATE TRIGGER sync_cc_to_debt_item_trigger
  AFTER UPDATE OF current_balance ON accounts
  FOR EACH ROW
  EXECUTE FUNCTION sync_cc_balance_to_debt_item();

-- ============================================
-- 9. Comments for documentation
-- ============================================
COMMENT ON TABLE debt_items IS 'Individual debts tracked within a debt envelope. Ordered by current_balance (smallest first) for debt snowball methodology.';
COMMENT ON COLUMN debt_items.debt_type IS 'Type of debt: credit_card, personal_loan, car_loan, student_loan, afterpay, hp, other';
COMMENT ON COLUMN debt_items.linked_account_id IS 'Links to accounts table for auto-sync of credit card balances from Akahu';
COMMENT ON COLUMN debt_items.starting_balance IS 'Original debt amount when first added - used for progress tracking';
COMMENT ON COLUMN debt_items.current_balance IS 'Current remaining balance - auto-synced for linked CCs, manually updated for others';
COMMENT ON COLUMN debt_items.paid_off_at IS 'Timestamp when debt was fully paid off - triggers celebration milestone';
COMMENT ON COLUMN debt_items.display_order IS 'Manual ordering preference. Default snowball view sorts by current_balance ASC';
