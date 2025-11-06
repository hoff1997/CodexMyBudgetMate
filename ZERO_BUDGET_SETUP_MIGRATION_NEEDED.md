# Zero Budget Setup Page - Migration Requirements

## 🚨 Issue Summary

The Zero Budget Setup page is not working correctly because it depends on the `envelope_type` field which:
1. ✅ Has a migration file created
2. ❌ Migration NOT yet applied to database
3. ❌ API endpoints don't support the field
4. ❌ Database schema is incomplete

## 🔍 Evidence Found

### 1. Client Code Expects `envelope_type`
**File**: `app/(app)/zero-budget-setup/zero-budget-setup-client.tsx`

```typescript
interface Envelope {
  id: string;
  name: string;
  envelope_type?: string;  // ← REQUIRED: Used to distinguish income vs expense
  target_amount?: string | number;
  // ... other fields
}
```

**Usage in Code**:
- Lines 45-46: Interface defines `envelope_type?` field
- Line 141: Checks `envelope.envelope_type === "expense"`
- The page categorizes envelopes as "income" or "expense" for budget calculations
- Calculates budget balance: `total income - total expenses`

### 2. Migration File EXISTS But Not Applied
**File**: `supabase/migrations/0006_add_envelope_type.sql`

```sql
alter table public.envelopes
  add column if not exists envelope_type text
  check (envelope_type in ('income', 'expense'))
  default 'expense';

create index if not exists idx_envelopes_envelope_type
  on public.envelopes(envelope_type);
```

**Status**: ✅ File created, ❌ NOT applied to database

### 3. API Endpoint Missing `envelope_type` Support
**File**: `app/api/envelopes/route.ts`

**POST Endpoint (Create Envelope)**:
- ❌ Schema doesn't include `envelope_type`
- ❌ Insert statement doesn't include `envelope_type`
- ✅ Includes: name, target_amount, pay_cycle_amount, frequency, etc.

**Missing**:
```typescript
// Schema needs:
envelopeType: z.enum(["income", "expense"]).optional(),

// Insert needs:
envelope_type: payload.envelopeType ?? 'expense',
```

### 4. GET Endpoint Needs to Return `envelope_type`
**Current Behavior**: When fetching envelopes via `/api/envelopes`, the response doesn't include `envelope_type` field.

**Required**: The SELECT statement needs to include `envelope_type` in the response.

## ✅ Complete Fix Checklist

### Step 1: Apply Database Migration
Run the migration in Supabase Dashboard:

```sql
-- From file: supabase/migrations/0006_add_envelope_type.sql
alter table public.envelopes
  add column if not exists envelope_type text
  check (envelope_type in ('income', 'expense'))
  default 'expense';

create index if not exists idx_envelopes_envelope_type
  on public.envelopes(envelope_type);

comment on column public.envelopes.envelope_type is
  'Type of envelope: income or expense. Used for budget calculations in zero-budget-setup.';
```

### Step 2: Update POST /api/envelopes
**File**: `app/api/envelopes/route.ts`

Add to schema:
```typescript
const schema = z.object({
  name: z.string().min(1),
  categoryId: z.string().uuid().optional(),
  envelopeType: z.enum(["income", "expense"]).optional(), // ← ADD THIS
  targetAmount: z.number().nonnegative().default(0),
  // ... rest of schema
});
```

Add to insert:
```typescript
const { error } = await supabase.from("envelopes").insert({
  user_id: session.user.id,
  name: payload.name,
  envelope_type: payload.envelopeType ?? 'expense', // ← ADD THIS
  category_id: categoryId,
  target_amount: payload.targetAmount,
  // ... rest of insert
});
```

### Step 3: Update PATCH /api/envelopes/[id]
**File**: `app/api/envelopes/[id]/route.ts` (if exists)

Add `envelope_type` to the updateable fields in PATCH endpoint.

### Step 4: Update GET Queries
Wherever envelopes are fetched, ensure the SELECT includes `envelope_type`:

**Files to check**:
- `app/(app)/zero-budget-setup/page.tsx`
- Any other pages that fetch envelopes

Example:
```typescript
const { data } = await supabase
  .from("envelopes")
  .select("id, name, envelope_type, target_amount, ...") // ← Include envelope_type
  .eq("user_id", session.user.id);
```

### Step 5: Categorize Existing Envelopes
After migration, update existing envelopes (run in Supabase SQL Editor):

```sql
-- Mark income envelopes
UPDATE public.envelopes
SET envelope_type = 'income'
WHERE name ILIKE '%salary%'
   OR name ILIKE '%wage%'
   OR name ILIKE '%income%'
   OR name ILIKE '%freelance%'
   OR name ILIKE '%investment%';

-- All others will be 'expense' (already default)
```

## 🧪 How to Test

After applying all fixes:

1. Go to `/zero-budget-setup` page
2. Create a new envelope with type "income"
3. Create a new envelope with type "expense"
4. Verify the budget calculation shows:
   - Total Income
   - Total Expenses
   - Difference (should equal 0 in zero-based budget)
5. Edit existing envelopes and change their type
6. Verify inline editing works for all fields

## 📊 Impact

**Before Fix**:
- ❌ Zero Budget Setup page can't distinguish income vs expense
- ❌ Budget calculations are broken
- ❌ Page may show errors or incorrect totals

**After Fix**:
- ✅ Income and expense envelopes properly categorized
- ✅ Budget balance calculation works (income - expenses)
- ✅ Zero-based budgeting fully functional
- ✅ Visual indicators show budget status (surplus/deficit)

## 🔗 Related Files

### Migration Files
- `supabase/migrations/0006_add_envelope_type.sql` - Database schema change

### API Files
- `app/api/envelopes/route.ts` - Create envelope endpoint
- `app/api/envelopes/[id]/route.ts` - Update envelope endpoint (if exists)

### Client Files
- `app/(app)/zero-budget-setup/page.tsx` - Server component
- `app/(app)/zero-budget-setup/zero-budget-setup-client.tsx` - Client component with budget logic

### Documentation
- `PENDING_DATABASE_CHANGES.md` - Lists all pending migrations
- `APPLY_MIGRATIONS.md` - Instructions for applying migrations

## 🚀 Priority

**HIGH PRIORITY** - This blocks the Zero Budget Setup feature completely.

The page will not function correctly until:
1. Database migration is applied
2. API endpoints support the field
3. Existing data is categorized

---

**Created**: 2025-11-06
**Status**: 🔴 Blocking Issue - Zero Budget Setup non-functional
