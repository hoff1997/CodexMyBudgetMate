import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await request.json();
  const allowedFields = [
    "target_amount",
    "annual_amount",
    "pay_cycle_amount",
    "frequency",
    "next_payment_due",
    "notes",
    "sort_order",
    "is_spending",
  ];

  const payload = Object.fromEntries(
    Object.entries(body).filter(([key]) => allowedFields.includes(key)),
  );

  payload.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from("envelopes")
    .update(payload)
    .eq("id", params.id)
    .eq("user_id", session.user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
