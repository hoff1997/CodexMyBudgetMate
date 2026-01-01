-- Migration: 0041_envelope_archive_system.sql
-- Add archive functionality to envelopes

-- Add archive columns to envelopes
ALTER TABLE envelopes
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archive_reason TEXT;

-- Index for performance (querying non-archived envelopes)
CREATE INDEX IF NOT EXISTS idx_envelopes_archived ON envelopes(user_id, is_archived)
WHERE is_archived = false;

-- Index for archived envelopes page
CREATE INDEX IF NOT EXISTS idx_envelopes_archived_at ON envelopes(user_id, archived_at)
WHERE is_archived = true;
