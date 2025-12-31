-- Suggested Envelopes: "The My Budget Way" feature
-- Adds columns to track suggested envelopes (Starter Stash, CC Holding, Safety Net)

-- Add suggested envelope columns to envelopes table
ALTER TABLE public.envelopes
ADD COLUMN IF NOT EXISTS is_suggested BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS suggestion_type TEXT CHECK (suggestion_type IN ('starter-stash', 'cc-holding', 'safety-net', NULL)),
ADD COLUMN IF NOT EXISTS is_dismissed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_calculate_target BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS snoozed_until TIMESTAMPTZ DEFAULT NULL;

-- Create index for filtering suggested envelopes
CREATE INDEX IF NOT EXISTS idx_envelopes_is_suggested ON public.envelopes(user_id, is_suggested) WHERE is_suggested = true;
CREATE INDEX IF NOT EXISTS idx_envelopes_is_dismissed ON public.envelopes(user_id, is_dismissed) WHERE is_dismissed = true;
CREATE INDEX IF NOT EXISTS idx_envelopes_snoozed ON public.envelopes(user_id, snoozed_until) WHERE snoozed_until IS NOT NULL;

-- Create "The My Budget Way" category for all users who have suggested envelopes
-- This will be done programmatically when creating suggested envelopes

COMMENT ON COLUMN public.envelopes.is_suggested IS 'True for system-suggested envelopes like Starter Stash, CC Holding, and Safety Net';
COMMENT ON COLUMN public.envelopes.suggestion_type IS 'Type of suggestion: starter-stash, cc-holding, or safety-net';
COMMENT ON COLUMN public.envelopes.is_dismissed IS 'True if user dismissed the suggestion';
COMMENT ON COLUMN public.envelopes.auto_calculate_target IS 'True if target should be calculated dynamically (e.g., Safety Net = 3 months essential)';
COMMENT ON COLUMN public.envelopes.description IS 'Description text shown under envelope name for suggested envelopes';
COMMENT ON COLUMN public.envelopes.snoozed_until IS 'Timestamp when snooze expires - envelope reappears after this time';
