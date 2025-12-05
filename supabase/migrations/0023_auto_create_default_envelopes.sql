-- Migration: Auto-create default system envelopes for all users
-- This creates "Surplus" and "Credit Card Holding" envelopes automatically

-- Add is_system_envelope column to identify system-managed envelopes
ALTER TABLE public.envelopes
ADD COLUMN IF NOT EXISTS is_system_envelope BOOLEAN DEFAULT FALSE;

-- Add index for efficient querying of system envelopes
CREATE INDEX IF NOT EXISTS idx_envelopes_is_system ON public.envelopes(is_system_envelope);

-- Add comment explaining the field
COMMENT ON COLUMN public.envelopes.is_system_envelope IS
  'Indicates whether this is a system-managed envelope (Surplus, Credit Card Holding, etc.)';

-- Function to create default envelopes for a user
CREATE OR REPLACE FUNCTION create_default_envelopes()
RETURNS TRIGGER AS $$
BEGIN
  -- Create Surplus envelope
  INSERT INTO public.envelopes (
    user_id,
    name,
    subtype,
    icon,
    is_system_envelope,
    notes,
    target_amount,
    current_amount
  ) VALUES (
    NEW.id,
    'Surplus',
    'savings',
    '💰',
    TRUE,
    'Auto-allocated unallocated funds from your budget',
    0,
    0
  );

  -- Create Credit Card Holding envelope
  INSERT INTO public.envelopes (
    user_id,
    name,
    subtype,
    icon,
    is_system_envelope,
    notes,
    target_amount,
    current_amount
  ) VALUES (
    NEW.id,
    'Credit Card Holding',
    'savings',
    '💳',
    TRUE,
    'Holding funds for credit card payments',
    0,
    0
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create default envelopes when a new profile is created
DROP TRIGGER IF EXISTS trigger_create_default_envelopes ON public.profiles;
CREATE TRIGGER trigger_create_default_envelopes
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_default_envelopes();

-- Backfill existing users who don't have these envelopes
DO $$
DECLARE
  profile_record RECORD;
  surplus_exists BOOLEAN;
  cc_holding_exists BOOLEAN;
BEGIN
  FOR profile_record IN SELECT id FROM public.profiles LOOP
    -- Check if Surplus envelope exists for this user
    SELECT EXISTS (
      SELECT 1 FROM public.envelopes
      WHERE user_id = profile_record.id
      AND name = 'Surplus'
      AND is_system_envelope = TRUE
    ) INTO surplus_exists;

    -- Create Surplus if it doesn't exist
    IF NOT surplus_exists THEN
      INSERT INTO public.envelopes (
        user_id,
        name,
        subtype,
        icon,
        is_system_envelope,
        notes,
        target_amount,
        current_amount
      ) VALUES (
        profile_record.id,
        'Surplus',
        'savings',
        '💰',
        TRUE,
        'Auto-allocated unallocated funds from your budget',
        0,
        0
      );
    END IF;

    -- Check if Credit Card Holding envelope exists for this user
    SELECT EXISTS (
      SELECT 1 FROM public.envelopes
      WHERE user_id = profile_record.id
      AND name = 'Credit Card Holding'
      AND is_system_envelope = TRUE
    ) INTO cc_holding_exists;

    -- Create Credit Card Holding if it doesn't exist
    IF NOT cc_holding_exists THEN
      INSERT INTO public.envelopes (
        user_id,
        name,
        subtype,
        icon,
        is_system_envelope,
        notes,
        target_amount,
        current_amount
      ) VALUES (
        profile_record.id,
        'Credit Card Holding',
        'savings',
        '💳',
        TRUE,
        'Holding funds for credit card payments',
        0,
        0
      );
    END IF;
  END LOOP;
END $$;

-- Mark any existing envelopes with these names as system envelopes
UPDATE public.envelopes
SET is_system_envelope = TRUE
WHERE (name = 'Surplus' OR name = 'Credit Card Holding')
  AND is_system_envelope = FALSE;
