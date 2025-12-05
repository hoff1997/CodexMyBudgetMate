# Future Enhancements

This document tracks planned features that are out of scope for the current implementation but should be considered for future development.

## Income Management Enhancements

### Periodic Income Review Prompts

**Purpose:** Remind users to verify their income amounts are still accurate, helping maintain budget accuracy over time.

**Implementation Concept:**
- Track the last time each income source was reviewed (e.g., `last_reviewed_at` timestamp)
- After 3 months (configurable), display a prompt when user visits Budget Manager
- Show current income amounts with "Still correct" and "Update" options
- Allow users to snooze the reminder ("Remind me later")

**Proposed UI:**
```
┌─────────────────────────────────────────────────────────────────────┐
│ 📋 Quick Income Review                                              │
│                                                                     │
│ It's been 3 months since you reviewed your income.                  │
│ Are these amounts still accurate?                                   │
│                                                                     │
│ Primary Job: $3,000 F/N    [Still correct ✓] [Update]               │
│ Side Hustle: $400 Wkly     [Still correct ✓] [Update]               │
│                                                                     │
│                                    [Remind me later]  [All correct] │
└─────────────────────────────────────────────────────────────────────┘
```

**Database Changes:**
- Add `last_reviewed_at` column to `income_sources` table
- Add user preference for review frequency (default: 90 days)

---

### Income History Tracking / Audit Log

**Purpose:** Log all income changes for audit purposes and analytics, allowing users to see how their income has changed over time.

**Implementation Concept:**
- Create `income_source_history` table to track all changes
- Record: previous value, new value, change type, timestamp, reason
- Display income timeline in a dedicated view
- Enable analytics on income growth/decline patterns

**Proposed Schema:**
```sql
CREATE TABLE income_source_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  income_source_id UUID NOT NULL REFERENCES income_sources(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  change_type TEXT NOT NULL CHECK (change_type IN (
    'created', 'amount_changed', 'frequency_changed',
    'ended', 'replaced', 'reactivated'
  )),
  previous_amount NUMERIC(12,2),
  new_amount NUMERIC(12,2),
  previous_frequency TEXT,
  new_frequency TEXT,
  reason TEXT, -- Optional user-provided reason
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_income_history_source
  ON income_source_history(income_source_id, changed_at DESC);
```

**Use Cases:**
1. "Show me my salary history over the past year"
2. "When did I last get a raise?"
3. "How has my total income changed quarter-over-quarter?"

---

### Auto-Advance Next Pay Date

**Purpose:** Automatically calculate the next pay date after each pay cycle, keeping the income schedule accurate without manual updates.

**Implementation Concept:**
- After an income transaction is reconciled, calculate the next expected date
- Use the income source's frequency to determine the interval
- Update `next_pay_date` automatically
- Handle edge cases (month-end dates, leap years, etc.)

**Logic:**
```typescript
function calculateNextPayDate(
  currentDate: Date,
  frequency: 'weekly' | 'fortnightly' | 'monthly'
): Date {
  const next = new Date(currentDate);
  switch (frequency) {
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'fortnightly':
      next.setDate(next.getDate() + 14);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
  }
  return next;
}
```

---

### Deprecate `recurring_income` Table

**Context:** The system currently has two tables for income:
- `recurring_income` - Created during onboarding, has `next_date`
- `income_sources` - Used by Budget Manager, linked to allocations

**Current State:**
- `income_sources` is now enhanced with lifecycle fields (`next_pay_date`, `start_date`, `end_date`, `replaced_by_id`)
- Migration script copies `next_date` from `recurring_income` to `income_sources.next_pay_date`

**Future Action:**
1. Update onboarding flow to write directly to `income_sources`
2. Remove read-only recurring income page or update to use `income_sources`
3. Create data migration to ensure all `recurring_income` data is in `income_sources`
4. Drop `recurring_income` table and related code

**Files to Update:**
- Onboarding components that write to `recurring_income`
- `/app/(app)/recurring-income/` page
- Any API routes that reference `recurring_income`

---

## Transaction Reconciliation Enhancements

### Automatic Income Variance Detection

**Purpose:** Detect income variances during transaction reconciliation and prompt users to handle them.

**Integration Points:**
- When a transaction is linked to an income source
- Compare transaction amount to `typical_amount`
- If variance > 1%, trigger variance dialog

**Components Created (ready for integration):**
- `lib/services/income-variance-detector.ts` - Detection logic
- `components/dialogs/income-variance-dialog.tsx` - For bonuses
- `components/dialogs/income-shortfall-dialog.tsx` - For shortfalls

---

## Envelope Management Enhancements

### Smart Allocation Suggestions

**Purpose:** Suggest optimal allocation adjustments based on spending patterns and upcoming bills.

**Concept:**
- Analyze historical transactions against envelope allocations
- Identify consistently over/under-funded envelopes
- Suggest reallocation to better match actual spending

---

### Goal Progress Notifications

**Purpose:** Notify users when they're ahead or behind on savings goals.

**Concept:**
- Track goal milestones with target dates
- Send notifications when X% ahead/behind schedule
- Celebrate milestone achievements

---

## Technical Debt

### Performance Optimizations

1. **Batch API calls** - Combine multiple small queries into batch requests
2. **Caching layer** - Implement SWR or React Query stale-while-revalidate patterns
3. **Virtual scrolling** - For users with many envelopes

### Code Quality

1. **Type consistency** - Ensure all components use unified types from `lib/types/`
2. **Test coverage** - Add unit tests for critical calculation functions
3. **Error boundaries** - Implement React error boundaries for graceful degradation

---

## Priority Matrix

| Enhancement | Impact | Effort | Priority |
|------------|--------|--------|----------|
| Periodic Income Review | High | Medium | 1 |
| Auto-Advance Pay Date | High | Low | 2 |
| Income History Tracking | Medium | Medium | 3 |
| Deprecate recurring_income | Low | Medium | 4 |
| Smart Allocation Suggestions | High | High | 5 |

---

*Last Updated: December 2024*
