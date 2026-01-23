# Claude Code Prompt: Set Up Stripe Subscriptions

## Overview

Set up Stripe for subscription billing in My Budget Mate. We need to support a freemium model with free and paid tiers. Follow all existing conventions in CLAUDE.md and ARCHITECTURE.md.

---

## Requirements

### 1. Install Dependencies

```bash
npm install stripe @stripe/stripe-js
```

### 2. Environment Variables

Add to `.env.local` (and document in README):

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_MONTHLY=price_...
STRIPE_PRICE_ID_YEARLY=price_...
```

### 3. Database Schema

Create migration `supabase/migrations/XXXX_subscriptions.sql`:

```sql
-- Subscription plans reference
CREATE TABLE subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10, 2),
  price_yearly DECIMAL(10, 2),
  features JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User subscriptions
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan_id TEXT REFERENCES subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'free' CHECK (status IN ('free', 'active', 'canceled', 'past_due', 'trialing')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage subscriptions"
  ON subscriptions FOR ALL
  USING (auth.role() = 'service_role');

-- Insert default plans
INSERT INTO subscription_plans (id, name, description, price_monthly, price_yearly, features) VALUES
  ('free', 'Free', 'Get started with budgeting basics', 0, 0, '["Up to 5 envelopes", "Manual transaction entry", "Basic reports"]'),
  ('pro', 'Pro', 'Full budgeting power for your household', 9.99, 99.99, '["Unlimited envelopes", "Bank sync via Akahu", "Kids Module", "Life Module", "Priority support"]');

-- Create subscription record for existing users
INSERT INTO subscriptions (user_id, status, plan_id)
SELECT id, 'free', 'free' FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- Trigger to create subscription for new users
CREATE OR REPLACE FUNCTION create_default_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO subscriptions (user_id, status, plan_id)
  VALUES (NEW.id, 'free', 'free');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_default_subscription();
```

### 4. Stripe Server Utilities

Create `lib/stripe/server.ts`:

```typescript
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  typescript: true,
});
```

Create `lib/stripe/client.ts`:

```typescript
import { loadStripe } from '@stripe/stripe-js';

let stripePromise: Promise<any> | null = null;

export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
  }
  return stripePromise;
};
```

### 5. API Routes

**Create checkout session** - `app/api/stripe/checkout/route.ts`:
- Accept plan_id and billing_interval (monthly/yearly)
- Create or retrieve Stripe customer
- Create checkout session with success/cancel URLs
- Return session URL

**Webhook handler** - `app/api/stripe/webhook/route.ts`:
- Verify webhook signature
- Handle events:
  - `checkout.session.completed` - Activate subscription
  - `customer.subscription.updated` - Update status
  - `customer.subscription.deleted` - Mark as canceled
  - `invoice.payment_failed` - Mark as past_due
- Update subscriptions table accordingly

**Customer portal** - `app/api/stripe/portal/route.ts`:
- Create billing portal session
- Return portal URL for managing subscription

**Get subscription** - `app/api/subscription/route.ts`:
- Return current user's subscription status and plan details

### 6. React Hook

Create `lib/hooks/use-subscription.ts`:

```typescript
// Fetch and cache subscription status
// Provide helper functions: isPro, canAccessFeature, etc.
// Use React Query for caching
```

### 7. UI Components

**Pricing Page** - `app/(marketing)/pricing/page.tsx`:
- Display free vs pro plans
- Monthly/yearly toggle (show yearly savings)
- Feature comparison table
- CTA buttons to start checkout
- Use sage colors for Pro plan highlight

**Upgrade Banner** - `components/subscription/upgrade-banner.tsx`:
- Show when user hits free tier limits
- Friendly message from Remy encouraging upgrade
- Link to pricing page

**Subscription Status** - `components/subscription/subscription-status.tsx`:
- Show current plan in settings
- Manage subscription button (opens Stripe portal)
- Show renewal date if subscribed

### 8. Feature Gating Utility

Create `lib/utils/subscription-features.ts`:

```typescript
export const FEATURE_LIMITS = {
  free: {
    maxEnvelopes: 5,
    bankSync: false,
    kidsModule: false,
    lifeModule: false,
  },
  pro: {
    maxEnvelopes: Infinity,
    bankSync: true,
    kidsModule: true,
    lifeModule: true,
  },
};

export function canAccessFeature(
  subscription: { plan_id: string; status: string },
  feature: keyof typeof FEATURE_LIMITS.free
): boolean {
  // Implementation
}
```

### 9. Integration Points

Update these existing files to check subscription:
- Envelope creation - Check maxEnvelopes limit
- Akahu connection page - Check bankSync access
- Kids Module routes - Check kidsModule access
- Life Module routes - Check lifeModule access

---

## Style Guide Compliance

- Use sage colors for primary CTAs on pricing
- Use gold for "Most Popular" badge on Pro plan
- Use blue-light backgrounds for feature comparison
- Friendly, non-pushy upgrade messaging (Remy voice)

---

## Testing Checklist

- [ ] Stripe test mode works end-to-end
- [ ] Webhook handles all events correctly
- [ ] Free users see appropriate limits
- [ ] Pro users have full access
- [ ] Subscription status updates in real-time
- [ ] Customer portal accessible
- [ ] Yearly discount displays correctly

---

## Security Notes

- Never expose STRIPE_SECRET_KEY to client
- Always verify webhook signatures
- Use service role for subscription updates
- Validate user owns subscription before portal access
