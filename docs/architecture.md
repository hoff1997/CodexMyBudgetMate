# Architecture Notes

## Layout system

- `app/(app)/layout.tsx` is responsible for mounting the universal sidebar (`components/layout/sidebar.tsx`).  
  No page-level layout should re-render the sidebar. When you build a new route, rely on the shared layout and only add route-specific UI inside the page component.  
- Any future change that requires modifying the navigation must be done inside the shared sidebar component or the global layout.

## Demo data helper

- `/api/seed` calls `lib/demo/seed.ts` to populate demo envelopes, recurring income, transactions, accounts, liabilities, net worth snapshots, and rules. Reuse this helper if you need to seed additional features so the sample dataset stays consistent.***
