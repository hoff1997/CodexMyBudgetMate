export type CurrencyDisplay = 'NZD' | 'AUD' | 'USD' | 'GBP' | 'EUR';
export type DateFormatOption = 'dd/MM/yyyy' | 'MM/dd/yyyy' | 'yyyy-MM-dd';
export type NumberFormatOption = 'space' | 'comma';
export type DashboardLayout = 'default' | 'compact';

export interface UserPreferences {
  id: string;
  user_id: string;

  // Display
  currency_display: CurrencyDisplay;
  date_format: DateFormatOption;
  number_format: NumberFormatOption;
  show_cents: boolean;

  // Dashboard
  dashboard_layout: DashboardLayout;

  // Email notifications
  email_weekly_summary: boolean;
  email_bill_reminders: boolean;
  email_low_balance: boolean;
  email_achievement_unlocked: boolean;

  // Behaviour
  auto_approve_rules: boolean;
  confirm_transfers: boolean;

  // Metadata
  created_at: string;
  updated_at: string;
}

export const DEFAULT_PREFERENCES: Omit<UserPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  currency_display: 'NZD',
  date_format: 'dd/MM/yyyy',
  number_format: 'space',
  show_cents: true,
  dashboard_layout: 'default',
  email_weekly_summary: true,
  email_bill_reminders: true,
  email_low_balance: true,
  email_achievement_unlocked: true,
  auto_approve_rules: false,
  confirm_transfers: true,
};

// Allowed values for validation
export const CURRENCY_OPTIONS: { value: CurrencyDisplay; label: string }[] = [
  { value: 'NZD', label: 'NZD ($)' },
  { value: 'AUD', label: 'AUD ($)' },
  { value: 'USD', label: 'USD ($)' },
  { value: 'GBP', label: 'GBP (\u00A3)' },
  { value: 'EUR', label: 'EUR (\u20AC)' },
];

export const DATE_FORMAT_OPTIONS: { value: DateFormatOption; label: string }[] = [
  { value: 'dd/MM/yyyy', label: 'DD/MM/YYYY' },
  { value: 'MM/dd/yyyy', label: 'MM/DD/YYYY' },
  { value: 'yyyy-MM-dd', label: 'YYYY-MM-DD' },
];

export const NUMBER_FORMAT_OPTIONS: { value: NumberFormatOption; label: string }[] = [
  { value: 'space', label: '1 000.00' },
  { value: 'comma', label: '1,000.00' },
];
