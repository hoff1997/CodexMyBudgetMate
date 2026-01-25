-- Waitlist System Migration
-- Implements waitlist functionality for collecting pre-launch signups

-- =============================================================================
-- Waitlist Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS waitlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  name TEXT,
  source TEXT DEFAULT 'website',
  referral_code TEXT UNIQUE,
  referred_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  converted_at TIMESTAMPTZ,
  notes TEXT,
  CONSTRAINT waitlist_email_unique UNIQUE (email)
);

COMMENT ON TABLE waitlist IS 'Pre-launch waitlist signups';
COMMENT ON COLUMN waitlist.email IS 'User email address (required, unique)';
COMMENT ON COLUMN waitlist.name IS 'User name (optional)';
COMMENT ON COLUMN waitlist.source IS 'Where the signup came from (hero, cta-section, footer, etc)';
COMMENT ON COLUMN waitlist.referral_code IS 'Unique referral code for this user';
COMMENT ON COLUMN waitlist.referred_by IS 'Referral code of the person who referred this user';
COMMENT ON COLUMN waitlist.created_at IS 'When the user joined the waitlist';
COMMENT ON COLUMN waitlist.converted_at IS 'When the user converted to a full account';
COMMENT ON COLUMN waitlist.notes IS 'Admin notes about this signup';

-- =============================================================================
-- Indexes
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist(email);
CREATE INDEX IF NOT EXISTS idx_waitlist_created ON waitlist(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_waitlist_source ON waitlist(source);
CREATE INDEX IF NOT EXISTS idx_waitlist_referral_code ON waitlist(referral_code);

-- =============================================================================
-- Row Level Security
-- =============================================================================

ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Anyone can join the waitlist (public insert)
CREATE POLICY "Anyone can join waitlist" ON waitlist
  FOR INSERT
  WITH CHECK (true);

-- Only authenticated users can view waitlist (admin only)
CREATE POLICY "Authenticated users can view waitlist" ON waitlist
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only authenticated users can update (for marking conversions)
CREATE POLICY "Authenticated users can update waitlist" ON waitlist
  FOR UPDATE
  USING (auth.role() = 'authenticated');
