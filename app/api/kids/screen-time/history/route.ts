import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createErrorResponse, createUnauthorizedError, createValidationError } from "@/lib/utils/api-error";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const { searchParams } = new URL(request.url);
  const child_id = searchParams.get("child_id");

  if (!child_id) {
    return createValidationError("child_id required");
  }

  const { data, error } = await supabase
    .from("screen_time_transactions")
    .select("*")
    .eq("child_profile_id", child_id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return createErrorResponse(error, 400, "Failed to fetch screen time history");
  }

  return NextResponse.json({ transactions: data });
}
