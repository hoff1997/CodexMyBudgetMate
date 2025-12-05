-- Migration: Add Ideal Allocation System fields
-- Description: Adds fields to support the ideal allocation suggestion/locking mechanism

-- Add fields to envelope_income_allocations table
ALTER TABLE envelope_income_allocations
ADD COLUMN IF NOT EXISTS suggested_amount NUMERIC(10, 2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS allocation_locked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN envelope_income_allocations.suggested_amount IS 'The ideal per-pay allocation calculated by the system';
COMMENT ON COLUMN envelope_income_allocations.allocation_locked IS 'Whether the user has accepted the suggested allocation (locked in)';
COMMENT ON COLUMN envelope_income_allocations.locked_at IS 'Timestamp when the allocation was locked by the user';

-- Create index for querying locked allocations
CREATE INDEX IF NOT EXISTS idx_envelope_income_allocations_locked
ON envelope_income_allocations(user_id, allocation_locked)
WHERE allocation_locked = true;

-- Add bill_cycle_start_date to envelopes table for gap analysis
ALTER TABLE envelopes
ADD COLUMN IF NOT EXISTS bill_cycle_start_date DATE DEFAULT NULL;

COMMENT ON COLUMN envelopes.bill_cycle_start_date IS 'User-specified start date of the bill cycle for gap analysis calculations';
