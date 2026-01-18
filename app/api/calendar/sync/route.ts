import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getCalendarEvents,
  refreshAccessToken,
  parseGoogleDateTime,
} from "@/lib/google-calendar";
import { createUnauthorizedError } from "@/lib/utils/api-error";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  // Get all calendar connections
  const { data: connections } = await supabase
    .from("calendar_connections")
    .select("*")
    .eq("parent_user_id", user.id);

  if (!connections || connections.length === 0) {
    return NextResponse.json(
      { error: "No calendars connected" },
      { status: 404 }
    );
  }

  // Sync window: 30 days past, 90 days future
  const now = new Date();
  const timeMin = new Date(
    now.getTime() - 30 * 24 * 60 * 60 * 1000
  ).toISOString();
  const timeMax = new Date(
    now.getTime() + 90 * 24 * 60 * 60 * 1000
  ).toISOString();

  let totalEventsSynced = 0;
  const errors: string[] = [];

  for (const connection of connections) {
    try {
      // Check if token needs refresh
      let accessToken = connection.access_token;
      const expiresAt = new Date(connection.token_expires_at);

      if (expiresAt.getTime() < Date.now() + 5 * 60 * 1000) {
        // Refresh 5 min before expiry
        if (!connection.refresh_token) {
          errors.push(
            `Calendar ${connection.calendar_name}: No refresh token available`
          );
          continue;
        }

        try {
          const tokens = await refreshAccessToken(connection.refresh_token);
          accessToken = tokens.access_token;

          // Update token in database
          await supabase
            .from("calendar_connections")
            .update({
              access_token: tokens.access_token,
              token_expires_at: new Date(
                Date.now() + tokens.expires_in * 1000
              ).toISOString(),
            })
            .eq("id", connection.id);
        } catch (refreshError) {
          errors.push(
            `Calendar ${connection.calendar_name}: Token refresh failed`
          );
          continue;
        }
      }

      // Fetch events
      const events = await getCalendarEvents(
        accessToken,
        connection.google_calendar_id,
        timeMin,
        timeMax
      );

      // Delete old events for this calendar
      await supabase
        .from("calendar_events")
        .delete()
        .eq("calendar_connection_id", connection.id);

      // Insert new events
      if (events.items && events.items.length > 0) {
        const eventRecords = events.items.map((event) => ({
          calendar_connection_id: connection.id,
          parent_user_id: user.id,
          google_event_id: event.id,
          title: event.summary || "Untitled Event",
          description: event.description || null,
          location: event.location || null,
          start_time: parseGoogleDateTime(
            event.start.dateTime,
            event.start.date
          ).toISOString(),
          end_time: parseGoogleDateTime(
            event.end.dateTime,
            event.end.date
          ).toISOString(),
          is_all_day: !event.start.dateTime,
          color_id: event.colorId || null,
        }));

        const { error: insertError } = await supabase
          .from("calendar_events")
          .insert(eventRecords);

        if (insertError) {
          errors.push(
            `Calendar ${connection.calendar_name}: Failed to save events`
          );
        } else {
          totalEventsSynced += eventRecords.length;
        }
      }
    } catch (error) {
      console.error(
        `Failed to sync calendar ${connection.google_calendar_id}:`,
        error
      );
      errors.push(`Calendar ${connection.calendar_name}: Sync failed`);
    }
  }

  return NextResponse.json({
    success: errors.length === 0,
    events_synced: totalEventsSynced,
    calendars_synced: connections.length - errors.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}
