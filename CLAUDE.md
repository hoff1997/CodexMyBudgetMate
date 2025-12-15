# Claude Code Instructions

## ⚠️ MANDATORY: Read Before ANY Changes

Before making ANY code changes to this project, you MUST:

1. **Read `/docs/ARCHITECTURE.md`** - Understand how the system works
2. **Read `/docs/CONVENTIONS.md`** - Follow established patterns
3. **Read `/docs/CRITICAL-SYSTEMS.md`** - Know what NOT to touch

After reading, confirm: "I have reviewed the architecture docs and will follow the established patterns."

## 🚨 Critical Rules (Never Break These)

### Authentication (We spent hours fixing this!)
- `/lib/supabase/server.ts` - NEVER modify without explicit permission
- Must use `await cookies()` (Next.js 14.2+ requirement)
- `setAll()` must remain empty/read-only (prevents cookie deletion)
- All API routes must use `await createClient()` from `@/lib/supabase/server`

### Sign-Out Links
- ALL sign-out links MUST have `prefetch={false}`
- Never use `<Link href="/api/auth/sign-out">` without `prefetch={false}`
- Reason: Next.js prefetching executes the sign-out route automatically

### Fetch Requests
- The fetch wrapper in `/components/providers/app-providers.tsx` adds `credentials: 'include'`
- This wrapper is module-level (runs once on import) - do NOT modify without permission
- All same-origin fetch calls automatically include cookies

### Cookie Handling
- Cookies must have `secure: true` in production (Vercel HTTPS)
- Cookie logic is in middleware.ts and auth routes
- NEVER manually delete cookies - let Supabase handle it

## 📁 Project Structure

```
/app                - Next.js App Router pages and API routes
  /(app)           - Authenticated pages (requires login)
  /(auth)          - Public auth pages (login, signup)
  /api             - API routes (all require auth except /auth/*)
/components        - Reusable React components
  /layout          - Layout components (Sidebar, DashboardShell)
  /ui              - shadcn/ui components
/lib/supabase      - Supabase client configuration (CRITICAL - DO NOT TOUCH)
/docs              - Architecture documentation
```

## 🔧 When Adding New Features

1. Check if similar patterns exist in the codebase
2. Follow conventions in `/docs/CONVENTIONS.md`
3. If touching auth/cookies/middleware/supabase - **ASK FIRST**
4. Test authentication flow after changes

## 🧪 After Making Changes

Verify:
- [ ] Authentication still works (login → dashboard → navigate → no 401s)
- [ ] No console errors in browser or Vercel logs
- [ ] Follows existing code patterns
- [ ] No new `for=` attributes (use `htmlFor=` in React)
- [ ] No Link components to API routes without `prefetch={false}`

## 🐛 Common Issues & Solutions

### Issue: Getting 401 Unauthorized errors
**Check:**
- Is the API route using `await createClient()` from `@/lib/supabase/server`?
- Is the fetch call including credentials (global wrapper should handle this)?
- Are cookies being sent? (Check browser DevTools → Network → Headers)

### Issue: User gets logged out automatically
**Check:**
- Are there any sign-out links without `prefetch={false}`?
- Is `setAll()` in server.ts empty (not trying to set cookies)?
- Is middleware running on the route? (Check middleware.ts matcher)

### Issue: Layout crashes or redirects unexpectedly
**Check:**
- Does the layout have proper auth guards?
- Is it using `.maybeSingle()` instead of `.single()` for optional queries?
- Are all user-dependent queries checking `if (user)` first?

## 📚 Additional Resources

- [Next.js 14 Docs](https://nextjs.org/docs)
- [Supabase SSR Docs](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Project Architecture Docs](/docs/ARCHITECTURE.md)

## 🤝 Working with This Codebase

This project has been carefully configured to handle authentication correctly in Next.js 14 with Supabase SSR. The auth setup is complex and was debugged extensively.

**If you're unsure about a change - especially anything related to authentication, cookies, or middleware - please ask the user before proceeding.**

## 📊 Budget Manager Features (Updated Dec 2025)

### Envelope Types
The Budget Manager supports **5 envelope subtypes**:

| Subtype | Description | Needs Budget? | Priority Column? |
|---------|-------------|---------------|------------------|
| `bill` | Recurring bills with due dates | ✅ Yes | ✅ Yes |
| `spending` | Spending tracking only | ❌ No | ✅ Yes |
| `savings` | Savings goals | ❌ No | ❌ No |
| `goal` | One-time goals | ❌ No | ❌ No |
| `tracking` | Tracking-only (reimbursements) | ❌ No | ❌ No |

**Key Files:**
- Type definition: `lib/types/unified-envelope.ts` (`EnvelopeSubtype`)
- Table component: `components/shared/unified-envelope-table.tsx`
- API auto-sync: `app/api/envelopes/[id]/route.ts` (syncs `is_tracking_only` flag)
- Database migration: `supabase/migrations/0024_envelope_tracking_flag.sql`

### Sortable Columns
All major columns in the Budget Manager table are sortable:
- Click column header to sort ascending
- Click again to sort descending
- Click third time to clear sort
- Sort icons: `ArrowUpDown` (neutral), `ArrowUp` (asc), `ArrowDown` (desc)

**Sortable columns:** Name, Priority, Type, Target, Frequency, Due Date, Current, Total Funded

### Priority Traffic Light System
Priority column uses compact traffic light dots:
- 🔴 **Essential** - Must-have expenses
- 🟡 **Important** - Should-have expenses
- 🟢 **Flexible** - Nice-to-have expenses

Displayed as small colored circles that expand to dropdown on click.

### Warning System (Hover Tooltip)
Validation warnings appear as hover icons near the delete button:
- **Red triangle** (`AlertTriangle`) - Error warnings
- **Amber triangle** - Warning warnings
- **Blue triangle** - Info warnings

Hover over the icon to see the full warning message with details.

**Warning types checked:**
- Name required
- Target amount required (bills only)
- Frequency required (bills only)
- Under/over-allocated amounts
- Opening balance recommendations

### Gap Analysis Columns (Maintenance Mode)
In maintenance mode, the table shows additional columns:
- **Expected** - What balance should be based on ideal allocations
- **Gap** - Difference between actual and expected (color-coded)
- **Status** - On Track (🟢), Slight Deviation (🟡), Needs Attention (🔴)

## 🔄 Subtype-to-Flag Sync

When changing envelope subtype via API, the system auto-syncs related flags:

```typescript
// In app/api/envelopes/[id]/route.ts
if ("subtype" in payload) {
  payload.is_tracking_only = payload.subtype === "tracking";
}
```

This ensures database consistency with the `is_tracking_only` boolean column.

## 📄 Page Architecture

### Active Pages

| Page | Route | Purpose |
|------|-------|---------|
| **Allocation** | `/allocation` | Primary budget management - editing, allocating income, all envelope features |
| **Envelope Summary** | `/envelope-summary` | Overview, progress checking, quick transfers |
| **Dashboard** | `/dashboard` | High-level financial overview, upcoming bills, quick actions |

### Deprecated Pages (DO NOT ADD FEATURES)

| Page | Route | Status |
|------|-------|--------|
| **Budget Manager** | `/budget-manager` | ⛔ DEPRECATED - Legacy reference only |

### Feature Ownership

| Feature | Allocation | Envelope Summary | Dashboard |
|---------|------------|------------------|-----------|
| Envelope table with inline editing | ✅ | ❌ | ❌ |
| Income cards / allocation controls | ✅ | ❌ | ❌ |
| Priority column (traffic lights) | ✅ | ✅ | ❌ |
| Category grouping | ✅ | ✅ | ❌ |
| Drag-and-drop reordering | ✅ | ✅ | ❌ |
| "Pays Until Due" column | ✅ | ✅ | ❌ |
| Progress bars (sage gradient) | ✅ | ✅ | ✅ |
| Transfer Funds dialog | ❌ | ✅ | ❌ |
| Summary cards | ❌ | ✅ | ✅ |
| Filter tabs | ❌ | ✅ | ❌ |
| Quick Actions | ❌ | ❌ | ✅ |
| Upcoming Bills | ❌ | ❌ | ✅ |
| Credit Card Cards | ❌ | ❌ | ✅ |

### When Adding New Features

1. Check the Feature Ownership table above
2. If feature applies to multiple pages, implement on ALL listed pages
3. NEVER add features to deprecated pages
4. If unsure, ask before implementing

## 📅 Pays Until Due Feature

The "Pays Until Due" feature helps users understand bill urgency in terms of paychecks.

### How It Works

- Calculates how many pay cycles until a bill is due
- Uses the income source with the earliest `next_pay_date` as the primary pay schedule
- Shows urgency badges: "Due now!", "1 pay!", "2 pays", etc.

### Files

- **Core utilities**: `lib/utils/pays-until-due.ts`
- **Badge component**: `components/shared/pays-until-due-badge.tsx`
- **Used in**: Allocation page, Envelope Summary page, Budget Manager table

### Color Scheme (Style Guide Compliant)

Uses **blue colors only** (not red/amber) for urgency to avoid financial anxiety:
- High urgency: `bg-[#DDEAF5]` / `text-[#6B9ECE]`
- Medium urgency: `bg-[#F3F4F6]` / `text-[#6B6B6B]`
- Low/none: transparent / `text-[#9CA3AF]`
