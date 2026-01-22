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

## Envelope Summary Filters

The Envelope Summary page (`/envelope-summary`) supports filtering envelopes by status:

**Available Filters:**
| Filter | Key | Description |
|--------|-----|-------------|
| All | `all` | Show all envelopes |
| On track | `healthy` | Balance ≥ 80% of target |
| Needs attention | `attention` | Balance < 80% of target |
| Surplus | `surplus` | Balance ≥ 105% of target |
| No target | `no-target` | Target amount is 0 or null |
| Spending | `spending` | `is_spending = true` |
| Tracking | `tracking` | `is_tracking_only = true` |

**Status Bucket Logic:**
```typescript
function getStatusBucket(envelope: SummaryEnvelope): StatusFilter {
  if (envelope.is_tracking_only) return "tracking";
  if (envelope.is_spending) return "spending";
  const target = Number(envelope.target_amount ?? 0);
  if (!target) return "no-target";
  const ratio = Number(envelope.current_amount ?? 0) / target;
  if (ratio >= 1.05) return "surplus";
  if (ratio >= 0.8) return "healthy";
  return "attention";
}
```

**Key Files:**
- Filter UI: `components/layout/envelopes/envelope-summary-client.tsx`
- Summary card: `components/layout/envelopes/envelope-summary-card.tsx`
- Type definition: `SummaryEnvelope` interface includes `is_tracking_only`

## Page Architecture

### Primary User-Facing Pages

#### Allocation (`/allocation`)
The **primary page** for budget management. Users:
- View all envelopes grouped by category
- Edit envelope details inline
- Allocate income to envelopes
- See "Pays Until Due" for bills
- Drag-and-drop to reorder envelopes

**Key Components:**
- `app/(app)/allocation/allocation-client.tsx`
- `components/allocation/income-progress-card.tsx`
- `components/allocation/priority-group.tsx`

#### Envelope Summary (`/envelope-summary`)
Overview page for checking budget status. Users:
- See summary cards (total target, current balance, funding gap)
- Filter envelopes by status
- View progress at a glance
- Transfer funds between envelopes
- See "Pays Until Due" for bills

**Key Components:**
- `components/layout/envelopes/envelope-summary-client.tsx`
- `components/layout/envelopes/envelope-category-group.tsx`
- `components/layout/envelopes/envelope-transfer-dialog.tsx`

#### Dashboard (`/dashboard`)
High-level financial overview. Users:
- See reconciliation status
- View upcoming bills
- Access quick actions
- Monitor credit card coverage

**Key Components:**
- `app/(app)/dashboard/page.tsx`
- Various dashboard widgets

### Deprecated Pages

#### Budget Manager (`/budget-manager`) - ⛔ DEPRECATED
Legacy page kept for reference only. **Do NOT add new features here.**
All budget management features should go to the **Allocation page**.

### Feature Ownership Matrix

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

### When Adding New Features

1. Check the Feature Ownership Matrix above
2. If feature applies to multiple pages, implement on ALL listed pages
3. **NEVER add features to deprecated pages**
4. If unsure, ask before implementing

### Pays Until Due Feature

The "Pays Until Due" feature helps users understand bill urgency in terms of paychecks.

**Files:**
- Core utilities: `lib/utils/pays-until-due.ts`
- Badge component: `components/shared/pays-until-due-badge.tsx`
- Used in: Allocation page, Envelope Summary page

**Color Scheme (Style Guide Compliant):**
Uses **blue colors only** (not red/amber) for urgency to avoid financial anxiety:
- High urgency: `bg-[#DDEAF5]` / `text-[#6B9ECE]`
- Medium urgency: `bg-[#F3F4F6]` / `text-[#6B6B6B]`
- Low/none: transparent / `text-[#9CA3AF]`

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

## Income Allocation Architecture

### Multi-Income Budget System

My Budget Mate supports **multiple income sources** with **individual pay frequencies**. This is a core architectural feature that distinguishes this app from traditional monthly-budget systems.

#### Key Principles

1. **Pay Frequency Based (NOT Monthly)**: Each income source has its own pay cycle
   - Weekly (52 pay cycles/year)
   - Fortnightly (26 pay cycles/year)
   - Twice Monthly (24 pay cycles/year)
   - Monthly (12 pay cycles/year)

2. **Multi-Income Columns**: Budget Manager displays each income source as a column
   - Users can allocate different amounts from each income source to each envelope
   - Example: Salary → Rent ($800), Side Income → Savings ($200)

3. **Zero-Based Budgeting**: All income must be allocated during onboarding
   - System enforces 100% allocation before completing setup
   - Prevents "leftover money" confusion

4. **Normalized Database Design**: Income allocations stored in junction table
   - Enables flexible querying and reporting
   - Supports changing allocations without data migration

### Database Schema

#### `income_sources`
Stores individual income streams with their own pay frequencies.

```sql
CREATE TABLE income_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  pay_cycle TEXT NOT NULL CHECK (pay_cycle IN ('weekly', 'fortnightly', 'twice_monthly', 'monthly')),
  next_pay_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Fields:**
- `pay_cycle`: Individual frequency for THIS income source
- `next_pay_date`: When next payment arrives (used for cash flow forecasting)
- `is_active`: Allows soft-deletion of income sources

#### `envelope_income_allocations`
Junction table linking envelopes to income sources with allocation amounts.

```sql
CREATE TABLE envelope_income_allocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  envelope_id UUID NOT NULL REFERENCES envelopes(id) ON DELETE CASCADE,
  income_source_id UUID NOT NULL REFERENCES income_sources(id) ON DELETE CASCADE,
  allocation_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(envelope_id, income_source_id)
);
```

**Key Fields:**
- `allocation_amount`: Amount allocated per pay cycle of the income source
- `UNIQUE` constraint: One allocation per envelope/income pair
- `user_id`: Denormalized for query performance

#### `envelopes`
Budget categories with calculated totals from all income allocations.

```sql
-- Key envelope fields related to income allocation:
pay_cycle_amount NUMERIC(10, 2)  -- Total from ALL income sources per user's primary pay cycle
annual_amount NUMERIC(10, 2)     -- Annualized total
is_goal BOOLEAN                  -- Goal envelopes don't need pay cycle allocation
is_spending BOOLEAN              -- Spending envelopes don't need pay cycle allocation
is_tracking_only BOOLEAN         -- Tracking-only envelopes (e.g., reimbursements)
```

### Onboarding Flow

The first allocation of income happens during **onboarding**. This is where the multi-income architecture is established.

#### Step-by-Step Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ Step 1-2: Welcome & Persona Selection                          │
│  → Collects user preferences and budget style                  │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 3: Income Setup (CRITICAL)                                │
│  → User adds income sources with individual pay frequencies    │
│  → Example:                                                     │
│     • Salary: $3,000 fortnightly                               │
│     • Side Income: $500 weekly                                 │
│  → Creates records in income_sources table                     │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 4-6: Bank Accounts & Goals                                │
│  → Connect financial accounts                                  │
│  → Set up savings goals                                        │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 7: Envelope Creation                                      │
│  → User creates envelopes (Rent, Groceries, etc.)              │
│  → Sets target amounts and frequencies                         │
│  → Envelopes created WITHOUT allocations yet                   │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 8: Envelope Allocation (CRITICAL - MULTI-INCOME MATRIX)   │
│  → Displays SPREADSHEET with:                                  │
│     • ROWS: Envelopes (Rent, Groceries, Savings, etc.)        │
│     • COLUMNS: Income sources (Salary, Side Income, etc.)      │
│  → User allocates from EACH income source to EACH envelope     │
│  → Example allocation matrix:                                  │
│                                                                 │
│     Envelope      │ Salary (Fortnightly) │ Side Income (Weekly)│
│     ──────────────┼──────────────────────┼─────────────────────│
│     Rent          │       $800           │        $0           │
│     Groceries     │       $300           │      $100           │
│     Savings       │       $500           │      $400           │
│                                                                 │
│  → System enforces 100% allocation (zero-based budgeting)      │
│  → Creates records in envelope_income_allocations              │
│  → Calculates pay_cycle_amount for each envelope               │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 9: Opening Balances (CRITICAL CALCULATION)                │
│  → System calculates SUGGESTED opening balance per envelope    │
│  → Calculation considers:                                      │
│     • Ideal per-pay allocation (from multiple income sources)  │
│     • Next due date for each envelope                          │
│     • Pay cycles remaining until due date                      │
│  → Shows available funds: Bank balance - Credit card debt      │
│  → User specifies actual opening balance allocation            │
│  → System creates "Opening Balance Allocation" transactions    │
│  → Transactions automatically appear in envelope history       │
│  → Warnings shown if insufficient funds (but still allowed)    │
│  → Example:                                                     │
│     • Rates Bill: Suggested $1,100, User allocates $1,100     │
│     • Groceries: Suggested $200, User allocates $200          │
│     • Available: $5,000 | Allocated: $1,300 | Remaining: $3,700│
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 10: Complete                                               │
│  → Review summary of setup                                     │
│  → Mark onboarding_completed = true                            │
└─────────────────────────────────────────────────────────────────┘
```

#### Key Onboarding Components

**`components/onboarding/steps/income-step.tsx`**
- First point where income sources are created
- Allows multiple income sources with individual frequencies
- Validates income amounts and frequencies

**`components/onboarding/steps/envelope-allocation-step.tsx`**
- **THE CRITICAL MULTI-INCOME ALLOCATION INTERFACE**
- Renders spreadsheet with income sources as columns
- Handles zero-based budgeting validation
- Creates all envelope_income_allocations records

**Data Structure During Allocation:**
```typescript
{
  envelopeAllocations: {
    [envelopeId: string]: {
      [incomeSourceId: string]: number  // Amount per income's pay cycle
    }
  }
}

// Example:
{
  "envelope-abc-123": {
    "income-salary-456": 800,      // $800 from salary
    "income-side-789": 0            // $0 from side income
  },
  "envelope-def-456": {
    "income-salary-456": 300,       // $300 from salary
    "income-side-789": 100          // $100 from side income
  }
}
```

### Budget Manager Architecture

Budget Manager is the **central hub** for ongoing budget management after onboarding.

#### Core Features

1. **Income Source Columns**: Displays each income source as a column
2. **Live Allocation Editing**: Users can adjust allocations per envelope/income
3. **Zero-Based Validation**: Warns when total allocation ≠ total income
4. **Envelope Status Tracking**: Identifies unbudgeted envelopes
5. **Drag & Drop Reordering**: Customize envelope display order

#### Component Structure

```
BudgetManagerPage (Server Component)
  ↓ Fetches initial data
  ↓
BudgetManagerClient (Client Component)
  ↓ Manages state with React Query
  ↓
UnifiedEnvelopeTable (Client Component)
  ├─ Sortable column headers (all major columns)
  ├─ Priority traffic light column (🔵🟢⚪)
  ├─ Income source columns (dynamic based on user's income_sources)
  ├─ Envelope rows (all user envelopes)
  ├─ Allocation input cells (envelope × income intersection)
  ├─ Gap analysis columns (Expected, Gap, Status) - maintenance mode
  ├─ Warning hover icons with tooltips
  └─ Totals row (sums allocations per income source)
```

#### Sortable Columns

All major columns in the Budget Manager table support sorting:

**Implementation:**
```typescript
// Sort state (in unified-envelope-table.tsx)
type SortColumn = 'name' | 'priority' | 'subtype' | 'targetAmount' | 'frequency' | 'dueDate' | 'currentAmount' | 'totalFunded' | null;
type SortDirection = 'asc' | 'desc';

const [sortColumn, setSortColumn] = useState<SortColumn>(null);
const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
```

**Sort Behavior:**
1. Click header → Sort ascending
2. Click again → Sort descending
3. Click third time → Clear sort

**Sort Icons:**
- `ArrowUpDown` - No sort (neutral)
- `ArrowUp` - Ascending
- `ArrowDown` - Descending

#### Priority Traffic Light System

Priority column uses compact traffic light dots for visual clarity:

| Priority | Color | Dot Style |
|----------|-------|-----------|
| Essential | 🔵 Blue | `bg-blue` or `bg-[#6B9ECE]` |
| Important | 🟢 Green/Sage | `bg-sage-dark` or `bg-[#5A7E7A]` |
| Flexible | ⚪ Silver | `bg-silver` or `bg-[#9CA3AF]` |

**Display:** Small colored circle (2.5rem) that expands to dropdown on click.
**Hidden for:** `savings`, `goal`, and `tracking` subtypes (shows "—").

#### Warning Hover System

Validation warnings appear as hover icons near the delete button:

**Icon Colors:**
- Red triangle - Error warnings (blocking)
- Amber triangle - Warning warnings (advisory)
- Blue triangle - Info warnings (informational)

**Validation Checks:**
```typescript
// In validateEnvelope() function
1. Name required (all types)
2. Target amount required (bills only)
3. Frequency required (bills only)
4. Under-allocated warnings
5. Over-allocated info
6. Opening balance recommendations (onboarding)

// Tracking envelopes skip validation:
if (envelope.subtype === 'tracking') {
  return warnings;  // Only name check
}
```

**Tooltip Display:**
- Absolute positioned above the icon
- Shows on hover with `group-hover:block`
- Lists all warnings with bullet points and color coding

#### Critical Implementation Detail

**File:** `app/(app)/budget-manager/budget-manager-client.tsx`

**Current Issue (Line 105):**
```typescript
incomeAllocations: {}, // TODO: Fetch from envelope_income_allocations
```

**Required Fix:**
Must fetch allocations from `envelope_income_allocations` table and structure as:
```typescript
{
  [envelopeId]: {
    [incomeSourceId]: allocationAmount
  }
}
```

#### Income Column Design

Each income source appears as a column with:
- **Header**: Income source name + pay cycle frequency
- **Total Available**: Total income per pay cycle
- **Total Allocated**: Sum of allocations in that column
- **Remaining**: Available - Allocated (should be $0 for zero-based budgeting)
- **Warning**: Shows if over/under allocated

#### Envelope Types & Budget Status

The system supports **5 envelope subtypes** defined in `lib/types/unified-envelope.ts`:

```typescript
export type EnvelopeSubtype = 'bill' | 'spending' | 'savings' | 'goal' | 'tracking';
```

**Budget Requirements by Type:**

| Subtype | Description | Needs Budget? | Priority? | Frequency? |
|---------|-------------|---------------|-----------|------------|
| `bill` | Recurring bills with due dates | ✅ Yes | ✅ Yes | ✅ Required |
| `spending` | Spending tracking only | ❌ No | ✅ Yes | ❌ No |
| `savings` | Savings goals | ❌ No | ❌ No | ❌ Optional |
| `goal` | One-time goals | ❌ No | ❌ No | ❌ No |
| `tracking` | Tracking-only (reimbursements) | ❌ No | ❌ No | ❌ No |

**Subtype-to-Flag Sync:**
When updating envelope subtype via API, the `is_tracking_only` flag is automatically synced:

```typescript
// In app/api/envelopes/[id]/route.ts
if ("subtype" in payload) {
  payload.is_tracking_only = payload.subtype === "tracking";
}
```

**Validation Function:**
```typescript
// From lib/utils/envelope-budget-status.ts
export function envelopeNeedsBudget(envelope: {
  is_tracking_only?: boolean;
  is_spending?: boolean;
  is_goal?: boolean;
  pay_cycle_amount?: number | null;
}): boolean {
  if (envelope.is_tracking_only) return false;
  if (envelope.is_spending) return false;
  if (envelope.is_goal) return false;
  const amount = envelope.pay_cycle_amount ?? 0;
  return amount === 0;  // Regular envelopes need budget
}
```

**Database Migration:**
- Migration file: `supabase/migrations/0024_envelope_tracking_flag.sql`
- Adds `is_tracking_only` boolean column to envelopes table
- Includes `envelope_needs_budget()` PostgreSQL function

### Ideal Allocation System (The Magic)

**This is the core innovation that makes My Budget Mate unique.**

#### The Principle

Every envelope has an **ideal steady-state allocation** that is calculated based solely on:
- The bill's target amount
- The bill's frequency (annual, quarterly, monthly, etc.)
- The user's pay cycle frequency

This ideal allocation **never changes** unless the bill details change. It is independent of:
- ❌ Due dates
- ❌ Current envelope balance
- ❌ Opening balance
- ❌ How far through the billing period you are

#### The Formula

**Ideal Per-Pay Allocation:**
```
idealPerPay = (targetAmount ÷ billCyclesPerYear) ÷ userPayCyclesPerYear
```

**Example 1: Annual $1,000 bill, user pays fortnightly**
```
idealPerPay = ($1,000 ÷ 1) ÷ 26 = $38.46 per fortnight
```

**Example 2: Quarterly $300 bill, user pays weekly**
```
idealPerPay = ($300 ÷ 4) ÷ 52 = $1.44 per week
```

**Example 3: Monthly $200 bill, user pays fortnightly**
```
idealPerPay = ($200 × 12) ÷ 26 = $92.31 per fortnight
```

#### Gap Analysis - The Discipline Mechanism

The system shows users where they **should be** vs where they **actually are**:

**Expected Balance Formula:**
```
expectedBalance = idealPerPay × payCyclesElapsed
```

**Gap Calculation:**
```
gap = actualBalance - expectedBalance
```

**Example Scenario:**
```
Rates Bill: $2,200 annual, due December
Ideal allocation: $84.62/fortnight (for 26 cycles)
Current date: June (13 fortnights elapsed)

Expected balance now: $84.62 × 13 = $1,100
Actual balance: $750
Gap: $750 - $1,100 = -$350 ⚠️ BEHIND

This forces the user to make tough choices:
1. Top up from surplus (if available)
2. Reduce discretionary spending
3. Generate extra income (side jobs, selling items)
4. Re-evaluate if bill is essential
```

#### Why This Works

1. **Forces Financial Discipline**: Users can't hide from gaps
2. **Crystal Clear Visibility**: No ambiguity about financial health
3. **Enables Better Decisions**: Users see trade-offs clearly
4. **Prevents Budget Drift**: Constant feedback keeps users on track
5. **Simple & Consistent**: Same ideal amount every pay cycle

#### User Experience Flow

**Step 1: System Suggests Ideal**
```
Rates Bill
Target: $2,200 annual
Suggested: $84.62/fortnight 💡
[Accept Suggestion] [Enter Manually]
```

**Step 2: User Accepts (Locks In)**
```
Rates Bill
Allocated: $84.62/fortnight 🔒
Expected Now: $1,100
Current Balance: $750
Gap: -$350 ⚠️ Needs attention
[Top-Up from Surplus]
```

**Step 3: User Addresses Gap**
- Transfer surplus from other envelopes
- Make extra savings this pay cycle
- Accept temporary shortfall with plan to catch up

**Step 4: Auto-Unlock on Changes**
```
User increases bill to $2,400:
→ System auto-unlocks allocation
→ Recalculates ideal: $92.31/fortnight
→ Shows new suggestion
→ User must re-accept
```

#### Multi-Income Distribution

When user accepts ideal suggestion, the suggested distribution is **calculated at onboarding setup** based on the first pay cycle due date. However, the actual allocation **only happens when income transactions arrive** in the bank account.

**The Rule System:**

1. **Suggestion Phase (Onboarding):**
```
Total ideal: $84.62/fortnight
Income 1 (Salary): $3,000 (75% of total income)
Income 2 (Side): $1,000 (25% of total income)

Suggested distribution (proportional):
- From Salary: $63.47 (75%)
- From Side: $21.15 (25%)

User accepts → Creates RULE in envelope_income_allocations
```

2. **Activation Phase (Bank Transaction Arrives):**
```
Event: Salary income transaction detected in bank account
Amount: $3,000 (matches income source)
System triggers: Apply allocation rules

For each envelope with locked allocation:
- Rates Bill: Transfer $63.47 from salary to envelope
- Groceries: Transfer $23.08 from salary to envelope
- Savings: Transfer $38.46 from salary to envelope
... (continues for all envelopes)

Result: Income automatically distributed per the rules
```

**Key Points:**
- ✅ Rules are set during onboarding/budget manager
- ✅ Rules are ACTIVATED when income transaction arrives
- ✅ System matches bank transaction to income source
- ✅ Automatic distribution happens without user intervention
- ✅ User can see transaction history showing the distribution

**Manual Override:**
User can manually adjust distribution percentages while keeping total equal to ideal, but changes only apply to FUTURE income transactions.

#### Implementation Location

**Core Calculator:**
- File: `lib/utils/ideal-allocation-calculator.ts`
- Function: `calculateIdealAllocation(envelope, userPayCycle)`
- Function: `calculateEnvelopeGap(envelope, userPayCycle, currentDate)`

**Budget Manager Display:**
- File: `components/shared/unified-envelope-table.tsx`
- Columns: Suggested | Expected Now | Current | Gap | Actions
- Visual indicators: 🟢 On track | 🟡 Slight deviation | 🔴 Needs attention

**Database Fields:**
- `envelope_income_allocations.suggested_amount` - The ideal per-pay
- `envelope_income_allocations.allocation_locked` - User accepted suggestion
- `envelope_income_allocations.locked_at` - When accepted

#### Opening Balance Strategy

Opening balance serves a different purpose than ongoing allocations:

**At Onboarding (Step 9: Opening Balances):**

The system calculates the SUGGESTED opening balance for each envelope by working backwards from the due date:

**Calculation Formula:**
```
suggestedOpeningBalance = targetAmount - (idealPerPay × payCyclesUntilDue)

Where:
- targetAmount = envelope target amount
- idealPerPay = sum of allocations from ALL income sources
- payCyclesUntilDue = number of pay cycles until next due date
```

**Example with Multiple Income Sources:**
```
User Setup:
- Income 1 (Salary): $3,000 fortnightly (26 cycles/year)
- Income 2 (Side): $1,000 weekly (52 cycles/year)
- Current date: June 1st (starting onboarding)
- Bank balance: $5,000
- Credit card debt: $1,200
- Available funds: $5,000 - $1,200 = $3,800

Envelope: Rates Bill
- Target: $2,200 annual
- Due date: December 31st
- Bill cycle: Oct 1 → Sept 30 (USER SPECIFIED)
- Ideal per-pay allocations (from Step 8):
  * From Salary: $63.47/fortnight
  * From Side: $21.15/week
  * Combined ideal (converted to fortnight): $84.62/fortnight

Pay cycles until due (June 1 → Dec 31):
- 13 fortnights

Will accumulate: $84.62 × 13 = $1,100
Opening balance needed: $2,200 - $1,100 = $1,100

System suggests: $1,100 ✓
```

**Complete Opening Balance Screen Example:**
```
┌─────────────────────────────────────────────────────────────┐
│ Step 9: Opening Balances                                    │
│                                                              │
│ Available Funds:                                            │
│   Bank balance:        $5,000.00                            │
│   Credit card debt:   -$1,200.00                            │
│   ─────────────────────────────                             │
│   AVAILABLE:           $3,800.00                            │
│                                                              │
│ Suggested Allocations:                                      │
│                                                              │
│ Envelope         | Target  | Due Date | Suggested | Allocate│
│ ─────────────────┼─────────┼──────────┼───────────┼─────────│
│ Rates Bill       | $2,200  | Dec 31   | $1,100    | [____]  │
│ Car Insurance    | $800    | Aug 15   | $600      | [____]  │
│ Groceries        | $400/mo | Ongoing  | $200      | [____]  │
│ Emergency Fund   | $5,000  | Goal     | $0        | [____]  │
│                                                              │
│ Total Suggested:  $1,900                                     │
│ Total Allocated:  $______ (user enters amounts)             │
│ Remaining:        $______                                    │
│                                                              │
│ [Calculate Suggestions] [Continue]                          │
└─────────────────────────────────────────────────────────────┘
```

**Scenario A: Sufficient funds**
```
- Available funds: $3,800
- User accepts all suggestions:
  * Rates Bill: $1,100 ✓
  * Car Insurance: $600 ✓
  * Groceries: $200 ✓
  * Emergency Fund: $0 (goal - no allocation needed)
- Total allocated: $1,900
- Remaining: $1,900

System creates transactions:
- "Opening Balance Allocation" for $1,100 → Rates Bill
- "Opening Balance Allocation" for $600 → Car Insurance
- "Opening Balance Allocation" for $200 → Groceries

Result: All envelopes funded properly ✓
```

**Scenario B: Insufficient funds**
```
- Available funds: $800 (user has less money)
- System shows warning: "Insufficient funds. Prioritize essential envelopes."
- User allocates strategically:
  * Rates Bill: $500 (partial) ⚠️
  * Car Insurance: $300 (partial) ⚠️
  * Groceries: $0 (skip for now) ⚠️
  * Emergency Fund: $0 (goal - skip)
- Total allocated: $800
- Remaining: $0

System creates transactions:
- "Opening Balance Allocation" for $500 → Rates Bill
- "Opening Balance Allocation" for $300 → Car Insurance

Gap warnings shown:
- Rates Bill: -$600 behind (needs $1,100, has $500)
- Car Insurance: -$300 behind (needs $600, has $300)
- Groceries: -$200 behind (needs $200, has $0)

User acknowledges shortfalls and plans to catch up through:
  * Extra allocations from future income
  * Surplus from other envelopes
  * Additional income generation
  * Accepting temporary behind-status
```

**Key Implementation Points:**
- ✅ Users INPUT opening balance allocations (not manual transfers)
- ✅ System automatically creates transactions for opening balance allocations
- ✅ Transactions appear in envelope history with description "Opening Balance Allocation"
- ✅ System warns if total opening balance allocations exceed available funds
- ✅ System ALLOWS insufficient opening balance (with warnings)
- ✅ No manual envelope-to-envelope transfers required during onboarding

**Key Point:** The system WARNS about insufficient opening balance but ALLOWS it. Users may legitimately start behind and plan to catch up.

**Ongoing (Post-Onboarding):**
```
Opening balance is a fixed amount, not recalculated
Gap analysis shows if current balance is on track
User addresses gaps through:
1. Surplus allocation
2. Extra savings
3. Financial discipline
NOT through adjusting opening balance
```

#### Key Quotes from Requirements

> "The calculator needs to be based off 'an ideal'. If I have a bill that is $1,000, and I pay it every year in December. How much do I need to put in (regardless of opening balance or arrears)."

> "If there is an amount outstanding because we are part way through the billing period and haven't budgeted to date, the difference is what is required to bring it up to balance so it's on track."

> "This is where the user has to define what is essential verses discretionary and they make good financial choices to ensure their envelope balances are in line with their payments."

#### This is the Magic

The ideal allocation system creates **psychological pressure** to maintain discipline:
- You can't ignore gaps
- You must make choices
- You see consequences immediately
- You learn financial responsibility

This transforms budgeting from:
- ❌ "Hope I have enough when the bill is due"
- ✅ "I know exactly where I stand every pay cycle"

### Legacy System (Deprecated)

**⚠️ WARNING: Dual Allocation System Exists**

There is a **legacy allocation system** that should NOT be used for new code:

#### `recurring_income` table (LEGACY)
```sql
CREATE TABLE recurring_income (
  allocations JSONB  -- LEGACY: Stores allocations as JSON blob
);
```

**Problems with Legacy System:**
- JSONB format makes querying difficult
- No referential integrity
- Single income source only
- Cannot support multi-income architecture

**Migration Plan:**
- See `MIGRATION_PLAN.md` (to be created)
- Eventually migrate all `recurring_income` data to `income_sources` + `envelope_income_allocations`
- Make Recurring Income page read-only with "Edit in Budget Manager" buttons

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
- Links to income allocations via `envelope_income_allocations`

#### `goals`
- Savings goals with target amounts and deadlines
- Tracks progress towards financial objectives

#### `income_sources`
- Recurring income with individual pay frequencies
- Created during onboarding income step
- Each source can have different pay cycle (weekly/fortnightly/monthly)

#### `envelope_income_allocations`
- Junction table linking envelopes to income sources
- Stores allocation amount per envelope per income source
- Created during onboarding allocation step

### Relationships

```
users (Supabase Auth)
  ↓
profiles (user_id) ──────────────────┐
  ↓                                   │
income_sources (user_id)              │
  ↓                                   │
envelope_income_allocations ←─────────┤
  ↓                                   │
envelopes (user_id) ──────────────────┤
  ↓                                   │
accounts (user_id) ───────────────────┤
  ↓                                   │
transactions ─────────────────────────┤
  ↓                                   │
goals (user_id) ──────────────────────┘
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

---

## Ideal Allocation System Implementation

**Status**: ✅ **COMPLETE** (100% - All 10 tasks implemented)
**Implementation Date**: December 2, 2025

### Overview

The Ideal Allocation System is the core innovation of My Budget Mate - "The Magic" that makes zero-based budgeting automatic. The system calculates ideal steady-state allocations for bills, locks them as rules, and automatically distributes income to envelopes when it arrives.

**Full Implementation Guide**: See [IDEAL_ALLOCATION_IMPLEMENTATION_COMPLETE.md](./IDEAL_ALLOCATION_IMPLEMENTATION_COMPLETE.md)

### Core Principle

The ideal allocation is **independent** of:
- Current envelope balance
- Opening balance
- Due dates
- Time elapsed since last payment

**Formula**:
```
idealPerPay = (targetAmount ÷ billCyclesPerYear) ÷ userPayCyclesPerYear
```

**Example**: A $1,000 annual bill for a fortnightly payer = $38.46 per fortnight
This amount **NEVER changes** unless the bill details (amount, frequency, or due date) change.

### Architecture Components

#### 1. Core Calculator (`lib/utils/ideal-allocation-calculator.ts`)

**Key Functions**:
- `calculateIdealAllocation()` - Calculates ideal per-pay for single envelope
- `calculateIdealAllocationMultiIncome()` - Handles multiple income sources
- `calculateEnvelopeGap()` - Compares expected vs actual balance with status
- `calculateSuggestedOpeningBalance()` - Opening balance recommendations
- `getCyclesPerYear()` - Frequency conversion utility

**Pay Cycles Supported**: Weekly (52), Fortnightly (26), Twice Monthly (24), Monthly (12), Quarterly (4), Annual (1)

#### 2. Database Schema

**Migration**: `supabase/migrations/0025_ideal_allocation_system.sql`

**New Fields in `envelope_income_allocations`**:
```sql
suggested_amount NUMERIC(10, 2),      -- AI-calculated suggestion
allocation_locked BOOLEAN DEFAULT false, -- User adopted suggestion
locked_at TIMESTAMPTZ                 -- When locked
```

**New Fields in `envelopes`**:
```sql
bill_cycle_start_date DATE            -- User-specified billing start
```

**Indexes**:
```sql
CREATE INDEX idx_envelope_income_allocations_locked
ON envelope_income_allocations(user_id, allocation_locked)
WHERE allocation_locked = true;
```

#### 3. API Endpoints

**a) Suggestions API**
- **Endpoint**: `POST /api/envelope-allocations/suggest`
- **Purpose**: Generate ideal allocations for all user envelopes
- **Response**: Suggestions with per-income-source breakdown
- **File**: `app/api/envelope-allocations/suggest/route.ts`

**b) Lock/Unlock API**
- **Endpoint**: `PATCH /api/envelope-allocations/lock`
- **Purpose**: Lock/unlock allocation rules
- **Body**: `{ envelope_id, lock: boolean, suggested_allocations? }`
- **Behavior**: When locking, updates amounts and sets `allocation_locked = true`
- **File**: `app/api/envelope-allocations/lock/route.ts`

**c) Gap Analysis API**
- **Endpoint**: `GET /api/envelope-allocations/gap-analysis`
- **Purpose**: Calculate expected vs actual for all envelopes
- **Response**: Gap data with status indicators (on_track, slight_deviation, needs_attention)
- **File**: `app/api/envelope-allocations/gap-analysis/route.ts`

**d) Income Processing API**
- **Endpoint**: `POST /api/transactions/process-income`
- **Purpose**: Detect income and auto-allocate to envelopes
- **Body**: `{ transaction_id }`
- **Batch**: `PUT /api/transactions/process-income/batch` with `{ transaction_ids: [] }`
- **File**: `app/api/transactions/process-income/route.ts`

#### 4. Opening Balance System

**Transaction Generator** (`lib/server/create-opening-balance-transactions.ts`):
- Creates virtual "Opening Balance" account (type: adjustment, hidden)
- Generates transactions with description "Opening Balance Allocation"
- Creates envelope splits automatically
- Updates envelope balances via RPC
- Transactions appear in envelope history

**Onboarding Step 9** (`components/onboarding/steps/opening-balance-step.tsx`):
- Displays available funds: Bank Balance - Credit Card Debt
- Shows suggested opening balance per envelope
- Allows user adjustments
- **Warns but allows** insufficient funds (user may add more later)
- Integrated between Step 8 (Allocate) and Step 10 (Review)

**Onboarding Flow Updated**:
```
1. Welcome
2. About You
3. Bank Accounts
4. Income
5. Approach
6. Learn
7. Envelopes
8. Allocate
9. Opening Balance ← NEW STEP
10. Review
11. Complete
```

#### 5. Budget Manager UI

**Ideal Allocation Banner** (`components/budget-manager/ideal-allocation-banner.tsx`):
- Purple gradient banner when suggestions available
- "View Details" button → Dialog with per-envelope breakdown
- "Adopt All" button → Locks all suggestions in one click
- Shows distribution across multiple income sources
- Located between Credit Card Widget and Envelope Table

**Gap Analysis Widget** (`components/budget-manager/gap-analysis-widget.tsx`):
- Table columns: Envelope | Ideal/Pay | Expected Now | Current | Gap | Status | Lock
- Color-coded gaps:
  - Green (ahead of schedule)
  - Amber (slight gap, -$0 to -$50)
  - Red (needs attention, < -$50)
- Status badges with icons (🟢🟡🔴)
- Lock indicators (🔒 locked, 🔓 unlocked)
- Summary stats: Count by status
- Auto-refreshes every 5 minutes
- Located after Envelope Table

#### 6. Auto-Unlock Mechanism

**Location**: `app/api/envelopes/[id]/route.ts` (Lines 90-117)

**Critical Fields** (trigger unlock):
- `target_amount`
- `frequency`
- `due_date`

**Behavior**:
1. Detects if any critical field changed
2. Unlocks all locked allocations for that envelope
3. Sets `allocation_locked = false`, clears `locked_at`
4. Logs unlock operation
5. User sees suggestions banner reappear with updated amounts

**Why**: When bill details change, ideal allocation changes, so old rules are invalid.

#### 7. Income Transaction System

**Income Matcher** (`lib/server/income-transaction-matcher.ts`):

**Detection Algorithm**:
- Amount match (50% weight): ±5% tolerance
- Description/merchant match (30% weight): Text search
- Category match (20% weight): 'income' or 'transfer'
- Minimum 50% confidence required for auto-match

**Functions**:
- `detectIncomeTransaction()` - AI-like matching with confidence scoring
- `getLockedAllocations()` - Fetches active allocation rules
- `isTransactionProcessed()` - Prevents duplicate processing
- `markAsIncomeTransaction()` - Tags transaction as income

**Auto-Allocator** (`lib/server/auto-envelope-allocator.ts`):

**Functions**:
- `autoAllocateToEnvelopes()` - Distributes income to envelopes
- `processTransactionForAllocation()` - Main orchestrator

**Process Flow**:
```
1. Transaction created/imported
2. ↓
3. Detect if income (amount, description, category)
4. ↓
5. Match to income source (confidence scoring)
6. ↓
7. Mark transaction as income
8. ↓
9. Get locked allocation rules for income source
10. ↓
11. Create envelope splits for each rule
12. ↓
13. Update envelope balances via RPC
14. ↓
15. Return allocation results
```

### User Experience Flow

#### During Onboarding:
1. User sets up bank accounts (Step 3)
2. User adds income sources with pay cycles (Step 4)
3. User creates bill envelopes with amounts, frequencies, due dates (Step 7)
4. User allocates per-income-source amounts (Step 8)
5. **User sets opening balances** from current bank balance (Step 9)
6. System **automatically creates** "Opening Balance Allocation" transactions
7. User reviews budget and completes (Step 10-11)

#### In Budget Manager:
1. **Purple banner appears**: "Ideal Allocation Suggestions Available"
2. User clicks "View Details" → sees breakdown per envelope and income source
3. User clicks "Adopt All" → suggestions become **locked rules**
4. **Gap Analysis Widget** shows:
   - Expected balance (based on pay cycles elapsed)
   - Current balance
   - Gap with color-coded status (🟢🟡🔴)
   - Lock status (🔒/🔓)

#### When Income Arrives:
1. User syncs bank or manually enters paycheck
2. System **detects income** automatically (amount + description matching)
3. System gets **locked allocation rules** for matched income source
4. System **automatically creates** envelope splits
5. System **updates** envelope balances
6. User sees updated balances in Budget Manager
7. Gap Analysis **automatically updates**

#### When Bills Change:
1. User updates bill amount, frequency, or due date
2. System **automatically unlocks** allocations for that envelope
3. Purple banner **reappears** with new suggestions
4. User re-adopts suggestions with updated amounts
5. New locked rules take effect for next income

### Integration Points

**To call auto-allocation after transaction creation**:

```typescript
// Single transaction
await fetch('/api/transactions/process-income', {
  method: 'POST',
  body: JSON.stringify({ transaction_id: newTransaction.id })
});

// Batch (after bank sync/import)
await fetch('/api/transactions/process-income/batch', {
  method: 'PUT',
  body: JSON.stringify({ transaction_ids: syncedTransactionIds })
});
```

**When to call**:
- After manual transaction entry
- After bank sync (Plaid/Teller)
- After CSV/OFX import
- After transaction form submission

### File Structure

```
app/api/
├── envelope-allocations/
│   ├── suggest/route.ts          ✅ Generate suggestions
│   ├── lock/route.ts              ✅ Lock/unlock rules
│   └── gap-analysis/route.ts      ✅ Calculate gaps
├── envelope-income-allocations/
│   └── route.ts                   ✅ Bulk fetch
├── envelopes/[id]/
│   └── route.ts                   ✅ PATCH with auto-unlock
├── onboarding/unified/
│   └── route.ts                   ✅ Opening balance integration
└── transactions/process-income/
    └── route.ts                   ✅ Auto-allocation API

components/
├── budget-manager/
│   ├── ideal-allocation-banner.tsx    ✅ Suggestions UI
│   └── gap-analysis-widget.tsx        ✅ Gap display
├── onboarding/steps/
│   └── opening-balance-step.tsx       ✅ Step 9
└── ui/
    ├── skeleton.tsx                   ✅ Loading states
    └── table.tsx                      ✅ Table components

lib/
├── server/
│   ├── create-opening-balance-transactions.ts  ✅ Transaction generator
│   ├── income-transaction-matcher.ts           ✅ Income detection
│   └── auto-envelope-allocator.ts              ✅ Allocation engine
└── utils/
    └── ideal-allocation-calculator.ts          ✅ Core calculations

supabase/migrations/
└── 0025_ideal_allocation_system.sql    ✅ Database schema

docs/
└── IDEAL_ALLOCATION_IMPLEMENTATION_COMPLETE.md  ✅ Full guide
```

### Data Flow Diagram

```
ONBOARDING
┌─────────────────────────────────────────┐
│ Step 7: Create Envelopes                │
│ Step 8: Allocate to Income Sources      │
│ Step 9: Set Opening Balances            │
│         ↓                                │
│    Auto-create "Opening Balance         │
│    Allocation" transactions             │
└────────────────┬────────────────────────┘
                 │
                 ▼
BUDGET MANAGER
┌─────────────────────────────────────────┐
│ Ideal Allocation Banner                 │
│ • View Details → Dialog                 │
│ • Adopt All → Lock Rules                │
│         ↓                                │
│ Allocations locked                      │
│ (allocation_locked = true)              │
└────────────────┬────────────────────────┘
                 │
                 ▼
INCOME ARRIVES
┌─────────────────────────────────────────┐
│ Transaction created/imported            │
│         ↓                                │
│ Income Detection                        │
│ (amount, description, category)         │
│         ↓                                │
│ Match to Income Source                  │
│ (confidence scoring)                    │
│         ↓                                │
│ Get Locked Allocation Rules             │
│         ↓                                │
│ Auto-create Envelope Splits             │
│         ↓                                │
│ Update Envelope Balances                │
└────────────────┬────────────────────────┘
                 │
                 ▼
         ┌───────────────┐
         │ Gap Analysis  │
         │ Updates       │
         │ Automatically │
         └───────────────┘
```

### Success Metrics

✅ **User Experience**:
- Zero manual transfers needed for opening balances
- One-click adoption of ideal allocations
- Automatic envelope funding when income arrives
- Real-time gap analysis for financial discipline

✅ **Technical**:
- 100% feature completion (10/10 tasks)
- Comprehensive error handling and logging
- Scalable architecture for future enhancements
- Clean separation of concerns (API/Logic/UI)

✅ **Business**:
- Core innovation ("The Magic") fully implemented
- Zero-based budgeting made automatic
- Financial discipline enforced through gap analysis
- Multi-income household support

### Testing Checklist - Ideal Allocation

- [ ] **Onboarding**: Complete flow with multiple income sources
- [ ] **Step 9**: Verify available funds calculation (bank - credit cards)
- [ ] **Step 9**: Verify opening balance transactions auto-created
- [ ] **Budget Manager**: Verify ideal allocation banner appears
- [ ] **Suggestions**: Click "View Details" and verify breakdown
- [ ] **Adopt**: Click "Adopt All" and verify allocations locked (🔒)
- [ ] **Gap Analysis**: Verify widget displays with correct colors
- [ ] **Gap Analysis**: Verify status indicators work (🟢🟡🔴)
- [ ] **Auto-Unlock**: Change bill amount → verify allocations unlock
- [ ] **Auto-Unlock**: Change frequency → verify banner reappears
- [ ] **Auto-Unlock**: Change due date → verify unlock
- [ ] **Income**: Create manual transaction → verify detection
- [ ] **Income**: Verify envelope splits created automatically
- [ ] **Income**: Verify balances update correctly
- [ ] **Batch**: Test batch processing with multiple transactions
- [ ] **Edge Cases**: Insufficient opening balance (warning displays)
- [ ] **Edge Cases**: No locked rules (message shows)
- [ ] **Edge Cases**: Multiple income sources (distribution works)

### Future Enhancements

**Phase 2 (Planned)**:
- Manual income matching UI (user overrides detection)
- Allocation history tracking with audit log
- Real-time notifications when income auto-allocated
- Confidence threshold settings (user adjusts sensitivity)

**Phase 3 (Future)**:
- Machine learning for improved detection patterns
- Predictive analytics (forecast envelope funding dates)
- Smart adjustment suggestions based on spending patterns
- Bill pay integration (auto-pay when envelope funded)

---

## Credit Card Onboarding & Dashboard System

**Status**: ✅ **COMPLETE** (100% - All 11 phases implemented)
**Implementation Date**: December 2025

### Overview

The Credit Card System provides comprehensive support for tracking credit card usage, billing cycles, payment reconciliation, and debt payoff projections. It integrates seamlessly into the onboarding flow and provides dashboard components for ongoing management.

### Three Usage Types (A/B/C Paths)

| Type | Description | Creates |
|------|-------------|---------|
| **pay_in_full** (A) | Pay off balance each month | CC Holding + Payment envelopes |
| **paying_down** (B) | Actively paying down debt | CC Holding (if still using) + Debt + Payment envelopes |
| **minimum_only** (C) | Just tracking minimum payments | CC Holding (if still using) + Debt + Payment envelopes |

### Key Concepts

#### CC Holding Envelope
- Holds money set aside for credit card payments
- For pay_in_full: pre-funded with current statement balance
- For paying_down/minimum_only: tracks new spending (if still using card)
- **Critical**: Affects reconciliation formula (see below)

#### Billing Cycle Tracking
- Statement close day (1-31)
- Payment due day (1-31)
- Cycle identifier format: `YYYY-MM`

#### Hybrid Mode (Still Using Toggle)
For users paying down debt but still using the card:
- New spending tracked in CC Holding envelope (separate from legacy debt)
- Legacy debt tracked in CC Debt envelope
- Clear separation allows accurate payoff progress tracking

### Database Schema

**Migration**: `supabase/migrations/0029_credit_card_onboarding.sql`

```sql
-- Credit card configuration (per account)
CREATE TABLE credit_card_configs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  account_id UUID REFERENCES accounts,
  usage_type TEXT CHECK (usage_type IN ('pay_in_full', 'paying_down', 'minimum_only')),
  statement_close_day INTEGER CHECK (1 <= statement_close_day AND statement_close_day <= 31),
  payment_due_day INTEGER CHECK (1 <= payment_due_day AND payment_due_day <= 31),
  apr NUMERIC(5, 2),
  minimum_payment NUMERIC(10, 2),
  still_using BOOLEAN DEFAULT true,
  starting_debt_amount NUMERIC(10, 2),
  starting_debt_date TIMESTAMPTZ,
  expected_monthly_spending NUMERIC(10, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Billing cycle holding records
CREATE TABLE credit_card_cycle_holdings (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  account_id UUID REFERENCES accounts,
  billing_cycle TEXT,  -- YYYY-MM format
  statement_close_date DATE,
  payment_due_date DATE,
  spending_amount NUMERIC(10, 2) DEFAULT 0,
  covered_amount NUMERIC(10, 2) DEFAULT 0,
  interest_amount NUMERIC(10, 2) DEFAULT 0,
  is_current_cycle BOOLEAN DEFAULT false,
  is_closed BOOLEAN DEFAULT false,
  closed_at TIMESTAMPTZ
);

-- Payment reconciliation records
CREATE TABLE payment_reconciliations (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  account_id UUID REFERENCES accounts,
  transaction_id UUID REFERENCES transactions,
  total_payment_amount NUMERIC(10, 2),
  payment_date DATE,
  amount_to_holding NUMERIC(10, 2) DEFAULT 0,
  amount_to_debt NUMERIC(10, 2) DEFAULT 0,
  amount_to_interest NUMERIC(10, 2) DEFAULT 0,
  billing_cycle TEXT,
  reconciliation_method TEXT
);

-- Payoff projections
CREATE TABLE payoff_projections (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  account_id UUID REFERENCES accounts,
  monthly_payment_amount NUMERIC(10, 2),
  apr_used NUMERIC(5, 2),
  starting_balance NUMERIC(10, 2),
  projected_payoff_date DATE,
  total_interest_projected NUMERIC(10, 2),
  total_payments_projected NUMERIC(10, 2),
  months_to_payoff INTEGER,
  projection_type TEXT,
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Type Definitions

**File**: `lib/types/credit-card-onboarding.ts`

```typescript
// Core usage type
type CreditCardUsageType = 'pay_in_full' | 'paying_down' | 'minimum_only';

// Card network detection
type CardNetwork = 'visa' | 'mastercard' | 'amex' | 'discover' | 'other';

// Configuration collected during onboarding
interface CreditCardConfig {
  accountId: string;
  accountName: string;
  usageType: CreditCardUsageType;
  billingCycle?: {
    statementCloseDay: number;
    paymentDueDay: number;
  };
  apr?: number;
  currentOutstanding?: number;
  expectedMonthlySpending?: number;
  stillUsing?: boolean;
  startingDebtAmount?: number;
  startingDebtDate?: string;
  minimumPayment?: number;
}

// Payoff projection
interface PayoffProjection {
  accountId: string;
  monthlyPaymentAmount: number;
  aprUsed: number;
  startingBalance: number;
  projectedPayoffDate: Date | null;
  totalInterestProjected: number;
  totalPaymentsProjected: number;
  monthsToPayoff: number;
  projectionType: 'minimum_only' | 'current_payment' | 'custom';
}
```

### Utility Functions

**File**: `lib/utils/credit-card-onboarding-utils.ts`

| Function | Purpose |
|----------|---------|
| `validateCreditCardConfig()` | Validates config, returns errors/warnings |
| `getEnvelopesForCreditCard()` | Generates envelope templates based on usage type |
| `getCurrentBillingCycle()` | Calculates current cycle from statement close day |
| `getNextPaymentDueDate()` | Calculates next due date |
| `calculateDaysUntilDue()` | Days remaining until payment |

**File**: `lib/utils/interest-calculator.ts`

| Function | Purpose |
|----------|---------|
| `calculatePayoffProjection()` | Full payoff projection with interest |
| `calculateInterestSavings()` | Savings from extra payments |
| `calculateAvalanchePayments()` | Optimal payments (highest APR first) |
| `calculateSnowballPayments()` | Optimal payments (smallest balance first) |
| `comparePayoffStrategies()` | Compare avalanche vs snowball |

**File**: `lib/utils/card-identifier-extractor.ts`

| Function | Purpose |
|----------|---------|
| `extractCardIdentifier()` | Extract last 4 digits + network from transaction |
| `parseCardIdentifierString()` | Parse "VISA-1234" format |
| `getNetworkColor()` | Get brand color for network |

### Onboarding Integration

**Location**: After Bank Accounts step, before Income step

**Flow**:
```
Bank Accounts → Credit Card Fork Step → Income
              ↓
    ┌─────────────────────────────────┐
    │ For each credit card account:   │
    │ 1. Select usage type (A/B/C)    │
    │ 2. Enter billing cycle dates    │
    │ 3. Configure based on type:     │
    │    A: Current outstanding       │
    │    B/C: APR, minimum payment    │
    │ 4. Preview envelopes created    │
    └─────────────────────────────────┘
```

**Components**:

| Component | File | Purpose |
|-----------|------|---------|
| `CreditCardForkStep` | `components/onboarding/credit-card/credit-card-fork-step.tsx` | Main orchestrator |
| `UsageTypeSelector` | `components/onboarding/credit-card/usage-type-selector.tsx` | A/B/C path selection |
| `BillingCycleInputs` | `components/onboarding/credit-card/billing-cycle-inputs.tsx` | Day pickers |
| `PayInFullConfig` | `components/onboarding/credit-card/pay-in-full-config.tsx` | Option A config |
| `PayingDownConfig` | `components/onboarding/credit-card/paying-down-config.tsx` | Option B/C config |
| `APRInput` | `components/onboarding/credit-card/apr-input.tsx` | APR with presets |
| `StillUsingToggle` | `components/onboarding/credit-card/still-using-toggle.tsx` | Hybrid mode |
| `EnvelopePreview` | `components/onboarding/credit-card/envelope-preview.tsx` | Shows what's created |
| `PayoffPreview` | `components/onboarding/credit-card/payoff-preview.tsx` | Interactive projection |

### Dashboard Components

| Component | File | Purpose |
|-----------|------|---------|
| `CardIdentifierBadge` | `components/credit-cards/card-identifier-badge.tsx` | Visa/MC/Amex badge |
| `InterestTrackerCard` | `components/credit-cards/interest-tracker-card.tsx` | Monthly interest |
| `MultiCardOptimizer` | `components/credit-cards/multi-card-optimizer.tsx` | Strategy comparison |
| `ReconciliationWidget` | `components/credit-cards/reconciliation-widget.tsx` | Balance verification |

### Reconciliation Formula Update

**Critical Change**: CC Holding affects available cash calculation.

**Old Formula**:
```
Available Cash = Bank Balance
Reconciled = Bank Balance == Envelope Total
```

**New Formula**:
```
Available Cash = Bank Balance - CC Holding Balance
Reconciled = Available Cash == (Envelope Total - CC Holding)
```

**Why**: CC Holding represents money that's already "spent" via credit card but not yet paid. It's in the bank but not truly available.

**File**: `lib/utils/reconciliation-calculator.ts`

```typescript
export function calculateAvailableCash(
  bankBalance: number,
  ccHoldingBalance: number
): number {
  return bankBalance - ccHoldingBalance;
}

export function validateReconciliation(
  bankBalance: number,
  envelopeTotal: number,
  ccHoldingBalance: number,
  tolerance: number = 0.01
): ReconciliationResult {
  const adjustedEnvelopeTotal = envelopeTotal - ccHoldingBalance;
  const availableCash = calculateAvailableCash(bankBalance, ccHoldingBalance);
  const discrepancy = availableCash - adjustedEnvelopeTotal;
  const isBalanced = Math.abs(discrepancy) <= tolerance;
  // ...
}
```

### Multi-Card Optimization

**Debt Payoff Strategies**:

1. **Avalanche** (Mathematically Optimal)
   - Pay minimums on all cards
   - Put extra toward highest APR card
   - Saves most money in interest

2. **Snowball** (Psychologically Motivating)
   - Pay minimums on all cards
   - Put extra toward smallest balance
   - Quick wins build momentum

**Comparison Display**:
```
Strategy    | Months | Total Interest | Total Paid
------------|--------|----------------|------------
Avalanche   | 24     | $1,234         | $8,234
Snowball    | 26     | $1,456         | $8,456
Difference  | 2 mo   | $222 saved     |
```

### File Structure

```
app/api/
├── credit-card-configs/
│   └── route.ts                  # CRUD for CC configs
├── credit-card-cycle-holdings/
│   └── route.ts                  # Billing cycle tracking
├── payment-reconciliations/
│   └── route.ts                  # Record payment splits
└── payoff-projections/
    └── route.ts                  # Calculate/store projections

components/
├── onboarding/credit-card/
│   ├── credit-card-fork-step.tsx     # Main step
│   ├── usage-type-selector.tsx       # A/B/C picker
│   ├── billing-cycle-inputs.tsx      # Day selectors
│   ├── pay-in-full-config.tsx        # Option A
│   ├── paying-down-config.tsx        # Option B/C
│   ├── apr-input.tsx                 # APR with presets
│   ├── still-using-toggle.tsx        # Hybrid mode
│   ├── envelope-preview.tsx          # What gets created
│   └── payoff-preview.tsx            # Interactive projection
├── credit-cards/
│   ├── card-identifier-badge.tsx     # Network badge
│   ├── interest-tracker-card.tsx     # Interest tracking
│   ├── multi-card-optimizer.tsx      # Strategy comparison
│   └── reconciliation-widget.tsx     # Balance check

lib/
├── types/
│   └── credit-card-onboarding.ts     # All CC types
└── utils/
    ├── credit-card-onboarding-utils.ts  # Config helpers
    ├── interest-calculator.ts            # Payoff math
    ├── card-identifier-extractor.ts      # Network detection
    └── reconciliation-calculator.ts      # Balance formulas

supabase/migrations/
└── 0029_credit_card_onboarding.sql   # Database schema
```

### Testing Checklist - Credit Cards

- [ ] **Onboarding**: Add credit card with pay_in_full type
- [ ] **Onboarding**: Add credit card with paying_down type
- [ ] **Onboarding**: Add credit card with minimum_only type
- [ ] **Billing Cycle**: Verify statement/due dates calculate correctly
- [ ] **Envelope Creation**: Verify correct envelopes created per type
- [ ] **Hybrid Mode**: Test still_using toggle creates CC Holding
- [ ] **Payoff Preview**: Verify projection calculates correctly
- [ ] **APR Input**: Verify common APR presets work
- [ ] **Reconciliation**: Verify CC Holding affects available cash
- [ ] **Multi-Card**: Test avalanche vs snowball comparison
- [ ] **Card Badge**: Test network detection from transaction
- [ ] **Interest Tracker**: Verify monthly interest displays

---

## Remy - The Mascot & Guide System

**Status**: ✅ **COMPLETE** (100% - All onboarding steps implemented)
**Implementation Date**: December 2025

### Overview

Remy is the friendly Kiwi mascot who guides users through the app with warm, encouraging messages. He appears throughout onboarding and provides contextual guidance in a distinctly New Zealand voice.

### Personality Guidelines

**Voice Characteristics:**
- Warm & Encouraging - Never judgmental
- Kiwi English - Uses "sorted", "no worries", "stoked", "cuppa", "mate"
- Direct & Practical - Gets to the point
- Calm & Reassuring - Reduces financial anxiety

**Banned Phrases:**
- "Every dollar has a job" (YNAB trademark)
- "Baby steps" (Dave Ramsey trademark)
- "Zero-based budgeting" (too technical)
- Generic corporate speak

### Component Architecture

#### RemyTip Component

**File**: `components/onboarding/remy-tip.tsx`

```tsx
interface RemyTipProps {
  children: React.ReactNode;
  pose?: "welcome" | "encouraging" | "thinking" | "celebrating" | "small";
  className?: string;
}

export function RemyTip({ children, pose = "encouraging", className = "" }: RemyTipProps)
```

**Usage:**
```tsx
<RemyTip pose="encouraging">
  Grab a cuppa and get comfy. We're going to set up your budget properly.
</RemyTip>
```

**Styling:**
- Background: `bg-sage-very-light` (#E2EEEC)
- Border: `border-sage-light` (#B8D4D0)
- Text: `text-sage-dark` (#5A7E7A)
- Signature: `text-sage` (#7A9E9A)

#### RemyAvatar Component

**File**: `components/onboarding/remy-tip.tsx`

```tsx
interface RemyAvatarProps {
  pose?: "welcome" | "encouraging" | "thinking" | "celebrating" | "small";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function RemyAvatar({ pose = "welcome", size = "md", className = "" }: RemyAvatarProps)
```

**Size Classes:**
- `sm`: 40x40px
- `md`: 64x64px
- `lg`: 96x96px
- `xl`: 112x112px

### Image Assets

**Location**: `/public/Images/` (capital I)

| File | Pose | Usage Context |
|------|------|---------------|
| `remy-welcome.png` | Greeting | Welcome step, introductions |
| `remy-encouraging.png` | Supportive | Tips, guidance, motivation |
| `remy-thinking.png` | Contemplative | Explanations, education content |
| `remy-celebrating.png` | Excited | Completion, achievements |
| `remy-small.png` | Compact | Headers, inline references |

### Onboarding Integration

All 11 onboarding steps feature Remy:

| Step | Component | Remy Implementation |
|------|-----------|---------------------|
| 1. Welcome | `welcome-step.tsx` | Large avatar with speech bubble |
| 2. Profile | `profile-step.tsx` | RemyTip guidance |
| 3. Income | `income-step.tsx` | RemyTip explaining setup |
| 4. Bank Accounts | `bank-accounts-step.tsx` | RemyTip about Akahu |
| 5. Budgeting Approach | `budgeting-approach-step.tsx` | RemyTip on templates |
| 6. Envelope Education | `envelope-education-step.tsx` | Header avatar + 2 RemyTips |
| 7. Envelope Creation | `envelope-creation-step.tsx` | RemyTip encouragement |
| 8. Envelope Allocation | `envelope-allocation-step.tsx` | Context-aware tips |
| 9. Opening Balance | `opening-balance-step.tsx` | RemyTip on balances |
| 10. Budget Review | `budget-review-step.tsx` | RemyTip review guidance |
| 11. Completion | `completion-step.tsx` | Celebrating avatar + confetti |

### Completion Step Special Features

**File**: `components/onboarding/steps/completion-step.tsx`

Special elements:
- Celebrating Remy avatar with gold border
- Confetti animation (`canvas-confetti` library)
- "You legend!" celebration headline
- First goal hint (Emergency Fund achievement)
- Deferred features checklist
- Motivational closing message

**Confetti Implementation:**
```tsx
useEffect(() => {
  const duration = 3000;
  const end = Date.now() + duration;
  const frame = () => {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.7 },
      colors: ["#7A9E9A", "#D4A853", "#6B9ECE"],
    });
    // ... mirror effect from right side
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
}, []);
```

### Style Guide Compliance

All Remy messages follow the calm color palette:

| Element | Color | Hex |
|---------|-------|-----|
| Background | Sage Very Light | `#E2EEEC` |
| Border | Sage Light | `#B8D4D0` |
| Text | Sage Dark | `#5A7E7A` |
| Signature | Sage | `#7A9E9A` |
| Avatar Border | White/Sage | `#FFFFFF` / `#E2EEEC` |

### Testing Checklist - Remy

- [ ] **Welcome Step**: Remy avatar displays with speech bubble
- [ ] **All Steps**: RemyTip components display correctly
- [ ] **Image Loading**: All 5 Remy poses load from /Images/
- [ ] **Responsive**: Remy components work on mobile
- [ ] **Completion**: Confetti animation fires on mount
- [ ] **Voice**: All messages use Kiwi English tone
- [ ] **No Banned Phrases**: Content audit passes

---

## Achievement System

**Status**: ✅ **COMPLETE** (Database + API + UI)
**Implementation Date**: December 2025

### Overview

The Achievement System gamifies financial progress with badges and milestones, encouraging users to reach financial goals.

### Database Schema

**Migration**: `supabase/migrations/0027_achievements.sql`

```sql
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_key TEXT NOT NULL,
  achieved_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  UNIQUE(user_id, achievement_key)
);

CREATE INDEX idx_achievements_user_id ON achievements(user_id);
CREATE INDEX idx_achievements_key ON achievements(achievement_key);
```

### Achievement Definitions

**File**: `lib/achievements/definitions.ts`

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

export const ACHIEVEMENTS: Record<AchievementKey, AchievementDefinition> = {
  first_envelope: {
    key: 'first_envelope',
    name: 'First Envelope',
    description: 'Created your first budget envelope',
    icon: '📁',
    category: 'onboarding'
  },
  emergency_fund_started: {
    key: 'emergency_fund_started',
    name: 'Rainy Day Starter',
    description: 'Started building your emergency fund',
    icon: '🌧️',
    category: 'savings'
  },
  emergency_fund_1000: {
    key: 'emergency_fund_1000',
    name: 'Starter Emergency Fund',
    description: 'Saved $1,000 in your emergency fund',
    icon: '🛡️',
    category: 'savings'
  },
  // ... more achievements
};
```

### API Endpoints

**File**: `app/api/achievements/route.ts`

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/achievements` | Fetch user's achievements |
| POST | `/api/achievements` | Unlock new achievement |

**POST Body:**
```typescript
{
  achievement_key: AchievementKey;
  metadata?: Record<string, unknown>;
}
```

### React Hook

**File**: `lib/hooks/use-achievements.ts`

```typescript
export function useAchievements() {
  const queryClient = useQueryClient();

  const { data: achievements = [], isLoading } = useQuery({
    queryKey: ['achievements'],
    queryFn: async () => {
      const res = await fetch('/api/achievements');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      return data.achievements;
    }
  });

  const unlockAchievement = async (key: AchievementKey, metadata?: object) => {
    const res = await fetch('/api/achievements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ achievement_key: key, metadata })
    });
    if (res.ok) {
      queryClient.invalidateQueries({ queryKey: ['achievements'] });
    }
    return res.ok;
  };

  const hasAchievement = (key: AchievementKey) =>
    achievements.some(a => a.achievement_key === key);

  return { achievements, isLoading, unlockAchievement, hasAchievement };
}
```

### UI Components

**File**: `components/achievements/achievement-badge.tsx`

Displays an achievement badge with icon, name, and date achieved.

**File**: `components/achievements/achievement-toast.tsx`

Celebratory toast notification when achievement unlocked.

### Trigger Points

| Achievement | Trigger Location |
|-------------|------------------|
| `first_envelope` | Envelope creation API |
| `emergency_fund_started` | Emergency fund envelope gets first allocation |
| `emergency_fund_1000` | Emergency fund balance reaches $1,000 |
| `onboarding_complete` | Onboarding completion step |
| `first_budget_month` | First month with zero-based budget achieved |
| `debt_free` | All debt envelopes reach $0 |

### Testing Checklist - Achievements

- [ ] **Fetch**: GET /api/achievements returns user's achievements
- [ ] **Unlock**: POST /api/achievements creates new record
- [ ] **Duplicate Prevention**: Cannot unlock same achievement twice
- [ ] **Hook**: useAchievements hook works correctly
- [ ] **Badge**: Achievement badges display properly
- [ ] **Toast**: Unlock celebration shows
- [ ] **Metadata**: Custom metadata stores correctly

---

## Style Guide - Color System

**Status**: ✅ **IMPLEMENTED** (Updated Dec 2025)

### Primary Palette (Calm & Trustworthy)

| Name | Hex | Tailwind | Usage |
|------|-----|----------|-------|
| Sage | `#7A9E9A` | `bg-sage` | Primary buttons, success |
| Sage Dark | `#5A7E7A` | `bg-sage-dark` | Hover states |
| Sage Light | `#B8D4D0` | `border-sage-light` | Borders |
| Sage Very Light | `#E2EEEC` | `bg-sage-very-light` | Backgrounds |

### Accent Colors

| Name | Hex | Tailwind | Usage |
|------|-----|----------|-------|
| Blue | `#6B9ECE` | `text-blue` | Links, info |
| Blue Light | `#DDEAF5` | `bg-blue-light` | Info cards |
| Gold | `#D4A853` | `text-gold` | Warnings, achievements |
| Gold Light | `#F5E6C4` | `bg-gold-light` | Warning cards |

### Text Colors

| Name | Hex | Tailwind | Usage |
|------|-----|----------|-------|
| Text Dark | `#1A2E2A` | `text-text-dark` | Headings |
| Text Medium | `#4A5E5A` | `text-text-medium` | Body |
| Muted | `#6B7B7A` | `text-muted-foreground` | Secondary |

---

## Add Envelope Dialog System

**Status**: ✅ **COMPLETE** (Updated Dec 2025)

### Overview

The Add Envelope Dialog is a shared component used across multiple pages (Allocation, Envelope Summary, Dashboard) with income-aware features that help users understand the budget impact of new envelopes before creating them.

### Key Features

| Feature | Description |
|---------|-------------|
| Income Reality Banner | Shows surplus/shortfall per income source |
| Per-Income Impact | Calculates how new envelope affects each income |
| Income Source Selection | Choose which income(s) fund the envelope |
| Split Mode | Evenly divide amount across all incomes |
| Post-Creation Prompt | Navigate options after creation |
| Highlight Handling | Scrolls to and highlights newly created envelope |

### Core Files

| File | Purpose |
|------|---------|
| `components/layout/envelopes/envelope-create-dialog.tsx` | Main dialog component |
| `app/api/budget/income-reality/route.ts` | Income surplus API |
| `app/(app)/allocation/allocation-client.tsx` | Highlight handling integration |

### Form Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Name | Text | ✅ | Envelope name |
| Type | Select | ✅ | bill, spending, savings, goal, tracking |
| Priority | Select | ✅ (bills only) | essential, important, discretionary |
| Target Amount | Number | ✅ (bills/savings) | Total target |
| Frequency | Select | ✅ (bills only) | weekly, fortnightly, monthly, etc. |
| Due Date | Date | Optional | Next payment due |
| Category | Select | ✅ | Expense category |
| Income Source | Select | ✅ (multi-income) | Which income funds it |
| Description | Textarea | Optional | Notes |
| Initial Balance | Number | Optional | Starting amount |

### Pay Cycle Amount Formula

The dialog calculates the per-pay amount using this formula:

```typescript
const payCycleAmount = (targetAmount * billCyclesPerYear) / userPayCyclesPerYear;
```

**Example**: $2,400 annual bill for fortnightly payer:
```
payCycleAmount = ($2,400 × 1) ÷ 26 = $92.31 per fortnight
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

### Income Impact Calculation

For each income source, the dialog calculates:

```typescript
interface PerIncomeImpact {
  incomeId: string;
  incomeName: string;
  incomeAmount: number;
  surplusAmount: number;
  amountPerPay: number;      // Amount needed from this income
  shortfall: number;          // Amount over surplus
  coversIt: boolean;          // Can surplus cover it?
}
```

### Split Income Mode

When user selects "Split evenly across incomes":

```typescript
const displayImpacts = useMemo((): PerIncomeImpact[] => {
  if (selectedIncomeId === "split") {
    const numIncomes = incomeImpacts.length;
    return incomeImpacts.map((impact) => {
      const splitAmount = Math.round((impact.amountPerPay / numIncomes) * 100) / 100;
      const shortfall = Math.max(0, splitAmount - impact.surplusAmount);
      return {
        ...impact,
        amountPerPay: splitAmount,
        shortfall: Math.round(shortfall * 100) / 100,
        coversIt: impact.surplusAmount >= splitAmount,
      };
    });
  }
  return incomeImpacts.filter((impact) => impact.incomeId === selectedIncomeId);
}, [incomeImpacts, selectedIncomeId]);
```

### Post-Creation Flow

After envelope creation:
1. Dialog shows success message with envelope name
2. Displays budget impact summary per income
3. Shows warning if any income has shortfall
4. Offers navigation options:
   - "Go to Envelope" → Navigates with `?highlight=<id>`
   - "Add Another" → Resets form
   - "Close" → Closes dialog

### Highlight Handling

When navigating to Allocation page with `?highlight=<id>`:

```typescript
// In allocation-client.tsx
useEffect(() => {
  const highlightId = searchParams.get("highlight");
  if (highlightId && highlightId !== "new") {
    setHighlightedEnvelopeId(highlightId);
    router.replace("/allocation", { scroll: false });

    // Remove highlight after 3 seconds
    const timer = setTimeout(() => {
      setHighlightedEnvelopeId(null);
    }, 3000);

    return () => clearTimeout(timer);
  }
}, [searchParams, router]);
```

The highlighted row receives:
- `ring-2 ring-sage ring-offset-1` - Sage ring border
- `bg-sage-very-light` - Light sage background
- `animate-pulse` - Pulsing animation
- Auto-scroll into view with `scrollIntoView({ behavior: "smooth", block: "center" })`

### Shared Component Pattern

The dialog is opened via URL query params for cross-page consistency:

```typescript
// Open dialog from any page
router.push("/allocation?action=create-envelope");

// In Allocation page layout
const showCreateDialog = searchParams.get("action") === "create-envelope";
```

### Integration Points

**Pages using the dialog:**
- `/allocation` - Primary budget management
- `/envelope-summary` - Quick envelope creation
- Dashboard quick actions (if implemented)

**API endpoints called:**
- `GET /api/budget/income-reality` - Fetch income surplus data
- `POST /api/envelopes` - Create the envelope
- `GET /api/categories` - Fetch category options

---

### Key Principle: No Red/Amber for Warnings

To reduce financial anxiety, the app uses **blue** for urgency indicators instead of traditional red/amber:

```tsx
// Good - uses blue for urgency
<Badge className="bg-blue-light text-blue">Due Soon</Badge>

// Bad - creates anxiety
<Badge className="bg-red-100 text-red-600">Due Soon</Badge>
```

### Tailwind Configuration

**File**: `tailwind.config.ts`

```typescript
colors: {
  sage: {
    DEFAULT: '#7A9E9A',
    dark: '#5A7E7A',
    light: '#B8D4D0',
    'very-light': '#E2EEEC',
  },
  blue: {
    DEFAULT: '#6B9ECE',
    light: '#DDEAF5',
  },
  gold: {
    DEFAULT: '#D4A853',
    light: '#F5E6C4',
    dark: '#8B7035',
  },
  text: {
    dark: '#1A2E2A',
    medium: '#4A5E5A',
  }
}

---

## My Budget Mate Life

My Budget Mate Life is a collection of household management features that extend beyond budgeting. These features help families organize their daily life activities.

### Life Module Overview

| Feature | Route | Description |
|---------|-------|-------------|
| Shopping Lists | `/life/shopping` | Smart shopping lists with category organization |
| To-Do Lists | `/life/todos` | Task management for the household |
| Recipes | `/life/recipes` | Recipe collection and meal inspiration |
| Meal Planning | `/life/meal-plan` | Weekly meal planning calendar |

### Shopping Lists Architecture

#### Database Schema

**`shopping_lists`**
```sql
CREATE TABLE shopping_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '🛒',
  supermarket_id UUID REFERENCES supermarkets(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**`shopping_items`**
```sql
CREATE TABLE shopping_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shopping_list_id UUID NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  quantity TEXT,
  aisle_name TEXT,
  category_id UUID REFERENCES shopping_categories(id),
  estimated_price DECIMAL(10, 2),
  notes TEXT,
  photo_url TEXT,
  is_checked BOOLEAN DEFAULT false,
  checked_at TIMESTAMPTZ,
  sort_order INTEGER,
  added_by_id UUID REFERENCES auth.users(id),
  added_by_type TEXT DEFAULT 'parent',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**`shopping_categories`**
```sql
CREATE TABLE shopping_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT,
  default_sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(parent_user_id, name)
);
```

**`supermarkets`**
```sql
CREATE TABLE supermarkets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  aisle_structure JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**`supermarket_category_orders`**
```sql
CREATE TABLE supermarket_category_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supermarket_id UUID NOT NULL REFERENCES supermarkets(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES shopping_categories(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL,
  UNIQUE(supermarket_id, category_id)
);
```

**`saved_products`**
```sql
CREATE TABLE saved_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category_id UUID REFERENCES shopping_categories(id),
  default_quantity TEXT,
  typical_price DECIMAL(10, 2),
  price_unit TEXT,
  photo_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(parent_user_id, name)
);
```

#### Key Features

**Category-Based Organization**
- Items are grouped by shopping category (Produce, Dairy, Meat, etc.)
- Categories can be user-defined or use default set
- Supermarket filter changes category order based on store layout

**Supermarket Category Ordering**
- Each supermarket can have custom category order
- Example: Countdown may have Produce first, PAK'nSAVE may have Frozen first
- Selecting a supermarket reorders the shopping list accordingly

**Auto-Categorization**
- New items are automatically categorized based on product name
- Uses keyword matching (e.g., "milk" → Dairy, "apple" → Produce)
- Defined in `/app/api/shopping/items/route.ts`

**Saved Products**
- Users can save frequently purchased items
- Includes optional typical price and default quantity
- Supports photo attachments

#### Key Files

| File | Purpose |
|------|---------|
| `app/(app)/life/shopping/page.tsx` | Server component - fetches lists/categories |
| `app/(app)/life/shopping/shopping-client.tsx` | Client component - manages state and UI |
| `components/shopping/shopping-list-view.tsx` | Individual list view with items |
| `components/shopping/create-shopping-list-dialog.tsx` | Create new list dialog |
| `app/api/shopping/lists/route.ts` | CRUD for shopping lists |
| `app/api/shopping/items/route.ts` | CRUD for shopping items |
| `app/api/shopping/categories/route.ts` | CRUD for categories |
| `app/api/shopping/supermarkets/route.ts` | CRUD for supermarkets |

#### Column Name Mapping

The database uses different column names than the client expects:

| Database Column | Client Property |
|-----------------|-----------------|
| `text` | `name` |
| `shopping_list_id` | `list_id` |
| `is_checked` | `checked` |
| `aisle_name` | `aisle` |
| `category_id` | `category_id` |
| `parent_user_id` | (used for RLS) |

### To-Do Lists Architecture

#### Database Schema

**`todo_lists`**
```sql
CREATE TABLE todo_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '📝',
  color TEXT DEFAULT 'sage',
  shared_with_children UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**`todo_items`**
```sql
CREATE TABLE todo_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  todo_list_id UUID NOT NULL REFERENCES todo_lists(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  assigned_to_id UUID,
  assigned_to_type TEXT DEFAULT 'parent',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Column Name Mapping

| Database Column | Client Property |
|-----------------|-----------------|
| `todo_list_id` | `list_id` |
| `is_completed` | `completed` |
| `assigned_to_id` | `assigned_to` |
| `parent_user_id` | (used for RLS) |

#### Key Files

| File | Purpose |
|------|---------|
| `app/(app)/life/todos/page.tsx` | Server component - fetches lists |
| `app/(app)/life/todos/todos-client.tsx` | Client component - manages state |
| `app/api/todos/lists/route.ts` | CRUD for todo lists |
| `app/api/todos/items/route.ts` | CRUD for todo items |
| `app/api/todos/items/[id]/route.ts` | Individual item operations |

#### Ownership Verification

Todo items don't have a direct `user_id` column. Ownership is verified via join:

```typescript
// Verify ownership via list relationship
const { data: item } = await supabase
  .from("todo_items")
  .select(`
    *,
    todo_lists!inner(parent_user_id)
  `)
  .eq("id", itemId)
  .eq("todo_lists.parent_user_id", user.id)
  .single();
```

---

## My Budget Mate Kids (Updated Jan 2026)

My Budget Mate Kids teaches teens with bank accounts real money management, preparing them to become full My Budget Mate users when they get a job.

**Core Philosophy**: Kids = My Budget Way (lite version) + Household Hub access + Invoice-based earning system

### Kids Module Overview

| Feature | Route | Description |
|---------|-------|-------------|
| Parent Dashboard | `/kids` | Parent view of all children |
| Child Dashboard | `/kids/[childId]/dashboard` | Individual child's main view |
| Child Chores | `/kids/[childId]/chores` | Child's assigned chores |
| Avatar Shop | `/kids/[childId]/shop` | Star-based rewards shop |
| Chores Manager | `/kids/chores` | Parent's chore management |
| Invoices | `/kids/invoices` | Parent's invoice tracking |
| Kids Setup | `/kids/setup` | New child profile creation |

### Two Chore Types (Critical Concept)

| Type | Description | Creates Invoice? | Tracking |
|------|-------------|------------------|----------|
| **Expected Chores** | Part of pocket money (clean room, dishes) | No | Streak tracking, badges only |
| **Extra Chores** | One-off earning opportunities (wash car, mow lawn) | Yes | Adds to draft invoice |

**Key Field**: `chore_templates.is_expected` (boolean) - Determines which type

**Philosophy**: Being part of a family means pitching in. Expected chores teach responsibility - pocket money covers these. Extra chores teach the direct link between hard work and being paid.

### Database Schema

#### Core Tables

**`child_profiles`**
```sql
CREATE TABLE child_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  date_of_birth DATE,
  star_balance INTEGER DEFAULT 0,
  screen_time_balance INTEGER DEFAULT 0,
  distribution_spend_pct INTEGER DEFAULT 50,
  distribution_save_pct INTEGER DEFAULT 30,
  distribution_invest_pct INTEGER DEFAULT 10,
  distribution_give_pct INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**`child_bank_accounts`**
```sql
CREATE TABLE child_bank_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_profile_id UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  akahu_account_id TEXT,
  account_name TEXT NOT NULL,
  envelope_type TEXT CHECK (envelope_type IN ('spend', 'save', 'invest', 'give')),
  current_balance DECIMAL(10, 2) DEFAULT 0,
  show_in_parent_budget BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Chores System

**`chore_templates`**
```sql
CREATE TABLE chore_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  category TEXT,
  is_expected BOOLEAN DEFAULT false,  -- CRITICAL: Determines chore type
  currency_type TEXT CHECK (currency_type IN ('money', 'stars', 'screen_time')),
  currency_amount DECIMAL(10, 2),
  estimated_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**`chore_assignments`**
```sql
CREATE TABLE chore_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_profile_id UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  chore_template_id UUID REFERENCES chore_templates(id),
  week_starting DATE NOT NULL,
  day_of_week INTEGER,
  currency_type TEXT,
  currency_amount DECIMAL(10, 2),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'approved', 'rejected')),
  marked_done_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  proof_photo_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Invoice System

**`kid_invoices`**
```sql
CREATE TABLE kid_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_profile_id UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  invoice_number TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'paid', 'cancelled')),
  total_amount DECIMAL(10, 2) DEFAULT 0,
  paid_at TIMESTAMPTZ,
  paid_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**`kid_invoice_items`**
```sql
CREATE TABLE kid_invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES kid_invoices(id) ON DELETE CASCADE,
  chore_assignment_id UUID REFERENCES chore_assignments(id),
  chore_name TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  completed_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Streaks & Achievements

**`expected_chore_streaks`**
```sql
CREATE TABLE expected_chore_streaks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_profile_id UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  chore_template_id UUID NOT NULL REFERENCES chore_templates(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_completed_at TIMESTAMPTZ,
  UNIQUE(child_profile_id, chore_template_id)
);
```

### Key API Routes

| Route | Purpose |
|-------|---------|
| `GET/POST /api/kids/profiles` | Manage child profiles |
| `GET /api/kids/[childId]/chores` | Child's chore assignments |
| `PATCH /api/chores/assignments/[id]/approve` | Parent approves chore → creates invoice item |
| `GET /api/kids/invoices` | Parent views all children's invoices |
| `GET/POST /api/chores/templates` | Chore template CRUD |

### Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `KidDashboardClient` | `app/(app)/kids/[childId]/dashboard/` | Child's main dashboard |
| `KidChoresClient` | `app/(app)/kids/[childId]/chores/` | Child's chore view |
| `ChoresClient` | `app/(app)/kids/chores/` | Parent's chores manager |
| `InvoicesClient` | `app/(app)/kids/invoices/` | Parent's invoice view |
| `ParentOnboardingTutorial` | `components/kids/` | New parent onboarding |

### Chore Approval Flow (Critical)

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Parent creates chore template                                │
│    → Sets is_expected=true (Expected) or false (Extra)          │
│    → Sets currency_type: 'money', 'stars', or 'screen_time'     │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Chore assigned to child                                      │
│    → Creates chore_assignment record                            │
│    → Status: 'pending'                                          │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Child marks chore as done                                    │
│    → Status: 'done'                                             │
│    → marked_done_at set                                         │
│    → Optional: proof_photo_url uploaded                         │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Parent approves via /api/chores/assignments/[id]/approve     │
│    → Status: 'approved'                                         │
│    → approved_at and approved_by set                            │
│    → CRITICAL: Check template.is_expected                       │
│                                                                 │
│    IF currency_type === 'money' AND is_expected === false:      │
│      → Get or create draft invoice for child                    │
│      → Add item to kid_invoice_items table                      │
│      → rewardMessage: "+$X.XX (added to invoice)"               │
│                                                                 │
│    IF currency_type === 'stars':                                │
│      → Directly credit child_profiles.star_balance              │
│                                                                 │
│    IF currency_type === 'screen_time':                          │
│      → Directly credit child_profiles.screen_time_balance       │
└─────────────────────────────────────────────────────────────────┘
```

### Four Envelope Types (Kids)

| Envelope | Purpose | Bank Account Type |
|----------|---------|-------------------|
| **Spend** | Daily spending | Transaction/Debit |
| **Save** | Short-term savings goals | Savings (earns interest) |
| **Invest** | Long-term wealth building | Savings (earns interest) |
| **Give** | Charitable giving | Savings (earns interest) |

### Beta Access

Kids Module is currently behind beta access:

```typescript
// In page.tsx
const betaAccess = await checkBetaAccess();
if (!betaAccess.hasAccess) {
  redirect("/dashboard");
}
```

**Beta access utility**: `lib/utils/beta-access.ts`

---

## Common Patterns Across Life & Kids

### Parent User ID Pattern

All Life and Kids tables use `parent_user_id` instead of `user_id`:
- Ensures RLS policies work correctly
- Distinguishes parent ownership from child access
- Consistent naming across the module

### Column Name Mapping

APIs consistently map database columns to client-friendly names:

```typescript
// Database → Client mapping example
const mappedItem = {
  id: dbItem.id,
  name: dbItem.text,           // text → name
  completed: dbItem.is_completed,  // is_completed → completed
  list_id: dbItem.todo_list_id,    // todo_list_id → list_id
};
```

### Ownership Verification via Joins

When items don't have direct `parent_user_id`, ownership is verified via relationship:

```typescript
// Pattern: Verify via parent table
const { data } = await supabase
  .from("child_table")
  .select(`
    *,
    parent_table!inner(parent_user_id)
  `)
  .eq("id", itemId)
  .eq("parent_table.parent_user_id", user.id)
  .single();
```

### Next.js 14 Async Params

All dynamic routes use the async params pattern:

```typescript
// Route: /api/items/[id]/route.ts
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // ... rest of handler
}
```
