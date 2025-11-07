# How to Apply the Auto-Allocation Migration

**Date:** 2025-11-07
**Migration File:** `supabase/migrations/0013_auto_allocation_system.sql`

---

## Step-by-Step Instructions

### Step 1: Open Supabase Dashboard

1. Go to your Supabase project: https://supabase.com/dashboard
2. Select your "My Budget Mate" project
3. Click on **"SQL Editor"** in the left sidebar

### Step 2: Open the Migration File

In VS Code (or your editor), open:
```
supabase/migrations/0013_auto_allocation_system.sql
```

### Step 3: Copy the Entire SQL

1. Select all content in the file (Ctrl+A or Cmd+A)
2. Copy it (Ctrl+C or Cmd+C)

### Step 4: Paste into Supabase SQL Editor

1. In the Supabase SQL Editor, click **"New query"**
2. Paste the entire migration SQL (Ctrl+V or Cmd+V)
3. You should see ~170 lines of SQL code

### Step 5: Run the Migration

1. Click the **"Run"** button (or press Ctrl+Enter)
2. Wait for execution (should take 2-5 seconds)
3. Look for success message at the bottom

### Step 6: Verify Success

You should see output like:
```
Success. No rows returned
```

This is expected - the migration creates tables and doesn't return data.

### Step 7: Verify Tables Created

In the left sidebar, click **"Table Editor"** and look for:

✅ **allocation_plans** - Should see new table
✅ **allocation_plan_items** - Should see new table

Click on **transactions** table and check for new columns:
✅ **allocation_plan_id** - New column
✅ **is_auto_allocated** - New column
✅ **parent_transaction_id** - New column

---

## What This Migration Does

### Creates 2 New Tables:

**1. allocation_plans**
- Stores each auto-allocation instance
- Tracks status (pending, applied, rejected)
- Links to source income transaction

**2. allocation_plan_items**
- Stores individual envelope allocations
- Details for each split (amount, priority, regular/surplus)

### Adds 3 Columns to transactions:

**allocation_plan_id**
- Links transactions to their allocation plan
- Null for regular transactions

**is_auto_allocated**
- Boolean flag for auto-allocated income transactions
- Used to identify transactions to display in reconciliation

**parent_transaction_id**
- Links child transactions to parent income transaction
- Allows grouping of split transactions

### Security (RLS Policies):

- Users can only see their own allocation plans
- Users can only create/update/delete their own plans
- Users can only see plan items for their own plans

---

## Troubleshooting

### Error: "relation already exists"

**Solution:** Table already created. This is fine - the migration uses `CREATE TABLE IF NOT EXISTS` so it's safe to run multiple times.

### Error: "column already exists"

**Solution:** Column already added. This is fine - the migration uses `ADD COLUMN IF NOT EXISTS` so it's safe to run multiple times.

### Error: "constraint already exists"

**Solution:** The migration handles this with `DO $$ ... IF NOT EXISTS` blocks. If you still see this error, the constraint is already there and working.

### Error: "relation 'allocation_plans' does not exist"

**Problem:** The foreign key is being added before the table is created.

**Solution:** I've fixed this in the corrected migration. The `allocation_plans` table is now created FIRST (Step 1), before adding foreign keys (Step 3).

### Error: "permission denied"

**Problem:** You might not have admin access to the database.

**Solution:** Make sure you're logged in as the project owner in Supabase dashboard.

---

## Verification Queries

After running the migration, you can verify everything works:

### Check tables exist:
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('allocation_plans', 'allocation_plan_items');
```

Should return 2 rows.

### Check columns added to transactions:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'transactions'
AND column_name IN ('allocation_plan_id', 'is_auto_allocated', 'parent_transaction_id');
```

Should return 3 rows.

### Check RLS policies:
```sql
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename IN ('allocation_plans', 'allocation_plan_items');
```

Should return 8 rows (4 policies per table).

---

## What Happens Next?

After this migration:

1. ✅ Database schema is ready
2. ✅ Auto-allocation can store plans
3. ✅ Transactions can link to plans
4. ✅ Security is in place

Next steps:
1. Hook auto-allocation into transaction import (see AUTO_ALLOCATION_INTEGRATION_GUIDE.md)
2. Add UI component to reconciliation page
3. Test with sample income transaction

---

## Rollback (If Needed)

If you need to undo this migration:

```sql
-- Drop tables (cascades to items)
DROP TABLE IF EXISTS public.allocation_plan_items CASCADE;
DROP TABLE IF EXISTS public.allocation_plans CASCADE;

-- Drop function and trigger
DROP TRIGGER IF EXISTS trigger_allocation_plans_updated_at ON public.allocation_plans;
DROP FUNCTION IF EXISTS update_allocation_plan_updated_at();

-- Remove columns from transactions
ALTER TABLE public.transactions
DROP COLUMN IF EXISTS allocation_plan_id,
DROP COLUMN IF EXISTS is_auto_allocated,
DROP COLUMN IF EXISTS parent_transaction_id;
```

⚠️ **Warning:** This will delete all allocation data. Only do this if you haven't started using the feature.

---

## Success!

Once the migration runs successfully:

✅ Your database is ready for auto-allocation
✅ All security policies are in place
✅ Ready to integrate with the app

Next: Follow [AUTO_ALLOCATION_INTEGRATION_GUIDE.md](AUTO_ALLOCATION_INTEGRATION_GUIDE.md) to integrate with your transaction import flow.
