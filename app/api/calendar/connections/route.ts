import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createUnauthorizedError, createErrorResponse, createValidationError } from "@/lib/utils/api-error";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const { data, error } = await supabase
    .from("calendar_connections")
    .select("*")
    .eq("parent_user_id", user.id)
    .order("created_at");

  if (error) {
    return createErrorResponse(error, 400, "Failed to fetch calendar connections");
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
    return createUnauthorizedError();
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return createValidationError("Connection ID required");
  }

  const { error } = await supabase
    .from("calendar_connections")
    .delete()
    .eq("id", id)
    .eq("parent_user_id", user.id);

  if (error) {
    return createErrorResponse(error, 400, "Failed to delete calendar connection");
  }

  return NextResponse.json({ success: true });
}
