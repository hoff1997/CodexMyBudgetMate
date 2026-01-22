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

## 🏦 Akahu Integration (NZ Open Banking)

### Overview
Akahu provides open banking connectivity for New Zealand banks. Users can connect their bank accounts to automatically import transactions.

### User-Facing Components

| Component | File | Location |
|-----------|------|----------|
| **Onboarding Step** | `components/onboarding/steps/bank-accounts-step.tsx` | Step 4 of onboarding |
| **Dashboard Widget** | `components/bank/bank-connection-status-widget.tsx` | Dashboard overview |
| **Status Banner** | `components/layout/overview/akahu-connect.tsx` | Dashboard widget grid |
| **Settings Manager** | `components/layout/settings/settings-client.tsx` | Settings → Bank Connections |
| **Full Manager** | `components/bank/bank-connection-manager.tsx` | Comprehensive management |

### User Flow
1. **Onboarding**: User sees "Connect My Bank" card with security benefits
2. **Click Connect**: Redirects to Akahu OAuth page
3. **Authorize**: User logs into their bank via Akahu
4. **Callback**: Tokens stored, accounts fetched, status shown
5. **Dashboard**: Widget shows connection status, last sync time
6. **Settings**: Full management (sync, disconnect, view accounts)

### OAuth Flow (Technical)
1. User clicks "Connect Bank" → calls `GET /api/akahu/oauth/start`
2. Returns authorization URL with CSRF state token (stored in `akahu_oauth_states`)
3. User authorizes on Akahu → redirects to `/api/akahu/oauth/callback`
4. Callback verifies state, exchanges code for tokens, stores in `akahu_tokens`

### API Routes

| Route | Purpose |
|-------|---------|
| `GET /api/akahu/oauth/start` | Initiates OAuth flow, returns auth URL |
| `GET /api/akahu/oauth/callback` | Handles OAuth callback, stores tokens |
| `GET /api/akahu/accounts` | Fetches user's bank accounts (cached) |
| `GET /api/akahu/transactions` | Fetches transactions (cached) |
| `GET /api/akahu/connection` | Get/refresh connection status |
| `DELETE /api/akahu/connection` | Disconnect Akahu |
| `POST /api/akahu/cache/invalidate` | Manual cache invalidation |
| `POST /api/webhooks/akahu` | Handles Akahu webhooks |

### Key Files

| File | Purpose |
|------|---------|
| `lib/akahu/client.ts` | Akahu API client, token refresh, error handling |
| `lib/akahu/providers.ts` | Derive provider names from accounts |
| `lib/cache/akahu-cache.ts` | Redis caching (5min accounts, 15min transactions) |
| `lib/jobs/akahu-sync.ts` | Background token refresh job |
| `lib/hooks/use-akahu-accounts.ts` | React Query hook for accounts |
| `lib/hooks/use-akahu-transactions.ts` | React Query hook for transactions |

### Environment Variables
```
AKAHU_APP_TOKEN=app_token_xxx           # Your Akahu app token
AKAHU_CLIENT_ID=app_token_xxx           # Same as app token
AKAHU_CLIENT_SECRET=xxx                 # Your Akahu client secret
AKAHU_REDIRECT_URI=http://localhost:3000/api/akahu/oauth/callback
AKAHU_WEBHOOK_SECRET=xxx                # Optional: for webhook verification
```

### Database Tables
- `akahu_tokens` - Stores user access/refresh tokens with expiry
- `akahu_oauth_states` - Temporary CSRF state storage (expires 10 min)
- `akahu_webhook_events` - Webhook event log for debugging
- `bank_connections` - User's connected bank providers and status

### Webhook Events Handled
- `TOKEN:DELETE` / `TOKEN:REVOKED` - Deletes tokens, marks connection disconnected
- `ACCOUNT:UPDATE` - Updates connection status (ACTIVE → connected, INACTIVE → action_required)
- `TRANSACTION:*` - Logged for future cache invalidation

### Important Notes
- **Redirect URI must match exactly** what's registered with Akahu
- Production URI: `https://www.mybudgetmate.co.nz/api/akahu/oauth/callback`
- Development URI: `http://localhost:3000/api/akahu/oauth/callback`
- Tokens are refreshed automatically 60 seconds before expiry
- Webhook signature verification uses HMAC-SHA256 with timing-safe comparison
- Caching: Accounts 5min, Recent transactions 15min, Historical 24hr

## 🤝 Working with This Codebase

This project has been carefully configured to handle authentication correctly in Next.js 14 with Supabase SSR. The auth setup is complex and was debugged extensively.

**If you're unsure about a change - especially anything related to authentication, cookies, or middleware - please ask the user before proceeding.**

## 📊 Budget Manager Features (Updated Jan 2026)

### Envelope Types
The Budget Manager supports **6 envelope subtypes**:

| Subtype | Description | Needs Budget? | Priority Column? |
|---------|-------------|---------------|------------------|
| `bill` | Recurring bills with due dates | ✅ Yes | ✅ Yes |
| `spending` | Spending tracking only | ❌ No | ✅ Yes |
| `savings` | Savings goals | ❌ No | ❌ No |
| `goal` | One-time goals | ❌ No | ❌ No |
| `tracking` | Tracking-only (reimbursements) | ❌ No | ❌ No |
| `debt` | Debt payoff (credit cards, loans) | ✅ Yes | ✅ Yes |

**Key Files:**
- Type definition: `lib/types/unified-envelope.ts` (`EnvelopeSubtype`)
- Table component: `components/shared/unified-envelope-table.tsx`
- API auto-sync: `app/api/envelopes/[id]/route.ts` (syncs `is_tracking_only` and `is_debt` flags)
- Debt items API: `app/api/envelopes/[id]/debt-items/route.ts`
- Debt types: `lib/types/debt.ts`
- Database migration: `supabase/migrations/0075_debt_envelope_system.sql`

### Sortable Columns
All major columns in the Budget Manager table are sortable:
- Click column header to sort ascending
- Click again to sort descending
- Click third time to clear sort
- Sort icons: `ArrowUpDown` (neutral), `ArrowUp` (asc), `ArrowDown` (desc)

**Sortable columns:** Name, Priority, Type, Target, Frequency, Due Date, Current, Total Funded

### Priority Traffic Light System
Priority column uses compact traffic light dots:
- 🔵 **Essential** - Must-have expenses (Blue `#6B9ECE`)
- 🟢 **Important** - Should-have expenses (Green/Sage `#5A7E7A`)
- ⚪ **Flexible** - Nice-to-have expenses (Silver `#9CA3AF`)

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
  payload.is_debt = payload.subtype === "debt";
}
```

This ensures database consistency with the `is_tracking_only` boolean column.

## 💪 Debt Destroyer System (Updated Jan 2026)

### Overview

The Debt Destroyer system provides unified debt tracking using the **debt snowball method** (smallest balance first). All debts are tracked as `debt_items` within a single "Debt Destroyer" envelope, enabling automatic payment allocation and achievement tracking.

### Key Principle: Snowball Method

Debts are **always sorted smallest to largest balance**. When payments are made:
1. Payment goes to the smallest debt first
2. If that debt is paid off, remainder rolls to the next smallest
3. Achievements trigger automatically when debts are paid off

### Database Structure

**Table:** `debt_items` (Migration: `0075_debt_envelope_system.sql`)

```sql
CREATE TABLE debt_items (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  envelope_id UUID NOT NULL,           -- FK to "Debt Destroyer" envelope
  name TEXT NOT NULL,                   -- e.g., "ANZ Visa"
  debt_type TEXT NOT NULL,              -- credit_card, personal_loan, car_loan, etc.
  linked_account_id UUID,               -- For CC auto-sync via Akahu
  starting_balance NUMERIC(12, 2),      -- Original debt amount
  current_balance NUMERIC(12, 2),       -- Current remaining
  interest_rate NUMERIC(5, 2),          -- APR percentage
  minimum_payment NUMERIC(10, 2),       -- Monthly minimum
  display_order INTEGER,
  paid_off_at TIMESTAMPTZ,              -- Auto-set when balance <= 0
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Debt Types:**
- `credit_card` - Credit cards
- `personal_loan` - Personal loans
- `car_loan` - Vehicle financing
- `student_loan` - Education debt
- `afterpay` - Buy Now Pay Later
- `hp` - Hire Purchase
- `other` - Other debts

### Automatic Triggers

**1. Paid Off Detection** (`check_debt_paid_off` trigger):
- When `current_balance` drops to 0 or below, `paid_off_at` is automatically set
- If balance goes back above 0, `paid_off_at` is cleared

**2. CC Balance Sync** (`sync_cc_balance_to_debt_item` trigger):
- When a linked credit card account balance changes (via Akahu)
- Automatically updates the corresponding `debt_item.current_balance`

### API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `GET /api/envelopes/[id]/debt-items` | GET | Fetch debt items (sorted by snowball) |
| `PUT /api/envelopes/[id]/debt-items` | PUT | Replace all debt items |
| `POST /api/envelopes/[id]/debt-items` | POST | Add single debt item |
| `POST /api/envelopes/[id]/debt-items/apply-payment` | POST | Apply payment using snowball method |

### Payment Application Flow

When a transaction assigned to a debt envelope is **approved**:

```typescript
// In app/api/transactions/[id]/approve/route.ts
if (envelope?.is_debt && transaction.amount) {
  // Apply payment to smallest debt first
  debtPaymentResult = await applyPaymentToDebtItems(
    supabase, userId, envelope.id, paymentAmount, transactionId
  );
}
```

**Response includes:**
```typescript
{
  status: "approved",
  debtPayment: {
    paymentApplied: number,
    paidOffDebts: DebtItem[],
    remainingPayment: number
  }
}
```

### Achievement Integration

Two debt-related achievements trigger automatically:

| Achievement | Key | Trigger |
|-------------|-----|---------|
| **Debt Destroyer** | `debt-destroyer` | First debt item paid off |
| **Debt Free** | `debt-free` | All debt items paid off |

Achievements are checked in `handleDebtPayoffAchievements()` after each payment.

### Credit Card Integration at Onboarding

When a user sets up a credit card with `paying_down` or `minimum_only` usage type:

1. **Debt Destroyer envelope** is found or created automatically
2. Credit card is added as a `debt_item` within that envelope
3. `linked_account_id` links to the CC account for auto-sync

**Helper Functions** (in `lib/utils/credit-card-onboarding-utils.ts`):

```typescript
// Find or create the unified debt envelope
const envelope = await findOrCreateDebtDestroyerEnvelope(supabase, userId);

// Add CC as debt item
const result = await addCreditCardToDebtDestroyer(supabase, userId, {
  name: "ANZ Visa",
  accountId: account.id,
  startingBalance: 5000,
  currentBalance: 5000,
  apr: 19.99,
  minimumPayment: 100,
});
```

### Key Files

| File | Purpose |
|------|---------|
| `lib/types/debt.ts` | Type definitions and utility functions |
| `app/api/envelopes/[id]/debt-items/route.ts` | CRUD for debt items |
| `app/api/envelopes/[id]/debt-items/apply-payment/route.ts` | Snowball payment application |
| `app/api/transactions/[id]/approve/route.ts` | Auto-applies payments on approval |
| `lib/utils/credit-card-onboarding-utils.ts` | CC → Debt Destroyer integration |
| `components/debt/debt-allocation-dialog.tsx` | UI for managing debt items |
| `supabase/migrations/0075_debt_envelope_system.sql` | Database schema |

### Onboarding Integration

The "Debt Destroyer" envelope appears in onboarding (step 9) with special handling:

- **Detection:** `env.id === 'debt-destroyer' || env.subtype === 'debt'`
- **Icon:** CreditCard icon (lucide-react)
- **Prompt:** Shows if envelope has no debt items yet
- **Indicator:** Shows solid sage icon if debt items exist

```tsx
// In envelope-allocation-step.tsx
const isDebtEnvelope = env.id === 'debt-destroyer' || env.subtype === 'debt';
const showDebtPrompt = isDebtEnvelope && !(env.debtItems?.length);
```

### Utility Functions

**Snowball Sorting:**
```typescript
import { sortBySnowball } from "@/lib/types/debt";
const sorted = sortBySnowball(debtItems); // Smallest balance first
```

**Progress Calculation:**
```typescript
import { calculateDebtProgress, calculateDebtSummary } from "@/lib/types/debt";

const itemWithProgress = calculateDebtProgress(debtItem);
// { ...item, progress_percent, amount_paid_off, is_paid_off }

const summary = calculateDebtSummary(debtItems);
// { total_debt, total_paid_off, progress_percent, next_to_payoff, ... }
```

**Payoff Projection:**
```typescript
import { calculatePayoffProjection } from "@/lib/types/debt";

const projection = calculatePayoffProjection(balance, apr, monthlyPayment);
// { months_to_payoff, total_interest, total_payment }
```

## 📄 Page Architecture

### Active Pages

| Page | Route | Purpose |
|------|-------|---------|
| **Budget Allocation** | `/budgetallocation` | Primary budget management - editing, allocating income, all envelope features |
| **Dashboard** | `/dashboard` | High-level financial overview, upcoming bills, quick actions |
| **Reconcile** | `/reconcile` | Transaction approval and assignment |
| **Transactions** | `/transactions` | Transaction history and search |
| **Financial Position** | `/financial-position` | Net worth tracking, assets, liabilities |

### Deprecated Pages (DO NOT ADD FEATURES)

| Page | Route | Status |
|------|-------|--------|
| **Envelope Summary** | `/envelope-summary` | ⛔ DEPRECATED - Removed from navigation (Jan 2026). Use Budget Allocation instead. |
| **Budget Manager** | `/budget-manager` | ⛔ DEPRECATED - Legacy reference only |

### Feature Ownership

| Feature | Budget Allocation | Dashboard |
|---------|-------------------|-----------|
| Envelope table with inline editing | ✅ | ❌ |
| Income cards / allocation controls | ✅ | ❌ |
| Priority column (traffic lights) | ✅ | ❌ |
| Category grouping | ✅ | ❌ |
| Drag-and-drop reordering | ✅ | ❌ |
| "Pays Until Due" column | ✅ | ❌ |
| Progress bars (sage gradient) | ✅ | ✅ |
| Transfer Funds dialog | ✅ | ❌ |
| Summary cards | ✅ | ✅ |
| Quick Actions | ❌ | ✅ |
| Upcoming Bills | ❌ | ✅ |
| Credit Card Cards | ❌ | ✅ |

### When Adding New Features

1. Check the Feature Ownership table above
2. NEVER add features to deprecated pages
3. If unsure, ask before implementing

## 📅 Pays Until Due Feature

The "Pays Until Due" feature helps users understand bill urgency in terms of paychecks.

### How It Works

- Calculates how many pay cycles until a bill is due
- Uses the income source with the earliest `next_pay_date` as the primary pay schedule
- Shows urgency badges: "Due now!", "1 pay!", "2 pays", etc.

### Files

- **Core utilities**: `lib/utils/pays-until-due.ts`
- **Badge component**: `components/shared/pays-until-due-badge.tsx`
- **Used in**: Budget Allocation page

### Color Scheme (Style Guide Compliant)

Uses **blue colors only** (not red/amber) for urgency to avoid financial anxiety:
- High urgency: `bg-[#DDEAF5]` / `text-[#6B9ECE]`
- Medium urgency: `bg-[#F3F4F6]` / `text-[#6B6B6B]`
- Low/none: transparent / `text-[#9CA3AF]`

## 🏋️ Remy - Your Financial Coach (Updated Jan 2026)

### Tagline

**"Your financial coach - helping you tell your money where to go"**

### Overview

Remy is the friendly Kiwi mascot who guides users through the app. He appears throughout onboarding and provides encouraging, warm guidance in a distinctly New Zealand voice. Remy is a **financial coach**, not a paddler - he guides and empowers, but the user is always in control.

### Core Coaching Principles

1. **User has control** - Remy guides, doesn't decide
2. **Ask questions** - Don't give directives
3. **Non-judgmental** - Setbacks are learning opportunities
4. **Celebrate wins** - Acknowledge progress genuinely
5. **Partnership** - "We're in this together"
6. **Empowerment** - "You know what's best for you"

### Remy's Personality

- **Warm & Encouraging** - Never judgmental about financial situations
- **Kiwi Voice** - Uses NZ English: "sorted", "no worries", "stoked", "cuppa", "mate"
- **Direct & Practical** - Gets to the point without corporate jargon
- **Calm & Reassuring** - Reduces financial anxiety, never creates urgency
- **Coaching Mindset** - Asks questions instead of giving directives

### Banned Phrases (NEVER USE)

- "Every dollar has a job" (YNAB trademark)
- "Baby steps" (Dave Ramsey trademark)
- "Zero-based budgeting" (too technical)
- Generic corporate phrases
- Waka/paddling/nautical metaphors (deprecated)
- "You should..." / "You must..." / "You need to..." (directive language)

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
| `remy-small.png` | Compact | Headers, inline usage, **help buttons** |

### Help Button Avatar

**IMPORTANT**: All help buttons across the app must use `pose="small"` for consistency.

```tsx
// Correct - use RemyAvatar with pose="small"
<RemyAvatar pose="small" size="sm" className="!w-8 !h-8 !border-0 !shadow-none" />

// Incorrect - do not use other poses or direct image paths for help buttons
<Image src="/Images/remy-encouraging.png" ... />  // Wrong!
```

The shared `RemyHelpButton` component (`components/shared/remy-help-button.tsx`) already uses the correct pose. Use this component for page-level help buttons.

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

**DO (Coaching Language):**
```
"You're in control here - I'm just here to guide you."
"What feels right to you?"
"You know your situation best."
"Does this feel realistic for how you actually live?"
"If something feels off, trust that feeling."
"You've got this. Seriously."
```

**DON'T (Directive Language):**
```
"You should allocate more to savings."
"You need to reduce your spending."
"You must set up an emergency fund."
"Every dollar has a job to do!"
"Think of me as the one paddling the waka..."
```

### Key Empowering Phrases

Use these phrases to maintain Remy's coaching voice:
- "You're in control"
- "You know what's best for you"
- "This is your budget, your rules"
- "Trust yourself on this"
- "You've got this"
- "What feels right to you?"
- "You decide what matters most"
- "I'm in your corner"
- "Progress, not perfection"
- "You're building a solid habit"

### Coaching Messages Utility

**Location**: `lib/utils/remy-coaching-messages.ts`

This file contains pre-written coaching messages for various scenarios:
- Budget states (balanced, surplus, shortfall)
- Progress updates (on track, needs attention)
- Setbacks (overspent, missed goal)
- Wins (goal achieved, debt progress)
- Encouragement (struggling, new user)

```typescript
import { getCoachingMessage } from "@/lib/utils/remy-coaching-messages";

const message = getCoachingMessage('surplus');
// Returns: { title: "You've got surplus", message: "Nice! You've covered..." }
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

## ➕ Add Envelope Dialog (Updated Dec 2025)

### Overview

The Add Envelope dialog (`EnvelopeCreateDialog`) is a comprehensive envelope creation interface with budget impact awareness and multi-income support.

### Key Files

| File | Purpose |
|------|---------|
| `components/layout/envelopes/envelope-create-dialog.tsx` | Main dialog component |
| `app/api/budget/income-reality/route.ts` | API for income surplus data |
| `app/(app)/allocation/allocation-client.tsx` | Handles post-creation navigation |

### Features

1. **Income Reality Banner** - Shows surplus per income source
2. **Per-Income Impact Display** - Real-time calculation of per-pay amounts
3. **Multi-Income Selection** - Radio buttons to choose funding source
4. **Split Income Support** - Divides amount evenly when "split" selected
5. **Post-Creation Prompt** - Guides user to balance budget
6. **Envelope Highlighting** - Highlights newly created envelope on allocation page

### Form Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Name | Text | ✅ | Envelope name |
| Type | Select | ✅ | bill, spending, savings, goal, tracking |
| Priority | Select | ✅ | essential, important, discretionary |
| Icon | Picker | ✅ | Emoji icon for envelope |
| Category | Select | ❌ | Optional categorization |
| Due Amount | Number | ❌ | Target amount per due frequency |
| Due Frequency | Select | ❌ | weekly, fortnightly, monthly, etc. |
| Due Date | Date | ❌ | Next due date |
| Opening Balance | Number | ❌ | Starting balance |
| Notes | Textarea | ❌ | Additional notes |
| Spending Account | Checkbox | ❌ | Mark as spending envelope |
| Monitor on Dashboard | Checkbox | ❌ | Show on dashboard widget |

### Income Impact Calculation

The dialog calculates per-pay impact based on selected income:

```typescript
// When specific income selected:
displayImpacts = incomeImpacts.filter(i => i.incomeId === selectedIncomeId);

// When "split" selected (divided evenly):
displayImpacts = incomeImpacts.map(impact => ({
  ...impact,
  amountPerPay: impact.amountPerPay / numIncomes,
  shortfall: Math.max(0, splitAmount - impact.surplusAmount),
}));
```

### Pay Cycle Amount Formula

```typescript
function calculatePayCycleAmount(targetAmount, billFrequency, payFrequency) {
  const billCyclesPerYear = PAY_FREQUENCY_CYCLES[billFrequency]; // 12 for monthly
  const payCyclesPerYear = PAY_FREQUENCY_CYCLES[payFrequency];   // 26 for fortnightly
  const annualAmount = targetAmount * billCyclesPerYear;
  return annualAmount / payCyclesPerYear;
}
```

**Example**: $100/month bill with fortnightly pay = ($100 × 12) ÷ 26 = $46.15/fortnight

### Post-Creation Flow

1. User fills form and clicks "Create & Adjust Budget"
2. Envelope created via POST `/api/envelopes`
3. Post-creation prompt appears with:
   - Per-pay commitment summary (filtered by selected income)
   - Budget balancing warning (if shortfall exists)
   - Success message (if surplus covers it)
   - Remy's tip
4. User clicks "Balance Budget Now" or "I'll Balance It Later"
5. If "Balance Budget Now": Navigate to `/allocation?highlight={envelopeId}`
6. Allocation page highlights the new envelope for 3 seconds

### Shared Component Pattern

The `EnvelopeCreateDialog` is used on the Budget Allocation page, opened directly via the Add button.

```typescript
// allocation-client.tsx
useEffect(() => {
  if (searchParams.get("openCreateEnvelope") === "true") {
    setCreateOpen(true);
    router.replace("/budgetallocation", { scroll: false });
  }
}, [searchParams, router]);
```

### Highlight Handling

```typescript
// allocation-client.tsx
useEffect(() => {
  const highlightId = searchParams.get("highlight");
  if (highlightId && highlightId !== "new") {
    setHighlightedEnvelopeId(highlightId);
    router.replace("/budgetallocation", { scroll: false });

    // Remove highlight after 3 seconds
    const timer = setTimeout(() => {
      setHighlightedEnvelopeId(null);
    }, 3000);
    return () => clearTimeout(timer);
  }
}, [searchParams, router]);

// EnvelopeRow component
const highlightClass = isHighlighted
  ? "ring-2 ring-sage ring-offset-1 bg-sage-very-light animate-pulse"
  : "";
```

### Income Reality API

**Endpoint**: `GET /api/budget/income-reality`

**Response**:
```typescript
{
  incomes: [{
    id: string;
    name: string;
    payFrequency: string;
    nextPayDate: string | null;
    incomeAmount: number;
    totalCommittedPerPay: number;
    surplusAmount: number;
  }];
  totalSurplus: number;
  totalCommittedPerPay: number;
  surplusEnvelopeBalance: number | null;
}
```

## 👶 Kids Module (Updated Jan 2026)

### Overview

The Kids Module teaches teens with bank accounts real money management, preparing them to become full My Budget Mate users when they get a job.

**Core Philosophy**: Kids = My Budget Way (lite version) + Household Hub access + Invoice-based earning system

### Kid Login Security (Updated Jan 2026)

**IMPORTANT**: Each child now has a unique login key instead of a shared family code.

#### Login Key System

| Feature | Old (Family Code) | New (Login Key) |
|---------|-------------------|-----------------|
| Format | `HOFF-2026` | `K7M2-P9QR-3WNX` |
| Scope | Shared by all children | Unique per child |
| Entropy | ~1,000 combinations | ~4.7 × 10¹⁸ combinations |
| Security | Guessable (based on name) | Cryptographically random |

#### Database Columns

```sql
-- On child_profiles table
login_key TEXT UNIQUE NOT NULL,           -- XXXX-XXXX-XXXX format
login_key_created_at TIMESTAMPTZ,         -- When key was generated
login_key_last_used_at TIMESTAMPTZ,       -- Last successful login
family_access_code TEXT NOT NULL          -- DEPRECATED: kept for backwards compatibility
```

#### Key API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/kids/auth/login-key` | POST | Login with key + PIN (new secure flow) |
| `/api/kids/auth/lookup` | POST | Legacy family code lookup (deprecated) |
| `/api/kids/auth/login` | POST | Legacy PIN verification (deprecated) |
| `/api/kids/profiles/[id]/login-key` | GET | Parent views child's login key |
| `/api/kids/profiles/[id]/login-key` | POST | Parent regenerates child's login key |

#### Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `SecureKidLogin` | `app/(auth)/kids/login/secure-login.tsx` | New secure login page |
| `LoginKeyManager` | `components/kids/login-key-manager.tsx` | Parent UI to view/copy/regenerate keys |
| `LegacyKidsLogin` | `app/(auth)/kids/login/page.tsx` | Old login (accessible via `?legacy=true`) |

#### Browser Credential Saving

The new login page supports browser password managers:
- Form uses `autocomplete="username"` for login key field
- Form uses `autocomplete="current-password"` for PIN field
- Visible submit button triggers browser's "Save Password" prompt
- Users are prompted to save credentials for easy future login

#### Parent Workflow

1. Parent creates child profile → login key auto-generated
2. Parent views login key in child's profile card
3. Parent can copy key, show QR code, or regenerate
4. Key regeneration logged to `kid_login_key_audit` table
5. Old key immediately stops working on regeneration

#### Security Features

- **Per-child isolation**: Compromise of one key doesn't affect siblings
- **Regeneratable**: Parent can rotate keys anytime
- **Audit trail**: Key views and regenerations logged
- **Rate limiting**: Same protections as before (per-IP and per-key)
- **CSRF protection**: Required on all login endpoints
- **Timing-safe comparison**: No timing attacks possible

#### Migration

Migration `0078_secure_kid_login_keys.sql`:
1. Adds `login_key`, `login_key_created_at`, `login_key_last_used_at` columns
2. Generates login keys for existing children
3. Creates audit table `kid_login_key_audit`
4. Adds trigger to auto-generate keys on new child creation

### Two Chore Types

| Type | Description | Can Invoice? | Tracking |
|------|-------------|--------------|----------|
| **Expected Chores** | Included in pocket money (clean room, dishes) | No | Streak tracking, badges only |
| **Extra Chores** | One-off earning opportunities (wash car, mow lawn) | Yes | Adds to invoice |

**Key Field**: `chore_templates.is_expected` (boolean) - Determines chore type

### Invoice System

Extra chores approved by parents automatically add to the child's draft invoice. When the parent pays, the system can auto-reconcile via Akahu.

**Flow:**
1. Child marks extra chore as done
2. Parent approves via `/api/chores/assignments/[id]/approve`
3. System creates/gets draft invoice and adds invoice item (only if `is_expected === false`)
4. Parent pays invoice
5. Money distributed to child's envelopes

### Four Envelope Types (Kids)

| Envelope | Purpose | Bank Account Type |
|----------|---------|-------------------|
| **Spend** | Daily spending | Transaction/Debit |
| **Save** | Short-term savings goals | Savings (earns interest) |
| **Invest** | Long-term wealth building | Savings (earns interest) |
| **Give** | Charitable giving | Savings (earns interest) |

### Key Database Tables

```sql
-- Child profiles
child_profiles (id, parent_user_id, name, avatar_url, distribution_spend_pct, distribution_save_pct, ...)

-- Chore templates
chore_templates (id, parent_user_id, name, is_expected, currency_type, currency_amount, ...)

-- Chore assignments
chore_assignments (id, child_profile_id, chore_template_id, status, week_starting, ...)

-- Invoices
kid_invoices (id, child_profile_id, status, total_amount, ...)
kid_invoice_items (id, invoice_id, chore_assignment_id, chore_name, amount, ...)

-- Streaks
expected_chore_streaks (id, child_profile_id, chore_template_id, current_streak, ...)
```

### Key API Routes

| Route | Purpose |
|-------|---------|
| `GET/POST /api/kids/profiles` | Manage child profiles |
| `GET/POST /api/kids/[childId]/chores` | Child's chore assignments |
| `PATCH /api/chores/assignments/[id]/approve` | Parent approves chore → creates invoice item |
| `GET /api/kids/invoices` | Parent views all children's invoices |
| `POST /api/kids/[childId]/invoices/[id]/pay` | Mark invoice as paid |

### Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `KidDashboardClient` | `app/(app)/kids/[childId]/dashboard/` | Child's main dashboard |
| `ChoresClient` | `app/(app)/kids/chores/` | Parent's chores manager |
| `InvoicesClient` | `app/(app)/kids/invoices/` | Parent's invoice view |
| `ParentOnboardingTutorial` | `components/kids/` | New parent onboarding |

### Chore Approval Logic

**IMPORTANT**: When a parent approves a chore:

1. The route checks `is_expected` from the chore template
2. Only **extra chores** (`is_expected === false` AND `currency_type === "money"`) create invoice items
3. Expected chores are part of pocket money and don't get invoiced separately

```typescript
// In /api/chores/assignments/[id]/approve/route.ts
if (assignment.currency_type === "money" && !template?.is_expected) {
  // Create invoice item for EXTRA chores only
  // Get or create draft invoice
  // Add item to kid_invoice_items table
}
```

### Beta Access

Kids Module is currently behind beta access. Check `lib/utils/beta-access.ts`:

```typescript
import { checkBetaAccess } from "@/lib/utils/beta-access";

const betaAccess = await checkBetaAccess();
if (!betaAccess.hasAccess) {
  redirect("/dashboard");
}
```

## 🎓 Teens Module (Added Jan 2026)

### Overview

The Teens Module provides a pathway for kids (13+) who start earning their own money to transition from the Kids Module to an independent experience, while remaining connected to the parent ecosystem. The goal is to create lifetime customers through smooth, value-driven transitions.

**Key Principle**: FREE while linked to parent ecosystem, 6 months free after full graduation, then regular subscription.

### Three Phases

```
Phase 1: Teen Mode (FREE - within parent ecosystem)
├── Parent enables "Teen Mode" for child
├── Teen gets 6 envelope types (vs 4 in Kids Module)
├── Teen can add external income (job, side gig)
├── Teen can reconcile their own bank transactions
├── Still uses PIN login (kid_session)
└── Covered by parent relationship = FREE

Phase 2: Full Graduation (6 months FREE, then subscription)
├── Parent or teen initiates "Graduate to Own Account"
├── Creates new auth.users record for teen
├── Migrates ALL data from child profile
├── Teen gets email/password login (full Supabase Auth)
└── 6-month free trial via Stripe coupon

Phase 3: Lifetime Customer
├── Optional family link for Household Hub access
├── Teen controls what parents can see (if anything)
└── Eventually brings their own kids to the platform
```

### Conversion Safeguards (Preventing Perpetual Free Users)

| Safeguard | Description |
|-----------|-------------|
| **DOB Required** | Date of birth is REQUIRED to enable teen mode |
| **Age 18 Auto-Graduation** | Teen mode automatically ends at 18th birthday |
| **90-Day Grace Period** | After 18, teens have 90 days to complete graduation |
| **6 Envelope Limit** | Teen mode limits to 6 envelopes max |
| **2 External Income Limit** | Teen mode limits to 2 income sources max |
| **1 Bank Connection Limit** | Teen mode limits to 1 bank connection max |

### Teen Mode Limits

```typescript
// lib/utils/teen-limits.ts
export const TEEN_MODE_LIMITS = {
  envelopes: 6,
  externalIncomeSources: 2,
  bankConnections: 1,
} as const;
```

### Feature Comparison: Teen vs Graduated

| Feature | Teen Mode | Graduated |
|---------|-----------|-----------|
| Envelopes | 6 max | Unlimited |
| Envelope types | All 6 types | All 6 types |
| Debt tracking | Basic only | Full snowball/avalanche |
| Reports/PDF export | No | Yes |
| Net worth tracking | No | Yes |
| Multiple bank connections | 1 max | Unlimited |
| Transaction reconciliation | Yes | Yes |
| External income sources | 2 max | Unlimited |

### Key Database Tables (Teen Mode)

```sql
-- Teen mode columns on child_profiles
is_teen_mode BOOLEAN DEFAULT false
teen_mode_enabled_at TIMESTAMPTZ
can_reconcile_transactions BOOLEAN DEFAULT false
can_add_external_income BOOLEAN DEFAULT false
graduation_status TEXT ('child', 'teen_mode', 'graduating', 'graduated', 'expired')
auto_graduation_date DATE  -- 18th birthday
graduation_grace_ends_at TIMESTAMPTZ

-- Teen external income sources
teen_external_income (id, child_profile_id, name, employer_name, amount, frequency, ...)

-- Teen envelopes (full 6-type system)
teen_envelopes (id, child_profile_id, name, icon, subtype, target_amount, current_amount, ...)

-- Teen envelope allocations
teen_envelope_allocations (id, child_profile_id, teen_envelope_id, income_source_type, allocation_amount, ...)

-- Graduation tracking
teen_graduation_requests (id, child_profile_id, parent_user_id, request_type, status, ...)
graduated_family_links (id, graduated_user_id, parent_user_id, share_budget_overview, ...)
graduation_promo_codes (id, code, graduated_user_id, months_free, is_used, ...)
```

### Key API Routes (Teen Mode)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/kids/[childId]/teen-mode/enable` | POST | Parent enables teen mode |
| `/api/kids/[childId]/teen-mode/disable` | POST | Parent disables teen mode |
| `/api/kids/[childId]/teen-envelopes` | GET/POST | Full envelope CRUD |
| `/api/kids/[childId]/teen-envelopes/[id]` | GET/PATCH/DELETE | Update/delete envelope |
| `/api/kids/[childId]/external-income` | GET/POST | Manage external income |
| `/api/kids/[childId]/external-income/[id]` | GET/PATCH/DELETE | Update/delete income |
| `/api/kids/[childId]/limits` | GET | Get current usage vs limits |

### Teen Envelope Templates

**File:** `lib/teens/teen-envelope-templates.ts`

Common teen expense categories with pre-built templates:

| Category | Examples |
|----------|----------|
| Essentials | Phone Bill, Food & Snacks |
| Transport | Bus/Train, Petrol, Car Expenses |
| Lifestyle | Clothing, Entertainment, Going Out, Hobbies |
| Subscriptions | Netflix, Spotify, Gaming |
| Savings | Emergency Fund, Car Savings, Tech Fund, Travel Fund |

### KidSession Extension

The `KidSession` interface in `lib/utils/kid-session.ts` includes teen mode fields:

```typescript
export interface KidSession {
  // ... existing fields ...

  // Teen mode additions
  isTeenMode: boolean;
  canReconcileTransactions: boolean;
  canAddExternalIncome: boolean;
  autoGraduationDate: string | null; // ISO date of 18th birthday
}
```

### Upgrade Prompt UX

When a teen hits a limit, show an encouraging graduation prompt:

```typescript
// From /api/kids/[childId]/limits response
upgradePrompt: {
  title: "You've Grown!",
  message: "You're managing 6 envelopes like a pro. Graduate to unlock unlimited envelopes.",
  ctaText: "Graduate Now - It's Free!",
  ctaUrl: `/kids/${childId}/graduate`,
}
```

### Migration File

**File:** `supabase/migrations/0077_teen_graduation_system.sql`

Creates all teen mode tables, columns, constraints, triggers, and helper functions.