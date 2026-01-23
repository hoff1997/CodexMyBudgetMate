import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { HouseholdSummary } from "@/lib/types/household";

// GET /api/household - Get current user's household info
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user's household membership
  const { data: membership, error: memberError } = await supabase
    .from("household_members")
    .select(`
      *,
      households (*)
    `)
    .eq("user_id", user.id)
    .maybeSingle();

  if (memberError) {
    console.error("Error fetching household membership:", memberError);
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  // User not in a household
  if (!membership) {
    const summary: HouseholdSummary = {
      household: null,
      role: null,
      members: [],
      pendingInvitations: [],
      hasPartner: false,
    };
    return NextResponse.json(summary);
  }

  const household = membership.households;

  // Get all members with their profiles
  const { data: members, error: membersError } = await supabase
    .from("household_members")
    .select(`
      *,
      profile:profiles(full_name, preferred_name, avatar_url)
    `)
    .eq("household_id", household.id);

  if (membersError) {
    console.error("Error fetching household members:", membersError);
    return NextResponse.json({ error: membersError.message }, { status: 500 });
  }

  // Get pending invitations (only if owner/partner)
  let pendingInvitations: unknown[] = [];
  if (membership.role === "owner" || membership.role === "partner") {
    const { data: invitations } = await supabase
      .from("household_invitations")
      .select("*")
      .eq("household_id", household.id)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString());

    pendingInvitations = invitations || [];
  }

  const summary: HouseholdSummary = {
    household: household,
    role: membership.role,
    members: members?.map((m) => ({
      ...m,
      profile: m.profile,
    })) || [],
    pendingInvitations: pendingInvitations as HouseholdSummary["pendingInvitations"],
    hasPartner: (members?.length || 0) > 1,
  };

  return NextResponse.json(summary);
}

// POST /api/household - Create a new household
export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user already in a household
  const { data: existingMembership } = await supabase
    .from("household_members")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingMembership) {
    return NextResponse.json(
      { error: "You are already in a household. Leave your current household first." },
      { status: 400 }
    );
  }

  const body = await request.json();
  const { name } = body;

  // Create household (trigger will add user as owner)
  const { data: household, error } = await supabase
    .from("households")
    .insert({
      name: name || "Our Household",
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating household:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log audit
  await supabase.from("household_audit_log").insert({
    household_id: household.id,
    action: "created",
    performed_by: user.id,
    details: { name: household.name },
  });

  return NextResponse.json(household, { status: 201 });
}

// DELETE /api/household - Leave household (or delete if owner and no other members)
export async function DELETE() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user's membership
  const { data: membership, error: memberError } = await supabase
    .from("household_members")
    .select("*, households(*)")
    .eq("user_id", user.id)
    .maybeSingle();

  if (memberError || !membership) {
    return NextResponse.json({ error: "Not in a household" }, { status: 404 });
  }

  const householdId = membership.household_id;

  // Count other members
  const { count } = await supabase
    .from("household_members")
    .select("id", { count: "exact", head: true })
    .eq("household_id", householdId)
    .neq("user_id", user.id);

  // If owner and other members exist, can't leave
  if (membership.role === "owner" && (count || 0) > 0) {
    return NextResponse.json(
      { error: "Transfer ownership before leaving. You cannot leave as owner while others are in the household." },
      { status: 400 }
    );
  }

  // Log before deletion
  await supabase.from("household_audit_log").insert({
    household_id: householdId,
    action: "member_left",
    performed_by: user.id,
    affected_user: user.id,
  });

  // Leave household
  const { error: deleteError } = await supabase
    .from("household_members")
    .delete()
    .eq("user_id", user.id);

  if (deleteError) {
    console.error("Error leaving household:", deleteError);
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  // If no members left, delete household
  if ((count || 0) === 0) {
    await supabase.from("households").delete().eq("id", householdId);
  }

  return NextResponse.json({ success: true });
}
