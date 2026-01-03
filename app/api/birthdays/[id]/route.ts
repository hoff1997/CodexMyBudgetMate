import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/birthdays/[id]
 * Get a single birthday/gift recipient
 */
export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("gift_recipients")
    .select(
      `
      id,
      recipient_name,
      gift_amount,
      party_amount,
      celebration_date,
      notes,
      envelope_id,
      envelopes (
        id,
        name,
        icon
      )
    `
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}

/**
 * PUT /api/birthdays/[id]
 * Update a birthday/gift recipient
 */
export async function PUT(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await request.json();

  // Validate required fields
  if (!body.recipient_name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  // Verify ownership
  const { data: existing } = await supabase
    .from("gift_recipients")
    .select("id, envelope_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Update the recipient
  const { data, error } = await supabase
    .from("gift_recipients")
    .update({
      recipient_name: body.recipient_name.trim(),
      celebration_date: body.celebration_date || null,
      gift_amount: Number(body.gift_amount) || 0,
      party_amount: Number(body.party_amount) || 0,
      notes: body.notes?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    console.error("[birthdays] PUT error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Update envelope target amount (sum of all gift + party amounts)
  const { data: allRecipients } = await supabase
    .from("gift_recipients")
    .select("gift_amount, party_amount")
    .eq("envelope_id", existing.envelope_id)
    .eq("user_id", user.id);

  const totalAmount = (allRecipients || []).reduce(
    (sum, r) => sum + Number(r.gift_amount || 0) + Number((r as any).party_amount || 0),
    0
  );

  await supabase
    .from("envelopes")
    .update({ target_amount: totalAmount })
    .eq("id", existing.envelope_id)
    .eq("user_id", user.id);

  return NextResponse.json(data);
}

/**
 * DELETE /api/birthdays/[id]
 * Delete a birthday/gift recipient
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  // Get envelope_id before deleting
  const { data: existing } = await supabase
    .from("gift_recipients")
    .select("envelope_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Delete any reminders for this recipient
  await supabase
    .from("celebration_reminders")
    .delete()
    .eq("gift_recipient_id", id)
    .eq("user_id", user.id);

  // Delete the recipient
  const { error } = await supabase
    .from("gift_recipients")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("[birthdays] DELETE error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Update envelope target amount (sum of all gift + party amounts)
  const { data: remainingRecipients } = await supabase
    .from("gift_recipients")
    .select("gift_amount, party_amount")
    .eq("envelope_id", existing.envelope_id)
    .eq("user_id", user.id);

  const totalAmount = (remainingRecipients || []).reduce(
    (sum, r) => sum + Number(r.gift_amount || 0) + Number((r as any).party_amount || 0),
    0
  );

  await supabase
    .from("envelopes")
    .update({ target_amount: totalAmount })
    .eq("id", existing.envelope_id)
    .eq("user_id", user.id);

  return NextResponse.json({ success: true });
}
