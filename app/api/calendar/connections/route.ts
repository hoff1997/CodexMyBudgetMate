import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("calendar_connections")
    .select("*")
    .eq("parent_user_id", user.id)
    .order("created_at");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Don't expose tokens in response
  const sanitized = data?.map((conn) => ({
    id: conn.id,
    calendar_name: conn.calendar_name,
    owner_name: conn.owner_name,
    color_hex: conn.color_hex,
    is_visible: conn.is_visible,
    google_calendar_id: conn.google_calendar_id,
  }));

  return NextResponse.json({ connections: sanitized });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Connection ID required" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("calendar_connections")
    .delete()
    .eq("id", id)
    .eq("parent_user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
