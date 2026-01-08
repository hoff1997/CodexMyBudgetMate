-- Migration: Life Module Settings
-- Description: Add user preferences table for Life module settings

-- Create life_settings table for user preferences
CREATE TABLE IF NOT EXISTS life_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Shopping preferences
  default_supermarket_id UUID REFERENCES supermarkets(id) ON DELETE SET NULL,
  default_shopping_categories TEXT[] DEFAULT ARRAY['Fruit & Veg', 'Meat & Seafood', 'Dairy', 'Bakery', 'Pantry', 'Frozen', 'Beverages', 'Household', 'Other'],
  auto_categorize_items BOOLEAN DEFAULT true,
  show_price_estimates BOOLEAN DEFAULT true,

  -- Meal planning preferences
  meal_plan_start_day TEXT DEFAULT 'monday' CHECK (meal_plan_start_day IN ('sunday', 'monday')),
  default_servings INTEGER DEFAULT 4,
  show_nutrition_info BOOLEAN DEFAULT false,

  -- Birthday/Celebration preferences
  celebration_reminder_weeks INTEGER DEFAULT 2 CHECK (celebration_reminder_weeks >= 0 AND celebration_reminder_weeks <= 8),
  default_gift_budget DECIMAL(10,2) DEFAULT 50.00,
  link_gifts_to_envelope BOOLEAN DEFAULT true,

  -- Recipe preferences
  default_recipe_servings INTEGER DEFAULT 4,
  show_cooking_tips BOOLEAN DEFAULT true,

  -- Sharing preferences
  share_lists_with_partner BOOLEAN DEFAULT true,
  share_recipes_with_partner BOOLEAN DEFAULT true,
  share_calendar_with_partner BOOLEAN DEFAULT true,

  -- Notification preferences
  notify_shopping_reminders BOOLEAN DEFAULT true,
  notify_meal_plan_reminders BOOLEAN DEFAULT true,
  notify_birthday_reminders BOOLEAN DEFAULT true,
  notify_chore_completions BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE life_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own settings
CREATE POLICY "Users can view own life settings"
  ON life_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own life settings"
  ON life_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own life settings"
  ON life_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Create function to auto-create settings on first access
CREATE OR REPLACE FUNCTION get_or_create_life_settings(p_user_id UUID)
RETURNS life_settings AS $$
DECLARE
  settings life_settings;
BEGIN
  -- Try to get existing settings
  SELECT * INTO settings FROM life_settings WHERE user_id = p_user_id;

  -- If no settings exist, create default ones
  IF NOT FOUND THEN
    INSERT INTO life_settings (user_id)
    VALUES (p_user_id)
    RETURNING * INTO settings;
  END IF;

  RETURN settings;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update profiles table to sync celebration_reminder_weeks
-- (This field already exists in profiles, we'll keep both in sync)
CREATE OR REPLACE FUNCTION sync_celebration_reminder_weeks()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.celebration_reminder_weeks IS DISTINCT FROM OLD.celebration_reminder_weeks THEN
    UPDATE profiles
    SET celebration_reminder_weeks = NEW.celebration_reminder_weeks
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_celebration_reminder_weeks_trigger
AFTER UPDATE ON life_settings
FOR EACH ROW
EXECUTE FUNCTION sync_celebration_reminder_weeks();

-- Create index for fast lookups
CREATE INDEX idx_life_settings_user_id ON life_settings(user_id);

-- Add comments for documentation
COMMENT ON TABLE life_settings IS 'User preferences for the Life module features';
COMMENT ON COLUMN life_settings.default_supermarket_id IS 'Preferred supermarket for shopping lists';
COMMENT ON COLUMN life_settings.default_shopping_categories IS 'Custom shopping category/aisle order';
COMMENT ON COLUMN life_settings.auto_categorize_items IS 'Whether to auto-suggest categories for shopping items';
COMMENT ON COLUMN life_settings.meal_plan_start_day IS 'Week start day for meal planner (Sunday or Monday)';
COMMENT ON COLUMN life_settings.celebration_reminder_weeks IS 'How many weeks before birthday to show reminder (0 = off)';
COMMENT ON COLUMN life_settings.share_lists_with_partner IS 'Whether shopping/todo lists are visible to partner';
