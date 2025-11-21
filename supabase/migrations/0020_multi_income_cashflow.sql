-- Migration: Multi-Income Cashflow Tracking
-- Adds support for tracking envelope funding from multiple income sources
-- and cashflow predictions

-- Add funding_sources to envelopes table
ALTER TABLE envelopes
ADD COLUMN IF NOT EXISTS funding_sources JSONB DEFAULT '[]'::jsonb;

-- Add comment explaining the structure
COMMENT ON COLUMN envelopes.funding_sources IS
'Array of income sources funding this envelope.
Example: [{"income_id": "uuid", "income_name": "Sarah''s Salary", "amount": 100}, {"income_id": "uuid2", "income_name": "John''s Salary", "amount": 50}]';

-- Create envelope predictions table for cashflow forecasting
CREATE TABLE IF NOT EXISTS envelope_predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  envelope_id UUID REFERENCES envelopes(id) ON DELETE CASCADE NOT NULL,
  prediction_date DATE NOT NULL,
  current_balance DECIMAL(10,2) NOT NULL DEFAULT 0,
  projected_balance DECIMAL(10,2) NOT NULL DEFAULT 0,
  target_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  due_date DATE,
  status TEXT NOT NULL CHECK (status IN ('on_track', 'behind', 'critical', 'overfunded')),
  gap_amount DECIMAL(10,2) DEFAULT 0,
  days_until_due INTEGER,
  future_income JSONB DEFAULT '[]'::jsonb,
  suggestions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(envelope_id, prediction_date)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_envelope_predictions_user
ON envelope_predictions(user_id);

CREATE INDEX IF NOT EXISTS idx_envelope_predictions_envelope
ON envelope_predictions(envelope_id);

CREATE INDEX IF NOT EXISTS idx_envelope_predictions_date
ON envelope_predictions(prediction_date);

CREATE INDEX IF NOT EXISTS idx_envelope_predictions_status
ON envelope_predictions(status);

-- Add comment
COMMENT ON TABLE envelope_predictions IS
'Stores calculated cashflow predictions for envelopes.
Updated daily or when budget changes occur.
Helps users see funding gaps before bills are due.';

-- Enable RLS
ALTER TABLE envelope_predictions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own predictions"
ON envelope_predictions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own predictions"
ON envelope_predictions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own predictions"
ON envelope_predictions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own predictions"
ON envelope_predictions FOR DELETE
USING (auth.uid() = user_id);

-- Function to update envelope funding_sources when recurring_income allocation changes
CREATE OR REPLACE FUNCTION update_envelope_funding_sources()
RETURNS TRIGGER AS $$
BEGIN
  -- When recurring_income allocation is updated, sync to envelope funding_sources
  -- This keeps envelope.funding_sources in sync with recurring_income.allocation

  -- For each envelope in the allocation, update its funding_sources
  -- This is a placeholder - actual implementation would need to iterate through
  -- the allocation JSONB array and update each envelope

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to keep funding_sources in sync
-- Note: This is a placeholder - full implementation would be added when we build the sync logic
-- CREATE TRIGGER sync_envelope_funding_sources
-- AFTER UPDATE OF allocation ON recurring_income
-- FOR EACH ROW
-- EXECUTE FUNCTION update_envelope_funding_sources();
