-- Migration: 0076_akahu_oauth_states.sql
-- Description: Add table for Akahu OAuth state storage (CSRF protection)
-- Required for: OAuth flow in /api/akahu/oauth/start and /api/akahu/oauth/callback

-- Akahu OAuth state storage for CSRF protection
CREATE TABLE IF NOT EXISTS akahu_oauth_states (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  state TEXT NOT NULL,
  origin TEXT, -- 'onboarding' or 'settings' - where to redirect after OAuth
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Enable Row Level Security
ALTER TABLE akahu_oauth_states ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own OAuth states
CREATE POLICY "Users can manage their own OAuth states"
  ON akahu_oauth_states
  FOR ALL
  USING (auth.uid() = user_id);

-- Create unique index on state for faster lookups during callback verification
CREATE UNIQUE INDEX idx_akahu_oauth_states_state ON akahu_oauth_states(state);

-- Add comment for documentation
COMMENT ON TABLE akahu_oauth_states IS 'Temporary storage for OAuth state tokens used in Akahu bank connection flow. States expire after 10 minutes.';
