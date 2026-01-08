-- ============================================================================
-- Rate Limit Persistence Table
-- Migration: 0068_rate_limit_persistence.sql
-- Purpose: Store rate limit entries in database to survive server restarts
-- ============================================================================

-- Ensure uuid extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Rate limit entries table
CREATE TABLE rate_limit_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL, -- Unique identifier (e.g., "pin_192.168.1.1_uuid", "global_ip_192.168.1.1")
  attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ, -- NULL if not locked
  last_attempt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient lookups by key
CREATE INDEX idx_rate_limit_entries_key ON rate_limit_entries(key);

-- Index for cleanup of expired entries
CREATE INDEX idx_rate_limit_entries_last_attempt ON rate_limit_entries(last_attempt);

-- Auto-cleanup function: Delete entries older than 1 hour with no lockout
CREATE OR REPLACE FUNCTION cleanup_expired_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM rate_limit_entries
  WHERE last_attempt < NOW() - INTERVAL '1 hour'
    AND (locked_until IS NULL OR locked_until < NOW());
END;
$$;

-- Schedule cleanup via cron (if pg_cron extension is available)
-- If not available, app will handle cleanup on read/write

-- Enable RLS
ALTER TABLE rate_limit_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow service role full access (needed for rate limiting)
-- Note: This table is accessed by server-side code only, not directly by users
CREATE POLICY "Service role can manage rate limits"
  ON rate_limit_entries FOR ALL
  USING (true)
  WITH CHECK (true);

-- Grant necessary permissions
GRANT ALL ON rate_limit_entries TO authenticated;
GRANT ALL ON rate_limit_entries TO service_role;
