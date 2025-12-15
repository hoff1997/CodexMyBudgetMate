-- Migration: Add date_of_birth to profiles
-- Description: Optional DOB field for anonymous demographic analysis

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS date_of_birth DATE;

COMMENT ON COLUMN profiles.date_of_birth IS 'Optional. Used for anonymous user demographic analysis only.';
