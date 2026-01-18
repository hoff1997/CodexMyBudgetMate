import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createErrorResponse, createUnauthorizedError, createValidationError, createNotFoundError } from "@/lib/utils/api-error";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const body = await request.json();
  const { child_id, minutes_requested } = body;

  if (!child_id || !minutes_requested) {
    return createValidationError("child_id and minutes_requested required");
  }

  // Check balance
  const { data: child } = await supabase
    .from("child_profiles")
    .select("screen_time_balance, parent_user_id")
    .eq("id", child_id)
    .single();

  if (!child) {
    return createNotFoundError("Child");
  }

  if ((child.screen_time_balance || 0) < minutes_requested) {
    return NextResponse.json(
      {
        error: "Insufficient screen time balance",
        balance: child.screen_time_balance || 0,
      },
      { status: 400 }
    );
  }

  // Create request
  const { data, error } = await supabase
    .from("screen_time_requests")
    .insert({
      child_profile_id: child_id,
      parent_user_id: child.parent_user_id,
      minutes_requested: minutes_requested,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    return createErrorResponse(error, 400, "Failed to create screen time request");
  }

  return NextResponse.json({ request: data });
}
