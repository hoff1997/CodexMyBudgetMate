import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { error } = await supabase.rpc("refresh_label_usage");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const { data } = await supabase
    .from("labels")
    .select("id, usage_count")
    .eq("user_id", user.id);

  return NextResponse.json({ ok: true, counts: data ?? [] });
}
