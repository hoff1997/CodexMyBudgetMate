-- ============================================================================
-- Freezer Meals / Meal Prep Options
-- Migration: 0049_freezer_meals.sql
-- ============================================================================

-- Freezer meals list - items that can be crossed off when used
CREATE TABLE freezer_meals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  servings INTEGER,
  date_frozen DATE, -- When it was put in the freezer
  expiry_date DATE, -- Optional expiry/best before date
  is_used BOOLEAN DEFAULT false,
  used_at TIMESTAMPTZ, -- When it was crossed off/used
  tags TEXT[], -- ['chicken', 'pasta', 'kid-friendly']
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_freezer_meals_parent ON freezer_meals(parent_user_id);
CREATE INDEX idx_freezer_meals_used ON freezer_meals(is_used);
CREATE INDEX idx_freezer_meals_tags ON freezer_meals USING GIN(tags);

-- Enable RLS
ALTER TABLE freezer_meals ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Parents can manage their freezer meals
CREATE POLICY "Parents can manage freezer meals"
  ON freezer_meals FOR ALL
  USING (parent_user_id = auth.uid());
