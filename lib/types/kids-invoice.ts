// ============================================================================
// KIDS INVOICE SYSTEM TYPE DEFINITIONS
// For teens with real bank accounts learning money management
// ============================================================================

// ============================================================================
// INCOME SOURCES (Pocket Money)
// ============================================================================

export type IncomeFrequency = 'weekly' | 'fortnightly' | 'monthly';

export interface KidIncomeSource {
  id: string;
  child_profile_id: string;
  name: string;
  amount: number;
  frequency: IncomeFrequency;
  next_pay_date: string | null;
  arrival_day: number | null; // Day of week (0=Sun) or day of month
  is_active: boolean;
  bank_transfer_confirmed: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateKidIncomeSourceRequest {
  child_profile_id: string;
  name?: string;
  amount: number;
  frequency: IncomeFrequency;
  next_pay_date?: string;
  arrival_day?: number;
  bank_transfer_confirmed?: boolean;
}

export interface UpdateKidIncomeSourceRequest {
  name?: string;
  amount?: number;
  frequency?: IncomeFrequency;
  next_pay_date?: string;
  arrival_day?: number;
  is_active?: boolean;
  bank_transfer_confirmed?: boolean;
}

// ============================================================================
// INVOICES
// ============================================================================

export type InvoiceStatus = 'draft' | 'submitted' | 'paid';

export interface KidInvoice {
  id: string;
  child_profile_id: string;
  invoice_number: string;
  status: InvoiceStatus;
  total_amount: number;
  submitted_at: string | null;
  paid_at: string | null;
  payment_transaction_id: string | null;
  payment_notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  items?: KidInvoiceItem[];
  child?: {
    id: string;
    name: string;
  };
}

export interface KidInvoiceItem {
  id: string;
  invoice_id: string;
  chore_assignment_id: string | null;
  chore_name: string;
  amount: number;
  completed_at: string;
  approved_at: string | null;
  approved_by: string | null;
  photo_proof_url: string | null;
  created_at: string;
}

export interface CreateKidInvoiceRequest {
  child_profile_id: string;
}

export interface AddInvoiceItemRequest {
  invoice_id: string;
  chore_assignment_id?: string;
  chore_name: string;
  amount: number;
  completed_at: string;
  photo_proof_url?: string;
}

export interface SubmitInvoiceRequest {
  invoice_id: string;
}

export interface ReconcileInvoiceRequest {
  invoice_id: string;
  payment_transaction_id?: string;
  payment_notes?: string;
}

// ============================================================================
// PAYMENT SETTINGS
// ============================================================================

export type InvoiceFrequency = 'weekly' | 'fortnightly' | 'monthly';

export interface KidPaymentSettings {
  id: string;
  child_profile_id: string;
  invoice_frequency: InvoiceFrequency;
  invoice_day: number | null;
  reminder_enabled: boolean;
  auto_submit: boolean;
  created_at: string;
  updated_at: string;
}

export interface UpdateKidPaymentSettingsRequest {
  invoice_frequency?: InvoiceFrequency;
  invoice_day?: number;
  reminder_enabled?: boolean;
  auto_submit?: boolean;
}

// ============================================================================
// EXPECTED CHORE STREAKS
// ============================================================================

export interface ExpectedChoreStreak {
  id: string;
  child_profile_id: string;
  chore_template_id: string;
  current_streak: number;
  longest_streak: number;
  last_completed_date: string | null;
  week_starting: string | null;
  completed_days: boolean[]; // [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
  created_at: string;
  updated_at: string;
  // Joined data
  chore_template?: {
    id: string;
    name: string;
    icon: string;
  };
}

// ============================================================================
// HUB PERMISSIONS
// ============================================================================

export type HubFeature =
  | 'shopping_lists'
  | 'recipes'
  | 'meal_planner'
  | 'todos'
  | 'calendar'
  | 'birthdays';

export type PermissionLevel = 'none' | 'view' | 'edit' | 'full';

export interface KidHubPermission {
  id: string;
  child_profile_id: string;
  feature_name: HubFeature;
  permission_level: PermissionLevel;
  created_at: string;
  updated_at: string;
}

export interface UpdateKidHubPermissionsRequest {
  permissions: {
    feature_name: HubFeature;
    permission_level: PermissionLevel;
  }[];
}

// ============================================================================
// TRANSFER REQUESTS
// ============================================================================

export type TransferEnvelope = 'save' | 'invest' | 'give';
export type TransferRequestStatus = 'pending' | 'approved' | 'denied';

export interface KidTransferRequest {
  id: string;
  child_profile_id: string;
  from_envelope: TransferEnvelope;
  to_envelope: 'spend';
  amount: number;
  reason: string | null;
  status: TransferRequestStatus;
  parent_notes: string | null;
  responded_by: string | null;
  responded_at: string | null;
  created_at: string;
}

export interface CreateTransferRequestRequest {
  child_profile_id: string;
  from_envelope: TransferEnvelope;
  amount: number;
  reason?: string;
}

export interface RespondToTransferRequestRequest {
  status: 'approved' | 'denied';
  parent_notes?: string;
}

// ============================================================================
// CHILD PROFILE EXTENSIONS
// ============================================================================

export type ChildEnvelopeType = 'spend' | 'save' | 'invest' | 'give';

// TeenLinkedAccount - linked via teen_linked_accounts table (Akahu-connected)
export interface TeenLinkedAccount {
  id: string;
  child_profile_id: string;
  teen_akahu_connection_id: string;
  akahu_account_id: string;
  account_name: string;
  account_type: 'savings' | 'transaction' | 'other' | null;
  institution_name: string | null;
  institution_logo: string | null;
  current_balance: number;
  available_balance: number | null;
  last_balance_update: string | null;
  child_bank_account_id: string | null;
  child_envelope_type: ChildEnvelopeType | null;
  show_in_parent_budget: boolean;
  is_active: boolean;
  is_primary_savings: boolean;
  created_at: string;
  updated_at: string;
}

// ChildBankAccount - virtual envelope balances (from child_bank_accounts table)
export interface ChildBankAccount {
  id: string;
  child_profile_id: string;
  envelope_type: ChildEnvelopeType;
  account_name: string | null;
  current_balance: number;
  is_virtual: boolean;
  opening_balance: number;
  created_at: string;
  updated_at: string;
}

// Extended child profile with invoice system data
export interface ChildProfileWithInvoices {
  id: string;
  parent_user_id: string;
  name: string;
  date_of_birth: string | null;
  avatar_url: string | null;
  family_access_code: string;
  money_mode: 'virtual' | 'real_accounts';

  // Envelope balances (virtual accounts for tracking)
  bank_accounts?: ChildBankAccount[];

  // Real bank accounts (linked via Akahu)
  linked_accounts?: TeenLinkedAccount[];

  // Income & Payment
  income_sources?: KidIncomeSource[];
  payment_settings?: KidPaymentSettings;

  // Invoice status
  pending_invoice?: KidInvoice;
  recent_invoices?: KidInvoice[];

  // Hub access
  hub_permissions?: KidHubPermission[];

  // Streaks
  streaks?: ExpectedChoreStreak[];

  // Transfer requests
  pending_transfer_requests?: KidTransferRequest[];
}

// ============================================================================
// UI HELPER TYPES
// ============================================================================

export const INCOME_FREQUENCY_OPTIONS: { value: IncomeFrequency; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'fortnightly', label: 'Fortnightly' },
  { value: 'monthly', label: 'Monthly' },
];

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  paid: 'Paid',
};

export const INVOICE_STATUS_COLORS: Record<InvoiceStatus, string> = {
  draft: 'text-text-medium bg-silver-light',
  submitted: 'text-blue bg-blue-light',
  paid: 'text-sage-dark bg-sage-very-light',
};

export const HUB_FEATURE_LABELS: Record<HubFeature, string> = {
  shopping_lists: 'Shopping Lists',
  recipes: 'Recipes',
  meal_planner: 'Meal Planner',
  todos: 'To-Do Lists',
  calendar: 'Calendar',
  birthdays: 'Birthdays',
};

export const PERMISSION_LEVEL_LABELS: Record<PermissionLevel, string> = {
  none: 'Hidden',
  view: 'View Only',
  edit: 'Can Edit',
  full: 'Full Access',
};

export const ENVELOPE_TYPE_ICONS: Record<ChildEnvelopeType, string> = {
  spend: '💳',
  save: '💰',
  invest: '📈',
  give: '💝',
};

export const ENVELOPE_TYPE_LABELS: Record<ChildEnvelopeType, string> = {
  spend: 'Spend',
  save: 'Save',
  invest: 'Invest',
  give: 'Give',
};

// ============================================================================
// INVOICE DETECTION (Akahu Integration)
// ============================================================================

export interface DetectedInvoicePayment {
  type: 'invoice_payment_detected';
  invoice: KidInvoice;
  transaction: {
    id: string;
    amount: number;
    description: string;
    date: string;
    from_account?: string;
  };
  confidence: 'exact_match' | 'close_match';
}
