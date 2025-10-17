# Replit → Next.js Cutover Plan

Use this progression checklist to move every legacy Replit feature into the new Next.js stack. Items are grouped so the foundational work lands before polish/automation.

---

## 1. Backend Foundations

- [x] **Envelope transfer API** – build `/api/envelopes/transfer`, validate balances, persist transfer history. (Supabase migration 0003 + `/api/envelopes/transfer` RPC wrapper.)
- [x] **Transaction mutations** – finish approve/assign/split/label endpoints with optimistic cache invalidation (reconcile, transactions pages). (Supabase migrations 0003-0004; API routes updated in `app/api/transactions/[id]/*`).
- [x] **Net worth CRUD** – Supabase REST endpoints for assets/liabilities (create/list/update/delete) and snapshots CRUD (`app/api/net-worth/**/*`; reusable validation + Supabase auth guards).
- [x] **Recurring income mutations** – API routes to add/edit/remove income streams and distribution targets. (Supabase migration 0005; REST handlers in `app/api/recurring-income/**/*` wired into client drawers.)
- [x] **Receipt storage** – replace stubbed presign logic with Supabase Storage signed URLs (bucket config + cleanup job). (Storage helpers in `lib/storage/receipts.ts`, route upgraded in `/api/transactions/[id]/receipt`, receipt upload dialog wired to signed URLs, old files cleaned on replace.)
- [x] **Background jobs** – schedule Akahu sync + envelope recalcs via Supabase cron or edge functions. (Cron-driven edge function in `supabase/functions/jobs-runner`, secured `/api/jobs/run` endpoint, Akahu sync + envelope recalculation tasks.)
  - ☐ Configure Supabase cron schedules via dashboard (**Edge Functions → jobs-runner → Scheduling**) once secrets are set (`CRON_SECRET`, `JOB_TARGET_URL`).

---

## 2. Data Model Enhancements

- [x] **Envelope history** – add transfer log table (from/to/amount/user_id) and expose for zero-budget + reports. (`envelope_transfers` RPC + history feed in zero-budget manager, `/api/envelopes/history`, reports dashboard card.)
- [x] **Net worth snapshots** – ensure migration/table covers historical trend data with monthly roll-ups. (`net_worth_snapshots_monthly` view + Net Worth timeline/reporting using monthly aggregates.)
- [x] **Duplicate resolution** – table or flags to track merged transactions and audit decisions. (`transaction_duplicate_events` audit log, `duplicate_status` flags, `/api/transactions/[id]/duplicates` resolve endpoint, UI actions in Reconcile.)
- [x] **Label metadata** – enrich labels with colour + description + usage counts for filtering UI. (`labels` table columns, `/api/labels` CRUD, Settings label manager with usage refresh.)

---

## 3. Core Feature Parity

- [ ] **Net worth dashboard parity**
  - [ ] Trend + allocation charts (Supabase-backed).
  - [ ] Asset/liability drawers with full forms (type select, notes, validation).
  - [ ] Snapshot timeline (create, view, delete).
- [ ] **Recurring income manager**
  - [ ] Editable streams (frequency, amount, next date).
  - [ ] Surplus routing rules to envelopes.
  - [ ] Summary + warning states when income < expenses.
- [x] **Duplicate resolution**
  - [ ] Drawer/modal to merge / keep separate / ignore.
  - [ ] Update transactions table (status badges, filtered views).
- [ ] **Transfer & rebalancing tools**
  - [ ] Functional transfer dialog with envelope selectors, validation, history log.
  - [ ] Optimisation helper (suggests top-ups based on deficits + upcoming dues).
- [ ] **Reporting & analytics**
  - [ ] Balance sheet + transaction exports (CSV/Excel).
  - [ ] Printable PDFs (Net worth, envelope summary).
  - [ ] Filters (date presets, account/envelope toggles).
- [ ] **Recurring income + zero-budget linkage**
  - [ ] Auto apply surplus allocation plans.
  - [ ] Celebration log stored in Supabase and shown in zero-budget manager.

---

## 4. User Experience Polish

- [ ] **Command palette** – quick nav + envelope/transaction search (⌘K shortcut).
- [ ] **Advanced filters** – date presets, label filters, amount ranges across reconcile + transactions + reports.
- [ ] **Keyboard shortcuts** – approve (A), split (S), label (L), etc., on reconcile + transactions.
- [ ] **Drag/drop ordering** – enable reordering for navigation sections, dashboard widgets, envelope categories.
- [ ] **Mobile-first parity**
  - [ ] Compact list layouts for dashboard, envelopes, reports, net worth.
  - [ ] Bottom sheets for transaction details (non-reconcile screens).
  - [ ] Swipe actions on transactions page.

---

## 5. Integrations & Automation

- [ ] **Akahu OAuth flow** – implement connect/disconnect, token storage, refresh.
- [ ] **Connection health** – status badges, last synced output, notification hooks.
- [ ] **Webhook processing** – Akahu events to update balances/envelopes automatically.
- [ ] **Background recalculations** – nightly jobs for envelope targets, net worth snapshots, savings goals.
- [ ] **Audit trail** – log significant actions (approvals, transfers, rule changes) with user + timestamp.

---

## 6. Launch Readiness

- [ ] **QA checklist** – regression tests against Replit behaviour (manual + automated Cypress/Playwright).
- [ ] **Docs update** – refresh README + user guide with new navigation, workflows.
- [ ] **Monitoring** – configure Supabase logging, error tracking (Sentry/Logtail), uptime alerts.
- [ ] **Cutover plan** – final switch script (data migration, DNS, env var rotation).
- [ ] **Sunset legacy** – archive Replit project, communicate change to users/coaches.

---

### Progress Tracking

- Update this checklist alongside `docs/replit-comparison.md` as features ship.
- When a section hits ✅, note the PR / Supabase migration IDs for audit purposes.
