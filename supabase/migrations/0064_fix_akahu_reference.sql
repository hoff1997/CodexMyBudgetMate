-- ============================================================================
-- Migration: 0064_fix_akahu_reference.sql
--
-- Adds account isolation support to child_bank_accounts.
-- This allows parents to optionally view their child's accounts in their own
-- budget views (disabled by default for privacy).
-- ============================================================================

-- Add show_in_parent_budget to child_bank_accounts for optional parent visibility
ALTER TABLE child_bank_accounts ADD COLUMN IF NOT EXISTS show_in_parent_budget BOOLEAN DEFAULT false;

COMMENT ON COLUMN child_bank_accounts.show_in_parent_budget IS 'If true, parent can see this child account in their own budget views. Default false for privacy.';

-- Also add to teen_linked_accounts if it exists (from 0055 migration)
-- This is conditional because 0055 may not have been applied yet
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'teen_linked_accounts'
  ) THEN
    EXECUTE 'ALTER TABLE teen_linked_accounts ADD COLUMN IF NOT EXISTS child_envelope_type TEXT CHECK (child_envelope_type IN (''spend'', ''save'', ''invest'', ''give''))';
    EXECUTE 'ALTER TABLE teen_linked_accounts ADD COLUMN IF NOT EXISTS show_in_parent_budget BOOLEAN DEFAULT false';
    RAISE NOTICE 'Account isolation columns added to teen_linked_accounts';
  ELSE
    RAISE NOTICE 'teen_linked_accounts does not exist - skipping (will be created if 0055 migration runs later)';
  END IF;
END $$;

-- Verification
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'child_bank_accounts'
    AND column_name = 'show_in_parent_budget'
  ) THEN
    RAISE NOTICE 'Account isolation column added to child_bank_accounts successfully';
  END IF;
END $$;
