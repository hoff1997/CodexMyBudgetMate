-- Add user preferences for navigation
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS default_page TEXT DEFAULT '/reconcile',
ADD COLUMN IF NOT EXISTS show_onboarding_menu BOOLEAN DEFAULT true;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_default_page ON profiles(default_page);

-- Update existing users who have completed onboarding
UPDATE profiles
SET show_onboarding_menu = false
WHERE onboarding_completed = true;
