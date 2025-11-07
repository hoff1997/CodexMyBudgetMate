# Auto-Allocation Integration Guide

**Date:** 2025-11-07
**Status:** Implementation Complete - Integration Instructions

---

## ✅ What's Been Built

### 1. Database Schema
- **File:** `supabase/migrations/0013_auto_allocation_system.sql`
- **Tables:** `allocation_plans`, `allocation_plan_items`
- **Columns:** Added to `transactions` table

### 2. Core Logic
- **File:** `lib/allocations/auto-allocate.ts`
- **Functions:** `shouldAutoAllocate()`, `createAutoAllocation()`, `batchAutoAllocate()`

### 3. API Endpoints
- **GET** `/api/allocations/plans/[id]` - Get allocation details
- **POST** `/api/allocations/plans/[id]/reconcile` - Approve allocation
- **DELETE** `/api/allocations/plans/[id]` - Reject allocation

### 4. UI Component
- **File:** `components/allocations/auto-allocated-transaction-row.tsx`
- **Features:** Expand/collapse, review splits, reconcile, reject

---

## 🔌 Integration Steps

### Step 1: Apply Database Migration

```bash
# Copy contents of supabase/migrations/0013_auto_allocation_system.sql
# Paste into Supabase SQL Editor
# Run the migration
```

**What it does:**
- Creates `allocation_plans` and `allocation_plan_items` tables
- Adds tracking columns to `transactions` table
- Sets up RLS policies for security

### Step 2: Hook Into Transaction Import

You need to trigger auto-allocation when transactions are imported. Find your transaction import handler and add the auto-allocation logic.

#### Option A: Bank Sync Import Handler

If you have a bank sync import endpoint (e.g., `app/api/bank/sync/route.ts` or similar):

```typescript
// app/api/bank/sync/route.ts (or your import handler)

import { createAutoAllocation, shouldAutoAllocate } from "@/lib/allocations/auto-allocate";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ... your existing import logic ...
  // After creating transactions:

  const importedTransactions = []; // Your imported transactions array

  // Trigger auto-allocation for qualifying transactions
  for (const transaction of importedTransactions) {
    if (shouldAutoAllocate(transaction)) {
      const result = await createAutoAllocation(transaction, session.user.id);
      if (result.success) {
        console.log(`✅ Auto-allocated transaction ${transaction.id}`);
      } else {
        console.error(`❌ Failed to auto-allocate: ${result.error}`);
      }
    }
  }

  return NextResponse.json({
    imported: importedTransactions.length,
    autoAllocated: importedTransactions.filter(shouldAutoAllocate).length,
  });
}
```

#### Option B: Manual Transaction Creation

If transactions are created manually via an API endpoint (e.g., `app/api/transactions/route.ts`):

```typescript
// app/api/transactions/route.ts

import { createAutoAllocation, shouldAutoAllocate } from "@/lib/allocations/auto-allocate";

export async function POST(request: NextRequest) {
  // ... your existing transaction creation logic ...

  const { data: transaction, error } = await supabase
    .from("transactions")
    .insert(payload)
    .select()
    .single();

  if (error || !transaction) {
    return NextResponse.json({ error: "Failed to create transaction" }, { status: 400 });
  }

  // Trigger auto-allocation if qualifying
  if (shouldAutoAllocate(transaction)) {
    const result = await createAutoAllocation(transaction, session.user.id);
    if (result.success) {
      console.log(`✅ Auto-allocated transaction ${transaction.id}`);
    }
  }

  return NextResponse.json(transaction);
}
```

#### Option C: Database Trigger (Advanced)

You can also use a Supabase database trigger to auto-allocate on transaction insert:

```sql
-- This is an advanced approach using database functions

CREATE OR REPLACE FUNCTION trigger_auto_allocate_income()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger for income transactions over threshold
  IF NEW.envelope_type = 'income' AND NEW.amount >= 1000 AND NEW.reconciled = false THEN
    -- Call your auto-allocation logic via pg_net or edge function
    -- This is more complex and requires edge function setup
    PERFORM net.http_post(
      url := 'https://your-project.supabase.co/functions/v1/auto-allocate',
      body := jsonb_build_object('transaction_id', NEW.id)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_allocate_on_insert
  AFTER INSERT ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auto_allocate_income();
```

**Recommended:** Use Option A or B for simplicity. Option C requires additional edge function setup.

### Step 3: Integrate UI Component

Add the `AutoAllocatedTransactionRow` component to your reconciliation page or transaction list.

#### Find Your Reconciliation Page

Common locations:
- `app/(app)/reconciliation/page.tsx`
- `app/(app)/transactions/page.tsx` with unreconciled filter
- `app/(app)/banking/reconciliation/page.tsx`

#### Example Integration

```tsx
// app/(app)/reconciliation/page.tsx

import { AutoAllocatedTransactionRow } from "@/components/allocations/auto-allocated-transaction-row";

export default function ReconciliationPage() {
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    fetchUnreconciledTransactions();
  }, []);

  async function fetchUnreconciledTransactions() {
    const response = await fetch("/api/transactions?reconciled=false");
    const data = await response.json();
    setTransactions(data);
  }

  function handleRefresh() {
    fetchUnreconciledTransactions();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Reconciliation</h1>

      {transactions.map((transaction) => {
        // Check if transaction is auto-allocated
        if (transaction.is_auto_allocated && transaction.allocation_plan_id) {
          return (
            <AutoAllocatedTransactionRow
              key={transaction.id}
              transaction={{
                id: transaction.id,
                amount: transaction.amount,
                date: transaction.date,
                description: transaction.description,
                allocationPlanId: transaction.allocation_plan_id,
              }}
              onReconciled={handleRefresh}
              onRejected={handleRefresh}
            />
          );
        }

        // Regular transaction row
        return (
          <div key={transaction.id} className="border rounded p-4">
            {/* Your existing transaction row component */}
          </div>
        );
      })}
    </div>
  );
}
```

### Step 4: Update Transaction Query

Make sure your transaction fetch includes the new columns:

```typescript
// In your transaction API or query
const { data: transactions } = await supabase
  .from("transactions")
  .select(`
    *,
    allocation_plan_id,
    is_auto_allocated,
    parent_transaction_id
  `)
  .eq("reconciled", false)
  .order("date", { descending: true });
```

---

## 🧪 Testing the Integration

### Test 1: Import Income Transaction

1. Import or create an income transaction for $4,200
2. Check database: Should see new records in `allocation_plans` and `allocation_plan_items`
3. Check transactions: Should see 47+ child transactions (unreconciled)
4. Parent transaction should have `is_auto_allocated = true`

```sql
-- Verify allocation plan created
SELECT * FROM allocation_plans
WHERE source_transaction_id = 'your-transaction-id';

-- Verify child transactions created
SELECT COUNT(*) FROM transactions
WHERE parent_transaction_id = 'your-transaction-id';
```

### Test 2: View in Reconciliation Page

1. Navigate to reconciliation page
2. Should see auto-allocated transaction with "Review Split" button
3. Click "Review Split" to expand
4. Should see all envelopes grouped by priority

### Test 3: Reconcile Allocation

1. Click "Reconcile All" button
2. Should see success toast
3. Transaction should disappear from reconciliation list
4. Check envelope balances - should be updated

```sql
-- Verify reconciliation
SELECT * FROM allocation_plans
WHERE id = 'your-plan-id';
-- status should be 'applied'

-- Verify transactions reconciled
SELECT COUNT(*) FROM transactions
WHERE allocation_plan_id = 'your-plan-id'
AND reconciled = true;
```

### Test 4: Reject Allocation

1. Import another income transaction (auto-allocated)
2. Click "Review Split"
3. Click "Reject Auto-Split"
4. Confirm rejection
5. Child transactions should be deleted
6. Parent transaction should be available for manual allocation

---

## 🎯 User Flow Examples

### Example 1: First Paycheck

```
1. User connects bank account
2. Bank sync imports: "$4,200 - Salary"
3. System detects income + auto-creates allocation
4. User sees in Reconciliation:
   "💰 $4,200 - Salary (Auto-allocated)"
5. User clicks "Review Split"
6. Sees: 47 envelopes, $3,907.69 regular, $292.31 surplus
7. User clicks "Reconcile All"
8. Done! All envelopes funded in 30 seconds
```

### Example 2: Unexpected Amount

```
1. Bank sync imports: "$3,200 - Salary (short paycheck)"
2. System auto-allocates (prioritizes essentials)
3. User sees: "💰 $3,200 - Salary (Auto-allocated)"
4. User clicks "Review Split" (curious about low amount)
5. Sees: Essential envelopes funded, some important skipped
6. User clicks "Reconcile All" (accepts the allocation)
7. Makes note to adjust budget or find extra income
```

### Example 3: Multiple Incomes

```
1. Bank sync imports:
   - "$4,200 - Salary (Person A)"
   - "$3,800 - Salary (Person B)"
2. System creates 2 separate allocations
3. User sees both in Reconciliation:
   - "💰 $4,200 - Salary (Person A)"
   - "💰 $3,800 - Salary (Person B)"
4. User reconciles both
5. All envelopes get funding from both incomes
```

---

## 🔧 Configuration Options

### Adjust Auto-Allocation Threshold

Edit `lib/allocations/auto-allocate.ts`:

```typescript
export function shouldAutoAllocate(transaction: Transaction): boolean {
  return (
    transaction.envelope_type === "income" &&
    transaction.amount >= 500 && // Change threshold here (currently 1000)
    !transaction.reconciled &&
    !transaction.allocation_plan_id
  );
}
```

### Add Description Filtering

Prevent auto-allocation for certain income types:

```typescript
export function shouldAutoAllocate(transaction: Transaction): boolean {
  const excludePatterns = ["refund", "reimbursement", "bonus"];
  const description = transaction.description.toLowerCase();

  const isExcluded = excludePatterns.some(pattern =>
    description.includes(pattern)
  );

  return (
    transaction.envelope_type === "income" &&
    transaction.amount >= 1000 &&
    !transaction.reconciled &&
    !transaction.allocation_plan_id &&
    !isExcluded // Skip auto-allocation for excluded types
  );
}
```

### Custom Allocation Logic

Modify `lib/allocations/auto-allocate.ts` to use different allocation strategies:

```typescript
// Example: Always allocate surplus to specific envelope
const allocation = calculatePaydayAllocation(
  transaction.amount,
  envelopes as Envelope[],
  payCycle
);

// Override surplus allocation
if (allocation.surplus > 0) {
  const emergencyFundEnvelope = envelopes.find(e =>
    e.name.toLowerCase().includes("emergency")
  );

  if (emergencyFundEnvelope) {
    // Add surplus to emergency fund instead of most urgent
    allocation.allocations.push({
      envelopeId: emergencyFundEnvelope.id,
      amount: allocation.surplus,
      isRegular: false,
      priority: "important",
      // ...
    });
  }
}
```

---

## 📋 Checklist

Before going live:

- [ ] Applied database migration (0013_auto_allocation_system.sql)
- [ ] Integrated auto-allocation into transaction import flow
- [ ] Added `AutoAllocatedTransactionRow` to reconciliation page
- [ ] Updated transaction queries to include new columns
- [ ] Tested: Import income → Auto-allocation created
- [ ] Tested: Expand split → See all envelopes
- [ ] Tested: Reconcile → Transactions marked reconciled
- [ ] Tested: Reject → Child transactions deleted
- [ ] Tested: Multiple incomes on same day
- [ ] Tested: Low pay amount (prioritization works)
- [ ] Verified: Envelope balances update correctly
- [ ] Verified: RLS policies prevent unauthorized access

---

## 🐛 Troubleshooting

### Auto-allocation not triggering

**Check:**
1. Is transaction `envelope_type = 'income'`?
2. Is amount >= $1,000 (threshold)?
3. Is transaction already reconciled?
4. Is `createAutoAllocation()` being called in import flow?

**Debug:**
```typescript
console.log("Should auto-allocate:", shouldAutoAllocate(transaction));
```

### Child transactions not appearing

**Check:**
1. Look in database: `SELECT * FROM transactions WHERE parent_transaction_id = '...'`
2. Check for errors in `createAutoAllocation()` console logs
3. Verify RLS policies allow insert

### Reconciliation not working

**Check:**
1. Allocation plan status (should be 'pending')
2. User owns the allocation plan (RLS policy)
3. Check API response for errors
4. Verify transaction IDs match

### Envelopes not updating

**Check:**
1. Do you have existing triggers that update envelope balances?
2. Are transactions marked reconciled correctly?
3. Check envelope balance calculation logic

---

## 📚 Summary

You've built a complete auto-allocation system that:

✅ **Automatically detects** income transactions
✅ **Auto-creates allocation plans** using existing payday logic
✅ **Shows in reconciliation** with beautiful UI component
✅ **Allows review** before approval (expand to see details)
✅ **One-click reconciliation** to approve entire allocation
✅ **Supports rejection** if user wants manual control
✅ **Handles multiple incomes** and edge cases gracefully

**The Magic:**
```
Pay arrives → Auto-split created → User clicks "Reconcile All" → Done in 5 seconds
```

This is the Xero-style bank rules experience you wanted, integrated seamlessly with reconciliation!

---

**Created:** 2025-11-07
**Status:** Ready for Integration
**Next Step:** Follow Step 1-4 above to integrate into your codebase
