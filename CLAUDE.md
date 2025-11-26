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
