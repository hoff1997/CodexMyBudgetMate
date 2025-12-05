import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  console.log('🟢 [API /envelopes/[id]] PATCH request received for ID:', params.id);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.log('🔴 [API /envelopes/[id]] Unauthorized - no user');
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  console.log('🟢 [API /envelopes/[id]] User authenticated:', user.email);
  const body = await request.json();
  console.log('🟢 [API /envelopes/[id]] Request body:', body);
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
    "is_goal",
    "is_tracking_only",
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

  // Sync is_tracking_only flag when subtype changes
  if ("subtype" in payload) {
    payload.is_tracking_only = payload.subtype === "tracking";
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

  // Auto-unlock allocations if bill details change
  // Check if critical fields that affect ideal allocation are being changed
  const criticalFieldsChanged =
    "target_amount" in payload ||
    "frequency" in payload ||
    "due_date" in payload;

  if (criticalFieldsChanged) {
    console.log('🟡 [API /envelopes/[id]] Critical fields changed, unlocking allocations for envelope:', params.id);

    // Unlock all allocations for this envelope
    const { error: unlockError } = await supabase
      .from("envelope_income_allocations")
      .update({
        allocation_locked: false,
        locked_at: null,
      })
      .eq("envelope_id", params.id)
      .eq("user_id", user.id)
      .eq("allocation_locked", true); // Only update if currently locked

    if (unlockError) {
      console.log('🔴 [API /envelopes/[id]] Failed to unlock allocations:', unlockError);
      // Continue anyway - envelope update is more important
    } else {
      console.log('🟢 [API /envelopes/[id]] Successfully unlocked allocations');
    }
  }

  console.log('🟢 [API /envelopes/[id]] Final payload to database:', payload);
  const { data, error } = await supabase
    .from("envelopes")
    .update(payload)
    .eq("id", params.id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.log('🔴 [API /envelopes/[id]] Database error:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  console.log('🟢 [API /envelopes/[id]] Successfully updated envelope:', data);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  console.log('🟢 [API /envelopes/[id]] DELETE request received for ID:', params.id);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.log('🔴 [API /envelopes/[id]] Unauthorized - no user');
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  console.log('🟢 [API /envelopes/[id]] User authenticated:', user.email);

  const { error } = await supabase
    .from("envelopes")
    .delete()
    .eq("id", params.id)
    .eq("user_id", user.id);

  if (error) {
    console.log('🔴 [API /envelopes/[id]] Database error:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  console.log('🟢 [API /envelopes/[id]] Successfully deleted envelope');
  return NextResponse.json({ ok: true });
}

