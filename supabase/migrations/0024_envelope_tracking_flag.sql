-- Migration: Add tracking-only flag to envelopes
-- Purpose: Allow envelopes like reimbursements to skip budget allocation requirements
-- Date: 2025-12-02

-- Add is_tracking_only column to envelopes table
ALTER TABLE envelopes
ADD COLUMN IF NOT EXISTS is_tracking_only boolean DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN envelopes.is_tracking_only IS
  'Marks envelopes that are for tracking only (e.g., reimbursements) and do not require budget allocation';

-- Add index for efficient querying of unbudgeted envelopes
CREATE INDEX IF NOT EXISTS idx_envelopes_tracking_budgeted
  ON envelopes(user_id, is_tracking_only, is_goal, is_spending);

-- Helper function to determine if an envelope needs budget allocation
-- Returns true if envelope requires budget but doesn't have one
CREATE OR REPLACE FUNCTION envelope_needs_budget(envelope_row envelopes)
RETURNS boolean AS $$
BEGIN
  -- Tracking-only envelopes don't need budget
  IF envelope_row.is_tracking_only THEN
    RETURN false;
  END IF;

  -- Spending envelopes don't need budget (they track spending only)
  IF envelope_row.is_spending THEN
    RETURN false;
  END IF;

  -- Goal envelopes don't need pay cycle budget (they're optional)
  IF envelope_row.is_goal THEN
    RETURN false;
  END IF;

  -- Regular envelopes need budget if pay_cycle_amount is 0 or null
  RETURN COALESCE(envelope_row.pay_cycle_amount, 0) = 0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION envelope_needs_budget IS
  'Determines if an envelope requires budget allocation. Returns true if envelope is a regular envelope with no budget allocated.';
