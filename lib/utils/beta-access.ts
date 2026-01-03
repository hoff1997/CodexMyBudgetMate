// Beta Access Check Utility for My Budget Mate Kids + Life

import { createClient } from "@/lib/supabase/server";

export type BetaAccessResult = {
  hasAccess: boolean;
  userType: "adult" | "child" | null;
  inviteCode: string | null;
};

// Hardcoded beta users - these get access even if DB table doesn't exist yet
const HARDCODED_BETA_USERS = [
  "hoff1997@gmail.com",
];

/**
 * Check if the current user has beta access to Kids + Life features
 * Server-side function for use in Server Components and API routes
 */
export async function checkBetaAccess(): Promise<BetaAccessResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { hasAccess: false, userType: null, inviteCode: null };
  }

  // Check hardcoded beta users first (works even if DB table doesn't exist)
  if (HARDCODED_BETA_USERS.includes(user.email.toLowerCase())) {
    return { hasAccess: true, userType: "adult", inviteCode: null };
  }

  // Try to check database table (may not exist yet)
  try {
    const { data: betaAccess, error } = await supabase
      .from("feature_beta_access")
      .select("user_type, invite_code")
      .eq("user_email", user.email)
      .maybeSingle();

    if (error || !betaAccess) {
      return { hasAccess: false, userType: null, inviteCode: null };
    }

    return {
      hasAccess: true,
      userType: betaAccess.user_type as "adult" | "child",
      inviteCode: betaAccess.invite_code,
    };
  } catch {
    // Table doesn't exist yet - that's okay
    return { hasAccess: false, userType: null, inviteCode: null };
  }
}

/**
 * Check if a specific email has beta access (for validation)
 * Used by admin functions or invite code redemption
 */
export async function checkEmailBetaAccess(
  email: string
): Promise<BetaAccessResult> {
  const supabase = await createClient();

  const { data: betaAccess, error } = await supabase
    .from("feature_beta_access")
    .select("user_type, invite_code")
    .eq("user_email", email.toLowerCase())
    .maybeSingle();

  if (error || !betaAccess) {
    return { hasAccess: false, userType: null, inviteCode: null };
  }

  return {
    hasAccess: true,
    userType: betaAccess.user_type as "adult" | "child",
    inviteCode: betaAccess.invite_code,
  };
}

/**
 * Grant beta access to a user via invite code
 */
export async function redeemInviteCode(
  email: string,
  inviteCode: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Check if invite code exists and is valid
  const { data: existingInvite, error: findError } = await supabase
    .from("feature_beta_access")
    .select("id, user_email")
    .eq("invite_code", inviteCode.toUpperCase())
    .maybeSingle();

  if (findError || !existingInvite) {
    return { success: false, error: "Invalid invite code" };
  }

  // Check if already redeemed
  if (existingInvite.user_email) {
    return { success: false, error: "Invite code has already been used" };
  }

  // Check if user already has access
  const { data: existingAccess } = await supabase
    .from("feature_beta_access")
    .select("id")
    .eq("user_email", email.toLowerCase())
    .maybeSingle();

  if (existingAccess) {
    return { success: false, error: "You already have beta access" };
  }

  // Grant access
  const { error: insertError } = await supabase
    .from("feature_beta_access")
    .insert({
      user_email: email.toLowerCase(),
      user_type: "adult",
    });

  if (insertError) {
    return { success: false, error: "Failed to grant access" };
  }

  return { success: true };
}
