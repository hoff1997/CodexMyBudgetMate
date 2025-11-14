-- Migration: Add Goals Feature to Envelopes
-- Description: Extends the envelopes table to support savings goals with milestones
-- This allows envelopes to function as either regular budgets or savings goals

-- Add goal-specific fields to envelopes table
ALTER TABLE public.envelopes
ADD COLUMN IF NOT EXISTS is_goal boolean DEFAULT false;

ALTER TABLE public.envelopes
ADD COLUMN IF NOT EXISTS goal_type text
  CHECK (goal_type IN ('savings', 'debt_payoff', 'purchase', 'emergency_fund', 'other'))
  DEFAULT NULL;

ALTER TABLE public.envelopes
ADD COLUMN IF NOT EXISTS goal_target_date date DEFAULT NULL;

ALTER TABLE public.envelopes
ADD COLUMN IF NOT EXISTS goal_completed_at timestamptz DEFAULT NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_envelopes_is_goal
  ON public.envelopes(is_goal)
  WHERE is_goal = true;

CREATE INDEX IF NOT EXISTS idx_envelopes_goal_type
  ON public.envelopes(goal_type)
  WHERE goal_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_envelopes_goal_target_date
  ON public.envelopes(goal_target_date)
  WHERE goal_target_date IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.envelopes.is_goal IS
  'Flag to indicate if this envelope represents a savings goal rather than a regular budget envelope';

COMMENT ON COLUMN public.envelopes.goal_type IS
  'Type of goal: savings (general savings), debt_payoff, purchase (specific item), emergency_fund, or other';

COMMENT ON COLUMN public.envelopes.goal_target_date IS
  'Target date by which the goal should be achieved';

COMMENT ON COLUMN public.envelopes.goal_completed_at IS
  'Timestamp when the goal was marked as completed (reached target amount)';

-- Create milestones table for goal progress tracking
CREATE TABLE IF NOT EXISTS public.envelope_goal_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  envelope_id uuid NOT NULL REFERENCES public.envelopes ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  milestone_name text NOT NULL,
  milestone_amount numeric(12,2) NOT NULL,
  milestone_date date,
  achieved_at timestamptz,
  notes text,
  sort_order int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on milestones table
ALTER TABLE public.envelope_goal_milestones ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for milestones
CREATE POLICY "Milestones accessible by owner"
  ON public.envelope_goal_milestones
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add indexes for milestones
CREATE INDEX IF NOT EXISTS idx_goal_milestones_envelope
  ON public.envelope_goal_milestones(envelope_id);

CREATE INDEX IF NOT EXISTS idx_goal_milestones_user
  ON public.envelope_goal_milestones(user_id);

CREATE INDEX IF NOT EXISTS idx_goal_milestones_sort_order
  ON public.envelope_goal_milestones(envelope_id, sort_order);

-- Add comment
COMMENT ON TABLE public.envelope_goal_milestones IS
  'Tracks milestones and progress checkpoints for savings goals';

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_envelope_goal_milestones_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_envelope_goal_milestones_updated_at
  BEFORE UPDATE ON public.envelope_goal_milestones
  FOR EACH ROW
  EXECUTE FUNCTION public.update_envelope_goal_milestones_updated_at();
