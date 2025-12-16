# Future Enhancements & Feature Ideas

**Last Updated:** 2025-11-05
**Status:** Planning document for post-MVP improvements

---

## 📋 Overview

This document tracks optional enhancements and feature ideas that can be implemented after the core migration is complete. These are nice-to-have features that will improve user experience but are not critical for initial launch.

---

## 🎯 Phase 1.4 Enhancements - Credit Card Holding System

### Automatic Credit Card Allocation
**Status:** 📅 Planned
**Priority:** Medium
**Estimated Effort:** 1-2 days

**Description:**
Currently, credit card allocations are manual. Enable automatic allocation when credit card transactions are created or approved.

**Implementation:**
1. Enable the database trigger already created in `0007_credit_card_holding_system.sql`
   ```sql
   CREATE TRIGGER allocate_cc_trigger
   AFTER INSERT ON transactions
   FOR EACH ROW
   EXECUTE FUNCTION allocate_credit_card_transaction();
   ```

2. Add toggle in settings to enable/disable automatic allocation
3. Update transaction approval workflow to trigger allocation
4. Add notification when allocation happens automatically

**Benefits:**
- Eliminates manual step for users
- Ensures all CC spending is immediately tracked
- Reduces risk of forgetting to allocate

**Risks:**
- May confuse users if they don't understand the automatic behavior
- Requires robust error handling for edge cases

---

### Credit Card Payment Workflow
**Status:** 📅 Planned
**Priority:** High
**Estimated Effort:** 2-3 days

**Description:**
Add a streamlined workflow for paying credit card bills from the holding account.

**Implementation:**
1. Create "Pay Credit Card" dialog component
2. Create API endpoint `/api/credit-card-holding/pay`
   - Deduct from holding account
   - Credit to credit card account (reduce debt)
   - Create transaction record
   - Update both account balances
3. Add "Pay Now" button to credit card holding widget
4. Show payment history in holding account view

**User Flow:**
1. User clicks "Pay Now" on widget or in accounts view
2. Dialog shows:
   - Credit card debt amount
   - Holding account balance
   - Recommended payment amount (min, statement balance, or full)
   - Optional: custom amount
3. User confirms payment
4. System creates offsetting transactions
5. Balances update automatically

**Benefits:**
- One-click credit card payments
- Clear visibility of available funds
- Automatic reconciliation

---

### Holding Account Transaction List
**Status:** 📅 Planned
**Priority:** Medium
**Estimated Effort:** 1 day

**Description:**
Create a dedicated view to see all transactions in/out of the holding account.

**Implementation:**
1. Create page `/holding-account-history` or add section to accounts page
2. Query `credit_card_allocations` table with joins
3. Display table with columns:
   - Date
   - Type (allocation / reversal / payment)
   - Transaction description
   - From envelope
   - Amount
   - Running balance
4. Add filters: date range, credit card, envelope
5. Add export to CSV

**Benefits:**
- Full audit trail for holding account
- Easy reconciliation
- Better understanding of spending patterns

---

### Visual Indicators for Credit Card Transactions
**Status:** 📅 Planned
**Priority:** Low
**Estimated Effort:** 0.5 days

**Description:**
Add visual badges/icons to transactions list to show when a transaction used a credit card and whether it's been allocated.

**Implementation:**
1. Add badge to transaction rows: "CC Transaction"
2. Add allocation status indicator:
   - Green checkmark: Allocated to holding
   - Orange warning: Not yet allocated
   - Grey: N/A (not a CC transaction)
3. Add tooltip on hover with details
4. Filter transactions by allocation status

**Benefits:**
- Quick visual scan of allocated vs unallocated
- Prompts user to allocate pending transactions
- Better awareness of credit card usage

---

### Holding Account Reconciliation Formula Update
**Status:** 📅 Planned
**Priority:** Medium
**Estimated Effort:** 1-2 days

**Description:**
Update reconciliation logic throughout the app to account for the holding account in the formula:
`Bank Balance = Envelope Amounts - Credit Card Holding`

**Areas to Update:**
1. Stats cards on dashboard
2. Reconciliation page calculations
3. Balance reports
4. Any "Available to Budget" calculations

**Implementation:**
1. Create utility function `calculateAvailableToBudget()`
2. Update all balance calculation logic to use it
3. Add tests for edge cases
4. Document the formula in user-facing help text

**Benefits:**
- Accurate reconciliation when using holding account
- Prevents over-budgeting
- Clearer understanding of true available balance

---

### Credit Card Insights & Analytics
**Status:** 📅 Planned
**Priority:** Low
**Estimated Effort:** 2-3 days

**Description:**
Add analytics and insights for credit card spending patterns.

**Features:**
1. **Spending by Category:** Pie chart showing which envelopes have the most CC spending
2. **Coverage Trends:** Line chart showing holding account coverage over time
3. **Payment Suggestions:** Recommended payment amounts based on due dates and balances
4. **Alerts:**
   - Warning when holding account falls below recommended level
   - Notification when CC payment is due soon
   - Alert if CC spending exceeds envelope budget

**Implementation:**
1. Create `/credit-card-insights` page
2. Query allocation history with aggregations
3. Build charts using recharts or similar library
4. Add alert system (email/push notifications)

**Benefits:**
- Better understanding of CC usage patterns
- Proactive alerts prevent missed payments
- Helps optimize holding account funding

---

## 🔧 Other System-Wide Enhancements

### Automatic Envelope Transfers
**Status:** 📅 Planned
**Priority:** Medium
**Estimated Effort:** 2-3 days

**Description:**
Allow users to set up automatic transfers between envelopes on a schedule.

**Use Cases:**
- Transfer savings to investment envelope monthly
- Move surplus from groceries to vacation fund
- Auto-fill recurring expense envelopes

**Implementation:**
1. Create `envelope_transfers` table with schedule config
2. Add cron job or scheduled function to process transfers
3. Create UI to manage transfer rules
4. Add audit log for all automatic transfers

---

### Receipt Upload & Attachment
**Status:** 📅 Planned
**Priority:** Low
**Estimated Effort:** 3-4 days

**Description:**
Allow users to attach receipts/photos to transactions.

**Implementation:**
1. Add `receipt_url` field to transactions table (may already exist)
2. Set up file storage (Supabase Storage)
3. Create upload component with drag-and-drop
4. Add image viewer/lightbox
5. Optional: OCR to extract amount/merchant

---

### Transaction Split Enhancement
**Status:** 📅 Planned
**Priority:** Medium
**Estimated Effort:** 2-3 days

**Description:**
Improve transaction splitting to handle complex scenarios.

**Features:**
- Split across multiple envelopes with percentages
- Split across different accounts
- Link split transactions together
- Bulk split similar transactions

---

### Budget Templates
**Status:** 📅 Planned
**Priority:** Low
**Estimated Effort:** 1-2 days

**Description:**
Pre-built budget templates for common scenarios.

**Templates:**
- Student budget
- Family budget
- Single income
- Dual income no kids
- Retirement
- NZ-specific templates (KiwiSaver, rates, etc.)

**Implementation:**
1. Create JSON template files
2. Add "Use Template" option in setup wizard
3. Allow customization after template applied

---

### Mobile App (React Native / PWA)
**Status:** 📅 Future consideration
**Priority:** Low
**Estimated Effort:** 8-12 weeks

**Description:**
Native mobile app or Progressive Web App for on-the-go access.

**Features:**
- Quick expense entry
- Receipt photo capture
- Push notifications
- Offline mode
- Biometric authentication

---

### Shared/Joint Budgets
**Status:** 📅 Future consideration
**Priority:** Low
**Estimated Effort:** 4-6 weeks

**Description:**
Allow multiple users to collaborate on the same budget.

**Features:**
- Invite family members
- Role-based permissions (admin, editor, viewer)
- Activity log showing who made changes
- Separate user accounts with shared budget

---

### Goal Tracking & Savings Plans
**Status:** 📅 Planned
**Priority:** Medium
**Estimated Effort:** 2-3 days

**Description:**
Enhanced goal tracking with milestones and progress visualization.

**Features:**
- Set savings goals with target dates
- Automatic funding suggestions
- Progress bars and celebrations
- "What if" calculator for goal dates
- Link goals to specific envelopes

---

### Debt Payoff Calculator
**Status:** 📅 Planned
**Priority:** Medium
**Estimated Effort:** 2-3 days

**Description:**
Tools to plan and track debt payoff strategies.

**Features:**
- Snowball vs avalanche comparison
- Payoff timeline visualization
- Extra payment impact calculator
- Interest savings calculator
- Integration with debt accounts

---

### Bank Feed Enhancements
**Status:** 📅 Planned
**Priority:** Medium
**Estimated Effort:** Varies by feature

**Features:**
- Automatic categorization using ML
- Duplicate detection and merging
- Pending transaction handling
- Multiple bank account support
- Connection health monitoring
- Auto-sync schedule customization

---

### Advanced Reporting
**Status:** 📅 Planned
**Priority:** Low
**Estimated Effort:** 3-4 days

**Features:**
- Custom date range reports
- Year-over-year comparisons
- Spending trends by category
- Income vs expense charts
- Net worth tracking over time
- Export to PDF with charts

---

### API & Webhooks
**Status:** 📅 Future consideration
**Priority:** Low
**Estimated Effort:** 2-3 weeks

**Description:**
Public API for third-party integrations.

**Features:**
- RESTful API with authentication
- Webhooks for transaction events
- Rate limiting
- API documentation
- SDK for common languages

---

## 🎨 UI/UX Enhancements

### Dark Mode
**Status:** 📅 Planned
**Priority:** Low
**Estimated Effort:** 1-2 days

**Implementation:**
- Already using Tailwind with dark mode support
- Add theme toggle in settings
- Persist preference in local storage
- Ensure all components support dark mode

---

### Keyboard Shortcuts
**Status:** 📅 Planned
**Priority:** Low
**Estimated Effort:** 1 day

**Shortcuts:**
- `Ctrl+N`: New transaction
- `Ctrl+E`: New envelope
- `Ctrl+F`: Search transactions
- `Ctrl+K`: Command palette
- `G D`: Go to dashboard
- `G A`: Go to accounts

---

### Drag-and-Drop Budgeting
**Status:** 📅 Planned
**Priority:** Low
**Estimated Effort:** 2-3 days

**Description:**
Drag money amounts between envelopes visually.

**Implementation:**
- Use react-dnd or dnd-kit
- Visual money "chips" that can be dragged
- Animated transfers
- Undo/redo support

---

## 📊 Priority Matrix

### High Priority (Next Quarter)
1. Credit Card Payment Workflow
2. Holding Account Reconciliation Formula Update
3. Automatic Envelope Transfers

### Medium Priority (Next 6 Months)
1. Automatic Credit Card Allocation (with toggle)
2. Holding Account Transaction List
3. Goal Tracking & Savings Plans
4. Debt Payoff Calculator
5. Bank Feed Enhancements

### Low Priority (Future)
1. Visual Indicators for Credit Card Transactions
2. Credit Card Insights & Analytics
3. Receipt Upload & Attachment
4. Transaction Split Enhancement
5. Budget Templates
6. Dark Mode
7. Keyboard Shortcuts
8. Advanced Reporting

### Long-term Considerations
1. Mobile App
2. Shared/Joint Budgets
3. API & Webhooks
4. Drag-and-Drop Budgeting

---

## 💳 Stripe Subscription Activation

### Stripe Dashboard Configuration
**Status:** ⏳ Pending (Code Complete)
**Priority:** High
**Estimated Effort:** 1-2 hours

**Description:**
The Stripe subscription system code is fully implemented. This section tracks the manual Stripe Dashboard setup required to activate paid subscriptions.

**Steps to Complete:**

1. **Create Stripe Account**
   - Sign up at stripe.com
   - Complete business verification
   - Note: Use test mode during development

2. **Create Product & Prices**
   - Create product: "My Budget Mate Pro"
   - Monthly price: $9.99 NZD (recurring)
   - Yearly price: $99 NZD (recurring)
   - Copy the Price IDs (e.g., `price_xxx`)

3. **Update Database with Price IDs**
   ```sql
   UPDATE subscription_plans SET
     stripe_product_id = 'prod_xxx',
     stripe_price_id_monthly = 'price_xxx',
     stripe_price_id_yearly = 'price_xxx'
   WHERE slug = 'pro';
   ```

4. **Configure Webhook Endpoint**
   - URL: `https://your-domain.com/api/webhooks/stripe`
   - Events to listen for:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
   - Copy the webhook secret (`whsec_xxx`)

5. **Add Environment Variables**
   ```bash
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
   STRIPE_SECRET_KEY=sk_test_xxx
   STRIPE_WEBHOOK_SECRET=whsec_xxx
   ```

6. **Test with Stripe Test Cards**
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
   - Requires auth: `4000 0025 0000 3155`

7. **Local Testing (Optional)**
   ```bash
   # Install Stripe CLI
   stripe login
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

8. **Go Live**
   - Switch from test to live API keys
   - Set `BETA_MODE=false` in production
   - Monitor Stripe Dashboard for payments

**Code Location:**
- API Routes: `app/api/stripe/`, `app/api/webhooks/stripe/`
- Components: `components/subscription/`
- Hook: `hooks/useSubscription.ts`
- Types: `lib/types/subscription.ts`
- Migration: `supabase/migrations/0035_subscriptions.sql`

---

## 📝 Notes

### Adding New Enhancements
When proposing a new enhancement:
1. Add to relevant section above
2. Include: Status, Priority, Estimated Effort, Description
3. Note any dependencies or blockers
4. Consider impact on existing features

### Implementation Guidelines
- All enhancements should maintain backward compatibility
- Consider mobile responsiveness
- Add appropriate error handling
- Include tests for new features
- Update documentation

---

**This document will be updated as features are implemented and new ideas emerge.**
