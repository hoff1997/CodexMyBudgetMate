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

  const { data: child, error } = await supabase
    .from("child_profiles")
    .select("screen_time_balance")
    .eq("id", child_id)
    .single();

  if (error || !child) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  return NextResponse.json({
    balance: child.screen_time_balance || 0,
  });
}
