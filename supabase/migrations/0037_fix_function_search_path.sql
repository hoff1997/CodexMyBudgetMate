-- Fix function search_path security warnings
-- Setting search_path = '' ensures functions use fully qualified table names
-- and prevents search_path injection attacks

-- =====================================================
-- Trigger functions (update_*_updated_at)
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_onboarding_drafts_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_credit_card_cycle_holdings_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_credit_card_payment_history_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_allocation_plan_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_demo_sessions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_envelope_goal_milestones_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_recurring_income_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_transaction_splits_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_user_progress_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_subscription_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- =====================================================
-- Credit card functions
-- =====================================================

-- Drop functions that return TABLE types first (PostgreSQL requires this when modifying)
DROP FUNCTION IF EXISTS public.calculate_payoff_projection(NUMERIC, NUMERIC, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS public.get_current_billing_cycle(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.calculate_cycle_dates(INTEGER, DATE) CASCADE;

-- Drop other credit card functions (parameter names may differ)
DROP FUNCTION IF EXISTS public.allocate_credit_card_transaction(UUID, UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.calculate_credit_utilization(NUMERIC, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS public.calculate_minimum_payment(NUMERIC, NUMERIC, NUMERIC) CASCADE;

-- Also drop get_total_bank_balance
DROP FUNCTION IF EXISTS public.get_total_bank_balance(UUID) CASCADE;

CREATE OR REPLACE FUNCTION public.calculate_payoff_projection(
  p_balance NUMERIC,
  p_apr NUMERIC,
  p_monthly_payment NUMERIC
)
RETURNS TABLE (
  month_number INTEGER,
  starting_balance NUMERIC,
  interest_charge NUMERIC,
  principal_payment NUMERIC,
  ending_balance NUMERIC
)
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
DECLARE
  v_balance NUMERIC := p_balance;
  v_monthly_rate NUMERIC := p_apr / 12 / 100;
  v_month INTEGER := 0;
  v_interest NUMERIC;
  v_principal NUMERIC;
BEGIN
  WHILE v_balance > 0 AND v_month < 360 LOOP
    v_month := v_month + 1;
    v_interest := ROUND(v_balance * v_monthly_rate, 2);
    v_principal := LEAST(p_monthly_payment - v_interest, v_balance);

    month_number := v_month;
    starting_balance := v_balance;
    interest_charge := v_interest;
    principal_payment := v_principal;
    v_balance := v_balance - v_principal;
    ending_balance := GREATEST(v_balance, 0);

    RETURN NEXT;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_current_billing_cycle(p_account_id UUID)
RETURNS TABLE (
  cycle_start DATE,
  cycle_end DATE,
  payment_due_date DATE
)
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
DECLARE
  v_statement_day INTEGER;
  v_payment_due_day INTEGER;
BEGIN
  SELECT
    COALESCE(cc_statement_day, 1),
    COALESCE(cc_payment_due_day, 15)
  INTO v_statement_day, v_payment_due_day
  FROM public.accounts
  WHERE id = p_account_id;

  cycle_start := DATE_TRUNC('month', CURRENT_DATE) + (v_statement_day - 1);
  cycle_end := cycle_start + INTERVAL '1 month' - INTERVAL '1 day';
  payment_due_date := DATE_TRUNC('month', CURRENT_DATE) + (v_payment_due_day - 1);

  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_cycle_dates(
  p_statement_day INTEGER,
  p_reference_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  cycle_start DATE,
  cycle_end DATE
)
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
BEGIN
  cycle_start := DATE_TRUNC('month', p_reference_date) + (p_statement_day - 1);
  IF cycle_start > p_reference_date THEN
    cycle_start := cycle_start - INTERVAL '1 month';
  END IF;
  cycle_end := cycle_start + INTERVAL '1 month' - INTERVAL '1 day';
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.allocate_credit_card_transaction(
  p_transaction_id UUID,
  p_envelope_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_amount NUMERIC;
BEGIN
  SELECT amount INTO v_amount
  FROM public.transactions
  WHERE id = p_transaction_id AND user_id = p_user_id;

  IF v_amount IS NULL THEN
    RETURN FALSE;
  END IF;

  UPDATE public.transactions
  SET envelope_id = p_envelope_id
  WHERE id = p_transaction_id AND user_id = p_user_id;

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_credit_utilization(
  p_balance NUMERIC,
  p_credit_limit NUMERIC
)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
BEGIN
  IF p_credit_limit IS NULL OR p_credit_limit = 0 THEN
    RETURN NULL;
  END IF;
  RETURN ROUND((ABS(p_balance) / p_credit_limit) * 100, 2);
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_minimum_payment(
  p_balance NUMERIC,
  p_apr NUMERIC DEFAULT 0,
  p_min_payment_percent NUMERIC DEFAULT 2
)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  v_interest NUMERIC;
  v_principal NUMERIC;
BEGIN
  v_interest := ROUND(ABS(p_balance) * (p_apr / 12 / 100), 2);
  v_principal := ROUND(ABS(p_balance) * (p_min_payment_percent / 100), 2);
  RETURN GREATEST(v_interest + v_principal, 25);
END;
$$;

-- =====================================================
-- Transfer functions
-- =====================================================

-- Drop transfer functions first (parameter names may differ)
-- Use CASCADE to handle any dependencies
DROP FUNCTION IF EXISTS public.link_transfer_transactions(UUID, UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.unlink_transfer_transactions(UUID, UUID) CASCADE;

-- Also try dropping with explicit schema qualification
DO $$
BEGIN
  DROP FUNCTION IF EXISTS link_transfer_transactions(UUID, UUID, UUID) CASCADE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.link_transfer_transactions(
  p_user_id UUID,
  p_from_transaction_id UUID,
  p_to_transaction_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  UPDATE public.transactions
  SET
    transfer_pair_id = p_to_transaction_id,
    is_transfer = TRUE
  WHERE id = p_from_transaction_id AND user_id = p_user_id;

  UPDATE public.transactions
  SET
    transfer_pair_id = p_from_transaction_id,
    is_transfer = TRUE
  WHERE id = p_to_transaction_id AND user_id = p_user_id;

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.unlink_transfer_transactions(
  p_user_id UUID,
  p_transaction_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_pair_id UUID;
BEGIN
  SELECT transfer_pair_id INTO v_pair_id
  FROM public.transactions
  WHERE id = p_transaction_id AND user_id = p_user_id;

  IF v_pair_id IS NULL THEN
    RETURN FALSE;
  END IF;

  UPDATE public.transactions
  SET
    transfer_pair_id = NULL,
    is_transfer = FALSE
  WHERE id IN (p_transaction_id, v_pair_id) AND user_id = p_user_id;

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_total_bank_balance(p_user_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
DECLARE
  v_total NUMERIC;
BEGIN
  SELECT COALESCE(SUM(current_balance), 0) INTO v_total
  FROM public.accounts
  WHERE user_id = p_user_id
    AND type IN ('transaction', 'checking', 'savings', 'cash');

  RETURN v_total;
END;
$$;

-- =====================================================
-- Income functions
-- =====================================================

-- Drop income functions first (parameter names may differ)
DROP FUNCTION IF EXISTS public.advance_income_source_pay_date(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.calculate_next_pay_date(DATE, TEXT) CASCADE;

CREATE OR REPLACE FUNCTION public.advance_income_source_pay_date(p_income_source_id UUID)
RETURNS DATE
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_current_date DATE;
  v_pay_cycle TEXT;
  v_next_date DATE;
BEGIN
  SELECT next_pay_date, pay_cycle
  INTO v_current_date, v_pay_cycle
  FROM public.income_sources
  WHERE id = p_income_source_id;

  v_next_date := public.calculate_next_pay_date(v_current_date, v_pay_cycle);

  UPDATE public.income_sources
  SET next_pay_date = v_next_date
  WHERE id = p_income_source_id;

  RETURN v_next_date;
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_next_pay_date(
  p_current_date DATE,
  p_pay_cycle TEXT
)
RETURNS DATE
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
BEGIN
  CASE p_pay_cycle
    WHEN 'weekly' THEN RETURN p_current_date + INTERVAL '7 days';
    WHEN 'fortnightly' THEN RETURN p_current_date + INTERVAL '14 days';
    WHEN 'monthly' THEN RETURN p_current_date + INTERVAL '1 month';
    WHEN 'twice_monthly' THEN
      IF EXTRACT(DAY FROM p_current_date) <= 15 THEN
        RETURN DATE_TRUNC('month', p_current_date) + INTERVAL '14 days';
      ELSE
        RETURN DATE_TRUNC('month', p_current_date) + INTERVAL '1 month' - INTERVAL '1 day';
      END IF;
    ELSE RETURN p_current_date + INTERVAL '1 month';
  END CASE;
END;
$$;

-- =====================================================
-- Achievement/gamification functions
-- =====================================================

-- Drop achievement functions first (parameter names may differ)
DROP FUNCTION IF EXISTS public.award_achievement(UUID, TEXT, JSONB) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_achievement_points(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.track_feature_usage(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.unlock_feature(UUID, TEXT) CASCADE;

CREATE OR REPLACE FUNCTION public.award_achievement(
  p_user_id UUID,
  p_achievement_key TEXT,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.achievements (user_id, achievement_key, metadata)
  VALUES (p_user_id, p_achievement_key, p_metadata)
  ON CONFLICT (user_id, achievement_key) DO NOTHING;

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_achievement_points(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
DECLARE
  v_points INTEGER;
BEGIN
  SELECT COALESCE(SUM(
    CASE achievement_key
      WHEN 'first_envelope' THEN 10
      WHEN 'emergency_fund_started' THEN 25
      WHEN 'emergency_fund_1000' THEN 50
      WHEN 'emergency_fund_complete' THEN 100
      WHEN 'first_budget_month' THEN 25
      WHEN 'debt_free' THEN 100
      WHEN 'onboarding_complete' THEN 20
      ELSE 10
    END
  ), 0) INTO v_points
  FROM public.achievements
  WHERE user_id = p_user_id;

  RETURN v_points;
END;
$$;

CREATE OR REPLACE FUNCTION public.track_feature_usage(
  p_user_id UUID,
  p_feature_key TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.feature_usage (user_id, feature_key, used_at)
  VALUES (p_user_id, p_feature_key, NOW())
  ON CONFLICT (user_id, feature_key)
  DO UPDATE SET
    use_count = public.feature_usage.use_count + 1,
    used_at = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION public.unlock_feature(
  p_user_id UUID,
  p_feature_key TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.unlocked_features (user_id, feature_key)
  VALUES (p_user_id, p_feature_key)
  ON CONFLICT (user_id, feature_key) DO NOTHING;

  RETURN FOUND;
END;
$$;

-- =====================================================
-- Envelope functions
-- =====================================================

-- Drop envelope functions first (parameter names may differ)
DROP FUNCTION IF EXISTS public.create_default_envelopes(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.envelope_needs_budget(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.update_envelope_funding_sources(UUID, UUID[]) CASCADE;

CREATE OR REPLACE FUNCTION public.create_default_envelopes(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.envelopes (user_id, name, icon, priority, subtype, target_amount)
  VALUES
    (p_user_id, 'Rent/Mortgage', '🏠', 'essential', 'bill', 0),
    (p_user_id, 'Utilities', '⚡', 'essential', 'bill', 0),
    (p_user_id, 'Groceries', '🛒', 'essential', 'spending', 0),
    (p_user_id, 'Transport', '🚗', 'important', 'spending', 0),
    (p_user_id, 'Emergency Fund', '🛡️', 'essential', 'savings', 0)
  ON CONFLICT DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.envelope_needs_budget(p_subtype TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
BEGIN
  RETURN p_subtype = 'bill';
END;
$$;

CREATE OR REPLACE FUNCTION public.update_envelope_funding_sources(
  p_envelope_id UUID,
  p_income_source_ids UUID[]
)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.envelope_income_allocations
  WHERE envelope_id = p_envelope_id
    AND income_source_id != ALL(p_income_source_ids);

  INSERT INTO public.envelope_income_allocations (envelope_id, income_source_id)
  SELECT p_envelope_id, unnest(p_income_source_ids)
  ON CONFLICT (envelope_id, income_source_id) DO NOTHING;
END;
$$;
