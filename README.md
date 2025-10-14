# My Budget Mate (Next.js rebuild)

Fresh Next.js 14 + Supabase foundation for the My Budget Mate budgeting platform, now optimised for local VS Code development, GitHub collaboration, Vercel hosting, and Akahu-powered bank connectivity.

## Tech stack
- **Next.js 14 (App Router)**: Vercel-first React framework with server actions
- **TypeScript + ESLint + Prettier**: Strict type safety and formatting
- **Tailwind CSS + shadcn/ui primitives**: Consistent UI system ("New York" theme)
- **Supabase**: Auth, PostgreSQL, storage, and row level security
- **Akahu**: Secure New Zealand bank connections and transaction sync
- **TanStack Query**: Frontend data fetching & cache

## Prerequisites
- Node.js v18.18+ or v20+
- pnpm / npm / yarn (examples below use `npm`)
- Supabase project (free tier is fine)
- Akahu partner credentials (app token, client id/secret)

## Getting started locally (VS Code friendly)
1. Install dependencies
   ```bash
   npm install
   ```
2. Copy environment template and populate secrets
   ```bash
   cp .env.example .env.local
   ```
   Required keys:
   - `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from Supabase
   - `SUPABASE_SERVICE_ROLE_KEY` & `SUPABASE_JWT_SECRET` (used for migrations / background tasks)
   - `AKAHU_APP_TOKEN`, `AKAHU_CLIENT_ID`, `AKAHU_CLIENT_SECRET`, `AKAHU_REDIRECT_URI`
   - `NEXT_PUBLIC_SITE_URL` (e.g. `http://localhost:3000` for local dev)
3. Run the dev server
   ```bash
   npm run dev
   ```
4. Open VS Code (`code .`) and install the recommended extensions when prompted.

## Supabase setup
1. Create a new project and grab the API keys.
2. Run the base schema
   ```bash
   supabase db push --file supabase/migrations/0001_init.sql
   ```
   or paste the file contents into the Supabase SQL editor and execute.
3. Enable email magic links in the Supabase Auth settings (Under **Authentication → Providers → Email**).
4. Add redirect URL `http://localhost:3000/auth/callback` (and your Vercel domain equivalent) under **Authentication → URL configuration**.

## Akahu integration flow
1. Create an Akahu app and request production access if required.
2. Set the redirect URI to match `AKAHU_REDIRECT_URI` – e.g. `https://your-site.vercel.app/integrations/akahu/callback`.
3. Users authorise via Akahu, you receive a `code`, and call `POST /api/akahu/link` with that code.
4. The route exchanges the code for an access + refresh token pair which is stored in `akahu_tokens`.
5. Use the `GET /api/akahu/transactions` endpoint to pull transactions for the authenticated user.

> ℹ️  Transaction ingestion is intentionally light-touch right now. Extend `app/api/akahu/transactions/route.ts` to map Akahu payloads into Supabase `transactions` and envelope logic.

## Deployment (Vercel)
1. Push this repo to GitHub.
2. In Vercel, `Import Project` → select the GitHub repository.
3. Set the environment variables in Vercel (Settings → Environment Variables).
4. Trigger a deployment. Vercel will run `npm install`, `npm run build`, then `npm start` automatically.

## GitHub workflow tips
- Commit frequently. Use feature branches for Supabase/Akahu work.
- Add CI later using GitHub Actions (e.g. lint + typecheck).
- Protect `main` once the team grows and require status checks to pass.

## Project structure
```
app/                  # Next.js app router
  (auth)/             # Auth routes (magic-link login)
  api/                # Route handlers (Supabase + Akahu)
  dashboard/          # Authenticated budgeting UI
components/           # shadcn/ui components + layout shell
lib/                  # Supabase clients, Akahu SDK, helpers
public/               # Static assets
supabase/migrations/  # Database schema managed outside Replit
.vscode/              # Workspace defaults
```

## Next steps
- Flesh out budgeting flows (create envelopes, allocate income, reconcile transactions)
- Add mobile navigation + responsive cards per original Replit version
- Automate Akahu ingestion into Supabase using cron/edge functions
- Add Playwright/Vitest tests once core flows are locked in

Keen for feedback—shout if you’d like me to port more of the Replit UI or wire up specific journeys next.
