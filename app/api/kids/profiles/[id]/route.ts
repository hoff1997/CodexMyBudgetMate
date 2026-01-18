import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkBetaAccess } from "@/lib/utils/beta-access";
import {
  createErrorResponse,
  createUnauthorizedError,
  createValidationError,
} from "@/lib/utils/api-error";

// GET: Get a specific child profile
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

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

  const { data: child, error } = await supabase
    .from("child_profiles")
    .select(
      `
      id,
      name,
      date_of_birth,
      avatar_url,
      family_access_code,
      money_mode,
      distribution_spend_pct,
      distribution_save_pct,
      distribution_invest_pct,
      distribution_give_pct,
      created_at
    `
    )
    .eq("id", id)
    .eq("parent_user_id", user.id)
    .maybeSingle();

  if (error) {
    return createErrorResponse(error, 400, "Failed to fetch child profile");
  }

  if (!child) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  return NextResponse.json({ data: child });
}

// PATCH: Update a child profile
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

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

    // Verify ownership first
    const { data: existing, error: fetchError } = await supabase
      .from("child_profiles")
      .select("id")
      .eq("id", id)
      .eq("parent_user_id", user.id)
      .maybeSingle();

    if (fetchError) {
      return createErrorResponse(fetchError, 400, "Failed to verify child profile");
    }

    if (!existing) {
      return NextResponse.json({ error: "Child not found" }, { status: 404 });
    }

    // Allowed fields for update
    const allowedFields = [
      "name",
      "date_of_birth",
      "avatar_url",
      "money_mode",
      "distribution_spend_pct",
      "distribution_save_pct",
      "distribution_invest_pct",
      "distribution_give_pct",
      "min_age_for_bank_linking",
      "bank_linking_enabled",
      "daily_spending_limit",
      "weekly_spending_limit",
      "monthly_spending_limit",
      "require_approval_above",
    ];

    // Filter to only allowed fields
    const updateData: Record<string, unknown> = {};
    for (const key of Object.keys(body)) {
      if (allowedFields.includes(key)) {
        updateData[key] = body[key];
      }
    }

    // Handle PIN update separately (needs hashing)
    if (body.pin && typeof body.pin === "string" && body.pin.length === 4) {
      // Use bcrypt-style hashing via Supabase function or simple hash
      // For now, store as a simple hash (should match the create logic)
      const { createHash } = await import("crypto");
      const pinHash = createHash("sha256").update(body.pin).digest("hex");
      updateData.pin_hash = pinHash;
    }

    if (Object.keys(updateData).length === 0) {
      return createValidationError("No valid fields to update");
    }

    const { data: updated, error: updateError } = await supabase
      .from("child_profiles")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating child profile:", updateError);
      return createErrorResponse(updateError, 400, "Failed to update child profile");
    }

    // Return without sensitive fields
    const { pin_hash: _, ...safeChild } = updated;

    return NextResponse.json({ data: safeChild });
  } catch (err) {
    console.error("Error in PATCH /api/kids/profiles/[id]:", err);
    return NextResponse.json(
      { error: "Failed to update child profile" },
      { status: 500 }
    );
  }
}

// DELETE: Delete a child profile
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

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

  // Verify ownership first
  const { data: existing, error: fetchError } = await supabase
    .from("child_profiles")
    .select("id")
    .eq("id", id)
    .eq("parent_user_id", user.id)
    .maybeSingle();

  if (fetchError) {
    return createErrorResponse(fetchError, 400, "Failed to verify child profile");
  }

  if (!existing) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  const { error: deleteError } = await supabase
    .from("child_profiles")
    .delete()
    .eq("id", id);

  if (deleteError) {
    console.error("Error deleting child profile:", deleteError);
    return createErrorResponse(deleteError, 400, "Failed to delete child profile");
  }

  return NextResponse.json({ success: true });
}
