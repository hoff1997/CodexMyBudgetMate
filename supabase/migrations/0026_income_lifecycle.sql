-- Migration: Income Lifecycle Management
-- Description: Add lifecycle fields to income_sources for better income management
-- - next_pay_date: When next payment is expected
-- - start_date: When this income stream started
-- - end_date: When this income stream ends (null = ongoing)
-- - replaced_by_id: Links to successor income source

-- =====================================================
-- 1. Add lifecycle columns to income_sources
-- =====================================================
ALTER TABLE public.income_sources
ADD COLUMN IF NOT EXISTS next_pay_date DATE DEFAULT NULL;

ALTER TABLE public.income_sources
ADD COLUMN IF NOT EXISTS start_date DATE DEFAULT CURRENT_DATE;

ALTER TABLE public.income_sources
ADD COLUMN IF NOT EXISTS end_date DATE DEFAULT NULL;

ALTER TABLE public.income_sources
ADD COLUMN IF NOT EXISTS replaced_by_id UUID REFERENCES public.income_sources(id) ON DELETE SET NULL DEFAULT NULL;

-- =====================================================
-- 2. Add comments for documentation
-- =====================================================
COMMENT ON COLUMN public.income_sources.next_pay_date IS
  'Expected date of next payment for this income source';

COMMENT ON COLUMN public.income_sources.start_date IS
  'Date when this income stream started (for historical tracking)';

COMMENT ON COLUMN public.income_sources.end_date IS
  'Date when this income stream ends. NULL means ongoing income.';

COMMENT ON COLUMN public.income_sources.replaced_by_id IS
  'Links to the income source that replaced this one (for job changes)';

-- =====================================================
-- 3. Migrate next_date from recurring_income where matched
-- =====================================================
-- Match by user_id and similar name to migrate next_date values
UPDATE public.income_sources is_tbl
SET next_pay_date = ri.next_date
FROM public.recurring_income ri
WHERE is_tbl.user_id = ri.user_id
  AND LOWER(TRIM(is_tbl.name)) = LOWER(TRIM(ri.name))
  AND is_tbl.next_pay_date IS NULL
  AND ri.next_date IS NOT NULL;

-- =====================================================
-- 4. Create index for active income queries
-- =====================================================
-- Note: Can't use CURRENT_DATE in partial index (not immutable)
-- Instead, index on end_date IS NULL for ongoing income sources
CREATE INDEX IF NOT EXISTS idx_income_sources_active_lifecycle
ON public.income_sources(user_id, is_active)
WHERE end_date IS NULL;

-- =====================================================
-- 5. Create index for income succession queries
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_income_sources_replaced_by
ON public.income_sources(replaced_by_id)
WHERE replaced_by_id IS NOT NULL;
