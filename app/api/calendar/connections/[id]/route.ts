import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createUnauthorizedError, createErrorResponse } from "@/lib/utils/api-error";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const body = await request.json();

  const updates: Record<string, unknown> = {};
  if ("is_visible" in body) updates.is_visible = body.is_visible;
  if ("color_hex" in body) updates.color_hex = body.color_hex;
  if ("owner_name" in body) updates.owner_name = body.owner_name;

  const { data, error } = await supabase
    .from("calendar_connections")
    .update(updates)
    .eq("id", params.id)
    .eq("parent_user_id", user.id)
    .select()
    .single();

  if (error) {
    return createErrorResponse(error, 400, "Failed to update calendar connection");
  }

  // Don't expose tokens
  const sanitized = {
    id: data.id,
    calendar_name: data.calendar_name,
    owner_name: data.owner_name,
    color_hex: data.color_hex,
    is_visible: data.is_visible,
    google_calendar_id: data.google_calendar_id,
  };

  return NextResponse.json({ connection: sanitized });
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const { error } = await supabase
    .from("calendar_connections")
    .delete()
    .eq("id", params.id)
    .eq("parent_user_id", user.id);

  if (error) {
    return createErrorResponse(error, 400, "Failed to delete calendar connection");
  }

  return NextResponse.json({ success: true });
}
