-- Migration: Add envelope subtype field for bill/spending/savings classification
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

-- Add subtype column to envelopes table
ALTER TABLE public.envelopes
ADD COLUMN IF NOT EXISTS subtype TEXT
  CHECK (subtype IN ('bill', 'spending', 'savings', 'goal'))
  DEFAULT 'bill';

-- Create index for efficient querying by subtype
CREATE INDEX IF NOT EXISTS idx_envelopes_subtype ON public.envelopes(subtype);

-- Add comment explaining the field
COMMENT ON COLUMN public.envelopes.subtype IS
  'Subtype classification: bill (recurring expense), spending (flexible budget), savings (accumulation), goal (targeted savings)';

-- Migrate existing data based on envelope_type and name patterns
UPDATE public.envelopes
SET subtype = CASE
  -- Savings patterns
  WHEN LOWER(name) LIKE '%surplus%' OR
       LOWER(name) LIKE '%emergency%' OR
       LOWER(name) LIKE '%savings%' OR
       LOWER(name) LIKE '%investment%' OR
       LOWER(name) LIKE '%property%' OR
       LOWER(name) LIKE '%giving%' OR
       LOWER(name) LIKE '%goal%'
  THEN 'savings'

  -- Spending patterns
  WHEN LOWER(name) LIKE '%groceries%' OR
       LOWER(name) LIKE '%takeaway%' OR
       LOWER(name) LIKE '%entertainment%' OR
       LOWER(name) LIKE '%fun%' OR
       LOWER(name) LIKE '%dining%' OR
       LOWER(name) LIKE '%miscellaneous%' OR
       LOWER(name) LIKE '%lifestyle%'
  THEN 'spending'

  -- Default to bill for everything else
  ELSE 'bill'
END
WHERE subtype IS NULL;

-- Verify the migration
SELECT
  subtype,
  COUNT(*) as count
FROM public.envelopes
GROUP BY subtype
ORDER BY subtype;
