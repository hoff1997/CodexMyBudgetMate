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
  ├─ Priority traffic light column (🔴🟡🟢)
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
| Essential | 🔴 Red | `bg-red-500` |
| Important | 🟡 Yellow | `bg-yellow-400` |
| Discretionary | 🟢 Green | `bg-green-500` |

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
