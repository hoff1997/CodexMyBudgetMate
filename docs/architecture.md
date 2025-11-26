# My Budget Mate - Architecture Documentation

## Tech Stack

### Core Framework
- **Next.js 14.2+** - React framework with App Router
- **React 18** - UI library
- **TypeScript** - Type safety

### Backend & Database
- **Supabase** - Backend as a Service (PostgreSQL + Auth + Real-time)
- **@supabase/ssr** - Server-side auth for Next.js
- **PostgreSQL** - Relational database (via Supabase)

### State Management & Data Fetching
- **React Query (TanStack Query)** - Server state management
- **React Context** - Client state (Command Palette, etc.)

### UI & Styling
- **Tailwind CSS** - Utility-first CSS
- **shadcn/ui** - Component library built on Radix UI
- **Radix UI** - Headless accessible components
- **Lucide React** - Icon library

### Drag & Drop
- **@dnd-kit** - Modern drag and drop toolkit

## Authentication Flow

### Overview
Authentication uses Supabase Auth with server-side rendering (SSR) to maintain secure sessions.

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. User visits /login                                           │
│    → Server Component renders login form                        │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. User submits credentials                                     │
│    → POST /auth/sign-in (API Route)                            │
│    → Calls supabase.auth.signInWithPassword()                  │
│    → Sets HTTP-only cookies (sb-*-auth-token)                  │
│    → Returns redirect to /dashboard                            │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Browser navigates to /dashboard                              │
│    → Middleware intercepts request                              │
│    → Refreshes session (if needed)                              │
│    → Updates cookies with new expiry                            │
│    → Allows request to continue                                 │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. App Layout (Server Component)                                │
│    → Creates Supabase client (server.ts)                       │
│    → Calls getUser() to verify session                         │
│    → If no user: redirect to /login                            │
│    → If user exists: render Sidebar + children                 │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. Client-side API calls                                        │
│    → fetch() automatically includes credentials: 'include'     │
│    → Global fetch wrapper ensures cookies are sent             │
│    → API routes verify auth with getUser()                     │
│    → Return 401 if no valid session                            │
└─────────────────────────────────────────────────────────────────┘
```

### Key Components

#### 1. Middleware (`/middleware.ts`)
- Runs on EVERY request (except static files)
- Refreshes Supabase session before it expires
- Updates cookie expiry times
- Sets `secure: true` flag in production (HTTPS)

#### 2. Server Supabase Client (`/lib/supabase/server.ts`)
- **Critical File** - Do not modify without permission
- Uses `await cookies()` (Next.js 14.2+ requirement)
- `setAll()` is intentionally empty (read-only mode)
  - Prevents cookie deletion in Server Components
  - Cookie updates happen in middleware only

#### 3. Client Supabase Client (`/lib/supabase/client.ts`)
- For browser-side operations (rare)
- Uses localStorage for session persistence
- Most operations should use server client

#### 4. App Layout (`/app/(app)/layout.tsx`)
- Auth guard for all authenticated pages
- Calls `getUser()` to verify session
- Redirects to `/login` if no user
- Fetches user profile for personalization

#### 5. Fetch Wrapper (`/components/providers/app-providers.tsx`)
- Module-level initialization (runs once on import)
- Wraps global `fetch()` to add `credentials: 'include'`
- Ensures all same-origin requests send cookies
- **Critical**: Must remain at module level (not in component)

## Database Schema Overview

### Core Tables

#### `profiles`
- User profile information
- Links to auth.users (Supabase Auth)
- Stores onboarding status, preferences, persona

#### `accounts`
- Financial accounts (checking, savings, credit cards)
- Belongs to user via `user_id`
- Tracks balances and account types

#### `transactions`
- Financial transactions
- Links to accounts and envelopes
- Can be split across multiple envelopes

#### `envelopes`
- Budget categories (envelope budgeting system)
- Has target amounts and current balances
- Supports subtypes (e.g., bills, savings goals)

#### `goals`
- Savings goals with target amounts and deadlines
- Tracks progress towards financial objectives

#### `income_sources`
- Recurring income (salary, side income, etc.)
- Used for budget planning

### Relationships

```
users (Supabase Auth)
  ↓
profiles (user_id) ──────┐
  ↓                       │
accounts (user_id)        │
  ↓                       │
transactions              │
  ↓                       │
envelopes (user_id) ──────┘
  ↓
goals (user_id)
```

## API Route Structure

### Authentication Pattern (Template)

All API routes follow this pattern:

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  // 1. Create Supabase client
  const supabase = await createClient();

  // 2. Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 3. Perform database operations
  const { data, error: queryError } = await supabase
    .from("table_name")
    .select("*")
    .eq("user_id", user.id);

  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 400 });
  }

  // 4. Return data
  return NextResponse.json({ data });
}
```


### API Route Organization

```
/app/api
  /auth
    /sign-in/route.ts          - Login (POST)
    /sign-out/route.ts         - Logout (GET) - MUST NOT PREFETCH
    /sign-up/route.ts          - Registration (POST)
  /accounts/route.ts           - CRUD for accounts
  /transactions/route.ts       - CRUD for transactions
  /envelopes/route.ts          - CRUD for envelopes
  /goals/route.ts              - CRUD for goals
  /demo-mode
    /enter/route.ts            - Enter demo mode
    /exit/route.ts             - Exit demo mode
```

## Component Hierarchy

### Layout Components

```
AppProviders (Client Component - Global)
  ↓
RootLayout (Server Component)
  ↓
AppLayout (Server Component - Authenticated Routes)
  ↓
Sidebar (Client Component)
  ├─ Navigation Items (Draggable)
  ├─ Onboarding Menu (Conditional)
  └─ Sign Out Button (prefetch={false})
  ↓
Page Content
```

### Page Structure

```
/app/(app)/dashboard/page.tsx (Server Component)
  ↓ Fetches initial data
  ↓
DashboardShell (Client Component)
  ↓
CustomizableDashboard (Client Component)
  ├─ EnvelopeSummary Widget
  ├─ AccountsWidget
  ├─ GoalsWidget
  ├─ TransactionsWidget
  └─ (User can reorder with drag & drop)
```

## State Management Strategy

### Server State (React Query)
- All data fetching from API routes
- Caching and revalidation handled automatically
- Used in client components

Example:
```typescript
const { data: accounts } = useQuery({
  queryKey: ['accounts'],
  queryFn: async () => {
    const res = await fetch('/api/accounts');
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json();
  }
});
```

### Client State (React Context)
- UI state (modals, command palette)
- User preferences (theme, etc.)
- Not persisted (resets on page refresh)

### URL State (searchParams)
- Filters, sorting, pagination
- Shareable links
- Browser back/forward support

## Critical Performance Considerations

### Server Components by Default
- Use Server Components when possible (fetch data on server)
- Only add `"use client"` when needed:
  - Event handlers (onClick, onChange)
  - Hooks (useState, useEffect, useQuery)
  - Browser APIs (localStorage, window)

### Link Prefetching
- Next.js prefetches `<Link>` components by default
- **DANGER**: Prefetching API routes executes them!
- **Always** use `prefetch={false}` on links to API routes
- Example: `<Link href="/api/auth/sign-out" prefetch={false}>`

### React Query Configuration
- Retry: 1 (don't spam failed requests)
- refetchOnWindowFocus: false (reduce unnecessary requests)
- Custom cache times per query

## Environment Variables

### Required Variables (.env.local)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (server-only)

# App
NEXT_PUBLIC_SITE_URL=http://localhost:3000 (or https://your-app.vercel.app)
NODE_ENV=development (or production)
```

## Deployment (Vercel)

### Build Process
1. Next.js builds static pages and server functions
2. Environment variables injected from Vercel
3. Middleware compiled for Edge Runtime
4. Static files cached on CDN

### Important Settings
- Node.js Version: 18.x or higher
- Build Command: `npm run build`
- Output Directory: `.next`
- Install Command: `npm install`

### Environment Variables in Vercel
- Must add all NEXT_PUBLIC_* variables
- Must add SUPABASE_SERVICE_ROLE_KEY (not in git)
- Production URLs must use HTTPS (secure cookies)

## Common Gotchas

### 1. Cookies Not Sent
**Cause**: Fetch missing `credentials: 'include'`
**Solution**: Global wrapper handles this, but check if wrapper is running

### 2. Automatic Sign-Out
**Cause**: Link prefetching `/api/auth/sign-out`
**Solution**: Add `prefetch={false}` to all sign-out links

### 3. Cookie Deletion
**Cause**: `setAll()` trying to set cookies in Server Components
**Solution**: Keep `setAll()` empty in `/lib/supabase/server.ts`

### 4. Layout Crashes
**Cause**: Querying database with null user
**Solution**: Check `if (!user)` before any database queries

### 5. 401 Errors After Login
**Cause**: Middleware not updating cookies OR API route not reading them
**Solution**: Ensure middleware runs on route, check cookie reading in API

## Testing Checklist

After making changes, verify:

- [ ] Can log in successfully
- [ ] Can navigate between pages without logout
- [ ] API calls succeed (check Network tab for 200 responses)
- [ ] No console errors in browser
- [ ] No errors in Vercel logs (production)
- [ ] Manual sign-out works when clicking button
- [ ] No automatic redirects to /login or sign-out
