import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkBetaAccess } from "@/lib/utils/beta-access";
import {
  generateUniqueFamilyAccessCode,
  generateSecureFamilyCode,
  hashPin,
} from "@/lib/utils/family-code-generator";
import {
  createErrorResponse,
  createUnauthorizedError,
} from "@/lib/utils/api-error";

// GET: List all child profiles for the current parent
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  // Check beta access
  const betaAccess = await checkBetaAccess();
  if (!betaAccess.hasAccess) {
    return NextResponse.json(
      { error: "You don't have access to Kids features" },
      { status: 403 }
    );
  }

  const { data: children, error } = await supabase
    .from("child_profiles")
    .select(
      `
      id,
      name,
      date_of_birth,
      avatar_url,
      family_access_code,
      login_key,
      login_key_created_at,
      login_key_last_used_at,
      money_mode,
      distribution_spend_pct,
      distribution_save_pct,
      distribution_invest_pct,
      distribution_give_pct,
      star_balance,
      screen_time_balance,
      created_at
    `
    )
    .eq("parent_user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    return createErrorResponse(error, 400, "Failed to fetch child profiles");
  }

  return NextResponse.json({ data: children });
}

// POST: Create a new child profile
export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  // Check beta access
  const betaAccess = await checkBetaAccess();
  if (!betaAccess.hasAccess) {
    return NextResponse.json(
      { error: "You don't have access to Kids features" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { name, dateOfBirth, pin, avatarUrl } = body;

    // Validate required fields
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Child name is required" },
        { status: 400 }
      );
    }

    if (!pin || !/^\d{4}$/.test(pin)) {
      return NextResponse.json(
        { error: "PIN must be exactly 4 digits" },
        { status: 400 }
      );
    }

    // Get parent's profile to generate family code
    const { data: profile } = await supabase
      .from("profiles")
      .select("preferred_name, email")
      .eq("id", user.id)
      .maybeSingle();

    const parentName = profile?.preferred_name || user.email?.split("@")[0] || "USER";

    // Generate unique family access code (legacy, kept for backwards compatibility)
    const familyAccessCode = generateUniqueFamilyAccessCode(parentName);

    // Generate secure login key (new system - unique per child)
    const loginKey = generateSecureFamilyCode();

    // Hash the PIN
    const pinHash = await hashPin(pin);

    // Create the child profile
    const { data: child, error: insertError } = await supabase
      .from("child_profiles")
      .insert({
        parent_user_id: user.id,
        name: name.trim(),
        date_of_birth: dateOfBirth || null,
        avatar_url: avatarUrl || null,
        family_access_code: familyAccessCode,
        login_key: loginKey,
        login_key_created_at: new Date().toISOString(),
        pin_hash: pinHash,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating child profile:", insertError);
      return createErrorResponse(insertError, 400, "Failed to create child profile");
    }

    // Create default bank accounts (virtual)
    const envelopeTypes = ["spend", "save", "invest", "give"];
    const accountsToCreate = envelopeTypes.map((type) => ({
      child_profile_id: child.id,
      envelope_type: type,
      account_name: `${name}'s ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      is_virtual: true,
      current_balance: 0,
      opening_balance: 0,
    }));

    await supabase.from("child_bank_accounts").insert(accountsToCreate);

    // Return child without the PIN hash
    const { pin_hash: _, ...safeChild } = child;

    return NextResponse.json({ data: safeChild }, { status: 201 });
  } catch (err) {
    console.error("Error in POST /api/kids/profiles:", err);
    return NextResponse.json(
      { error: "Failed to create child profile" },
      { status: 500 }
    );
  }
}
