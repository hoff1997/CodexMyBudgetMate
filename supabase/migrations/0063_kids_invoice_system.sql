-- ============================================================================
-- Kids Module Simplification - Invoice System & Running Balances
-- Migration: 0063_kids_invoice_system.sql
--
-- This migration implements the simplified Kids module focused on teens with
-- real bank accounts. Key changes:
-- 1. Two chore types: Expected (streak-only) vs Extra (invoiceable)
-- 2. Kid income sources (pocket money tracking)
-- 3. Invoice system for extra chore earnings
-- 4. Streak tracking for expected chores
-- 5. Hub permissions for household feature access
-- 6. Account isolation for child bank accounts in parent's Akahu
-- ============================================================================

-- ============================================================================
-- PART 1: Modify chore_templates for Expected vs Extra distinction
-- ============================================================================

-- Add is_expected flag to distinguish chore types
ALTER TABLE chore_templates ADD COLUMN IF NOT EXISTS is_expected BOOLEAN DEFAULT false;

-- Add linked_income_source_id for expected chores (links to pocket money)
ALTER TABLE chore_templates ADD COLUMN IF NOT EXISTS linked_income_source_id UUID;

-- Add comment to clarify the distinction
COMMENT ON COLUMN chore_templates.is_expected IS 'If true, chore is part of pocket money (expected). If false, chore can be invoiced (extra).';
COMMENT ON COLUMN chore_templates.linked_income_source_id IS 'For expected chores, links to the income source (pocket money) this chore contributes to.';

-- ============================================================================
-- PART 2: Kid Income Sources (Pocket Money as Income)
-- ============================================================================

CREATE TABLE IF NOT EXISTS kid_income_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_profile_id UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Weekly Pocket Money',
  amount NUMERIC(10,2) NOT NULL,
  frequency TEXT CHECK (frequency IN ('weekly', 'fortnightly', 'monthly')) NOT NULL DEFAULT 'weekly',
  next_pay_date DATE,
  arrival_day INTEGER, -- Day of week (0=Sun) or day of month depending on frequency
  is_active BOOLEAN DEFAULT true,
  bank_transfer_confirmed BOOLEAN DEFAULT false, -- Parent confirmed bank transfer is set up
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kid_income_sources_child ON kid_income_sources(child_profile_id);
CREATE INDEX IF NOT EXISTS idx_kid_income_sources_active ON kid_income_sources(is_active);

-- Add foreign key for linked_income_source_id
ALTER TABLE chore_templates
  ADD CONSTRAINT fk_chore_linked_income
  FOREIGN KEY (linked_income_source_id)
  REFERENCES kid_income_sources(id)
  ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE kid_income_sources ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Parents can manage income sources for their children
CREATE POLICY "Parents can manage kid income sources"
  ON kid_income_sources FOR ALL
  USING (
    child_profile_id IN (
      SELECT id FROM child_profiles WHERE parent_user_id = auth.uid()
    )
  );

-- ============================================================================
-- PART 3: Expected Chore Streaks
-- ============================================================================

CREATE TABLE IF NOT EXISTS expected_chore_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_profile_id UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  chore_template_id UUID NOT NULL REFERENCES chore_templates(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_completed_date DATE,
  week_starting DATE, -- Monday of the tracking week
  completed_days BOOLEAN[] DEFAULT ARRAY[false, false, false, false, false, false, false], -- Mon-Sun
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(child_profile_id, chore_template_id)
);

CREATE INDEX IF NOT EXISTS idx_expected_chore_streaks_child ON expected_chore_streaks(child_profile_id);
CREATE INDEX IF NOT EXISTS idx_expected_chore_streaks_chore ON expected_chore_streaks(chore_template_id);

-- Enable RLS
ALTER TABLE expected_chore_streaks ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Parents can manage streaks for their children
CREATE POLICY "Parents can manage expected chore streaks"
  ON expected_chore_streaks FOR ALL
  USING (
    child_profile_id IN (
      SELECT id FROM child_profiles WHERE parent_user_id = auth.uid()
    )
  );

-- ============================================================================
-- PART 4: Kid Invoice System (for Extra Chores)
-- ============================================================================

-- Kid invoices - the main invoice record
CREATE TABLE IF NOT EXISTS kid_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_profile_id UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL, -- e.g., "INV-2026-001"
  status TEXT CHECK (status IN ('draft', 'submitted', 'paid')) DEFAULT 'draft',
  total_amount NUMERIC(10,2) DEFAULT 0,
  submitted_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  payment_transaction_id UUID, -- Links to Akahu transaction when detected
  payment_notes TEXT, -- Parent can add notes when marking paid
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kid_invoices_child ON kid_invoices(child_profile_id);
CREATE INDEX IF NOT EXISTS idx_kid_invoices_status ON kid_invoices(status);
CREATE INDEX IF NOT EXISTS idx_kid_invoices_number ON kid_invoices(invoice_number);

-- Enable RLS
ALTER TABLE kid_invoices ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Parents can manage invoices for their children
CREATE POLICY "Parents can manage kid invoices"
  ON kid_invoices FOR ALL
  USING (
    child_profile_id IN (
      SELECT id FROM child_profiles WHERE parent_user_id = auth.uid()
    )
  );

-- Kid invoice items - line items on each invoice
CREATE TABLE IF NOT EXISTS kid_invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES kid_invoices(id) ON DELETE CASCADE,
  chore_assignment_id UUID REFERENCES chore_assignments(id) ON DELETE SET NULL,
  chore_name TEXT NOT NULL, -- Denormalized for history
  amount NUMERIC(10,2) NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  photo_proof_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kid_invoice_items_invoice ON kid_invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_kid_invoice_items_assignment ON kid_invoice_items(chore_assignment_id);

-- Enable RLS
ALTER TABLE kid_invoice_items ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Parents can manage invoice items via invoice ownership
CREATE POLICY "Parents can manage kid invoice items"
  ON kid_invoice_items FOR ALL
  USING (
    invoice_id IN (
      SELECT ki.id FROM kid_invoices ki
      JOIN child_profiles cp ON ki.child_profile_id = cp.id
      WHERE cp.parent_user_id = auth.uid()
    )
  );

-- ============================================================================
-- PART 5: Kid Payment Settings
-- ============================================================================

CREATE TABLE IF NOT EXISTS kid_payment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_profile_id UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  invoice_frequency TEXT CHECK (invoice_frequency IN ('weekly', 'fortnightly', 'monthly')) DEFAULT 'weekly',
  invoice_day INTEGER, -- 0-6 for weekly, 1-28 for monthly
  reminder_enabled BOOLEAN DEFAULT true,
  auto_submit BOOLEAN DEFAULT false, -- Auto-submit on schedule
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(child_profile_id)
);

-- Enable RLS
ALTER TABLE kid_payment_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Parents can manage payment settings for their children
CREATE POLICY "Parents can manage kid payment settings"
  ON kid_payment_settings FOR ALL
  USING (
    child_profile_id IN (
      SELECT id FROM child_profiles WHERE parent_user_id = auth.uid()
    )
  );

-- ============================================================================
-- PART 6: Kid Hub Permissions (Household Feature Access)
-- ============================================================================

CREATE TABLE IF NOT EXISTS kid_hub_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_profile_id UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  feature_name TEXT NOT NULL, -- 'shopping_lists', 'recipes', 'meal_planner', 'todos', 'calendar', 'birthdays'
  permission_level TEXT CHECK (permission_level IN ('none', 'view', 'edit', 'full')) DEFAULT 'none',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(child_profile_id, feature_name)
);

CREATE INDEX IF NOT EXISTS idx_kid_hub_permissions_child ON kid_hub_permissions(child_profile_id);

-- Enable RLS
ALTER TABLE kid_hub_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Parents can manage hub permissions for their children
CREATE POLICY "Parents can manage kid hub permissions"
  ON kid_hub_permissions FOR ALL
  USING (
    child_profile_id IN (
      SELECT id FROM child_profiles WHERE parent_user_id = auth.uid()
    )
  );

-- ============================================================================
-- PART 7: Account Isolation (Child accounts in parent's Akahu)
-- ============================================================================

-- NOTE: Account isolation columns are added to teen_linked_accounts in migration 0064
-- The teen_linked_accounts table (from 0055) is the correct table for child bank accounts

-- ============================================================================
-- PART 8: Transfer Requests (Kid requests transfer from Save/Invest/Give to Spend)
-- ============================================================================

CREATE TABLE IF NOT EXISTS kid_transfer_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_profile_id UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  from_envelope TEXT NOT NULL CHECK (from_envelope IN ('save', 'invest', 'give')),
  to_envelope TEXT NOT NULL DEFAULT 'spend' CHECK (to_envelope = 'spend'),
  amount NUMERIC(10,2) NOT NULL,
  reason TEXT, -- "Want to buy birthday present for mum"
  status TEXT CHECK (status IN ('pending', 'approved', 'denied')) DEFAULT 'pending',
  parent_notes TEXT,
  responded_by UUID REFERENCES auth.users(id),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kid_transfer_requests_child ON kid_transfer_requests(child_profile_id);
CREATE INDEX IF NOT EXISTS idx_kid_transfer_requests_status ON kid_transfer_requests(status);

-- Enable RLS
ALTER TABLE kid_transfer_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Parents can manage transfer requests for their children
CREATE POLICY "Parents can manage kid transfer requests"
  ON kid_transfer_requests FOR ALL
  USING (
    child_profile_id IN (
      SELECT id FROM child_profiles WHERE parent_user_id = auth.uid()
    )
  );

-- ============================================================================
-- PART 9: Functions for Invoice Management
-- ============================================================================

-- Function to generate next invoice number for a child
CREATE OR REPLACE FUNCTION generate_kid_invoice_number(p_child_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_year TEXT;
BEGIN
  v_year := EXTRACT(YEAR FROM NOW())::TEXT;

  SELECT COUNT(*) + 1 INTO v_count
  FROM kid_invoices
  WHERE child_profile_id = p_child_id
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());

  RETURN 'INV-' || v_year || '-' || LPAD(v_count::TEXT, 3, '0');
END;
$$;

-- Function to update invoice total when items change
CREATE OR REPLACE FUNCTION update_kid_invoice_total()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE kid_invoices
    SET total_amount = (
      SELECT COALESCE(SUM(amount), 0)
      FROM kid_invoice_items
      WHERE invoice_id = OLD.invoice_id
    ),
    updated_at = NOW()
    WHERE id = OLD.invoice_id;
    RETURN OLD;
  ELSE
    UPDATE kid_invoices
    SET total_amount = (
      SELECT COALESCE(SUM(amount), 0)
      FROM kid_invoice_items
      WHERE invoice_id = NEW.invoice_id
    ),
    updated_at = NOW()
    WHERE id = NEW.invoice_id;
    RETURN NEW;
  END IF;
END;
$$;

-- Trigger to auto-update invoice totals
DROP TRIGGER IF EXISTS trigger_update_kid_invoice_total ON kid_invoice_items;
CREATE TRIGGER trigger_update_kid_invoice_total
  AFTER INSERT OR UPDATE OR DELETE ON kid_invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION update_kid_invoice_total();

-- Function to update streak when expected chore is completed
CREATE OR REPLACE FUNCTION update_expected_chore_streak(
  p_child_id UUID,
  p_chore_id UUID,
  p_completed_date DATE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day_index INTEGER;
  v_week_start DATE;
  v_streak RECORD;
BEGIN
  -- Calculate Monday of the week for the completed date
  v_week_start := p_completed_date - ((EXTRACT(DOW FROM p_completed_date)::INTEGER + 6) % 7);

  -- Day index: 0 = Monday, 6 = Sunday
  v_day_index := (EXTRACT(DOW FROM p_completed_date)::INTEGER + 6) % 7;

  -- Get or create streak record
  SELECT * INTO v_streak
  FROM expected_chore_streaks
  WHERE child_profile_id = p_child_id AND chore_template_id = p_chore_id;

  IF NOT FOUND THEN
    -- Create new streak record
    INSERT INTO expected_chore_streaks (
      child_profile_id,
      chore_template_id,
      week_starting,
      completed_days,
      last_completed_date,
      current_streak
    )
    VALUES (
      p_child_id,
      p_chore_id,
      v_week_start,
      ARRAY[false, false, false, false, false, false, false],
      p_completed_date,
      1
    );

    -- Update the specific day
    UPDATE expected_chore_streaks
    SET completed_days[v_day_index + 1] = true
    WHERE child_profile_id = p_child_id AND chore_template_id = p_chore_id;
  ELSE
    -- Check if same week or new week
    IF v_streak.week_starting = v_week_start THEN
      -- Same week - update day
      UPDATE expected_chore_streaks
      SET
        completed_days[v_day_index + 1] = true,
        last_completed_date = p_completed_date,
        current_streak = CASE
          WHEN last_completed_date = p_completed_date - 1 THEN current_streak + 1
          WHEN last_completed_date = p_completed_date THEN current_streak
          ELSE 1
        END,
        longest_streak = GREATEST(longest_streak, current_streak + 1),
        updated_at = NOW()
      WHERE child_profile_id = p_child_id AND chore_template_id = p_chore_id;
    ELSE
      -- New week - reset daily tracking but maintain streak
      UPDATE expected_chore_streaks
      SET
        week_starting = v_week_start,
        completed_days = ARRAY[false, false, false, false, false, false, false],
        last_completed_date = p_completed_date,
        current_streak = CASE
          WHEN last_completed_date >= v_week_start - 1 THEN current_streak + 1
          ELSE 1
        END,
        longest_streak = GREATEST(longest_streak, current_streak + 1),
        updated_at = NOW()
      WHERE child_profile_id = p_child_id AND chore_template_id = p_chore_id;

      -- Update the specific day
      UPDATE expected_chore_streaks
      SET completed_days[v_day_index + 1] = true
      WHERE child_profile_id = p_child_id AND chore_template_id = p_chore_id;
    END IF;
  END IF;
END;
$$;

-- ============================================================================
-- PART 10: Default Hub Permissions Function
-- ============================================================================

-- Function to create default hub permissions for new child profiles
CREATE OR REPLACE FUNCTION create_default_kid_hub_permissions(p_child_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO kid_hub_permissions (child_profile_id, feature_name, permission_level) VALUES
    (p_child_id, 'shopping_lists', 'view'),
    (p_child_id, 'recipes', 'view'),
    (p_child_id, 'meal_planner', 'none'),
    (p_child_id, 'todos', 'edit'),
    (p_child_id, 'calendar', 'view'),
    (p_child_id, 'birthdays', 'view')
  ON CONFLICT (child_profile_id, feature_name) DO NOTHING;
END;
$$;

-- ============================================================================
-- PART 11: Update Timestamps Triggers
-- ============================================================================

-- Trigger function for updating updated_at
CREATE OR REPLACE FUNCTION update_kids_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS trigger_kid_income_sources_updated_at ON kid_income_sources;
CREATE TRIGGER trigger_kid_income_sources_updated_at
  BEFORE UPDATE ON kid_income_sources
  FOR EACH ROW
  EXECUTE FUNCTION update_kids_updated_at();

DROP TRIGGER IF EXISTS trigger_kid_invoices_updated_at ON kid_invoices;
CREATE TRIGGER trigger_kid_invoices_updated_at
  BEFORE UPDATE ON kid_invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_kids_updated_at();

DROP TRIGGER IF EXISTS trigger_kid_payment_settings_updated_at ON kid_payment_settings;
CREATE TRIGGER trigger_kid_payment_settings_updated_at
  BEFORE UPDATE ON kid_payment_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_kids_updated_at();

DROP TRIGGER IF EXISTS trigger_kid_hub_permissions_updated_at ON kid_hub_permissions;
CREATE TRIGGER trigger_kid_hub_permissions_updated_at
  BEFORE UPDATE ON kid_hub_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_kids_updated_at();

DROP TRIGGER IF EXISTS trigger_expected_chore_streaks_updated_at ON expected_chore_streaks;
CREATE TRIGGER trigger_expected_chore_streaks_updated_at
  BEFORE UPDATE ON expected_chore_streaks
  FOR EACH ROW
  EXECUTE FUNCTION update_kids_updated_at();
