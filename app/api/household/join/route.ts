import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET /api/household/join?token=xxx - Get invitation details by token
export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  // Get invitation with household info
  const { data: invitation, error } = await supabase
    .from("household_invitations")
    .select(`
      *,
      households (name),
      inviter:profiles!invited_by (full_name, preferred_name)
    `)
    .eq("token", token)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error) {
    console.error("Error fetching invitation:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!invitation) {
    return NextResponse.json(
      { error: "Invitation not found or expired" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    expires_at: invitation.expires_at,
    household_name: invitation.households?.name,
    inviter_name: invitation.inviter?.preferred_name || invitation.inviter?.full_name,
  });
}

// POST /api/household/join - Accept invitation and join household
export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { token } = body;

  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  // Get invitation
  const { data: invitation, error: inviteError } = await supabase
    .from("household_invitations")
    .select("*")
    .eq("token", token)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (inviteError || !invitation) {
    return NextResponse.json(
      { error: "Invitation not found or expired" },
      { status: 404 }
    );
  }

  // Verify email matches
  if (invitation.email.toLowerCase() !== user.email?.toLowerCase()) {
    return NextResponse.json(
      { error: "This invitation was sent to a different email address" },
      { status: 403 }
    );
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

  // Add user to household
  const { error: memberError } = await supabase
    .from("household_members")
    .insert({
      household_id: invitation.household_id,
      user_id: user.id,
      role: invitation.role,
      invited_by: invitation.invited_by,
    });

  if (memberError) {
    console.error("Error joining household:", memberError);
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  // Update invitation status
  await supabase
    .from("household_invitations")
    .update({
      status: "accepted",
      accepted_at: new Date().toISOString(),
      accepted_by: user.id,
    })
    .eq("id", invitation.id);

  // Log audit
  await supabase.from("household_audit_log").insert({
    household_id: invitation.household_id,
    action: "member_joined",
    performed_by: user.id,
    affected_user: user.id,
    details: { role: invitation.role, via_invitation: true },
  });

  // Get updated household info
  const { data: household } = await supabase
    .from("households")
    .select("*")
    .eq("id", invitation.household_id)
    .single();

  return NextResponse.json({
    success: true,
    household,
    message: `You've joined ${household?.name || "the household"}!`,
  });
}
