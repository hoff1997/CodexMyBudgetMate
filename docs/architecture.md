# My Budget Mate Architecture & Guardrails

This document captures the immovable pieces of the Next.js application so future work stays aligned with the migration plan.

## Components that must not move or be renamed

- `app/(app)/layout.tsx`: Global shell that injects providers (e.g. command palette). Every app route assumes this layout exists.
- `components/layout/sidebar.tsx`: DnD-aware navigation; other code imports it by path and relies on the `Sidebar` default export.
- `components/layout/overview/budget-overview.tsx`: Server component that orchestrates Supabase fetch + client widget grid. Budgets pages assume this module name.
- `components/layout/settings/settings-client.tsx`: Holds bank connection management logic referenced from multiple routes (settings page and Akahu callback flash messaging).
- `components/layout/envelopes/envelope-summary-client.tsx`: Required by zero-budget manager and command palette actions.
- `components/layout/transactions/transactions-table.tsx` and `app/(app)/reconcile/reconcile-workbench.tsx`: Contain keyboard shortcut wiring; other utilities import their helper signatures.
- `components/layout/overview/dashboard-widget-grid.tsx`: Shared DnD widget grid – consumers expect this file path.
- `components/ui/bottom-sheet.tsx` and `components/ui/command-sheet.tsx`: Canonical Radix wrappers; the design system depends on these names.

## Fixed folder / file structure

- `app/(app)/*`: Route groups mirror the Replit navigation. Do not restructure without updating command palette actions and breadcrumbs.
- `app/api/*`: REST endpoints map 1:1 with Supabase RPC expectations; moving files breaks edge functions, cron, and Akahu integration.
- `components/layout/**`: Layout components are organised by domain (overview, envelopes, settings, etc.). Keep this hierarchy so feature-specific children resolve predictable imports.
- `lib/jobs/*`: Validated by cron runner—filenames must stay (`akahu-sync.ts`, `envelope-recalc.ts`).
- `supabase/migrations/*`: Migration history is append-only; do not delete or reorder files.
- `providers/command-palette-provider.tsx`: Root provider consumed by `app/(app)/layout.tsx`.

## Style / UI scaffolding that is immutable

- Shadcn UI primitives (`components/ui/*`) must keep their exported names and prop signatures; other components destructure them directly.
- Design tokens (Tailwind config) expect semantic classes used in layout files. Avoid renaming `bg-muted`, `text-secondary`, etc.
- Command palette styling (`components/ui/command-sheet.tsx`) defines overlay/backdrop classes used in hotkey hints—keep structure intact.
- Mobile bottom-sheet (`components/ui/bottom-sheet.tsx`) controls animation + accessibility attributes; do not change markup or class names without auditing consumers.

## Data flow, API contracts, and schema rules

- Supabase client usage:
  - Server components/routes must import from `@/lib/supabase/server` or `service` helper; client components use the anonymous client.
  - All mutations should go through `/app/api/...` routes to enforce RLS policies.
- Akahu integration:
  - `/app/(app)/akahu/callback/page.tsx` exchanges codes and upserts `akahu_tokens` + `bank_connections`. Maintain `metadata[user_id]` query param in connect URLs.
  - `/app/api/akahu/connection/route.ts` is the single entry point for refresh/disconnect. Front-end buttons must call this endpoint.
  - `/app/api/webhooks/akahu/route.ts` logs events and upserts connection status; Akahu webhook secret must remain `AKAHU_WEBHOOK_SECRET`.
- Background jobs:
  - `/app/api/jobs/run/route.ts` expects `task` query (`all`, `akahu`, `envelopes`). Edge function (`supabase/functions/jobs-runner`) posts here with `CRON_SECRET`.
  - `lib/jobs/akahu-sync.ts` refreshes tokens and logs audit events; do not change return payload shape (`tokens`, `refreshed`, `successes`, `failures`, `timestamp`).
- Database schema guardrails:
  - Tables: `akahu_tokens`, `bank_connections`, `akahu_webhook_events`, `audit_logs` must keep columns introduced in migration `0010_integrations.sql`.
  - RLS policies allow users to read their own audit logs/webhook events; any future policy must preserve that access.
  - `bank_connections` unique constraint (`user_id, provider`) must remain.
  - `akahu_tokens` needs expiry columns (`access_token_expires_at`, `refresh_token_expires_at`, `scopes`); integrations rely on them being nullable but present.

Keep this document updated whenever architecture-level decisions change, especially if new global providers, migrations, or API contracts are introduced.

> 🔁 **Reminder:** Before redesigning or improving any shared component, layout, API contract, or data flow covered here, review this document and update it as part of the change.
