-- Migration: Onboarding & Gamification System
-- Description: Adds persona-based onboarding, achievement tracking, and gamification features
-- Culture: Always empower, never shame. Celebrate progress and forward movement.

-- ============================================
-- PROFILES TABLE ENHANCEMENTS
-- ============================================

-- Add onboarding and persona fields to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS user_persona text
  CHECK (user_persona IN ('beginner', 'optimiser', 'wealth_builder'))
  DEFAULT NULL;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS onboarding_step int DEFAULT 0;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS last_activity_context jsonb DEFAULT '{}';

-- Add comments
COMMENT ON COLUMN public.profiles.user_persona IS
  'User persona selected during onboarding: beginner, optimiser, or wealth_builder. Influences templates and guidance level.';

COMMENT ON COLUMN public.profiles.onboarding_completed IS
  'Flag indicating whether user has completed the onboarding flow';

COMMENT ON COLUMN public.profiles.onboarding_step IS
  'Current step in onboarding process (0 = not started, 5 = completed)';

COMMENT ON COLUMN public.profiles.last_activity_context IS
  'Tracks user last action for context-aware next steps. Format: {action: string, timestamp: ISO8601, metadata: object}';

-- ============================================
-- USER ACHIEVEMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  achievement_key text NOT NULL,
  achievement_category text NOT NULL CHECK (achievement_category IN ('getting_started', 'mastery', 'goals', 'debt', 'streaks', 'community')),
  points int DEFAULT 0,
  earned_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}',
  discord_shared boolean DEFAULT false,
  discord_shared_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_key)
);

-- Enable RLS
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Achievements accessible by owner"
  ON public.user_achievements
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_user_achievements_user
  ON public.user_achievements(user_id);

CREATE INDEX IF NOT EXISTS idx_user_achievements_category
  ON public.user_achievements(achievement_category);

CREATE INDEX IF NOT EXISTS idx_user_achievements_earned_at
  ON public.user_achievements(earned_at DESC);

-- Add comment
COMMENT ON TABLE public.user_achievements IS
  'Tracks badges and achievements earned by users. Gamification system with empowering, positive messaging. Supports Discord integration.';

COMMENT ON COLUMN public.user_achievements.achievement_key IS
  'Unique identifier for the achievement (e.g., "first_envelope", "goal_achieved")';

COMMENT ON COLUMN public.user_achievements.achievement_category IS
  'Category: getting_started, mastery, goals, debt, streaks, community';

COMMENT ON COLUMN public.user_achievements.points IS
  'Points awarded for earning this achievement (used for progress tracking)';

COMMENT ON COLUMN public.user_achievements.metadata IS
  'Additional data about achievement earning (e.g., {envelope_count: 5, goal_amount: 1000})';

-- ============================================
-- USER PROGRESS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  first_used_at timestamptz NOT NULL DEFAULT now(),
  usage_count int DEFAULT 1,
  last_used_at timestamptz NOT NULL DEFAULT now(),
  unlocked boolean DEFAULT true,
  unlocked_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, feature_key)
);

-- Enable RLS
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Progress accessible by owner"
  ON public.user_progress
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_user_progress_user
  ON public.user_progress(user_id);

CREATE INDEX IF NOT EXISTS idx_user_progress_feature
  ON public.user_progress(feature_key);

-- Add comment
COMMENT ON TABLE public.user_progress IS
  'Tracks user interaction with features for progressive discovery and analytics. User-paced unlocking (no time gates).';

COMMENT ON COLUMN public.user_progress.feature_key IS
  'Feature identifier (e.g., "envelopes", "goals", "reconciliation", "debt_management")';

COMMENT ON COLUMN public.user_progress.usage_count IS
  'Number of times user has interacted with this feature';

COMMENT ON COLUMN public.user_progress.unlocked IS
  'Whether the feature is unlocked for the user (user-paced, based on actions not time)';

COMMENT ON COLUMN public.user_progress.unlocked_at IS
  'When the feature was unlocked for the user';

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_user_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_progress_updated_at
  BEFORE UPDATE ON public.user_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_progress_updated_at();

-- ============================================
-- DEMO MODE SESSIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.demo_mode_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  actions_taken int DEFAULT 0,
  converted_to_real boolean DEFAULT false,
  converted_at timestamptz,
  session_metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.demo_mode_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Demo sessions accessible by owner"
  ON public.demo_mode_sessions
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_demo_sessions_user
  ON public.demo_mode_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_demo_sessions_active
  ON public.demo_mode_sessions(user_id, ended_at)
  WHERE ended_at IS NULL;

-- Add comment
COMMENT ON TABLE public.demo_mode_sessions IS
  'Tracks demo mode usage for conversion analytics and prompts. Helps prevent churn with strong hooks to convert to real data.';

COMMENT ON COLUMN public.demo_mode_sessions.actions_taken IS
  'Count of actions taken in demo mode (used to trigger conversion prompts)';

COMMENT ON COLUMN public.demo_mode_sessions.session_metadata IS
  'Tracks what features were explored, data created, etc.';

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_demo_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_demo_sessions_updated_at
  BEFORE UPDATE ON public.demo_mode_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_demo_sessions_updated_at();

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to track feature usage (upserts)
CREATE OR REPLACE FUNCTION public.track_feature_usage(
  p_user_id uuid,
  p_feature_key text,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.user_progress (user_id, feature_key, metadata, first_used_at, last_used_at, usage_count)
  VALUES (p_user_id, p_feature_key, p_metadata, now(), now(), 1)
  ON CONFLICT (user_id, feature_key)
  DO UPDATE SET
    usage_count = user_progress.usage_count + 1,
    last_used_at = now(),
    metadata = COALESCE(p_metadata, user_progress.metadata);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to award achievement (returns true if newly earned)
CREATE OR REPLACE FUNCTION public.award_achievement(
  p_user_id uuid,
  p_achievement_key text,
  p_category text,
  p_points int DEFAULT 10,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS boolean AS $$
DECLARE
  v_already_earned boolean;
BEGIN
  -- Check if already earned
  SELECT EXISTS (
    SELECT 1 FROM public.user_achievements
    WHERE user_id = p_user_id
    AND achievement_key = p_achievement_key
  ) INTO v_already_earned;

  IF v_already_earned THEN
    RETURN false; -- Already earned
  END IF;

  -- Award achievement
  INSERT INTO public.user_achievements (user_id, achievement_key, achievement_category, points, metadata)
  VALUES (p_user_id, p_achievement_key, p_category, p_points, p_metadata);

  RETURN true; -- Newly earned
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user total achievement points
CREATE OR REPLACE FUNCTION public.get_user_achievement_points(p_user_id uuid)
RETURNS int AS $$
DECLARE
  v_total_points int;
BEGIN
  SELECT COALESCE(SUM(points), 0)
  INTO v_total_points
  FROM public.user_achievements
  WHERE user_id = p_user_id;

  RETURN v_total_points;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to unlock feature for user
CREATE OR REPLACE FUNCTION public.unlock_feature(
  p_user_id uuid,
  p_feature_key text,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.user_progress (user_id, feature_key, unlocked, unlocked_at, metadata)
  VALUES (p_user_id, p_feature_key, true, now(), p_metadata)
  ON CONFLICT (user_id, feature_key)
  DO UPDATE SET
    unlocked = true,
    unlocked_at = COALESCE(user_progress.unlocked_at, now()),
    metadata = COALESCE(p_metadata, user_progress.metadata);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- INITIAL DATA
-- ============================================

-- No initial data needed - achievements are defined in application code
-- Culture: All achievement messaging uses positive, empowering language
