-- Migration: Milestone Dismissals
-- Purpose: Track which milestone celebrations users have dismissed
-- This prevents showing the same celebration multiple times

-- Create the milestone_dismissals table
CREATE TABLE IF NOT EXISTS milestone_dismissals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  milestone_key TEXT NOT NULL,
  dismissed_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate dismissals for the same milestone
  UNIQUE(user_id, milestone_key)
);

-- Create index for fast lookups by user
CREATE INDEX idx_milestone_dismissals_user_id ON milestone_dismissals(user_id);

-- Enable RLS
ALTER TABLE milestone_dismissals ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see and manage their own dismissals
CREATE POLICY "Users can view own milestone dismissals"
  ON milestone_dismissals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own milestone dismissals"
  ON milestone_dismissals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own milestone dismissals"
  ON milestone_dismissals FOR DELETE
  USING (auth.uid() = user_id);

-- Comment explaining the milestone keys
COMMENT ON TABLE milestone_dismissals IS 'Tracks which milestone celebrations users have dismissed to prevent repeat celebrations';
COMMENT ON COLUMN milestone_dismissals.milestone_key IS 'Unique identifier for the milestone, e.g., starter_stash_complete, emergency_fund_25, debt_free';
