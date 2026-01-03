import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateDaysUntil } from "@/lib/types/celebrations";

/**
 * GET /api/celebrations/reminders
 * Fetch active celebration reminders for the dashboard
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const today = new Date().toISOString().split("T")[0];

  // Fetch reminders that are due to show (reminder_date <= today) and not dismissed
  const { data: reminders, error } = await supabase
    .from("celebration_reminders")
    .select(`
      *,
      envelope:envelopes(name, icon)
    `)
    .eq("user_id", user.id)
    .eq("is_dismissed", false)
    .lte("reminder_date", today)
    .order("celebration_date", { ascending: true });

  if (error) {
    console.error("[celebration-reminders] GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Transform reminders with calculated days_until
  const transformedReminders = (reminders || []).map((r) => ({
    id: r.id,
    recipient_name: r.recipient_name,
    celebration_date: r.celebration_date,
    gift_amount: r.gift_amount,
    envelope_name: r.envelope?.name || "Celebration",
    envelope_icon: r.envelope?.icon || "🎉",
    days_until: calculateDaysUntil(r.celebration_date),
  }));

  return NextResponse.json(transformedReminders);
}

/**
 * POST /api/celebrations/reminders
 * Regenerate all reminders for the user (called when settings change)
 */
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  // Call the database function to regenerate reminders
  const { data, error } = await supabase.rpc("generate_celebration_reminders", {
    p_user_id: user.id,
  });

  if (error) {
    console.error("[celebration-reminders] POST regenerate error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    reminders_generated: data,
  });
}
