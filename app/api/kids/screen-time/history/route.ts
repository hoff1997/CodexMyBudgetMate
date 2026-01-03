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
  const child_id = searchParams.get("child_id");

  if (!child_id) {
    return NextResponse.json({ error: "child_id required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("screen_time_transactions")
    .select("*")
    .eq("child_profile_id", child_id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ transactions: data });
}
