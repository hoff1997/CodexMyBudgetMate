-- Migration: Add custom_weeks column for custom weekly frequency
-- Allows users to specify a custom number of weeks for recurring expenses
-- e.g., haircuts every 8 weeks, quarterly-ish expenses, etc.

-- Add custom_weeks column to envelopes table
ALTER TABLE public.envelopes
ADD COLUMN IF NOT EXISTS custom_weeks INTEGER;

-- Add check constraint for valid week range (1-52)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'envelopes_custom_weeks_check'
  ) THEN
    ALTER TABLE public.envelopes
    ADD CONSTRAINT envelopes_custom_weeks_check
    CHECK (custom_weeks IS NULL OR (custom_weeks >= 1 AND custom_weeks <= 52));
  END IF;
END $$;

-- Add custom_weeks to teen_envelopes table as well
ALTER TABLE teen_envelopes
ADD COLUMN IF NOT EXISTS custom_weeks INTEGER;

-- Add check constraint for teen_envelopes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'teen_envelopes_custom_weeks_check'
  ) THEN
    ALTER TABLE teen_envelopes
    ADD CONSTRAINT teen_envelopes_custom_weeks_check
    CHECK (custom_weeks IS NULL OR (custom_weeks >= 1 AND custom_weeks <= 52));
  END IF;
END $$;

-- Update frequency check constraint to include 'custom_weeks' for teen_envelopes
ALTER TABLE teen_envelopes DROP CONSTRAINT IF EXISTS teen_envelopes_frequency_check;
ALTER TABLE teen_envelopes
ADD CONSTRAINT teen_envelopes_frequency_check
CHECK (frequency IN ('weekly', 'fortnightly', 'monthly', 'quarterly', 'annually', 'custom_weeks'));

-- Comment for documentation
COMMENT ON COLUMN public.envelopes.custom_weeks IS 'Number of weeks for custom_weeks frequency (e.g., 8 for every 8 weeks)';
COMMENT ON COLUMN teen_envelopes.custom_weeks IS 'Number of weeks for custom_weeks frequency (e.g., 8 for every 8 weeks)';
