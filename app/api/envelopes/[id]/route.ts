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
