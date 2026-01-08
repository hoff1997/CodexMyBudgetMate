-- Migration: Add Goals category as default + Wishlist tables
-- This migration:
-- 1. Adds "Goals" as a default system category for all users (like Celebrations)
-- 2. Creates wishlists table for adult users
-- 3. Creates teen_wishlists table for kids module

-- ============================================================================
-- PART 1: Goals Category Setup
-- ============================================================================

-- Update the create_default_envelope_categories function to include Goals
CREATE OR REPLACE FUNCTION create_default_envelope_categories(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO envelope_categories (user_id, name, icon, is_system, display_order) VALUES
    (p_user_id, 'Housing', '🏠', true, 1),
    (p_user_id, 'Transportation', '🚗', true, 2),
    (p_user_id, 'Food & Dining', '🍔', true, 3),
    (p_user_id, 'Utilities', '💡', true, 4),
    (p_user_id, 'Healthcare', '🏥', true, 5),
    (p_user_id, 'Personal', '👤', true, 6),
    (p_user_id, 'Entertainment', '🎬', true, 7),
    (p_user_id, 'Celebrations', '🎉', true, 8),
    (p_user_id, 'Goals', '🎯', true, 9),
    (p_user_id, 'Savings', '💰', true, 10),
    (p_user_id, 'Debt', '💳', true, 11),
    (p_user_id, 'Giving', '🎁', true, 12),
    (p_user_id, 'Education', '📚', true, 13),
    (p_user_id, 'Other', '📦', true, 14)
  ON CONFLICT (user_id, name) DO NOTHING;
END;
$$;

-- Backfill Goals category for all existing users who don't have it
INSERT INTO envelope_categories (user_id, name, icon, is_system, display_order)
SELECT p.id, 'Goals', '🎯', true, 9
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM envelope_categories ec
  WHERE ec.user_id = p.id AND ec.name = 'Goals'
)
ON CONFLICT (user_id, name) DO NOTHING;

-- ============================================================================
-- PART 2: Adult Wishlist Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  estimated_cost NUMERIC(10,2),
  image_url TEXT,
  link_url TEXT,
  priority INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'converted', 'purchased')),
  converted_envelope_id UUID REFERENCES envelopes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_wishlists_user_id ON wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_status ON wishlists(status);
CREATE INDEX IF NOT EXISTS idx_wishlists_priority ON wishlists(user_id, priority);

-- Enable RLS
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own wishlist items
CREATE POLICY "Users can view own wishlists"
  ON wishlists FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wishlists"
  ON wishlists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own wishlists"
  ON wishlists FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own wishlists"
  ON wishlists FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- PART 3: Teen/Kids Wishlist Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS teen_wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_profile_id UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  estimated_cost NUMERIC(10,2),
  image_url TEXT,
  link_url TEXT,
  priority INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'converted', 'purchased')),
  converted_goal_id UUID, -- FK to teen_savings_goals will be added when that table is created
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_teen_wishlists_child_id ON teen_wishlists(child_profile_id);
CREATE INDEX IF NOT EXISTS idx_teen_wishlists_status ON teen_wishlists(status);
CREATE INDEX IF NOT EXISTS idx_teen_wishlists_priority ON teen_wishlists(child_profile_id, priority);

-- Enable RLS
ALTER TABLE teen_wishlists ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Parents can manage their children's wishlists
CREATE POLICY "Parents can view child wishlists"
  ON teen_wishlists FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM child_profiles cp
      WHERE cp.id = child_profile_id AND cp.parent_user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can insert child wishlists"
  ON teen_wishlists FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM child_profiles cp
      WHERE cp.id = child_profile_id AND cp.parent_user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can update child wishlists"
  ON teen_wishlists FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM child_profiles cp
      WHERE cp.id = child_profile_id AND cp.parent_user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can delete child wishlists"
  ON teen_wishlists FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM child_profiles cp
      WHERE cp.id = child_profile_id AND cp.parent_user_id = auth.uid()
    )
  );

-- ============================================================================
-- PART 4: Triggers for updated_at
-- ============================================================================

-- Trigger function for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_wishlist_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to wishlists table
DROP TRIGGER IF EXISTS trigger_wishlists_updated_at ON wishlists;
CREATE TRIGGER trigger_wishlists_updated_at
  BEFORE UPDATE ON wishlists
  FOR EACH ROW
  EXECUTE FUNCTION update_wishlist_updated_at();

-- Apply trigger to teen_wishlists table
DROP TRIGGER IF EXISTS trigger_teen_wishlists_updated_at ON teen_wishlists;
CREATE TRIGGER trigger_teen_wishlists_updated_at
  BEFORE UPDATE ON teen_wishlists
  FOR EACH ROW
  EXECUTE FUNCTION update_wishlist_updated_at();
