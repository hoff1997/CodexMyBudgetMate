-- Migration: Auto-Allocation System
-- Description: Add tables and columns to support automatic transaction allocation with reconciliation approval
-- Created: 2025-11-07

-- Step 1: Create allocation_plans table first (needed for foreign key reference)
CREATE TABLE IF NOT EXISTS public.allocation_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_transaction_id uuid REFERENCES public.transactions(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  status text NOT NULL CHECK (status IN ('pending', 'applied', 'rejected')) DEFAULT 'pending',
  applied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Summary data for quick display
  regular_total numeric(12,2),
  surplus_total numeric(12,2),
  envelope_count integer
);

-- Step 2: Add allocation tracking columns to transactions table
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS allocation_plan_id uuid,
ADD COLUMN IF NOT EXISTS is_auto_allocated boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS parent_transaction_id uuid;

-- Step 3: Add foreign key constraints to transactions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_transactions_allocation_plan'
  ) THEN
    ALTER TABLE public.transactions
    ADD CONSTRAINT fk_transactions_allocation_plan
      FOREIGN KEY (allocation_plan_id)
      REFERENCES public.allocation_plans(id)
      ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_transactions_parent'
  ) THEN
    ALTER TABLE public.transactions
    ADD CONSTRAINT fk_transactions_parent
      FOREIGN KEY (parent_transaction_id)
      REFERENCES public.transactions(id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- Step 4: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_parent ON public.transactions(parent_transaction_id);
CREATE INDEX IF NOT EXISTS idx_transactions_allocation_plan ON public.transactions(allocation_plan_id);
CREATE INDEX IF NOT EXISTS idx_transactions_auto_allocated ON public.transactions(is_auto_allocated) WHERE is_auto_allocated = true;

-- Step 5: Indexes for allocation_plans
CREATE INDEX IF NOT EXISTS idx_allocation_plans_user ON public.allocation_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_allocation_plans_status ON public.allocation_plans(status);
CREATE INDEX IF NOT EXISTS idx_allocation_plans_source ON public.allocation_plans(source_transaction_id);

-- Step 6: RLS Policies for allocation_plans
ALTER TABLE public.allocation_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own allocation plans" ON public.allocation_plans;
CREATE POLICY "Users can view own allocation plans"
  ON public.allocation_plans FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own allocation plans" ON public.allocation_plans;
CREATE POLICY "Users can create own allocation plans"
  ON public.allocation_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own allocation plans" ON public.allocation_plans;
CREATE POLICY "Users can update own allocation plans"
  ON public.allocation_plans FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own allocation plans" ON public.allocation_plans;
CREATE POLICY "Users can delete own allocation plans"
  ON public.allocation_plans FOR DELETE
  USING (auth.uid() = user_id);

-- Step 7: Create allocation_plan_items table
CREATE TABLE IF NOT EXISTS public.allocation_plan_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.allocation_plans(id) ON DELETE CASCADE,
  envelope_id uuid NOT NULL REFERENCES public.envelopes(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  is_regular boolean NOT NULL DEFAULT true,
  priority text CHECK (priority IN ('essential', 'important', 'discretionary')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Step 8: Indexes for allocation_plan_items
CREATE INDEX IF NOT EXISTS idx_allocation_plan_items_plan ON public.allocation_plan_items(plan_id);
CREATE INDEX IF NOT EXISTS idx_allocation_plan_items_envelope ON public.allocation_plan_items(envelope_id);

-- Step 9: RLS Policies for allocation_plan_items
ALTER TABLE public.allocation_plan_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own allocation plan items" ON public.allocation_plan_items;
CREATE POLICY "Users can view own allocation plan items"
  ON public.allocation_plan_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.allocation_plans
      WHERE allocation_plans.id = allocation_plan_items.plan_id
        AND allocation_plans.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create own allocation plan items" ON public.allocation_plan_items;
CREATE POLICY "Users can create own allocation plan items"
  ON public.allocation_plan_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.allocation_plans
      WHERE allocation_plans.id = allocation_plan_items.plan_id
        AND allocation_plans.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own allocation plan items" ON public.allocation_plan_items;
CREATE POLICY "Users can update own allocation plan items"
  ON public.allocation_plan_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.allocation_plans
      WHERE allocation_plans.id = allocation_plan_items.plan_id
        AND allocation_plans.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete own allocation plan items" ON public.allocation_plan_items;
CREATE POLICY "Users can delete own allocation plan items"
  ON public.allocation_plan_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.allocation_plans
      WHERE allocation_plans.id = allocation_plan_items.plan_id
        AND allocation_plans.user_id = auth.uid()
    )
  );

-- Step 10: Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_allocation_plan_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 11: Trigger for updated_at on allocation_plans
DROP TRIGGER IF EXISTS trigger_allocation_plans_updated_at ON public.allocation_plans;
CREATE TRIGGER trigger_allocation_plans_updated_at
  BEFORE UPDATE ON public.allocation_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_allocation_plan_updated_at();

-- Step 12: Add comments for documentation
COMMENT ON TABLE public.allocation_plans IS 'Stores automatic allocation plans for income transactions';
COMMENT ON TABLE public.allocation_plan_items IS 'Individual envelope allocations within an allocation plan';
COMMENT ON COLUMN public.transactions.allocation_plan_id IS 'Links transaction to its allocation plan';
COMMENT ON COLUMN public.transactions.is_auto_allocated IS 'Indicates if transaction was automatically split';
COMMENT ON COLUMN public.transactions.parent_transaction_id IS 'Links child allocation transactions to parent income transaction';
