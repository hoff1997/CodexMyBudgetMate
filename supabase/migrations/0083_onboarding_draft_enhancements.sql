-- Migration: Onboarding Draft Enhancements
-- Description: Add additional columns to onboarding_drafts for better data protection

-- Add new columns for enhanced data protection
ALTER TABLE public.onboarding_drafts
ADD COLUMN IF NOT EXISTS highest_step_reached int DEFAULT 1,
ADD COLUMN IF NOT EXISTS credit_card_configs jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS custom_categories jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS category_order jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS credit_card_opening_allocation numeric(12,2) DEFAULT 0;

-- Add comments
COMMENT ON COLUMN public.onboarding_drafts.highest_step_reached IS
  'The highest step number the user has reached (for navigation)';

COMMENT ON COLUMN public.onboarding_drafts.credit_card_configs IS
  'Credit card configuration data from step 5';

COMMENT ON COLUMN public.onboarding_drafts.custom_categories IS
  'User-created custom envelope categories';

COMMENT ON COLUMN public.onboarding_drafts.category_order IS
  'Custom ordering of envelope categories';

COMMENT ON COLUMN public.onboarding_drafts.credit_card_opening_allocation IS
  'Amount set aside for credit card holding envelope';
