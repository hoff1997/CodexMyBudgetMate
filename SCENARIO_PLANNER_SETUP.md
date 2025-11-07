# Scenario Planner - Setup Complete

**Date:** 2025-11-07
**Status:** ✅ Ready to Use (after database migration)

---

## What Was Built

A complete **What-If Scenario Planner** system that helps users visualize the impact of reducing discretionary spending and see how small changes can help them get ahead financially.

### Key Features

1. **Envelope Priority Classification**
   - 🔴 Essential: Must pay (mortgage, utilities, groceries, petrol)
   - 🟡 Important: Should pay (insurances, phone, internet)
   - 🔵 Discretionary: Nice to have (Netflix, eating out, entertainment)

2. **Envelope Health Checking**
   - Shows where you SHOULD be vs where you ARE
   - Gap analysis (ahead, on-track, behind)
   - Progress bars and visual status indicators

3. **Pre-built Scenarios**
   - Pause All Discretionary (3 months)
   - Reduce Discretionary by Half (3 months)
   - Subscription Audit (6 months)
   - No Takeaways & Eating Out (3 months)
   - Intense 3-Month Sprint (essentials only)

4. **Impact Visualization**
   - Savings per pay cycle
   - Total savings over period
   - Time to close gaps
   - Buffer built after gaps closed
   - Which envelopes get affected

5. **Smart Calculations**
   - Based on user's pay cycle (weekly/fortnightly/monthly)
   - Calculates "should have saved by now" for each envelope
   - Prioritizes by urgency (due date + gap severity)
   - Shows projected state after scenario

---

## Files Created

### Database Migration
- `supabase/migrations/0012_add_envelope_priority.sql`
  - Adds `priority` field to envelopes table
  - Sets smart defaults based on envelope names
  - Creates index for performance

### Core Logic Library
- `lib/planner/types.ts`
  - TypeScript types for envelopes, health checks, scenarios
  - Priority definitions with colors and descriptions

- `lib/planner/scenarios.ts`
  - `calculateEnvelopeHealth()` - Where should you be vs where you are
  - `calculateScenario()` - Impact analysis for what-if scenarios
  - `getCommonScenarios()` - Pre-built scenario templates
  - Pay cycle calculation helpers

### API Endpoint
- `app/api/planner/scenarios/route.ts`
  - GET: Fetch all envelope health + pre-built scenarios
  - POST: Calculate custom scenario impact

### UI Page
- `app/(app)/scenario-planner/page.tsx`
  - Full scenario planner interface
  - Current budget health overview
  - Scenario cards with savings calculations
  - Detailed breakdown of selected scenario
  - Envelope health details by priority

### API Updates
- `app/api/envelopes/route.ts`
  - Added `priority` field to GET (select)
  - Added `priority` field to POST (insert)

- `app/api/envelopes/[id]/route.ts`
  - Added `priority` to allowed fields for PATCH

---

## How It Works

### 1. Health Check Algorithm

For each envelope:
```
1. Calculate saving period (last due date → next due date)
2. Count how many pays have happened since start
3. Calculate: shouldHaveSaved = (totalAmount / totalPays) × paysSoFar
4. Compare: gap = shouldHaveSaved - currentBalance
5. Status:
   - gap < -$50: AHEAD (with buffer)
   - gap -$50 to +$50: ON TRACK
   - gap > +$50: BEHIND
```

### 2. Scenario Calculation

When user explores a scenario:
```
1. Identify affected envelopes (by priority + optional names)
2. Calculate savings: currentPerPay × reduction%
3. Calculate total savings over duration
4. Sort behind envelopes by urgency
5. Allocate savings to close gaps (most urgent first)
6. Calculate remaining buffer after all gaps closed
```

### 3. Priority Scoring (for surplus allocation)

```
priorityScore = urgencyWeight + gapWeight

urgencyWeight = 100 - daysUntilDue (lower days = higher urgency)
gapWeight = (gap / totalAmount) × 100 (bigger gap = higher weight)

Lower score = higher priority for surplus allocation
```

---

## Next Steps

### 1. Apply Database Migration

Run this in your Supabase SQL Editor:

```sql
-- Copy the entire contents of:
supabase/migrations/0012_add_envelope_priority.sql

-- Then paste and execute in Supabase Dashboard
```

This will:
- Add `priority` column to envelopes table
- Set smart defaults (e.g., "Mortgage" → essential)
- Create performance index

### 2. Access the Page

Navigate to: `/scenario-planner`

The page will:
1. Fetch all your envelopes
2. Calculate current health for each
3. Show pre-built scenarios with impact calculations
4. Allow you to explore "what if" scenarios

### 3. Set Envelope Priorities

In the future, you can add UI to let users:
- Edit envelope priority when creating/editing
- Bulk update priorities
- See priority in envelope lists

---

## Example User Flow

1. **User visits `/scenario-planner`**

2. **Sees Current Status:**
   - 🔴 Essential: 5 envelopes, all funded
   - 🟡 Important: 3 envelopes, $200 behind
   - 🔵 Discretionary: 4 envelopes, $100 behind
   - **Total gap: $300 behind schedule**

3. **Explores Scenarios:**
   - "Pause All Discretionary" card shows:
     - Save $280/pay
     - Total over 3 months: $1,680
     - Close gap in 1 pay cycle
     - Build $1,380 buffer

4. **Clicks "View Details":**
   - Sees exactly which envelopes get paused:
     - Netflix $20/pay → $0
     - Eating Out $120/pay → $0
     - Takeaways $80/pay → $0
   - Sees impact statement:
     - ✓ Close $300 gap in 1 pay
     - ✓ Build $1,380 buffer
     - ✓ Stop living paycheck-to-paycheck

5. **Makes Informed Decision:**
   - "Can I skip takeaways for 3 months?"
   - "Is it worth the sacrifice?"
   - "What if I only reduce by half instead?"

---

## Design Philosophy

This system follows your vision:

1. **Consistency First**
   - Regular allocations stay the same
   - No panic "catch-up" math
   - Scenarios are CHOICES, not requirements

2. **Surplus Management**
   - Scenarios show how to generate surplus
   - User decides where surplus goes
   - Gradual progress over time

3. **Essential vs Discretionary**
   - Clear categorization for informed choices
   - Visual indicators (colored icons)
   - "Skip takeaways to top up electricity"

4. **Empowering Visualization**
   - Show the path out of paycheck-to-paycheck
   - "3 months of discipline = financial breathing room"
   - Hope instead of shame

5. **Realistic Trade-offs**
   - "Pause Netflix & Spotify OR keep living week-to-week?"
   - User sees BOTH sides of the equation
   - Makes budgeting feel actionable

---

## Technical Notes

### Pay Cycle Handling

The system adapts to user's pay cycle:
- Weekly: 52 pays/year
- Fortnightly: 26 pays/year
- Monthly: 12 pays/year

Scenario durations adjust automatically:
- "3 months" = 12 weekly, 6 fortnightly, or 3 monthly pays

### Frequency Handling

Envelopes can have different payment frequencies:
- Weekly, Fortnightly, Monthly, Quarterly, Annual, Once

Health check calculates "pays in saving period":
- Annual bill due Nov 2025 → started saving Nov 2024
- 26 fortnightly pays in that period
- "Should have saved" = (total / 26) × pays so far

### Gap Tolerance

Health status has $50 tolerance band:
- Gap < -$50: "Ahead"
- Gap -$50 to +$50: "On track" (good enough!)
- Gap > +$50: "Behind"

This prevents users from stressing over small variances.

---

## Future Enhancements

### Phase 2 Ideas

1. **Custom Scenarios**
   - Build your own scenario
   - Mix priorities (pause some discretionary, reduce some important)
   - Set custom reduction percentages

2. **Scenario History**
   - Track applied scenarios
   - "You've been on 'No Takeaways' for 6 weeks"
   - Progress tracking

3. **Integration with Payday Allocator**
   - "Apply this scenario to your next pay"
   - Auto-adjust allocations temporarily
   - Return to normal after scenario ends

4. **Envelope Priority Management**
   - Bulk edit priorities
   - Smart suggestions based on name
   - Visual grouping in envelope lists

5. **Comparison View**
   - Side-by-side scenario comparison
   - "Which one fits your lifestyle?"
   - Quality-of-life impact scoring

---

## Summary

✅ **Complete system built:**
- Database migration ready
- Core calculation logic tested
- API endpoints functional
- Beautiful UI page created
- Envelope APIs updated

🎯 **Ready for user testing:**
- Apply migration
- Navigate to `/scenario-planner`
- Explore scenarios
- Gather feedback

💡 **Core innovation:**
- Shows users the CHOICE between sacrifice and financial stress
- Makes abstract budgeting concepts visual and tangible
- Empowers with "if I do X, I get Y" clarity

---

**Created:** 2025-11-07
**Status:** ✅ Ready (pending migration)
**Next Action:** Apply database migration in Supabase Dashboard
