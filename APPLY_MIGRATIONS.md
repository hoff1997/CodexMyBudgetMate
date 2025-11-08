# How to Apply Database Migrations

Since the Supabase RPC function for running migrations is not available, you'll need to apply the migrations manually through the Supabase Dashboard.

## Migration Files to Apply

Apply these 3 migration files in order:

1. **0006_add_envelope_type.sql** - Adds envelope_type field
2. **0007_credit_card_holding_system.sql** - Credit card holding system
3. **0011_envelope_monitoring.sql** - Envelope monitoring feature

## Steps to Apply

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project: https://nqmeepudwtwkpjomxqfz.supabase.co
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**
4. For each migration file:
   - Open the file in `supabase/migrations/`
   - Copy the entire SQL content
   - Paste it into the SQL Editor
   - Click **Run** (or press Ctrl+Enter)
5. Repeat for all 3 migration files

### Option 2: Using Supabase CLI

If you install the Supabase CLI:

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref nqmeepudwtwkpjomxqfz

# Push migrations
supabase db push
```

## Migration Contents

### 1. 0006_add_envelope_type.sql
```sql
-- Add envelope_type column to envelopes table
alter table if exists public.envelopes
  add column if not exists envelope_type text default 'expense'
    check (envelope_type in ('income', 'expense', 'savings', 'debt'));

-- Add comment
comment on column public.envelopes.envelope_type is
  'Type of envelope: income, expense, savings, or debt';

-- Create index for filtering
create index if not exists idx_envelopes_type
  on public.envelopes(envelope_type);
```

### 2. 0007_credit_card_holding_system.sql
Creates the credit_card_holding table and related functions for tracking credit card balances and allocations.

### 3. 0011_envelope_monitoring.sql
```sql
-- Add is_monitored field to envelopes table
alter table if exists public.envelopes
  add column if not exists is_monitored boolean default false;

-- Add index for faster filtering of monitored envelopes
create index if not exists idx_envelopes_monitored
  on public.envelopes(is_monitored)
  where is_monitored = true;

-- Add comment for documentation
comment on column public.envelopes.is_monitored is
  'Flag to indicate if this envelope should be displayed in the Monitored Envelopes dashboard widget';
```

## Verification

After applying the migrations, you can verify they worked by running this query in the SQL Editor:

```sql
-- Check if new columns exist
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'envelopes'
  AND column_name IN ('envelope_type', 'is_monitored');

-- Check if credit_card_holding table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'credit_card_holding'
);
```

## Notes

- These migrations use `IF NOT EXISTS` clauses, so they're safe to run multiple times
- If a migration fails, check the error message - it might already be applied
- The migrations add new columns and tables but don't modify existing data
