export type SubscriptionStatus =
  | 'active'
  | 'cancelled'
  | 'past_due'
  | 'trialing'
  | 'inactive';

export type BillingInterval = 'monthly' | 'yearly';

export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  stripe_product_id: string | null;
  stripe_price_id_monthly: string | null;
  stripe_price_id_yearly: string | null;
  price_monthly: number;
  price_yearly: number;
  features: string[];
  limits: PlanLimits;
  is_active: boolean;
  sort_order: number;
}

export interface PlanLimits {
  envelopes: number;    // -1 = unlimited
  accounts: number;     // -1 = unlimited
  income_sources: number;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  status: SubscriptionStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  cancelled_at: string | null;
  trial_start: string | null;
  trial_end: string | null;
  created_at: string;
  updated_at: string;
  plan?: SubscriptionPlan;
}

export interface Payment {
  id: string;
  user_id: string;
  subscription_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_invoice_id: string | null;
  amount: number;
  currency: string;
  status: 'succeeded' | 'failed' | 'refunded' | 'pending';
  description: string | null;
  created_at: string;
}

// Feature flags for gating
export const FEATURES = {
  BASIC_BUDGETING: 'basic_budgeting',
  BANK_CONNECTION: 'bank_connection',
  TRANSACTIONS: 'transactions',
  UNLIMITED_ENVELOPES: 'unlimited_envelopes',
  UNLIMITED_ACCOUNTS: 'unlimited_accounts',
  UNLIMITED_INCOME: 'unlimited_income',
  NET_WORTH: 'net_worth',
  REPORTS: 'reports',
  DATA_EXPORT: 'data_export',
  PRIORITY_SUPPORT: 'priority_support',
} as const;

export type Feature = typeof FEATURES[keyof typeof FEATURES];
