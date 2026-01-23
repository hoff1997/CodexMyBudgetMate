import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// POST /api/household/invite - Send invitation to partner
export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { email, role = "partner" } = body;

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
  }

  // Get user's household membership
  const { data: membership, error: memberError } = await supabase
    .from("household_members")
    .select("household_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (memberError || !membership) {
    return NextResponse.json(
      { error: "You must create a household first" },
      { status: 400 }
    );
  }

  // Only owner/partner can invite
  if (membership.role !== "owner" && membership.role !== "partner") {
    return NextResponse.json(
      { error: "You don't have permission to invite members" },
      { status: 403 }
    );
  }

  // Check if email is same as current user
  if (email.toLowerCase() === user.email?.toLowerCase()) {
    return NextResponse.json(
      { error: "You cannot invite yourself" },
      { status: 400 }
    );
  }

  // Check if already a member
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const targetUser = existingUsers?.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );

  if (targetUser) {
    const { data: existingMember } = await supabase
      .from("household_members")
      .select("id")
      .eq("household_id", membership.household_id)
      .eq("user_id", targetUser.id)
      .maybeSingle();

    if (existingMember) {
      return NextResponse.json(
        { error: "This person is already a member of your household" },
        { status: 400 }
      );
    }
  }

  // Check for existing pending invitation
  const { data: existingInvitation } = await supabase
    .from("household_invitations")
    .select("id")
    .eq("household_id", membership.household_id)
    .eq("email", email.toLowerCase())
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (existingInvitation) {
    return NextResponse.json(
      { error: "An invitation has already been sent to this email" },
      { status: 400 }
    );
  }

  // Create invitation
  const { data: invitation, error: inviteError } = await supabase
    .from("household_invitations")
    .insert({
      household_id: membership.household_id,
      email: email.toLowerCase(),
      invited_by: user.id,
      role: role,
    })
    .select()
    .single();

  if (inviteError) {
    console.error("Error creating invitation:", inviteError);
    return NextResponse.json({ error: inviteError.message }, { status: 500 });
  }

  // Log audit
  await supabase.from("household_audit_log").insert({
    household_id: membership.household_id,
    action: "invitation_sent",
    performed_by: user.id,
    details: { email: email.toLowerCase(), role },
  });

  // TODO: Send email notification
  // For now, just return the invitation token which can be shared

  return NextResponse.json({
    invitation: {
      id: invitation.id,
      email: invitation.email,
      token: invitation.token,
      expires_at: invitation.expires_at,
    },
    // Generate shareable link
    inviteLink: `/join-household?token=${invitation.token}`,
  }, { status: 201 });
}

// GET /api/household/invite - Get pending invitations for current household
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user's household
  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json([]);
  }

  // Get pending invitations
  const { data: invitations, error } = await supabase
    .from("household_invitations")
    .select("*")
    .eq("household_id", membership.household_id)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching invitations:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(invitations || []);
}

// DELETE /api/household/invite - Cancel an invitation
export async function DELETE(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const invitationId = searchParams.get("id");

  if (!invitationId) {
    return NextResponse.json({ error: "Invitation ID required" }, { status: 400 });
  }

  // Get user's household
  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || (membership.role !== "owner" && membership.role !== "partner")) {
    return NextResponse.json(
      { error: "You don't have permission to cancel invitations" },
      { status: 403 }
    );
  }

  // Delete the invitation
  const { error } = await supabase
    .from("household_invitations")
    .delete()
    .eq("id", invitationId)
    .eq("household_id", membership.household_id);

  if (error) {
    console.error("Error deleting invitation:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
