# Migration Plan: Consolidating Dual Allocation Systems

## Overview

My Budget Mate currently has **TWO parallel income allocation systems** that cause confusion and data inconsistency:

1. **Legacy System**: `recurring_income` table with JSONB `allocations` field
2. **Modern System**: `income_sources` + `envelope_income_allocations` normalized tables

This document outlines the plan to **deprecate the legacy system** and migrate all users to the modern architecture.

## Current State

### Legacy System (`recurring_income`)

**Table Schema:**
```sql
CREATE TABLE recurring_income (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  typical_amount NUMERIC(10, 2),
  allocations JSONB,  -- LEGACY: Stores allocations as JSON blob
  -- ... other fields
);
```

**Example Data:**
```json
{
  "allocations": {
    "envelope-123": 500,
    "envelope-456": 300
  }
}
```

**Problems:**
- ❌ JSONB makes querying and aggregation difficult
- ❌ No referential integrity (can reference deleted envelopes)
- ❌ Single income source only (no multi-income support)
- ❌ Cannot support per-source pay frequencies
- ❌ Hard to maintain as business logic evolves

### Modern System (`income_sources` + `envelope_income_allocations`)

**Table Schemas:**
```sql
CREATE TABLE income_sources (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  pay_cycle TEXT NOT NULL,  -- weekly, fortnightly, twice_monthly, monthly
  next_pay_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  -- ... timestamps
);

CREATE TABLE envelope_income_allocations (
  id UUID PRIMARY KEY,
  envelope_id UUID NOT NULL REFERENCES envelopes(id) ON DELETE CASCADE,
  income_source_id UUID NOT NULL REFERENCES income_sources(id) ON DELETE CASCADE,
  allocation_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  user_id UUID NOT NULL,
  UNIQUE(envelope_id, income_source_id),
  -- ... timestamps
);
```

**Benefits:**
- ✅ Normalized design with referential integrity
- ✅ Multi-income support with individual pay frequencies
- ✅ Easy to query and aggregate
- ✅ Flexible for business logic changes
- ✅ Supports zero-based budgeting validation

## Migration Strategy

### Phase 1: Prepare for Migration (Week 1)

#### 1.1 Document Current Usage

**Tasks:**
- [x] Document architecture in ARCHITECTURE.md
- [x] Identify all code paths using `recurring_income`
- [ ] Create inventory of users with data in `recurring_income` table
- [ ] Analyze data quality issues (invalid envelope IDs, etc.)

**Query to Identify Legacy Users:**
```sql
SELECT
  user_id,
  COUNT(*) as income_count,
  SUM(CASE WHEN allocations IS NOT NULL THEN 1 ELSE 0 END) as with_allocations
FROM recurring_income
WHERE is_active = true
GROUP BY user_id;
```

#### 1.2 Make Recurring Income Page Read-Only

**Goal:** Prevent new data from being added to legacy system

**Changes:**
- [ ] Update Recurring Income page to display read-only message
- [ ] Add "Edit in Budget Manager" buttons for each income source
- [ ] Show migration banner: "This page is now read-only. Manage income in Budget Manager."
- [ ] Remove all edit/add/delete buttons

**Files to Modify:**
- `app/(app)/recurring-income/page.tsx`
- `components/recurring-income/*` (all edit components)

#### 1.3 Create Migration Script (Preparation Only)

**Goal:** Create tested migration script (DO NOT RUN YET)

**Script:** `scripts/migrate-recurring-income-to-modern.mjs`

**Logic:**
```javascript
// For each user with recurring_income data:
// 1. Create income_sources record from recurring_income
// 2. Parse JSONB allocations field
// 3. Create envelope_income_allocations records
// 4. Validate totals match
// 5. Mark recurring_income as migrated (add flag)
// 6. Log results for audit
```

### Phase 2: Test Migration (Week 2)

#### 2.1 Test with Staging Data

**Tasks:**
- [ ] Create test database with sample legacy data
- [ ] Run migration script on test data
- [ ] Verify Budget Manager displays correctly
- [ ] Check that totals match between old and new systems
- [ ] Test edge cases (null allocations, deleted envelopes, etc.)

#### 2.2 Create Rollback Plan

**Tasks:**
- [ ] Document rollback procedure
- [ ] Create script to reverse migration if needed
- [ ] Test rollback on staging data

### Phase 3: Gradual Production Migration (Week 3-4)

#### 3.1 Migrate Low-Risk Users First

**Strategy:** Start with users who have minimal data

**Criteria for Low-Risk:**
- Single income source
- Less than 10 envelopes
- No complex allocations
- Last login within 30 days

**Query to Identify Low-Risk Users:**
```sql
SELECT ri.user_id
FROM recurring_income ri
JOIN profiles p ON ri.user_id = p.id
WHERE ri.is_active = true
  AND (SELECT COUNT(*) FROM envelopes WHERE user_id = ri.user_id) < 10
  AND p.last_sign_in_at > NOW() - INTERVAL '30 days'
ORDER BY (SELECT COUNT(*) FROM envelopes WHERE user_id = ri.user_id) ASC
LIMIT 100;
```

#### 3.2 Monitor Migration Results

**Metrics to Track:**
- Migration success rate
- Data validation errors
- User-reported issues
- Budget Manager usage after migration

#### 3.3 Migrate Remaining Users

**Timeline:** After 1 week of successful low-risk migrations

**Communication:**
- Email notification before migration
- In-app notification of changes
- Link to help documentation

### Phase 4: Deprecate Legacy System (Week 5)

#### 4.1 Archive Legacy Data

**Tasks:**
- [ ] Export `recurring_income` table to backup
- [ ] Add `migrated_at` timestamp to track migration completion
- [ ] Keep table for 90 days for audit/rollback purposes

#### 4.2 Remove Legacy Code

**Files to Remove/Update:**
- [ ] Remove Recurring Income page entirely OR
- [ ] Replace with redirect to Budget Manager
- [ ] Remove `recurring_income` API endpoints
- [ ] Remove legacy allocation logic from components

#### 4.3 Update Documentation

**Tasks:**
- [ ] Update ARCHITECTURE.md to remove legacy system references
- [ ] Update user-facing help docs
- [ ] Add migration notes to CHANGELOG.md

### Phase 5: Complete Removal (Week 12+)

**After 90 Days:**
- [ ] Drop `recurring_income.allocations` column
- [ ] Remove migration flags and scripts
- [ ] Clean up audit logs
- [ ] Final documentation update

## Data Migration Script

### Script Location
`scripts/migrate-recurring-income-to-modern.mjs`

### Usage
```bash
# Dry run (no changes)
node scripts/migrate-recurring-income-to-modern.mjs --dry-run

# Migrate specific user
node scripts/migrate-recurring-income-to-modern.mjs --user-id UUID

# Migrate all users
node scripts/migrate-recurring-income-to-modern.mjs --all

# Rollback specific user
node scripts/migrate-recurring-income-to-modern.mjs --rollback --user-id UUID
```

### Migration Logic

```javascript
async function migrateUser(userId) {
  const client = await getSupabaseClient();

  // 1. Fetch recurring_income records
  const { data: incomeRecords } = await client
    .from('recurring_income')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true);

  for (const income of incomeRecords) {
    // 2. Create income_sources record
    const { data: newIncome, error: incomeError } = await client
      .from('income_sources')
      .insert({
        user_id: userId,
        name: income.name,
        amount: income.typical_amount,
        pay_cycle: income.pay_cycle || 'monthly',
        next_pay_date: income.next_pay_date || new Date(),
        is_active: true,
      })
      .select()
      .single();

    if (incomeError) {
      console.error(`Failed to create income_sources for user ${userId}:`, incomeError);
      continue;
    }

    // 3. Parse allocations JSONB and create envelope_income_allocations
    const allocations = income.allocations || {};

    for (const [envelopeId, amount] of Object.entries(allocations)) {
      // Verify envelope exists
      const { data: envelope } = await client
        .from('envelopes')
        .select('id')
        .eq('id', envelopeId)
        .eq('user_id', userId)
        .maybeSingle();

      if (!envelope) {
        console.warn(`Envelope ${envelopeId} not found for user ${userId}, skipping`);
        continue;
      }

      // Create allocation
      const { error: allocError } = await client
        .from('envelope_income_allocations')
        .insert({
          user_id: userId,
          envelope_id: envelopeId,
          income_source_id: newIncome.id,
          allocation_amount: amount,
        });

      if (allocError) {
        console.error(`Failed to create allocation for envelope ${envelopeId}:`, allocError);
      }
    }

    // 4. Mark recurring_income as migrated
    await client
      .from('recurring_income')
      .update({ migrated_at: new Date(), migrated_to_income_source_id: newIncome.id })
      .eq('id', income.id);

    console.log(`✅ Migrated income source: ${income.name} for user ${userId}`);
  }

  return { success: true };
}
```

## Validation Queries

### Check Migration Completeness
```sql
-- Users not yet migrated
SELECT user_id, COUNT(*) as unmigrated_count
FROM recurring_income
WHERE is_active = true
  AND migrated_at IS NULL
GROUP BY user_id;
```

### Validate Totals Match
```sql
-- Compare legacy vs modern total allocations per user
WITH legacy_totals AS (
  SELECT
    user_id,
    SUM((allocations->>'total')::numeric) as legacy_total
  FROM recurring_income
  WHERE is_active = true
  GROUP BY user_id
),
modern_totals AS (
  SELECT
    user_id,
    SUM(allocation_amount) as modern_total
  FROM envelope_income_allocations
  GROUP BY user_id
)
SELECT
  COALESCE(l.user_id, m.user_id) as user_id,
  COALESCE(l.legacy_total, 0) as legacy_total,
  COALESCE(m.modern_total, 0) as modern_total,
  ABS(COALESCE(l.legacy_total, 0) - COALESCE(m.modern_total, 0)) as difference
FROM legacy_totals l
FULL OUTER JOIN modern_totals m ON l.user_id = m.user_id
WHERE ABS(COALESCE(l.legacy_total, 0) - COALESCE(m.modern_total, 0)) > 0.01;
```

## Communication Plan

### User Notifications

#### Email (1 Week Before Migration)
**Subject:** "Upcoming Improvement: Better Multi-Income Support"

**Body:**
```
Hi [Name],

We're upgrading My Budget Mate's income management system to better support multiple income sources with different pay frequencies.

What's changing:
- The "Recurring Income" page is being replaced with enhanced features in Budget Manager
- You'll be able to manage multiple income sources with individual pay cycles
- All your data will be automatically migrated - no action needed

Timeline:
- [Date]: Migration scheduled
- Your data remains safe throughout the process
- Contact support if you have questions

Benefits:
✅ Manage multiple income streams with different frequencies
✅ More flexible budget allocation
✅ Improved zero-based budgeting validation

Questions? Reply to this email or visit our help center.

Thanks,
The My Budget Mate Team
```

#### In-App Banner (During Migration Period)
```
📢 System Upgrade in Progress
We're migrating your income data to our new multi-income system.
Your data is safe. Learn more →
```

## Risks and Mitigation

### Risk 1: Data Loss During Migration
**Mitigation:**
- Full database backup before migration
- Dry-run mode to test without changes
- Keep legacy data for 90 days
- Rollback script ready

### Risk 2: Invalid Envelope References
**Mitigation:**
- Pre-migration validation query to identify orphaned references
- Skip invalid allocations with logging
- Notify user of skipped items

### Risk 3: User Confusion
**Mitigation:**
- Clear communication before/during/after migration
- Help documentation with screenshots
- Support team briefed on changes
- Gradual rollout starting with low-risk users

### Risk 4: Budget Manager Not Ready
**Mitigation:**
- Complete Budget Manager income columns implementation FIRST
- Thorough testing before any migration
- Feature flags to enable/disable functionality

## Success Criteria

### Technical Success
- [ ] 100% of active users migrated
- [ ] Zero data loss (all allocations transferred)
- [ ] Totals match between old and new systems
- [ ] Budget Manager displays income columns correctly
- [ ] No database errors during migration

### User Success
- [ ] Less than 5% support tickets related to migration
- [ ] Budget Manager usage increases by 50%+
- [ ] User satisfaction score remains stable or improves
- [ ] Zero critical bugs reported

## Timeline Summary

| Phase | Week | Status | Tasks |
|-------|------|--------|-------|
| Prepare | 1 | 🟡 In Progress | Document, make read-only, create script |
| Test | 2 | ⚪ Pending | Test on staging, create rollback |
| Migrate Low-Risk | 3 | ⚪ Pending | Migrate 100 low-risk users |
| Monitor | 3-4 | ⚪ Pending | Track metrics, address issues |
| Migrate All | 4 | ⚪ Pending | Complete remaining migrations |
| Deprecate | 5 | ⚪ Pending | Archive legacy system |
| Remove | 12+ | ⚪ Pending | Drop legacy table |

## Rollback Procedure

If migration fails:

1. **Stop all migrations immediately**
2. **Run rollback script** to restore legacy data
3. **Re-enable Recurring Income page** editing
4. **Notify affected users** of temporary issue
5. **Investigate root cause** before retrying
6. **Update migration script** to fix issue

**Rollback Script:**
```javascript
async function rollbackUser(userId) {
  // 1. Find migrated income sources
  const { data: sources } = await client
    .from('recurring_income')
    .select('id, migrated_to_income_source_id')
    .eq('user_id', userId)
    .not('migrated_at', 'is', null);

  for (const source of sources) {
    // 2. Delete income_sources record
    await client
      .from('income_sources')
      .delete()
      .eq('id', source.migrated_to_income_source_id);

    // 3. Reset migration flag
    await client
      .from('recurring_income')
      .update({ migrated_at: null, migrated_to_income_source_id: null })
      .eq('id', source.id);
  }

  // 4. envelope_income_allocations will cascade delete
  console.log(`✅ Rolled back user ${userId}`);
}
```

## Next Steps

1. **Immediate (This Week):**
   - [x] Create this MIGRATION_PLAN.md document
   - [ ] Make Recurring Income page read-only
   - [ ] Create migration script (preparation only)

2. **Next Week:**
   - [ ] Test migration script on staging
   - [ ] Get approval from stakeholders
   - [ ] Schedule migration window

3. **Following Weeks:**
   - [ ] Execute gradual migration
   - [ ] Monitor and support users
   - [ ] Complete deprecation

---

**Document Version:** 1.0
**Last Updated:** 2025-12-02
**Owner:** Development Team
**Status:** Planning Phase
