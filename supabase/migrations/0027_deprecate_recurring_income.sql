-- Migration: Deprecate recurring_income Table and Add Income Reconciliation
-- Description:
-- 1. Add last_reconciled_date to income_sources for tracking reconciliation
-- 2. Add reconciled_transaction_id to track which transaction triggered reconciliation
-- 3. Create income_reconciliation_events table for audit trail
-- 4. Mark recurring_income and recurring_income_events as deprecated (soft deprecation)

-- =====================================================
-- 1. Add reconciliation tracking columns to income_sources
-- =====================================================
ALTER TABLE public.income_sources
ADD COLUMN IF NOT EXISTS last_reconciled_date DATE DEFAULT NULL;

ALTER TABLE public.income_sources
ADD COLUMN IF NOT EXISTS last_reconciled_transaction_id UUID DEFAULT NULL;

COMMENT ON COLUMN public.income_sources.last_reconciled_date IS
  'Date when income was last reconciled (transaction matched and processed)';

COMMENT ON COLUMN public.income_sources.last_reconciled_transaction_id IS
  'Transaction ID that was matched in the last reconciliation';

-- =====================================================
-- 2. Create income_reconciliation_events table (audit trail)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.income_reconciliation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  income_source_id UUID NOT NULL REFERENCES public.income_sources(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL,

  -- Expected vs Actual
  expected_amount NUMERIC(12, 2),
  actual_amount NUMERIC(12, 2) NOT NULL,
  amount_variance NUMERIC(12, 2) GENERATED ALWAYS AS (actual_amount - expected_amount) STORED,

  -- Date tracking
  expected_date DATE,
  actual_date DATE NOT NULL,
  date_variance_days INTEGER GENERATED ALWAYS AS (actual_date - expected_date) STORED,

  -- Pay cycle advancement
  previous_next_pay_date DATE,
  new_next_pay_date DATE,

  -- Allocation results
  allocations_created INTEGER DEFAULT 0,
  total_allocated NUMERIC(12, 2) DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT fk_transaction FOREIGN KEY (transaction_id)
    REFERENCES public.transactions(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.income_reconciliation_events ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own events
CREATE POLICY "Users can view own income reconciliation events"
  ON public.income_reconciliation_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own income reconciliation events"
  ON public.income_reconciliation_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_income_reconciliation_events_user
  ON public.income_reconciliation_events(user_id, income_source_id);

CREATE INDEX IF NOT EXISTS idx_income_reconciliation_events_created
  ON public.income_reconciliation_events(created_at DESC);

-- =====================================================
-- 3. Add deprecation comments to recurring_income tables (if they exist)
-- =====================================================
-- Note: These tables may not exist in all environments.
-- Using DO block to safely add comments only if tables exist.
DO $$
BEGIN
  -- Add deprecation comment to recurring_income if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'recurring_income'
  ) THEN
    COMMENT ON TABLE public.recurring_income IS
      'DEPRECATED: Use income_sources and envelope_income_allocations instead. This table will be removed in a future migration.';
  END IF;

  -- Add deprecation comment to recurring_income_events if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'recurring_income_events'
  ) THEN
    COMMENT ON TABLE public.recurring_income_events IS
      'DEPRECATED: Use income_reconciliation_events instead. This table will be removed in a future migration.';
  END IF;
END $$;

-- =====================================================
-- 4. Function to calculate next pay date based on pay_cycle
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_next_pay_date(
  current_date_param DATE,
  pay_cycle TEXT
) RETURNS DATE AS $$
BEGIN
  CASE pay_cycle
    WHEN 'weekly' THEN
      RETURN current_date_param + INTERVAL '7 days';
    WHEN 'fortnightly' THEN
      RETURN current_date_param + INTERVAL '14 days';
    WHEN 'monthly' THEN
      RETURN current_date_param + INTERVAL '1 month';
    ELSE
      -- Default to monthly if unknown
      RETURN current_date_param + INTERVAL '1 month';
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_next_pay_date IS
  'Calculates the next expected pay date based on a starting date and pay cycle frequency';

-- =====================================================
-- 5. Function to advance next_pay_date after reconciliation
-- =====================================================
CREATE OR REPLACE FUNCTION advance_income_source_pay_date(
  p_income_source_id UUID,
  p_transaction_id UUID,
  p_transaction_date DATE
) RETURNS TABLE (
  previous_date DATE,
  new_date DATE
) AS $$
DECLARE
  v_pay_cycle TEXT;
  v_previous_date DATE;
  v_new_date DATE;
BEGIN
  -- Get current next_pay_date and pay_cycle
  SELECT next_pay_date, pay_cycle
  INTO v_previous_date, v_pay_cycle
  FROM public.income_sources
  WHERE id = p_income_source_id;

  -- Calculate new next_pay_date based on transaction date
  -- Use transaction date as the base to handle early/late payments correctly
  v_new_date := calculate_next_pay_date(p_transaction_date, v_pay_cycle);

  -- Update the income source
  UPDATE public.income_sources
  SET
    next_pay_date = v_new_date,
    last_reconciled_date = p_transaction_date,
    last_reconciled_transaction_id = p_transaction_id,
    updated_at = NOW()
  WHERE id = p_income_source_id;

  RETURN QUERY SELECT v_previous_date, v_new_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION advance_income_source_pay_date IS
  'Advances the next_pay_date for an income source after a transaction is reconciled';
