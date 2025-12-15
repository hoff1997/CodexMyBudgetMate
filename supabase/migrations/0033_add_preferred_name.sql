-- Migration: Add preferred_name to profiles
-- Description: Optional preferred name for personalized greetings

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS preferred_name TEXT;

COMMENT ON COLUMN profiles.preferred_name IS 'Optional preferred name for personalized greetings throughout the app.';
