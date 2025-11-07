# Payday Allocator - Setup Complete

**Date:** 2025-11-07
**Status:** ✅ Ready to Use (no migration needed)

---

## What Was Built

A complete **Payday Allocator** system that shows users exactly how their paycheck gets distributed across all envelopes, with smart suggestions for what to do with any surplus.

### Key Features

1. **Regular Allocation Display**
   - Shows exactly what goes to each envelope
   - Grouped by priority (Essential, Important, Discretionary)
   - Running totals for each category

2. **Surplus/Shortfall Detection**
   - Automatically calculates if you have money left over
   - Or shows shortfall if pay doesn't cover everything
   - Color-coded status indicators

3. **Smart Surplus Suggestions**
   - Top up most urgent behind envelope
   - Split surplus across all behind envelopes
   - Start a savings goal (if all on track)
   - Keep as buffer in main account

4. **Envelope Health Overview**
   - See which envelopes are ahead/on-track/behind
   - Current balance vs should-have-saved
   - Quick visual status for every envelope

5. **Pay Cycle Aware**
   - Adapts to weekly/fortnightly/monthly pay
   - Calculations match user's configured pay cycle

---

## Files Created

### Core Logic Library
- `lib/planner/payday.ts`
  - `calculatePaydayAllocation()` - Main allocation calculator
  - `generateSurplusSuggestions()` - Smart suggestions for surplus
  - `applySurplusSuggestion()` - Apply a suggestion to get updated allocations
  - `calculateInitialDistribution()` - Startup wizard helper (bonus!)

### API Endpoint
- `app/api/planner/payday/route.ts`
  - GET: Calculate payday allocation (query param: `?amount=4200`)
  - POST: Calculate initial distribution for startup wizard (body: `{type: "initial", currentBalance: 5000}`)

### UI Page
- `app/(app)/payday-allocator/page.tsx`
  - Pay amount input
  - Allocation summary (pay, regular, surplus)
  - Regular allocations breakdown by priority
  - Smart surplus suggestions (clickable cards)
  - Envelope health check overview

---

## How It Works

### 1. Regular Allocation

For each envelope:
```
regularAllocation = envelope.pay_cycle_amount
```

Simple - just takes the `pay_cycle_amount` from each envelope and shows it grouped by priority.

### 2. Surplus Calculation

```
surplus = payAmount - totalRegular

if surplus > 0:
  status = "available" (green)
else if surplus === 0:
  status = "exact" (blue)
else:
  status = "shortfall" (red)
```

### 3. Surplus Suggestions

Prioritized suggestions based on situation:

**If envelopes are behind:**
1. **Top up most urgent** - Identifies envelope with lowest priority score (due soonest + biggest gap)
2. **Split across all behind** - Distributes surplus proportionally across all behind envelopes

**If all on track or surplus exceeds gaps:**
3. **Start a savings goal** - Suggests emergency fund, holiday savings, etc.
4. **Keep as buffer** - Maintain breathing room in main account

### 4. Priority Scoring (same as Scenario Planner)

```
priorityScore = urgencyWeight + gapWeight

urgencyWeight = 100 - daysUntilDue (closer = more urgent)
gapWeight = (gap / totalAmount) × 100 (bigger gap = higher priority)

Lower score = higher priority for surplus allocation
```

---

## User Flow

### Example 1: User with Surplus

1. **Enter Pay:** $4,200
2. **See Summary:**
   - Regular Allocations: $3,907.69
   - Surplus: $292.31 ✅
   - 2 envelopes behind ($300 gap)

3. **See Suggestions:**
   - 🎯 **Top Up Insurance** - $292.31
     - "22 days until due, $935 behind schedule"
     - Impact: Reduces gap to $642.69

   - 💰 **Split Across All Behind** - $292.31
     - Split between Insurance & Electricity
     - Each gets proportional boost

4. **See Regular Allocations:**
   - 🔴 Essential: $4,050 (Mortgage, Groceries, Petrol)
   - 🟡 Important: $157.69 (Insurance, Phone)
   - 🔵 Discretionary: $300 (Netflix, Eating Out)

5. **See Health Check:**
   - Mortgage: ✅ On track
   - Insurance: ⚠️ $935 behind
   - Electricity: ⚠️ $100 behind
   - Netflix: ✅ On track

6. **User Decides:** Clicks "Top Up Insurance" → Ready to apply

### Example 2: User with Shortfall

1. **Enter Pay:** $3,500
2. **See Summary:**
   - Regular Allocations: $3,907.69
   - Shortfall: -$407.69 ⚠️
   - Warning message displayed

3. **See Suggestion:**
   - "Consider pausing some discretionary spending"
   - Link to Scenario Planner to explore options

4. **User Action:** Visits Scenario Planner to see what they can reduce

---

## API Usage

### GET - Calculate Payday Allocation

```typescript
// Request
GET /api/planner/payday?amount=4200

// Response
{
  payAmount: 4200,
  payCycle: "fortnightly",
  regularAllocations: [
    { envelopeId: "...", name: "Mortgage", priority: "essential", amount: 3500, type: "regular" },
    { envelopeId: "...", name: "Insurance", priority: "important", amount: 57.69, type: "regular" },
    // ...
  ],
  totalRegular: 3907.69,
  surplus: 292.31,
  surplusStatus: "available",
  suggestions: [
    {
      type: "top-up",
      envelopeId: "...",
      envelopeName: "Insurance",
      suggestedAmount: 292.31,
      reason: "22 days until due, $935 behind schedule",
      impact: "This will reduce the gap to $642.69",
      urgencyScore: 78
    }
  ],
  summary: {
    essentialTotal: 4050,
    importantTotal: 157.69,
    discretionaryTotal: 300,
    behindCount: 2,
    totalGap: 1035
  },
  envelopeHealth: [
    // Full health check for all envelopes
  ]
}
```

### POST - Initial Distribution (Bonus Feature)

```typescript
// Request
POST /api/planner/payday
{
  type: "initial",
  currentBalance: 5000
}

// Response
{
  envelopeHealth: [...],
  totalNeeded: 3500,
  canFullyFund: true,
  allocations: [
    { envelopeId: "...", name: "Insurance", amount: 935, percentOfNeeded: 100 },
    { envelopeId: "...", name: "Electricity", amount: 100, percentOfNeeded: 100 },
    // ...
  ],
  remainingBalance: 1500
}
```

This is for the "Startup Wizard" use case: "I have $5,000 in my account, how should I distribute it?"

---

## Key Design Decisions

### 1. Consistency Philosophy

- **Regular allocations NEVER change** - they're shown as-is from `pay_cycle_amount`
- **Surplus is separate** - optional top-ups, not required changes
- **No pressure** - suggestions are choices, not requirements

### 2. Smart Suggestions Priority

1. Behind envelopes first (most urgent)
2. Savings goals second (if on track)
3. Buffer third (if uncertain)

This guides users toward financial health without forcing it.

### 3. Visual Hierarchy

- **Green** = Good (surplus, ahead)
- **Blue** = Neutral (on track, discretionary)
- **Amber** = Caution (important, behind)
- **Red** = Urgent (essential, shortfall)

Clear color language throughout.

### 4. Actionable UI

- Clickable suggestion cards
- "Apply This Suggestion" buttons
- Direct link to Scenario Planner if shortfall
- Everything leads to next action

---

## Integration Opportunities

### With Scenario Planner

When user has shortfall:
```tsx
<p>Consider exploring scenarios to free up funds</p>
<Link href="/scenario-planner">
  <Button>Explore Scenarios</Button>
</Link>
```

Could pass shortfall amount to pre-filter relevant scenarios.

### With Transaction Creation

When user applies a suggestion:
```typescript
// Could auto-create transactions to move money
// e.g., Transfer $292.31 from main account → Insurance envelope
```

### With Dashboard

Could display as widget:
```tsx
<PaydayCountdown nextPayDate={...} />
<QuickPaydayPreview amount={expectedPay} />
```

---

## Bonus: Initial Distribution Calculator

The POST endpoint also supports a "Startup Wizard" use case:

**Question:** "I have $5,000 in my account. Where should I distribute it based on my envelopes?"

**Answer:**
- Calculate health for all envelopes
- See who needs what (gaps)
- Distribute proportionally if shortfall
- Show remaining buffer if surplus

This could become a separate wizard page later.

---

## Next Steps

### 1. Access the Page

Navigate to: `/payday-allocator`

No database migration needed - uses existing data!

### 2. Test the Flow

1. Enter your pay amount (e.g., 4200)
2. See how it gets distributed
3. Check surplus suggestions
4. View envelope health

### 3. Optional Enhancements

**Phase 2 Ideas:**

1. **Apply Suggestions**
   - Actually create transactions when user clicks "Apply"
   - Auto-allocate surplus to selected envelope
   - Update envelope balances

2. **Save Payday Templates**
   - "Save this as my standard payday allocation"
   - Quick-load for next pay cycle
   - Compare actuals vs template

3. **Payday History**
   - Track past allocations
   - "Last 5 paydays" view
   - See trends over time

4. **Payday Reminders**
   - "Your pay is coming in 2 days"
   - "Don't forget to allocate your surplus"
   - Email/push notifications

5. **Quick Allocate from Dashboard**
   - Widget on dashboard
   - "Today is payday! Allocate now"
   - One-click to open allocator

---

## Comparison: Payday Allocator vs Scenario Planner

| Feature | Payday Allocator | Scenario Planner |
|---------|------------------|------------------|
| Purpose | Distribute THIS paycheck | Explore what-if scenarios |
| Timeframe | Current pay cycle | 3-6 months forward |
| Focus | Regular + surplus | Reducing discretionary |
| Action | Allocate now | Plan for future |
| Frequency | Every payday | Occasional exploration |
| Output | Allocation list | Impact projections |

**They complement each other:**
- Payday Allocator = "What do I do TODAY with this money?"
- Scenario Planner = "What if I change my habits for 3 months?"

---

## Technical Notes

### No Database Changes Required

This feature uses existing data:
- `envelopes.pay_cycle_amount` - for regular allocations
- `envelopes.priority` - for grouping (from Scenario Planner migration)
- `profiles.pay_cycle` - for calculations
- Envelope health check (same logic as Scenario Planner)

### Reuses Existing Logic

- Health calculation from `lib/planner/scenarios.ts`
- Priority scoring same as Scenario Planner
- Pay cycle calculations consistent throughout

### Performance

- Single API call to fetch data
- Client-side state management
- Instant recalculation on amount change
- No database writes unless user applies suggestion

---

## Summary

✅ **Complete payday allocation system built:**
- Core calculator library with surplus suggestions
- API endpoint (GET for allocation, POST for initial distribution)
- Beautiful UI page with interactive suggestions
- Envelope health overview
- Priority-based grouping

🎯 **Ready for immediate use:**
- No migration needed
- Uses existing envelope data
- Works with pay cycle from settings
- Integrates with Scenario Planner

💡 **Core innovation:**
- Shows exactly where paycheck goes
- Makes surplus visible and actionable
- Suggests smart next steps based on envelope health
- Maintains consistency (no pressure to change regular allocations)

🚀 **Key insight:**
"Here's what's regular, here's your surplus, here's what you COULD do with it"

This turns payday from a moment of confusion into a moment of control.

---

**Created:** 2025-11-07
**Status:** ✅ Ready to Use
**Page URL:** `/payday-allocator`
**API Endpoints:**
- `GET /api/planner/payday?amount=4200`
- `POST /api/planner/payday` (body: `{type: "initial", currentBalance: 5000}`)
