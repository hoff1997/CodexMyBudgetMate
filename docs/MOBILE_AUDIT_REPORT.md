# My Budget Mate - Mobile Responsiveness Audit

**Date:** 2026-01-03
**Auditor:** Claude Code
**Scope:** All pages and components in app/ and components/ directories

---

## Executive Summary

This audit systematically checked all pages and components for mobile responsiveness issues using 10 automated scans and 6 manual file inspections.

### Results Overview

| Category | Issues Found | Severity |
|----------|-------------|----------|
| 🔴 Grid layouts without mobile breakpoints | 62 | Critical |
| 🔴 Large text without responsive sizing | 108 | Critical |
| 🔴 Tables without overflow handling | 19 of 21 | Critical |
| 🟡 Excessive padding (p-8+) | 85 | Warning |
| 🟡 Fixed pixel widths (w-[...]) | 63 | Warning |
| 🟡 Dialogs without max-height | 187 of 200 | Warning |
| 🟡 Small touch targets (size="sm") | 81 | Warning |
| 🟢 Large gaps (gap-8+) | 4 | Low |

### Priority Summary

- 🔴 **Critical Issues:** 189 - Must fix before mobile release
- 🟡 **Warnings:** 416 - Should fix soon
- ✅ **Passed:** Some responsive patterns already in place

---

## 🔴 Critical Issues (Must Fix)

### 1. Grid Layouts Without Mobile Stacking

**62 instances found** where multi-column grids don't collapse on mobile.

**Top Offenders:**

| File | Line | Issue |
|------|------|-------|
| `components/chores/assign-chore-dialog.tsx` | 164 | `grid grid-cols-2` without breakpoint |
| `components/chores/assign-chore-dialog.tsx` | 222 | `grid grid-cols-2` without breakpoint |
| `components/chores/create-template-dialog.tsx` | 191 | `grid grid-cols-2` without breakpoint |
| `components/credit-cards/credit-card-dashboard-card.tsx` | 179 | `grid grid-cols-2` without breakpoint |
| `components/credit-cards/credit-cards-summary.tsx` | 138 | `grid grid-cols-2` without breakpoint |
| `components/credit-cards/interest-tracker-card.tsx` | 88, 134 | `grid grid-cols-2` without breakpoint |
| `components/credit-cards/multi-card-optimizer.tsx` | 130 | `grid grid-cols-3` without breakpoint |
| `components/bank/bank-connection-manager.tsx` | 876 | `grid grid-cols-2` without breakpoint |
| `components/bank/bank-connection-status-widget.tsx` | 135 | `grid grid-cols-2` without breakpoint |
| `components/allocation/snapshot-view.tsx` | 259 | `grid grid-cols-2` without breakpoint |
| `app/(app)/kids/setup/kids-setup-client.tsx` | 130 | `grid grid-cols-2` without breakpoint |
| `app/(app)/kids/[childId]/dashboard/kid-dashboard-client.tsx` | 139, 182 | `grid grid-cols-2` without breakpoint |
| `app/(app)/envelopes/[id]/envelope-detail-client.tsx` | 369 | `grid grid-cols-2` without breakpoint |
| `app/(auth)/kids/login/page.tsx` | 200, 251 | `grid grid-cols-2/3` without breakpoint |

**Fix Pattern:**
```tsx
// ❌ Bad - columns on all screens
<div className="grid grid-cols-2 gap-4">

// ✅ Good - stack on mobile, 2 cols on tablet+
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
```

---

### 2. Tables Without Horizontal Scroll

**19 of 21 tables** lack overflow handling, causing horizontal scroll on mobile.

**Tables Missing `overflow-x-auto`:**

| File | Line |
|------|------|
| `app/(app)/balance-report/page.tsx` | 70 |
| `app/(app)/budgetallocation/allocation-client.tsx` | 1425 |
| `app/(app)/envelope-planning/planner-client.tsx` | 681 |
| `app/(app)/envelope-summary/zero-budget-manager.tsx` | 388 |
| `app/(app)/settings/archived-envelopes/archived-envelopes-client.tsx` | 128 |
| `components/allocation/category-groups.tsx` | 209 |
| `components/allocation/income-allocation-tab.tsx` | 154 |
| `components/allocation/priority-group.tsx` | 113 |
| `components/allocation/snapshot-view.tsx` | 316 |
| `components/chores/weekly-chore-grid.tsx` | 104 |
| `components/csv-import/column-mapping-step.tsx` | 145 |
| `components/csv-import/preview-step.tsx` | 265 |
| `components/envelope-planning/multi-income-planner.tsx` | 357 |
| `components/layout/accounts/account-manager-client.tsx` | 142 |
| `components/my-budget-way/status-mode.tsx` | 92 |
| `components/onboarding/steps/envelope-allocation-step.tsx` | 260 |
| `components/onboarding/steps/envelope-creation-step.tsx` | 546 |
| `components/onboarding/steps/opening-balance-step.tsx` | 241 |
| `components/shared/unified-envelope-table.tsx` | 413 |

**Fix Pattern:**
```tsx
// ❌ Bad - table overflows viewport
<table className="w-full">

// ✅ Good - horizontal scroll on mobile
<div className="overflow-x-auto">
  <table className="w-full min-w-[600px]">
```

**Priority Fix - Allocation Table:**

The main allocation table at `app/(app)/budgetallocation/allocation-client.tsx:1425` has `min-w-[900px]` but the parent lacks `overflow-x-auto`. This is the most critical table to fix.

---

### 3. Large Text Without Responsive Sizing

**108 instances** of text-3xl through text-6xl without responsive variants.

**Top Offenders:**

| File | Lines | Issue |
|------|-------|-------|
| `app/(app)/balance-report/page.tsx` | 31, 43, 51, 59 | Multiple `text-3xl` |
| `app/(app)/debt-management/debt-client.tsx` | 93 | `text-3xl` heading |
| `app/(app)/envelope-balances/envelope-balances-client.tsx` | 221 | `text-3xl` heading |
| `app/(app)/envelope-planning/planner-client.tsx` | 501 | `text-3xl` heading |
| `app/(app)/goals/goals-client.tsx` | 86 | `text-3xl` heading |
| `app/(app)/goals/[id]/goal-detail-client.tsx` | 84, 86, 174 | `text-5xl`, `text-3xl`, `text-4xl` |
| `app/(app)/income-allocation/page.tsx` | 70 | `text-3xl` heading |
| `app/(app)/kids/chores/chores-client.tsx` | 240 | `text-6xl` emoji |
| `app/(app)/kids/invoices/invoices-client.tsx` | 126 | `text-4xl` |

**Fix Pattern:**
```tsx
// ❌ Bad - same size on all screens
<h1 className="text-3xl font-bold">

// ✅ Good - responsive sizing
<h1 className="text-xl md:text-2xl lg:text-3xl font-bold">
```

---

## 🟡 Warning Issues (Should Fix Soon)

### 4. Excessive Padding Without Mobile Override

**85 instances** of p-8, p-10, p-12 etc. without responsive variants.

**Top Offenders:**

| File | Line | Padding |
|------|------|---------|
| `app/(app)/balance-report/page.tsx` | 29 | `px-10 py-12` |
| `app/(app)/coming-soon/page.tsx` | 20 | `px-10 py-12` |
| `app/(app)/getting-started/page.tsx` | 34 | `px-10 py-12` |
| `app/(app)/debt-management/debt-client.tsx` | 83, 160 | `py-8`, `p-12` |
| `app/(app)/envelope-summary/zero-budget-manager.tsx` | 696 | `p-10` |
| `app/(app)/goals/goals-client.tsx` | 76, 214 | `py-8`, `p-12` |
| `app/(app)/income-allocation/page.tsx` | 83 | `p-12` |
| `app/(app)/kids/chores/chores-client.tsx` | 239, 409 | `py-12` |
| `app/(app)/onboarding/onboarding-client.tsx` | 336 | `py-12` |

**Fix Pattern:**
```tsx
// ❌ Bad - too much padding on mobile
<div className="p-12">

// ✅ Good - responsive padding
<div className="p-4 md:p-8 lg:p-12">
```

---

### 5. Fixed Pixel Widths

**63 instances** of fixed widths (`w-[...]`) that may not work on small screens.

**Critical Fixed Widths in Allocation Table:**

| File | Width | Column |
|------|-------|--------|
| `allocation-client.tsx` | `w-[24px]` | Drag handle |
| `allocation-client.tsx` | `w-[50px]` | Priority |
| `allocation-client.tsx` | `w-[160px]` | Envelope name |
| `allocation-client.tsx` | `w-[100px]` | Category |
| `allocation-client.tsx` | `w-[75px]` | Type |
| `allocation-client.tsx` | `w-[80px]` | Target |
| `allocation-client.tsx` | `w-[50px]` | Frequency |
| `allocation-client.tsx` | `w-[75px]` | Due date |
| `allocation-client.tsx` | `w-[70px]` | Funded |
| `allocation-client.tsx` | `w-[65px]` | Annual |
| `allocation-client.tsx` | `w-[90px]` | Progress |
| `allocation-client.tsx` | `w-[60px]` | Due In |

**Note:** Fixed widths in tables are often intentional for alignment. The issue is the table itself needs `overflow-x-auto` wrapper.

---

### 6. Dialogs Without Max Height

**187 of 200 DialogContent** components lack max-height constraints.

**Sample Issues:**

| File | Line |
|------|------|
| `components/allocation/archive-envelope-dialog.tsx` | 63 |
| `components/allocation/category-groups.tsx` | 309 |
| `components/allocation/change-category-dialog.tsx` | 105 |
| `components/chores/assign-chore-dialog.tsx` | Multiple |
| `components/credit-cards/*` | Multiple dialogs |
| `components/envelopes/envelope-resolution-dialog.tsx` | Multiple |

**Fix Pattern:**
```tsx
// ❌ Bad - dialog may overflow viewport
<DialogContent className="sm:max-w-md">

// ✅ Good - constrained height with scroll
<DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
```

---

### 7. Small Touch Targets

**81 instances** of `size="sm"` or `size="xs"` buttons.

While not all small buttons are problematic (e.g., in dense tables), ensure:
- Minimum 44x44px touch target on mobile
- Adequate spacing between buttons

**Files with many small buttons:**
- `app/(app)/budgetallocation/allocation-client.tsx` - 2 instances
- `app/(app)/envelope-summary/zero-budget-manager.tsx` - 10+ instances
- `app/(app)/reconcile/reconcile-workbench.tsx` - Multiple instances

---

## Page-by-Page Analysis

### Dashboard (`components/dashboard-v2/dashboard-v2-client.tsx`)

**Status:** ✅ Mostly Good

**Positive Findings:**
- Uses responsive padding: `px-4 py-6 md:px-6 md:py-8`
- Uses responsive grid: `grid grid-cols-1 md:grid-cols-2`
- Has mobile-first approach

**Minor Issues:**
- `p-8` in empty state card (line ~CardContent)

---

### Allocation Page (`app/(app)/budgetallocation/allocation-client.tsx`)

**Status:** 🔴 Critical Issues

**Issues Found:**
1. **Table overflow** - Main envelope table has `min-w-[900px]` but parent lacks `overflow-x-auto`
2. **Fixed column widths** - 18+ fixed pixel widths for table columns
3. **No mobile table alternative** - Consider card view for mobile

**Recommendations:**
- [ ] Wrap table in `<div className="overflow-x-auto">`
- [ ] Consider collapsible rows or card view for mobile
- [ ] Reduce column count on mobile (hide less critical columns)

---

### Envelope Summary (`components/layout/envelopes/envelope-summary-client.tsx`)

**Status:** ✅ Good

**Positive Findings:**
- Mobile bottom navigation: `md:hidden` fixed nav bar
- Responsive gaps: `gap-3` / `md:gap-4`
- Hidden desktop elements on mobile: `hidden md:block`
- Mobile-specific layout: `md:hidden` for simplified view

**This component is a good example of mobile-first design.**

---

### Settings Page (`components/layout/settings/settings-client.tsx`)

**Status:** ✅ Good

**Positive Findings:**
- Generally well-structured
- Uses responsive patterns

---

### Onboarding (`components/onboarding/onboarding-container.tsx`)

**Status:** ✅ Generally Good

**Positive Findings:**
- Responsive container widths
- Mobile-friendly step navigation

**Minor Issues:**
- `py-12` in onboarding-client.tsx could be reduced on mobile

---

### Coaching Widget (`components/coaching/coaching-widget.tsx`)

**Status:** ✅ Good

**Positive Findings:**
- Uses `grid md:grid-cols-[1fr_1px_1fr]` - stacks on mobile
- Compact padding: `px-4 py-3`
- Collapsible accordion pattern

---

## Component Type Analysis

### Sidebar/Navigation

**Status:** ✅ Good

The sidebar properly hides on mobile with `lg:hidden` / `hidden lg:block` patterns.
Mobile navigation implemented in envelope-summary-client.tsx with fixed bottom nav.

### Tables

**Status:** 🔴 Critical

Only 2 of 21 tables have proper overflow handling. This is the highest priority fix.

### Dialogs

**Status:** 🟡 Warning

Only 13 of 200 dialog components have max-height constraints. Many dialogs will overflow on mobile.

---

## Priority Fixes

### Priority 1 - Critical (Fix Today)

#### 1.1 Allocation Table Overflow

**File:** `app/(app)/budgetallocation/allocation-client.tsx`

Find the table wrapper around line 1425 and add overflow:

```tsx
// Find this:
<table className="w-full table-fixed min-w-[900px]">

// Wrap with:
<div className="overflow-x-auto -mx-4 px-4">
  <table className="w-full table-fixed min-w-[900px]">
    ...
  </table>
</div>
```

#### 1.2 Category Groups Table Overflow

**File:** `components/allocation/category-groups.tsx` (line 209)

```tsx
<div className="overflow-x-auto">
  <table className="w-full table-fixed min-w-[900px]">
```

#### 1.3 Onboarding Tables Overflow

**Files:**
- `components/onboarding/steps/envelope-allocation-step.tsx` (line 260)
- `components/onboarding/steps/envelope-creation-step.tsx` (line 546)
- `components/onboarding/steps/opening-balance-step.tsx` (line 241)

---

### Priority 2 - Important (Fix This Week)

#### 2.1 Grid Breakpoints

Add `grid-cols-1 md:` prefix to all 2+ column grids:

**Files to update:**
- `components/chores/assign-chore-dialog.tsx`
- `components/chores/create-template-dialog.tsx`
- `components/credit-cards/credit-card-dashboard-card.tsx`
- `components/credit-cards/credit-cards-summary.tsx`
- `components/credit-cards/interest-tracker-card.tsx`
- `components/credit-cards/multi-card-optimizer.tsx`
- `components/bank/bank-connection-manager.tsx`
- `components/bank/bank-connection-status-widget.tsx`
- `components/allocation/snapshot-view.tsx`

#### 2.2 Responsive Text Sizing

Add responsive variants to large text:

```tsx
// Change these patterns:
text-3xl → text-xl md:text-2xl lg:text-3xl
text-4xl → text-2xl md:text-3xl lg:text-4xl
text-5xl → text-3xl md:text-4xl lg:text-5xl
text-6xl → text-4xl md:text-5xl lg:text-6xl
```

#### 2.3 Dialog Max Heights

Add to all DialogContent components:

```tsx
<DialogContent className="... max-h-[85vh] overflow-y-auto">
```

---

### Priority 3 - Nice to Have (Future Sprint)

1. **Mobile Table Alternative**
   - Create card-based view for allocation table on mobile
   - Toggle between table/card view based on viewport

2. **Reduce Padding on Mobile**
   - Change `p-12` → `p-4 md:p-8 lg:p-12`
   - Change `py-12` → `py-6 md:py-8 lg:py-12`

3. **Touch Target Improvements**
   - Ensure 44x44px minimum for all interactive elements
   - Add padding to small buttons on mobile

---

## Responsive Design Patterns

Use these patterns consistently across the codebase:

### Grid Stacking
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
```

### Responsive Text
```tsx
<h1 className="text-xl md:text-2xl lg:text-3xl">
<p className="text-sm md:text-base">
```

### Responsive Spacing
```tsx
<div className="p-4 md:p-6 lg:p-8 gap-3 md:gap-4 lg:gap-6">
```

### Table Overflow
```tsx
<div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
  <table className="min-w-[600px]">
```

### Dialog Mobile
```tsx
<DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
```

### Hide/Show by Viewport
```tsx
<div className="hidden md:block">Desktop only</div>
<div className="md:hidden">Mobile only</div>
```

---

## Testing Checklist

### Viewports to Test
- [ ] iPhone SE (375px) - Smallest modern phone
- [ ] iPhone 14 Pro (393px) - Common phone size
- [ ] iPad Mini (768px) - Small tablet (md breakpoint)
- [ ] iPad Pro (1024px) - Large tablet (lg breakpoint)

### Critical User Flows
- [ ] Complete onboarding on mobile
- [ ] View and scroll allocation table
- [ ] Create new envelope
- [ ] Transfer funds between envelopes
- [ ] View dashboard widgets
- [ ] Access settings

### Interaction Tests
- [ ] No horizontal scroll on any page (except intentional table scroll)
- [ ] All text readable (14px minimum body text)
- [ ] All buttons tappable (44x44px minimum)
- [ ] All forms usable with one hand
- [ ] All dialogs fit on screen
- [ ] Navigation accessible on mobile

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| Total files scanned | 100+ |
| Grid issues | 62 |
| Text sizing issues | 108 |
| Padding issues | 85 |
| Table overflow issues | 19 |
| Dialog height issues | 187 |
| Touch target warnings | 81 |
| Fixed width instances | 63 |
| **Total issues** | **605** |

---

## Next Steps

1. **Immediate** - Fix allocation table overflow (Priority 1.1)
2. **This week** - Add overflow to all 19 tables
3. **This week** - Add grid breakpoints to critical components
4. **Next sprint** - Dialog max-heights
5. **Next sprint** - Text sizing and padding
6. **Future** - Mobile-specific table alternatives

---

**End of Report**

*Generated by Claude Code Mobile Audit*
