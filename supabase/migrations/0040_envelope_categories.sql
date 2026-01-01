-- Migration: Envelope Categories Enhancement
-- Adds icon, is_system, display_order, updated_at to existing envelope_categories table
-- Also adds category_display_order to envelopes table

-- Add new columns to envelope_categories (if they don't exist)
DO $$
BEGIN
  -- Add icon column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'envelope_categories'
    AND column_name = 'icon'
  ) THEN
    ALTER TABLE envelope_categories ADD COLUMN icon VARCHAR(10);
  END IF;

  -- Add is_system column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'envelope_categories'
    AND column_name = 'is_system'
  ) THEN
    ALTER TABLE envelope_categories ADD COLUMN is_system BOOLEAN DEFAULT false;
  END IF;

  -- Add display_order column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'envelope_categories'
    AND column_name = 'display_order'
  ) THEN
    ALTER TABLE envelope_categories ADD COLUMN display_order INT DEFAULT 0;
  END IF;

  -- Add updated_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'envelope_categories'
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE envelope_categories ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Add category_display_order to envelopes table (if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'envelopes'
    AND column_name = 'category_display_order'
  ) THEN
    ALTER TABLE envelopes ADD COLUMN category_display_order INT DEFAULT 0;
  END IF;
END $$;

-- Create index on envelope_categories for ordering
CREATE INDEX IF NOT EXISTS idx_envelope_categories_user_order
  ON envelope_categories(user_id, display_order);

-- Create index on envelopes for category ordering
CREATE INDEX IF NOT EXISTS idx_envelopes_category_order
  ON envelopes(category_id, category_display_order);

-- Function to create default categories for a user
CREATE OR REPLACE FUNCTION create_default_envelope_categories(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO envelope_categories (user_id, name, icon, is_system, display_order) VALUES
    (p_user_id, 'Housing', '🏠', true, 1),
    (p_user_id, 'Transportation', '🚗', true, 2),
    (p_user_id, 'Food & Dining', '🍔', true, 3),
    (p_user_id, 'Utilities', '⚡', true, 4),
    (p_user_id, 'Healthcare', '🏥', true, 5),
    (p_user_id, 'Debt Payments', '💳', true, 6),
    (p_user_id, 'Savings & Investments', '💰', true, 7),
    (p_user_id, 'Entertainment', '🎉', true, 8),
    (p_user_id, 'Personal Care', '✨', true, 9),
    (p_user_id, 'Education', '📚', true, 10),
    (p_user_id, 'Insurance', '🛡️', true, 11),
    (p_user_id, 'Gifts & Donations', '🎁', true, 12),
    (p_user_id, 'Other', '📦', true, 13)
  ON CONFLICT (user_id, name) DO NOTHING;
END;
$$;

-- Add unique constraint on (user_id, name) if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'envelope_categories_user_id_name_key'
  ) THEN
    ALTER TABLE envelope_categories
    ADD CONSTRAINT envelope_categories_user_id_name_key
    UNIQUE (user_id, name);
  END IF;
EXCEPTION
  WHEN duplicate_table THEN
    -- Constraint already exists, ignore
    NULL;
END $$;

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_envelope_categories_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'envelope_categories_updated_at'
  ) THEN
    CREATE TRIGGER envelope_categories_updated_at
      BEFORE UPDATE ON envelope_categories
      FOR EACH ROW
      EXECUTE FUNCTION update_envelope_categories_updated_at();
  END IF;
END $$;

-- Update RLS policy for delete to check is_system
DROP POLICY IF EXISTS "Envelope categories accessible by owner" ON envelope_categories;

CREATE POLICY "Users can view own categories"
  ON envelope_categories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own categories"
  ON envelope_categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories"
  ON envelope_categories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own non-system categories"
  ON envelope_categories FOR DELETE
  USING (auth.uid() = user_id AND (is_system IS NULL OR is_system = false));
