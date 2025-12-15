-- Migration: Onboarding Autosave
-- Description: Stores onboarding progress so users can resume where they left off

-- ============================================
-- ONBOARDING DRAFT TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.onboarding_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE UNIQUE,
  current_step int NOT NULL DEFAULT 1,

  -- Step data (stored as JSONB for flexibility)
  full_name text,
  persona text CHECK (persona IN ('beginner', 'optimiser', 'wealth_builder')),
  bank_accounts jsonb DEFAULT '[]',
  income_sources jsonb DEFAULT '[]',
  use_template boolean DEFAULT true,
  envelopes jsonb DEFAULT '[]',
  envelope_allocations jsonb DEFAULT '{}',
  opening_balances jsonb DEFAULT '{}',

  -- Timestamps
  last_saved_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.onboarding_drafts ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Onboarding drafts accessible by owner"
  ON public.onboarding_drafts
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_onboarding_drafts_user
  ON public.onboarding_drafts(user_id);

CREATE INDEX IF NOT EXISTS idx_onboarding_drafts_updated
  ON public.onboarding_drafts(updated_at DESC);

-- Add comments
COMMENT ON TABLE public.onboarding_drafts IS
  'Stores in-progress onboarding data so users can resume where they left off';

COMMENT ON COLUMN public.onboarding_drafts.current_step IS
  'Current step number in the onboarding flow (1-11)';

COMMENT ON COLUMN public.onboarding_drafts.last_saved_at IS
  'Timestamp of the last autosave';

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_onboarding_drafts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.last_saved_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_onboarding_drafts_updated_at
  BEFORE UPDATE ON public.onboarding_drafts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_onboarding_drafts_updated_at();

-- Add column to profiles to track if there's a draft in progress
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS has_onboarding_draft boolean DEFAULT false;

COMMENT ON COLUMN public.profiles.has_onboarding_draft IS
  'Flag indicating whether user has an in-progress onboarding draft';
