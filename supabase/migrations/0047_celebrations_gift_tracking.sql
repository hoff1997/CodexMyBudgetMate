-- Migration: Celebrations Category with Gift Tracking System
-- Adds Celebrations category, gift recipients tracking, and dashboard reminders

-- =============================================================================
-- STEP 1: Add Celebrations category to default categories function
-- =============================================================================

-- Update the create_default_envelope_categories function to include Celebrations
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
    (p_user_id, 'Celebrations', '🎉', true, 8),
    (p_user_id, 'Entertainment', '🎬', true, 9),
    (p_user_id, 'Personal Care', '✨', true, 10),
    (p_user_id, 'Education', '📚', true, 11),
    (p_user_id, 'Insurance', '🛡️', true, 12),
    (p_user_id, 'Gifts & Donations', '🎁', true, 13),
    (p_user_id, 'Other', '📦', true, 14)
  ON CONFLICT (user_id, name) DO NOTHING;
END;
$$;

-- =============================================================================
-- STEP 2: Add is_celebration flag to envelopes table
-- =============================================================================

ALTER TABLE public.envelopes
ADD COLUMN IF NOT EXISTS is_celebration BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_envelopes_is_celebration
  ON public.envelopes(user_id, is_celebration)
  WHERE is_celebration = true;

COMMENT ON COLUMN public.envelopes.is_celebration IS 'True for celebration envelopes (Birthdays, Christmas, etc.) that can have gift recipients';

-- =============================================================================
-- STEP 3: Create gift_recipients table
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.gift_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  envelope_id UUID NOT NULL REFERENCES public.envelopes(id) ON DELETE CASCADE,

  -- Recipient details
  recipient_name TEXT NOT NULL,
  gift_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,

  -- Date tracking (for birthdays, anniversaries, etc.)
  celebration_date DATE,  -- NULL for non-date celebrations like Christmas

  -- Notes and metadata
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique recipient per envelope
  CONSTRAINT gift_recipients_envelope_name_unique UNIQUE(envelope_id, recipient_name)
);

-- Indexes for gift_recipients
CREATE INDEX IF NOT EXISTS idx_gift_recipients_user_id
  ON public.gift_recipients(user_id);
CREATE INDEX IF NOT EXISTS idx_gift_recipients_envelope_id
  ON public.gift_recipients(envelope_id);
CREATE INDEX IF NOT EXISTS idx_gift_recipients_celebration_date
  ON public.gift_recipients(celebration_date)
  WHERE celebration_date IS NOT NULL;

-- RLS policies for gift_recipients
ALTER TABLE public.gift_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own gift recipients"
  ON public.gift_recipients FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own gift recipients"
  ON public.gift_recipients FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own gift recipients"
  ON public.gift_recipients FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own gift recipients"
  ON public.gift_recipients FOR DELETE
  USING (auth.uid() = user_id);

-- Updated_at trigger for gift_recipients
CREATE OR REPLACE FUNCTION update_gift_recipients_updated_at()
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

DROP TRIGGER IF EXISTS gift_recipients_updated_at ON public.gift_recipients;
CREATE TRIGGER gift_recipients_updated_at
  BEFORE UPDATE ON public.gift_recipients
  FOR EACH ROW
  EXECUTE FUNCTION update_gift_recipients_updated_at();

COMMENT ON TABLE public.gift_recipients IS 'Tracks gift recipients for celebration envelopes (Birthdays, Christmas, etc.)';

-- =============================================================================
-- STEP 4: Create celebration_reminders table
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.celebration_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gift_recipient_id UUID NOT NULL REFERENCES public.gift_recipients(id) ON DELETE CASCADE,

  -- Reminder details
  reminder_date DATE NOT NULL,  -- Calculated from celebration_date - reminder_weeks
  celebration_date DATE NOT NULL,
  recipient_name TEXT NOT NULL,
  gift_amount NUMERIC(10, 2),
  envelope_id UUID REFERENCES public.envelopes(id) ON DELETE CASCADE,

  -- Status
  is_dismissed BOOLEAN DEFAULT false,
  dismissed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- One reminder per recipient per year
  CONSTRAINT celebration_reminders_recipient_date_unique UNIQUE(gift_recipient_id, celebration_date)
);

-- Indexes for celebration_reminders
CREATE INDEX IF NOT EXISTS idx_celebration_reminders_user_id
  ON public.celebration_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_celebration_reminders_reminder_date
  ON public.celebration_reminders(reminder_date);
CREATE INDEX IF NOT EXISTS idx_celebration_reminders_active
  ON public.celebration_reminders(user_id, reminder_date)
  WHERE is_dismissed = false;

-- RLS policies for celebration_reminders
ALTER TABLE public.celebration_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own celebration reminders"
  ON public.celebration_reminders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own celebration reminders"
  ON public.celebration_reminders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own celebration reminders"
  ON public.celebration_reminders FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own celebration reminders"
  ON public.celebration_reminders FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.celebration_reminders IS 'Dashboard reminders for upcoming celebrations based on gift recipient dates';

-- =============================================================================
-- STEP 5: Add celebration reminder settings to profiles
-- =============================================================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS celebration_reminder_weeks INTEGER DEFAULT 3
  CHECK (celebration_reminder_weeks >= 0 AND celebration_reminder_weeks <= 4);

COMMENT ON COLUMN public.profiles.celebration_reminder_weeks IS 'Weeks before celebration to show reminder: 0=off, 1-4=weeks before';

-- =============================================================================
-- STEP 6: Create envelope_templates table for celebration templates
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.envelope_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category_name TEXT NOT NULL,  -- Links to envelope_categories.name
  subtype TEXT NOT NULL CHECK (subtype IN ('bill', 'spending', 'savings', 'goal', 'tracking')),
  icon TEXT NOT NULL,
  description TEXT,
  is_celebration BOOLEAN DEFAULT false,
  requires_date BOOLEAN DEFAULT false,  -- True for birthdays/anniversaries where each recipient needs a date
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT envelope_templates_name_unique UNIQUE(name)
);

-- Insert celebration envelope templates
INSERT INTO public.envelope_templates (name, category_name, subtype, icon, description, is_celebration, requires_date, display_order)
VALUES
  ('Birthdays', 'Celebrations', 'savings', '🎂', 'Budget for birthday gifts throughout the year', true, true, 1),
  ('Christmas', 'Celebrations', 'savings', '🎄', 'Budget for Christmas gifts and celebrations', true, false, 2),
  ('Easter', 'Celebrations', 'savings', '🐰', 'Budget for Easter celebrations and gifts', true, false, 3),
  ('Religious Festivals', 'Celebrations', 'savings', '🕯️', 'Budget for religious celebrations (customise name later)', true, false, 4),
  ('Mother''s Day', 'Celebrations', 'savings', '🌸', 'Budget for Mother''s Day gifts', true, false, 5),
  ('Father''s Day', 'Celebrations', 'savings', '👔', 'Budget for Father''s Day gifts', true, false, 6),
  ('Anniversaries', 'Celebrations', 'savings', '💍', 'Budget for anniversary gifts and celebrations', true, true, 7),
  ('Weddings & Gifts', 'Celebrations', 'savings', '💒', 'Budget for wedding gifts throughout the year', true, false, 8)
ON CONFLICT (name) DO NOTHING;

COMMENT ON TABLE public.envelope_templates IS 'Pre-defined envelope templates for onboarding, including celebration types';

-- =============================================================================
-- STEP 7: Function to generate reminders for a user
-- =============================================================================

CREATE OR REPLACE FUNCTION generate_celebration_reminders(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reminder_weeks INTEGER;
  reminders_created INTEGER := 0;
  recipient RECORD;
  reminder_date DATE;
  this_year_date DATE;
  next_year_date DATE;
  target_date DATE;
BEGIN
  -- Get user's reminder preference
  SELECT COALESCE(celebration_reminder_weeks, 3) INTO reminder_weeks
  FROM profiles WHERE id = p_user_id;

  -- If reminders are disabled, return early
  IF reminder_weeks = 0 THEN
    RETURN 0;
  END IF;

  -- Delete existing undismissed reminders for this user (to regenerate)
  DELETE FROM celebration_reminders
  WHERE user_id = p_user_id AND is_dismissed = false;

  -- Loop through all gift recipients with dates
  FOR recipient IN
    SELECT gr.id, gr.recipient_name, gr.gift_amount, gr.celebration_date, gr.envelope_id
    FROM gift_recipients gr
    WHERE gr.user_id = p_user_id AND gr.celebration_date IS NOT NULL
  LOOP
    -- Calculate the celebration date for this year and next year
    this_year_date := DATE(EXTRACT(YEAR FROM CURRENT_DATE) || '-' ||
                          LPAD(EXTRACT(MONTH FROM recipient.celebration_date)::TEXT, 2, '0') || '-' ||
                          LPAD(EXTRACT(DAY FROM recipient.celebration_date)::TEXT, 2, '0'));
    next_year_date := this_year_date + INTERVAL '1 year';

    -- Use this year's date if it's in the future, otherwise use next year
    IF this_year_date >= CURRENT_DATE THEN
      target_date := this_year_date;
    ELSE
      target_date := next_year_date;
    END IF;

    -- Calculate reminder date
    reminder_date := target_date - (reminder_weeks * 7);

    -- Insert reminder
    INSERT INTO celebration_reminders (
      user_id, gift_recipient_id, reminder_date, celebration_date,
      recipient_name, gift_amount, envelope_id
    ) VALUES (
      p_user_id, recipient.id, reminder_date, target_date,
      recipient.recipient_name, recipient.gift_amount, recipient.envelope_id
    )
    ON CONFLICT (gift_recipient_id, celebration_date) DO UPDATE
    SET reminder_date = EXCLUDED.reminder_date,
        gift_amount = EXCLUDED.gift_amount,
        recipient_name = EXCLUDED.recipient_name;

    reminders_created := reminders_created + 1;
  END LOOP;

  RETURN reminders_created;
END;
$$;

COMMENT ON FUNCTION generate_celebration_reminders IS 'Generates or updates celebration reminders for a user based on their gift recipients and reminder preferences';

-- =============================================================================
-- STEP 8: Add Celebrations category to existing users
-- =============================================================================

-- Insert Celebrations category for all existing users who don't have it
INSERT INTO envelope_categories (user_id, name, icon, is_system, display_order)
SELECT p.id, 'Celebrations', '🎉', true, 8
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM envelope_categories ec
  WHERE ec.user_id = p.id AND ec.name = 'Celebrations'
)
ON CONFLICT (user_id, name) DO NOTHING;
