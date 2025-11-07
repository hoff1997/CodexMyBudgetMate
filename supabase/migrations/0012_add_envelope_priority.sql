-- Add priority classification to envelopes for scenario planning
-- This allows users to mark envelopes as essential, important, or discretionary

ALTER TABLE public.envelopes
ADD COLUMN IF NOT EXISTS priority text
  CHECK (priority IN ('essential', 'important', 'discretionary'))
  DEFAULT 'important';

-- Add index for faster filtering by priority
CREATE INDEX IF NOT EXISTS idx_envelopes_priority
  ON public.envelopes(priority);

-- Add comment for documentation
COMMENT ON COLUMN public.envelopes.priority IS
  'Priority level: essential (must pay - housing, utilities, basic food), important (should pay - insurances, obligations), discretionary (nice to have - subscriptions, entertainment). Used for scenario planning and budget optimization.';

-- Set sensible defaults for common envelope names (optional helper)
-- Users can override these in the UI

-- Essential examples: Mortgage, Rent, Electricity, Water, Groceries, Petrol
UPDATE public.envelopes
SET priority = 'essential'
WHERE priority = 'important' -- only update if still default
  AND (
    LOWER(name) LIKE '%mortgage%'
    OR LOWER(name) LIKE '%rent%'
    OR LOWER(name) LIKE '%electric%'
    OR LOWER(name) LIKE '%power%'
    OR LOWER(name) LIKE '%water%'
    OR LOWER(name) LIKE '%groceries%'
    OR LOWER(name) LIKE '%food%'
    OR LOWER(name) LIKE '%petrol%'
    OR LOWER(name) LIKE '%gas%'
    OR LOWER(name) LIKE '%fuel%'
  );

-- Discretionary examples: Netflix, Spotify, Entertainment, Eating Out, Takeaways
UPDATE public.envelopes
SET priority = 'discretionary'
WHERE priority = 'important' -- only update if still default
  AND (
    LOWER(name) LIKE '%netflix%'
    OR LOWER(name) LIKE '%spotify%'
    OR LOWER(name) LIKE '%disney%'
    OR LOWER(name) LIKE '%entertainment%'
    OR LOWER(name) LIKE '%eating out%'
    OR LOWER(name) LIKE '%takeaway%'
    OR LOWER(name) LIKE '%takeout%'
    OR LOWER(name) LIKE '%restaurant%'
    OR LOWER(name) LIKE '%hospitality%'
    OR LOWER(name) LIKE '%subscription%'
    OR LOWER(name) LIKE '%gym%'
    OR LOWER(name) LIKE '%hobby%'
    OR LOWER(name) LIKE '%hobbies%'
  );
