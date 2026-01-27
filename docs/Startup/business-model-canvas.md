# My Budget Mate – Business Model Canvas

## Customer Segments
- Households seeking zero-based budgeting with clear per-pay planning.
- Financial coaches and advisors who need shared tooling to guide clients.
- Small businesses or sole traders wanting envelope-style cash-flow management.
- Early adopters testing banking integrations in the New Zealand market.

## Value Propositions
- Unified envelope planning, summary, and zero-budget manager aligned with real cashflow.
- Automated recurring income allocation, transaction rules, and bank reconciliation powered by Akahu integrations.
- Demo-ready environment (single-click data seeding) for trials, coaching sessions, and onboarding.
- Cross-device Supabase-backed experience with secure auth and future 2FA support.
- Insightful dashboards (budget overview, reports, net-worth, debt) connecting planner maths to analytics.

## Channels
- Web application deployed on Vercel with Supabase backend.
- Email onboarding via Supabase magic-link authentication.
- Demo presentations and coaching sessions using seeded data.
- Documentation and marketing site accessible at `/`.

## Customer Relationships
- Self-service onboarding with option to load demo data.
- Guided onboarding for early-access cohorts (email invitations).
- Support through in-app feature guides (e.g., envelopes, planner, zero-budget manager).
- Community/coach partnerships for continuous feedback loops.

## Revenue Streams
- Subscription plans for households (monthly/annual).
- Tiered coach/partner licences for managing multiple clients.
- Potential add-ons: advanced analytics, multi-bank aggregation, shared family budgets.
- Future premium modules (e.g., debt snowball automation, investment tracking).

## Key Resources
- Supabase infrastructure (Postgres, Auth, Storage).
- Vercel hosting and CI/CD pipeline.
- Akahu API integration for NZ banking data.
- Frontend component library (shadcn UI) with reusable layouts and sidebar navigation.
- Demo data seeding tooling (`/api/seed`, `lib/demo/seed.ts`) for consistent sample datasets.

## Key Activities
- Maintain budgeting features (envelope planner, zero-budget manager, recurring income flows).
- Expand automation (transaction rules, pay-plan sync job).
- Ship new reports/analytics and ensure parity with Replit legacy features.
- Support secure authentication and onboarding flows (magic links, future 2FA).
- Engage with users/coaches for feedback and roadmap validation.

## Key Partners
- Akahu (bank data connectivity).
- Supabase (database, authentication, storage).
- Financial coaches and beta testers providing domain insights.
- Payment processors (future subscription billing).

## Cost Structure
- Hosting and database costs (Vercel, Supabase).
- Akahu API usage fees.
- Payment processing fees (future Stripe or equivalent).
- Development/design resources to keep feature parity and improve UX.
- Support/operations for onboarding and customer success.
