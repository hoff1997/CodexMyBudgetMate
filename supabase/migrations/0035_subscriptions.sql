-- =============================================
-- STRIPE SUBSCRIPTION SYSTEM
-- Migration: 0035_subscriptions.sql
-- =============================================

-- Subscription plans (defined by us)
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                      -- 'Free', 'Pro'
  slug TEXT UNIQUE NOT NULL,               -- 'free', 'pro'
  description TEXT,
  stripe_product_id TEXT,                  -- prod_xxxxx
  stripe_price_id_monthly TEXT,            -- price_xxxxx
  stripe_price_id_yearly TEXT,             -- price_xxxxx
  price_monthly DECIMAL(10,2) DEFAULT 0,   -- 9.99
  price_yearly DECIMAL(10,2) DEFAULT 0,    -- 99.00
  features JSONB DEFAULT '[]',             -- ["unlimited_envelopes", "unlimited_accounts"]
  limits JSONB DEFAULT '{}',               -- {"envelopes": 10, "accounts": 1}
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default plans
INSERT INTO subscription_plans (name, slug, description, price_monthly, price_yearly, features, limits, sort_order) VALUES
(
  'Free',
  'free',
  'Get started with the basics',
  0,
  0,
  '["basic_budgeting", "bank_connection", "transactions"]',
  '{"envelopes": 10, "accounts": 2, "income_sources": 1}',
  1
),
(
  'Pro',
  'pro',
  'Everything you need to master your money',
  9.99,
  99.00,
  '["unlimited_envelopes", "unlimited_accounts", "unlimited_income", "net_worth", "reports", "data_export", "priority_support"]',
  '{"envelopes": -1, "accounts": -1, "income_sources": -1}',
  2
);

-- User subscriptions
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES subscription_plans(id),

  -- Stripe identifiers
  stripe_customer_id TEXT,                 -- cus_xxxxx
  stripe_subscription_id TEXT,             -- sub_xxxxx
  stripe_price_id TEXT,                    -- Current price (monthly or yearly)

  -- Subscription status
  status TEXT NOT NULL DEFAULT 'inactive', -- active, cancelled, past_due, trialing, inactive

  -- Billing period
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  cancelled_at TIMESTAMPTZ,

  -- Trial
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id),
  UNIQUE(stripe_customer_id),
  UNIQUE(stripe_subscription_id)
);

-- Payment history
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id),

  -- Stripe identifiers
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_invoice_id TEXT,

  -- Payment details
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'nzd',
  status TEXT NOT NULL,                    -- succeeded, failed, refunded, pending
  description TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Plans are readable by everyone (public pricing)
CREATE POLICY "Anyone can view active plans"
  ON subscription_plans FOR SELECT
  USING (is_active = true);

-- Users can only view their own subscription
CREATE POLICY "Users can view own subscription"
  ON subscriptions FOR SELECT
  USING (user_id = auth.uid());

-- Users can only view their own payments
CREATE POLICY "Users can view own payments"
  ON payments FOR SELECT
  USING (user_id = auth.uid());

-- Indexes for performance
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_created ON payments(created_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_subscription_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subscription_timestamp
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_timestamp();
