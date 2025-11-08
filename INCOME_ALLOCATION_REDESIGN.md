# Income Allocation System Redesign

## Overview
Replace standalone Payday Allocator with integrated income-to-envelope allocation system that supports multi-income households and automatic allocation.

## Key Requirements

### 1. Remove Payday Allocator Page
- Delete `/payday-allocator` route
- Remove from navigation
- Keep calculation logic for reuse

### 2. Income Source Detection
- Use transaction rules (merchant name/reference)
- Ignore amount (variable income support)
- Manual selection on first occurrence
- Remember for future transactions

### 3. Surplus Handling
- Automatic assignment to "Surplus" envelope
- Create surplus envelope if doesn't exist
- Show in allocation preview

### 4. Multi-Income Support
- Envelopes can be funded from multiple income sources
- Clear visibility to prevent double-allocation
- Planner format showing all funding sources per envelope

### 5. Pay Cycle Flexibility
- Support different pay cycles per income source
- Support different pay dates
- Reflect correctly in envelope summary page

## Database Schema

### New Tables

#### `income_sources`
```sql
CREATE TABLE income_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL, -- "My Salary", "Partner Salary", "Bonus"
  pay_cycle TEXT NOT NULL CHECK (pay_cycle IN ('weekly', 'fortnightly', 'monthly')),
  typical_amount NUMERIC(12,2), -- Expected amount (for planning)
  detection_rule_id UUID REFERENCES transaction_rules, -- Link to auto-detect rule
  auto_allocate BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### `envelope_income_allocations`
```sql
CREATE TABLE envelope_income_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  envelope_id UUID NOT NULL REFERENCES envelopes ON DELETE CASCADE,
  income_source_id UUID NOT NULL REFERENCES income_sources ON DELETE CASCADE,
  allocation_amount NUMERIC(12,2) NOT NULL, -- Fixed $ amount per pay
  priority INTEGER DEFAULT 1, -- Order of allocation
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(envelope_id, income_source_id)
);
```

#### Update `allocation_plans` table
```sql
ALTER TABLE allocation_plans
ADD COLUMN income_source_id UUID REFERENCES income_sources;
```

## UI Components

### 1. Income & Allocation Planner (New Page)
**Route:** `/income-allocation`

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│ Income Sources & Allocation                         │
├─────────────────────────────────────────────────────┤
│                                                      │
│ [+ Add Income Source]                               │
│                                                      │
│ ┌─ My Salary (Fortnightly) ──────────────────────┐ │
│ │ Typical: $2,100                                 │ │
│ │ Detection Rule: "ACME CORP" in description      │ │
│ │ Auto-allocate: [ON]                             │ │
│ │                                                  │ │
│ │ Envelope Allocations:                           │ │
│ │ • Rent                    $550    (Essential)   │ │
│ │ • Groceries               $300    (Essential)   │ │
│ │ • Emergency Fund          $250    (Important)   │ │
│ │ • Credit Card             $150    (Important)   │ │
│ │ ─────────────────────────────────              │ │
│ │ Total Allocated:         $1,250                 │ │
│ │ Surplus to "Surplus":     $850                  │ │
│ │                                                  │ │
│ │ [Edit Allocations]  [Edit Detection Rule]      │ │
│ └──────────────────────────────────────────────────┘ │
│                                                      │
│ ┌─ Partner Salary (Monthly) ──────────────────────┐ │
│ │ Typical: $4,500                                 │ │
│ │ Detection Rule: "XYZ LTD" in description        │ │
│ │ Auto-allocate: [ON]                             │ │
│ │                                                  │ │
│ │ Envelope Allocations:                           │ │
│ │ • Rent                  $1,100    (Essential)   │ │
│ │ • Utilities               $300    (Essential)   │ │
│ │ • Insurance               $450    (Important)   │ │
│ │ ─────────────────────────────────              │ │
│ │ Total Allocated:        $1,850                  │ │
│ │ Surplus to "Surplus":   $2,650                  │ │
│ │                                                  │ │
│ │ [Edit Allocations]  [Edit Detection Rule]      │ │
│ └──────────────────────────────────────────────────┘ │
│                                                      │
│ Envelope Funding Summary                            │
│ ┌──────────────────────────────────────────────────┐ │
│ │ Rent ($2,200/month)                              │ │
│ │ └─ My Salary:      $550 x 2 = $1,100             │ │
│ │ └─ Partner Salary: $1,100 x 1 = $1,100           │ │
│ │                                    Total: $2,200  │ │
│ │                                                   │ │
│ │ Groceries ($600/month)                           │ │
│ │ └─ My Salary:      $300 x 2 = $600               │ │
│ │                                    Total: $600    │ │
│ └──────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### 2. Transaction Import with Allocation Preview
When income transaction detected:

```
┌─────────────────────────────────────────────────────┐
│ Income Detected: $2,150                             │
├─────────────────────────────────────────────────────┤
│ Source: My Salary (Fortnightly)                     │
│ Description: "ACME CORP - SALARY"                   │
│                                                      │
│ Proposed Allocation:                                │
│ • Rent            $550                              │
│ • Groceries       $300                              │
│ • Emergency       $250                              │
│ • Credit Card     $150                              │
│ • Surplus         $900  ← (Higher than usual!)      │
│ ─────────────────────────────                      │
│ Total:          $2,150                              │
│                                                      │
│ [Approve & Allocate]  [Adjust]  [Skip]             │
└─────────────────────────────────────────────────────┘
```

### 3. Envelope Summary Page Updates
Show funding sources per envelope:

```
┌─ Rent ───────────────────────────────────────────┐
│ Target: $2,200/month                             │
│ Current Balance: $1,650                          │
│ Next Payment Due: 2025-12-01 (23 days)          │
│                                                   │
│ Funding Sources:                                 │
│ • My Salary (Fortnightly):      $550 per pay    │
│ • Partner Salary (Monthly):   $1,100 per pay    │
│ └─ Expected monthly total:      $2,200           │
│                                                   │
│ Progress: ████████░░ 75% funded for next cycle   │
└───────────────────────────────────────────────────┘
```

## Auto-Allocation Workflow

### When Income Transaction Imported:

1. **Detection**
   - Check transaction amount > 0 (credit)
   - Check transaction rules for income source match
   - If match found → Auto-allocate
   - If no match → Prompt user to classify

2. **Allocation Plan Creation**
   - Fetch income source allocations
   - Calculate amounts for each envelope
   - Calculate surplus (income - total allocations)
   - Create allocation plan with "pending" status

3. **User Notification**
   - Toast: "Income detected: $2,150 from My Salary - Review allocation"
   - Badge on transactions page
   - Can approve/adjust/skip

4. **Approval**
   - Creates child transactions to envelopes
   - Creates surplus transaction
   - Marks allocation plan as "approved"
   - Updates envelope balances

## Migration Strategy

### Phase 1: Database Setup
1. Create `income_sources` table
2. Create `envelope_income_allocations` table
3. Add `income_source_id` to `allocation_plans`
4. Create RLS policies

### Phase 2: Data Migration
1. Create default income source from user profile
   - Name: "Primary Income"
   - Pay cycle from `profiles.pay_cycle`
   - Migrate existing allocations
2. Create "Surplus" envelope for all users

### Phase 3: UI Implementation
1. Build Income & Allocation Planner page
2. Update transaction import flow
3. Update envelope summary page
4. Remove Payday Allocator page

### Phase 4: Auto-Allocation
1. Implement income detection logic
2. Build allocation preview component
3. Implement approval workflow
4. Add notification system

## Design Decisions ✅

1. ✅ Remove Payday Allocator page
2. ✅ Detect by merchant name/ref (not amount)
3. ✅ Surplus → "Surplus" envelope (auto-created)
4. ✅ Multiple income sources per envelope
5. ✅ Planner format for visibility
6. ✅ Support different pay cycles
7. ✅ **Setup wizard** - Help set up with expected due dates, then auto-detect
8. ✅ **Funding sources inline** - Show in envelope summary page
9. ✅ **Adjust during approval** - Auto-syncs with planner, warns if overspending
10. ✅ **Auto-create transaction rule** - With ability to match during reconciliation if bank ref/merchant differs

## Setup Wizard Flow

### Step 1: Welcome
```
┌─────────────────────────────────────────────────────┐
│ Let's Set Up Your Income Allocation                │
├─────────────────────────────────────────────────────┤
│                                                      │
│ We'll help you set up automatic allocation of your │
│ income to your envelopes. This takes 2 minutes.    │
│                                                      │
│ You'll need:                                        │
│ • Your pay cycle (weekly/fortnightly/monthly)      │
│ • Next expected payday                             │
│ • Typical pay amount                               │
│ • How you want to allocate across envelopes        │
│                                                      │
│           [Get Started]  [Skip for Now]            │
└─────────────────────────────────────────────────────┘
```

### Step 2: Income Source Details
```
┌─────────────────────────────────────────────────────┐
│ Step 1 of 3: Income Source                         │
├─────────────────────────────────────────────────────┤
│                                                      │
│ Name: [My Salary________________]                   │
│                                                      │
│ Pay Cycle:                                          │
│ ○ Weekly    ● Fortnightly    ○ Monthly             │
│                                                      │
│ Next Payday:                                        │
│ [📅 2025-11-21_______________]                      │
│                                                      │
│ Typical Amount (after tax):                        │
│ [$2,100.00__________________]                       │
│                                                      │
│ How should we detect this income?                  │
│ [ACME CORP___________________]                      │
│ (Merchant name or bank reference)                  │
│                                                      │
│                        [Back]  [Next]               │
└─────────────────────────────────────────────────────┘
```

### Step 3: Allocate to Envelopes
```
┌─────────────────────────────────────────────────────┐
│ Step 2 of 3: Allocate $2,100 Across Envelopes      │
├─────────────────────────────────────────────────────┤
│                                                      │
│ Drag to adjust or enter amounts:                   │
│                                                      │
│ 🏠 Rent                   [$550___] Essential       │
│ 🛒 Groceries              [$300___] Essential       │
│ 🛟 Emergency Fund         [$250___] Important       │
│ 💳 Credit Card Payment    [$150___] Important       │
│                                                      │
│ [+ Add More Envelopes]                              │
│                                                      │
│ ─────────────────────────────────                  │
│ Total Allocated:          $1,250                    │
│ Surplus (to "Surplus"):    $850                     │
│                                                      │
│ ⚠️  Allocating $850 to surplus. You can use this   │
│    for one-off expenses or to catch up envelopes.  │
│                                                      │
│                        [Back]  [Next]               │
└─────────────────────────────────────────────────────┘
```

### Step 4: Review & Confirm
```
┌─────────────────────────────────────────────────────┐
│ Step 3 of 3: Review Your Setup                     │
├─────────────────────────────────────────────────────┤
│                                                      │
│ Income Source: My Salary                            │
│ Pay Cycle: Fortnightly                             │
│ Next Payday: 21 Nov 2025 (in 13 days)             │
│ Expected Amount: $2,100                             │
│ Detection Rule: "ACME CORP" in description         │
│                                                      │
│ Allocation Plan:                                    │
│ • Rent                    $550                      │
│ • Groceries               $300                      │
│ • Emergency Fund          $250                      │
│ • Credit Card Payment     $150                      │
│ • Surplus                 $850                      │
│ ─────────────────────────────────                  │
│ Total:                  $2,100                      │
│                                                      │
│ ✅ We'll watch for income matching "ACME CORP"     │
│ ✅ When detected, we'll auto-allocate like above   │
│ ✅ You'll be able to review & approve each time    │
│                                                      │
│                   [Back]  [Finish Setup]            │
└─────────────────────────────────────────────────────┘
```

## Reconciliation Matching

### When Transaction Doesn't Match Rule

If income arrives but merchant/ref doesn't match:

```
┌─────────────────────────────────────────────────────┐
│ Unmatched Income Transaction                        │
├─────────────────────────────────────────────────────┤
│ Amount: $2,150                                      │
│ Date: 21 Nov 2025                                   │
│ Description: "ACME CORPORATION PTY LTD - SALARY"   │
│                                                      │
│ This looks like income. Is this from an existing   │
│ income source?                                      │
│                                                      │
│ ○ My Salary (Expected: $2,100, Fortnightly)       │
│   └─ Update detection rule to include this?        │
│      [✓] Yes, match "ACME CORPORATION" too         │
│                                                      │
│ ○ New income source                                │
│   └─ [Set up new allocation plan...]               │
│                                                      │
│ ○ One-off income (bonus/gift)                      │
│   └─ Allocate manually without saving pattern      │
│                                                      │
│              [Cancel]  [Match & Allocate]           │
└─────────────────────────────────────────────────────┘
```

## Approval with Inline Adjustment

### When Income Auto-Detected
```
┌─────────────────────────────────────────────────────┐
│ Income Allocated: $2,150 from My Salary            │
├─────────────────────────────────────────────────────┤
│ Expected: $2,100  |  Actual: $2,150  |  Δ +$50     │
│                                                      │
│ Proposed Allocation:                   [Edit All]  │
│                                                      │
│ 🏠 Rent            [$550___]  [✓]                   │
│ 🛒 Groceries       [$300___]  [✓]                   │
│ 🛟 Emergency       [$250___]  [✓]                   │
│ 💳 Credit Card     [$150___]  [✓]                   │
│ 💰 Surplus         [$900___]  [✓] ← $50 extra!     │
│                    ──────                           │
│ Total:             $2,150                           │
│                                                      │
│ 💡 Tip: You can adjust amounts now. Changes will   │
│    be saved to your allocation plan.               │
│                                                      │
│ ⚠️  Warning: Rent is allocated $550, but you've    │
│     spent $600 already this cycle. Consider        │
│     adding more from surplus.                      │
│                                                      │
│     [Skip]  [Save Changes]  [Approve & Allocate]   │
└─────────────────────────────────────────────────────┘
```

**Inline Adjustment Behavior:**
- Changes sync back to allocation plan
- Shows warning if envelope overspent this cycle
- Validates total matches income amount
- Option to make adjustment one-time or permanent
