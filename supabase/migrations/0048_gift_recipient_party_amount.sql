-- Migration: Add party_amount column to gift_recipients table
-- This allows users to budget separately for parties/food in addition to gifts

-- Add party_amount column to gift_recipients table
ALTER TABLE public.gift_recipients
ADD COLUMN IF NOT EXISTS party_amount NUMERIC(10, 2) DEFAULT 0;

COMMENT ON COLUMN public.gift_recipients.party_amount IS 'One-off budget for party/food expenses for this recipient (e.g., birthday party costs)';
