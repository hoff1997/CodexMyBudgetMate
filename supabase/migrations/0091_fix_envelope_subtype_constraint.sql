-- Migration: Fix envelope subtype constraint to include 'tracking' and 'debt'
-- The original constraint in 0022_envelope_subtype.sql only allowed: bill, spending, savings, goal
-- But the system now uses 'tracking' (for CC Holding, Surplus, Wallet) and 'debt' (for Debt Destroyer)

-- Drop the old constraint
ALTER TABLE envelopes DROP CONSTRAINT IF EXISTS envelopes_subtype_check;

-- Add the updated constraint with all valid subtypes
ALTER TABLE envelopes ADD CONSTRAINT envelopes_subtype_check
  CHECK (subtype IN ('bill', 'spending', 'savings', 'goal', 'tracking', 'debt'));

-- Update comment to reflect new subtypes
COMMENT ON COLUMN envelopes.subtype IS
  'Subtype classification: bill (recurring expense), spending (flexible budget), savings (accumulation), goal (targeted savings), tracking (balance monitoring like CC Holding/Surplus/Wallet), debt (debt payoff tracking)';
