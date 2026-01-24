-- Migration: Direct-to-Main-Tables Onboarding Tracking
-- Description: Adds is_onboarding_draft flag to main tables so onboarding writes directly
--              to real tables instead of temporary onboarding_drafts table.
--
-- BENEFITS:
-- 1. Zero data loss risk - data is in real tables from moment entered
-- 2. Resume anywhere - users can close browser and resume days later
-- 3. No complex data migration at completion - just flip a flag
-- 4. Same data users configure is what they see after completion

-- ============================================
-- 1. Add onboarding tracking columns to profiles
-- ============================================
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS onboarding_current_step INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS onboarding_highest_step INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS onboarding_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS onboarding_last_saved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS onboarding_use_template BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS onboarding_credit_card_allocation NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS envelope_category_order JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.profiles.onboarding_current_step IS 'Current step in onboarding flow (0 = not started, 1-12 = in progress)';
COMMENT ON COLUMN public.profiles.onboarding_highest_step IS 'Highest step reached in onboarding (for allowing back navigation)';
COMMENT ON COLUMN public.profiles.onboarding_started_at IS 'When user started onboarding';
COMMENT ON COLUMN public.profiles.onboarding_last_saved_at IS 'Last autosave timestamp during onboarding';
COMMENT ON COLUMN public.profiles.onboarding_use_template IS 'Whether user chose template or from-scratch in onboarding';
COMMENT ON COLUMN public.profiles.onboarding_credit_card_allocation IS 'Amount allocated to CC holding envelope during onboarding';
COMMENT ON COLUMN public.profiles.envelope_category_order IS 'User-defined order of envelope categories (array of category IDs)';

-- ============================================
-- 2. Add is_onboarding_draft flag to envelopes
-- ============================================
ALTER TABLE public.envelopes
ADD COLUMN IF NOT EXISTS is_onboarding_draft BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_temp_id TEXT;

COMMENT ON COLUMN public.envelopes.is_onboarding_draft IS 'True while envelope is being configured during onboarding. Set to false when onboarding completes.';
COMMENT ON COLUMN public.envelopes.onboarding_temp_id IS 'Temporary client-side ID used during onboarding for matching before real UUID is assigned';

-- Index for efficient draft queries
CREATE INDEX IF NOT EXISTS idx_envelopes_onboarding_draft
  ON public.envelopes(user_id) WHERE is_onboarding_draft = true;

-- ============================================
-- 3. Add is_onboarding_draft flag to recurring_income
-- ============================================
ALTER TABLE public.recurring_income
ADD COLUMN IF NOT EXISTS is_onboarding_draft BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_temp_id TEXT;

COMMENT ON COLUMN public.recurring_income.is_onboarding_draft IS 'True while income source is being configured during onboarding.';
COMMENT ON COLUMN public.recurring_income.onboarding_temp_id IS 'Temporary client-side ID used during onboarding for matching';

CREATE INDEX IF NOT EXISTS idx_recurring_income_onboarding_draft
  ON public.recurring_income(user_id) WHERE is_onboarding_draft = true;

-- ============================================
-- 4. Add is_onboarding_draft flag to accounts
-- ============================================
ALTER TABLE public.accounts
ADD COLUMN IF NOT EXISTS is_onboarding_draft BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_temp_id TEXT;

COMMENT ON COLUMN public.accounts.is_onboarding_draft IS 'True while account is being configured during onboarding.';
COMMENT ON COLUMN public.accounts.onboarding_temp_id IS 'Temporary client-side ID used during onboarding for matching';

CREATE INDEX IF NOT EXISTS idx_accounts_onboarding_draft
  ON public.accounts(user_id) WHERE is_onboarding_draft = true;

-- ============================================
-- 5. Add is_onboarding_draft flag to envelope_categories
-- ============================================
ALTER TABLE public.envelope_categories
ADD COLUMN IF NOT EXISTS is_onboarding_draft BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.envelope_categories.is_onboarding_draft IS 'True for custom categories created during onboarding.';

CREATE INDEX IF NOT EXISTS idx_envelope_categories_onboarding_draft
  ON public.envelope_categories(user_id) WHERE is_onboarding_draft = true;

-- ============================================
-- 6. Add is_onboarding_draft flag to gift_recipients
-- ============================================
ALTER TABLE public.gift_recipients
ADD COLUMN IF NOT EXISTS is_onboarding_draft BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.gift_recipients.is_onboarding_draft IS 'True while gift recipient is being configured during onboarding.';

CREATE INDEX IF NOT EXISTS idx_gift_recipients_onboarding_draft
  ON public.gift_recipients(user_id) WHERE is_onboarding_draft = true;

-- ============================================
-- 7. Add is_onboarding_draft flag to debt_items (if table exists)
-- ============================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'debt_items'
  ) THEN
    ALTER TABLE public.debt_items
    ADD COLUMN IF NOT EXISTS is_onboarding_draft BOOLEAN DEFAULT false;

    COMMENT ON COLUMN public.debt_items.is_onboarding_draft IS 'True while debt item is being configured during onboarding.';
  END IF;
END $$;

-- Create index only if table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'debt_items'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE indexname = 'idx_debt_items_onboarding_draft'
    ) THEN
      CREATE INDEX idx_debt_items_onboarding_draft
        ON public.debt_items(user_id) WHERE is_onboarding_draft = true;
    END IF;
  END IF;
END $$;

-- ============================================
-- 8. Add leveled bill columns (if not already present)
-- These are needed for onboarding leveled bill feature
-- ============================================
ALTER TABLE public.envelopes
ADD COLUMN IF NOT EXISTS is_leveled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS leveling_data JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS seasonal_pattern TEXT DEFAULT NULL;

-- Add constraint for seasonal_pattern if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'valid_seasonal_pattern'
  ) THEN
    ALTER TABLE public.envelopes
    ADD CONSTRAINT valid_seasonal_pattern
    CHECK (seasonal_pattern IS NULL OR seasonal_pattern IN ('winter-peak', 'summer-peak', 'custom'));
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON COLUMN public.envelopes.is_leveled IS 'True if using leveled payments for seasonal bills';
COMMENT ON COLUMN public.envelopes.leveling_data IS 'JSON: {monthlyAmounts: number[], yearlyAverage, bufferPercent, estimationType, lastUpdated}';
COMMENT ON COLUMN public.envelopes.seasonal_pattern IS 'Seasonal pattern: winter-peak, summer-peak, or custom';

CREATE INDEX IF NOT EXISTS idx_envelopes_is_leveled
  ON public.envelopes(is_leveled) WHERE is_leveled = true;

-- ============================================
-- 9. Function to complete onboarding (flip all draft flags)
-- ============================================
CREATE OR REPLACE FUNCTION complete_onboarding(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Mark all draft envelopes as complete
  UPDATE envelopes
  SET is_onboarding_draft = false,
      onboarding_temp_id = NULL,
      updated_at = NOW()
  WHERE user_id = p_user_id AND is_onboarding_draft = true;

  -- Mark all draft income sources as complete
  UPDATE recurring_income
  SET is_onboarding_draft = false,
      onboarding_temp_id = NULL,
      updated_at = NOW()
  WHERE user_id = p_user_id AND is_onboarding_draft = true;

  -- Mark all draft accounts as complete
  UPDATE accounts
  SET is_onboarding_draft = false,
      onboarding_temp_id = NULL,
      updated_at = NOW()
  WHERE user_id = p_user_id AND is_onboarding_draft = true;

  -- Mark all draft categories as complete
  UPDATE envelope_categories
  SET is_onboarding_draft = false,
      updated_at = NOW()
  WHERE user_id = p_user_id AND is_onboarding_draft = true;

  -- Mark all draft gift recipients as complete
  UPDATE gift_recipients
  SET is_onboarding_draft = false,
      updated_at = NOW()
  WHERE user_id = p_user_id AND is_onboarding_draft = true;

  -- Mark all draft debt items as complete (if table exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'debt_items'
  ) THEN
    UPDATE debt_items
    SET is_onboarding_draft = false,
        updated_at = NOW()
    WHERE user_id = p_user_id AND is_onboarding_draft = true;
  END IF;

  -- Mark profile as onboarding complete
  UPDATE profiles
  SET onboarding_completed = true,
      onboarding_current_step = 0,
      has_onboarding_draft = false,
      updated_at = NOW()
  WHERE id = p_user_id;
END;
$$;

COMMENT ON FUNCTION complete_onboarding IS 'Completes onboarding by setting is_onboarding_draft=false on all draft records and marking profile complete';

-- ============================================
-- 10. Function to abandon onboarding (delete all draft records)
-- Only called if user explicitly wants to start over
-- ============================================
CREATE OR REPLACE FUNCTION abandon_onboarding(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete draft gift recipients first (FK constraint)
  DELETE FROM gift_recipients
  WHERE user_id = p_user_id AND is_onboarding_draft = true;

  -- Delete draft debt items (FK constraint, if table exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'debt_items'
  ) THEN
    DELETE FROM debt_items
    WHERE user_id = p_user_id AND is_onboarding_draft = true;
  END IF;

  -- Delete draft envelopes
  DELETE FROM envelopes
  WHERE user_id = p_user_id AND is_onboarding_draft = true;

  -- Delete draft income sources
  DELETE FROM recurring_income
  WHERE user_id = p_user_id AND is_onboarding_draft = true;

  -- Delete draft accounts
  DELETE FROM accounts
  WHERE user_id = p_user_id AND is_onboarding_draft = true;

  -- Delete draft categories
  DELETE FROM envelope_categories
  WHERE user_id = p_user_id AND is_onboarding_draft = true;

  -- Reset profile onboarding state
  UPDATE profiles
  SET onboarding_current_step = 0,
      onboarding_highest_step = 0,
      onboarding_started_at = NULL,
      onboarding_last_saved_at = NULL,
      has_onboarding_draft = false,
      updated_at = NOW()
  WHERE id = p_user_id;
END;
$$;

COMMENT ON FUNCTION abandon_onboarding IS 'Abandons onboarding by deleting all draft records. Use with caution - user loses all work.';

-- ============================================
-- 11. View for onboarding draft data (convenience)
-- ============================================
CREATE OR REPLACE VIEW onboarding_draft_summary AS
SELECT
  p.id as user_id,
  p.full_name,
  p.onboarding_current_step,
  p.onboarding_highest_step,
  p.onboarding_started_at,
  p.onboarding_last_saved_at,
  p.onboarding_use_template,
  (SELECT COUNT(*) FROM envelopes e WHERE e.user_id = p.id AND e.is_onboarding_draft = true) as draft_envelope_count,
  (SELECT COUNT(*) FROM recurring_income ri WHERE ri.user_id = p.id AND ri.is_onboarding_draft = true) as draft_income_count,
  (SELECT COUNT(*) FROM accounts a WHERE a.user_id = p.id AND a.is_onboarding_draft = true) as draft_account_count,
  (SELECT COUNT(*) FROM envelope_categories ec WHERE ec.user_id = p.id AND ec.is_onboarding_draft = true) as draft_category_count
FROM profiles p
WHERE p.onboarding_current_step > 0 OR p.has_onboarding_draft = true;

COMMENT ON VIEW onboarding_draft_summary IS 'Summary of users with in-progress onboarding drafts';
