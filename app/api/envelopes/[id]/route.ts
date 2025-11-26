import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await request.json();
  const allowedFields = [
    "name",
    "category_id",
    "envelope_type",
    "subtype",
    "priority",
    "target_amount",
    "annual_amount",
    "pay_cycle_amount",
    "frequency",
    "next_payment_due",
    "due_date",
    "notes",
    "sort_order",
    "is_spending",
    "icon",
    "opening_balance",
  ];

  const payload = Object.fromEntries(
    Object.entries(body).filter(([key]) => allowedFields.includes(key)),
  );

  if (typeof payload.name === "string") {
    payload.name = payload.name.trim();
  }

  if ("category_id" in payload && (payload.category_id === "" || payload.category_id === null)) {
    payload.category_id = null;
  }

  if (typeof payload.notes === "string") {
    payload.notes = payload.notes.trim() || null;
  }

  if ("icon" in payload && !payload.icon) {
    payload.icon = null;
  }

  if ("opening_balance" in payload) {
    const value = Number(payload.opening_balance ?? 0);
    payload.opening_balance = Number.isFinite(value) ? value : 0;
  }

  // Handle due_date conversion
  if ("due_date" in payload) {
    if (typeof payload.due_date === "number") {
      // If it's a day number (1-31), convert to a date in the current month
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const day = Math.max(1, Math.min(31, payload.due_date));
      const date = new Date(year, month, day);
      payload.due_date = date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    } else if (typeof payload.due_date === "string") {
      // If it's already a string, validate it's a proper date format
      const dateObj = new Date(payload.due_date);
      if (!isNaN(dateObj.getTime())) {
        payload.due_date = dateObj.toISOString().split('T')[0]; // Format as YYYY-MM-DD
      } else {
        payload.due_date = null;
      }
    } else if (payload.due_date === null || payload.due_date === undefined) {
      payload.due_date = null;
    }
  }

  payload.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from("envelopes")
    .update(payload)
    .eq("id", params.id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
