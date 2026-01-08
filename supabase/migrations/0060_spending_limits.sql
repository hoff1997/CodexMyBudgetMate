-- Migration: Spending Limits per Child
-- Description: Add spending limit controls for child accounts

-- Add spending limit columns to child_profiles
ALTER TABLE child_profiles
ADD COLUMN IF NOT EXISTS daily_spending_limit DECIMAL(10,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS weekly_spending_limit DECIMAL(10,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS monthly_spending_limit DECIMAL(10,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS require_approval_above DECIMAL(10,2) DEFAULT NULL;

-- Create spending_transactions table to track child spending
CREATE TABLE IF NOT EXISTS child_spending_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_profile_id UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  parent_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Transaction details
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  category TEXT, -- 'snacks', 'toys', 'games', 'clothes', 'other'
  merchant_name TEXT,

  -- Source account
  from_account_id UUID REFERENCES child_bank_accounts(id) ON DELETE SET NULL,
  from_envelope_type TEXT,

  -- Approval workflow
  requires_approval BOOLEAN DEFAULT false,
  approval_status TEXT CHECK (approval_status IN ('pending', 'approved', 'denied')) DEFAULT 'approved',
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  denial_reason TEXT,

  -- Metadata
  receipt_photo_url TEXT,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE child_spending_transactions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Parents can view child spending"
  ON child_spending_transactions FOR SELECT
  USING (auth.uid() = parent_user_id);

CREATE POLICY "Parents can insert child spending"
  ON child_spending_transactions FOR INSERT
  WITH CHECK (auth.uid() = parent_user_id);

CREATE POLICY "Parents can update child spending"
  ON child_spending_transactions FOR UPDATE
  USING (auth.uid() = parent_user_id);

-- Create indexes
CREATE INDEX idx_child_spending_child ON child_spending_transactions(child_profile_id);
CREATE INDEX idx_child_spending_date ON child_spending_transactions(child_profile_id, created_at DESC);
CREATE INDEX idx_child_spending_pending ON child_spending_transactions(child_profile_id, approval_status)
  WHERE approval_status = 'pending';

-- Create function to check spending limits
CREATE OR REPLACE FUNCTION check_spending_limit(
  p_child_id UUID,
  p_amount DECIMAL(10,2)
)
RETURNS JSONB AS $$
DECLARE
  v_child child_profiles;
  v_daily_spent DECIMAL(10,2);
  v_weekly_spent DECIMAL(10,2);
  v_monthly_spent DECIMAL(10,2);
BEGIN
  -- Get child profile
  SELECT * INTO v_child FROM child_profiles WHERE id = p_child_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Child not found');
  END IF;

  -- Check require_approval_above
  IF v_child.require_approval_above IS NOT NULL AND p_amount > v_child.require_approval_above THEN
    RETURN jsonb_build_object(
      'requires_approval', true,
      'reason', 'Amount exceeds single purchase limit of $' || v_child.require_approval_above
    );
  END IF;

  -- Calculate daily spending
  IF v_child.daily_spending_limit IS NOT NULL THEN
    SELECT COALESCE(SUM(amount), 0) INTO v_daily_spent
    FROM child_spending_transactions
    WHERE child_profile_id = p_child_id
      AND approval_status = 'approved'
      AND created_at >= CURRENT_DATE;

    IF (v_daily_spent + p_amount) > v_child.daily_spending_limit THEN
      RETURN jsonb_build_object(
        'requires_approval', true,
        'reason', 'Would exceed daily limit of $' || v_child.daily_spending_limit ||
                  ' (already spent $' || v_daily_spent || ' today)'
      );
    END IF;
  END IF;

  -- Calculate weekly spending
  IF v_child.weekly_spending_limit IS NOT NULL THEN
    SELECT COALESCE(SUM(amount), 0) INTO v_weekly_spent
    FROM child_spending_transactions
    WHERE child_profile_id = p_child_id
      AND approval_status = 'approved'
      AND created_at >= date_trunc('week', CURRENT_DATE);

    IF (v_weekly_spent + p_amount) > v_child.weekly_spending_limit THEN
      RETURN jsonb_build_object(
        'requires_approval', true,
        'reason', 'Would exceed weekly limit of $' || v_child.weekly_spending_limit ||
                  ' (already spent $' || v_weekly_spent || ' this week)'
      );
    END IF;
  END IF;

  -- Calculate monthly spending
  IF v_child.monthly_spending_limit IS NOT NULL THEN
    SELECT COALESCE(SUM(amount), 0) INTO v_monthly_spent
    FROM child_spending_transactions
    WHERE child_profile_id = p_child_id
      AND approval_status = 'approved'
      AND created_at >= date_trunc('month', CURRENT_DATE);

    IF (v_monthly_spent + p_amount) > v_child.monthly_spending_limit THEN
      RETURN jsonb_build_object(
        'requires_approval', true,
        'reason', 'Would exceed monthly limit of $' || v_child.monthly_spending_limit ||
                  ' (already spent $' || v_monthly_spent || ' this month)'
      );
    END IF;
  END IF;

  -- All limits passed
  RETURN jsonb_build_object(
    'requires_approval', false,
    'daily_remaining', COALESCE(v_child.daily_spending_limit - v_daily_spent - p_amount, NULL),
    'weekly_remaining', COALESCE(v_child.weekly_spending_limit - v_weekly_spent - p_amount, NULL),
    'monthly_remaining', COALESCE(v_child.monthly_spending_limit - v_monthly_spent - p_amount, NULL)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to record spending
CREATE OR REPLACE FUNCTION record_child_spending(
  p_child_id UUID,
  p_amount DECIMAL(10,2),
  p_description TEXT,
  p_category TEXT DEFAULT 'other',
  p_from_envelope_type TEXT DEFAULT 'spend',
  p_force_approval BOOLEAN DEFAULT false
)
RETURNS JSONB AS $$
DECLARE
  v_child child_profiles;
  v_limit_check JSONB;
  v_requires_approval BOOLEAN;
  v_account child_bank_accounts;
  v_transaction_id UUID;
BEGIN
  -- Get child profile
  SELECT * INTO v_child FROM child_profiles WHERE id = p_child_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Child not found');
  END IF;

  -- Get the source account
  SELECT * INTO v_account
  FROM child_bank_accounts
  WHERE child_profile_id = p_child_id
    AND envelope_type = p_from_envelope_type;

  -- Check balance
  IF v_account.current_balance < p_amount THEN
    RETURN jsonb_build_object('error', 'Insufficient balance');
  END IF;

  -- Check spending limits
  v_limit_check := check_spending_limit(p_child_id, p_amount);

  IF v_limit_check->>'error' IS NOT NULL THEN
    RETURN v_limit_check;
  END IF;

  v_requires_approval := (v_limit_check->>'requires_approval')::BOOLEAN OR p_force_approval;

  -- Create the transaction
  INSERT INTO child_spending_transactions (
    child_profile_id,
    parent_user_id,
    amount,
    description,
    category,
    from_account_id,
    from_envelope_type,
    requires_approval,
    approval_status
  ) VALUES (
    p_child_id,
    v_child.parent_user_id,
    p_amount,
    p_description,
    p_category,
    v_account.id,
    p_from_envelope_type,
    v_requires_approval,
    CASE WHEN v_requires_approval THEN 'pending' ELSE 'approved' END
  )
  RETURNING id INTO v_transaction_id;

  -- If approved immediately, deduct from balance
  IF NOT v_requires_approval THEN
    UPDATE child_bank_accounts
    SET current_balance = current_balance - p_amount,
        updated_at = NOW()
    WHERE id = v_account.id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'requires_approval', v_requires_approval,
    'approval_reason', v_limit_check->>'reason'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON COLUMN child_profiles.daily_spending_limit IS 'Maximum amount child can spend per day without approval';
COMMENT ON COLUMN child_profiles.weekly_spending_limit IS 'Maximum amount child can spend per week without approval';
COMMENT ON COLUMN child_profiles.monthly_spending_limit IS 'Maximum amount child can spend per month without approval';
COMMENT ON COLUMN child_profiles.require_approval_above IS 'Require approval for any single purchase above this amount';
COMMENT ON TABLE child_spending_transactions IS 'Record of all spending transactions by children';
