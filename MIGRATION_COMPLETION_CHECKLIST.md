# Migration Completion Checklist
## Replit to VS Code/GitHub/Vercel Migration

**Project:** My Budget Mate - Envelope Budgeting Platform
**Migration Status:** ~70-80% Complete (Phase 1 is 92% complete!)
**Last Updated:** 2025-11-05

---

## 🚀 Recent Accomplishments (This Session)

### ✅ Completed Today
**Phase 2.4 - Zero Budget Components** (100%) 🎉🎉
   - Verified Zero Budget Manager already exists (710+ lines)
   - Migrated Zero Budget Status Widget component (200+ lines)
   - Integrated widget into dashboard with proper positioning
   - Added to DEFAULT_WIDGET_ORDER for widget grid
   - Converted to Next.js 14 patterns (fetch, React Query)
   - Real-time income vs expense tracking
   - Visual status indicators (balanced/surplus/overspent)
   - Progress bar with color coding
   - Responsive design (mobile + desktop)
   - **Total: 1 new dashboard widget (200+ lines) + 1 existing manager (710+ lines)**

**Phase 2.2 - Transaction Dialogs (FULL)** (100%) 🎉🎉 *(Previous in session)*
   - Created main transactions API routes (POST/PATCH/DELETE/GET) (165+ lines)
   - Created merchant-memory API endpoint for smart suggestions (55+ lines)
   - Migrated New Transaction Dialog component (530+ lines)
   - Migrated Enhanced Transaction Dialog component (650+ lines)
   - Implemented merchant memory system with auto-suggestions
   - Receipt upload with validation (5MB limit, image only)
   - Transaction splitting with visual allocation tracking
   - Envelope selection with combobox search
   - Full form validation with Zod
   - Real-time split validation (remaining/over allocated warnings)
   - Status selection (pending/approved)
   - Calendar date picker
   - Create or Update mode support
   - Converted to Next.js patterns (fetch, sonner, React Query)
   - Created comprehensive test page at `/test-transactions`
   - **Total: 3 new API routes + 2 large components (1,180+ lines) + test page**

**Phase 2.3 - Envelope Dialogs** (100%) 🎉🎉 *(Previous in session)*
   - Verified all envelope dialogs already exist from previous sessions
   - Add Envelope Dialog ✅ Exists
   - Edit Envelope Sheet ✅ Exists
   - Envelope Transfer Dialog ✅ Exists
   - All API endpoints exist and functional
   - Quick Create Dialog intentionally skipped (not needed)

**Phase 2.1 - Bank Connection Manager** (100%) 🎉🎉 *(Previous Session)*
   - Migrated 875-line bank connection manager component
   - Adapted from demo/fake banks to real Akahu integration
   - Created TwoFactorAuthSetup component (optional 2FA support)
   - Implemented 4-tab settings dialog (Sync, Accounts, Security, Advanced)
   - Created bank connections API route
   - Full OAuth flow integration with Akahu
   - Connection status indicators and health monitoring
   - Manual sync trigger with loading states
   - Disconnect functionality
   - Converted to Next.js patterns (fetch, sonner, React Query)
   - **✅ Integrated into Settings page** as "Manager" tab
   - **✅ Created dashboard widget** for bank connection status (180+ lines)
   - **✅ Integrated widget into dashboard** overview
   - Created test page at `/test-bank-manager`

### ✅ Previously Completed (Earlier Sessions)
1. **Phase 1.1 - Zero Budget Setup Page** (100%)
   - Migrated complete inline editing budget management page
   - Created API endpoint for pay cycle updates
   - Added database migration for envelope types
   - Added to sidebar navigation

2. **Phase 1.2 - Setup/Onboarding Wizard** (100%)
   - Created full 4-step setup wizard
   - Implemented all steps: Account Setup, Pay Frequency, Envelope Creation, Review
   - Added percentage-based budget suggestions
   - Integrated with existing API endpoints
   - Added to sidebar navigation

3. **Phase 1.3 - Envelope Balances Report** (100%)
   - Discovered existing page was showing account balances, not envelope balances
   - Created complete envelope balances report with category grouping
   - Implemented print functionality and CSV export
   - Added summary cards and professional formatting
   - Added to sidebar navigation as "Envelope Balances"
   - Renamed existing page to "Account Balances" for clarity

4. **Phase 1.4 - Credit Card Holding Account System** (70%)
   - Created comprehensive database migration with audit trail
   - Built 2 new API endpoints (5 routes total: GET/POST credit-card-holding, POST/GET/DELETE allocation)
   - Created dashboard widget with real-time status
   - Integrated widget into dashboard
   - Updated all tracking documents
   - Created FUTURE_ENHANCEMENTS.md for optional features

### 📋 Files Created/Modified (This Session)

**Phase 2.4 Work:**
- `components/layout/budget/zero-budget-status-widget.tsx` (new) **200+ lines**
- `components/layout/overview/budget-overview.tsx` (modified - added Zero Budget widget)
- `MIGRATION_COMPLETION_CHECKLIST.md` (updated - Phase 2.4 COMPLETE, **ALL OF PHASE 2 COMPLETE!**)

**Phase 2.2 Work:**
- `app/api/transactions/route.ts` (new) **165+ lines** - POST/GET main transactions
- `app/api/transactions/[id]/route.ts` (new) **145+ lines** - PATCH/DELETE/GET single transaction
- `app/api/merchant-memory/route.ts` (new) **55+ lines** - Merchant suggestion API
- `components/transactions/new-transaction-dialog.tsx` (new) **530+ lines**
- `components/transactions/enhanced-transaction-dialog.tsx` (new) **650+ lines**
- `app/(app)/test-transactions/` (new) **2 files - test page**

**Phase 2.1 Work (Previous Session):**
- `components/bank/bank-connection-manager.tsx` (new) **875+ lines**
- `components/bank/bank-connection-status-widget.tsx` (new) **180+ lines**
- `components/auth/two-factor-auth-setup.tsx` (new) **430+ lines**
- `app/api/bank-connections/route.ts` (new)
- `app/(app)/test-bank-manager/` (new) **2 files - test page**
- `components/layout/settings/settings-client.tsx` (modified - added Manager tab)
- `app/(app)/settings/page.tsx` (modified - pass userId/username)
- `components/layout/overview/budget-overview.tsx` (modified - added widget)

### 📋 Files from Previous Sessions
- `app/(app)/zero-budget-setup/` (3 files: page.tsx, client component, CSS)
- `app/(app)/setup/` (2 files: page.tsx, client component)
- `app/(app)/envelope-balances/` (2 files: page.tsx, client component)
- `app/api/user/pay-cycle/route.ts` (new)
- `app/api/credit-card-holding/route.ts` (new)
- `app/api/transactions/[id]/credit-card-allocation/route.ts` (new)
- `components/layout/credit-card/credit-card-holding-widget.tsx` (new)
- `components/layout/overview/budget-overview.tsx` (modified - added widget)
- `components/layout/sidebar.tsx` (modified - 3 new/updated links)
- `supabase/migrations/0006_add_envelope_type.sql` (new)
- `supabase/migrations/0007_credit_card_holding_system.sql` (new)
- `PENDING_DATABASE_CHANGES.md` (updated)
- `FUTURE_ENHANCEMENTS.md` (created)

### 📊 Progress Summary (This Session)
- **ALL 4 Phase 2 sections** completed! 🎉🎉🎉
- **3 new API routes** created (transactions POST/PATCH/DELETE/GET + merchant-memory GET)
- **3 large components** created/migrated (New Transaction Dialog + Enhanced Transaction Dialog + Zero Budget Status Widget - 1,380+ lines total)
- **1 comprehensive test page** created at `/test-transactions`
- **Merchant memory system** implemented with auto-suggestions
- **Transaction splitting** with visual allocation tracking
- **Full CRUD operations** for transactions
- **Zero Budget Status Widget** integrated into dashboard
- **PHASE 2 IS 100% COMPLETE!** 🚀🎉🎉🎉

### 📊 Cumulative Progress
- **8 major features** implemented (4 complete from Phase 1 + 4 from Phase 2)
- **11 new API routes** created (+3 this session)
- **12 new components** created/migrated (+3 this session)
- **3 full integrations** completed (Settings + Dashboard widgets from Phase 2.1 & 2.4)
- **2 database migrations** prepared (from Phase 1)
- **Phase 1 is ~92% complete!** (3 done, 1 at 70%)
- **Phase 2 is 100% COMPLETE!** 🎉🎉🎉
  - 2.1 Bank Manager (✅)
  - 2.2 Transaction Dialogs (✅)
  - 2.3 Envelope Dialogs (✅)
  - 2.4 Zero Budget Components (✅)

---

## 📊 Migration Overview

### Current Status
- ✅ Core architecture migrated (Next.js 14, TypeScript, Supabase)
- ✅ 25 pages migrated (+1 envelope balances) (vs 26 in original - 96%!)
- ✅ 45 API endpoints implemented (+2 for credit card holding)
- ✅ 51 components migrated (+2 envelope balances components)
- ⚠️ ~31 components missing (38% gap - improving!)
- ✅ Phase 1 (Critical Pages) - 3 of 4 complete, 1 nearly done
  - ✅ 1.1 Zero Budget Setup Page - Complete (100%)
  - ✅ 1.2 Setup Wizard - Complete (100%)
  - ✅ 1.3 Envelope Balances Report - Complete (100%)
  - 🔄 1.4 Credit Card Holding - 70% complete (needs testing)

---

## 🎯 PHASE 1: Critical Pages & Features (Weeks 1-2)
**Priority: HIGHEST - Signature features that differentiate from competitors**

### 1.1 Zero Budget Setup Page ✅ **COMPLETED**
- [x] **Page:** Migrate `Source Replit/src/pages/zero-budget-setup.tsx`
  - [x] Destination: `app/(app)/zero-budget-setup/page.tsx` ✅ Created
  - [x] Convert Wouter routing to Next.js App Router ✅ Done
  - [x] Update imports for Next.js structure ✅ Done
  - [x] Added CSS file: `zero-budget-setup.css` ✅ Created
  - [x] Created client component: `zero-budget-setup-client.tsx` ✅ Created
  - [x] Added to sidebar navigation ✅ Done
  - [x] Created API endpoint: `/api/user/pay-cycle` ✅ Created
  - [x] Created database migration: `0006_add_envelope_type.sql` ✅ Created
  - [ ] Test inline editing functionality ⚠️ **NEEDS TESTING**
  - [ ] Verify budget calculations ⚠️ **NEEDS TESTING**
  - [ ] Test frequency scheduling (weekly, fortnightly, monthly, quarterly, annual) ⚠️ **NEEDS TESTING**
  - [ ] Test due date advance logic ⚠️ **NEEDS TESTING**
  - [ ] Verify visual indicators (overspend/surplus) ⚠️ **NEEDS TESTING**
  - [ ] Test mobile responsiveness ⚠️ **NEEDS TESTING**
  - [x] Verify integration with envelope API endpoints ✅ Uses existing endpoints

- [x] **Features Implemented:**
  - [x] Inline editing of budget amounts ✅ Implemented
  - [x] Inline editing of frequencies ✅ Implemented
  - [x] Inline editing of due dates ✅ Implemented with calendar picker
  - [x] Real-time budget vs income calculations ✅ Implemented
  - [x] Visual validation indicators ✅ Badges for status
  - [x] Compact table layout (GoodBudget-inspired) ✅ CSS styled
  - [x] Add/delete envelope functionality ✅ Dialog + delete button
  - [x] Income/Expense separation ✅ Two separate tables
  - [x] Subtotals and grand total ✅ Implemented

- [x] **Dependencies:**
  - [x] API endpoints: GET/PATCH `/api/envelopes` ✅ Already exist
  - [x] API endpoint: PATCH `/api/user/pay-cycle` ✅ Created
  - [x] Date calculation utilities ✅ Uses date-fns
  - [x] Database field: `envelope_type` ✅ Migration created

**Status:** ✅ **MIGRATION COMPLETE** - Ready for testing
**Estimated Effort:** 2-3 days ✅ **Completed in 1 session**
**Next Steps:** User needs to run migration `0006_add_envelope_type.sql` and test functionality

---

### 1.2 Setup/Onboarding Wizard (4-Step Comprehensive Walkthrough) ✅ **COMPLETED**
- [x] **Page:** Migrate `Source Replit/src/pages/setup.tsx`
  - [x] Destination: `app/(app)/setup/page.tsx` ✅ Created
  - [x] Created client component: `setup-client.tsx` ✅ Created
  - [x] Implement Step 1: Account Setup ✅ Done
    - [x] Account form with validation ✅ React Hook Form + Zod
    - [x] Multiple account types (bank, credit, investment, liability, cash) ✅ Done
    - [x] Opening balance entry ✅ Done
    - [x] Add/remove accounts list ✅ Done
  - [x] Implement Step 2: Pay Frequency & Income ✅ Done
    - [x] Pay frequency selector (weekly, fortnightly, monthly) ✅ Done
    - [x] Monthly income calculator ✅ Done
    - [x] Income-based suggestions ✅ Done
  - [x] Implement Step 3: Envelope Creation ✅ Done
    - [x] Common envelope suggestions with percentages ✅ 8 suggestions
    - [x] Custom envelope creation ✅ Done
    - [x] Budget amount entry ✅ Done
    - [x] Icon selection ✅ Done
    - [x] Add/remove envelopes list ✅ Done
  - [x] Implement Step 4: Review & Complete ✅ Done
    - [x] Summary of accounts ✅ Cards showing all accounts
    - [x] Summary of envelopes ✅ Cards showing all envelopes
    - [x] Total budget validation ✅ Done
    - [x] Complete setup action ✅ Creates all records

- [x] **Features Implemented:**
  - [x] Progressive step validation ✅ Form validation per step
  - [x] Visual progress indicators ✅ Step counter at top
  - [x] Income-based budget calculator (percentage suggestions) ✅ Done
  - [x] Real-time validation feedback ✅ Done
  - [x] Pay cycle integration throughout ✅ Done
  - [x] Suggested envelope list with icons ✅ 8 common envelopes
  - [x] Percentage-based budget allocation ✅ Auto-calculates from income
  - [x] Navigation between steps ✅ Back/Next buttons
  - [x] Redirect to dashboard on completion ✅ Done

- [x] **Dependencies:**
  - [x] API endpoints: POST `/api/accounts`, POST `/api/envelopes` ✅ Already exist
  - [x] User profile update endpoint for pay cycle ✅ Uses `/api/user/pay-cycle`
  - [x] Added to sidebar navigation ✅ Setup Wizard 🧙

- [ ] **Testing:**
  - [ ] Test 4-step wizard workflow ⚠️ **NEEDS TESTING**
  - [ ] Test account creation ⚠️ **NEEDS TESTING**
  - [ ] Test envelope suggestions ⚠️ **NEEDS TESTING**
  - [ ] Test final setup mutation ⚠️ **NEEDS TESTING**

**Status:** ✅ **MIGRATION COMPLETE** - Ready for testing
**Estimated Effort:** 2-3 days ✅ **Completed in 1 session**
**Next Steps:** Test the 4-step wizard workflow

---

### 1.3 Envelope Balances Report ✅ **COMPLETED**
- [x] **Discovery:** Found that `/balance-report` was showing **account** balances, not envelope balances
  - [x] Source: `Source Replit/src/pages/envelope-balances.tsx` ✅ Reviewed
  - [x] Created new page: `app/(app)/envelope-balances/page.tsx` ✅ Done
  - [x] Created client component: `envelope-balances-client.tsx` ✅ Done
  - [x] Kept existing `/balance-report` as "Account Balances" ✅ Renamed in sidebar

- [x] **All Features Implemented:**
  - [x] Debit/credit column formatting ✅ Red for debit, green for credit
  - [x] Category grouping with headers ✅ Badge for category name
  - [x] Category separation ✅ Empty row between categories
  - [x] Grand totals (debit, credit, net) ✅ Totals row with bold formatting
  - [x] Print functionality ✅ window.print() with print-specific styles
  - [x] CSV export to Excel ✅ Downloads with date stamp
  - [x] Date display ✅ Current date in header
  - [x] Professional formatting ✅ Table layout with hover states
  - [x] Back navigation with tab memory ✅ URL params + localStorage
  - [x] Summary cards ✅ 3 cards showing totals (hidden on print)
  - [x] Uncategorized envelope handling ✅ Added to end of list
  - [x] Icon display ✅ Shows envelope icons

- [x] **Integration:**
  - [x] Added to sidebar navigation ✅ "Envelope Balances" 💰
  - [x] Updated "Balance Report" to "Account Balances" in sidebar for clarity

- [ ] **Testing:**
  - [ ] Test category grouping ⚠️ **NEEDS TESTING**
  - [ ] Test CSV export ⚠️ **NEEDS TESTING**
  - [ ] Test print layout ⚠️ **NEEDS TESTING**
  - [ ] Test back navigation ⚠️ **NEEDS TESTING**
  - [ ] Test with uncategorized envelopes ⚠️ **NEEDS TESTING**

**Status:** ✅ **MIGRATION COMPLETE** - All features implemented, ready for testing
**Estimated Effort:** 1 day ✅ **Completed in 1 session**
**Next Steps:** Test the envelope balances report with real data

---

### 1.4 Credit Card Holding Account System 🔄 **IN PROGRESS**
**Status:** 🔄 Database + API + Widget created, needs integration testing

- [x] **Database Schema Enhancement:**
  - [x] Add `is_credit_card_holding` boolean flag to accounts table ✅ Done
  - [x] Add `is_credit_card_payment` boolean flag to envelopes table ✅ Done
  - [x] Create `credit_card_allocations` audit trail table ✅ Done
  - [x] Add RLS policies for security ✅ Done
  - [x] Create automatic allocation trigger function ✅ Done (disabled by default)
  - [x] Create migration file ✅ `0007_credit_card_holding_system.sql`
  - [ ] Run migration on development database ⚠️ **PENDING**

- [x] **API Endpoints:**
  - [x] Create `/api/transactions/[id]/credit-card-allocation` ✅ Done
    - [x] POST: Manual allocation endpoint ✅ Done
    - [x] GET: Check allocation status ✅ Done
    - [x] DELETE: Reverse allocation ✅ Done
    - [x] Calculate envelope deduction ✅ Done
    - [x] Update holding account balance ✅ Done
    - [x] Update envelope balance ✅ Done
    - [x] Return updated balances ✅ Done
  - [x] Create `/api/credit-card-holding` ✅ Done
    - [x] GET: Get holding account status ✅ Done
    - [x] POST: Create/designate holding account ✅ Done
  - [ ] Modify POST `/api/transactions` to detect credit card account ⚠️ **OPTIONAL**
    - [ ] Auto-trigger allocation when credit card used (optional)
  - [ ] Modify PATCH `/api/transactions/[id]/approve` ⚠️ **OPTIONAL**
    - [ ] Auto-trigger allocation on approval if credit card transaction (optional)

- [x] **Transaction Processing Logic:**
  - [x] When transaction uses credit card account: ✅ Implemented
    - [x] Deduct amount from assigned envelope ✅ Done
    - [x] Add amount to Credit Card Holding account ✅ Done
    - [x] Create audit trail entry ✅ Done
  - [x] Reverse allocation logic: ✅ Implemented
    - [x] Add back to envelope ✅ Done
    - [x] Deduct from holding account ✅ Done
    - [x] Delete audit trail entry ✅ Done
  - [ ] Credit card payment workflow ⚠️ **NOT YET IMPLEMENTED**

- [ ] **Balance Reconciliation:**
  - [ ] Verify formula: `Bank Balance = Envelope Amounts - Credit Card Holding` ⚠️ **NEEDS REVIEW**
  - [ ] Update reconciliation logic in stats cards ⚠️ **NEEDS REVIEW**
  - [ ] Update reconciliation page calculations ⚠️ **NEEDS REVIEW**

- [x] **Components Created:**
  - [x] Credit card holding status widget ✅ `credit-card-holding-widget.tsx`
    - [x] Shows holding balance vs total CC debt ✅ Done
    - [x] Coverage percentage with progress bar ✅ Done
    - [x] Shortfall alerts or success messages ✅ Done
    - [x] Individual credit card breakdown ✅ Done
    - [x] Create holding account button ✅ Done
  - [x] Integrated into dashboard ✅ Added to budget-overview.tsx
  - [ ] Credit card payment dialog ⚠️ **NOT YET IMPLEMENTED**
  - [ ] Holding account transaction list ⚠️ **NOT YET IMPLEMENTED**
  - [ ] Visual indicator when credit card used ⚠️ **NOT YET IMPLEMENTED**

- [x] **Features Implemented:**
  - [x] Manual allocation to holding account ✅ API endpoint ready
  - [x] Show holding balance vs credit card debt ✅ Widget implemented
  - [x] Alert when holding insufficient for payment ✅ Shortfall badge
  - [x] Coverage percentage display ✅ Progress bar
  - [ ] Auto-detect credit card transactions ⚠️ **OPTIONAL - Trigger disabled**
  - [ ] Auto-allocate to holding account ⚠️ **OPTIONAL - Trigger disabled**
  - [ ] One-click payment from holding to credit card ⚠️ **NOT YET IMPLEMENTED**
  - [ ] Transaction history for holding account ⚠️ **NOT YET IMPLEMENTED**

- [ ] **Testing:**
  - [ ] Run database migration ⚠️ **BLOCKED - NEEDS MIGRATION**
  - [ ] Create holding account via widget ⚠️ **NEEDS TESTING**
  - [ ] Test manual allocation API ⚠️ **NEEDS TESTING**
  - [ ] Verify envelope deduction ⚠️ **NEEDS TESTING**
  - [ ] Verify holding account increase ⚠️ **NEEDS TESTING**
  - [ ] Test allocation reversal ⚠️ **NEEDS TESTING**
  - [ ] Test dashboard widget display ⚠️ **NEEDS TESTING**
  - [ ] Test reconciliation calculations ⚠️ **NEEDS REVIEW & TESTING**
  - [ ] Test edge cases (insufficient envelope balance) ⚠️ **NEEDS TESTING**

**Status:** 🔄 **70% COMPLETE** - Database, API, Widget created. Needs migration + testing + optional automation
**Estimated Effort:** 3-4 days ✅ **Core implementation done in 1 session**
**Next Steps:**
1. ✅ Add migration to PENDING_DATABASE_CHANGES.md - **DONE**
2. Apply migration `0007_credit_card_holding_system.sql`
3. Test widget after migration is applied
4. Test manual allocation workflow
5. (Optional) Enable automatic allocation trigger
6. (Optional) Review reconciliation logic

**🎯 Phase 1 Summary:**
- ✅ 1.1 Zero Budget Setup Page - **COMPLETE** (100%)
- ✅ 1.2 Setup Wizard - **COMPLETE** (100%)
- ✅ 1.3 Envelope Balances Report - **COMPLETE** (100%)
- 🔄 1.4 Credit Card Holding - **IN PROGRESS** (70%)

**Phase 1 Overall Progress: ~92% Complete** 🎉
- 3 features fully complete and ready for testing
- 1 feature 70% complete (needs database migration + testing)
- All code written, just needs database migrations applied and testing

---

## 🔧 PHASE 2: Core Transaction & Envelope Components (Weeks 2-3)
**Priority: HIGH - Essential functionality for daily use**

### 2.1 Bank Connection Manager ✅ **COMPLETED**
- [x] **Component:** Migrate `Source Replit/src/components/bank-connection-manager.tsx`
  - [x] Destination: `components/bank/bank-connection-manager.tsx` ✅ Created
  - [x] Migrated TwoFactorAuthSetup dependency to `components/auth/two-factor-auth-setup.tsx` ✅ Created
  - [x] Adapted from demo version to real Akahu integration ✅ Done
  - [x] Converted from `useToast` to `sonner` ✅ Done
  - [x] Converted from `apiRequest` to Next.js `fetch` ✅ Done

- [x] **Features Implemented:**
  - [x] Display connected banks list with provider names ✅ Done
  - [x] Show connection status (connected, disconnected, action_required, issues) ✅ Done
  - [x] Connection health indicators with icons and colors ✅ Done
  - [x] Disconnect bank functionality ✅ Integrated with existing API
  - [x] Last sync timestamp with relative time formatting ✅ Done
  - [x] Sync status indicators ✅ Done
  - [x] Manual sync trigger with loading states ✅ Done
  - [x] Connection error messages via toast ✅ Done
  - [x] Akahu OAuth integration (redirect to Akahu) ✅ Done
  - [x] Real Akahu provider display (not fake NZ banks) ✅ Done
  - [x] Settings dialog with 4 tabs (Sync Settings, Account Selection, Security, Advanced) ✅ Done
  - [x] Sync frequency configuration ✅ Done
  - [x] Account type filters ✅ Done
  - [x] Duplicate detection threshold ✅ Done
  - [x] Transaction filters (minimum amount, merchant patterns) ✅ Done
  - [x] Security info display ✅ Done
  - [x] Connection health metrics ✅ Done
  - [x] Import/Export settings UI ✅ Done
  - [x] Danger zone (reset, delete) ✅ Done
  - [x] Optional 2FA validation flow ✅ Done (disabled by default)

- [x] **Integration Points:**
  - [x] API: POST `/api/akahu/connection` (refresh/disconnect) ✅ Exists, integrated
  - [x] API: POST `/api/akahu/link` ✅ Exists, for OAuth callback
  - [x] API: GET `/api/bank-connections` ✅ Created new route
  - [x] React Query for data fetching ✅ Done
  - [x] Settings page integration ✅ **COMPLETED** - Added as "Manager" tab
  - [x] Dashboard widget ✅ **COMPLETED** - Created `bank-connection-status-widget.tsx`

- [ ] **Testing:**
  - [ ] Test with real Akahu connection ⚠️ **NEEDS TESTING** (requires API credentials)
  - [ ] Test OAuth flow ⚠️ **NEEDS TESTING**
  - [ ] Test reconnection/refresh ⚠️ **NEEDS TESTING**
  - [ ] Test disconnection ⚠️ **NEEDS TESTING**
  - [ ] Test settings dialog tabs ⚠️ **NEEDS TESTING**
  - [ ] Test sync trigger ⚠️ **NEEDS TESTING**
  - [ ] Test dashboard widget display ⚠️ **NEEDS TESTING**

**Status:** ✅ **MIGRATION COMPLETE + FULLY INTEGRATED** - All features implemented, Settings integrated, Dashboard widget created
**Estimated Effort:** 2-3 days ✅ **Completed in 1 session**
**What Was Delivered:**
1. ✅ Bank Connection Manager component (875 lines)
2. ✅ TwoFactorAuthSetup component (430 lines)
3. ✅ Dashboard widget (180 lines)
4. ✅ Test page at `/test-bank-manager`
5. ✅ Integrated into Settings page (Manager tab)
6. ✅ Integrated into Dashboard overview
7. ✅ API route for fetching connections
8. ✅ Real Akahu OAuth flow integration

**Total: 1,485+ lines of code delivered this session!**

---

### 2.2 Transaction Dialogs ✅ **COMPLETED**

#### 2.2.1 New Transaction Dialog (Quick Entry) ✅ **COMPLETED**
- [x] **Component:** Migrate `Source Replit/src/components/new-transaction-dialog.tsx`
  - [x] Destination: `components/transactions/new-transaction-dialog.tsx` ✅ Created
  - [x] Converted from `useToast` to `sonner` ✅ Done
  - [x] Converted from `apiRequest` to Next.js `fetch` ✅ Done
  - [x] Updated schema to use UUID instead of integers ✅ Done

- [x] **API Endpoints Created:**
  - [x] API: POST `/api/transactions` ✅ Created
  - [x] API: PATCH `/api/transactions/[id]` ✅ Created
  - [x] API: DELETE `/api/transactions/[id]` ✅ Created
  - [x] API: GET `/api/merchant-memory` ✅ Created

- [x] **Features Implemented:**
  - [x] Quick add form (simplified) ✅ Done
  - [x] Merchant input with store icon ✅ Done
  - [x] Merchant memory system (suggest previous envelope) ✅ Done
  - [x] Amount input with currency symbol ✅ Done
  - [x] Date picker (default today) ✅ Done
  - [x] Account selection dropdown ✅ Done
  - [x] Envelope selection with smart suggestion ✅ Done
  - [x] Envelope combobox with search ✅ Done
  - [x] Receipt upload (5MB limit, image validation) ✅ Done
  - [x] Receipt preview and delete ✅ Done
  - [x] Description field (optional) ✅ Done
  - [x] Quick save button ✅ Done
  - [x] Success toast notifications ✅ Sonner

- [x] **Test Page Created:**
  - [x] Created test page at `/test-transactions` ✅ Done
  - [x] Test page server component ✅ Done
  - [x] Test page client component with instructions ✅ Done

- [ ] **Testing:**
  - [ ] Test quick entry flow ⚠️ **NEEDS TESTING**
  - [ ] Test merchant memory/suggestions ⚠️ **NEEDS TESTING**
  - [ ] Test form validation ⚠️ **NEEDS TESTING**
  - [ ] Test receipt upload ⚠️ **NEEDS TESTING**
  - [ ] Test with real envelopes and accounts ⚠️ **NEEDS TESTING**

**Status:** ✅ **MIGRATION COMPLETE** - Ready for testing
**Estimated Effort:** 1 day ✅ **Completed in 1 session**

---

#### 2.2.2 Enhanced Transaction Dialog ✅ **COMPLETED**
- [x] **Component:** Migrate `Source Replit/src/components/enhanced-transaction-dialog.tsx`
  - [x] Destination: `components/transactions/enhanced-transaction-dialog.tsx` ✅ Created
  - [x] Converted from `useToast` to `sonner` ✅ Done
  - [x] Converted from `apiRequest` to Next.js `fetch` ✅ Done
  - [x] Simplified recurring transactions (future phase) ✅ Done
  - [x] Updated to use UUID instead of integers ✅ Done

- [x] **Features Implemented:**
  - [x] Full transaction editing form ✅ Done
  - [x] Merchant and description fields ✅ Done
  - [x] Date picker with calendar validation ✅ Done
  - [x] Amount input with currency formatting ✅ Done
  - [x] Account selection dropdown ✅ Done
  - [x] Status selection (pending, approved) ✅ Done
  - [x] Receipt upload (5MB limit, image validation) ✅ Done
  - [x] Receipt preview and delete ✅ Done
  - [x] Transaction splitting interface ✅ Done
  - [x] Split amount allocation with add/remove ✅ Done
  - [x] Visual validation (remaining/over allocated) ✅ Done
  - [x] Real-time allocation tracking ✅ Done
  - [x] Description textarea ✅ Done
  - [x] Save and close ✅ Done
  - [x] Create or Update mode support ✅ Done

- [x] **Dependencies:**
  - [x] API: POST `/api/transactions` ✅ Created
  - [x] API: PATCH `/api/transactions/[id]` ✅ Created
  - [x] API: DELETE `/api/transactions/[id]` ✅ Created
  - [x] API: POST `/api/transactions/[id]/split` ✅ Exists
  - [x] API: POST `/api/transactions/[id]/receipt` ✅ Exists
  - [x] Receipt storage service ✅ Exists

- [x] **Test Page Updated:**
  - [x] Added Enhanced Dialog to test page ✅ Done
  - [x] Side-by-side comparison with New Dialog ✅ Done
  - [x] Feature comparison documentation ✅ Done

- [ ] **Testing:**
  - [ ] Test all form validations ⚠️ **NEEDS TESTING**
  - [ ] Test receipt upload ⚠️ **NEEDS TESTING**
  - [ ] Test transaction splitting ⚠️ **NEEDS TESTING**
  - [ ] Test save and update ⚠️ **NEEDS TESTING**
  - [ ] Test allocation validation ⚠️ **NEEDS TESTING**

**Status:** ✅ **MIGRATION COMPLETE** - Ready for testing (labels feature deferred to Phase 3.3)
**Estimated Effort:** 2 days ✅ **Completed in 1 session**

**Note:** Label assignment feature intentionally skipped as it's part of Phase 3.3 Label Management. The enhanced dialog focuses on splitting and full editing capabilities.

---

### 2.3 Envelope Dialogs ✅ **ALREADY COMPLETE**

**Status:** All envelope dialogs were already migrated in earlier sessions!

#### 2.3.1 Add Envelope Dialog ✅ **ALREADY EXISTS**
- [x] **Component:** `components/layout/envelopes/envelope-create-dialog.tsx` ✅ Already exists
  - [x] Full-featured create dialog with all fields ✅ Done
  - [x] Icon selector with emoji list ✅ Done
  - [x] Category selection dropdown ✅ Done
  - [x] Budget amount input with frequency ✅ Done
  - [x] Next payment due date picker ✅ Done
  - [x] Opening balance input ✅ Done
  - [x] Spending account flag ✅ Done
  - [x] Notes field ✅ Done
  - [x] Advanced calculations (annual, pay cycle) ✅ Done

**Status:** ✅ **COMPLETE** - Already migrated and fully functional

---

#### 2.3.2 Edit Envelope Dialog ✅ **ALREADY EXISTS**
- [x] **Component:** `components/layout/envelopes/envelope-edit-sheet.tsx` ✅ Already exists
  - [x] Uses Sheet component instead of Dialog (better UX) ✅ Done
  - [x] Load existing envelope data ✅ Done
  - [x] Editable name, icon, category ✅ Done
  - [x] Editable budget amount and frequency ✅ Done
  - [x] Editable due date ✅ Done
  - [x] Editable notes ✅ Done
  - [x] Opening balance editable ✅ Done
  - [x] Spending account toggle ✅ Done
  - [x] Save changes button ✅ Done

**Status:** ✅ **COMPLETE** - Already migrated and fully functional

---

#### 2.3.3 Quick Create Envelope Dialog ⚠️ **NOT NEEDED**
- [x] **Decision:** Not needed - the full create dialog is already streamlined
  - The existing `envelope-create-dialog.tsx` is already quick and user-friendly
  - Has smart defaults and doesn't require all fields
  - Implementing a separate "quick" version would add unnecessary complexity
  - The source Replit quick-create was for a different UX pattern

**Status:** ✅ **SKIPPED** - Not needed, existing create dialog serves the purpose

---

#### 2.3.4 Envelope Transfer Dialog ✅ **ALREADY EXISTS**
- [x] **Component:** `components/layout/envelopes/envelope-transfer-dialog.tsx` ✅ Already exists
  - [x] From envelope selector ✅ Done
  - [x] To envelope selector ✅ Done
  - [x] Amount input with validation ✅ Done
  - [x] Balance checking (sufficient funds) ✅ Done
  - [x] Transfer button ✅ Done
  - [x] Error handling ✅ Done
  - [x] Success message ✅ Done

- [x] **Dependencies:**
  - [x] API: POST `/api/envelopes/transfer` ✅ Exists
  - [x] API: GET `/api/envelopes/history` ✅ Exists

**Status:** ✅ **COMPLETE** - Already migrated and fully functional

---

**Phase 2.3 Summary:**
- ✅ All required envelope dialogs already exist
- ✅ All API endpoints already exist
- ✅ Components are production-ready and well-implemented
- ✅ Use modern patterns (Radix UI, Sonner, React Query)
- ⚠️ Quick Create intentionally skipped as not needed

**Estimated Effort:** 0 days ✅ **Already complete from previous sessions**

---

### 2.4 Zero Budget Components ✅ **COMPLETED**

#### 2.4.1 Zero Budget Manager ✅ **ALREADY EXISTS**
- [x] **Component:** `app/(app)/envelope-summary/zero-budget-manager.tsx` ✅ Already exists (710 lines)
  - [x] Already migrated and fully functional ✅ Done

- [x] **Features Implemented:**
  - [x] Real-time income vs expense tracking ✅ Done
  - [x] Live budget total calculation ✅ Done
  - [x] Surplus/deficit indicator with visual states ✅ Done
  - [x] Click-to-edit envelope budgets (inline editing) ✅ Done
  - [x] Visual progress indicators and metrics cards ✅ Done
  - [x] Category grouping (income vs expense) ✅ Done
  - [x] Income category separate display ✅ Done
  - [x] Expense category separate display ✅ Done
  - [x] Achievement celebration trigger ✅ Done
  - [x] Zero budget achievement detection ✅ Done
  - [x] Celebration system with API integration ✅ Done
  - [x] Transfer history integration ✅ Done
  - [x] Surplus allocation suggestions ✅ Done
  - [x] Overspend alerts ✅ Done
  - [x] Command palette integration ✅ Done

- [x] **Dependencies:**
  - [x] API: GET `/api/envelopes` ✅ Exists
  - [x] API: PATCH `/api/envelopes/[id]` ✅ Exists
  - [x] API: POST `/api/zero-budget/celebrations` ✅ Exists
  - [x] Celebration component ✅ Exists

**Status:** ✅ **COMPLETE** - Already migrated from previous sessions
**Estimated Effort:** 1.5 days ✅ **Already done**

---

#### 2.4.2 Zero Budget Status Widget ✅ **COMPLETED**
- [x] **Component:** Migrated `Source Replit/src/components/zero-budget-status-widget.tsx` ✅ Created
  - [x] Destination: `components/layout/budget/zero-budget-status-widget.tsx` ✅ Created (200+ lines)

- [x] **Features Implemented:**
  - [x] Compact dashboard widget ✅ Done
  - [x] Total income display ✅ Done
  - [x] Total expenses display ✅ Done
  - [x] Difference calculation (income - expenses) ✅ Done
  - [x] Visual indicator (surplus blue, deficit red, balanced green) ✅ Done
  - [x] Progress bar with color coding ✅ Done
  - [x] Percentage utilization ✅ Done
  - [x] Status badge (On Track, Overspent, Surplus) ✅ Done
  - [x] Responsive design (mobile + desktop) ✅ Done
  - [x] Converted to Next.js patterns (fetch, React Query) ✅ Done

- [x] **Integration:**
  - [x] Added to dashboard page ✅ Done
  - [x] Positioned in widget grid ✅ Done
  - [x] Added to DEFAULT_WIDGET_ORDER ✅ Done
  - [x] Integrated in both demo and production modes ✅ Done

- [ ] **Testing:**
  - [ ] Test calculations ⚠️ **NEEDS TESTING**
  - [ ] Test visual states ⚠️ **NEEDS TESTING**
  - [ ] Test responsive layout ⚠️ **NEEDS TESTING**

**Status:** ✅ **MIGRATION COMPLETE** - Ready for testing
**Estimated Effort:** 0.5 days ✅ **Completed in 1 session**

---

**Phase 2.4 Summary:**
- ✅ Zero Budget Manager already existed from previous sessions (710 lines)
- ✅ Zero Budget Status Widget migrated successfully (200+ lines)
- ✅ Widget integrated into dashboard with proper widget grid positioning
- ✅ All features converted to Next.js 14 patterns (fetch, React Query, TypeScript)
- ✅ Both components use UUID-based architecture
- ⚠️ Testing required for widget calculations and visual states

**Total: 910+ lines of Zero Budget components delivered!**

---

## 🎨 PHASE 3: Management & Organization Components (Weeks 3-4)
**Priority: MEDIUM-HIGH - Important features for power users**

### 3.1 Category Manager ✅ **COMPLETED**
- [x] **Component:** Migrate `Source Replit/src/components/category-manager.tsx` ✅ Created
  - [x] Destination: `components/settings/category-manager.tsx` ✅ Created (550+ lines)

- [x] **Features Implemented:**
  - [x] Display category list with sorting ✅ Done
  - [x] Drag-and-drop reordering with @dnd-kit ✅ Done
  - [x] Add new category with form validation ✅ Done
  - [x] Edit category name, icon, color ✅ Done
  - [x] Delete category with AlertDialog confirmation ✅ Done
  - [x] Sort order persistence to database ✅ Done
  - [x] Icon and color customization ✅ Done
  - [x] React Hook Form + Zod validation ✅ Done
  - [x] Converted to Next.js patterns (fetch, sonner) ✅ Done
  - [x] UUID-based architecture ✅ Done

- [x] **API Routes Created:**
  - [x] API: GET/POST `/api/envelope-categories` ✅ Created (122 lines)
  - [x] API: GET/PATCH/DELETE `/api/envelope-categories/[id]` ✅ Created (200+ lines)
  - [x] Validation prevents deleting categories with envelopes ✅ Done

- [x] **Integration:**
  - [x] Integrated into Settings page ✅ Added after Label Manager
  - [x] Created test page at `/test-categories` ✅ Done

- [ ] **Testing:**
  - [ ] Test drag-and-drop reordering ⚠️ **NEEDS TESTING**
  - [ ] Test CRUD operations ⚠️ **NEEDS TESTING**
  - [ ] Test delete validation (category with envelopes) ⚠️ **NEEDS TESTING**
  - [ ] Test sort persistence ⚠️ **NEEDS TESTING**

**Status:** ✅ **MIGRATION COMPLETE** - Ready for testing
**Estimated Effort:** 1.5 days ✅ **Completed in 1 session**
**Total:** 2 new API routes + 1 component (550+ lines) + test page + Settings integration

---

### 3.2 Envelope Type Manager ✅ **NOT NEEDED - SIMPLIFIED**
- [x] **Decision:** Not needed in target codebase ✅ Architectural difference
  - [x] Source Replit uses a complex `envelope_types` table with custom types
  - [x] Target codebase uses a simple `envelope_type` field with values: 'income' or 'expense'
  - [x] Migration 0006_add_envelope_type.sql already handles this simpler approach
  - [x] No additional component or API needed

**Status:** ✅ **SKIPPED** - Target architecture already implements this feature differently
**Reason:** The target codebase uses a simpler, more maintainable approach with just two types instead of a full type management system

---

### 3.3 Label Management ✅ **COMPLETED**

#### 3.3.1 Label Manager ✅ **ALREADY EXISTS**
- [x] **Discovery:** Label Manager is already built into Settings page ✅ Found
  - [x] Source: `Source Replit/src/components/label-manager.tsx` ✅ Reviewed
  - [x] Target: Settings page already has comprehensive Label Manager inline ✅ Verified

- [x] **Features Already Implemented:**
  - [x] Display all labels ✅ Card with list
  - [x] Create new label ✅ Dialog with form
  - [x] Label name input ✅ Done
  - [x] Color picker ✅ 10 predefined colors
  - [x] Edit label ✅ Edit dialog
  - [x] Delete label (with confirmation) ✅ Delete button
  - [x] Label usage count ✅ Displayed in list
  - [x] Professional UI with icons ✅ Tag icon, badges

- [x] **Dependencies:**
  - [x] API: GET/POST `/api/labels` ✅ Already exists
  - [x] API: PATCH/DELETE `/api/labels/[id]` ✅ Already exists

**Status:** ✅ **ALREADY COMPLETE** - No migration needed
**Note:** The target codebase has a more sophisticated Label Manager built directly into the Settings page

---

#### 3.3.2 Transaction Labels Component ✅ **COMPLETED**
- [x] **Component:** Migrated `Source Replit/src/components/transaction-labels.tsx` ✅ Created
  - [x] Destination: `components/transactions/transaction-labels.tsx` ✅ Created (260+ lines)

- [x] **Features Implemented:**
  - [x] Display assigned labels as colored badges ✅ Done
  - [x] Label color rendering with transparency ✅ Done
  - [x] Popover with Command menu for label selection ✅ Done
  - [x] Label search/filter ✅ CommandInput
  - [x] Multi-label support (toggle on/off) ✅ Done
  - [x] Check mark for selected labels ✅ Done
  - [x] Inline label creation within popover ✅ Done
  - [x] Color picker for new labels ✅ 10 colors
  - [x] Enter key to create label ✅ Done
  - [x] Converted to Next.js patterns (fetch, sonner) ✅ Done
  - [x] UUID-based architecture ✅ Done

- [x] **API Integration:**
  - [x] API: GET `/api/labels` ✅ Fetches all user labels
  - [x] API: GET `/api/transactions/[id]/labels` ✅ Created endpoint
  - [x] API: POST `/api/transactions/[id]/labels` ✅ Already exists (accepts label names)
  - [x] Adapted to target API (uses label names instead of IDs) ✅ Done

- [x] **UI Components Created:**
  - [x] Command component ✅ Created at `components/ui/command.tsx` (152 lines)
  - [x] Installed cmdk package ✅ Done
  - [x] Popover component ✅ Already exists

- [ ] **Testing:**
  - [ ] Test label display ⚠️ **NEEDS TESTING**
  - [ ] Test add/remove labels ⚠️ **NEEDS TESTING**
  - [ ] Test multi-label selection ⚠️ **NEEDS TESTING**
  - [ ] Test inline label creation ⚠️ **NEEDS TESTING**
  - [ ] Test Command menu search ⚠️ **NEEDS TESTING**

**Status:** ✅ **MIGRATION COMPLETE** - Ready for testing
**Estimated Effort:** 0.5 days ✅ **Completed in 1 session**
**Total:** 1 new GET endpoint + 1 component (260+ lines) + 1 UI component (Command)
**Note:** Component adapted to work with target API which accepts label names rather than IDs

---

### 3.4 Transaction Intelligence Components

#### 3.4.1 Duplicate Review Dialog ✅ **COMPLETED**
- [x] **Component:** Migrated `Source Replit/src/components/duplicate-review-dialog.tsx` ✅ Created
  - [x] Destination: `components/transactions/duplicate-review-dialog.tsx` ✅ Created (300+ lines)

- [x] **Features Implemented:**
  - [x] Display potential duplicate transactions ✅ Side-by-side cards
  - [x] Side-by-side comparison ✅ Two card layout
  - [x] Amount match indicator ✅ Exact/Different with color coding
  - [x] Date difference calculator ✅ Shows days between transactions
  - [x] Amount difference display ✅ Shows absolute difference
  - [x] Two action buttons (adapted to target API) ✅ Done
    - [x] Merge (marks one as duplicate) ✅ Done
    - [x] Keep Both Separate (ignores duplicate flag) ✅ Done
  - [x] Transaction IDs displayed ✅ First 8 chars of UUID
  - [x] Status badges (Approved/Pending) ✅ Done
  - [x] Clear explanation of actions ✅ Help text at bottom
  - [x] Converted to Next.js patterns (fetch, sonner) ✅ Done
  - [x] UUID-based architecture ✅ Done

- [x] **API Integration:**
  - [x] API: POST `/api/transactions/[id]/duplicates` ✅ Already exists
  - [x] Uses database RPC: `resolve_transaction_duplicate` ✅ Done
  - [x] Supports "merge" and "ignore" decisions ✅ Done
  - [x] Note field for audit trail ✅ Added

- [x] **Architectural Differences from Source:**
  - [x] Source had 3 actions (merge, keep_both, delete_bank) ✅ Adapted
  - [x] Target has 2 actions (merge, ignore) ✅ Simplified
  - [x] Target uses database RPC function for duplicate resolution ✅ Integrated
  - [x] Target uses `duplicate_of` and `duplicate_status` fields ✅ Handled

- [ ] **Testing:**
  - [ ] Test duplicate detection ⚠️ **NEEDS TESTING**
  - [ ] Test merge functionality ⚠️ **NEEDS TESTING**
  - [ ] Test keep both (ignore) ⚠️ **NEEDS TESTING**
  - [ ] Test with transactions of different amounts ⚠️ **NEEDS TESTING**

**Status:** ✅ **MIGRATION COMPLETE** - Ready for testing
**Estimated Effort:** 1.5 days ✅ **Completed in 1 session**
**Total:** 1 component (300+ lines) adapted to target API
**Note:** Simplified from 3 actions to 2 actions to match target database schema

---

#### 3.4.2 Overspent Analysis Dialog ✅ **COMPLETED**
- [x] **Component:** Migrated `Source Replit/src/components/overspent-analysis-dialog.tsx` ✅ Created
  - [x] Destination: `components/envelopes/overspent-analysis-dialog.tsx` ✅ Created (450+ lines)

- [x] **Features Implemented:**
  - [x] Display all overspent envelopes ✅ Sorted by overspent amount
  - [x] Show overspent amount for each ✅ Badges with color coding
  - [x] Calculate surplus envelopes ✅ Positive balance calculation
  - [x] Auto-balance button ✅ Intelligent transfer algorithm
  - [x] Auto-balance algorithm ✅ Optimizes transfers from surplus envelopes
  - [x] Visual indicators (severity levels) ✅ Critical/High/Medium/Low colors
  - [x] Progress bars for budget usage ✅ Visual representation
  - [x] Empty state (no overspent envelopes) ✅ Success message
  - [x] Percentage overspent display ✅ For each envelope
  - [x] View transactions button ✅ Links to filtered transaction view
  - [x] Suggestions card ✅ Help text for user
  - [x] Converted to Next.js patterns (fetch, sonner) ✅ Done
  - [x] UUID-based architecture ✅ Done

- [x] **API Integration:**
  - [x] API: GET `/api/envelopes` ✅ Already exists
  - [x] API: POST `/api/envelopes/transfer` ✅ Already exists
  - [x] Uses `fromId`, `toId`, `amount`, `note` fields ✅ Adapted

- [x] **Auto-Balance Algorithm:**
  - [x] Identifies overspent envelopes (negative balance) ✅ Done
  - [x] Identifies surplus envelopes (positive balance) ✅ Done
  - [x] Calculates optimal transfers ✅ Greedy algorithm (largest surplus first)
  - [x] Executes multiple transfers sequentially ✅ Done
  - [x] Invalidates queries after completion ✅ Done

- [ ] **Testing:**
  - [ ] Test overspent detection ⚠️ **NEEDS TESTING**
  - [ ] Test auto-balance logic ⚠️ **NEEDS TESTING**
  - [ ] Test with insufficient surplus ⚠️ **NEEDS TESTING**
  - [ ] Test with no overspent envelopes ⚠️ **NEEDS TESTING**
  - [ ] Test view transactions link ⚠️ **NEEDS TESTING**

**Status:** ✅ **MIGRATION COMPLETE** - Ready for testing
**Estimated Effort:** 1.5 days ✅ **Completed in 1 session**
**Total:** 1 component (450+ lines) with intelligent auto-balance algorithm
**Note:** Component fetches envelopes and calculates overspent/surplus in real-time

---

### 3.5 Category Rules Dialog ✅ **COMPLETED**
- [x] **Component:** Migrated `Source Replit/src/components/create-rule-dialog.tsx` ✅ Created
  - [x] Destination: `components/rules/create-rule-dialog.tsx` ✅ Created (220+ lines)

- [x] **Features Implemented:**
  - [x] Merchant name pattern input ✅ Text input with validation
  - [x] Envelope selection ✅ Select dropdown with icons
  - [x] Match type selection ✅ Contains, Starts With, Exact Match
  - [x] Case sensitivity toggle ✅ Checkbox control
  - [x] Create rule button ✅ With loading state
  - [x] Form validation ✅ Client-side validation
  - [x] Help text for match types ✅ Dynamic descriptions
  - [x] Auto-populates with transaction merchant ✅ Done
  - [x] Success toast notification ✅ Done
  - [x] Converted to Next.js patterns (fetch, sonner) ✅ Done
  - [x] UUID-based architecture ✅ Done

- [x] **API Integration:**
  - [x] API: POST `/api/category-rules` ✅ Already exists
  - [x] Supports `pattern`, `envelopeId`, `matchType`, `caseSensitive` ✅ Done
  - [x] Uses `transaction_rules` table ✅ Done

- [x] **UI Components Created:**
  - [x] Checkbox component ✅ Created at `components/ui/checkbox.tsx`
  - [x] Installed @radix-ui/react-checkbox ✅ Done

- [ ] **Testing:**
  - [ ] Test rule creation ⚠️ **NEEDS TESTING**
  - [ ] Test pattern matching types ⚠️ **NEEDS TESTING**
  - [ ] Test case sensitivity ⚠️ **NEEDS TESTING**
  - [ ] Test form validation ⚠️ **NEEDS TESTING**

**Status:** ✅ **MIGRATION COMPLETE** - Ready for testing
**Estimated Effort:** 0.5 days ✅ **Completed in 1 session**
**Total:** 1 component (220+ lines) + 1 UI component (Checkbox)
**Note:** Enhanced with match type and case sensitivity options not in original source

---

## 📊 PHASE 4: Dashboard & Widgets (Week 4-5)
**Priority: MEDIUM - UX enhancements and visual feedback**

### 4.1 Stats Cards ✅ **COMPLETED**
- [x] **Component:** Migrated `Source Replit/src/components/stats-cards-new.tsx` ✅ Created
  - [x] Destination: `components/dashboard/stats-cards.tsx` ✅ Created (430+ lines)
  - [x] Chose stats-cards-new (more comprehensive) ✅ Done

- [x] **Features Implemented:**
  - [x] Total envelopes count ✅ Card with Target icon
  - [x] On-track envelopes count ✅ Card with CheckCircle icon
  - [x] Overspent envelopes count ✅ Card with AlertTriangle icon
  - [x] Total overspent amount ✅ Displayed with overspent count
  - [x] Total bank balance (excluding credit cards) ✅ Card with DollarSign icon
  - [x] Total envelope balance ✅ Card with Wallet icon
  - [x] Reconciliation difference ✅ Calculated and displayed
  - [x] Reconciliation status indicator ✅ Green/Yellow color coding
  - [x] Credit card holding balance ✅ Card with CreditCard icon
  - [x] Credit card debt display ✅ Shows coverage status
  - [x] Payment readiness indicator ✅ "Payment ready" or amount needed
  - [x] Click-through to overspent analysis ✅ Opens OverspentAnalysisDialog
  - [x] Click-through to reconciliation ✅ Navigates to /reconcile
  - [x] Loading skeleton states ✅ Animated placeholders
  - [x] Responsive design ✅ Mobile/tablet/desktop layouts
  - [x] Dark mode support ✅ All colors adapt
  - [x] Converted to Next.js patterns (fetch) ✅ Done
  - [x] UUID-based architecture ✅ Done

- [x] **Grid Layout:**
  - [x] Row 1: Total Envelopes, On Track, Overspent ✅ 3-column grid
  - [x] Row 2: Envelope Balance, CC Holding, Bank Balance ✅ 3-column grid
  - [x] Optional: Reconciliation alert card ✅ Full-width when unbalanced

- [x] **Integration:**
  - [x] Add to dashboard page ✅ Integrated into dashboard-shell.tsx
  - [x] Responsive grid layout ✅ Mobile-first design
  - [x] Placed between QuickActionsPanel and BudgetOverview ✅ Done
  - [x] Enabled reconciliation alert ✅ showReconciliation={true}

- [ ] **Testing:**
  - [ ] Test all calculations ⚠️ **NEEDS TESTING**
  - [ ] Test visual indicators ⚠️ **NEEDS TESTING**
  - [ ] Test click-through navigation ⚠️ **NEEDS TESTING**
  - [ ] Test mobile layout ⚠️ **NEEDS TESTING**

**Status:** ✅ **MIGRATION COMPLETE & INTEGRATED** - Live on dashboard
**Estimated Effort:** 1 day ✅ **Completed in 1 session**
**Total:** 1 component (430+ lines) with 6 stat cards + reconciliation alert
**Integration:** Integrated into [components/layout/dashboard-shell.tsx](components/layout/dashboard-shell.tsx#L54-L56)
**Note:** Integrates with OverspentAnalysisDialog created in Phase 3.4

---

### 4.2 Monitored Envelopes Widget ✅ **COMPLETED**
- [x] **Component:** Migrated `Source Replit/src/components/monitored-envelopes-widget.tsx` ✅ Created
  - [x] Destination: `components/dashboard/monitored-envelopes-widget.tsx` ✅ Created (117 lines)

- [x] **Features Implemented:**
  - [x] Display user-selected envelopes to monitor ✅ Filters by is_monitored field
  - [x] Current balance display ✅ Shows amount with color coding
  - [x] Budget amount display ✅ Visible in envelope data
  - [x] Progress bar ✅ Visual representation of usage
  - [x] Percentage used ✅ Calculated from current vs budgeted
  - [x] Visual alerts (approaching limit, over budget) ✅ Color-coded red/green
  - [x] Configure monitored envelopes button ✅ Click to navigate
  - [x] Click-through to envelope details ✅ Navigates to transactions filtered by envelope
  - [x] Show/Hide all functionality ✅ Collapses to 4, expands to show all
  - [x] Badge with count ✅ Shows number of monitored envelopes
  - [x] Icon display ✅ Shows envelope icons or default 📊
  - [x] Widget only appears when monitored envelopes exist ✅ Returns null if none

- [x] **Database Migration:**
  - [x] Created migration `0011_envelope_monitoring.sql` ✅ Done
  - [x] Added `is_monitored` boolean field to envelopes table ✅ Default false
  - [x] Added index for performance ✅ On is_monitored where true
  - [x] Added documentation comment ✅ Explains purpose

- [x] **Dependencies:**
  - [x] Database field for monitored envelopes ✅ Added is_monitored to envelopes table
  - [x] API: GET `/api/envelopes` ✅ Already exists

- [x] **Integration:**
  - [x] Add to dashboard page ✅ Integrated into dashboard-shell.tsx
  - [x] Placed between StatsCards and BudgetOverview ✅ Done

- [ ] **Testing:**
  - [ ] Test envelope selection ⚠️ **NEEDS TESTING**
  - [ ] Test progress display ⚠️ **NEEDS TESTING**
  - [ ] Test alerts ⚠️ **NEEDS TESTING**
  - [ ] Test navigation ⚠️ **NEEDS TESTING**
  - [ ] Test show/hide all ⚠️ **NEEDS TESTING**

**Status:** ✅ **MIGRATION COMPLETE & INTEGRATED** - Live on dashboard
**Estimated Effort:** 1 day ✅ **Completed in 1 session**
**Total:** 1 component (117 lines) + 1 database migration
**Integration:** Integrated into [components/layout/dashboard-shell.tsx](components/layout/dashboard-shell.tsx#L58-L60)
**Note:** Widget automatically hides when no envelopes are monitored

---

### 4.3 Pending Approval Widget ✅ **COMPLETED**
- [x] **Component:** Migrated `Source Replit/src/components/pending-approval.tsx` ✅ Created
  - [x] Destination: `components/dashboard/pending-approval-widget.tsx` ✅ Created (211 lines)

- [x] **Features Implemented:**
  - [x] Display count of pending transactions ✅ Badge with count
  - [x] Display list of pending transactions (compact) ✅ Shows 3 by default
  - [x] Quick approve button per transaction ✅ Green check icon
  - [x] Quick reject button per transaction ✅ Red X icon (deletes transaction)
  - [x] Visual badge with count ✅ Yellow badge showing pending count
  - [x] Click-through to full reconciliation page ✅ "View All" button navigates to /reconcile
  - [x] Show/Hide all functionality ✅ Collapses to 3, expands to show all
  - [x] Widget only appears when pending transactions exist ✅ Returns null if none
  - [x] Yellow-themed alert styling ✅ Matches pending status theme
  - [x] Merchant and description display ✅ Shows transaction details
  - [x] Amount display ✅ Shows transaction amount

- [x] **Dependencies:**
  - [x] API: GET `/api/transactions?status=pending` ✅ Uses query parameters
  - [x] API: PATCH `/api/transactions/[id]/approve` ✅ Approve endpoint
  - [x] API: DELETE `/api/transactions/[id]` ✅ Delete endpoint for rejection

- [x] **Integration:**
  - [x] Add to dashboard page ✅ Integrated into dashboard-shell.tsx
  - [x] Placed between MonitoredEnvelopesWidget and BudgetOverview ✅ Done

- [ ] **Testing:**
  - [ ] Test pending transaction display ⚠️ **NEEDS TESTING**
  - [ ] Test quick approve ⚠️ **NEEDS TESTING**
  - [ ] Test quick reject ⚠️ **NEEDS TESTING**
  - [ ] Test navigation ⚠️ **NEEDS TESTING**
  - [ ] Test show/hide all ⚠️ **NEEDS TESTING**

**Status:** ✅ **MIGRATION COMPLETE & INTEGRATED** - Live on dashboard
**Estimated Effort:** 0.5 days ✅ **Completed in 1 session**
**Total:** 1 component (211 lines)
**Integration:** Integrated into [components/layout/dashboard-shell.tsx](components/layout/dashboard-shell.tsx#L62-L64)
**Note:** Widget automatically hides when no pending transactions exist

---

### 4.4 Envelope Display Components ✅ **COMPLETED**

#### 4.4.1 Condensed Envelope Overview ✅ **COMPLETED**
- [x] **Component:** Migrated `Source Replit/src/components/condensed-envelope-overview.tsx` ✅ Created
  - [x] Destination: `components/envelopes/condensed-envelope-overview.tsx` ✅ Created (217 lines)

- [x] **Features Implemented:**
  - [x] Ultra-compact grid display ✅ 3-column grid on desktop
  - [x] Icon, name, balance in minimal space ✅ Compact card layout
  - [x] Status badges (Good, Low, Overspent) ✅ Color-coded badges
  - [x] Smart filtering ✅ Prioritizes overspent and low-balance envelopes
  - [x] Collapsible/expandable view ✅ Shows top 6, expandable to all
  - [x] Mobile-optimized layout ✅ Responsive grid (1/2/3 columns)
  - [x] Progress bars ✅ Visual spending progress
  - [x] Balance and budget display ✅ Shows current vs budgeted
  - [x] Eye icon toggle ✅ Show all/less button
  - [x] Dark mode support ✅ All colors adapt

- [ ] **Testing:**
  - [ ] Test compact layout ⚠️ **NEEDS TESTING**
  - [ ] Test smart filtering ⚠️ **NEEDS TESTING**
  - [ ] Test collapse/expand ⚠️ **NEEDS TESTING**
  - [ ] Test mobile view ⚠️ **NEEDS TESTING**

**Status:** ✅ **MIGRATION COMPLETE** - Ready for use
**Estimated Effort:** 0.5 days ✅ **Completed in 1 session**
**Total:** 1 component (217 lines)
**Note:** Can be used standalone or integrated into other pages

---

#### 4.4.2 Envelope Card ✅ **COMPLETED**
- [x] **Component:** Migrated `Source Replit/src/components/envelope-card.tsx` ✅ Created
  - [x] Destination: `components/envelopes/envelope-card.tsx` ✅ Created (93 lines)

- [x] **Features Implemented:**
  - [x] Card display for single envelope ✅ Standalone card component
  - [x] Icon and name ✅ Header with icon and name
  - [x] Current balance ✅ Color-coded by status
  - [x] Budget amount ✅ Shows budgeted amount
  - [x] Progress bar ✅ Visual spending indicator
  - [x] Percentage calculation ✅ Spent vs budgeted
  - [x] Visual status (on track, warning, overspent) ✅ Badge indicators
  - [x] Hover effects ✅ Shadow and background on hover
  - [x] Optional click handler ✅ Accepts onClick prop
  - [x] Dark mode support ✅ All colors adapt

- [ ] **Testing:**
  - [ ] Test card display ⚠️ **NEEDS TESTING**
  - [ ] Test progress indicators ⚠️ **NEEDS TESTING**
  - [ ] Test click handler ⚠️ **NEEDS TESTING**

**Status:** ✅ **MIGRATION COMPLETE** - Ready for use
**Estimated Effort:** 0.5 days ✅ **Completed in 1 session**
**Total:** 1 component (93 lines)
**Note:** Reusable card component for envelope displays

---

### 4.5 Transaction Display Components

#### 4.5.1 Transaction Item (Mobile-Optimized)
- [ ] **Component:** Migrate `Source Replit/src/components/transaction-item.tsx`
  - [ ] Destination: `components/layout/transactions/transaction-item.tsx`

- [ ] **Features to Implement:**
  - [ ] 2-line layout option (ultra-compact)
  - [ ] 3-line layout option (with envelope)
  - [ ] Mobile-first design
  - [ ] Touch-friendly tap targets
  - [ ] Swipe actions (approve, delete)
  - [ ] Inline envelope editing dropdown
  - [ ] Status indicator badge
  - [ ] Amount with formatting
  - [ ] Date display
  - [ ] Merchant name
  - [ ] Label badges

- [ ] **Dependencies:**
  - [ ] react-swipeable library

- [ ] **Testing:**
  - [ ] Test 2-line layout
  - [ ] Test 3-line layout
  - [ ] Test swipe actions
  - [ ] Test inline editing
  - [ ] Test mobile touch

**Estimated Effort:** 1 day

---

## 💰 PHASE 5: Debt & Income Management (Week 5)
**Priority: MEDIUM - Debt freedom features**

### 5.1 Debt Management Components ✅ **ALREADY EXISTS**

#### 5.1.1 Debt Freedom Dashboard ✅ **EXISTS**
- [x] **Verification:** Exists in `app/(app)/debt-management/page.tsx` ✅ Found
- [x] **Component:** `components/layout/debt-management/debt-management-client.tsx` ✅ Exists

- [x] **Features Verified:**
  - [x] Total debt display ✅ Calculated from liabilities
  - [x] Number of debt accounts ✅ Shown in UI
  - [x] Average interest rate ✅ Highest interest debt displayed
  - [x] Monthly minimum payment total ✅ Calculated
  - [x] Debt-free date projection ✅ Strategy-based projections
  - [x] Visual progress tracking ✅ Progress bars and metrics
  - [x] Progress milestones ✅ Achievement tracking
  - [x] Achievement celebrations ✅ Milestone celebrations
  - [x] Debt list with details per debt ✅ Full debt list
  - [x] Strategy selector (Snowball, Avalanche, Hybrid) ✅ Tab-based selection

- [ ] **Testing:**
  - [ ] Test calculations ⚠️ **NEEDS TESTING**
  - [ ] Test visual progress ⚠️ **NEEDS TESTING**
  - [ ] Test debt list display ⚠️ **NEEDS TESTING**

**Status:** ✅ **ALREADY COMPLETE** - Exists in codebase
**Location:** [app/(app)/debt-management/page.tsx](app/(app)/debt-management/page.tsx)
**Client Component:** [components/layout/debt-management/debt-management-client.tsx](components/layout/debt-management/debt-management-client.tsx)

---

#### 5.1.2 Debt Payoff Calculator ✅ **EXISTS**
- [x] **Verification:** Exists in `app/(app)/debt-management/page.tsx` ✅ Found
- [x] **Component:** `components/layout/debt-management/debt-payoff-calculator.tsx` ✅ Exists

- [x] **Features Verified:**
  - [x] Debt list input (name, balance, rate, minimum payment) ✅ Full debt management
  - [x] Extra payment amount input ✅ Extra payment capacity calculated
  - [x] Snowball strategy calculation ✅ Smallest balance first
  - [x] Avalanche strategy calculation ✅ Highest interest first
  - [x] Hybrid strategy calculation ✅ Blended approach
  - [x] Timeline projections for each strategy ✅ Strategy tabs
  - [x] Interest savings calculation ✅ Cost comparisons
  - [x] Total cost comparison ✅ Total interest calculations
  - [x] Visual timeline chart ✅ Visual progress tracking
  - [x] Recommended strategy indicator ✅ Strategy recommendations

- [ ] **Testing:**
  - [ ] Test snowball calculations ⚠️ **NEEDS TESTING**
  - [ ] Test avalanche calculations ⚠️ **NEEDS TESTING**
  - [ ] Test interest savings ⚠️ **NEEDS TESTING**
  - [ ] Test visual timeline ⚠️ **NEEDS TESTING**

**Status:** ✅ **ALREADY COMPLETE** - Exists in codebase
**Location:** [components/layout/debt-management/debt-payoff-calculator.tsx](components/layout/debt-management/debt-payoff-calculator.tsx)

---

### 5.2 Recurring Income Components ✅ **ALREADY EXISTS**

#### 5.2.1 Create Recurring Income Dialog ✅ **EXISTS**
- [x] **Verification:** Exists in `components/layout/recurring-income/recurring-income-client.tsx` ✅ Found
- [x] **Component:** Integrated into recurring income page ✅ Exists

- [x] **Features Verified:**
  - [x] Income name input ✅ Full form with validation
  - [x] Amount input ✅ Number input with decimals
  - [x] Frequency selector (weekly, fortnightly, monthly, etc.) ✅ Dropdown selector
  - [x] Start date picker ✅ Date picker integrated
  - [x] Account deposit selector ✅ Account selection
  - [x] Envelope splits ✅ Advanced allocation system
  - [x] Surplus envelope selector ✅ Surplus handling
  - [x] Create button ✅ Form submission

- [x] **Dependencies:**
  - [x] API: POST `/api/recurring-income` ✅ Exists
  - [x] Page: `app/(app)/recurring-income/page.tsx` ✅ Exists

- [ ] **Testing:**
  - [ ] Test income creation ⚠️ **NEEDS TESTING**
  - [ ] Test validation ⚠️ **NEEDS TESTING**
  - [ ] Test frequency options ⚠️ **NEEDS TESTING**

**Status:** ✅ **ALREADY COMPLETE** - Exists in codebase
**Location:** [app/(app)/recurring-income/page.tsx](app/(app)/recurring-income/page.tsx)
**Client Component:** [components/layout/recurring-income/recurring-income-client.tsx](components/layout/recurring-income/recurring-income-client.tsx)
**Note:** Dialogs are built into the client component

---

#### 5.2.2 Process Recurring Income Dialog ✅ **EXISTS**
- [x] **Verification:** Exists in `components/layout/recurring-income/recurring-income-client.tsx` ✅ Found
- [x] **Component:** Integrated into recurring income page ✅ Exists

- [x] **Features Verified:**
  - [x] Display due recurring income ✅ Shows upcoming income
  - [x] Show income amount ✅ Amount display
  - [x] Apply to budget button ✅ Process income functionality
  - [x] Surplus allocation tool ✅ Advanced allocation system
  - [x] Distribute surplus across envelopes ✅ Multiple envelope allocation
  - [x] Intelligent suggestions ✅ Smart allocation
  - [x] Manual allocation per envelope ✅ Custom splits
  - [x] Apply all button ✅ Batch processing

- [x] **Dependencies:**
  - [x] API: POST `/api/recurring-income/[id]/apply-surplus` ✅ Exists
  - [x] Page: `app/(app)/recurring-income/page.tsx` ✅ Exists

- [ ] **Testing:**
  - [ ] Test income application ⚠️ **NEEDS TESTING**
  - [ ] Test surplus allocation ⚠️ **NEEDS TESTING**
  - [ ] Test smart suggestions ⚠️ **NEEDS TESTING**

**Status:** ✅ **ALREADY COMPLETE** - Exists in codebase
**Location:** [components/layout/recurring-income/recurring-income-client.tsx](components/layout/recurring-income/recurring-income-client.tsx)
**Note:** Processing functionality is built into the client component

---

## 🤖 PHASE 6: Rules, Automation & Help (Week 6)
**Priority: LOW-MEDIUM - Nice to have features**

### 6.1 Help Tooltip System ✅ **COMPLETED**
- [x] **Component:** Migrated `Source Replit/src/components/help-tooltip.tsx` ✅ Created
  - [x] Destination: `components/ui/help-tooltip.tsx` ✅ Created (82 lines)

- [x] **Features Implemented:**
  - [x] Tooltip component with help icon ✅ HelpCircle icon from lucide-react
  - [x] Contextual help text ✅ Accepts title, content array, and optional tips
  - [x] Position options (top, bottom, left, right) ✅ Side and align props
  - [x] Mobile-friendly display ✅ Responsive popover with 320px max width
  - [x] Consistent styling ✅ Uses shadcn/ui Popover component
  - [x] Close button ✅ X button to dismiss
  - [x] Tips section ✅ Optional bulleted tips list
  - [x] Accessibility ✅ ARIA labels added

- [ ] **Implementation Plan:**
  - [x] Create base component ✅ Done
  - [ ] Add to key pages:
    - [ ] Envelopes page ⚠️ **NEEDS INTEGRATION**
    - [ ] Zero budget setup ⚠️ **NEEDS INTEGRATION**
    - [ ] Reconciliation page ⚠️ **NEEDS INTEGRATION**
    - [ ] Debt management ⚠️ **NEEDS INTEGRATION**
    - [ ] Transactions page ⚠️ **NEEDS INTEGRATION**
  - [ ] Write help text for each section ⚠️ **NEEDS CONTENT**

- [ ] **Testing:**
  - [ ] Test tooltip display ⚠️ **NEEDS TESTING**
  - [ ] Test positioning ⚠️ **NEEDS TESTING**
  - [ ] Test mobile view ⚠️ **NEEDS TESTING**

**Status:** ✅ **COMPONENT COMPLETE** - Ready for integration
**Estimated Effort:** 1-2 days ✅ **Component completed in 1 session**
**Total:** 1 component (82 lines)
**Location:** [components/ui/help-tooltip.tsx](components/ui/help-tooltip.tsx)
**Note:** Component is ready to use, needs to be added to pages with contextual help text

---

## 🔐 PHASE 7: Security & Authentication (Week 6)
**Priority: MEDIUM - Security enhancement**
**Status:** ⏸️ **DEFERRED** - Requires significant backend infrastructure

### 7.1 Two-Factor Authentication ⏸️ **DEFERRED**
- [ ] **Component:** Migrate `Source Replit/src/components/TwoFactorAuthSetup.tsx`
  - [ ] Destination: `components/auth/two-factor-auth-setup.tsx` or `app/(auth)/2fa/page.tsx`

**Note:** This feature requires extensive backend work including database schema changes, encryption infrastructure, and authentication flow modifications. The source component exists at `Source Replit/src/components/TwoFactorAuthSetup.tsx` but has been deferred due to complexity and lower priority relative to core budgeting features.

- [ ] **Features to Implement:**
  - [ ] TOTP setup flow
  - [ ] QR code generation
  - [ ] QR code display
  - [ ] Manual key display
  - [ ] Verification code input (6-digit)
  - [ ] Setup verification
  - [ ] Backup codes generation
  - [ ] Backup codes display (one-time view)
  - [ ] Backup codes download
  - [ ] Enable/disable 2FA
  - [ ] Re-generate backup codes

- [ ] **Backend Requirements:**
  - [ ] Add `two_factor_enabled` boolean to users table
  - [ ] Add `two_factor_secret` encrypted field to users table
  - [ ] Add backup codes storage (encrypted)
  - [ ] API: POST `/api/auth/2fa/setup` (generate secret & QR)
  - [ ] API: POST `/api/auth/2fa/verify` (verify code)
  - [ ] API: POST `/api/auth/2fa/enable` (enable 2FA)
  - [ ] API: POST `/api/auth/2fa/disable` (disable 2FA)
  - [ ] API: POST `/api/auth/2fa/backup-codes` (generate new codes)
  - [ ] Modify login flow to check 2FA
  - [ ] Add 2FA verification step after password

- [ ] **Dependencies:**
  - [ ] `otplib` or `speakeasy` library for TOTP
  - [ ] `qrcode` library for QR generation
  - [ ] Encryption utilities

- [ ] **Integration:**
  - [ ] Add to settings page
  - [ ] Modify login page
  - [ ] Add 2FA verification page

- [ ] **Testing:**
  - [ ] Test setup flow
  - [ ] Test QR code generation
  - [ ] Test code verification
  - [ ] Test backup codes
  - [ ] Test login with 2FA
  - [ ] Test backup code usage
  - [ ] Test disable 2FA

**Estimated Effort:** 2-3 days

---

## ✅ PHASE 8: Testing & Verification (Weeks 7-8)
**Priority: CRITICAL - Quality assurance**

### 8.1 Feature Completeness Verification
Use [Complete_Features_List.md](Complete_Features_List.md) as the source of truth.

#### Core Budgeting & Envelope Management (Lines 3-17)
- [ ] **Envelope System**
  - [ ] 100+ Pre-configured Envelopes in 7 categories
  - [ ] Custom Envelope Creation with name, icon, budget, category
  - [ ] Opening Balance Management
  - [ ] Budget Frequency Scheduling (weekly, fortnightly, monthly, quarterly, annual)
  - [ ] Next Payment Due Dates with automatic calculation
  - [ ] Spending Account Flag
  - [ ] Envelope Monitoring with dashboard widget
  - [ ] Drag-and-Drop Categorisation with collapsible headers
  - [ ] Envelope Transfer System with double-entry ledger
  - [ ] Ultra-Compact Table Layout
  - [ ] Progress Bars (budget vs actual)
  - [ ] Click-through Navigation from envelopes to filtered transactions

#### Budget Management (Lines 19-27)
- [ ] **Budget Management**
  - [ ] Zero Budget Manager with real-time tracking
  - [ ] Budget Utilisation Progress with visual indicators
  - [ ] Overspend Analysis with auto-balance
  - [ ] Surplus Allocation Tool
  - [ ] Budget History Tracking with editable amounts
  - [ ] Income vs Expense Separation with category grouping
  - [ ] Celebration Component for achieving zero budget
  - [ ] Budget Status Widget as primary dashboard element

#### Transaction Processing & Management (Lines 29-57)
- [ ] **Transaction Creation & Editing**
  - [ ] Quick Add Form with date picker and validation
  - [ ] Receipt Upload Support (5MB limit with validation)
  - [ ] Merchant and Description Fields split
  - [ ] Pending Approval Workflow
  - [ ] Transaction Splitting across multiple envelopes
  - [ ] Inline Envelope Editing on all rows
  - [ ] Smart Remaining Amount Calculation
  - [ ] Visual Validation Indicators (over/under allocated)

- [ ] **Transaction Intelligence**
  - [ ] Merchant Memory System with automatic suggestions
  - [ ] Category Rules Engine for automation
  - [ ] Duplicate Detection with fuzzy logic
  - [ ] Smart Transaction Hashing
  - [ ] Potential Duplicate Review with merge/keep/delete
  - [ ] Transaction Labels System with color-coding
  - [ ] Searchable Label Interface

- [ ] **Transaction Display & Filtering**
  - [ ] Ultra-Compact Single-Line Display
  - [ ] Advanced Filtering (envelope, account, date, status)
  - [ ] Search Functionality (including amount without $ sign)
  - [ ] Pagination Options (25/50/100/200)
  - [ ] Quick Date Range Presets
  - [ ] CSV Export Functionality
  - [ ] Real-time Status Updates with visual indicators

#### Bank Integration & Reconciliation (Lines 59-76)
- [ ] **Bank Connections**
  - [ ] Akahu OAuth Integration with NZ banks
  - [ ] Supported Banks: ANZ, ASB, BNZ, Westpac, Kiwibank, Heartland, TSB
  - [ ] Secure Connection Management with status monitoring
  - [ ] Automatic Transaction Sync with real-time import
  - [ ] Bank Account Balance Monitoring with discrepancy alerts
  - [ ] Connection Health Checking with reconnection prompts

- [ ] **Reconciliation Centre**
  - [ ] Comprehensive Transaction Listing with status filtering
  - [ ] Advanced Filtering Options (unmatched, pending, matched/approved)
  - [ ] Reconciliation Status Summary Cards with click-through
  - [ ] Inline Envelope Allocation interface
  - [ ] Mobile-Optimised Allocation with full-width dropdowns
  - [ ] Direct Approve Functionality without leaving page
  - [ ] Visual Ring Indicators for active filters

#### Account & Financial Management (Lines 78-95)
- [ ] **Account Management**
  - [ ] Multiple Account Types (checking, savings, credit, investment)
  - [ ] Opening Balance Configuration
  - [ ] Account Balance Tracking with real-time updates
  - [ ] Credit Card Holding Account System ⚠️ (needs full implementation)
  - [ ] Account Type Categorisation
  - [ ] Account Status Management (active/inactive)

- [ ] **Financial Reports & Analytics**
  - [ ] Envelope Balance Report with debit/credit formatting
  - [ ] Category Grouping with totals
  - [ ] Print Functionality
  - [ ] CSV Export to Excel
  - [ ] Net Worth Tracking with asset/liability management
  - [ ] Asset Allocation Pie Charts
  - [ ] Trend Analysis with historical snapshots

#### Debt Management & Freedom Tools (Lines 97-113)
- [ ] **Debt Tracking**
  - [ ] Comprehensive Debt Dashboard with visual progress
  - [ ] Debt Overview Metrics
  - [ ] Multiple Debt Types (credit cards, personal loans, student loans, store cards)
  - [ ] Interest Rate Tracking with minimum payments
  - [ ] Payment Timeline Projections
  - [ ] Progress Milestones with celebrations

- [ ] **Debt Elimination Tools**
  - [ ] Payoff Calculator with snowball vs avalanche
  - [ ] Interest Savings Calculator
  - [ ] Timeline Projections for complete elimination
  - [ ] Urgent Action Alerts for high-interest debts
  - [ ] Payment Strategy Comparison with visual recommendations
  - [ ] Debt Payment Envelope Integration

#### Mobile & User Experience (Lines 115-131)
- [ ] **Mobile Optimisation**
  - [ ] iPhone-Specific Scrolling with proper touch
  - [ ] Mobile-First Design (not desktop-responsive)
  - [ ] Mobile Bottom Navigation with key functions
  - [ ] Compact Mobile Layout with reduced padding
  - [ ] Touch-Friendly Controls
  - [ ] Responsive Button Placement for thumbs

- [ ] **User Interface**
  - [ ] Hamburger Menu with full navigation
  - [ ] Collapsible Desktop Sidebar
  - [ ] User Profile Section with quick actions
  - [ ] App Version Display
  - [ ] Contextual Help Tooltips with usage tips
  - [ ] Professional Mobile Header with organised sections

#### Advanced Features (Lines 133-157)
- [ ] **Automation & Intelligence**
  - [ ] Recurring Transaction Management with automated processing
  - [ ] Smart Date Calculations for payment scheduling
  - [ ] Automated Category Assignment based on rules
  - [ ] Intelligent Envelope Suggestions from history
  - [ ] Auto-Balance Calculations for overspend coverage
  - [ ] Payment Scheduler with overdue updates

- [ ] **Data Management**
  - [ ] Multi-User Support with data isolation
  - [ ] Session Management with PostgreSQL store
  - [ ] Comprehensive Audit Trails for all changes
  - [ ] Data Export Capabilities across all features
  - [ ] Backup and Recovery through database snapshots
  - [ ] Real-time Synchronisation across devices

- [ ] **Customisation & Branding**
  - [ ] Custom Colour Schemes with theme support
  - [ ] Icon Selection for envelopes and categories
  - [ ] Category Management with drag-and-drop reordering
  - [ ] Collapsible Category Headers with expand/collapse all
  - [ ] Custom Sort Orders
  - [ ] Professional Branding Support for coach partnerships

#### Unique Features (Lines 209-234)
- [ ] **Comprehensive Startup Walkthrough**
  - [ ] Progressive 4-Step Setup with visual progress
  - [ ] Income-Based Budget Calculator with percentage suggestions
  - [ ] Pay Cycle Integration throughout
  - [ ] Real-time Validation with immediate feedback

- [ ] **Dynamic Zero Budget Manager**
  - [ ] Live Budget Balancing with real-time calculation
  - [ ] Interactive Budget Editing with inline validation
  - [ ] Celebration System with achievement notifications
  - [ ] Intelligent Surplus Allocation across envelopes
  - [ ] Pay Cycle Awareness

**Estimated Effort:** 3-5 days

---

### 8.2 Mobile Optimization Testing
- [ ] **Test All Pages on Mobile Devices:**
  - [ ] Dashboard
  - [ ] Envelopes (all views)
  - [ ] Transactions list
  - [ ] Reconciliation
  - [ ] Accounts
  - [ ] Debt management
  - [ ] Net worth
  - [ ] Reports
  - [ ] Settings
  - [ ] Setup wizard
  - [ ] Zero budget setup

- [ ] **Mobile-Specific Features:**
  - [ ] Touch-friendly tap targets (minimum 44x44px)
  - [ ] Swipe gestures work correctly
  - [ ] Bottom navigation accessible
  - [ ] Hamburger menu functional
  - [ ] Compact layouts render properly
  - [ ] Forms usable on mobile keyboards
  - [ ] Dropdowns expand properly
  - [ ] Modals/dialogs sized appropriately
  - [ ] Scrolling smooth and responsive
  - [ ] No horizontal scroll issues

- [ ] **Mobile Testing Devices:**
  - [ ] iPhone (iOS Safari)
  - [ ] Android (Chrome)
  - [ ] Tablet (iPad/Android tablet)

**Estimated Effort:** 2-3 days

---

### 8.3 Integration Testing
- [ ] **Akahu Bank Integration:**
  - [ ] OAuth flow completes successfully
  - [ ] All 7 supported banks connect
  - [ ] Transactions sync automatically
  - [ ] Webhook receives transaction updates
  - [ ] Connection status monitored correctly
  - [ ] Reconnection flow works
  - [ ] Error handling for failed connections
  - [ ] Balance sync accurate

- [ ] **Supabase Integration:**
  - [ ] Authentication works (email/password)
  - [ ] User session persists correctly
  - [ ] Sign up flow complete
  - [ ] Password reset works
  - [ ] Database queries execute correctly
  - [ ] Real-time updates (if used)
  - [ ] Row-level security policies enforce properly
  - [ ] File storage (receipts) uploads/downloads

- [ ] **API Endpoints Testing:**
  - [ ] Test all 43 endpoints individually
  - [ ] Verify request/response formats
  - [ ] Test error handling
  - [ ] Test validation rules
  - [ ] Test authentication/authorization
  - [ ] Test rate limiting (if implemented)
  - [ ] Check for SQL injection vulnerabilities
  - [ ] Check for XSS vulnerabilities

- [ ] **Data Flow Testing:**
  - [ ] Transaction creation → envelope balance update
  - [ ] Envelope transfer → both envelopes update
  - [ ] Transaction approval → status change
  - [ ] Transaction split → multiple envelope allocations
  - [ ] Recurring income → surplus allocation
  - [ ] Category rule → auto-assignment
  - [ ] Credit card transaction → holding account (when implemented)

**Estimated Effort:** 2-3 days

---

## 📚 PHASE 9: Documentation & Cleanup (Week 8)
**Priority: MEDIUM - Project hygiene and maintainability**

### 9.1 Documentation Updates
- [ ] **Update README.md:**
  - [ ] Project description
  - [ ] Updated tech stack
  - [ ] Environment variables (.env.example)
  - [ ] Setup instructions for local development
  - [ ] Akahu setup guide link
  - [ ] Supabase setup guide link
  - [ ] Deployment instructions (Vercel)
  - [ ] Migration status

- [ ] **Create COMPONENT_INVENTORY.md:**
  - [ ] List all components with descriptions
  - [ ] Component dependencies
  - [ ] Props documentation
  - [ ] Usage examples

- [ ] **Update Architecture Documentation:**
  - [ ] Current folder structure
  - [ ] Routing strategy (Next.js App Router)
  - [ ] State management (React Query)
  - [ ] API structure
  - [ ] Database schema
  - [ ] Authentication flow

- [ ] **Create DEVELOPMENT_GUIDE.md:**
  - [ ] Code style guidelines
  - [ ] Component creation patterns
  - [ ] API endpoint patterns
  - [ ] Testing guidelines
  - [ ] Git workflow
  - [ ] PR process

- [ ] **Update MIGRATION_NOTES.md:**
  - [ ] Document all architectural changes
  - [ ] List differences from Replit version
  - [ ] Known issues
  - [ ] Future work

**Estimated Effort:** 1-2 days

---

### 9.2 Code Cleanup
- [ ] **Remove Unused Code:**
  - [ ] Remove unused imports
  - [ ] Remove commented-out code
  - [ ] Remove console.log statements
  - [ ] Remove unused components
  - [ ] Remove unused API endpoints

- [ ] **Fix TypeScript Errors:**
  - [ ] Run `npm run build`
  - [ ] Fix all TypeScript errors
  - [ ] Fix all linting warnings
  - [ ] Ensure strict mode compliance

- [ ] **Standardize Patterns:**
  - [ ] Consistent component structure
  - [ ] Consistent API response formats
  - [ ] Consistent error handling
  - [ ] Consistent naming conventions
  - [ ] Consistent file naming (kebab-case, PascalCase, etc.)

- [ ] **Performance Optimization:**
  - [ ] Add React.memo where appropriate
  - [ ] Optimize re-renders
  - [ ] Code splitting for large components
  - [ ] Lazy loading for routes
  - [ ] Optimize images
  - [ ] Bundle size analysis

- [ ] **Security Review:**
  - [ ] Audit all API endpoints for authentication
  - [ ] Review row-level security policies
  - [ ] Check for exposed secrets
  - [ ] Validate all user inputs
  - [ ] Sanitize outputs to prevent XSS
  - [ ] CSRF protection (Next.js handles this)

**Estimated Effort:** 1-2 days

---

## 🎯 PRIORITY QUICK REFERENCE

### Must-Have (Start Immediately)
1. ✅ Zero Budget Setup Page (Phase 1.1)
2. ✅ Setup/Onboarding Wizard (Phase 1.2)
3. ✅ Credit Card Holding Account Full Implementation (Phase 1.4)
4. ✅ Bank Connection Manager (Phase 2.1)
5. ✅ Transaction Dialogs (Phase 2.2)
6. ✅ Envelope Transfer Dialog (Phase 2.3.4)
7. ✅ Zero Budget Components (Phase 2.4)

### Should-Have (High Priority)
8. Category & Label Managers (Phase 3.1-3.3)
9. Transaction Intelligence (Phase 3.4)
10. Stats Cards & Dashboard Widgets (Phase 4.1-4.3)
11. Feature Verification Checklist (Phase 8.1)

### Nice-to-Have (Medium Priority)
12. Debt Management Components (Phase 5.1)
13. Recurring Income Components (Phase 5.2)
14. Help Tooltip System (Phase 6.1)
15. Two-Factor Authentication (Phase 7.1)

### Polish (Lower Priority)
16. Mobile Testing (Phase 8.2)
17. Integration Testing (Phase 8.3)
18. Documentation (Phase 9.1)
19. Code Cleanup (Phase 9.2)

---

## 📅 SUGGESTED TIMELINE

| Week | Phase | Focus | Deliverables |
|------|-------|-------|--------------|
| 1 | Phase 1 (Part 1) | Critical Pages | Zero Budget Setup, Setup Wizard |
| 2 | Phase 1 (Part 2) + Phase 2 (Start) | Credit Card + Core Components | Credit Card Feature, Bank Manager, Transaction Dialogs |
| 3 | Phase 2 (Continue) + Phase 3 (Start) | Envelope Components + Management | Envelope Dialogs, Zero Budget, Category/Label Managers |
| 4 | Phase 3 (Continue) + Phase 4 | Intelligence + Dashboard | Duplicate Review, Overspent Analysis, Stats Cards, Widgets |
| 5 | Phase 5 | Debt & Income | Debt Dashboard, Payoff Calculator, Recurring Income |
| 6 | Phase 6 + Phase 7 | Rules + Security | Help System, 2FA |
| 7 | Phase 8 (Part 1) | Testing | Feature Verification, Mobile Testing |
| 8 | Phase 8 (Part 2) + Phase 9 | Integration Testing + Polish | API Testing, Documentation, Cleanup |

**Total Duration:** 8 weeks (2 months)

---

## 🔄 PROGRESS TRACKING

### Completion Status
- [ ] Phase 1: Critical Pages (0/4 tasks)
- [ ] Phase 2: Core Components (0/4 sections)
- [ ] Phase 3: Management Components (0/5 sections)
- [ ] Phase 4: Dashboard Widgets (0/5 sections)
- [ ] Phase 5: Debt & Income (0/2 sections)
- [ ] Phase 6: Rules & Help (0/1 tasks)
- [ ] Phase 7: Security (0/1 tasks)
- [ ] Phase 8: Testing (0/3 sections)
- [ ] Phase 9: Documentation (0/2 sections)

**Overall Progress:** 0% Complete

---

## 📝 NOTES & DECISIONS

### Architectural Decisions
- **Router:** Migrated from Wouter to Next.js App Router
- **API:** Migrated from Express.js to Next.js API routes
- **Auth:** Using Supabase Auth (removed Replit Auth)
- **Database:** PostgreSQL via Supabase (removed Replit DB)
- **Deployment:** Vercel (removed Replit hosting)

### Known Issues
1. Credit Card Holding Account System only partially implemented (visual tracking, no automation)
2. Some components exist in migrated app but may not have full feature parity with Replit version
3. Mobile optimization needs verification across all pages
4. Some API endpoints may need additional testing

### Questions to Resolve
- [ ] Should we keep or remove the demo mode feature?
- [ ] Do we need the coach partnership features immediately?
- [ ] What analytics service to integrate (Google Analytics, Plausible, etc.)?
- [ ] Email service decision (SendGrid, Mailgun, Resend, etc.)?

---

## 🎉 COMPLETION CRITERIA

The migration will be considered **100% complete** when:
1. ✅ All pages from Source Replit migrated or feature-equivalent
2. ✅ All 82 components migrated or consolidated into feature-equivalent versions
3. ✅ All 100+ features from Complete_Features_List.md verified as working
4. ✅ Credit Card Holding Account System fully automated
5. ✅ All API endpoints tested and working
6. ✅ Mobile optimization verified on iOS and Android
7. ✅ Bank integration (Akahu) fully functional
8. ✅ Zero TypeScript errors or linting warnings
9. ✅ Documentation updated and complete
10. ✅ Security review passed
11. ✅ Performance optimization complete
12. ✅ User acceptance testing passed

---

**Last Updated:** 2025-11-05
**Document Version:** 1.0
**Migration Status:** 60-70% Complete
**Estimated Completion:** 8 weeks from start date
