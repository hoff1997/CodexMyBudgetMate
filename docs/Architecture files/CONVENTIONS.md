# My Budget Mate - Code Conventions

## File Naming Conventions

### Pages (App Router)
- **Pattern**: `kebab-case`
- **Examples**:
  - `/app/(app)/dashboard/page.tsx`
  - `/app/(app)/envelope-summary/page.tsx`
  - `/app/(app)/budget-manager/page.tsx`

### Components
- **Pattern**: `kebab-case.tsx`
- **Examples**:
  - `/components/layout/sidebar.tsx`
  - `/components/dashboard/envelope-summary-widget.tsx`
  - `/components/ui/button.tsx`

### API Routes
- **Pattern**: `kebab-case/route.ts`
- **Examples**:
  - `/app/api/accounts/route.ts`
  - `/app/api/auth/sign-in/route.ts`
  - `/app/api/demo-mode/enter/route.ts`

### Utilities & Libs
- **Pattern**: `kebab-case.ts`
- **Examples**:
  - `/lib/supabase/server.ts`
  - `/lib/utils.ts`
  - `/lib/hooks/use-toast.ts`

## Component Patterns

### Server Components (Default)
Use Server Components by default. They can:
- Fetch data directly from database
- Use async/await
- Access environment variables safely
- Render on the server (faster initial load)

```typescript
// app/(app)/dashboard/page.tsx
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: accounts } = await supabase
    .from("accounts")
    .select("*");

  return <div>{/* Render accounts */}</div>;
}
```

### Client Components
Add `"use client"` directive when you need:
- Event handlers (onClick, onChange, onSubmit)
- React hooks (useState, useEffect, useQuery)
- Browser APIs (window, localStorage, document)
- Third-party libraries that require window/document

```typescript
// components/dashboard/account-card.tsx
"use client";

import { useState } from "react";

export function AccountCard({ account }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div onClick={() => setIsExpanded(!isExpanded)}>
      {/* Component content */}
    </div>
  );
}
```

## Creating New API Routes

### Template with Authentication

All authenticated API routes should follow this pattern:

```typescript
// app/api/your-route/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET request
export async function GET(request: Request) {
  // 1. Create Supabase client (MUST await!)
  const supabase = await createClient();

  // 2. Verify authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 3. Parse URL params if needed
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  // 4. Query database (always filter by user_id!)
  const { data, error: queryError } = await supabase
    .from("your_table")
    .select("*")
    .eq("user_id", user.id);  // IMPORTANT: Filter by user!

  if (queryError) {
    return NextResponse.json(
      { error: queryError.message },
      { status: 400 }
    );
  }

  // 5. Return data
  return NextResponse.json({ data });
}

// POST request
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse request body
  const body = await request.json();

  // Insert data (include user_id!)
  const { data, error: insertError } = await supabase
    .from("your_table")
    .insert({
      ...body,
      user_id: user.id,  // IMPORTANT: Set user_id!
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json(
      { error: insertError.message },
      { status: 400 }
    );
  }

  return NextResponse.json({ data }, { status: 201 });
}
```

## Best Practices

### 1. Always Use htmlFor (Not for)
```typescript
//  Correct
<label htmlFor="email">Email</label>
<input id="email" />

// L Wrong
<label for="email">Email</label>
```

### 2. Always Add prefetch={false} to API Route Links
```typescript
//  Correct
<Link href="/api/auth/sign-out" prefetch={false}>Sign out</Link>

// L Wrong (will prefetch and execute!)
<Link href="/api/auth/sign-out">Sign out</Link>
```

### 3. Always Filter by user_id in Queries
```typescript
//  Correct
const { data } = await supabase
  .from("accounts")
  .select("*")
  .eq("user_id", user.id);

// L Wrong (returns ALL users' data!)
const { data } = await supabase
  .from("accounts")
  .select("*");
```

### 4. Always Await createClient()
```typescript
//  Correct (Next.js 14.2+)
const supabase = await createClient();

// L Wrong (will fail silently)
const supabase = createClient();
```

### 5. Use Appropriate HTTP Status Codes
```typescript
// 200: Success
return NextResponse.json({ data });

// 201: Created
return NextResponse.json({ data }, { status: 201 });

// 400: Bad Request (client error)
return NextResponse.json({ error: "Invalid input" }, { status: 400 });

// 401: Unauthorized (no auth)
return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

// 404: Not Found
return NextResponse.json({ error: "Not found" }, { status: 404 });

// 500: Internal Server Error
return NextResponse.json({ error: "Server error" }, { status: 500 });
```

## Security Conventions

### Never Hardcode Secrets

**NEVER** hardcode API keys, JWT tokens, passwords, or any secrets in source code files:

```typescript
// ❌ WRONG - hardcoded secret
const supabase = createClient('https://xxx.supabase.co', 'eyJhbGciOiJIUzI1NiIs...');

// ✅ CORRECT - use environment variables
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

### Scripts Policy

- All development/debug scripts must use `process.env` for secrets
- Scripts are blocked from git by `.gitignore` rules (`scripts/*.mjs`, `scripts/*.js`, `scripts/*.ts`)
- Never commit scripts containing database queries, API keys, or user data
- If you need a temporary script, create it in the `scripts/` directory (it will be gitignored)

### Pre-Commit Hook

A pre-commit hook in `.githooks/pre-commit` automatically scans staged files for:
- JWT tokens (Supabase keys)
- Stripe secret keys (`sk_live_`, `sk_test_`, `whsec_`)
- Akahu secrets
- Hardcoded passwords
- Private keys

The hook is auto-configured via `npm prepare` (runs `git config core.hooksPath .githooks`).

**If the hook blocks your commit:**
1. Remove the secret and use an environment variable instead
2. If it's a false positive, use `git commit --no-verify` (emergency only)

### Environment Variables

| Variable | Where Used | Public? |
|----------|-----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | **No** |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client | Yes |
| `STRIPE_SECRET_KEY` | Server only | **No** |
| `STRIPE_WEBHOOK_SECRET` | Server only | **No** |
| `AKAHU_CLIENT_SECRET` | Server only | **No** |
| `AKAHU_WEBHOOK_SECRET` | Server only | **No** |
| `BETA_MODE` | Server | Yes |
| `WAITLIST_MODE` | Server | Yes |

### React Query Hook Pattern

When creating new data-fetching hooks, follow the established React Query pattern:

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useMyData() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["my-data"],
    queryFn: async () => {
      const res = await fetch("/api/my-data");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const updateData = useMutation({
    mutationFn: async (updates: Partial<MyData>) => {
      const res = await fetch("/api/my-data", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-data"] });
    },
  });

  return { data, isLoading, error, updateData };
}
```

### Icon Library

The project uses **Phosphor Icons** (`@phosphor-icons/react`) for envelope and UI icons alongside **Lucide React** for general UI icons.

```typescript
// Phosphor Icons - for envelope icons and rich icon picker
import { House, ShoppingCart, Heart } from "@phosphor-icons/react";

// Lucide React - for general UI icons (buttons, navigation, etc.)
import { ChevronDown, X, Plus } from "lucide-react";
```

**Icon Components:**
- `EnvelopeIcon` (`components/shared/envelope-icon.tsx`) - Renders Phosphor icons by name
- `DoodleIconPicker` (`components/onboarding/doodle-icon-picker.tsx`) - Full icon picker with search and categories
- Icon registry: `lib/icons/phosphor-registry.ts`
