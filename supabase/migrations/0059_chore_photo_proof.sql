-- Migration: Chore Photo Proof
-- Description: Add photo proof support for chore completion

-- Add photo proof column to chore_assignments
ALTER TABLE chore_assignments
ADD COLUMN IF NOT EXISTS proof_photo_url TEXT DEFAULT NULL;

-- Add requires_photo column to chore_templates
ALTER TABLE chore_templates
ADD COLUMN IF NOT EXISTS requires_photo BOOLEAN DEFAULT false;

-- Add pending_approval status if not exists (update the constraint)
-- First drop existing constraint
ALTER TABLE chore_assignments DROP CONSTRAINT IF EXISTS chore_assignments_status_check;

-- Add updated constraint with pending_approval status
ALTER TABLE chore_assignments
ADD CONSTRAINT chore_assignments_status_check
CHECK (status IN ('pending', 'done', 'pending_approval', 'approved', 'rejected'));

-- Add rejection reason column
ALTER TABLE chore_assignments
ADD COLUMN IF NOT EXISTS rejection_reason TEXT DEFAULT NULL;

-- Add completion notes column for child to add comments
ALTER TABLE chore_assignments
ADD COLUMN IF NOT EXISTS completion_notes TEXT DEFAULT NULL;

-- Create storage bucket for chore photos if not exists
-- Note: This needs to be done via Supabase dashboard or CLI
-- INSERT INTO storage.buckets (id, name, public) VALUES ('chore-photos', 'chore-photos', true);

-- Create function to upload chore proof
CREATE OR REPLACE FUNCTION mark_chore_complete_with_photo(
  p_assignment_id UUID,
  p_photo_url TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_assignment RECORD;
  v_template RECORD;
BEGIN
  -- Get the assignment
  SELECT * INTO v_assignment FROM chore_assignments WHERE id = p_assignment_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Assignment not found');
  END IF;

  IF v_assignment.status != 'pending' THEN
    RETURN jsonb_build_object('error', 'Chore is not in pending status');
  END IF;

  -- Get the template to check if photo is required
  SELECT * INTO v_template FROM chore_templates WHERE id = v_assignment.chore_template_id;

  IF v_template.requires_photo AND p_photo_url IS NULL THEN
    RETURN jsonb_build_object('error', 'Photo proof is required for this chore');
  END IF;

  -- Update the assignment
  UPDATE chore_assignments
  SET
    status = 'pending_approval',
    proof_photo_url = p_photo_url,
    completion_notes = p_notes,
    marked_done_at = NOW()
  WHERE id = p_assignment_id;

  RETURN jsonb_build_object(
    'success', true,
    'assignment_id', p_assignment_id,
    'status', 'pending_approval'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to approve/reject chore
CREATE OR REPLACE FUNCTION review_chore_completion(
  p_assignment_id UUID,
  p_parent_id UUID,
  p_approved BOOLEAN,
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_assignment RECORD;
  v_child RECORD;
  v_template RECORD;
BEGIN
  -- Get the assignment
  SELECT * INTO v_assignment FROM chore_assignments WHERE id = p_assignment_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Assignment not found');
  END IF;

  IF v_assignment.status != 'pending_approval' THEN
    RETURN jsonb_build_object('error', 'Chore is not awaiting approval');
  END IF;

  IF v_assignment.parent_user_id != p_parent_id THEN
    RETURN jsonb_build_object('error', 'Not authorized to review this chore');
  END IF;

  IF p_approved THEN
    -- Approve the chore
    UPDATE chore_assignments
    SET
      status = 'approved',
      approved_at = NOW(),
      approved_by = p_parent_id
    WHERE id = p_assignment_id;

    -- Get template for reward info
    SELECT * INTO v_template FROM chore_templates WHERE id = v_assignment.chore_template_id;

    -- Get child profile
    SELECT * INTO v_child FROM child_profiles WHERE id = v_assignment.child_profile_id;

    -- Award the reward based on currency type
    IF v_template.currency_type = 'stars' THEN
      UPDATE child_profiles
      SET star_balance = star_balance + v_template.currency_amount
      WHERE id = v_assignment.child_profile_id;
    ELSIF v_template.currency_type = 'money' THEN
      -- Update the spend envelope
      UPDATE child_bank_accounts
      SET current_balance = current_balance + v_template.currency_amount
      WHERE child_profile_id = v_assignment.child_profile_id
        AND envelope_type = 'spend';
    ELSIF v_template.currency_type = 'screen_time' THEN
      UPDATE child_profiles
      SET screen_time_balance = COALESCE(screen_time_balance, 0) + v_template.currency_amount
      WHERE id = v_assignment.child_profile_id;
    END IF;

    RETURN jsonb_build_object(
      'success', true,
      'approved', true,
      'reward_type', v_template.currency_type,
      'reward_amount', v_template.currency_amount,
      'child_name', v_child.first_name
    );
  ELSE
    -- Reject the chore
    UPDATE chore_assignments
    SET
      status = 'rejected',
      rejection_reason = p_rejection_reason
    WHERE id = p_assignment_id;

    RETURN jsonb_build_object(
      'success', true,
      'approved', false,
      'rejection_reason', p_rejection_reason
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON COLUMN chore_assignments.proof_photo_url IS 'URL of photo proof uploaded by child when completing chore';
COMMENT ON COLUMN chore_templates.requires_photo IS 'Whether photo proof is required for this chore type';
COMMENT ON COLUMN chore_assignments.rejection_reason IS 'Reason provided when parent rejects chore completion';
COMMENT ON COLUMN chore_assignments.completion_notes IS 'Notes added by child when marking chore complete';
