-- User Preferences table
-- Stores application-level settings per user (display, notifications, behaviour)

CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Display preferences
  currency_display TEXT NOT NULL DEFAULT 'NZD',
  date_format TEXT NOT NULL DEFAULT 'dd/MM/yyyy',
  number_format TEXT NOT NULL DEFAULT 'space',
  show_cents BOOLEAN NOT NULL DEFAULT true,

  -- Dashboard preferences
  dashboard_layout TEXT NOT NULL DEFAULT 'default',

  -- Email notification preferences
  email_weekly_summary BOOLEAN NOT NULL DEFAULT true,
  email_bill_reminders BOOLEAN NOT NULL DEFAULT true,
  email_low_balance BOOLEAN NOT NULL DEFAULT true,
  email_achievement_unlocked BOOLEAN NOT NULL DEFAULT true,

  -- Behaviour preferences
  auto_approve_rules BOOLEAN NOT NULL DEFAULT false,
  confirm_transfers BOOLEAN NOT NULL DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own preferences"
  ON public.user_preferences FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own preferences"
  ON public.user_preferences FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own preferences"
  ON public.user_preferences FOR UPDATE
  USING (user_id = auth.uid());

-- Index
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id
  ON public.user_preferences(user_id);

-- Auto-update timestamp trigger (reuses function from 0035_subscriptions.sql)
CREATE TRIGGER update_user_preferences_timestamp
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_timestamp();

-- Auto-create defaults for new users
-- Creates both user_preferences and subscriptions rows on profile creation
CREATE OR REPLACE FUNCTION create_user_defaults()
RETURNS TRIGGER AS $$
DECLARE
  free_plan_id UUID;
BEGIN
  -- Create user preferences with defaults
  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Create free subscription if none exists
  SELECT id INTO free_plan_id
  FROM public.subscription_plans
  WHERE slug = 'free'
  LIMIT 1;

  IF free_plan_id IS NOT NULL THEN
    INSERT INTO public.subscriptions (user_id, plan_id, status)
    VALUES (NEW.id, free_plan_id, 'inactive')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_created_create_defaults
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_user_defaults();
