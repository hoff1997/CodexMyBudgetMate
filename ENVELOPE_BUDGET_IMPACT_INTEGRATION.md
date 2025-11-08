# Envelope Budget Impact Integration

**Date:** 2025-11-07
**Status:** API Complete, UI Integration Needed

---

## What This Solves

When users create or edit envelopes, they need immediate feedback on how it affects their overall budget:

### The Problem
```
User adds "Gym Membership: $50/pay"
❌ No feedback that this creates $30 shortfall
❌ User doesn't know they're living beyond means
❌ Budget silently breaks
```

### The Solution
```
User adds "Gym Membership: $50/pay"
✅ See: "This reduces surplus from $80 to $30/pay"
✅ Warning if it creates shortfall
✅ Suggest scenarios to free up funds
✅ Informed decision before saving
```

---

## What's Been Built

### 1. Budget Impact API

**Endpoint:** `POST /api/planner/budget-impact`

**Purpose:** Calculate how adding/editing an envelope affects total budget

**Request:**
```typescript
{
  action: "add" | "edit",
  envelopeId?: string,  // required for edit
  payCycleAmount: number,  // proposed amount
  priority?: "essential" | "important" | "discretionary"
}
```

**Response:**
```typescript
{
  currentTotalRegular: 3907.69,
  newTotalRegular: 3957.69,
  difference: 50.00,
  userPayAmount: null,  // or actual pay if known
  currentSurplus: null,  // or actual surplus
  newSurplus: null,     // or new surplus
  status: "unknown" | "improved" | "worsened" | "creates_shortfall",
  warning: "⚠️ This adds $50/pay to your regular allocations...",
  suggestion: "Consider reducing other envelopes...",
  payCycle: "fortnightly"
}
```

**Status Values:**
- `unknown`: Can't determine impact (no pay amount known)
- `improved`: Reduces allocations, increases surplus
- `unchanged`: No change
- `worsened`: Reduces surplus (but still positive)
- `creates_shortfall`: Changes surplus from positive to negative

---

## Integration Points

### Current Envelope Dialog State

The existing [envelope-create-dialog.tsx](components/layout/envelopes/envelope-create-dialog.tsx) already has:

- ✅ Due amount input
- ✅ Frequency selection
- ✅ Auto-calculated `perPayAmount`
- ✅ Display of "Required per pay"

**Need to add:**
- Budget Impact widget below "Required per pay"
- Real-time API calls as user types
- Warning alerts for shortfalls
- Link to Scenario Planner if shortfall detected

### Where Dialog is Used

The envelope dialog needs to work from:

1. **Envelope Summary Page** - Main envelope management
2. **Transaction Page** - Create envelope for unbudgeted transaction
3. **Reconciliation Page** - Add envelope during reconciliation
4. **Split Transaction** - Break one envelope into multiple

### Proposed UI Addition

```tsx
// After the "Required per pay / Annual funding" section (line 374)
// Add this new Budget Impact section:

{perPayAmount > 0 && (
  <BudgetImpactWidget
    action="add"  // or "edit" if editing
    envelopeId={undefined}  // or actual ID if editing
    payCycleAmount={perPayAmount}
    priority={form.priority}  // need to add priority to form state
  />
)}
```

---

## BudgetImpactWidget Component

### Component Design

```tsx
"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type BudgetImpact = {
  currentTotalRegular: number;
  newTotalRegular: number;
  difference: number;
  userPayAmount: number | null;
  currentSurplus: number | null;
  newSurplus: number | null;
  status: "unknown" | "improved" | "worsened" | "creates_shortfall" | "unchanged";
  warning: string | null;
  suggestion: string | null;
  payCycle: string;
};

export function BudgetImpactWidget({
  action,
  envelopeId,
  payCycleAmount,
  priority,
}: {
  action: "add" | "edit";
  envelopeId?: string;
  payCycleAmount: number;
  priority?: "essential" | "important" | "discretionary";
}) {
  const [impact, setImpact] = useState<BudgetImpact | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Debounce API calls
    const timeout = setTimeout(() => {
      if (payCycleAmount > 0) {
        fetchImpact();
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [payCycleAmount, action, envelopeId, priority]);

  async function fetchImpact() {
    setLoading(true);
    try {
      const response = await fetch("/api/planner/budget-impact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          envelopeId,
          payCycleAmount,
          priority,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setImpact(data);
      }
    } catch (error) {
      console.error("Failed to fetch budget impact:", error);
    } finally {
      setLoading(false);
    }
  }

  if (!impact || payCycleAmount === 0) {
    return null;
  }

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  // Color scheme based on status
  const statusStyles = {
    improved: "bg-green-50 border-green-200 text-green-900",
    unchanged: "bg-blue-50 border-blue-200 text-blue-900",
    worsened: "bg-amber-50 border-amber-200 text-amber-900",
    creates_shortfall: "bg-red-50 border-red-200 text-red-900",
    unknown: "bg-gray-50 border-gray-200 text-gray-900",
  };

  const statusIcons = {
    improved: <TrendingUp className="h-5 w-5 text-green-600" />,
    unchanged: <Minus className="h-5 w-5 text-blue-600" />,
    worsened: <TrendingDown className="h-5 w-5 text-amber-600" />,
    creates_shortfall: <AlertTriangle className="h-5 w-5 text-red-600" />,
    unknown: <Minus className="h-5 w-5 text-gray-600" />,
  };

  return (
    <div
      className={`space-y-3 rounded-2xl border p-4 ${statusStyles[impact.status]}`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{statusIcons[impact.status]}</div>
        <div className="flex-1 space-y-2">
          <p className="font-semibold text-sm">Budget Impact</p>

          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Current total allocations:</span>
              <span className="font-medium">{formatCurrency(impact.currentTotalRegular)}/{impact.payCycle}</span>
            </div>
            <div className="flex justify-between">
              <span>New total with this envelope:</span>
              <span className="font-medium">{formatCurrency(impact.newTotalRegular)}/{impact.payCycle}</span>
            </div>
            {impact.difference !== 0 && (
              <div className="flex justify-between font-semibold pt-1 border-t border-current/20">
                <span>Change:</span>
                <span>
                  {impact.difference > 0 ? "+" : ""}
                  {formatCurrency(impact.difference)}/{impact.payCycle}
                </span>
              </div>
            )}
          </div>

          {impact.warning && (
            <p className="text-sm font-medium mt-2">{impact.warning}</p>
          )}

          {impact.suggestion && (
            <p className="text-xs mt-1 opacity-90">{impact.suggestion}</p>
          )}

          {impact.status === "creates_shortfall" && (
            <div className="mt-3 pt-3 border-t border-current/20">
              <p className="text-xs font-medium mb-2">To resolve this shortfall:</p>
              <div className="flex gap-2">
                <Link href="/scenario-planner" target="_blank">
                  <Button size="sm" variant="outline" className="text-xs">
                    Explore Scenarios
                  </Button>
                </Link>
                <Link href="/payday-allocator" target="_blank">
                  <Button size="sm" variant="outline" className="text-xs">
                    View Full Budget
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## Step-by-Step Integration

### 1. Add Priority to Envelope Dialog Form State

Update [envelope-create-dialog.tsx](components/layout/envelopes/envelope-create-dialog.tsx):

```tsx
// Add to FormState type (line 43)
type FormState = {
  name: string;
  icon: string;
  categoryId: string;
  openingBalance: string;
  notes: string;
  isSpending: boolean;
  dueAmount: string;
  dueFrequency: PlannerFrequency;
  dueDate: string;
  priority: "essential" | "important" | "discretionary";  // ← ADD THIS
};

// Update DEFAULT_FORM (line 55)
const DEFAULT_FORM: FormState = {
  name: "",
  icon: ICONS[0],
  categoryId: "",
  openingBalance: "0.00",
  notes: "",
  isSpending: false,
  dueAmount: "0.00",
  dueFrequency: "monthly",
  dueDate: "",
  priority: "important",  // ← ADD THIS
};

// Add priority selector UI (after category, ~line 238)
<div className="space-y-2">
  <Label htmlFor="envelope-priority" className="text-sm font-medium text-secondary">
    Priority
  </Label>
  <select
    id="envelope-priority"
    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    value={form.priority}
    onChange={(event) =>
      setForm((prev) => ({
        ...prev,
        priority: event.target.value as "essential" | "important" | "discretionary",
      }))
    }
  >
    <option value="essential">🔴 Essential (Must pay)</option>
    <option value="important">🟡 Important (Should pay)</option>
    <option value="discretionary">🔵 Discretionary (Nice to have)</option>
  </select>
</div>

// Include priority in API call (line 123)
body: JSON.stringify({
  name: form.name.trim(),
  categoryId: form.categoryId || undefined,
  priority: form.priority,  // ← ADD THIS
  targetAmount: dueAmountNumber,
  payCycleAmount: perPayAmount,
  frequency: form.dueFrequency,
  nextDue: form.dueDate || undefined,
  openingBalance: parseFloat(form.openingBalance || "0") || 0,
  notes: form.notes.trim() || undefined,
  icon: form.icon,
  isSpending: form.isSpending,
}),
```

### 2. Create BudgetImpactWidget Component

File: `components/planner/budget-impact-widget.tsx`

(See component code above)

### 3. Add Widget to Envelope Dialog

In [envelope-create-dialog.tsx](components/layout/envelopes/envelope-create-dialog.tsx), after the "Required per pay / Annual funding" section (line 374):

```tsx
import { BudgetImpactWidget } from "@/components/planner/budget-impact-widget";

// In the form JSX, after line 385:
{perPayAmount > 0 && (
  <BudgetImpactWidget
    action="add"
    payCycleAmount={perPayAmount}
    priority={form.priority}
  />
)}
```

### 4. Similar Changes for Edit Dialog

Apply same pattern to any edit envelope dialogs:
- Add priority to form state (if not already there)
- Add BudgetImpactWidget with `action="edit"` and `envelopeId={envelope.id}`

---

## User Experience Flow

### Scenario 1: Adding Envelope with Surplus

```
User fills out form:
  Name: "Gym Membership"
  Due amount: $200
  Frequency: Quarterly
  → Calculated: $76.92/pay (fortnightly)

Budget Impact Widget shows:
  ✓ Current total: $3,907.69/pay
  ✓ New total: $3,984.61/pay
  ✓ Change: +$76.92/pay

  Message: "This adds $76.92/pay to your regular allocations.
           Make sure this fits within your budget."
```

### Scenario 2: Adding Envelope Creates Shortfall

```
User fills out form:
  Name: "Personal Trainer"
  Due amount: $600
  Frequency: Monthly
  → Calculated: $300/pay (fortnightly)

Budget Impact Widget shows:
  ⚠️ Current total: $3,907.69/pay
  ⚠️ New total: $4,207.69/pay
  ⚠️ Change: +$300/pay

  Warning: "⚠️ This addition will create a shortfall of $7.69/pay.
           You won't have enough to cover all regular allocations."

  Suggestion: "Consider reducing other envelopes or exploring
              scenarios to free up funds."

  [Explore Scenarios] [View Full Budget]
```

### Scenario 3: Editing Envelope to Reduce Amount

```
User edits "Netflix":
  Old amount: $25/pay
  New amount: $15/pay
  → Change: -$10/pay

Budget Impact Widget shows:
  ✓ Current total: $3,907.69/pay
  ✓ New total: $3,897.69/pay
  ✓ Change: -$10/pay

  Message: "✓ This reduces allocations, increasing your surplus
           from $292.31 to $302.31/pay."
```

---

## Technical Notes

### Why userPayAmount is Null

Currently, we don't store the user's typical/expected pay amount. The API returns:
- `currentTotalRegular` and `newTotalRegular` (always available)
- `difference` (always available)
- `userPayAmount`, `currentSurplus`, `newSurplus` (null until we add pay tracking)

### Future Enhancement: Track User Pay

To provide accurate surplus/shortfall warnings, we need to know user's pay amount. Options:

**Option A: User Preference**
```sql
ALTER TABLE profiles
ADD COLUMN expected_pay_amount numeric(12,2);
```

**Option B: Learn from Income Transactions**
```typescript
// Find most recent income transaction
const { data: incomeTransactions } = await supabase
  .from("transactions")
  .select("amount")
  .eq("envelope_type", "income")
  .order("date", { descending: true })
  .limit(3);

const avgIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0) / 3;
```

**Option C: Payday Allocator Integration**
- When user uses Payday Allocator, remember their pay amount
- Use most recent payday amount for future calculations

### Debouncing

The BudgetImpactWidget debounces API calls by 500ms to avoid hammering the server as user types. This provides real-time feedback without excessive requests.

---

## Testing Checklist

- [ ] Apply database migration `0012_add_envelope_priority.sql`
- [ ] Create BudgetImpactWidget component
- [ ] Update envelope-create-dialog.tsx with priority field
- [ ] Add BudgetImpactWidget to create dialog
- [ ] Test adding envelope with small amount (should show "unknown" status)
- [ ] Test adding envelope with large amount (should show warning)
- [ ] Test editing envelope to reduce amount (should show "improved")
- [ ] Test "Explore Scenarios" button opens Scenario Planner
- [ ] Test "View Full Budget" button opens Payday Allocator
- [ ] Repeat for edit envelope dialog (if separate component)

---

## Summary

This integration brings **real-time budget awareness** to envelope management:

✅ **Before saving:** User sees how envelope affects total budget
✅ **Warning system:** Alerts if creating shortfall
✅ **Guided action:** Links to Scenario Planner and Payday Allocator
✅ **Informed decisions:** Users know impact before committing

This turns envelope creation from a blind action into an informed budget decision.

---

**Created:** 2025-11-07
**Status:** API Complete, UI Integration Pending
**Next Step:** Create BudgetImpactWidget component and integrate into envelope dialogs
