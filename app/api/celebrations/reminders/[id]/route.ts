import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * DELETE /api/celebrations/reminders/[id]
 * Dismiss a celebration reminder
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { error } = await supabase
    .from("celebration_reminders")
    .update({
      is_dismissed: true,
      dismissed_at: new Date().toISOString(),
    })
    .eq("id", params.id)
    .eq("user_id", user.id);

  if (error) {
    console.error("[celebration-reminders] DELETE error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}

/**
 * PATCH /api/celebrations/reminders/[id]
 * Update a celebration reminder (e.g., un-dismiss it)
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await request.json();
  const allowedFields = ["is_dismissed"];

  const payload: Record<string, any> = {};
  for (const [key, value] of Object.entries(body)) {
    if (allowedFields.includes(key)) {
      payload[key] = value;
    }
  }

  // Handle dismissal status
  if ("is_dismissed" in payload) {
    payload.is_dismissed = Boolean(payload.is_dismissed);
    payload.dismissed_at = payload.is_dismissed ? new Date().toISOString() : null;
  }

  const { data, error } = await supabase
    .from("celebration_reminders")
    .update(payload)
    .eq("id", params.id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    console.error("[celebration-reminders] PATCH error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ reminder: data });
}
