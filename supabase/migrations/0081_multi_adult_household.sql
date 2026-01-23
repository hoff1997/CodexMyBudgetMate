-- Multi-Adult Household Support
-- Allows two adults per household with family account linking via email

-- ============================================
-- 1. HOUSEHOLD TABLE
-- ============================================
-- A household groups adults and children together
CREATE TABLE IF NOT EXISTS households (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL DEFAULT 'Our Household',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE households IS 'Groups family members (adults and children) together';

-- ============================================
-- 2. HOUSEHOLD MEMBERS TABLE
-- ============================================
-- Links auth.users to households with roles
CREATE TABLE IF NOT EXISTS household_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'partner', 'member')),
  display_name TEXT, -- Optional display name within household
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  invited_by UUID REFERENCES auth.users(id),
  UNIQUE(household_id, user_id)
);

CREATE INDEX idx_household_members_user ON household_members(user_id);
CREATE INDEX idx_household_members_household ON household_members(household_id);

COMMENT ON TABLE household_members IS 'Links users to households with their role';
COMMENT ON COLUMN household_members.role IS 'owner: created the household, partner: full co-management, member: limited access';

-- ============================================
-- 3. HOUSEHOLD INVITATIONS TABLE
-- ============================================
-- Pending invitations to join a household
CREATE TABLE IF NOT EXISTS household_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  role TEXT NOT NULL DEFAULT 'partner' CHECK (role IN ('partner', 'member')),
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_household_invitations_email ON household_invitations(email);
CREATE INDEX idx_household_invitations_token ON household_invitations(token);
CREATE INDEX idx_household_invitations_status ON household_invitations(status);

COMMENT ON TABLE household_invitations IS 'Pending invitations to join a household';

-- ============================================
-- 4. LINK CHILD PROFILES TO HOUSEHOLDS
-- ============================================
-- Add household_id to child_profiles for children to be part of a household
ALTER TABLE child_profiles
ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_child_profiles_household ON child_profiles(household_id);

COMMENT ON COLUMN child_profiles.household_id IS 'Links child to the household (shared between partners)';

-- ============================================
-- 5. ADD HOUSEHOLD SHARING PREFERENCES TO PROFILES
-- ============================================
-- Partner sharing preferences (what each partner shares with the household)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS household_share_budgets BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS household_share_transactions BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS household_share_accounts BOOLEAN DEFAULT true;

COMMENT ON COLUMN profiles.household_share_budgets IS 'Share my envelopes with household partners';
COMMENT ON COLUMN profiles.household_share_transactions IS 'Share my transactions with household partners';
COMMENT ON COLUMN profiles.household_share_accounts IS 'Share my account balances with household partners';

-- ============================================
-- 6. HELPER FUNCTIONS
-- ============================================

-- Get a user's household ID
CREATE OR REPLACE FUNCTION get_user_household_id(p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT household_id
    FROM household_members
    WHERE user_id = p_user_id
    LIMIT 1
  );
END;
$$;

-- Get household partner IDs (other adults in household)
CREATE OR REPLACE FUNCTION get_household_partner_ids(p_user_id UUID)
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_household_id UUID;
BEGIN
  v_household_id := get_user_household_id(p_user_id);

  IF v_household_id IS NULL THEN
    RETURN ARRAY[]::UUID[];
  END IF;

  RETURN ARRAY(
    SELECT user_id
    FROM household_members
    WHERE household_id = v_household_id
      AND user_id != p_user_id
  );
END;
$$;

-- Check if user can view another user's data (household partner)
CREATE OR REPLACE FUNCTION can_view_partner_data(p_viewer_id UUID, p_owner_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_viewer_household UUID;
  v_owner_household UUID;
BEGIN
  -- Same user
  IF p_viewer_id = p_owner_id THEN
    RETURN true;
  END IF;

  v_viewer_household := get_user_household_id(p_viewer_id);
  v_owner_household := get_user_household_id(p_owner_id);

  -- Not in a household or different households
  IF v_viewer_household IS NULL OR v_owner_household IS NULL THEN
    RETURN false;
  END IF;

  RETURN v_viewer_household = v_owner_household;
END;
$$;

-- ============================================
-- 7. ROW-LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_invitations ENABLE ROW LEVEL SECURITY;

-- Households: Users can view households they belong to
CREATE POLICY "Users can view their households"
  ON households FOR SELECT
  USING (
    id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())
  );

-- Households: Only owners can update
CREATE POLICY "Owners can update households"
  ON households FOR UPDATE
  USING (
    id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Households: Only owners can delete
CREATE POLICY "Owners can delete households"
  ON households FOR DELETE
  USING (
    id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Households: Authenticated users can create
CREATE POLICY "Authenticated users can create households"
  ON households FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Household Members: Users can view members of their households
CREATE POLICY "Users can view household members"
  ON household_members FOR SELECT
  USING (
    household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())
  );

-- Household Members: Owners/partners can add members
CREATE POLICY "Owners and partners can add members"
  ON household_members FOR INSERT
  WITH CHECK (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'partner')
    )
    OR
    -- Allow self-insert when joining via invitation
    user_id = auth.uid()
  );

-- Household Members: Users can leave (delete themselves)
CREATE POLICY "Users can leave households"
  ON household_members FOR DELETE
  USING (
    user_id = auth.uid()
    OR
    -- Owners can remove non-owners
    (
      household_id IN (
        SELECT household_id FROM household_members
        WHERE user_id = auth.uid() AND role = 'owner'
      )
      AND role != 'owner'
    )
  );

-- Invitations: Inviters can view their invitations
CREATE POLICY "Users can view invitations they sent"
  ON household_invitations FOR SELECT
  USING (
    invited_by = auth.uid()
    OR
    -- Recipients can view invitations by email (checked at app level)
    household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())
  );

-- Invitations: Household members can create invitations
CREATE POLICY "Household members can invite"
  ON household_invitations FOR INSERT
  WITH CHECK (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'partner')
    )
  );

-- Invitations: Inviters can update (e.g., resend, cancel)
CREATE POLICY "Inviters can update invitations"
  ON household_invitations FOR UPDATE
  USING (
    invited_by = auth.uid()
    OR
    -- Allow recipients to accept
    status = 'pending'
  );

-- ============================================
-- 8. TRIGGER FOR AUTO-CREATING HOUSEHOLD
-- ============================================
-- When a user creates a household, automatically add them as owner
CREATE OR REPLACE FUNCTION add_owner_to_new_household()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO household_members (household_id, user_id, role)
  VALUES (NEW.id, auth.uid(), 'owner');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_household_created ON households;
CREATE TRIGGER on_household_created
  AFTER INSERT ON households
  FOR EACH ROW
  EXECUTE FUNCTION add_owner_to_new_household();

-- ============================================
-- 9. TRIGGER TO LINK EXISTING CHILDREN
-- ============================================
-- When a user joins a household, link their children to it
CREATE OR REPLACE FUNCTION link_children_to_household()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Link all children of this user to the household
  UPDATE child_profiles
  SET household_id = NEW.household_id
  WHERE parent_user_id = NEW.user_id
    AND (household_id IS NULL OR household_id = NEW.household_id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_member_joined ON household_members;
CREATE TRIGGER on_member_joined
  AFTER INSERT ON household_members
  FOR EACH ROW
  EXECUTE FUNCTION link_children_to_household();

-- ============================================
-- 10. AUDIT LOG FOR HOUSEHOLD CHANGES
-- ============================================
CREATE TABLE IF NOT EXISTS household_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('created', 'member_joined', 'member_left', 'member_removed', 'invitation_sent', 'invitation_accepted', 'invitation_declined', 'settings_changed')),
  performed_by UUID REFERENCES auth.users(id),
  affected_user UUID REFERENCES auth.users(id),
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_household_audit_log_household ON household_audit_log(household_id);
CREATE INDEX idx_household_audit_log_created ON household_audit_log(created_at);

COMMENT ON TABLE household_audit_log IS 'Audit trail of household changes';

-- RLS for audit log
ALTER TABLE household_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their household audit logs"
  ON household_audit_log FOR SELECT
  USING (
    household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())
  );

CREATE POLICY "System can insert audit logs"
  ON household_audit_log FOR INSERT
  WITH CHECK (true);

-- ============================================
-- 11. UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_households_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_households_updated_at ON households;
CREATE TRIGGER set_households_updated_at
  BEFORE UPDATE ON households
  FOR EACH ROW
  EXECUTE FUNCTION update_households_updated_at();
