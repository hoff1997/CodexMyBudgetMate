-- ============================================================================
-- CHORE ROUTINES & SCHEDULES SYSTEM
-- Migration: 0061_chore_routines_schedules.sql
-- ============================================================================

-- ============================================================================
-- 1. CHORE ROUTINES (Bundles of chores like "Morning Routine")
-- ============================================================================

CREATE TABLE IF NOT EXISTS chore_routines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '📋',
  time_of_day TEXT CHECK (time_of_day IN ('morning', 'afternoon', 'evening', 'anytime')) DEFAULT 'anytime',
  target_time TIME,
  duration_estimate_minutes INTEGER,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chore_routines_parent ON chore_routines(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_chore_routines_active ON chore_routines(is_active);

-- ============================================================================
-- 2. ROUTINE ITEMS (Chores within a routine)
-- ============================================================================

CREATE TABLE IF NOT EXISTS chore_routine_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  routine_id UUID NOT NULL REFERENCES chore_routines(id) ON DELETE CASCADE,
  chore_template_id UUID NOT NULL REFERENCES chore_templates(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  is_required BOOLEAN DEFAULT true,
  override_currency_type TEXT CHECK (override_currency_type IN ('money', 'screen_time', 'stars')),
  override_currency_amount NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chore_routine_items_routine ON chore_routine_items(routine_id);

-- ============================================================================
-- 3. ROTATION MEMBERS TABLE (Links children to rotations with order)
-- ============================================================================

CREATE TABLE IF NOT EXISTS chore_rotation_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rotation_id UUID NOT NULL REFERENCES chore_rotations(id) ON DELETE CASCADE,
  child_profile_id UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  order_position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(rotation_id, child_profile_id)
);

CREATE INDEX IF NOT EXISTS idx_rotation_members_rotation ON chore_rotation_members(rotation_id);

-- ============================================================================
-- 4. CHORE SCHEDULES (Flexible recurring patterns)
-- ============================================================================

CREATE TABLE IF NOT EXISTS chore_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,

  -- What to schedule (one of these)
  chore_template_id UUID REFERENCES chore_templates(id) ON DELETE CASCADE,
  routine_id UUID REFERENCES chore_routines(id) ON DELETE CASCADE,

  -- Who to assign
  child_profile_id UUID REFERENCES child_profiles(id) ON DELETE CASCADE,
  rotation_id UUID REFERENCES chore_rotations(id) ON DELETE SET NULL,

  -- When to run
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'fortnightly', 'monthly')),
  days_of_week INTEGER[],
  day_of_month INTEGER,
  time_of_day TEXT CHECK (time_of_day IN ('morning', 'afternoon', 'evening', 'anytime')) DEFAULT 'anytime',
  target_time TIME,

  -- Recurrence settings
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  occurrences_limit INTEGER,
  occurrences_count INTEGER DEFAULT 0,

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_generated_date DATE,
  next_occurrence_date DATE,

  -- Reward overrides
  currency_type TEXT CHECK (currency_type IN ('money', 'screen_time', 'stars')),
  currency_amount NUMERIC(10,2),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chore_schedules_parent ON chore_schedules(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_chore_schedules_active ON chore_schedules(is_active, next_occurrence_date);
CREATE INDEX IF NOT EXISTS idx_chore_schedules_child ON chore_schedules(child_profile_id);

-- ============================================================================
-- 5. ENHANCED CHORE_ROTATIONS (Add missing columns)
-- ============================================================================

ALTER TABLE chore_rotations
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS current_child_index INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_rotated_at TIMESTAMPTZ;

-- ============================================================================
-- 6. ENHANCED CHORE_ASSIGNMENTS (Add routine and time support)
-- ============================================================================

ALTER TABLE chore_assignments
ADD COLUMN IF NOT EXISTS routine_id UUID REFERENCES chore_routines(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS schedule_id UUID REFERENCES chore_schedules(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS time_of_day TEXT CHECK (time_of_day IN ('morning', 'afternoon', 'evening', 'anytime')),
ADD COLUMN IF NOT EXISTS target_time TIME,
ADD COLUMN IF NOT EXISTS sort_order_in_routine INTEGER DEFAULT 0;

-- ============================================================================
-- 7. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE chore_routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE chore_routine_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE chore_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE chore_rotation_members ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Parents can manage chore routines" ON chore_routines;
DROP POLICY IF EXISTS "Parents can manage routine items" ON chore_routine_items;
DROP POLICY IF EXISTS "Parents can manage chore schedules" ON chore_schedules;
DROP POLICY IF EXISTS "Parents can manage rotation members" ON chore_rotation_members;

CREATE POLICY "Parents can manage chore routines"
  ON chore_routines FOR ALL
  USING (parent_user_id = auth.uid());

CREATE POLICY "Parents can manage routine items"
  ON chore_routine_items FOR ALL
  USING (
    routine_id IN (
      SELECT id FROM chore_routines WHERE parent_user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can manage chore schedules"
  ON chore_schedules FOR ALL
  USING (parent_user_id = auth.uid());

CREATE POLICY "Parents can manage rotation members"
  ON chore_rotation_members FOR ALL
  USING (
    rotation_id IN (
      SELECT id FROM chore_rotations WHERE parent_user_id = auth.uid()
    )
  );

-- ============================================================================
-- 8. SYSTEM ROUTINE TEMPLATES (Optional starting routines)
-- ============================================================================

-- Create a system_chore_routine_templates table for pre-built routines
CREATE TABLE IF NOT EXISTS system_routine_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '📋',
  time_of_day TEXT CHECK (time_of_day IN ('morning', 'afternoon', 'evening', 'anytime')) DEFAULT 'anytime',
  category TEXT DEFAULT 'general',
  chore_names TEXT[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default routine templates
INSERT INTO system_routine_templates (name, description, icon, time_of_day, category, chore_names) VALUES
('Morning Routine', 'Start the day right with these essential tasks', '🌅', 'morning', 'daily',
  ARRAY['Make bed', 'Get dressed', 'Brush teeth', 'Eat breakfast', 'Pack school bag']),
('After School Routine', 'Transition from school to home', '🎒', 'afternoon', 'daily',
  ARRAY['Unpack school bag', 'Put away lunch box', 'Do homework', 'Have a snack']),
('Evening Routine', 'Wind down and prepare for tomorrow', '🌙', 'evening', 'daily',
  ARRAY['Take a bath/shower', 'Brush teeth', 'Put dirty clothes in hamper', 'Lay out clothes for tomorrow', 'Read a book']),
('Weekend Chores', 'Weekly household contributions', '🏠', 'anytime', 'weekly',
  ARRAY['Clean bedroom', 'Vacuum room', 'Take out trash', 'Help with laundry', 'Yard work']),
('Pet Care Routine', 'Take care of our furry friends', '🐾', 'anytime', 'daily',
  ARRAY['Feed pet', 'Fresh water', 'Walk dog', 'Clean litter box', 'Brush pet'])
ON CONFLICT DO NOTHING;
