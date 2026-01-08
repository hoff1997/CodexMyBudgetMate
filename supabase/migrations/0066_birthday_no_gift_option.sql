-- Migration: Allow birthdays without gifts (tracking only)
-- Adds needs_gift flag to gift_recipients table

-- Add needs_gift column - defaults to true for backwards compatibility
ALTER TABLE public.gift_recipients
ADD COLUMN IF NOT EXISTS needs_gift BOOLEAN DEFAULT true;

COMMENT ON COLUMN public.gift_recipients.needs_gift IS 'If false, birthday is tracked but no gift budget needed (e.g., distant relative remembrance)';

-- Add index for filtering
CREATE INDEX IF NOT EXISTS idx_gift_recipients_needs_gift
  ON public.gift_recipients(user_id, needs_gift);
