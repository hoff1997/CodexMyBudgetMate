-- Migration: Fix icon column length for Phosphor icons
-- The icon column was VARCHAR(10) which is too short for Phosphor icon names
-- like 'user-rectangle' (14 chars), 'shield-check' (12 chars), etc.

-- Increase envelope_categories.icon to VARCHAR(50) to support all Phosphor icon names
ALTER TABLE envelope_categories
ALTER COLUMN icon TYPE VARCHAR(50);

-- Also check envelopes.icon if it exists and has similar constraint
DO $$
BEGIN
  -- Check if envelopes.icon column exists and alter it
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'envelopes'
    AND column_name = 'icon'
  ) THEN
    ALTER TABLE envelopes ALTER COLUMN icon TYPE VARCHAR(50);
  END IF;
END $$;
