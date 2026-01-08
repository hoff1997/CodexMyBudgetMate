import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteContext {
  params: Promise<{ childId: string }>;
}

// POST /api/kids/[childId]/bank-link/approve - Parent approves bank linking
export async function POST(request: Request, context: RouteContext) {
  const supabase = await createClient();
  const { childId } = await context.params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { requestId, approved, notes } = body;

  if (!requestId) {
    return NextResponse.json({ error: "Request ID is required" }, { status: 400 });
  }

  // Verify parent owns this child and request
  const { data: linkRequest, error: requestError } = await supabase
    .from("teen_bank_link_requests")
    .select(`
      *,
      child_profiles (
        id,
        parent_user_id,
        name
      )
    `)
    .eq("id", requestId)
    .eq("child_profile_id", childId)
    .eq("request_status", "pending")
    .maybeSingle();

  if (requestError || !linkRequest) {
    return NextResponse.json({ error: "Pending request not found" }, { status: 404 });
  }

  const childProfile = linkRequest.child_profiles as { id: string; parent_user_id: string; name: string };

  if (childProfile.parent_user_id !== user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Check if request has expired
  if (linkRequest.expires_at && new Date(linkRequest.expires_at) < new Date()) {
    // Update to expired status
    await supabase
      .from("teen_bank_link_requests")
      .update({ request_status: "expired" })
      .eq("id", requestId);

    return NextResponse.json({ error: "This request has expired" }, { status: 400 });
  }

  const newStatus = approved ? "approved" : "denied";

  // Update the request
  const { error: updateError } = await supabase
    .from("teen_bank_link_requests")
    .update({
      request_status: newStatus,
      responded_at: new Date().toISOString(),
      response_notes: notes || null,
    })
    .eq("id", requestId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  // If approved, create the Akahu connection record (pending OAuth)
  if (approved) {
    // Update child profile to enable bank linking
    await supabase
      .from("child_profiles")
      .update({
        bank_linking_enabled: true,
        bank_linking_approved_at: new Date().toISOString(),
      })
      .eq("id", childId);

    // Create pending connection
    const { error: connectionError } = await supabase
      .from("teen_akahu_connections")
      .insert({
        child_profile_id: childId,
        parent_user_id: user.id,
        connection_status: "pending",
        parent_approved: true,
        parent_approved_at: new Date().toISOString(),
      });

    if (connectionError && !connectionError.message.includes("duplicate")) {
      console.error("Error creating connection:", connectionError);
    }
  }

  return NextResponse.json({
    success: true,
    status: newStatus,
    message: approved
      ? `Bank linking approved for ${childProfile.name}. They can now connect their bank account.`
      : `Bank linking request denied for ${childProfile.name}.`,
  });
}
