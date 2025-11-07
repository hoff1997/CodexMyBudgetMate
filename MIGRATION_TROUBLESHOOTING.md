# Migration Troubleshooting Guide

**Date:** 2025-11-07
**Migration:** 0013_auto_allocation_system.sql

---

## Common Issues and Solutions

### Issue 1: "relation 'allocation_plans' does not exist"

**Cause:** The foreign key constraint is trying to reference a table that hasn't been created yet.

**Solution:** The migration has been fixed to create `allocation_plans` table FIRST before adding foreign key constraints. Make sure you're using the latest version.

**Verify:** Check that the migration starts with:
```sql
-- Step 1: Create allocation_plans table first (needed for foreign key reference)
CREATE TABLE IF NOT EXISTS public.allocation_plans (
```

### Issue 2: "column 'allocation_plan_id' does not exist"

**Cause:** The columns weren't added to the transactions table.

**Check in Supabase:**
1. Go to Table Editor
2. Click on "transactions" table
3. Look for these columns:
   - `allocation_plan_id`
   - `is_auto_allocated`
   - `parent_transaction_id`

**If missing, run this separately:**
```sql
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS allocation_plan_id uuid,
ADD COLUMN IF NOT EXISTS is_auto_allocated boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS parent_transaction_id uuid;
```

### Issue 3: Foreign key constraint fails

**Error message:** `ERROR: constraint "fk_transactions_allocation_plan" for relation "transactions" already exists`

**Solution:** This is actually OK - it means the constraint already exists. The migration uses `IF NOT EXISTS` checks.

### Issue 4: "permission denied for table transactions"

**Cause:** RLS policies or insufficient permissions.

**Solution:** Make sure you're running the migration as the database owner in Supabase SQL Editor (not as a user).

### Issue 5: Tables created but queries fail

**Check RLS policies:**
```sql
-- Verify RLS is enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('allocation_plans', 'allocation_plan_items');

-- Should show rowsecurity = true

-- Verify policies exist
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename IN ('allocation_plans', 'allocation_plan_items');

-- Should show 8 policies (4 per table)
```

---

## Step-by-Step Verification

### Step 1: Check Tables Exist

Run in Supabase SQL Editor:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('allocation_plans', 'allocation_plan_items');
```

**Expected Result:** 2 rows
- allocation_plans
- allocation_plan_items

**If not found:** Tables weren't created. Check for errors in migration output.

### Step 2: Check Columns Added

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'transactions'
AND column_name IN ('allocation_plan_id', 'is_auto_allocated', 'parent_transaction_id')
ORDER BY column_name;
```

**Expected Result:** 3 rows
- allocation_plan_id | uuid
- is_auto_allocated | boolean
- parent_transaction_id | uuid

**If not found:** Column additions failed.

### Step 3: Check Foreign Keys

```sql
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name = 'transactions'
AND tc.constraint_name IN ('fk_transactions_allocation_plan', 'fk_transactions_parent');
```

**Expected Result:** 2 rows
- fk_transactions_allocation_plan | transactions | allocation_plan_id | allocation_plans | id
- fk_transactions_parent | transactions | parent_transaction_id | transactions | id

### Step 4: Check Indexes

```sql
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
AND (tablename IN ('allocation_plans', 'allocation_plan_items', 'transactions'))
AND indexname LIKE '%allocation%'
ORDER BY tablename, indexname;
```

**Expected Result:** Should include:
- idx_allocation_plan_items_envelope
- idx_allocation_plan_items_plan
- idx_allocation_plans_source
- idx_allocation_plans_status
- idx_allocation_plans_user
- idx_transactions_allocation_plan
- idx_transactions_auto_allocated
- idx_transactions_parent

### Step 5: Test Insert

Try creating a test allocation plan:

```sql
-- Get your user ID first
SELECT id FROM auth.users LIMIT 1;

-- Insert test plan (replace YOUR_USER_ID)
INSERT INTO public.allocation_plans (
  user_id,
  amount,
  status,
  regular_total,
  surplus_total,
  envelope_count
) VALUES (
  'YOUR_USER_ID',
  1000.00,
  'pending',
  950.00,
  50.00,
  10
)
RETURNING *;
```

**Expected Result:** Row inserted successfully with generated UUID.

**If fails:** Check error message for details.

### Step 6: Test RLS

Try querying as your user:

```sql
-- This should return the test plan you just created
SELECT * FROM public.allocation_plans;
```

**Expected Result:** Shows your allocation plans.

**If empty and you know plans exist:** RLS policy issue.

---

## Alternative: Run Migration in Parts

If the full migration fails, try running it in smaller chunks:

### Part 1: Create allocation_plans table

```sql
CREATE TABLE IF NOT EXISTS public.allocation_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_transaction_id uuid REFERENCES public.transactions(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  status text NOT NULL CHECK (status IN ('pending', 'applied', 'rejected')) DEFAULT 'pending',
  applied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  regular_total numeric(12,2),
  surplus_total numeric(12,2),
  envelope_count integer
);
```

**Run, then verify:** `SELECT * FROM allocation_plans LIMIT 1;`

### Part 2: Add columns to transactions

```sql
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS allocation_plan_id uuid,
ADD COLUMN IF NOT EXISTS is_auto_allocated boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS parent_transaction_id uuid;
```

**Run, then verify:** `SELECT allocation_plan_id, is_auto_allocated, parent_transaction_id FROM transactions LIMIT 1;`

### Part 3: Add foreign keys

```sql
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
```

### Part 4: Create indexes

```sql
CREATE INDEX IF NOT EXISTS idx_transactions_parent ON public.transactions(parent_transaction_id);
CREATE INDEX IF NOT EXISTS idx_transactions_allocation_plan ON public.transactions(allocation_plan_id);
CREATE INDEX IF NOT EXISTS idx_transactions_auto_allocated ON public.transactions(is_auto_allocated) WHERE is_auto_allocated = true;

CREATE INDEX IF NOT EXISTS idx_allocation_plans_user ON public.allocation_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_allocation_plans_status ON public.allocation_plans(status);
CREATE INDEX IF NOT EXISTS idx_allocation_plans_source ON public.allocation_plans(source_transaction_id);
```

### Part 5: Enable RLS

```sql
ALTER TABLE public.allocation_plans ENABLE ROW LEVEL SECURITY;
```

### Part 6: Create RLS policies

```sql
CREATE POLICY "Users can view own allocation plans"
  ON public.allocation_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own allocation plans"
  ON public.allocation_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own allocation plans"
  ON public.allocation_plans FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own allocation plans"
  ON public.allocation_plans FOR DELETE
  USING (auth.uid() = user_id);
```

### Part 7: Create allocation_plan_items table

```sql
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

CREATE INDEX IF NOT EXISTS idx_allocation_plan_items_plan ON public.allocation_plan_items(plan_id);
CREATE INDEX IF NOT EXISTS idx_allocation_plan_items_envelope ON public.allocation_plan_items(envelope_id);

ALTER TABLE public.allocation_plan_items ENABLE ROW LEVEL SECURITY;
```

### Part 8: RLS for allocation_plan_items

```sql
CREATE POLICY "Users can view own allocation plan items"
  ON public.allocation_plan_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.allocation_plans
      WHERE allocation_plans.id = allocation_plan_items.plan_id
        AND allocation_plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own allocation plan items"
  ON public.allocation_plan_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.allocation_plans
      WHERE allocation_plans.id = allocation_plan_items.plan_id
        AND allocation_plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own allocation plan items"
  ON public.allocation_plan_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.allocation_plans
      WHERE allocation_plans.id = allocation_plan_items.plan_id
        AND allocation_plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own allocation plan items"
  ON public.allocation_plan_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.allocation_plans
      WHERE allocation_plans.id = allocation_plan_items.plan_id
        AND allocation_plans.user_id = auth.uid()
    )
  );
```

### Part 9: Function and trigger

```sql
CREATE OR REPLACE FUNCTION update_allocation_plan_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_allocation_plans_updated_at
  BEFORE UPDATE ON public.allocation_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_allocation_plan_updated_at();
```

---

## What to Tell Me

To help you better, please share:

1. **Error Message:** Copy the exact error from Supabase SQL Editor
2. **Which step failed:** Did tables create? Did columns add? Did policies fail?
3. **Verification results:** Run the verification queries above and share results

For example:
```
Error: relation "allocation_plans" does not exist
Step: Part 3 (foreign keys)
Verification: Part 1 shows 0 tables created
```

---

## Quick Health Check

Run this single query to check everything:

```sql
SELECT
  'allocation_plans table' as check_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'allocation_plans') THEN '✓' ELSE '✗' END as status
UNION ALL
SELECT
  'allocation_plan_items table',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'allocation_plan_items') THEN '✓' ELSE '✗' END
UNION ALL
SELECT
  'allocation_plan_id column',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'allocation_plan_id') THEN '✓' ELSE '✗' END
UNION ALL
SELECT
  'is_auto_allocated column',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'is_auto_allocated') THEN '✓' ELSE '✗' END
UNION ALL
SELECT
  'parent_transaction_id column',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'parent_transaction_id') THEN '✓' ELSE '✗' END
UNION ALL
SELECT
  'RLS on allocation_plans',
  CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'allocation_plans' AND rowsecurity = true) THEN '✓' ELSE '✗' END
UNION ALL
SELECT
  'RLS policies count',
  CAST(COUNT(*) as text) || ' of 8'
FROM pg_policies
WHERE tablename IN ('allocation_plans', 'allocation_plan_items');
```

**Expected Output:**
```
allocation_plans table              | ✓
allocation_plan_items table         | ✓
allocation_plan_id column          | ✓
is_auto_allocated column           | ✓
parent_transaction_id column       | ✓
RLS on allocation_plans            | ✓
RLS policies count                 | 8 of 8
```

Copy the results and show me what you get!
