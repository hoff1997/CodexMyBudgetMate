# Replit-era Enhancements Tracker

This file maps the major improvements called out in `replit.md` to the fresh Next.js codebase.

## Implemented (placeholder-friendly)
- **Quick actions launcher**: `components/quick-actions/quick-actions-sheet.tsx` brings back the multi-form quick add with receipt upload, envelope creation, transfers, and asset capture.
- **Zero budget manager**: `app/(app)/envelope-summary/page.tsx` now hosts tabs with the original zero-budget workflow, editable targets, surplus guidance, and celebration messaging via `zero-budget-manager.tsx`.
- **Dashboard status**: `BudgetSummaryCards` shows the zero-budget delta and mirrors the smaller stats from the Replit dashboard.
- **Reconciliation centre**: `app/(app)/reconcile/page.tsx` + `reconcile-workbench.tsx` restore the filterable transaction grid, duplicate signals, inline actions, and quick approve semantics.
- **Transactions table**: `app/(app)/transactions/page.tsx` exposes description, bank reference/memo, receipt links, and status badges, matching the richer Replit editing surface (actions stubbed for now).
- **Banking schema**: Migration `supabase/migrations/0001_init.sql` now includes accounts, bank connections, labels, transaction rules, duplicate references, and receipt storage fields.
- **Settings hub**: `app/(app)/settings/page.tsx` documents the bank connection manager, Akahu credential inputs, duplicate sensitivity notes, and 2FA reminders.
- **Quick envelope planner**: `app/(app)/envelope-planning/page.tsx` + `planner-client.tsx` now restore annual targets, per-pay maths, progress bars, notes, and Supabase-backed updates that sync through settings & recurring income pages.
- **Merchant memory workspace**: `app/(app)/rules/page.tsx` and `app/(app)/interactions/page.tsx` bring back the rule editor, suggestion feed, automation metrics, and best-practice tips from the Replit build.

## Still to wire up
- **Supabase mutations** for quick actions, reconciliation approvals, splits, and label management.
- **Label CRUD** flows with colour pickers and assignment chips across pages.
- **Receipt storage** uploader hooked into Supabase Storage and connected to Akahu imports.
- **Duplicate detection logic** implemented server-side (current UI only signals potential matches).
- **CSV import endpoints** and bank memo parsing to migrate the Replit import dialog.
- **Debt freedom calculators** and net worth charts (placeholders exist but need Supabase + charting libs).
- **Mobile bottom navigation** and the contextual action sheet for mobile devices.
- **Celebration history** persistence to back the zero-budget success banner.

Track progress here so we keep parity with the well-loved Replit version while pushing the new stack forward.
