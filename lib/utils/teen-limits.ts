/**
 * Teen Mode Limits Utility
 *
 * Enforces limits on teen mode features to encourage graduation to paid accounts.
 * These limits create a natural forcing function to convert teens to paying customers.
 *
 * Limits:
 * - 6 envelopes max (adults typically need 15-30)
 * - 2 external income sources max
 * - 1 bank connection max
 */

import { createClient } from "@/lib/supabase/server";

/**
 * Teen mode limits configuration
 * These are the maximum values allowed in teen mode before graduation is required
 */
export const TEEN_MODE_LIMITS = {
  envelopes: 6,
  externalIncomeSources: 2,
  bankConnections: 1,
} as const;

/**
 * Status of a teen's usage against their limits
 */
export interface TeenLimitsStatus {
  envelopes: {
    current: number;
    max: number;
    canAdd: boolean;
    remaining: number;
  };
  externalIncome: {
    current: number;
    max: number;
    canAdd: boolean;
    remaining: number;
  };
  bankConnections: {
    current: number;
    max: number;
    canAdd: boolean;
    remaining: number;
  };
  isAtAnyLimit: boolean;
  daysUntilAutoGraduation: number | null;
  isInGracePeriod: boolean;
  gracePeriodEndsAt: Date | null;
  autoGraduationDate: Date | null;
}

/**
 * Result of checking if a teen can add a resource
 */
export interface LimitCheckResult {
  allowed: boolean;
  reason?: "limit_reached" | "grace_expired" | "not_teen_mode";
  currentCount: number;
  maxAllowed: number;
  upgradePrompt?: {
    title: string;
    message: string;
    ctaText: string;
    ctaUrl: string;
  };
}

/**
 * Get the full limits status for a teen
 */
export async function getTeenLimitsStatus(
  childId: string
): Promise<TeenLimitsStatus | null> {
  const supabase = await createClient();

  // Get child profile with teen mode info
  const { data: child, error: childError } = await supabase
    .from("child_profiles")
    .select(
      `
      id,
      is_teen_mode,
      auto_graduation_date,
      graduation_grace_ends_at,
      graduation_status
    `
    )
    .eq("id", childId)
    .single();

  if (childError || !child) {
    return null;
  }

  // Count current envelopes
  const { count: envelopeCount } = await supabase
    .from("teen_envelopes")
    .select("id", { count: "exact", head: true })
    .eq("child_profile_id", childId)
    .eq("is_active", true);

  // Count current external income sources
  const { count: incomeCount } = await supabase
    .from("teen_external_income")
    .select("id", { count: "exact", head: true })
    .eq("child_profile_id", childId)
    .eq("is_active", true);

  // Count current bank connections
  const { count: bankCount } = await supabase
    .from("teen_linked_accounts")
    .select("id", { count: "exact", head: true })
    .eq("child_profile_id", childId);

  const currentEnvelopes = envelopeCount ?? 0;
  const currentIncome = incomeCount ?? 0;
  const currentBanks = bankCount ?? 0;

  // Calculate days until auto-graduation
  let daysUntilAutoGraduation: number | null = null;
  let autoGraduationDate: Date | null = null;

  if (child.auto_graduation_date) {
    autoGraduationDate = new Date(child.auto_graduation_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const gradDate = new Date(child.auto_graduation_date);
    gradDate.setHours(0, 0, 0, 0);
    daysUntilAutoGraduation = Math.max(
      0,
      Math.ceil(
        (gradDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      )
    );
  }

  // Check grace period
  const gracePeriodEndsAt = child.graduation_grace_ends_at
    ? new Date(child.graduation_grace_ends_at)
    : null;
  const isInGracePeriod =
    gracePeriodEndsAt !== null && gracePeriodEndsAt > new Date();

  const envelopesRemaining = Math.max(
    0,
    TEEN_MODE_LIMITS.envelopes - currentEnvelopes
  );
  const incomeRemaining = Math.max(
    0,
    TEEN_MODE_LIMITS.externalIncomeSources - currentIncome
  );
  const banksRemaining = Math.max(
    0,
    TEEN_MODE_LIMITS.bankConnections - currentBanks
  );

  return {
    envelopes: {
      current: currentEnvelopes,
      max: TEEN_MODE_LIMITS.envelopes,
      canAdd: currentEnvelopes < TEEN_MODE_LIMITS.envelopes,
      remaining: envelopesRemaining,
    },
    externalIncome: {
      current: currentIncome,
      max: TEEN_MODE_LIMITS.externalIncomeSources,
      canAdd: currentIncome < TEEN_MODE_LIMITS.externalIncomeSources,
      remaining: incomeRemaining,
    },
    bankConnections: {
      current: currentBanks,
      max: TEEN_MODE_LIMITS.bankConnections,
      canAdd: currentBanks < TEEN_MODE_LIMITS.bankConnections,
      remaining: banksRemaining,
    },
    isAtAnyLimit:
      envelopesRemaining === 0 ||
      incomeRemaining === 0 ||
      banksRemaining === 0,
    daysUntilAutoGraduation,
    isInGracePeriod,
    gracePeriodEndsAt,
    autoGraduationDate,
  };
}

/**
 * Check if a teen can add another envelope
 */
export async function canTeenAddEnvelope(
  childId: string
): Promise<LimitCheckResult> {
  const supabase = await createClient();

  // Check if child is in teen mode
  const { data: child } = await supabase
    .from("child_profiles")
    .select("is_teen_mode, graduation_status, graduation_grace_ends_at")
    .eq("id", childId)
    .single();

  if (!child?.is_teen_mode) {
    return {
      allowed: false,
      reason: "not_teen_mode",
      currentCount: 0,
      maxAllowed: TEEN_MODE_LIMITS.envelopes,
    };
  }

  // Check if grace period has expired
  if (child.graduation_status === "expired") {
    return {
      allowed: false,
      reason: "grace_expired",
      currentCount: TEEN_MODE_LIMITS.envelopes,
      maxAllowed: TEEN_MODE_LIMITS.envelopes,
      upgradePrompt: {
        title: "Teen Mode Expired",
        message:
          "Your teen mode access has expired. Graduate to continue budgeting.",
        ctaText: "Graduate Now - It's Free!",
        ctaUrl: `/kids/${childId}/graduate`,
      },
    };
  }

  // Count current envelopes
  const { count } = await supabase
    .from("teen_envelopes")
    .select("id", { count: "exact", head: true })
    .eq("child_profile_id", childId)
    .eq("is_active", true);

  const currentCount = count ?? 0;

  if (currentCount >= TEEN_MODE_LIMITS.envelopes) {
    return {
      allowed: false,
      reason: "limit_reached",
      currentCount,
      maxAllowed: TEEN_MODE_LIMITS.envelopes,
      upgradePrompt: {
        title: "You've Grown!",
        message: `You're managing ${TEEN_MODE_LIMITS.envelopes} envelopes like a pro. Graduate to unlock unlimited envelopes.`,
        ctaText: "Graduate Now - It's Free!",
        ctaUrl: `/kids/${childId}/graduate`,
      },
    };
  }

  return {
    allowed: true,
    currentCount,
    maxAllowed: TEEN_MODE_LIMITS.envelopes,
  };
}

/**
 * Check if a teen can add another external income source
 */
export async function canTeenAddExternalIncome(
  childId: string
): Promise<LimitCheckResult> {
  const supabase = await createClient();

  // Check if child is in teen mode
  const { data: child } = await supabase
    .from("child_profiles")
    .select(
      "is_teen_mode, can_add_external_income, graduation_status, graduation_grace_ends_at"
    )
    .eq("id", childId)
    .single();

  if (!child?.is_teen_mode || !child.can_add_external_income) {
    return {
      allowed: false,
      reason: "not_teen_mode",
      currentCount: 0,
      maxAllowed: TEEN_MODE_LIMITS.externalIncomeSources,
    };
  }

  // Check if grace period has expired
  if (child.graduation_status === "expired") {
    return {
      allowed: false,
      reason: "grace_expired",
      currentCount: TEEN_MODE_LIMITS.externalIncomeSources,
      maxAllowed: TEEN_MODE_LIMITS.externalIncomeSources,
      upgradePrompt: {
        title: "Teen Mode Expired",
        message:
          "Your teen mode access has expired. Graduate to continue budgeting.",
        ctaText: "Graduate Now - It's Free!",
        ctaUrl: `/kids/${childId}/graduate`,
      },
    };
  }

  // Count current external income sources
  const { count } = await supabase
    .from("teen_external_income")
    .select("id", { count: "exact", head: true })
    .eq("child_profile_id", childId)
    .eq("is_active", true);

  const currentCount = count ?? 0;

  if (currentCount >= TEEN_MODE_LIMITS.externalIncomeSources) {
    return {
      allowed: false,
      reason: "limit_reached",
      currentCount,
      maxAllowed: TEEN_MODE_LIMITS.externalIncomeSources,
      upgradePrompt: {
        title: "Multiple Income Streams!",
        message: `You have ${TEEN_MODE_LIMITS.externalIncomeSources} income sources. Graduate to add more and unlock advanced budgeting.`,
        ctaText: "Graduate Now - It's Free!",
        ctaUrl: `/kids/${childId}/graduate`,
      },
    };
  }

  return {
    allowed: true,
    currentCount,
    maxAllowed: TEEN_MODE_LIMITS.externalIncomeSources,
  };
}

/**
 * Check if a teen can add another bank connection
 */
export async function canTeenAddBankConnection(
  childId: string
): Promise<LimitCheckResult> {
  const supabase = await createClient();

  // Check if child is in teen mode with bank linking enabled
  const { data: child } = await supabase
    .from("child_profiles")
    .select("is_teen_mode, bank_linking_enabled, graduation_status")
    .eq("id", childId)
    .single();

  if (!child?.is_teen_mode || !child.bank_linking_enabled) {
    return {
      allowed: false,
      reason: "not_teen_mode",
      currentCount: 0,
      maxAllowed: TEEN_MODE_LIMITS.bankConnections,
    };
  }

  if (child.graduation_status === "expired") {
    return {
      allowed: false,
      reason: "grace_expired",
      currentCount: TEEN_MODE_LIMITS.bankConnections,
      maxAllowed: TEEN_MODE_LIMITS.bankConnections,
    };
  }

  // Count current bank connections
  const { count } = await supabase
    .from("teen_linked_accounts")
    .select("id", { count: "exact", head: true })
    .eq("child_profile_id", childId);

  const currentCount = count ?? 0;

  if (currentCount >= TEEN_MODE_LIMITS.bankConnections) {
    return {
      allowed: false,
      reason: "limit_reached",
      currentCount,
      maxAllowed: TEEN_MODE_LIMITS.bankConnections,
      upgradePrompt: {
        title: "Ready for More?",
        message:
          "Graduate to connect multiple bank accounts and get a complete view of your finances.",
        ctaText: "Graduate Now - It's Free!",
        ctaUrl: `/kids/${childId}/graduate`,
      },
    };
  }

  return {
    allowed: true,
    currentCount,
    maxAllowed: TEEN_MODE_LIMITS.bankConnections,
  };
}

/**
 * Calculate age from date of birth
 */
export function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())
  ) {
    age--;
  }

  return age;
}

/**
 * Check if a child is eligible for teen mode (13+ years old)
 */
export function isEligibleForTeenMode(dateOfBirth: Date): boolean {
  return calculateAge(dateOfBirth) >= 13;
}

/**
 * Check if a teen has reached auto-graduation age (18)
 */
export function hasReachedGraduationAge(dateOfBirth: Date): boolean {
  return calculateAge(dateOfBirth) >= 18;
}

/**
 * Calculate days until 18th birthday
 */
export function daysUntil18thBirthday(dateOfBirth: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const eighteenthBirthday = new Date(dateOfBirth);
  eighteenthBirthday.setFullYear(dateOfBirth.getFullYear() + 18);
  eighteenthBirthday.setHours(0, 0, 0, 0);

  if (eighteenthBirthday <= today) {
    return 0;
  }

  return Math.ceil(
    (eighteenthBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
}

/**
 * Check if warning should be sent (30 days before 18th birthday)
 */
export function shouldSendGraduationWarning(dateOfBirth: Date): boolean {
  const daysUntil = daysUntil18thBirthday(dateOfBirth);
  return daysUntil > 0 && daysUntil <= 30;
}
