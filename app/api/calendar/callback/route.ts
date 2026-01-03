import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exchangeCodeForTokens, getCalendarList } from "@/lib/google-calendar";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL("/life/hub?error=access_denied", request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/life/hub?error=no_code", request.url)
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Get calendar list
    const calendars = await getCalendarList(tokens.access_token);

    // Save each calendar as a connection
    for (const cal of calendars.items) {
      // Check if calendar already connected
      const { data: existing } = await supabase
        .from("calendar_connections")
        .select("id")
        .eq("parent_user_id", user.id)
        .eq("google_calendar_id", cal.id)
        .single();

      if (existing) {
        // Update existing connection
        await supabase
          .from("calendar_connections")
          .update({
            calendar_name: cal.summary,
            owner_name: cal.summaryOverride || cal.summary,
            color_hex: cal.backgroundColor || "#4285F4",
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token || null,
            token_expires_at: new Date(
              Date.now() + tokens.expires_in * 1000
            ).toISOString(),
          })
          .eq("id", existing.id);
      } else {
        // Insert new connection
        await supabase.from("calendar_connections").insert({
          parent_user_id: user.id,
          google_calendar_id: cal.id,
          calendar_name: cal.summary,
          owner_name: cal.summaryOverride || cal.summary,
          color_hex: cal.backgroundColor || "#4285F4",
          is_visible: true,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || null,
          token_expires_at: new Date(
            Date.now() + tokens.expires_in * 1000
          ).toISOString(),
        });
      }
    }

    return NextResponse.redirect(
      new URL("/life/hub?success=true", request.url)
    );
  } catch (error) {
    console.error("Calendar connection error:", error);
    return NextResponse.redirect(
      new URL("/life/hub?error=connection_failed", request.url)
    );
  }
}
