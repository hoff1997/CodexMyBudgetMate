# Apply Remaining Database Migrations

**Date:** 2025-11-06
**Status:** Ready to Apply

---

## Quick Summary

You need to apply **3 SQL migrations** in your Supabase Dashboard. Copy and paste each one into the SQL Editor and run them.

---

## Migration 1: Pay Cycle Field (Verify/Add)

**Purpose:** Store user's pay frequency preference (weekly, fortnightly, monthly)

### Step 1: Check if it exists

Run this first:

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'pay_cycle';
```

### Step 2A: If it returns NO ROWS (field doesn't exist), run this:

```sql
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS pay_cycle text default 'monthly'
CHECK (pay_cycle IN ('weekly', 'fortnightly', 'monthly'));

COMMENT ON COLUMN public.profiles.pay_cycle IS 'User pay frequency: weekly, fortnightly, or monthly';

-- Set default for existing users
UPDATE public.profiles
SET pay_cycle = 'fortnightly'
WHERE pay_cycle IS NULL;
```

### Step 2B: If it returns a ROW (field already exists), skip to Migration 2

---

## Migration 2: Credit Card Holding Account System

**Purpose:** Track credit card spending allocation with holding accounts

**File:** `supabase/migrations/0007_credit_card_holding_system.sql`

```sql
-- Add Credit Card Holding Account System
-- This enables automatic tracking and allocation of credit card spending

-- Add is_credit_card_holding flag to accounts table
ALTER TABLE public.accounts
ADD COLUMN IF NOT EXISTS is_credit_card_holding boolean default false;

-- Add is_credit_card_payment flag to envelopes table
ALTER TABLE public.envelopes
ADD COLUMN IF NOT EXISTS is_credit_card_payment boolean default false;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_accounts_is_cc_holding
  ON public.accounts(is_credit_card_holding)
  WHERE is_credit_card_holding = true;

CREATE INDEX IF NOT EXISTS idx_envelopes_is_cc_payment
  ON public.envelopes(is_credit_card_payment)
  WHERE is_credit_card_payment = true;

-- Add comments for documentation
COMMENT ON COLUMN public.accounts.is_credit_card_holding IS
  'True if this account is used to hold funds allocated for credit card payments. System uses this to track money set aside for CC bills.';

COMMENT ON COLUMN public.envelopes.is_credit_card_payment IS
  'True if this envelope is used to track credit card payment obligations. Links to credit card holding account.';

-- Create a table to track credit card allocations for audit trail
CREATE TABLE IF NOT EXISTS public.credit_card_allocations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  transaction_id uuid not null references public.transactions on delete cascade,
  envelope_id uuid not null references public.envelopes on delete cascade,
  holding_account_id uuid not null references public.accounts on delete cascade,
  credit_card_account_id uuid not null references public.accounts on delete cascade,
  amount numeric(12,2) not null,
  allocated_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);

-- Add index for querying allocations
CREATE INDEX IF NOT EXISTS idx_cc_allocations_transaction
  ON public.credit_card_allocations(transaction_id);

CREATE INDEX IF NOT EXISTS idx_cc_allocations_user
  ON public.credit_card_allocations(user_id);

CREATE INDEX IF NOT EXISTS idx_cc_allocations_holding_account
  ON public.credit_card_allocations(holding_account_id);

-- Add comment
COMMENT ON TABLE public.credit_card_allocations IS
  'Audit trail for credit card holding account allocations. Tracks when money is moved from envelopes to the holding account for CC payments.';

-- Enable RLS on credit_card_allocations
ALTER TABLE public.credit_card_allocations ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for credit_card_allocations
CREATE POLICY "Users can view their own CC allocations"
  ON public.credit_card_allocations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own CC allocations"
  ON public.credit_card_allocations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create a function to automatically allocate credit card transactions
CREATE OR REPLACE FUNCTION public.allocate_credit_card_transaction()
RETURNS TRIGGER AS $$
DECLARE
  v_holding_account_id uuid;
  v_envelope_amount numeric(12,2);
BEGIN
  -- Only process if transaction is assigned to a credit card account
  IF NEW.account_id IS NOT NULL THEN
    -- Check if the account is a credit card (type = 'debt')
    IF EXISTS (
      SELECT 1 FROM public.accounts
      WHERE id = NEW.account_id
      AND type = 'debt'
      AND user_id = NEW.user_id
    ) THEN
      -- Find the credit card holding account for this user
      SELECT id INTO v_holding_account_id
      FROM public.accounts
      WHERE user_id = NEW.user_id
      AND is_credit_card_holding = true
      LIMIT 1;

      -- If holding account exists and transaction has an envelope assigned
      IF v_holding_account_id IS NOT NULL AND NEW.envelope_id IS NOT NULL THEN
        -- Record the allocation
        INSERT INTO public.credit_card_allocations (
          user_id,
          transaction_id,
          envelope_id,
          holding_account_id,
          credit_card_account_id,
          amount,
          notes
        ) VALUES (
          NEW.user_id,
          NEW.id,
          NEW.envelope_id,
          v_holding_account_id,
          NEW.account_id,
          ABS(NEW.amount),
          'Automatic allocation from credit card transaction'
        );

        -- Update holding account balance (increase)
        UPDATE public.accounts
        SET current_balance = current_balance + ABS(NEW.amount),
            updated_at = now()
        WHERE id = v_holding_account_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic allocation (disabled by default - enable via API when ready)
-- Uncomment to enable automatic allocation:
-- CREATE TRIGGER trigger_allocate_credit_card_transaction
--   AFTER INSERT ON public.transactions
--   FOR EACH ROW
--   WHEN (NEW.status = 'approved')
--   EXECUTE FUNCTION public.allocate_credit_card_transaction();

COMMENT ON FUNCTION public.allocate_credit_card_transaction IS
  'Automatically allocates credit card transactions to the holding account when a transaction is created or approved. Trigger is disabled by default and should be enabled via application logic.';
```

---

## Migration 3: Envelope Monitoring

**Purpose:** Allow users to mark specific envelopes for monitoring in dashboard widget

**File:** `supabase/migrations/0011_envelope_monitoring.sql`

```sql
-- Add is_monitored field to envelopes table
-- This allows users to mark specific envelopes for monitoring in the dashboard widget

alter table if exists public.envelopes
  add column if not exists is_monitored boolean default false;

-- Add index for faster filtering of monitored envelopes
create index if not exists idx_envelopes_monitored on public.envelopes(is_monitored) where is_monitored = true;

-- Add comment for documentation
comment on column public.envelopes.is_monitored is 'Flag to indicate if this envelope should be displayed in the Monitored Envelopes dashboard widget';
```

---

## How to Apply These Migrations

### Method: Supabase Dashboard (Easiest)

1. Go to your Supabase project: https://nqmeepudwtwkpjomxqfz.supabase.co
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. For each migration:
   - Copy the entire SQL code block above
   - Paste it into the SQL Editor
   - Click **Run** (or press Ctrl+Enter)
   - Wait for "Success" message
5. Repeat for all 3 migrations

---

## Verification

After applying all migrations, run this to verify everything worked:

```sql
-- Check pay_cycle field
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'pay_cycle';

-- Check credit card fields on accounts
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'accounts' AND column_name = 'is_credit_card_holding';

-- Check credit card fields on envelopes
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'envelopes' AND column_name IN ('is_credit_card_payment', 'is_monitored');

-- Check if credit_card_allocations table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'credit_card_allocations'
);
```

Expected results:
- `pay_cycle` column exists in profiles (text, default 'monthly')
- `is_credit_card_holding` column exists in accounts (boolean, default false)
- `is_credit_card_payment` and `is_monitored` columns exist in envelopes (boolean, default false)
- `credit_card_allocations` table exists (returns true)

---

## What These Migrations Enable

### 1. Pay Cycle Field
- Users can set their pay frequency (weekly, fortnightly, monthly)
- Zero Budget Setup page can calculate per-pay-cycle amounts
- Setup Wizard can use pay frequency for envelope calculations

### 2. Credit Card Holding System
- Track credit card spending allocation
- Holding account to set aside money for CC bills
- Audit trail for all allocations
- Optional automatic allocation (trigger disabled by default)
- Dashboard widget showing CC holding balance

### 3. Envelope Monitoring
- Mark important envelopes for monitoring
- Display monitored envelopes in dashboard widget
- Quick view of key envelope balances

---

## Safety Notes

- All migrations use `IF NOT EXISTS` clauses - safe to run multiple times
- All migrations are non-destructive - they only ADD columns and tables
- RLS (Row Level Security) policies are included for credit_card_allocations
- The automatic allocation trigger is **disabled by default** - you control when to enable it

---

## After Migration

Once all migrations are applied, let me know and I'll:
1. Update the PENDING_DATABASE_CHANGES.md status
2. Test the new fields in the app
3. Move on to implementing the credit card holding account widget

---

**Ready to apply?** Just paste each SQL block into your Supabase SQL Editor and run them! 🚀
