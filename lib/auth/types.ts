export type DatabaseProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

export type GoalType = 'savings' | 'debt_payoff' | 'purchase' | 'emergency_fund' | 'other';

export type EnvelopeRow = {
  id: string;
  name: string;
  category_id?: string | null;
  target_amount: string | number | null;
  annual_amount?: string | number | null;
  pay_cycle_amount?: string | number | null;
  opening_balance?: string | number | null;
  current_amount: string | number | null;
  due_date: string | null;
  frequency: string | null;
  next_payment_due?: string | null;
  notes?: string | null;
  updated_at?: string | null;
  icon?: string | null;
  sort_order?: number | string | null;
  is_spending?: boolean | null;
  // Goal-specific fields
  is_goal?: boolean | null;
  goal_type?: GoalType | null;
  goal_target_date?: string | null;
  goal_completed_at?: string | null;
};

export type GoalMilestone = {
  id: string;
  envelope_id: string;
  user_id: string;
  milestone_name: string;
  milestone_amount: number;
  milestone_date: string | null;
  achieved_at: string | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type TransactionRow = {
  id: string;
  merchant_name: string;
  description?: string | null;
  amount: string | number | null;
  occurred_at: string;
  status?: string | null;
  envelope_name: string | null;
  account_name?: string | null;
  bank_reference?: string | null;
  bank_memo?: string | null;
  receipt_url?: string | null;
  labels?: string[];
  duplicate_of?: string | null;
  duplicate_status?: string | null;
  duplicate_reviewed_at?: string | null;
  allocation_plan_id?: string | null;
  is_auto_allocated?: boolean | null;
  parent_transaction_id?: string | null;
};
