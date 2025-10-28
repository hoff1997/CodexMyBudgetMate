# Previous Replit Pages vs Next.js Implementation

Snapshot of feature parity between the legacy Replit screens (stored in `Previous replit pages/`) and the new Next.js build.

| Replit screen | Current Next.js route | Status | Notable gaps / to-do items |
| --- | --- | --- | --- |
| `replitlanding.tsx` (marketing) | `app/page.tsx` | ✅ Ported | Hero, features grid, testimonials, FAQs, and footer now migrated within new design system. |
| `replitlogin.tsx`, `replitauth-demo.tsx` | `app/(auth)/login/page.tsx` | ✅ Ported | Branded hero, help cards, demo-mode guidance, and Supabase magic-link flow restored. |
| `replitdashboard.tsx` | `app/(app)/dashboard/page.tsx` | ✅ Ported | Dashboard now includes income vs expense widget, overdue envelopes, quick actions, and celebration timeline alongside summary cards and recent transactions. |
| `replitenvelope-planning.tsx` | `app/(app)/envelope-planning/page.tsx` + `planner-client.tsx` | ✅ Ported | Annual/target/per-pay maths, due-date progress bars, notes, Supabase patch route in place. Remaining: category grouping, CSV export, add/transfer dialogs, seeding helper. |
| `replitenvelope-summary.tsx` | `app/(app)/envelope-summary/page.tsx` | ✅ Ported | Summary tab now includes grouped cards with status badges, per-pay pills, filters, quick edit sheet, and mobile bottom navigation. |
| `replitzero-budget-setup-backup.tsx` | `Tabs` inside envelope summary | ✅ Ported | Zero-budget manager now includes history drawer, celebration overlay, and surplus allocation prompts. |
| `replitenvelopes.tsx`, `replitenvelopes-new.tsx`, `replitenvelope-balances.tsx` | `app/(app)/envelopes/page.tsx` | ✅ Ported | Envelope manager now includes filtered table, quick add, edit sheet, and transfer dialog synced with Supabase. |
| `replitreconciliation.tsx`, `replitreconciliation-main.tsx` | `app/(app)/reconcile/page.tsx` + `reconcile-workbench.tsx` | ✅ Ported | Added smart suggestions banner, CSV import dialog, receipt upload modal, inline split editor, and mobile bottom nav; ready for Supabase wiring. |
| `replitrecurring-income.tsx` | `app/(app)/recurring-income/page.tsx` | ✅ Ported | Adds editable income streams, per-pay timeline, allocation breakdown, and planner integration points. |
| `replitaccounts.tsx` | `app/(app)/accounts/page.tsx` | ✅ Ported | Accounts dashboard now has metrics, search/filter, add/edit drawer, and reconciled controls with mobile nav. |
| `replitnet-worth.tsx` | `app/(app)/net-worth/page.tsx` | ✅ Ported | Adds asset/liability drawers, pie allocation, sparkline timeline, snapshot history, and Supabase-backed CRUD endpoints. |
| `replitdebt-management.tsx`, `replitzero-budget-setup-backup.tsx` (debt portions) | `app/(app)/debt-management/page.tsx` | ✅ Ported | Interactive dashboard includes strategy tabs, payoff calculator, milestones, quick actions, and Supabase-backed liabilities/envelopes. |
| `replitreports.tsx` | `app/(app)/reports/page.tsx` | ✅ Ported | Reports dashboard now includes spending vs plan bars, income trend sparkline, debt payoff summary, and export actions with Supabase data + demo fallback. |
| `replitsettings.tsx` | `app/(app)/settings/page.tsx` | ✅ Ported | Settings hub now includes profile avatar upload, label manager, bank connection tabs with webhooks, and 2FA guidance alongside envelope sync. |
| `replitrules.tsx` | `app/(app)/rules/page.tsx` | ✅ Ported | Rules dashboard now loads Supabase data (with demo fallback), supports rule create/toggle/delete, and shows automation insights. |
| `replitrules.tsx` (duplicate in interactions) | `app/(app)/interactions/page.tsx` | ✅ Ported | Interactions dashboard now mirrors the suggestion feed and activity timeline, ready to consume live approvals once APIs land. |
| `replitrules.tsx` referenced features | `docs/replit-upgrade-checklist.md` | Updated | Checklist now only tracks backend/API wiring for merchant rules since UI + interactions are live (see item #23 for backend follow-up). |
| `replitreconciliation-main.tsx` (mobile) | `app/(app)/reconcile/page.tsx` | ✅ Ported | Mobile list now supports swipe-to-act cards, bottom action sheet, and dedicated layout alongside the desktop table. |
| `replitnot-found.tsx`, `replitprivacy-policy.tsx` | 404 + policies | ✅ Ported | `app/not-found.tsx`, `app/privacy/page.tsx`, and `app/terms/page.tsx` restore the custom error and policy pages. |

Legend: ✅ Ported/parity  · ⚠️ Partially ported  · ❌ Missing

Use this checklist as the backlog for parity work. |

## Marketing Feature Audit (from `FEATURES_MARKETING.md`)

| Feature area | Marketing promise | Status | Notes / follow-up |
| --- | --- | --- | --- |
| Smart envelope cards | Visual cards with colour-coded progress bars on envelopes | ⚠️ Partial | Dashboard and summary show balances; need per-envelope cards with status badges & category grouping plus drag-to-reorder. |
| Category organisation | Drag-and-drop envelope grouping, collapsible categories | ✅ Implemented | Envelope summary groups by category, supports collapse/expand, and drag-to-reorder with order persistence. |
| Real-time balance tracking | Live envelope updates after transactions | ⚠️ Partial | Planner + dashboard read Supabase values; need transaction mutations to trigger optimistic updates. |
| Budget scheduling | Flexible frequencies with due date support | ✅ Implemented | Planner handles frequencies and due date progress. |
| Spending account flags | Mark envelopes without projections | ✅ Implemented | New spending flag toggles in summary edit form, adds filters/badges, and persists per-envelope. |
| Zero budget manager | Celebration widgets, surplus suggestions, overspend alerts | ✅ Implemented | Zero-budget tab now includes celebration overlay/history, surplus allocation helper, and overspend alerts mirroring the Replit workflow. |
| Pending approval workflow | Transactions require approval before posting | ✅ Implemented | Reconcile workbench now hits `/api/transactions/[id]/approve` with optimistic UI states and mobile/desktop controls. |
| Merchant memory & rules | Auto suggestions & rule editor | ✅ Implemented | Rules + interactions pages hit Supabase (create/toggle/delete) and surface live automation metrics. |
| Transaction splitting | Split UI with validation indicators | ✅ Implemented | Split editor now has validation, clipboard-friendly saves, and hits `/api/transactions/[id]/split`. |
| Receipt upload | 5 MB file upload with validation | ✅ Implemented | Receipt dialog now enforces size/type, uses API to get upload URL, PUTs to storage, and updates transactions. |
| Duplicate detection & resolution | Fuzzy match plus merge/keep/delete dialog | ⚠️ Partial | Duplicate badges present but no resolution UI/logic yet. |
| Reconciliation centre | Inline assignment, bulk processing, real-time balances | ⚠️ Partial | Inline buttons exist; build bulk approve, account vs envelope summary, mobile nav, CSV import modal. |
| Bank integration & automation | Akahu OAuth, sync scheduling, connection health | ⚠️ Partial | Settings UI covers Akahu tips + webhooks; still need live OAuth flow and background jobs. |
| Net worth tracking | Charts, trend analysis, CRUD for assets/liabilities | ⚠️ Partial | Totals table live; add forms, charts, history snapshots. |
| Debt freedom tools | Payoff calculator, strategy comparison, milestones | ❌ Missing | Debt management page still static copy. |
| Recurring income management | Automated envelope distribution, surplus routing | ⚠️ Partial | Monthly totals vs needs computed; need editable income streams + auto distribution rules. |
| Mobile-first UX | Bottom nav, swipe gestures, compact rows | ⚠️ Partial | Mobile nav/swipe added on reconcile/debt, but remaining views need compact layouts. |
| Desktop productivity | Collapsible sidebar (✅), plus drag/drop, keyboard shortcuts | ⚠️ Partial | Sidebar collapses; still need cross-app DnD ordering and keyboard shortcuts. |
| Intelligent search & filtering | Command palette envelope selection, transaction search, date presets | ⚠️ Partial | Planner uses basic selects; still need command palette, advanced filters, and date presets. |
| Reporting & analytics | Balance/transaction reports, CSV/Excel export, print | ❌ Missing | Reports page placeholder; build reporting suite. |
| Transfer & rebalancing tools | Transfer dialog, history log, optimisation suggestions | ❌ Missing | Transfer dialog exists, but no API/history/optimisation yet. |
| Label & organisation system | CRUD labels, coloured chips, smart suggestions | ❌ Missing | Schema ready; build UI & apply labels throughout app. |
| Account management | Multi-account CRUD, icons, opening balance wizard | ⚠️ Partial | Accounts table lacks CRUD dialogs, icons, reconciled toggle. |
| Guided onboarding | Account/envelope wizard, demo data toggle | ❌ Missing | Getting Started page static; implement guided flow. |
| Data import/export | Excel/CSV import, backups, preferences | ❌ Missing | CSV import not wired; add export & preferences UI. |
| Security & reliability | 2FA setup, audit trail, validation | ⚠️ Partial | Auth helpers exist; implement 2FA UI, audit logs. |
| Performance & scalability | Optimistic updates, efficient caching, responsive design | ⚠️ Partial | React Query used in planner; extend across transactions/reconciliation with optimistic mutations. |
| NZ localisation | Merchant recognition, IRD handling, local products | ❌ Missing | Only basic locale formatting; add NZ-specific logic. |
Credit card holding balance
I took a look and the pending work here is still blocked: we don’t yet have transaction mutation endpoints (approve, assign, split, etc.), so there’s nothing to trigger the “real-time balance tracking” behaviour. Once those APIs exist, we can wire optimistic updates so envelopes refresh immediately after actions. For now, this item remains outstanding.
