# Budget Planning System - Complete

**Date:** 2025-11-07
**Status:** ✅ Ready to Use

---

## What You Now Have

A complete **intelligent budget planning and allocation system** consisting of two powerful tools that work together:

### 1. 🎯 Scenario Planner ([/scenario-planner](app/(app)/scenario-planner/page.tsx))
**"What if I change my habits?"**

Visualize the impact of reducing discretionary spending over 3-6 months:
- Pre-built scenarios (pause all discretionary, reduce by half, etc.)
- See exact savings per pay and total over period
- Time to close budget gaps
- Buffer built after gaps are closed
- Essential vs Important vs Discretionary classification

**Requires:** Database migration `0012_add_envelope_priority.sql`

### 2. 💰 Payday Allocator ([/payday-allocator](app/(app)/payday-allocator/page.tsx))
**"Where does my paycheck go?"**

Show exactly how each paycheck gets distributed with smart surplus suggestions:
- Regular allocations grouped by priority
- Surplus/shortfall detection
- Smart suggestions for what to do with surplus
- Envelope health check overview
- Top-up most urgent envelopes

**Requires:** No migration (uses existing data + priority from Scenario Planner)

---

## How They Work Together

```
┌─────────────────────────────────────────────────────┐
│  User Journey: From Paycheck to Paycheck to Ahead  │
└─────────────────────────────────────────────────────┘

Week 1: Payday
├─ Open Payday Allocator
├─ Enter $4,200 pay
├─ See: $292 surplus after regular allocations
├─ Suggestion: "Top up Insurance ($935 behind)"
└─ Apply: Add $292 to Insurance

Week 2: Exploration
├─ Notice: Still $643 behind on Insurance
├─ Open Scenario Planner
├─ Explore: "Pause All Discretionary for 3 months"
├─ See: Save $280/pay = $1,680 total
└─ Impact: Close all gaps + build $1,380 buffer

Week 3: Decision
├─ Choose: "No Takeaways & Eating Out" instead
├─ See: Save $160/pay = $960 total
├─ Impact: Close all gaps in 2 pays, keep Netflix
└─ Decision: More sustainable sacrifice

Week 4: Next Payday
├─ Open Payday Allocator
├─ Enter $4,200 pay
├─ With takeaways paused: $452 surplus!
├─ Top up Insurance with entire surplus
└─ Insurance now only $191 behind

Week 8: Success
├─ Insurance fully caught up
├─ All envelopes on track
└─ Start building emergency fund with surplus
```

---

## Complete File List

### Database
```
supabase/migrations/
└── 0012_add_envelope_priority.sql          ← Apply this in Supabase
```

### Core Logic
```
lib/planner/
├── types.ts                                 ← Shared types
├── scenarios.ts                             ← Scenario calculations
└── payday.ts                                ← Payday calculations
```

### API Endpoints
```
app/api/planner/
├── scenarios/route.ts                       ← GET scenarios, POST custom
└── payday/route.ts                          ← GET allocation, POST initial
```

### UI Pages
```
app/(app)/
├── scenario-planner/page.tsx                ← What-if scenarios
└── payday-allocator/page.tsx                ← Paycheck distribution
```

### Updated APIs
```
app/api/envelopes/
├── route.ts                                 ← Added priority field
└── [id]/route.ts                            ← Added priority field
```

### Documentation
```
SCENARIO_PLANNER_SETUP.md                    ← Scenario Planner guide
PAYDAY_ALLOCATOR_SETUP.md                    ← Payday Allocator guide
BUDGET_PLANNER_COMPLETE.md                   ← This file
```

---

## Setup Steps

### 1. Apply Database Migration

Copy contents of `supabase/migrations/0012_add_envelope_priority.sql` and run in Supabase SQL Editor.

This adds:
- `priority` column to envelopes (essential/important/discretionary)
- Smart defaults based on envelope names
- Performance index

### 2. Test Scenario Planner

1. Navigate to `/scenario-planner`
2. See your current budget health
3. Explore pre-built scenarios
4. Click scenario cards to see detailed breakdowns

### 3. Test Payday Allocator

1. Navigate to `/payday-allocator`
2. Enter your pay amount
3. See regular allocations + surplus
4. Review smart suggestions
5. Check envelope health

### 4. Use Together

- **Planning:** Use Scenario Planner when considering habit changes
- **Executing:** Use Payday Allocator every payday to allocate surplus
- **Both:** Reference envelope health to track progress

---

## Key Concepts

### Envelope Priority

**🔴 Essential** (Must pay)
- Mortgage/Rent
- Utilities (electricity, water, gas)
- Groceries
- Petrol/Transport to work
- Essential insurances

**🟡 Important** (Should pay)
- Phone, Internet
- Home/Life insurance
- Loan repayments
- School fees
- Medical

**🔵 Discretionary** (Nice to have)
- Netflix, Spotify, subscriptions
- Eating out, takeaways
- Entertainment
- Gym membership
- Hobbies

### Envelope Health

For each envelope, we calculate:

```
Should Have Saved = (target / totalPays) × paysSoFar
Current Balance = what's actually in envelope
Gap = shouldHaveSaved - currentBalance

Status:
  gap < -$50: AHEAD (with buffer)
  gap -$50 to +$50: ON TRACK
  gap > +$50: BEHIND
```

### Priority Scoring

For surplus allocation:

```
priorityScore = urgencyWeight + gapWeight

urgencyWeight = 100 - daysUntilDue
gapWeight = (gap / totalAmount) × 100

Lower score = higher priority
```

---

## Design Philosophy

### 1. Consistency First
- Regular allocations stay the same every pay
- No "catch-up math" that creates stress
- Surplus is the adjustment tool

### 2. Informed Choices
- Show users the trade-offs
- "Skip Netflix for 3 months" vs "Stay paycheck-to-paycheck"
- Make abstract consequences concrete

### 3. Gradual Progress
- Not about drastic overnight changes
- Build buffer over time with surplus
- Sustainable pace toward financial health

### 4. Empowerment
- Scenarios are CHOICES, not requirements
- User decides what sacrifices are worth it
- Tools guide, don't force

### 5. Hope, Not Shame
- Focus on "here's how to get ahead"
- Not "here's where you failed"
- Positive messaging throughout

---

## Example Calculations

### Scenario: Pause All Discretionary for 3 Months

**User Setup:**
- Pay cycle: Fortnightly ($4,200/pay)
- Discretionary spending: $280/pay
- Current gap: $300 across 2 envelopes

**Calculation:**
```
Duration: 3 months = 6 fortnightly pays
Savings per pay: $280
Total savings: $280 × 6 = $1,680

Impact:
- Close $300 gap: Use $300 of savings
- Remaining: $1,680 - $300 = $1,380
- Result: All envelopes on track + $1,380 buffer

Timeline:
- Gap closes: 1 pay (surplus $280 covers most of $300)
- Rest of period: Build buffer
```

**UI Shows:**
- "Save $280/pay"
- "Total over 3 months: $1,680"
- "Close gap in 1 pay cycle"
- "Build $1,380 buffer"
- "No longer living paycheck-to-paycheck"

### Payday: Allocate $4,200

**User Setup:**
- Pay: $4,200
- Regular allocations: $3,907.69
- Insurance behind by $935

**Calculation:**
```
Surplus: $4,200 - $3,907.69 = $292.31

Top Priority Envelope:
- Insurance: 22 days until due, $935 behind
- Priority score: (100 - 22) + (935/1500 × 100) = 78 + 62 = 140

Suggestion:
"Top up Insurance with $292.31"
Impact: "Reduces gap to $642.69"
```

**UI Shows:**
- Surplus: $292.31 (green)
- Suggestion: Top Up Insurance
- Alternative: Split across all behind
- Alternative: Start savings goal

---

## API Quick Reference

### Scenarios

```bash
# Get all scenarios with current envelope health
GET /api/planner/scenarios

# Calculate custom scenario
POST /api/planner/scenarios
{
  "scenario": {
    "id": "custom",
    "name": "My Custom Scenario",
    "description": "Pause Netflix only",
    "duration": 6,
    "affectedPriorities": ["discretionary"],
    "reduction": 100,
    "specificEnvelopes": ["Netflix"]
  }
}
```

### Payday Allocation

```bash
# Get payday allocation
GET /api/planner/payday?amount=4200

# Calculate initial distribution (startup wizard)
POST /api/planner/payday
{
  "type": "initial",
  "currentBalance": 5000
}
```

---

## Future Enhancement Ideas

### Phase 2: Action Integration

1. **Apply Suggestions Directly**
   - Click "Apply" on Payday Allocator
   - Auto-create transaction to move money
   - Update envelope balances immediately

2. **Apply Scenarios**
   - Click "Start This Scenario" on Scenario Planner
   - Temporarily adjust pay_cycle_amounts
   - Set end date for scenario
   - Revert when complete

### Phase 3: Tracking & History

3. **Scenario History**
   - Track when scenarios were active
   - "You've been on 'No Takeaways' for 4 weeks"
   - Progress bar to end date

4. **Payday History**
   - See past 10 paydays
   - Compare actual vs regular
   - Trend analysis

### Phase 4: Automation

5. **Payday Reminders**
   - "Your pay is coming tomorrow"
   - "Don't forget to allocate your surplus"
   - Email/SMS notifications

6. **Smart Defaults**
   - Learn from user behavior
   - Pre-fill pay amount based on history
   - Remember favorite surplus allocation

### Phase 5: Advanced Features

7. **Multiple Income Streams**
   - Different allocations for different income sources
   - Irregular income planning
   - Contract/freelance support

8. **Goal Progress**
   - Link scenarios to goals
   - "3 more months until emergency fund complete"
   - Visual progress tracking

---

## Troubleshooting

### Issue: Envelopes showing wrong priority

**Solution:** Update envelope priority manually:
```bash
PATCH /api/envelopes/{id}
{
  "priority": "essential"
}
```

Or apply migration again - it has smart defaults based on names.

### Issue: Health check shows envelope as "behind" when it's not

**Check:**
- Is `next_payment_due` set correctly?
- Is `frequency` correct?
- Is `pay_cycle_amount` matching the target?

Health calculation needs these three fields to work properly.

### Issue: Surplus suggestions not showing

**Likely causes:**
- All envelopes are on track (no gaps)
- Surplus is $0 or negative
- No envelopes have `next_payment_due` set

### Issue: Scenario planner shows $0 savings

**Check:**
- Do you have envelopes with `priority = 'discretionary'`?
- Do those envelopes have `pay_cycle_amount > 0`?
- Is the scenario targeting the right priorities?

---

## Performance Notes

- Both tools fetch all envelopes once
- Calculations happen client-side after initial load
- No database writes during exploration
- Instant recalculation when inputs change
- Scales well up to ~100 envelopes

---

## Summary

You now have a complete intelligent budget planning system that:

✅ **Shows reality** (where you are vs where you should be)
✅ **Explores possibilities** (what if I change habits?)
✅ **Guides decisions** (smart suggestions based on priority)
✅ **Tracks progress** (envelope health over time)
✅ **Empowers action** (clear next steps every payday)

### The Core Loop:

```
Payday → Allocate with Payday Allocator
         ↓
    Have surplus? Great! Top up behind envelopes
    No surplus? Explore Scenario Planner
         ↓
    Choose scenario → Apply for 3 months
         ↓
    Next Payday → More surplus from reduced spending
         ↓
    Close gaps → Build buffer → Financial freedom
```

This system turns budgeting from a source of stress into a path toward control and hope.

---

**Created:** 2025-11-07
**Status:** ✅ Complete & Ready
**Pages:**
- `/scenario-planner` - What-if scenario exploration
- `/payday-allocator` - Paycheck distribution tool

**Next Action:** Apply database migration, then test both pages!
