import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateDaysUntil } from "@/lib/types/celebrations";

/**
 * GET /api/celebrations/birthdays
 * Fetch all birthdays from the Birthdays envelope for cross-app integration
 * Query params:
 *   - include_non_monetary: Include birthdays without gift budgets (future feature)
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const includeNonMonetary = searchParams.get("include_non_monetary") === "true";

  // Get budgeted birthdays from gift_recipients in Birthdays or Anniversaries envelopes
  const { data: budgetedBirthdays, error } = await supabase
    .from("gift_recipients")
    .select(`
      id,
      recipient_name,
      gift_amount,
      celebration_date,
      envelope_id,
      envelope:envelopes!inner(name, icon, is_celebration)
    `)
    .eq("user_id", user.id)
    .not("celebration_date", "is", null);

  if (error) {
    console.error("[celebrations/birthdays] GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Filter to only Birthdays and Anniversaries envelopes
  const birthdayRelatedEnvelopes = ["Birthdays", "Anniversaries"];
  const filteredBirthdays = (budgetedBirthdays || []).filter((b: any) =>
    birthdayRelatedEnvelopes.some((name) =>
      b.envelope?.name?.toLowerCase().includes(name.toLowerCase())
    )
  );

  // Transform and sort by upcoming date
  const birthdays = filteredBirthdays
    .map((b: any) => ({
      id: b.id,
      name: b.recipient_name,
      date: b.celebration_date,
      has_gift_budget: true,
      gift_amount: Number(b.gift_amount) || 0,
      days_until: calculateDaysUntil(b.celebration_date),
      envelope_id: b.envelope_id,
      envelope_name: b.envelope?.name || "Birthdays",
    }))
    .sort((a, b) => a.days_until - b.days_until);

  // TODO: If includeNonMonetary, also fetch from a separate "contacts" or "life app" table
  // For now, we only return budgeted birthdays

  return NextResponse.json(birthdays);
}
