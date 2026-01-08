-- Migration: Credit Card Configuration Table
-- Date: January 2026
-- Description: Creates credit_card_configs table for tracking CC settings

-- Credit Card Configuration Table
CREATE TABLE IF NOT EXISTS credit_card_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  usage_type TEXT NOT NULL CHECK (usage_type IN ('pay_in_full', 'paying_down', 'minimum_only')),
  statement_close_day INTEGER CHECK (statement_close_day >= 1 AND statement_close_day <= 31),
  payment_due_day INTEGER CHECK (payment_due_day >= 1 AND payment_due_day <= 31),
  apr NUMERIC(5, 2),
  minimum_payment NUMERIC(10, 2),
  still_using BOOLEAN DEFAULT true,
  starting_debt_amount NUMERIC(10, 2),
  starting_debt_date TIMESTAMPTZ,
  expected_monthly_spending NUMERIC(10, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(account_id)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_credit_card_configs_user_id ON credit_card_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_card_configs_account_id ON credit_card_configs(account_id);

-- RLS Policies
ALTER TABLE credit_card_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credit card configs"
  ON credit_card_configs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credit card configs"
  ON credit_card_configs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own credit card configs"
  ON credit_card_configs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own credit card configs"
  ON credit_card_configs FOR DELETE
  USING (auth.uid() = user_id);
