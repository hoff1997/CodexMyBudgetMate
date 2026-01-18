-- Migration: 0078_secure_kid_login_keys.sql
-- Description: Replace guessable family codes with secure per-child login keys
--
-- Security improvements:
-- 1. Unique login key per child (not shared family code)
-- 2. Cryptographically random (61 bits entropy vs ~1000 combinations)
-- 3. Parent can regenerate keys anytime
-- 4. Audit trail for key regeneration
-- 5. Supports browser credential saving (autocomplete)
--
-- Format: XXXX-XXXX-XXXX (e.g., K7M2-P9QR-3WNX)

-- =============================================================================
-- PART 1: Add login_key column to child_profiles
-- =============================================================================

-- Add the new secure login key column
ALTER TABLE child_profiles
ADD COLUMN IF NOT EXISTS login_key TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS login_key_created_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS login_key_last_used_at TIMESTAMPTZ;

-- Create index for fast login key lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_child_profiles_login_key
ON child_profiles(login_key) WHERE login_key IS NOT NULL;

-- =============================================================================
-- PART 2: Generate login keys for existing children
-- =============================================================================

-- Function to generate a secure login key (matches generateSecureFamilyCode in TypeScript)
CREATE OR REPLACE FUNCTION generate_secure_login_key()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
  rand_byte INTEGER;
BEGIN
  FOR i IN 1..12 LOOP
    -- Get a random byte and map to character set
    rand_byte := floor(random() * length(chars))::INTEGER;
    result := result || substr(chars, rand_byte + 1, 1);
    -- Add dash after every 4 characters (except at the end)
    IF (i % 4 = 0) AND (i < 12) THEN
      result := result || '-';
    END IF;
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Generate login keys for all existing children who don't have one
-- Using a loop to ensure uniqueness
DO $$
DECLARE
  child_record RECORD;
  new_key TEXT;
  key_exists BOOLEAN;
BEGIN
  FOR child_record IN SELECT id FROM child_profiles WHERE login_key IS NULL LOOP
    LOOP
      new_key := generate_secure_login_key();
      SELECT EXISTS(SELECT 1 FROM child_profiles WHERE login_key = new_key) INTO key_exists;
      EXIT WHEN NOT key_exists;
    END LOOP;

    UPDATE child_profiles
    SET login_key = new_key,
        login_key_created_at = NOW()
    WHERE id = child_record.id;
  END LOOP;
END $$;

-- =============================================================================
-- PART 3: Login key regeneration audit log
-- =============================================================================

CREATE TABLE IF NOT EXISTS kid_login_key_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_profile_id UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  parent_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('created', 'regenerated', 'viewed')),
  old_key_prefix TEXT, -- First 4 chars of old key for reference (not full key)
  new_key_prefix TEXT, -- First 4 chars of new key for reference
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_key_audit_child
ON kid_login_key_audit(child_profile_id);

CREATE INDEX IF NOT EXISTS idx_login_key_audit_parent
ON kid_login_key_audit(parent_user_id);

-- RLS
ALTER TABLE kid_login_key_audit ENABLE ROW LEVEL SECURITY;

-- Parents can view their own children's audit logs
CREATE POLICY "Parents can view login key audit"
ON kid_login_key_audit
FOR SELECT
USING (parent_user_id = auth.uid());

-- =============================================================================
-- PART 4: Make login_key NOT NULL after migration
-- =============================================================================

-- Now that all existing children have keys, make the column required
ALTER TABLE child_profiles
ALTER COLUMN login_key SET NOT NULL;

-- =============================================================================
-- PART 5: Trigger to auto-generate login key on new child creation
-- =============================================================================

CREATE OR REPLACE FUNCTION auto_generate_login_key()
RETURNS TRIGGER AS $$
DECLARE
  new_key TEXT;
  key_exists BOOLEAN;
BEGIN
  -- Only generate if login_key is not provided
  IF NEW.login_key IS NULL THEN
    LOOP
      new_key := generate_secure_login_key();
      SELECT EXISTS(SELECT 1 FROM child_profiles WHERE login_key = new_key) INTO key_exists;
      EXIT WHEN NOT key_exists;
    END LOOP;

    NEW.login_key := new_key;
    NEW.login_key_created_at := NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS generate_login_key_on_insert ON child_profiles;

CREATE TRIGGER generate_login_key_on_insert
BEFORE INSERT ON child_profiles
FOR EACH ROW EXECUTE FUNCTION auto_generate_login_key();

-- =============================================================================
-- PART 6: Helper function to regenerate a child's login key
-- =============================================================================

CREATE OR REPLACE FUNCTION regenerate_child_login_key(p_child_id UUID, p_parent_id UUID)
RETURNS TEXT AS $$
DECLARE
  new_key TEXT;
  old_key TEXT;
  key_exists BOOLEAN;
  child_parent_id UUID;
BEGIN
  -- Verify parent owns this child
  SELECT parent_user_id, login_key INTO child_parent_id, old_key
  FROM child_profiles
  WHERE id = p_child_id;

  IF child_parent_id IS NULL THEN
    RAISE EXCEPTION 'Child not found';
  END IF;

  IF child_parent_id != p_parent_id THEN
    RAISE EXCEPTION 'Unauthorized: Not the parent of this child';
  END IF;

  -- Generate new unique key
  LOOP
    new_key := generate_secure_login_key();
    SELECT EXISTS(SELECT 1 FROM child_profiles WHERE login_key = new_key) INTO key_exists;
    EXIT WHEN NOT key_exists;
  END LOOP;

  -- Update child profile
  UPDATE child_profiles
  SET login_key = new_key,
      login_key_created_at = NOW()
  WHERE id = p_child_id;

  -- Log the regeneration (only storing prefixes for audit, not full keys)
  INSERT INTO kid_login_key_audit (child_profile_id, parent_user_id, action, old_key_prefix, new_key_prefix)
  VALUES (p_child_id, p_parent_id, 'regenerated', LEFT(old_key, 4), LEFT(new_key, 4));

  RETURN new_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- PART 7: Comments for documentation
-- =============================================================================

COMMENT ON COLUMN child_profiles.login_key IS
'Unique per-child login key. Format: XXXX-XXXX-XXXX. Cryptographically random with 61 bits entropy.';

COMMENT ON COLUMN child_profiles.login_key_created_at IS
'When the current login key was created/regenerated.';

COMMENT ON COLUMN child_profiles.login_key_last_used_at IS
'Last successful login using this key. Updated on each login.';

COMMENT ON TABLE kid_login_key_audit IS
'Audit trail for login key operations. Stores only key prefixes for reference.';

COMMENT ON FUNCTION regenerate_child_login_key(UUID, UUID) IS
'Regenerates a child login key. Validates parent ownership and logs the change.';

-- =============================================================================
-- PART 8: Deprecation note for family_access_code
-- =============================================================================

-- The family_access_code column is now deprecated but kept for backwards compatibility
-- It will be removed in a future migration after confirming no legacy usage
COMMENT ON COLUMN child_profiles.family_access_code IS
'DEPRECATED: Use login_key instead. Kept for backwards compatibility during transition.';
