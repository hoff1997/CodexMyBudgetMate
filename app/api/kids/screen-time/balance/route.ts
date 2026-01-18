import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createUnauthorizedError, createValidationError, createNotFoundError } from "@/lib/utils/api-error";

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

  const { data: child, error } = await supabase
    .from("child_profiles")
    .select("screen_time_balance")
    .eq("id", child_id)
    .single();

  if (error || !child) {
    return createNotFoundError("Child");
  }

  return NextResponse.json({
    balance: child.screen_time_balance || 0,
  });
}
