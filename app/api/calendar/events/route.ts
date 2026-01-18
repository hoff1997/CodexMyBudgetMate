import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createUnauthorizedError, createErrorResponse } from "@/lib/utils/api-error";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const { searchParams } = new URL(request.url);
  const start_date = searchParams.get("start_date");
  const end_date = searchParams.get("end_date");
  const visible_only = searchParams.get("visible_only") === "true";

  let query = supabase
    .from("calendar_events")
    .select(
      `
      *,
      connection:calendar_connections(*)
    `
    )
    .eq("parent_user_id", user.id);

  if (start_date) {
    query = query.gte("start_time", start_date);
  }

  if (end_date) {
    query = query.lte("start_time", end_date);
  }

  const { data, error } = await query.order("start_time");

  if (error) {
    return createErrorResponse(error, 400, "Failed to fetch calendar events");
  }

  // Transform connection from array to object (Supabase join fix)
  let events = (data || []).map((event) => ({
    ...event,
    connection: Array.isArray(event.connection)
      ? event.connection[0] || null
      : event.connection,
  }));

  // Filter by visibility if requested
  if (visible_only) {
    events = events.filter((event) => event.connection?.is_visible);
  }

  // Don't expose tokens in connection data
  events = events.map((event) => ({
    ...event,
    connection: event.connection
      ? {
          id: event.connection.id,
          calendar_name: event.connection.calendar_name,
          owner_name: event.connection.owner_name,
          color_hex: event.connection.color_hex,
          is_visible: event.connection.is_visible,
        }
      : null,
  }));

  return NextResponse.json({ events });
}
