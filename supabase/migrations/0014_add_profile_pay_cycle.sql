-- Add pay_cycle field to profiles table for payday allocation calculations
-- This allows users to set their pay frequency for budget planning

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS pay_cycle text
  CHECK (pay_cycle IN ('weekly', 'fortnightly', 'monthly'))
  DEFAULT 'fortnightly';

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.pay_cycle IS
  'User pay cycle frequency: weekly, fortnightly, or monthly. Used for payday allocation calculations and budget planning.';
