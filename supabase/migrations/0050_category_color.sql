-- Migration: Add color column to envelope_categories
-- Allows users to customize category colors

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'envelope_categories'
    AND column_name = 'color'
  ) THEN
    ALTER TABLE envelope_categories ADD COLUMN color VARCHAR(20);
  END IF;
END $$;
