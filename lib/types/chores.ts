// ============================================================================
// CHORE SYSTEM TYPE DEFINITIONS
// ============================================================================

// Time of day options for scheduling
export type TimeOfDay = "morning" | "afternoon" | "evening" | "anytime";

// Schedule frequency options
export type ScheduleFrequency = "daily" | "weekly" | "fortnightly" | "monthly";

// Currency types for rewards
export type CurrencyType = "money" | "screen_time" | "stars";

// ============================================================================
// CHORE TEMPLATES
// ============================================================================

export interface ChoreTemplate {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  category: string;
  recommended_age_min: number | null;
  recommended_age_max: number | null;
  currency_type: CurrencyType;
  currency_amount: number;
  estimated_minutes: number | null;
  is_system: boolean;
  created_by: string | null;
  created_at: string;
}

// ============================================================================
// CHORE ROUTINES (Bundles like "Morning Routine")
// ============================================================================

export interface ChoreRoutine {
  id: string;
  parent_user_id: string;
  name: string;
  description: string | null;
  icon: string;
  time_of_day: TimeOfDay;
  target_time: string | null; // TIME format HH:MM:SS
  duration_estimate_minutes: number | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ChoreRoutineItem {
  id: string;
  routine_id: string;
  chore_template_id: string;
  sort_order: number;
  is_required: boolean;
  override_currency_type: CurrencyType | null;
  override_currency_amount: number | null;
  created_at: string;
  // Joined data
  chore_template?: ChoreTemplate;
}

export interface ChoreRoutineWithItems extends ChoreRoutine {
  items: ChoreRoutineItem[];
}

// ============================================================================
// CHORE ROTATIONS (Who does what, rotating between children)
// ============================================================================

export interface ChoreRotation {
  id: string;
  parent_user_id: string;
  chore_template_id: string;
  name: string | null;
  frequency: ScheduleFrequency;
  day_of_week: number | null;
  currency_type: CurrencyType;
  currency_amount: number;
  current_child_index: number;
  last_rotated_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ChoreRotationMember {
  id: string;
  rotation_id: string;
  child_profile_id: string;
  order_position: number;
  created_at: string;
  // Joined data
  child?: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
}

export interface ChoreRotationWithMembers extends ChoreRotation {
  chore_template?: ChoreTemplate;
  rotation_members: ChoreRotationMember[];
}

// ============================================================================
// CHORE SCHEDULES (Flexible recurring patterns)
// ============================================================================

export interface ChoreSchedule {
  id: string;
  parent_user_id: string;
  name: string;

  // What to schedule (one of these)
  chore_template_id: string | null;
  routine_id: string | null;

  // Who to assign
  child_profile_id: string | null;
  rotation_id: string | null;

  // When to run
  frequency: ScheduleFrequency;
  days_of_week: number[] | null; // 0=Sunday, 1=Monday, etc.
  day_of_month: number | null;
  time_of_day: TimeOfDay;
  target_time: string | null;

  // Recurrence settings
  start_date: string; // DATE format YYYY-MM-DD
  end_date: string | null;
  occurrences_limit: number | null;
  occurrences_count: number;

  // Status
  is_active: boolean;
  last_generated_date: string | null;
  next_occurrence_date: string | null;

  // Reward overrides
  currency_type: CurrencyType | null;
  currency_amount: number | null;

  created_at: string;
  updated_at: string;
}

export interface ChoreScheduleWithRelations extends ChoreSchedule {
  chore_template?: ChoreTemplate | null;
  routine?: ChoreRoutine | null;
  child?: {
    id: string;
    name: string;
    avatar_url: string | null;
  } | null;
  rotation?: ChoreRotationWithMembers | null;
}

// ============================================================================
// SYSTEM ROUTINE TEMPLATES (Pre-built routines)
// ============================================================================

export interface SystemRoutineTemplate {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  time_of_day: TimeOfDay;
  category: string;
  chore_names: string[];
  created_at: string;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface CreateRoutineRequest {
  name: string;
  description?: string;
  icon?: string;
  time_of_day?: TimeOfDay;
  target_time?: string;
  duration_estimate_minutes?: number;
  items: {
    chore_template_id: string;
    sort_order?: number;
    is_required?: boolean;
    override_currency_type?: CurrencyType;
    override_currency_amount?: number;
  }[];
}

export interface UpdateRoutineRequest {
  name?: string;
  description?: string;
  icon?: string;
  time_of_day?: TimeOfDay;
  target_time?: string;
  duration_estimate_minutes?: number;
  is_active?: boolean;
  sort_order?: number;
}

export interface CreateScheduleRequest {
  name: string;
  chore_template_id?: string;
  routine_id?: string;
  child_profile_id?: string;
  rotation_id?: string;
  frequency: ScheduleFrequency;
  days_of_week?: number[];
  day_of_month?: number;
  time_of_day?: TimeOfDay;
  target_time?: string;
  start_date?: string;
  end_date?: string;
  occurrences_limit?: number;
  currency_type?: CurrencyType;
  currency_amount?: number;
}

export interface UpdateScheduleRequest {
  name?: string;
  child_profile_id?: string;
  rotation_id?: string;
  frequency?: ScheduleFrequency;
  days_of_week?: number[];
  day_of_month?: number;
  time_of_day?: TimeOfDay;
  target_time?: string;
  end_date?: string;
  occurrences_limit?: number;
  is_active?: boolean;
  currency_type?: CurrencyType;
  currency_amount?: number;
}

// ============================================================================
// UI HELPER TYPES
// ============================================================================

export const TIME_OF_DAY_OPTIONS: { value: TimeOfDay; label: string; icon: string }[] = [
  { value: "morning", label: "Morning", icon: "🌅" },
  { value: "afternoon", label: "Afternoon", icon: "☀️" },
  { value: "evening", label: "Evening", icon: "🌙" },
  { value: "anytime", label: "Anytime", icon: "📋" },
];

export const SCHEDULE_FREQUENCY_OPTIONS: { value: ScheduleFrequency; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "fortnightly", label: "Fortnightly" },
  { value: "monthly", label: "Monthly" },
];

export const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday", short: "Sun" },
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
];
