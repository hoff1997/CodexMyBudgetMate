-- Migration: Teen Savings Goals System
-- Date: January 2026
-- Description: Creates tables for teen savings goals with interest allocation
-- This enables teens to have virtual "pots" within one real savings account

-- =============================================================================
-- STEP 1: Teen Savings Goals Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS teen_savings_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_profile_id UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  child_bank_account_id UUID NOT NULL REFERENCES child_bank_accounts(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,
  target_amount NUMERIC(10,2),
  current_amount NUMERIC(10,2) DEFAULT 0,
  allocation_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,

  icon TEXT DEFAULT '🎯',
  color TEXT DEFAULT 'sage',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT allocation_range CHECK (allocation_percentage >= 0 AND allocation_percentage <= 100),
  CONSTRAINT positive_amounts CHECK (current_amount >= 0 AND (target_amount IS NULL OR target_amount >= 0)),
  UNIQUE(child_profile_id, name)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_teen_goals_child ON teen_savings_goals(child_profile_id);
CREATE INDEX IF NOT EXISTS idx_teen_goals_account ON teen_savings_goals(child_bank_account_id);
CREATE INDEX IF NOT EXISTS idx_teen_goals_active ON teen_savings_goals(child_profile_id, is_active) WHERE is_active = true;

-- =============================================================================
-- STEP 2: Interest Allocation Ledger
-- =============================================================================

CREATE TABLE IF NOT EXISTS teen_goal_interest_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES teen_savings_goals(id) ON DELETE CASCADE,
  child_profile_id UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,

  interest_amount NUMERIC(10,2) NOT NULL,
  allocation_percentage NUMERIC(5,2) NOT NULL,
  bank_balance_at_time NUMERIC(10,2),

  allocated_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT interest_positive CHECK (interest_amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_interest_ledger_goal ON teen_goal_interest_ledger(goal_id);
CREATE INDEX IF NOT EXISTS idx_interest_ledger_child ON teen_goal_interest_ledger(child_profile_id);
CREATE INDEX IF NOT EXISTS idx_interest_ledger_date ON teen_goal_interest_ledger(allocated_date);

-- =============================================================================
-- STEP 3: Goal-to-Goal Transfers
-- =============================================================================

CREATE TABLE IF NOT EXISTS teen_goal_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_profile_id UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  from_goal_id UUID NOT NULL REFERENCES teen_savings_goals(id) ON DELETE CASCADE,
  to_goal_id UUID NOT NULL REFERENCES teen_savings_goals(id) ON DELETE CASCADE,

  amount NUMERIC(10,2) NOT NULL,
  notes TEXT,

  transferred_by_type TEXT CHECK (transferred_by_type IN ('parent', 'child')) DEFAULT 'child',
  transferred_by_id UUID,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT different_goals CHECK (from_goal_id != to_goal_id),
  CONSTRAINT positive_transfer CHECK (amount > 0)
);

CREATE INDEX IF NOT EXISTS idx_transfers_child ON teen_goal_transfers(child_profile_id);
CREATE INDEX IF NOT EXISTS idx_transfers_from ON teen_goal_transfers(from_goal_id);
CREATE INDEX IF NOT EXISTS idx_transfers_to ON teen_goal_transfers(to_goal_id);

-- =============================================================================
-- STEP 4: RLS Policies for Teen Savings Goals
-- =============================================================================

ALTER TABLE teen_savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE teen_goal_interest_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE teen_goal_transfers ENABLE ROW LEVEL SECURITY;

-- Parents can manage their children's goals
CREATE POLICY "Parents can view children's goals"
  ON teen_savings_goals FOR SELECT
  USING (
    child_profile_id IN (
      SELECT id FROM child_profiles WHERE parent_user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can create children's goals"
  ON teen_savings_goals FOR INSERT
  WITH CHECK (
    child_profile_id IN (
      SELECT id FROM child_profiles WHERE parent_user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can update children's goals"
  ON teen_savings_goals FOR UPDATE
  USING (
    child_profile_id IN (
      SELECT id FROM child_profiles WHERE parent_user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can delete children's goals"
  ON teen_savings_goals FOR DELETE
  USING (
    child_profile_id IN (
      SELECT id FROM child_profiles WHERE parent_user_id = auth.uid()
    )
  );

-- Interest ledger policies
CREATE POLICY "Parents can view interest ledger"
  ON teen_goal_interest_ledger FOR SELECT
  USING (
    child_profile_id IN (
      SELECT id FROM child_profiles WHERE parent_user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can insert interest allocations"
  ON teen_goal_interest_ledger FOR INSERT
  WITH CHECK (
    child_profile_id IN (
      SELECT id FROM child_profiles WHERE parent_user_id = auth.uid()
    )
  );

-- Transfer policies
CREATE POLICY "Parents can view transfers"
  ON teen_goal_transfers FOR SELECT
  USING (
    child_profile_id IN (
      SELECT id FROM child_profiles WHERE parent_user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can create transfers"
  ON teen_goal_transfers FOR INSERT
  WITH CHECK (
    child_profile_id IN (
      SELECT id FROM child_profiles WHERE parent_user_id = auth.uid()
    )
  );

-- =============================================================================
-- STEP 5: Helper Functions
-- =============================================================================

-- Function to validate total allocation doesn't exceed 100%
CREATE OR REPLACE FUNCTION validate_goal_allocation()
RETURNS TRIGGER AS $$
DECLARE
  total_allocation NUMERIC(5,2);
BEGIN
  SELECT COALESCE(SUM(allocation_percentage), 0)
  INTO total_allocation
  FROM teen_savings_goals
  WHERE child_profile_id = NEW.child_profile_id
    AND child_bank_account_id = NEW.child_bank_account_id
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND is_active = true;

  IF total_allocation + NEW.allocation_percentage > 100 THEN
    RAISE EXCEPTION 'Total allocation cannot exceed 100%%. Current: %%%, New: %%%',
      total_allocation, NEW.allocation_percentage;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER check_goal_allocation
  BEFORE INSERT OR UPDATE ON teen_savings_goals
  FOR EACH ROW
  WHEN (NEW.is_active = true)
  EXECUTE FUNCTION validate_goal_allocation();

-- Function to update goal balances after transfer
CREATE OR REPLACE FUNCTION process_goal_transfer()
RETURNS TRIGGER AS $$
BEGIN
  -- Deduct from source goal
  UPDATE teen_savings_goals
  SET current_amount = current_amount - NEW.amount,
      updated_at = NOW()
  WHERE id = NEW.from_goal_id;

  -- Add to destination goal
  UPDATE teen_savings_goals
  SET current_amount = current_amount + NEW.amount,
      updated_at = NOW()
  WHERE id = NEW.to_goal_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER after_goal_transfer
  AFTER INSERT ON teen_goal_transfers
  FOR EACH ROW
  EXECUTE FUNCTION process_goal_transfer();

-- Function to distribute interest to goals
CREATE OR REPLACE FUNCTION distribute_interest_to_goals(
  p_child_profile_id UUID,
  p_bank_account_id UUID,
  p_interest_amount NUMERIC(10,2),
  p_allocation_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  goal_id UUID,
  goal_name TEXT,
  interest_allocated NUMERIC(10,2),
  allocation_percentage NUMERIC(5,2)
) AS $$
DECLARE
  goal_record RECORD;
  allocated_amount NUMERIC(10,2);
BEGIN
  -- Loop through active goals and allocate interest proportionally
  FOR goal_record IN
    SELECT id, name, allocation_percentage as pct
    FROM teen_savings_goals
    WHERE child_profile_id = p_child_profile_id
      AND child_bank_account_id = p_bank_account_id
      AND is_active = true
      AND allocation_percentage > 0
    ORDER BY sort_order
  LOOP
    allocated_amount := ROUND((goal_record.pct / 100.0) * p_interest_amount, 2);

    -- Insert ledger entry
    INSERT INTO teen_goal_interest_ledger (
      goal_id, child_profile_id, interest_amount, allocation_percentage, allocated_date
    ) VALUES (
      goal_record.id, p_child_profile_id, allocated_amount, goal_record.pct, p_allocation_date
    );

    -- Update goal balance
    UPDATE teen_savings_goals
    SET current_amount = current_amount + allocated_amount,
        updated_at = NOW()
    WHERE id = goal_record.id;

    -- Return result row
    goal_id := goal_record.id;
    goal_name := goal_record.name;
    interest_allocated := allocated_amount;
    allocation_percentage := goal_record.pct;
    RETURN NEXT;
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- STEP 6: Verification
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teen_savings_goals') THEN
    RAISE NOTICE 'Teen savings goals system created successfully';
  END IF;
END $$;
