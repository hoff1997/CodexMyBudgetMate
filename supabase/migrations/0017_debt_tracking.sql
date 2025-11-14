-- Migration: Add Debt Tracking to Goals
-- Description: Adds interest rate field to support debt payoff goals
-- Note: This migration depends on 0016_envelope_goals.sql being applied first

-- Add interest rate field for debt payoff goals
ALTER TABLE public.envelopes
ADD COLUMN IF NOT EXISTS interest_rate numeric(5,2) DEFAULT NULL;

-- Add index for debt payoff goals (only if goal_type column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'envelopes'
    AND column_name = 'goal_type'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_envelopes_debt_payoff
      ON public.envelopes(goal_type)
      WHERE goal_type = 'debt_payoff';
  END IF;
END $$;

-- Add comment
COMMENT ON COLUMN public.envelopes.interest_rate IS
  'Annual interest rate (APR) for debt payoff goals. Used to calculate interest and optimize payment strategies.';
