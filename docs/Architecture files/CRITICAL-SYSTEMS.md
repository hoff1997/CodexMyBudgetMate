# Critical Systems - DO NOT MODIFY WITHOUT PERMISSION

This document outlines the critical files in the codebase that control authentication, cookie handling, and session management. These files were debugged extensively and any modifications could break the authentication flow.

---

## 🔴 CRITICAL FILES - ASK BEFORE MODIFYING

###  1. `/lib/supabase/server.ts`
**Purpose**: Creates Supabase client for Server Components and API Routes

**Why It's Critical**:
- Controls how cookies are read and written in server contexts
- Took hours to debug cookie deletion issue
- Any changes to `setAll()` could break authentication

**Key Implementation Details**:

```typescript
export async function createClient() {
  const cookieStore = await cookies();  // MUST await (Next.js 14.2+)

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // CRITICAL: This must remain EMPTY
          // In Server Components/API Routes, we can only READ cookies
          // Session refresh and cookie updates happen in middleware
          // Attempting to set cookies here causes them to be DELETED
        },
      },
    },
  );
}
```

**What NOT To Do**:
- ❌ Remove `await` from `await cookies()`
- ❌ Add cookie-setting logic to `setAll()`
- ❌ Change the cookie reading logic in `getAll()`
- ❌ Remove the read-only comment in `setAll()`

**What Happens If You Break It**:
- Users get automatically logged out
- Cookies are deleted instead of being preserved
- 401 Unauthorized errors on all API calls

---

### 2. `/lib/supabase/client.ts`
**Purpose**: Creates Supabase client for browser/client-side operations

**Why It's Critical**:
- Used rarely (most operations use server client)
- Controls browser-side session persistence
- Uses localStorage for session storage

**Key Implementation**:

```typescript
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

**What NOT To Do**:
- ❌ Change to use cookies instead of localStorage
- ❌ Add custom cookie handling logic

---

### 3. `/middleware.ts`
**Purpose**: Refreshes Supabase sessions and updates cookies

**Why It's Critical**:
- Runs on EVERY request before pages load
- Only place where cookies can be SET in response
- Prevents sessions from expiring
- Sets `secure: true` flag for production (HTTPS)

**Key Implementation**:

```typescript
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // Set cookie in request (for current request)
          request.cookies.set({
            name,
            value,
            ...options,
          });

          // Set cookie in response (for browser)
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });

          const cookieOptions = {
            ...options,
            secure: process.env.NODE_ENV === 'production',  // CRITICAL for Vercel
            sameSite: (options?.sameSite as 'lax' | 'strict' | 'none' | undefined) || 'lax',
          };

          response.cookies.set(name, value, cookieOptions);
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          });

          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });

          response.cookies.set(name, '', options);
        },
      },
    },
  );

  // Refresh session (updates cookie expiry)
  await supabase.auth.getUser();

  return response;
}
```

**What NOT To Do**:
- ❌ Remove `secure: true` in production
- ❌ Skip calling `getUser()` (this refreshes the session!)
- ❌ Remove middleware from certain routes (all authenticated routes need it)
- ❌ Change the cookie setting logic

**What Happens If You Break It**:
- Sessions expire and users get logged out
- Cookies don't have secure flag (breaks HTTPS)
- Session refresh stops working

---

### 4. `/app/auth/sign-in/route.ts`
**Purpose**: Handles user login and sets authentication cookies

**Why It's Critical**:
- First place where auth cookies are set
- Must use middleware-compatible cookie setting
- Returns proper redirects after login

**Key Implementation**:

```typescript
export async function POST(request: Request) {
  const supabase = await createClient();
  const { email, password } = await request.json();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  // Cookies are automatically set by Supabase client
  // Middleware will handle setting secure flag

  return NextResponse.json({ user: data.user });
}
```

**What NOT To Do**:
- ❌ Manually set cookies (Supabase handles this)
- ❌ Remove error handling
- ❌ Change the response structure

---

### 5. `/components/providers/app-providers.tsx`
**Purpose**: Global fetch wrapper that adds `credentials: 'include'` to all same-origin requests

**Why It's Critical**:
- Must run at MODULE LEVEL (not in component render)
- Ensures ALL fetch calls send cookies
- Prevents race conditions

**Key Implementation**:

```typescript
// MODULE LEVEL - Runs once when file is imported
if (typeof window !== "undefined") {
  const originalFetch = window.fetch;

  // Only override if not already overridden
  if (!window.fetch.toString().includes("credentials")) {
    window.fetch = function fetchWithCredentials(input, init?) {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const isSameOrigin = url.startsWith("/") || url.startsWith(window.location.origin);

      if (isSameOrigin) {
        return originalFetch(input, {
          ...init,
          credentials: "include",  // CRITICAL: Sends cookies
        });
      }

      return originalFetch(input, init);
    };
  }
}

export default function AppProviders({ children }: { children: ReactNode }) {
  // ... Provider setup ...
}
```

**What NOT To Do**:
- ❌ Move fetch wrapper INSIDE the component (causes race condition)
- ❌ Remove the `credentials: "include"`
- ❌ Remove the same-origin check
- ❌ Remove the guard against double-overriding

**What Happens If You Break It**:
- API calls don't send cookies
- 401 Unauthorized errors on all authenticated requests
- Users appear logged out even though they're not

---

### 6. `/app/(app)/layout.tsx`
**Purpose**: Auth guard for all authenticated pages

**Why It's Critical**:
- Verifies user is logged in before rendering pages
- Redirects to login if no session
- Was causing crashes when user was null

**Key Implementation**:

```typescript
export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  // Auth guard - redirect to login if no user
  if (!user) {
    redirect('/login');
  }

  // Fetch user profile ONLY after confirming user exists
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed, show_onboarding_menu')
    .eq('id', user.id)
    .maybeSingle();  // CRITICAL: Use maybeSingle(), not single()

  return (
    <CommandPaletteProvider>
      <Sidebar userEmail={user?.email} showOnboardingMenu={showOnboarding}>
        {children}
      </Sidebar>
    </CommandPaletteProvider>
  );
}
```

**What NOT To Do**:
- ❌ Remove the `if (!user)` check
- ❌ Query database before checking if user exists
- ❌ Use `.single()` instead of `.maybeSingle()` (throws error if no row)
- ❌ Remove the redirect to `/login`

**What Happens If You Break It**:
- Layout crashes when no user
- Next.js automatically calls `/api/auth/sign-out` as recovery
- Users get logged out unexpectedly

---

### 7. Components with Sign-Out Links

**Files**:
- `/components/layout/sidebar.tsx` (line 238)
- `/components/layout/dashboard-shell.tsx` (line 52)

**Why They're Critical**:
- ALL sign-out links MUST have `prefetch={false}`
- Next.js prefetching executes API routes
- Caused automatic logout issue

**Required Pattern**:

```typescript
// ✅ CORRECT
<Link href="/api/auth/sign-out" prefetch={false}>
  Sign out
</Link>

// ❌ WRONG - Will prefetch and execute sign-out automatically!
<Link href="/api/auth/sign-out">
  Sign out
</Link>
```

**What NOT To Do**:
- ❌ Remove `prefetch={false}` from any sign-out link
- ❌ Add new sign-out links without `prefetch={false}`
- ❌ Use `router.push('/api/auth/sign-out')` (same issue)

**What Happens If You Break It**:
- Users get automatically logged out 4-5 seconds after login
- Sign-out route is prefetched and executed when link appears in viewport

---

## 🟡 IMPORTANT FILES - MODIFY WITH CAUTION

### `/app/api/auth/sign-out/route.ts`
**Purpose**: Handles user logout

**Why It's Important**:
- Must only be called when user explicitly clicks sign-out
- Uses server client which has read-only `setAll()`
- Redirects to homepage after logout

**Note**: Since `setAll()` is read-only in server client, this route doesn't actually delete cookies anymore. Cookies are removed client-side by Supabase.

---

### API Routes (All `/app/api/**/route.ts`)
**Purpose**: Handle data operations for authenticated users

**Why They're Important**:
- ALL must use the auth pattern (check user first)
- ALL must filter queries by `user_id`
- ALL must use `await createClient()` from `@/lib/supabase/server`

**Required Pattern**:
See `/docs/Architecture files/CONVENTIONS.md` for the full template

---

## ⚠️ Common Ways to Break Authentication

### 1. Cookie Deletion
**Bad Code**:
```typescript
// In lib/supabase/server.ts
setAll(cookiesToSet) {
  cookiesToSet.forEach(({ name, value, options }) =>
    cookieStore.set(name, value, options)  // ❌ DELETES cookies!
  );
}
```

**Why**: Server Components can't SET cookies, only READ them. Attempting to set causes deletion.

### 2. Missing Credentials
**Bad Code**:
```typescript
// Client-side fetch without credentials
const res = await fetch('/api/accounts');  // ❌ No cookies sent!
```

**Why**: Without `credentials: 'include'`, cookies aren't sent. Global wrapper fixes this.

### 3. Prefetching API Routes
**Bad Code**:
```typescript
<Link href="/api/auth/sign-out">Sign out</Link>  // ❌ Will prefetch!
```

**Why**: Next.js prefetches the route, making a GET request that executes sign-out.

### 4. Forgetting to Filter by user_id
**Bad Code**:
```typescript
const { data } = await supabase.from("accounts").select("*");  // ❌ Returns ALL users' data!
```

**Why**: Security issue - returns data from ALL users, not just the current user.

### 5. Not Awaiting createClient()
**Bad Code**:
```typescript
const supabase = createClient();  // ❌ Missing await!
```

**Why**: Next.js 14.2+ requires `await cookies()`, which `createClient()` uses internally.

---

## 🧪 How to Test Authentication Changes

After modifying ANY of these critical files:

1. **Clear browser cookies completely**
2. **Log in** (should redirect to dashboard)
3. **Navigate between pages** (should stay logged in)
4. **Refresh the page** (should stay logged in)
5. **Check Network tab** (API calls should return 200, not 401)
6. **Wait 5-10 seconds** (should NOT automatically log out)
7. **Click sign-out button** (should log out and redirect to home)

If any step fails, you've broken authentication.

---

## 📞 When to Ask for Help

Ask the user before modifying if:
- You're changing ANY file in this document
- You're adding new authentication logic
- You're modifying cookie handling
- You're changing how Supabase clients are created
- You're unsure if a change will affect auth

**Remember**: These systems were debugged for hours. A single character change can break everything.

---

## 🔒 SECURITY SYSTEMS - DO NOT DISABLE

### 8. Pre-Commit Secret Scanner (`.githooks/pre-commit`)

**Purpose**: Scans all staged files for hardcoded secrets before allowing commits

**Why It's Critical**:
- Prevents accidental exposure of API keys, JWT tokens, and passwords
- Implemented after a GitGuardian incident detected exposed Supabase Service Role JWTs
- Three-layer prevention system (gitignore + pre-commit hook + npm prepare)

**How It Works**:
1. Runs automatically on every `git commit`
2. Scans staged file contents (not just filenames) for secret patterns
3. Blocks the commit with detailed file/line references if secrets found
4. Skips binary files, lock files, and itself

**Secret Patterns Detected**:
- JWT tokens (`eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9`)
- Supabase service role keys
- Stripe live/test secret keys (`sk_live_`, `sk_test_`)
- Stripe webhook secrets (`whsec_`)
- Akahu client and webhook secrets
- Hardcoded passwords (pattern: `password = "..."`)
- Private keys

**What NOT To Do**:
- ❌ Delete `.githooks/pre-commit`
- ❌ Remove the `prepare` script from `package.json`
- ❌ Change `core.hooksPath` git config
- ❌ Routinely use `--no-verify` to bypass the hook
- ❌ Add secrets to the SKIP_PATTERNS list

**What Happens If You Break It**:
- Secrets can be accidentally committed and pushed to GitHub
- GitGuardian and other scanners will flag the repository
- Exposed secrets must be rotated immediately (Supabase, Stripe, Akahu)

**Auto-Setup**:
```json
// package.json
"prepare": "git config core.hooksPath .githooks"
```
This runs automatically on `npm install`, ensuring all developers have the hook active.

---

### 9. `.gitignore` Script Blocking

**Purpose**: Prevents script files from being tracked by git

**Rules**:
```
scripts/*.mjs
scripts/*.js
scripts/*.ts
!scripts/README.md
```

**Why It's Critical**:
- Development scripts often contain hardcoded database URLs, API keys, or test data
- These rules are the first line of defense before the pre-commit hook
- The `scripts/` directory is available for local development but nothing in it will be committed

**What NOT To Do**:
- ❌ Remove the script blocking rules from `.gitignore`
- ❌ Force-add script files with `git add -f`
- ❌ Move scripts outside the `scripts/` directory to bypass the rules
