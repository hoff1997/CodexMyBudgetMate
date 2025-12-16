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

## 🚣 Remy - The Mascot & Guide (Updated Dec 2025)

### Overview

Remy is the friendly Kiwi mascot who guides users through the app. He appears throughout onboarding and provides encouraging, warm guidance in a distinctly New Zealand voice.

### Remy's Personality

- **Warm & Encouraging** - Never judgmental about financial situations
- **Kiwi Voice** - Uses NZ English: "sorted", "no worries", "stoked", "cuppa", "mate"
- **Direct & Practical** - Gets to the point without corporate jargon
- **Calm & Reassuring** - Reduces financial anxiety, never creates urgency

### Banned Phrases (NEVER USE)

- "Every dollar has a job" (YNAB trademark)
- "Baby steps" (Dave Ramsey trademark)
- "Zero-based budgeting" (too technical)
- Generic corporate phrases

### Remy Components

**Location**: `components/onboarding/remy-tip.tsx`

#### RemyTip Component
Used for guidance messages with Remy's avatar:

```tsx
import { RemyTip } from "@/components/onboarding/remy-tip";

<RemyTip pose="encouraging">
  Grab a cuppa and get comfy. We're going to set up your budget properly.
</RemyTip>
```

**Props:**
- `pose`: "welcome" | "encouraging" | "thinking" | "celebrating" | "small"
- `children`: Message content (React nodes)
- `className`: Additional CSS classes

#### RemyAvatar Component
Standalone avatar for headers:

```tsx
import { RemyAvatar } from "@/components/onboarding/remy-tip";

<RemyAvatar pose="thinking" size="md" />
```

**Props:**
- `pose`: "welcome" | "encouraging" | "thinking" | "celebrating" | "small"
- `size`: "sm" (40px) | "md" (64px) | "lg" (96px) | "xl" (112px)
- `className`: Additional CSS classes

### Remy Image Assets

**Location**: `/public/Images/` (note capital I)

| File | Pose | Usage |
|------|------|-------|
| `remy-welcome.png` | Welcoming | Welcome step, introductions |
| `remy-encouraging.png` | Supportive | Tips, guidance, motivation |
| `remy-thinking.png` | Contemplative | Explanations, education |
| `remy-celebrating.png` | Excited | Completion, achievements |
| `remy-small.png` | Compact | Headers, inline usage |

### Onboarding Steps with Remy

All 11 onboarding steps now feature Remy:

| Step | File | Remy Presence |
|------|------|---------------|
| Welcome | `welcome-step.tsx` | Large avatar + speech bubble intro |
| Profile | `profile-step.tsx` | RemyTip with friendly guidance |
| Income | `income-step.tsx` | RemyTip explaining income setup |
| Bank Accounts | `bank-accounts-step.tsx` | RemyTip about Akahu security |
| Budgeting Approach | `budgeting-approach-step.tsx` | RemyTip about templates vs scratch |
| Envelope Education | `envelope-education-step.tsx` | Header avatar + two RemyTips |
| Envelope Creation | `envelope-creation-step.tsx` | RemyTip encouragement |
| Envelope Allocation | `envelope-allocation-step.tsx` | Context-aware RemyTips |
| Budget Review | `budget-review-step.tsx` | RemyTip review guidance |
| Opening Balance | `opening-balance-step.tsx` | RemyTip about balances |
| Completion | `completion-step.tsx` | Celebrating avatar + confetti |

### Completion Step Features

The completion step (`completion-step.tsx`) includes:
- Remy celebrating avatar with gold border
- Confetti animation using `canvas-confetti` library
- "You legend!" celebration message
- First goal hint (Emergency Fund achievement)
- Deferred features list
- Motivational closing message

### Style Guidelines for Remy Messages

**DO:**
```
"Grab a cuppa and get comfy."
"Sweet as! With one income, this part's easy."
"Have a look and make sure it feels right."
"Future you will be stoked."
```

**DON'T:**
```
"Welcome to the budgeting journey!"
"Let's optimize your financial future!"
"Every dollar has a job to do!"
"Great job! You're doing amazing!"
```

## 🎨 Style Guide Colors (Updated Dec 2025)

### Primary Palette (Calm & Trustworthy)

| Name | Hex | CSS Variable | Usage |
|------|-----|--------------|-------|
| Sage | `#7A9E9A` | `sage` | Primary buttons, success states |
| Sage Dark | `#5A7E7A` | `sage-dark` | Hover states, text |
| Sage Light | `#B8D4D0` | `sage-light` | Borders, subtle backgrounds |
| Sage Very Light | `#E2EEEC` | `sage-very-light` | Card backgrounds, RemyTip bg |

### Accent Colors

| Name | Hex | CSS Variable | Usage |
|------|-----|--------------|-------|
| Blue | `#6B9ECE` | `blue` | Links, info states |
| Blue Light | `#DDEAF5` | `blue-light` | Info backgrounds |
| Gold | `#D4A853` | `gold` | Warnings, achievements |
| Gold Light | `#F5E6C4` | `gold-light` | Warning backgrounds |

### Text Colors

| Name | Hex | CSS Variable | Usage |
|------|-----|--------------|-------|
| Text Dark | `#1A2E2A` | `text-dark` | Primary headings |
| Text Medium | `#4A5E5A` | `text-medium` | Body text |
| Muted | `#6B7B7A` | `muted-foreground` | Secondary text |

### Using Semantic Classes

```tsx
// Primary button
<Button className="bg-sage hover:bg-sage-dark">Save</Button>

// RemyTip background
<div className="bg-sage-very-light border-sage-light">...</div>

// Info card
<Card className="bg-blue-light border-blue">...</Card>

// Warning card
<Card className="bg-gold-light border-gold">...</Card>
```

## 🏆 Achievement System (Updated Dec 2025)

### Overview

The Achievement System gamifies financial progress with badges and milestones. Achievements are tracked in the database and displayed in the UI.

### Database Table

**Location**: `supabase/migrations/0027_achievements.sql`

```sql
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_key TEXT NOT NULL,
  achieved_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  UNIQUE(user_id, achievement_key)
);
```

### Achievement Definitions

**Location**: `lib/achievements/definitions.ts`

```typescript
export type AchievementKey =
  | 'first_envelope'
  | 'emergency_fund_started'
  | 'emergency_fund_1000'
  | 'emergency_fund_complete'
  | 'first_budget_month'
  | 'debt_free'
  | 'onboarding_complete';

export interface AchievementDefinition {
  key: AchievementKey;
  name: string;
  description: string;
  icon: string;
  category: 'onboarding' | 'savings' | 'budgeting' | 'debt';
}
```

### Key Files

| File | Purpose |
|------|---------|
| `lib/achievements/definitions.ts` | Achievement metadata |
| `lib/hooks/use-achievements.ts` | React Query hook |
| `app/api/achievements/route.ts` | CRUD API |
| `components/achievements/achievement-badge.tsx` | Badge display |
| `components/achievements/achievement-toast.tsx` | Celebration popup |

### Usage

```tsx
import { useAchievements } from "@/lib/hooks/use-achievements";

function MyComponent() {
  const { achievements, unlockAchievement } = useAchievements();

  // Check if achieved
  const hasEmergencyFund = achievements.some(
    a => a.achievement_key === 'emergency_fund_1000'
  );

  // Unlock achievement
  await unlockAchievement('first_envelope');
}
```

## 🔧 Form Hydration Warning Fix

### Issue
Browser extensions (password managers, autofill) inject attributes into form elements before React hydrates, causing hydration mismatch warnings.

### Solution
Add `suppressHydrationWarning` to form elements:

```tsx
<form onSubmit={handleSubmit} suppressHydrationWarning>
  ...
</form>
```

**Applied to**: `components/auth/auth-form.tsx`
