import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST - Archive envelope
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { reason } = body;

    // Archive the envelope
    const { data, error } = await supabase
      .from("envelopes")
      .update({
        is_archived: true,
        archived_at: new Date().toISOString(),
        archive_reason: reason || null,
      })
      .eq("id", params.id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      console.error("Failed to archive envelope:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ envelope: data });
  } catch (error) {
    console.error("Archive error:", error);
    return NextResponse.json(
      { error: "Failed to archive envelope" },
      { status: 500 }
    );
  }
}
