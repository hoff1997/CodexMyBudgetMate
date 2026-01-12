-- Cookie Consent Preferences Table
-- For GDPR, PECR, and NZ Privacy Act compliance

CREATE TABLE cookie_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Strictly necessary cookies are always enabled (no user choice)
  strictly_necessary BOOLEAN DEFAULT true,
  -- Analytics cookies (e.g., anonymized usage tracking)
  analytics BOOLEAN DEFAULT false,
  -- Marketing cookies (e.g., personalized ads - not currently used)
  marketing BOOLEAN DEFAULT false,
  -- When consent was first given
  consent_date TIMESTAMPTZ DEFAULT NOW(),
  -- When preferences were last updated
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Ensure one row per user
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE cookie_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only see their own preferences
CREATE POLICY "Users can view own cookie preferences"
  ON cookie_preferences FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own preferences
CREATE POLICY "Users can insert own cookie preferences"
  ON cookie_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own preferences
CREATE POLICY "Users can update own cookie preferences"
  ON cookie_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_cookie_preferences_updated_at()
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

CREATE TRIGGER cookie_preferences_updated_at
  BEFORE UPDATE ON cookie_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_cookie_preferences_updated_at();

-- Index for faster lookups
CREATE INDEX idx_cookie_preferences_user_id ON cookie_preferences(user_id);
