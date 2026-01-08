/**
 * Celebrations & Gift Tracking Types
 * Types for managing gift recipients, celebration reminders, and related features
 */

/**
 * Gift recipient for a celebration envelope
 */
export interface GiftRecipient {
  id: string;
  user_id: string;
  envelope_id: string;
  recipient_name: string;
  gift_amount: number;
  party_amount?: number; // One-off party/food budget
  celebration_date: string | null; // ISO date string, null for non-date celebrations
  notes: string | null;
  needs_gift: boolean; // If false, just tracking date without budgeting
  created_at: string;
  updated_at: string;
}

/**
 * Gift recipient for form/dialog use (without database metadata)
 */
export interface GiftRecipientInput {
  id?: string;
  recipient_name: string;
  gift_amount: number;
  party_amount?: number; // One-off party/food budget
  celebration_date?: Date | null;
  notes?: string;
  needs_gift?: boolean; // Default true - tracks whether they give gifts
}

/**
 * Celebration reminder for dashboard display
 */
export interface CelebrationReminder {
  id: string;
  user_id: string;
  gift_recipient_id: string;
  reminder_date: string; // ISO date string
  celebration_date: string; // ISO date string
  recipient_name: string;
  gift_amount: number | null;
  envelope_id: string | null;
  is_dismissed: boolean;
  dismissed_at: string | null;
  created_at: string;
}

/**
 * Celebration reminder with envelope details (for dashboard display)
 */
export interface CelebrationReminderWithEnvelope extends CelebrationReminder {
  envelope_name: string;
  envelope_icon: string;
  days_until: number;
}

/**
 * Envelope template for celebrations
 */
export interface EnvelopeTemplate {
  id: string;
  name: string;
  category_name: string;
  subtype: 'bill' | 'spending' | 'savings' | 'goal' | 'tracking';
  icon: string;
  description: string | null;
  is_celebration: boolean;
  requires_date: boolean; // True for birthdays/anniversaries
  display_order: number;
}

/**
 * Celebration envelope data (envelope with gift recipients)
 */
export interface CelebrationEnvelope {
  id: string;
  name: string;
  icon: string;
  is_celebration: boolean;
  requires_date: boolean;
  target_amount: number;
  current_amount: number;
  gift_recipients: GiftRecipient[];
  recipient_count: number;
  total_gift_budget: number;
}

/**
 * Birthday data for cross-app integration
 */
export interface BirthdayEntry {
  id: string;
  name: string;
  date: string; // ISO date string
  has_gift_budget: boolean;
  gift_amount: number | null;
  days_until: number;
  envelope_id: string | null;
}

/**
 * Celebration reminder settings
 */
export type ReminderWeeks = 0 | 1 | 2 | 3 | 4;

export interface CelebrationSettings {
  celebration_reminder_weeks: ReminderWeeks;
}

/**
 * API response types
 */
export interface GiftRecipientsResponse {
  recipients: GiftRecipient[];
  total_budget: number;
}

export interface CelebrationRemindersResponse {
  reminders: CelebrationReminderWithEnvelope[];
}

export interface BirthdaysResponse {
  birthdays: BirthdayEntry[];
}

/**
 * Gift allocation dialog props
 */
export interface GiftAllocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  envelope: {
    id: string;
    name: string;
    icon: string;
    is_celebration: boolean;
    requires_date?: boolean;
    target_amount: number;
    current_amount: number;
  };
  existingRecipients?: GiftRecipient[];
  onSave: (recipients: GiftRecipientInput[], budgetChange: number) => Promise<void>;
}

/**
 * Helper to calculate days until a celebration
 */
export function calculateDaysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const celebrationDate = new Date(dateStr);
  celebrationDate.setFullYear(now.getFullYear());
  celebrationDate.setHours(0, 0, 0, 0);

  // If date has passed this year, use next year
  if (celebrationDate < now) {
    celebrationDate.setFullYear(now.getFullYear() + 1);
  }

  const diffTime = celebrationDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Helper to check if an envelope requires dates for recipients
 */
export function envelopeRequiresDate(envelopeName: string): boolean {
  const dateRequiredEnvelopes = ['Birthdays', 'Anniversaries'];
  return dateRequiredEnvelopes.some(name =>
    envelopeName.toLowerCase().includes(name.toLowerCase())
  );
}

/**
 * Helper to format celebration date for display
 */
export function formatCelebrationDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' });
}

/**
 * Helper to get relative time text for days until
 */
export function getDaysUntilText(daysUntil: number): string {
  if (daysUntil === 0) return 'Today!';
  if (daysUntil === 1) return 'Tomorrow';
  if (daysUntil <= 7) return `In ${daysUntil} days`;
  if (daysUntil <= 14) return 'Next week';
  if (daysUntil <= 30) return `In ${Math.ceil(daysUntil / 7)} weeks`;
  return `In ${Math.ceil(daysUntil / 30)} months`;
}
