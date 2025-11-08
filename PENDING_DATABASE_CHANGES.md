# Pending Database Changes - Migration Tracker

**Last Updated:** 2025-11-05
**Status:** Tracking all database changes needed before final testing

---

## 📋 Overview

This document tracks all database migrations and schema changes needed to complete the Replit to VS Code migration. These changes should be applied **all at once** before final testing.

---

## 🗄️ Required Migrations

### 1. Add `envelope_type` Field to Envelopes Table
**File:** `supabase/migrations/0006_add_envelope_type.sql`
**Status:** ✅ Created, ⏳ Not Applied
**Phase:** 1.1 - Zero Budget Setup Page

**Purpose:** Distinguish between income and expense envelopes for budget calculations

```sql
alter table public.envelopes
  add column if not exists envelope_type text check (envelope_type in ('income', 'expense')) default 'expense';

create index if not exists idx_envelopes_envelope_type on public.envelopes(envelope_type);

comment on column public.envelopes.envelope_type is 'Type of envelope: income or expense. Used for budget calculations in zero-budget-setup.';
```

**Impact:** Required for Zero Budget Setup page to work

---

### 2. Verify/Add `pay_cycle` Field to Profiles Table
**Status:** ⏳ Needs Verification
**Phase:** 1.1 - Zero Budget Setup Page

**Purpose:** Store user's pay frequency preference (weekly, fortnightly, monthly)

**Check if exists:**
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'pay_cycle';
```

**If missing, add:**
```sql
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS pay_cycle text default 'monthly'
CHECK (pay_cycle IN ('weekly', 'fortnightly', 'monthly'));

COMMENT ON COLUMN public.profiles.pay_cycle IS 'User pay frequency: weekly, fortnightly, or monthly';
```

**Impact:** Required for pay cycle configuration in Zero Budget Setup

---

### 3. Credit Card Holding Account System
**File:** `supabase/migrations/0007_credit_card_holding_system.sql`
**Status:** ✅ Created, ⏳ Not Applied
**Phase:** 1.4 - Credit Card Holding Account System

**Purpose:** Complete credit card holding account system with audit trail

**Includes:**
1. Add `is_credit_card_holding` boolean flag to accounts table
2. Add `is_credit_card_payment` boolean flag to envelopes table
3. Create `credit_card_allocations` audit trail table
4. Add indexes for performance
5. Add RLS policies for security
6. Create automatic allocation trigger function (disabled by default)

```sql
-- Add flags to accounts table
ALTER TABLE public.accounts
ADD COLUMN IF NOT EXISTS is_credit_card_holding boolean default false;

-- Add flags to envelopes table
ALTER TABLE public.envelopes
ADD COLUMN IF NOT EXISTS is_credit_card_payment boolean default false;

-- Create audit trail table
CREATE TABLE IF NOT EXISTS public.credit_card_allocations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  transaction_id uuid not null references public.transactions on delete cascade,
  envelope_id uuid not null references public.envelopes on delete cascade,
  holding_account_id uuid not null references public.accounts on delete cascade,
  credit_card_account_id uuid not null references public.accounts on delete cascade,
  amount numeric(12,2) not null,
  allocated_at timestamptz not null default now(),
  notes text
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_accounts_is_cc_holding ON public.accounts(is_credit_card_holding);
CREATE INDEX IF NOT EXISTS idx_envelopes_is_cc_payment ON public.envelopes(is_credit_card_payment);
CREATE INDEX IF NOT EXISTS idx_cc_allocations_user_id ON public.credit_card_allocations(user_id);
CREATE INDEX IF NOT EXISTS idx_cc_allocations_transaction_id ON public.credit_card_allocations(transaction_id);

-- RLS policies
ALTER TABLE public.credit_card_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own credit card allocations" ON public.credit_card_allocations
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own credit card allocations" ON public.credit_card_allocations
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own credit card allocations" ON public.credit_card_allocations
  FOR DELETE USING (auth.uid() = user_id);

-- Automatic allocation trigger function (DISABLED by default)
-- To enable: CREATE TRIGGER allocate_cc_trigger AFTER INSERT ON transactions
--            FOR EACH ROW EXECUTE FUNCTION allocate_credit_card_transaction();
```

**Impact:**
- Enables credit card holding account widget on dashboard
- Provides manual allocation API endpoints
- Allows tracking of credit card spending allocation
- Optional automatic allocation via database trigger

---

### 4. [FUTURE] Transaction Processing Enhancements
**Status:** 📅 Planned for Phase 2
**Phase:** 2.2 - Transaction Dialogs

**Potential fields to add:**
- `receipt_url` (if not exists) for receipt upload
- `split_transaction_id` for linking split transactions
- `is_split` boolean flag
- Additional fields TBD during Phase 2 implementation

---

### 5. [FUTURE] Two-Factor Authentication Fields
**Status:** 📅 Planned for Phase 7
**Phase:** 7.1 - Two-Factor Authentication

**Fields to Add to profiles/users:**
```sql
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS two_factor_enabled boolean default false,
ADD COLUMN IF NOT EXISTS two_factor_secret text, -- Encrypted
ADD COLUMN IF NOT EXISTS backup_codes jsonb; -- Encrypted array

COMMENT ON COLUMN public.profiles.two_factor_enabled IS 'Whether 2FA is enabled for this user';
```

---

## 🔧 Manual Data Updates Needed

### 1. Categorize Existing Envelopes
**When:** After applying migration #1 (`envelope_type` field)
**Status:** ⏳ Pending

```sql
-- Update income envelopes (customize names as needed)
UPDATE public.envelopes
SET envelope_type = 'income'
WHERE name ILIKE '%salary%'
   OR name ILIKE '%wage%'
   OR name ILIKE '%income%'
   OR name ILIKE '%freelance%'
   OR name ILIKE '%investment%';

-- All others will default to 'expense' (already set by migration default)
```

**Impact:** Ensures existing envelopes are properly categorized

---

### 2. Set Default Pay Cycle for Existing Users
**When:** After verifying/adding `pay_cycle` field
**Status:** ⏳ Pending

```sql
-- Set default pay cycle for users who don't have one
UPDATE public.profiles
SET pay_cycle = 'fortnightly' -- or 'monthly' based on your preference
WHERE pay_cycle IS NULL;
```

---

## 📊 Schema Verification Checklist

Before applying migrations, verify these tables exist:

### Core Tables
- [ ] `envelopes` - Main envelope management
- [ ] `envelope_categories` - Envelope category grouping
- [ ] `accounts` - Bank accounts
- [ ] `transactions` - Financial transactions
- [ ] `profiles` - User profiles

### Existing Fields to Verify
- [ ] `envelopes.target_amount` - Exists ✅
- [ ] `envelopes.annual_amount` - Exists ✅
- [ ] `envelopes.pay_cycle_amount` - Exists ✅
- [ ] `envelopes.opening_balance` - Exists ✅
- [ ] `envelopes.current_amount` - Exists ✅
- [ ] `envelopes.frequency` - Exists ✅
- [ ] `envelopes.next_payment_due` - Exists ✅
- [ ] `envelopes.notes` - Exists ✅

---

## 🚀 Migration Execution Plan

### Step 1: Pre-Migration Checklist
- [ ] Backup database
- [ ] Verify Supabase connection
- [ ] Note current row counts for key tables
- [ ] Test database access

### Step 2: Apply Migrations in Order
1. [ ] Run migration `0006_add_envelope_type.sql`
2. [ ] Verify/add `pay_cycle` field to profiles
3. [ ] Run migration `0007_credit_card_holding_system.sql`
4. [ ] Run any additional migrations as they're created during remaining phases

### Step 3: Manual Data Updates
1. [ ] Categorize existing envelopes (income vs expense)
2. [ ] Set default pay cycle for existing users
3. [ ] Any other data cleanup needed

### Step 4: Verification
1. [ ] Check all new columns exist
2. [ ] Verify indexes created
3. [ ] Test constraints work
4. [ ] Run test queries

### Step 5: API Testing
1. [ ] Test `/api/user/pay-cycle` endpoint
2. [ ] Test envelope CRUD with new `envelope_type` field
3. [ ] Test `/api/credit-card-holding` endpoint (GET and POST)
4. [ ] Test `/api/transactions/[id]/credit-card-allocation` endpoint (POST, GET, DELETE)
5. [ ] Test credit card holding widget on dashboard
6. [ ] Verify all existing API endpoints still work

---

## 📝 Notes

### Conventions
- ✅ Created = Migration file exists
- ⏳ Pending = Not yet applied to database
- 📅 Planned = Will be created in future phase
- ✔️ Applied = Successfully run on database
- ❌ Failed = Encountered errors

### Adding New Migrations
When creating new migrations during development:

1. Create migration file in `supabase/migrations/`
2. Use sequential numbering: `0007_`, `0008_`, etc.
3. Add entry to this document with:
   - File name
   - Purpose
   - SQL preview
   - Impact statement
   - Related phase

---

## 🔄 Quick Reference: How to Apply Migrations

### Option A: Supabase CLI (Recommended)
```bash
# Reset database and apply all migrations
supabase db reset

# Or apply migrations incrementally
supabase db push
```

### Option B: Supabase Dashboard
1. Go to Supabase Dashboard
2. Navigate to SQL Editor
3. Copy migration file contents
4. Execute SQL
5. Verify success in Table Editor

### Option C: Direct SQL Connection
```bash
# If using psql or another SQL client
psql <connection_string> -f supabase/migrations/0006_add_envelope_type.sql
```

---

## 📅 Timeline

- **Phase 1 Migrations:** To be applied after Phase 1 completion (~Weeks 1-2)
- **Phase 2-3 Migrations:** To be applied after Phase 3 completion (~Weeks 3-4)
- **Phase 4-7 Migrations:** To be applied after Phase 7 completion (~Weeks 5-6)
- **Final Verification:** Week 8

---

## ✅ Completion Tracking

### Migrations Applied
- [ ] 0006_add_envelope_type.sql
- [ ] profiles.pay_cycle field
- [ ] 0007_credit_card_holding_system.sql
- [ ] Manual data updates completed
- [ ] All indexes created
- [ ] All constraints verified

### Tests Passed
- [ ] Zero Budget Setup page works
- [ ] Setup Wizard (4-step) works
- [ ] Pay cycle updates persist
- [ ] Envelope type filtering works
- [ ] Credit card holding widget displays
- [ ] Credit card allocation API works
- [ ] All existing features still work

---

**This document will be updated as new phases are completed and additional migrations are needed.**
