import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  let query = supabase
    .from("screen_time_requests")
    .select(
      `
      *,
      child_profile:child_profiles(*)
    `
    )
    .eq("parent_user_id", user.id)
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Transform child_profile from array to object
  const requests = (data || []).map((req) => ({
    ...req,
    child_profile: Array.isArray(req.child_profile)
      ? req.child_profile[0] || null
      : req.child_profile,
  }));

  return NextResponse.json({ requests });
}
