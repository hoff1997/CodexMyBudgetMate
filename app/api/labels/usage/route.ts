import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createErrorResponse, createUnauthorizedError } from "@/lib/utils/api-error";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const { error } = await supabase.rpc("refresh_label_usage");

  if (error) {
    return createErrorResponse(error, 400, "Failed to refresh label usage");
  }

  const { data } = await supabase
    .from("labels")
    .select("id, usage_count")
    .eq("user_id", user.id);

  return NextResponse.json({ ok: true, counts: data ?? [] });
}
