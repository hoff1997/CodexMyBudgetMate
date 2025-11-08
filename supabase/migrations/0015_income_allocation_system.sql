-- Migration: Income Allocation System
-- Description: Add support for multiple income sources with automatic allocation to envelopes
-- Phase 1: Database Setup

-- =====================================================
-- 1. Create income_sources table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.income_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  pay_cycle TEXT NOT NULL CHECK (pay_cycle IN ('weekly', 'fortnightly', 'monthly')),
  typical_amount NUMERIC(12,2),
  detection_rule_id UUID REFERENCES public.transaction_rules(id) ON DELETE SET NULL,
  auto_allocate BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.income_sources IS
  'Stores different income sources for a user (e.g., "My Salary", "Partner Salary", "Bonus"). Each income source can have its own pay cycle and allocation plan.';

COMMENT ON COLUMN public.income_sources.name IS
  'User-defined name for the income source (e.g., "My Salary", "Partner Salary")';

COMMENT ON COLUMN public.income_sources.pay_cycle IS
  'How often this income is received: weekly, fortnightly, or monthly';

COMMENT ON COLUMN public.income_sources.typical_amount IS
  'Expected amount per pay cycle (for planning purposes). Can be null for variable income.';

COMMENT ON COLUMN public.income_sources.detection_rule_id IS
  'Link to transaction rule for automatic income detection based on merchant/reference';

COMMENT ON COLUMN public.income_sources.auto_allocate IS
  'Whether to automatically create allocation plans when this income is detected';

-- =====================================================
-- 2. Create envelope_income_allocations table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.envelope_income_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  envelope_id UUID NOT NULL REFERENCES public.envelopes(id) ON DELETE CASCADE,
  income_source_id UUID NOT NULL REFERENCES public.income_sources(id) ON DELETE CASCADE,
  allocation_amount NUMERIC(12,2) NOT NULL,
  priority INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(envelope_id, income_source_id)
);

COMMENT ON TABLE public.envelope_income_allocations IS
  'Defines how much to allocate from each income source to each envelope. Supports multi-income households where envelopes can be funded from multiple sources.';

COMMENT ON COLUMN public.envelope_income_allocations.allocation_amount IS
  'Fixed dollar amount to allocate to this envelope per pay cycle from this income source';

COMMENT ON COLUMN public.envelope_income_allocations.priority IS
  'Order in which allocations are applied (lower numbers first)';

-- =====================================================
-- 3. Add income_source_id to allocation_plans
-- =====================================================
ALTER TABLE public.allocation_plans
ADD COLUMN IF NOT EXISTS income_source_id UUID REFERENCES public.income_sources(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.allocation_plans.income_source_id IS
  'Links this allocation plan to a specific income source for tracking';

-- =====================================================
-- 4. Create indexes for performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_income_sources_user_id
  ON public.income_sources(user_id);

CREATE INDEX IF NOT EXISTS idx_income_sources_detection_rule
  ON public.income_sources(detection_rule_id)
  WHERE detection_rule_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_envelope_income_allocations_user_id
  ON public.envelope_income_allocations(user_id);

CREATE INDEX IF NOT EXISTS idx_envelope_income_allocations_envelope_id
  ON public.envelope_income_allocations(envelope_id);

CREATE INDEX IF NOT EXISTS idx_envelope_income_allocations_income_source_id
  ON public.envelope_income_allocations(income_source_id);

CREATE INDEX IF NOT EXISTS idx_allocation_plans_income_source_id
  ON public.allocation_plans(income_source_id)
  WHERE income_source_id IS NOT NULL;

-- =====================================================
-- 5. Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE public.income_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.envelope_income_allocations ENABLE ROW LEVEL SECURITY;

-- income_sources policies
CREATE POLICY "Users can view their own income sources"
  ON public.income_sources
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own income sources"
  ON public.income_sources
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own income sources"
  ON public.income_sources
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own income sources"
  ON public.income_sources
  FOR DELETE
  USING (auth.uid() = user_id);

-- envelope_income_allocations policies
CREATE POLICY "Users can view their own envelope allocations"
  ON public.envelope_income_allocations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own envelope allocations"
  ON public.envelope_income_allocations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own envelope allocations"
  ON public.envelope_income_allocations
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own envelope allocations"
  ON public.envelope_income_allocations
  FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- 6. Updated_at triggers
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_income_sources_updated_at
  BEFORE UPDATE ON public.income_sources
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_envelope_income_allocations_updated_at
  BEFORE UPDATE ON public.envelope_income_allocations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
