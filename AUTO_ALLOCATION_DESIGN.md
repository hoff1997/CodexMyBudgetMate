# Automatic Transaction Allocation System

**Date:** 2025-11-07
**Status:** Design Phase
**Purpose:** Auto-allocate income to envelopes when pay transactions arrive

---

## The Vision

```
Income Transaction Arrives
         ↓
System Recognizes: "This is a paycheck"
         ↓
Auto-calculate allocation using payday logic
         ↓
Present to user: "Allocate $4,200 across envelopes?"
         ↓
User approves (or modifies)
         ↓
Create allocation transactions
         ↓
Envelopes updated automatically
```

**User Experience:**
```
1. Bank sync imports: "$4,200 - Salary - 2025-11-07"
2. Notification appears: "💰 Pay detected! Ready to allocate?"
3. User clicks: Opens allocation preview
4. Shows: Regular allocations + surplus suggestions
5. User: "Looks good" → Apply
6. Result: All envelopes funded, surplus to Insurance
```

---

## Current System State

### What We Have

**Income Transactions:**
- Stored in `transactions` table
- Have `envelope_id` pointing to income envelope
- Track `amount`, `date`, `description`

**Payday Allocator Logic:**
- `lib/planner/payday.ts` - Calculates distribution
- `app/api/planner/payday/route.ts` - API endpoint
- Returns: regular allocations + surplus suggestions

**Envelope Balance Updates:**
- Currently manual via transaction creation
- Each transaction updates `current_amount`

### What's Missing

1. **Income Detection:** Identify which transactions are "paychecks"
2. **Allocation Trigger:** When to auto-propose allocation
3. **Allocation Records:** Store planned vs actual allocations
4. **Multi-transaction Creation:** Create many transactions at once
5. **User Approval Flow:** Review before applying
6. **Notification System:** Alert user when pay arrives

---

## Design Approach

### Phase 1: Simple Manual Trigger (MVP)

**Flow:**
1. User receives pay transaction (via bank sync or manual entry)
2. Transaction appears in list with badge: "🎯 Allocate This"
3. User clicks "Allocate" button
4. Opens allocation preview (using payday allocator data)
5. User reviews/modifies
6. Clicks "Apply Allocation"
7. System creates allocation transactions for each envelope

**Pros:**
- Simple to implement
- User maintains full control
- No false positives (user triggers)
- Uses existing payday allocator logic

**Cons:**
- Not fully automatic
- User must remember to allocate
- Manual step each payday

### Phase 2: Smart Auto-Detection (Enhanced)

**Flow:**
1. Transaction arrives (bank sync)
2. System detects: "Income transaction + amount matches expected pay"
3. Auto-generate allocation plan
4. Notification: "💰 $4,200 pay detected. View allocation?"
5. User opens: See allocation preview
6. Approve or modify
7. Apply

**Pros:**
- More automatic
- Proactive notifications
- Reduces cognitive load

**Cons:**
- Need income pattern detection
- Risk of false positives
- More complex logic

### Phase 3: Fully Automatic (Advanced)

**Flow:**
1. Transaction arrives
2. Auto-detected + auto-allocated
3. User gets notification: "✅ $4,200 allocated across envelopes"
4. Can review allocation history
5. Can undo if needed

**Pros:**
- Zero-friction
- Works in background
- "Set and forget"

**Cons:**
- Requires high confidence in detection
- Need undo mechanism
- Less user control

**Recommendation:** Start with Phase 1, iterate to Phase 2 based on feedback.

---

## Phase 1 Implementation Plan

### 1. Database Schema

**New Table: `allocation_plans`**
```sql
CREATE TABLE public.allocation_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_transaction_id uuid REFERENCES public.transactions(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'applied', 'cancelled')),
  applied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_allocation_plans_user ON public.allocation_plans(user_id);
CREATE INDEX idx_allocation_plans_status ON public.allocation_plans(status);

-- RLS Policies
ALTER TABLE public.allocation_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own allocation plans"
  ON public.allocation_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own allocation plans"
  ON public.allocation_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own allocation plans"
  ON public.allocation_plans FOR UPDATE
  USING (auth.uid() = user_id);
```

**New Table: `allocation_plan_items`**
```sql
CREATE TABLE public.allocation_plan_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.allocation_plans(id) ON DELETE CASCADE,
  envelope_id uuid NOT NULL REFERENCES public.envelopes(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL,
  is_regular boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_allocation_plan_items_plan ON public.allocation_plan_items(plan_id);
CREATE INDEX idx_allocation_plan_items_envelope ON public.allocation_plan_items(envelope_id);

-- RLS Policies
ALTER TABLE public.allocation_plan_items ENABLE ROW LEVEL SECURITY;

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
```

### 2. API Endpoints

**POST /api/allocations/plans** - Create allocation plan
```typescript
// Request
{
  sourceTransactionId?: string,
  amount: number
}

// Response
{
  planId: string,
  amount: 4200.00,
  regularAllocations: [...],
  surplus: 292.31,
  suggestions: [...],
  envelopeHealth: [...]
}
```

**GET /api/allocations/plans/:id** - Get allocation plan details
```typescript
// Response
{
  id: string,
  amount: number,
  status: "pending" | "applied" | "cancelled",
  items: [
    { envelopeId: string, envelopeName: string, amount: number, isRegular: boolean }
  ],
  createdAt: string,
  appliedAt: string | null
}
```

**POST /api/allocations/plans/:id/apply** - Apply allocation plan
```typescript
// Request
{
  items: [
    { envelopeId: string, amount: number, notes?: string }
  ],
  sourceTransactionId?: string
}

// Response
{
  success: true,
  transactionsCreated: 47,
  totalAllocated: 4200.00
}
```

**DELETE /api/allocations/plans/:id** - Cancel allocation plan
```typescript
// Response
{
  success: true
}
```

### 3. UI Components

**Component: `AllocationPlanDialog`**

Location: `components/allocations/allocation-plan-dialog.tsx`

```tsx
"use client";

import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/finance";
import { X, CheckCircle, Edit2 } from "lucide-react";

type AllocationPlanItem = {
  envelopeId: string;
  envelopeName: string;
  amount: number;
  isRegular: boolean;
  icon?: string;
  priority?: string;
};

type AllocationPlanDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  amount: number;
};

export function AllocationPlanDialog({
  open,
  onOpenChange,
  planId,
  amount,
}: AllocationPlanDialogProps) {
  const [items, setItems] = useState<AllocationPlanItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (open && planId) {
      fetchPlan();
    }
  }, [open, planId]);

  async function fetchPlan() {
    setLoading(true);
    try {
      const response = await fetch(`/api/allocations/plans/${planId}`);
      if (response.ok) {
        const data = await response.json();
        setItems(data.items);
      }
    } catch (error) {
      console.error("Failed to fetch allocation plan:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleApply() {
    setApplying(true);
    try {
      const response = await fetch(`/api/allocations/plans/${planId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });

      if (response.ok) {
        toast.success("Allocation applied successfully!");
        onOpenChange(false);
        // Trigger refresh of envelopes
        window.dispatchEvent(new CustomEvent("envelopes-updated"));
      }
    } catch (error) {
      toast.error("Failed to apply allocation");
    } finally {
      setApplying(false);
    }
  }

  const regularTotal = items
    .filter((item) => item.isRegular)
    .reduce((sum, item) => sum + item.amount, 0);
  const surplusTotal = items
    .filter((item) => !item.isRegular)
    .reduce((sum, item) => sum + item.amount, 0);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-3xl border border-border/60 bg-background shadow-2xl">
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border/40 px-6 py-5">
            <div>
              <Dialog.Title className="text-2xl font-semibold text-secondary">
                💰 Allocate {formatCurrency(amount)}
              </Dialog.Title>
              <Dialog.Description className="text-sm text-muted-foreground">
                Review the allocation plan and apply to your envelopes
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-full p-2 text-muted-foreground transition hover:bg-muted/50"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : (
              <>
                {/* Regular Allocations */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-secondary">Regular Allocations</h3>
                    <span className="text-sm text-muted-foreground">
                      {formatCurrency(regularTotal)}
                    </span>
                  </div>
                  <div className="space-y-2 rounded-2xl border border-border/60 bg-muted/30 p-4">
                    {items
                      .filter((item) => item.isRegular)
                      .map((item) => (
                        <div
                          key={item.envelopeId}
                          className="flex items-center justify-between text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{item.icon || "💰"}</span>
                            <span className="text-secondary">{item.envelopeName}</span>
                          </div>
                          <span className="font-medium text-secondary">
                            {formatCurrency(item.amount)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Surplus Allocations */}
                {surplusTotal > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-secondary">
                        Surplus Allocation
                      </h3>
                      <span className="text-sm text-muted-foreground">
                        {formatCurrency(surplusTotal)}
                      </span>
                    </div>
                    <div className="space-y-2 rounded-2xl border border-green-200 bg-green-50 p-4">
                      {items
                        .filter((item) => !item.isRegular)
                        .map((item) => (
                          <div
                            key={item.envelopeId}
                            className="flex items-center justify-between text-sm"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{item.icon || "💰"}</span>
                              <span className="text-secondary">{item.envelopeName}</span>
                            </div>
                            <span className="font-medium text-secondary">
                              {formatCurrency(item.amount)}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Summary */}
                <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
                  <div className="flex items-center justify-between text-lg">
                    <span className="font-semibold text-secondary">Total Allocated</span>
                    <span className="font-bold text-primary">
                      {formatCurrency(regularTotal + surplusTotal)}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex shrink-0 justify-end gap-2 border-t border-border/40 px-6 py-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={applying}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleApply}
              disabled={applying || loading}
              className="gap-2"
            >
              {applying && (
                <span className="h-2 w-2 animate-ping rounded-full bg-primary-foreground" />
              )}
              <CheckCircle className="h-4 w-4" />
              Apply Allocation
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

**Component: `AllocateButton` for transaction rows**

Location: `components/transactions/allocate-button.tsx`

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Target } from "lucide-react";
import { AllocationPlanDialog } from "@/components/allocations/allocation-plan-dialog";
import { toast } from "sonner";

export function AllocateButton({
  transactionId,
  amount,
}: {
  transactionId: string;
  amount: number;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [planId, setPlanId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function handleAllocate() {
    setCreating(true);
    try {
      const response = await fetch("/api/allocations/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceTransactionId: transactionId,
          amount,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setPlanId(data.planId);
        setDialogOpen(true);
      } else {
        toast.error("Failed to create allocation plan");
      }
    } catch (error) {
      toast.error("Failed to create allocation plan");
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={handleAllocate}
        disabled={creating}
        className="gap-2"
      >
        <Target className="h-4 w-4" />
        {creating ? "Creating..." : "Allocate"}
      </Button>

      {planId && (
        <AllocationPlanDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          planId={planId}
          amount={amount}
        />
      )}
    </>
  );
}
```

### 4. Integration Points

**Transactions List** - Add "Allocate" button to income transactions

File: `app/(app)/transactions/page.tsx` or transaction row component

```tsx
// In transaction row rendering
{transaction.envelope_type === "income" && transaction.amount > 0 && (
  <AllocateButton
    transactionId={transaction.id}
    amount={transaction.amount}
  />
)}
```

**Transaction Detail Page** - Add allocation section

```tsx
{transaction.envelope_type === "income" && (
  <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
    <h3 className="font-semibold text-secondary mb-2">Allocation</h3>
    <p className="text-sm text-muted-foreground mb-3">
      Distribute this income across your envelopes based on your budget plan.
    </p>
    <AllocateButton
      transactionId={transaction.id}
      amount={transaction.amount}
    />
  </div>
)}
```

---

## Phase 2: Auto-Detection Enhancement

### Income Pattern Detection

**Strategy 1: Amount-Based**
```typescript
// Detect transactions that match typical pay amounts
const INCOME_THRESHOLD = 1000; // Minimum to consider as "pay"

function isPotentialPaycheck(transaction: Transaction, profile: Profile): boolean {
  return (
    transaction.envelope_type === "income" &&
    transaction.amount >= INCOME_THRESHOLD &&
    // Optional: Check if amount matches known pay amounts
    (profile.typical_pay_amounts || []).includes(transaction.amount)
  );
}
```

**Strategy 2: Description-Based**
```typescript
const PAY_KEYWORDS = [
  "salary",
  "wages",
  "payroll",
  "income",
  "pay",
  "employer",
];

function isPotentialPaycheck(transaction: Transaction): boolean {
  const desc = transaction.description.toLowerCase();
  return PAY_KEYWORDS.some((keyword) => desc.includes(keyword));
}
```

**Strategy 3: Frequency-Based**
```typescript
// Learn from transaction history
async function detectPayPattern(userId: string) {
  // Get last 6 months of income transactions
  const incomeTransactions = await getIncomeTransactions(userId, 6);

  // Look for regular patterns (weekly, fortnightly, monthly)
  const intervals = calculateIntervals(incomeTransactions);

  // If 80%+ of intervals match a pay cycle, remember it
  return {
    frequency: "fortnightly",
    typicalAmount: 4200,
    lastPayDate: "2025-11-07",
    nextExpectedPay: "2025-11-21",
  };
}
```

### Notification System

**Database Table: `notifications`**
```sql
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  link text,
  data jsonb,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id, read);
```

**Notification Types:**
- `pay_detected` - Income transaction detected, allocation available
- `allocation_suggested` - Smart suggestion for surplus
- `envelope_urgent` - Envelope due soon and behind schedule

---

## User Flow Examples

### Example 1: Manual Trigger (Phase 1)

```
1. User imports bank transactions
   → 5 transactions imported, including "$4,200 - Salary"

2. Transaction list shows:
   "$4,200 - Salary - 2025-11-07" [🎯 Allocate]

3. User clicks "Allocate"
   → API creates allocation plan using payday logic
   → Dialog opens showing:
     - Regular allocations: $3,907.69 across 47 envelopes
     - Surplus: $292.31
     - Suggestion: Top up Insurance (most urgent)

4. User reviews, clicks "Apply Allocation"
   → System creates 47 allocation transactions
   → Envelope balances updated
   → Success toast: "✅ $4,200 allocated across envelopes"

5. User sees updated envelope balances
   → Insurance now shows $292.31 closer to target
```

### Example 2: Auto-Detection (Phase 2)

```
1. Bank sync runs overnight
   → Imports "$4,200 - Employer Payroll"

2. System detects: "This matches user's typical pay"
   → Auto-creates allocation plan
   → Creates notification: "💰 Pay detected! View allocation?"

3. User opens app, sees notification badge
   → Clicks notification
   → Opens allocation dialog (pre-populated)

4. User sees familiar allocation pattern
   → Clicks "Apply Allocation"
   → Done

5. Next payday:
   → User gets notification
   → Opens, sees allocation ready
   → Becomes habit: "Just approve each payday"
```

### Example 3: Fully Automatic (Phase 3)

```
1. Bank sync imports pay transaction
   → Auto-detected as paycheck
   → Auto-created allocation plan
   → Auto-applied (user has enabled this setting)

2. User gets notification:
   "✅ $4,200 pay allocated automatically
    - Regular: $3,907.69
    - Surplus to Insurance: $292.31
    [View Details]"

3. User can:
   - Ignore (it's done)
   - View details (see breakdown)
   - Undo (if mistake)

4. User's mental model:
   "Money goes into bank → app handles rest → I check envelope balances"
```

---

## Implementation Checklist

### Phase 1: Manual Trigger (MVP)

- [ ] Create database migration for `allocation_plans` and `allocation_plan_items`
- [ ] Build API endpoint: `POST /api/allocations/plans` (create plan)
- [ ] Build API endpoint: `GET /api/allocations/plans/:id` (get plan)
- [ ] Build API endpoint: `POST /api/allocations/plans/:id/apply` (apply plan)
- [ ] Create `AllocationPlanDialog` component
- [ ] Create `AllocateButton` component
- [ ] Add "Allocate" button to income transactions in transaction list
- [ ] Test full flow: Create plan → Review → Apply → Verify envelopes updated
- [ ] Add allocation history view (optional)

### Phase 2: Auto-Detection (Enhanced)

- [ ] Add `typical_pay_amounts` to profiles table
- [ ] Build income pattern detection function
- [ ] Create notification system (table + API)
- [ ] Add notification badge to app header
- [ ] Build notification center UI
- [ ] Auto-detect pay transactions on import
- [ ] Auto-create allocation plans for detected pay
- [ ] Send notification when plan ready
- [ ] Allow users to customize detection rules

### Phase 3: Fully Automatic (Advanced)

- [ ] Add user preference: "Auto-apply allocation plans"
- [ ] Build auto-apply logic with safety checks
- [ ] Add allocation history/audit log
- [ ] Build undo mechanism for applied allocations
- [ ] Add weekly/monthly allocation summaries
- [ ] Notification: "This month you allocated $X across Y envelopes"

---

## Edge Cases & Considerations

### Multiple Incomes in One Day
**Problem:** User gets two paychecks on same day (spouse + self)
**Solution:**
- Create separate allocation plans for each
- Allow user to combine or apply separately
- Track source transaction for each plan

### Irregular Income
**Problem:** Freelancer gets $8,400 one month, $2,000 next month
**Solution:**
- Allocation logic already handles variable amounts
- Surplus suggestions adapt to amount
- Low pay: Only cover essentials, skip discretionary
- High pay: Cover all + build buffer

### Partial Pay
**Problem:** User gets $2,000 instead of expected $4,200
**Solution:**
- Allocation plan adjusts automatically
- Shows: "Only covers essential envelopes + 5 important"
- Suggests: "Skip discretionary this pay"
- Priority system ensures most urgent get funded first

### Budget Changes Mid-Period
**Problem:** User updates envelope amounts between paydays
**Solution:**
- Allocation plan always uses latest envelope data
- Plan created "just in time" when user clicks allocate
- Always reflects current budget state

### Split Allocations
**Problem:** User wants to allocate pay differently than auto-suggestion
**Solution:**
- Make all allocation items editable in dialog
- Add "Customize" mode for manual adjustments
- Remember user preferences for next time

### Undo Allocation
**Problem:** User accidentally applies wrong allocation
**Solution:**
- Store allocation plan ID on created transactions
- Provide "Undo Allocation" button (within 24 hours?)
- Bulk-delete transactions created by plan
- Restore previous envelope balances

---

## Performance Considerations

- **Batch Transaction Creation:** Use Supabase bulk insert for 47+ transactions
- **Optimistic Updates:** Update UI immediately, sync in background
- **Caching:** Cache allocation plans for 5 minutes (avoid recalculation)
- **Debouncing:** If user modifies amounts, debounce recalculation by 500ms

---

## Summary

**What This Enables:**

✅ **One-Click Allocation:** Turn pay transaction into envelope funding with one button
✅ **Smart Suggestions:** Uses existing payday allocator logic + priority scoring
✅ **Full Transparency:** User sees exactly where money goes before applying
✅ **Flexible Control:** Can modify suggestions or accept as-is
✅ **Audit Trail:** Track allocation history and patterns over time

**The Big Picture:**

```
Before:
  Pay arrives → User manually calculates split → Creates 47 transactions → Exhausting

After (Phase 1):
  Pay arrives → Click "Allocate" → Review → Apply → Done in 30 seconds

After (Phase 2):
  Pay arrives → Notification → Open → Apply → Done in 15 seconds

After (Phase 3):
  Pay arrives → Auto-allocated → Notification → Done automatically
```

This bridges the final gap between "money coming in" and "money being budgeted."

---

**Created:** 2025-11-07
**Status:** Design Complete, Ready for Implementation
**Next Step:** Choose phase to implement (recommend Phase 1 MVP first)
