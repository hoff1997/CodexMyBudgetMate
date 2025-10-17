export type DatabaseProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

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
};
