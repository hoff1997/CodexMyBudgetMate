# Auto-Allocation with Reconciliation Approval

**Date:** 2025-11-07
**Status:** Design Phase - Hybrid Approach
**Philosophy:** Auto-split like Xero rules, approve via reconciliation

---

## The Vision: "Smart but Safe"

```
Income Transaction Imported (Unreconciled)
         ↓
System Auto-Detects: "This is paycheck"
         ↓
Auto-Creates Split Allocations (Pending)
         ↓
User sees in Reconciliation: "$4,200 → 47 splits"
         ↓
User reviews split (expand to see details)
         ↓
Clicks "Reconcile" → Approves all splits at once
         ↓
Envelopes updated, transaction marked reconciled
```

**Key Insight:** Reconciliation IS the approval step. No separate dialog needed.

---

## How It Works

### Current Reconciliation System

Your app likely has:
- **Unreconciled transactions** - Imported but not yet verified
- **Reconciliation process** - User reviews and confirms transactions
- **Reconciled state** - Transaction is approved and finalized

### New Auto-Allocation Flow

**Step 1: Transaction Import**
```
Bank sync imports: "$4,200 - Salary - 2025-11-07"
Status: Unreconciled
```

**Step 2: Auto-Detection & Split Creation**
```
System detects: envelope_type = "income" AND amount > threshold
Triggers: Auto-allocation calculation
Creates: 47 child "allocation transactions" (all unreconciled)
Links: All children linked to parent via allocation_plan_id
```

**Step 3: Reconciliation View**
```
User opens reconciliation page
Sees:
┌─────────────────────────────────────────────────────────┐
│ 💰 $4,200.00 - Salary                   [View Split] ▼  │
│    2025-11-07 · Unreconciled · Auto-allocated          │
│                                                          │
│    Regular allocations: $3,907.69 across 47 envelopes  │
│    Surplus to Insurance: $292.31                        │
│                                                          │
│    [Expand to Review] [Reconcile All]                   │
└─────────────────────────────────────────────────────────┘
```

**Step 4: User Expands (Optional)**
```
┌─────────────────────────────────────────────────────────┐
│ 💰 $4,200.00 - Salary                   [Collapse] ▲    │
│    2025-11-07 · Unreconciled · Auto-allocated          │
│                                                          │
│    🔴 Essential (3 envelopes): $2,145.00               │
│       🏠 Mortgage: $1,800.00                           │
│       ⚡ Electricity: $215.00                          │
│       🛒 Groceries: $130.00                            │
│                                                          │
│    🟡 Important (42 envelopes): $1,762.69              │
│       🧾 Insurance: $292.31 + $292.31 surplus         │
│       📱 Phone: $45.00                                 │
│       ... (39 more)                                     │
│                                                          │
│    🔵 Discretionary (2 envelopes): $0.00               │
│       (Skipped due to insufficient funds)              │
│                                                          │
│    [Edit Split] [Reconcile All]                        │
└─────────────────────────────────────────────────────────┘
```

**Step 5: Reconcile Button Clicked**
```
Action: Mark parent + all 47 children as reconciled
Result:
  - Parent transaction: reconciled ✓
  - 47 allocation transactions: reconciled ✓
  - All envelope balances: updated ✓
  - Allocation plan: marked "applied" ✓
```

---

## Database Design

### Modified Transactions Table

```sql
-- Add fields to track auto-allocation
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS allocation_plan_id uuid REFERENCES public.allocation_plans(id),
ADD COLUMN IF NOT EXISTS is_auto_allocated boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS parent_transaction_id uuid REFERENCES public.transactions(id);

-- Index for querying parent-child relationships
CREATE INDEX idx_transactions_parent ON public.transactions(parent_transaction_id);
CREATE INDEX idx_transactions_allocation_plan ON public.transactions(allocation_plan_id);
```

**How it works:**
- **Parent transaction:** The original "$4,200 - Salary" (has `allocation_plan_id`, `is_auto_allocated = true`)
- **Child transactions:** 47 envelope allocations (have `parent_transaction_id` pointing to parent)
- **Link:** All share same `allocation_plan_id`

### Allocation Plans Table (Simplified)

```sql
CREATE TABLE public.allocation_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_transaction_id uuid REFERENCES public.transactions(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'applied', 'rejected')) DEFAULT 'pending',
  applied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),

  -- Summary data for quick display
  regular_total numeric(12,2),
  surplus_total numeric(12,2),
  envelope_count integer
);
```

### Allocation Plan Items (Optional Detail Storage)

```sql
CREATE TABLE public.allocation_plan_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.allocation_plans(id) ON DELETE CASCADE,
  envelope_id uuid NOT NULL REFERENCES public.envelopes(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL,
  is_regular boolean NOT NULL DEFAULT true,
  priority text,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

---

## Implementation Flow

### 1. Transaction Import Webhook/Trigger

**Trigger Point:** After bank sync imports transactions

```typescript
// app/api/transactions/import/route.ts or bank sync handler

export async function POST(request: NextRequest) {
  // ... existing import logic ...

  // After creating transactions, check for auto-allocation candidates
  for (const transaction of importedTransactions) {
    if (shouldAutoAllocate(transaction)) {
      await createAutoAllocation(transaction);
    }
  }

  return NextResponse.json({ imported: importedTransactions.length });
}

function shouldAutoAllocate(transaction: Transaction): boolean {
  return (
    transaction.envelope_type === "income" &&
    transaction.amount >= 1000 && // Minimum threshold
    !transaction.reconciled && // Not already reconciled
    !transaction.allocation_plan_id // Not already allocated
  );
}
```

### 2. Auto-Allocation Creation

```typescript
// lib/allocations/auto-allocate.ts

import { calculatePaydayAllocation } from "@/lib/planner/payday";

export async function createAutoAllocation(
  transaction: Transaction,
  userId: string
) {
  const supabase = await createClient();

  // 1. Get user's envelopes and pay cycle
  const { data: profile } = await supabase
    .from("profiles")
    .select("pay_cycle")
    .eq("id", userId)
    .single();

  const { data: envelopes } = await supabase
    .from("envelopes")
    .select("*")
    .eq("user_id", userId)
    .eq("envelope_type", "expense");

  // 2. Calculate allocation using existing payday logic
  const allocation = calculatePaydayAllocation(
    transaction.amount,
    envelopes,
    profile.pay_cycle
  );

  // 3. Create allocation plan record
  const { data: plan, error: planError } = await supabase
    .from("allocation_plans")
    .insert({
      user_id: userId,
      source_transaction_id: transaction.id,
      amount: transaction.amount,
      status: "pending",
      regular_total: allocation.totalRegular,
      surplus_total: allocation.surplus,
      envelope_count: allocation.allocations.length,
    })
    .select()
    .single();

  if (planError) throw planError;

  // 4. Create plan items (for detail storage)
  const planItems = allocation.allocations.map((alloc) => ({
    plan_id: plan.id,
    envelope_id: alloc.envelopeId,
    amount: alloc.amount,
    is_regular: alloc.isRegular,
    priority: alloc.priority,
  }));

  await supabase.from("allocation_plan_items").insert(planItems);

  // 5. Create child transactions (unreconciled, pending approval)
  const childTransactions = allocation.allocations.map((alloc) => ({
    user_id: userId,
    envelope_id: alloc.envelopeId,
    amount: alloc.amount,
    date: transaction.date,
    description: `Auto-allocation from ${transaction.description}`,
    transaction_type: "allocation",
    reconciled: false, // KEY: Not reconciled yet
    parent_transaction_id: transaction.id,
    allocation_plan_id: plan.id,
  }));

  await supabase.from("transactions").insert(childTransactions);

  // 6. Update parent transaction to mark as auto-allocated
  await supabase
    .from("transactions")
    .update({
      allocation_plan_id: plan.id,
      is_auto_allocated: true,
    })
    .eq("id", transaction.id);

  return plan;
}
```

### 3. Reconciliation Page Enhancement

**Component: Auto-Allocated Transaction Row**

```tsx
// components/reconciliation/auto-allocated-transaction-row.tsx

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Check, Edit2 } from "lucide-react";
import { formatCurrency } from "@/lib/finance";
import { toast } from "sonner";

type AllocationDetail = {
  envelopeId: string;
  envelopeName: string;
  envelopeIcon: string;
  amount: number;
  priority: "essential" | "important" | "discretionary";
  isRegular: boolean;
};

type AutoAllocatedTransactionRowProps = {
  transaction: {
    id: string;
    amount: number;
    date: string;
    description: string;
    allocationPlanId: string;
  };
  allocations: AllocationDetail[];
  onReconciled: () => void;
};

export function AutoAllocatedTransactionRow({
  transaction,
  allocations,
  onReconciled,
}: AutoAllocatedTransactionRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [reconciling, setReconciling] = useState(false);

  const regularTotal = allocations
    .filter((a) => a.isRegular)
    .reduce((sum, a) => sum + a.amount, 0);
  const surplusTotal = allocations
    .filter((a) => !a.isRegular)
    .reduce((sum, a) => sum + a.amount, 0);

  const byPriority = {
    essential: allocations.filter((a) => a.priority === "essential"),
    important: allocations.filter((a) => a.priority === "important"),
    discretionary: allocations.filter((a) => a.priority === "discretionary"),
  };

  async function handleReconcile() {
    setReconciling(true);
    try {
      const response = await fetch(
        `/api/allocations/plans/${transaction.allocationPlanId}/reconcile`,
        {
          method: "POST",
        }
      );

      if (response.ok) {
        toast.success(
          `✅ Allocated ${formatCurrency(transaction.amount)} across ${allocations.length} envelopes`
        );
        onReconciled();
      } else {
        throw new Error("Failed to reconcile");
      }
    } catch (error) {
      toast.error("Failed to reconcile allocation");
    } finally {
      setReconciling(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-background p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl">💰</span>
            <div>
              <p className="font-semibold text-secondary">
                {formatCurrency(transaction.amount)} - {transaction.description}
              </p>
              <p className="text-sm text-muted-foreground">
                {transaction.date} · Auto-allocated · Pending approval
              </p>
            </div>
          </div>

          {!expanded && (
            <div className="mt-3 space-y-1 text-sm text-muted-foreground">
              <p>
                Regular allocations: {formatCurrency(regularTotal)} across{" "}
                {allocations.filter((a) => a.isRegular).length} envelopes
              </p>
              {surplusTotal > 0 && (
                <p className="text-green-600">
                  Surplus: {formatCurrency(surplusTotal)}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Collapse
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Review Split
              </>
            )}
          </Button>
          <Button
            size="sm"
            onClick={handleReconcile}
            disabled={reconciling}
            className="gap-2"
          >
            {reconciling && (
              <span className="h-2 w-2 animate-ping rounded-full bg-primary-foreground" />
            )}
            <Check className="h-4 w-4" />
            Reconcile All
          </Button>
        </div>
      </div>

      {/* Expanded Detail */}
      {expanded && (
        <div className="mt-4 space-y-4 border-t border-border/40 pt-4">
          {/* Essential */}
          {byPriority.essential.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-secondary">
                  🔴 Essential ({byPriority.essential.length} envelopes)
                </h4>
                <span className="text-sm font-medium text-secondary">
                  {formatCurrency(
                    byPriority.essential.reduce((sum, a) => sum + a.amount, 0)
                  )}
                </span>
              </div>
              <div className="space-y-1 rounded-lg border border-red-200 bg-red-50 p-3">
                {byPriority.essential.slice(0, 5).map((alloc) => (
                  <div
                    key={alloc.envelopeId}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span>{alloc.envelopeIcon}</span>
                      <span className="text-secondary">
                        {alloc.envelopeName}
                      </span>
                    </div>
                    <span className="font-medium text-secondary">
                      {formatCurrency(alloc.amount)}
                    </span>
                  </div>
                ))}
                {byPriority.essential.length > 5 && (
                  <p className="text-xs text-muted-foreground pt-1">
                    + {byPriority.essential.length - 5} more essential envelopes
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Important */}
          {byPriority.important.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-secondary">
                  🟡 Important ({byPriority.important.length} envelopes)
                </h4>
                <span className="text-sm font-medium text-secondary">
                  {formatCurrency(
                    byPriority.important.reduce((sum, a) => sum + a.amount, 0)
                  )}
                </span>
              </div>
              <div className="space-y-1 rounded-lg border border-amber-200 bg-amber-50 p-3">
                {byPriority.important.slice(0, 5).map((alloc) => (
                  <div
                    key={alloc.envelopeId}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span>{alloc.envelopeIcon}</span>
                      <span className="text-secondary">
                        {alloc.envelopeName}
                      </span>
                      {!alloc.isRegular && (
                        <span className="text-xs text-green-600 font-medium">
                          +surplus
                        </span>
                      )}
                    </div>
                    <span className="font-medium text-secondary">
                      {formatCurrency(alloc.amount)}
                    </span>
                  </div>
                ))}
                {byPriority.important.length > 5 && (
                  <p className="text-xs text-muted-foreground pt-1">
                    + {byPriority.important.length - 5} more important envelopes
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Discretionary */}
          {byPriority.discretionary.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-secondary">
                  🔵 Discretionary ({byPriority.discretionary.length} envelopes)
                </h4>
                <span className="text-sm font-medium text-secondary">
                  {formatCurrency(
                    byPriority.discretionary.reduce((sum, a) => sum + a.amount, 0)
                  )}
                </span>
              </div>
              <div className="space-y-1 rounded-lg border border-blue-200 bg-blue-50 p-3">
                {byPriority.discretionary.map((alloc) => (
                  <div
                    key={alloc.envelopeId}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span>{alloc.envelopeIcon}</span>
                      <span className="text-secondary">
                        {alloc.envelopeName}
                      </span>
                    </div>
                    <span className="font-medium text-secondary">
                      {formatCurrency(alloc.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 p-3">
            <span className="font-semibold text-secondary">Total Allocated</span>
            <span className="text-lg font-bold text-primary">
              {formatCurrency(transaction.amount)}
            </span>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button size="sm" variant="outline">
              <Edit2 className="h-4 w-4 mr-1" />
              Edit Split
            </Button>
            <Button
              size="sm"
              onClick={handleReconcile}
              disabled={reconciling}
              className="gap-2"
            >
              {reconciling && (
                <span className="h-2 w-2 animate-ping rounded-full bg-primary-foreground" />
              )}
              <Check className="h-4 w-4" />
              Reconcile All
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
```

### 4. Reconciliation API Endpoint

```typescript
// app/api/allocations/plans/[id]/reconcile/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const planId = params.id;

    // 1. Get allocation plan
    const { data: plan, error: planError } = await supabase
      .from("allocation_plans")
      .select("*")
      .eq("id", planId)
      .eq("user_id", session.user.id)
      .single();

    if (planError || !plan) {
      return NextResponse.json(
        { error: "Allocation plan not found" },
        { status: 404 }
      );
    }

    if (plan.status === "applied") {
      return NextResponse.json(
        { error: "Allocation already applied" },
        { status: 400 }
      );
    }

    // 2. Get all child transactions for this plan
    const { data: childTransactions, error: childError } = await supabase
      .from("transactions")
      .select("id")
      .eq("allocation_plan_id", planId)
      .eq("reconciled", false);

    if (childError) {
      return NextResponse.json(
        { error: "Failed to fetch transactions" },
        { status: 400 }
      );
    }

    // 3. Mark all child transactions as reconciled
    const childIds = childTransactions.map((t) => t.id);

    const { error: reconcileError } = await supabase
      .from("transactions")
      .update({ reconciled: true })
      .in("id", childIds);

    if (reconcileError) {
      return NextResponse.json(
        { error: "Failed to reconcile transactions" },
        { status: 400 }
      );
    }

    // 4. Mark parent transaction as reconciled
    const { error: parentError } = await supabase
      .from("transactions")
      .update({ reconciled: true })
      .eq("id", plan.source_transaction_id);

    if (parentError) {
      return NextResponse.json(
        { error: "Failed to reconcile parent transaction" },
        { status: 400 }
      );
    }

    // 5. Update allocation plan status
    const { error: planUpdateError } = await supabase
      .from("allocation_plans")
      .update({
        status: "applied",
        applied_at: new Date().toISOString(),
      })
      .eq("id", planId);

    if (planUpdateError) {
      return NextResponse.json(
        { error: "Failed to update plan status" },
        { status: 400 }
      );
    }

    // 6. Envelope balances are automatically updated via transaction triggers
    // (Your existing system should handle this when transactions are marked reconciled)

    return NextResponse.json({
      success: true,
      transactionsReconciled: childIds.length + 1, // children + parent
      totalAllocated: plan.amount,
    });
  } catch (error) {
    console.error("Error reconciling allocation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

### 5. Get Allocation Details API

```typescript
// app/api/allocations/plans/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const planId = params.id;

    // Get plan with items
    const { data: plan, error: planError } = await supabase
      .from("allocation_plans")
      .select(`
        *,
        items:allocation_plan_items(
          id,
          envelope_id,
          amount,
          is_regular,
          priority,
          envelope:envelopes(
            id,
            name,
            icon
          )
        )
      `)
      .eq("id", planId)
      .eq("user_id", session.user.id)
      .single();

    if (planError || !plan) {
      return NextResponse.json(
        { error: "Allocation plan not found" },
        { status: 404 }
      );
    }

    // Format response
    const allocations = plan.items.map((item: any) => ({
      envelopeId: item.envelope_id,
      envelopeName: item.envelope.name,
      envelopeIcon: item.envelope.icon || "💰",
      amount: item.amount,
      isRegular: item.is_regular,
      priority: item.priority,
    }));

    return NextResponse.json({
      id: plan.id,
      amount: plan.amount,
      status: plan.status,
      createdAt: plan.created_at,
      appliedAt: plan.applied_at,
      allocations,
    });
  } catch (error) {
    console.error("Error fetching allocation plan:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

---

## User Experience Examples

### Example 1: First Paycheck After Setup

```
User completes initial budget setup
Next day: Bank sync imports "$4,200 - Salary"

Behind the scenes:
  ✓ System detects income transaction
  ✓ Calculates allocation (47 envelopes)
  ✓ Creates 47 child transactions (unreconciled)
  ✓ Links all to allocation plan

User opens Reconciliation page:
  Sees: "💰 $4,200 - Salary (Auto-allocated)"
  Clicks: "Review Split" to expand
  Reviews: 47 envelopes funded
  Clicks: "Reconcile All"
  Result: ✅ All 48 transactions reconciled, envelopes updated

Time spent: 30 seconds
```

### Example 2: Routine Paycheck (User Experienced)

```
User gets paycheck every 2 weeks
Bank sync imports: "$4,200 - Salary"

Behind the scenes:
  ✓ Auto-allocated (same as before)

User opens Reconciliation page:
  Sees: "💰 $4,200 - Salary (Auto-allocated)"
  Doesn't expand (trusts the split)
  Clicks: "Reconcile All" immediately
  Result: ✅ Done in 5 seconds

Next paycheck:
  Same pattern
  Becomes muscle memory
  Click "Reconcile All" without thinking
```

### Example 3: Unexpected Amount

```
User expects $4,200
Bank sync imports: "$3,500 - Salary (Reduced hours)"

Behind the scenes:
  ✓ Auto-allocates $3,500 (different split)
  ✓ System prioritizes essentials
  ✓ Some discretionary skipped

User opens Reconciliation page:
  Sees: "💰 $3,500 - Salary (Auto-allocated)"
  Notices: Different amount than usual
  Clicks: "Review Split" to see what changed
  Sees: "Discretionary envelopes skipped due to lower pay"
  Decision: "Makes sense" → Clicks "Reconcile All"
```

### Example 4: Multiple Incomes Same Day

```
Household with 2 incomes
Bank sync imports:
  - "$4,200 - Salary (Person A)"
  - "$3,800 - Salary (Person B)"

Behind the scenes:
  ✓ Creates 2 separate allocation plans
  ✓ Each splits their amount across all envelopes

User opens Reconciliation page:
  Sees TWO auto-allocated transactions:
    1. "$4,200 → 47 splits"
    2. "$3,800 → 47 splits"

  Can:
    Option A: Reconcile both separately
    Option B: Reconcile all at once (batch action)
    Option C: Combine into single plan (advanced)

  Likely: Reconciles both → All envelopes get double funding
```

---

## Advanced Features

### Edit Split Before Reconciling

**Use Case:** User wants to adjust allocation before approving

```tsx
// Add "Edit Split" button in expanded view
<Button size="sm" variant="outline" onClick={handleEditSplit}>
  <Edit2 className="h-4 w-4 mr-1" />
  Edit Split
</Button>

async function handleEditSplit() {
  // Open allocation plan dialog with editable amounts
  // Similar to AllocationPlanDialog from Phase 1
  // Allow user to modify individual envelope amounts
  // Update plan items before reconciling
}
```

### Reject Auto-Allocation

**Use Case:** User wants to manually handle this transaction

```tsx
<Button size="sm" variant="ghost" onClick={handleReject}>
  <X className="h-4 w-4 mr-1" />
  Reject Auto-Split
</Button>

async function handleReject() {
  // Delete all child transactions
  // Mark allocation plan as "rejected"
  // Leave parent transaction unreconciled for manual handling
}
```

### Smart Detection Refinement

**Learning from user behavior:**

```typescript
// Track rejection patterns
if (user.rejectsAllocation(transaction)) {
  // Update user preferences
  await supabase.from("user_allocation_preferences").upsert({
    user_id: session.user.id,
    exclude_description_patterns: [transaction.description],
    minimum_amount_threshold: transaction.amount + 100,
  });
}

// Next time, skip auto-allocation for similar transactions
```

---

## Migration from Current System

### Step 1: Database Migration

```sql
-- File: supabase/migrations/0013_auto_allocation_system.sql

-- Add allocation tracking to transactions
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS allocation_plan_id uuid REFERENCES public.allocation_plans(id),
ADD COLUMN IF NOT EXISTS is_auto_allocated boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS parent_transaction_id uuid REFERENCES public.transactions(id);

CREATE INDEX idx_transactions_parent ON public.transactions(parent_transaction_id);
CREATE INDEX idx_transactions_allocation_plan ON public.transactions(allocation_plan_id);

-- Create allocation plans table
CREATE TABLE public.allocation_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_transaction_id uuid REFERENCES public.transactions(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'applied', 'rejected')) DEFAULT 'pending',
  applied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  regular_total numeric(12,2),
  surplus_total numeric(12,2),
  envelope_count integer
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

-- Create allocation plan items table
CREATE TABLE public.allocation_plan_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.allocation_plans(id) ON DELETE CASCADE,
  envelope_id uuid NOT NULL REFERENCES public.envelopes(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL,
  is_regular boolean NOT NULL DEFAULT true,
  priority text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_allocation_plan_items_plan ON public.allocation_plan_items(plan_id);
CREATE INDEX idx_allocation_plan_items_envelope ON public.allocation_plan_items(envelope_id);

-- RLS Policies for items
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

### Step 2: Add Auto-Allocation to Import Flow

Find your transaction import handler and add auto-allocation trigger.

### Step 3: Build Reconciliation UI Component

Create `AutoAllocatedTransactionRow` component (code provided above).

### Step 4: Integrate into Reconciliation Page

Add component to your reconciliation page where unreconciled transactions are displayed.

---

## Benefits of This Approach

✅ **Automatic but Safe:** Auto-creates splits but requires approval
✅ **Familiar Pattern:** Reconciliation is already part of user workflow
✅ **No Extra Steps:** Approval happens via existing reconciliation process
✅ **Transparent:** User can expand to see full detail before approving
✅ **Fast for Routine:** Experienced users click "Reconcile All" in 2 seconds
✅ **Flexible:** Can edit or reject if needed
✅ **Like Xero Rules:** Feels professional and familiar to accounting users

---

## Testing Checklist

- [ ] Apply database migration
- [ ] Build auto-allocation creation function
- [ ] Hook into transaction import flow
- [ ] Create `AutoAllocatedTransactionRow` component
- [ ] Build reconciliation API endpoint
- [ ] Test: Import income transaction → auto-splits created
- [ ] Test: Expand split → see all envelope allocations
- [ ] Test: Reconcile → all transactions marked reconciled
- [ ] Test: Envelopes updated with correct amounts
- [ ] Test: Multiple incomes same day
- [ ] Test: Different pay amounts (prioritization works)
- [ ] Add "Edit Split" functionality (optional)
- [ ] Add "Reject Allocation" functionality (optional)

---

## Summary

This design gives you the best of all worlds:

**Fully Automatic:** System creates splits immediately upon import
**User Control:** Requires approval via reconciliation
**Professional:** Like Xero's bank rules system
**Fast:** Routine paycheck reconciled in 5 seconds
**Transparent:** Full detail available when needed
**Flexible:** Can edit or reject if needed

**The Flow:**
```
Pay Import → Auto-Split → Show in Reconciliation → User Approves → Done
```

No extra dialogs, no extra pages, just enhanced reconciliation with smart defaults.

---

**Created:** 2025-11-07
**Status:** Design Complete, Ready for Implementation
**Approach:** Phase 3 auto-allocation + reconciliation approval = Perfect hybrid
