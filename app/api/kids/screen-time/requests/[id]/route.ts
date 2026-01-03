import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { status, minutes_granted } = body;

  if (!status || !["approved", "denied"].includes(status)) {
    return NextResponse.json(
      { error: "Valid status required (approved or denied)" },
      { status: 400 }
    );
  }

  // Get request
  const { data: screenTimeRequest } = await supabase
    .from("screen_time_requests")
    .select("*")
    .eq("id", params.id)
    .eq("parent_user_id", user.id)
    .single();

  if (!screenTimeRequest) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  if (screenTimeRequest.status !== "pending") {
    return NextResponse.json(
      { error: "Request already processed" },
      { status: 400 }
    );
  }

  // Update request
  const { error: updateError } = await supabase
    .from("screen_time_requests")
    .update({
      status,
      minutes_granted: status === "approved" ? minutes_granted : null,
      approved_at: status === "approved" ? new Date().toISOString() : null,
      approved_by: status === "approved" ? user.id : null,
    })
    .eq("id", params.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  // If approved, deduct from balance and create transaction
  if (status === "approved" && minutes_granted > 0) {
    const { data: child } = await supabase
      .from("child_profiles")
      .select("screen_time_balance")
      .eq("id", screenTimeRequest.child_profile_id)
      .single();

    if (child) {
      // Deduct balance
      await supabase
        .from("child_profiles")
        .update({
          screen_time_balance:
            (child.screen_time_balance || 0) - minutes_granted,
        })
        .eq("id", screenTimeRequest.child_profile_id);

      // Create transaction
      await supabase.from("screen_time_transactions").insert({
        child_profile_id: screenTimeRequest.child_profile_id,
        minutes: -minutes_granted,
        source: "screen_time_use",
        reference_id: params.id,
        approved_by: user.id,
      });
    }
  }

  return NextResponse.json({ success: true, status });
}
