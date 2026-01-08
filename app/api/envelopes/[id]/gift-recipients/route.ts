import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { GiftRecipientInput } from "@/lib/types/celebrations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/envelopes/[id]/gift-recipients
 * Fetch all gift recipients for a celebration envelope
 */
export async function GET(
  request: Request,
  { params }: RouteParams
) {
  const { id: envelopeId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("gift_recipients")
    .select("*")
    .eq("envelope_id", envelopeId)
    .eq("user_id", user.id)
    .order("recipient_name");

  if (error) {
    console.error("[gift-recipients] GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const totalBudget = (data || []).reduce(
    (sum, r) => sum + Number(r.gift_amount || 0) + Number(r.party_amount || 0),
    0
  );

  return NextResponse.json({
    recipients: data || [],
    total_budget: totalBudget,
  });
}

/**
 * PUT /api/envelopes/[id]/gift-recipients
 * Replace all gift recipients for a celebration envelope
 * Also updates the envelope target_amount and generates reminders
 */
export async function PUT(
  request: Request,
  { params }: RouteParams
) {
  const { id: envelopeId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await request.json();
  const recipients: GiftRecipientInput[] = body.recipients || [];

  // Verify envelope belongs to user and is a celebration envelope
  const { data: envelope, error: envelopeError } = await supabase
    .from("envelopes")
    .select("id, name, is_celebration")
    .eq("id", envelopeId)
    .eq("user_id", user.id)
    .single();

  if (envelopeError || !envelope) {
    return NextResponse.json({ error: "Envelope not found" }, { status: 404 });
  }

  // Delete existing recipients
  const { error: deleteError } = await supabase
    .from("gift_recipients")
    .delete()
    .eq("envelope_id", envelopeId)
    .eq("user_id", user.id);

  if (deleteError) {
    console.error("[gift-recipients] DELETE error:", deleteError);
    return NextResponse.json({ error: deleteError.message }, { status: 400 });
  }

  // Insert new recipients if any
  let insertedRecipients: any[] = [];
  if (recipients.length > 0) {
    const recipientsToInsert = recipients.map((r) => ({
      user_id: user.id,
      envelope_id: envelopeId,
      recipient_name: r.recipient_name.trim(),
      gift_amount: Number(r.gift_amount) || 0,
      party_amount: Number(r.party_amount) || 0,
      celebration_date: r.celebration_date
        ? new Date(r.celebration_date).toISOString().split("T")[0]
        : null,
      notes: r.notes?.trim() || null,
      needs_gift: r.needs_gift ?? true, // Default to true - they're budgeting for gifts
    }));

    const { data: inserted, error: insertError } = await supabase
      .from("gift_recipients")
      .insert(recipientsToInsert)
      .select();

    if (insertError) {
      console.error("[gift-recipients] INSERT error:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    insertedRecipients = inserted || [];
  }

  // Calculate and update envelope target_amount (gift + party amounts)
  const totalAmount = recipients.reduce(
    (sum, r) => sum + Number(r.gift_amount || 0) + Number(r.party_amount || 0),
    0
  );

  const { error: updateError } = await supabase
    .from("envelopes")
    .update({
      target_amount: totalAmount,
      is_celebration: true,
    })
    .eq("id", envelopeId)
    .eq("user_id", user.id);

  if (updateError) {
    console.error("[gift-recipients] Envelope update error:", updateError);
    // Non-fatal - recipients are saved
  }

  // Generate reminders for recipients with dates
  await generateRemindersForEnvelope(supabase, user.id, envelopeId, insertedRecipients);

  return NextResponse.json({
    recipients: insertedRecipients,
    total_budget: totalAmount,
  });
}

/**
 * POST /api/envelopes/[id]/gift-recipients
 * Add a single gift recipient to a celebration envelope
 */
export async function POST(
  request: Request,
  { params }: RouteParams
) {
  const { id: envelopeId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await request.json();
  const recipient: GiftRecipientInput = body;

  if (!recipient.recipient_name?.trim()) {
    return NextResponse.json({ error: "Recipient name is required" }, { status: 400 });
  }

  // Verify envelope belongs to user
  const { data: envelope } = await supabase
    .from("envelopes")
    .select("id")
    .eq("id", envelopeId)
    .eq("user_id", user.id)
    .single();

  if (!envelope) {
    return NextResponse.json({ error: "Envelope not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("gift_recipients")
    .insert({
      user_id: user.id,
      envelope_id: envelopeId,
      recipient_name: recipient.recipient_name.trim(),
      gift_amount: Number(recipient.gift_amount) || 0,
      party_amount: Number(recipient.party_amount) || 0,
      celebration_date: recipient.celebration_date
        ? new Date(recipient.celebration_date).toISOString().split("T")[0]
        : null,
      notes: recipient.notes?.trim() || null,
      needs_gift: recipient.needs_gift ?? true, // Default to true - they're budgeting for gifts
    })
    .select()
    .single();

  if (error) {
    console.error("[gift-recipients] POST error:", error);
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "A recipient with this name already exists in this envelope" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Update envelope target amount
  await updateEnvelopeTargetFromRecipients(supabase, user.id, envelopeId);

  // Generate reminder if recipient has a date
  if (data.celebration_date) {
    await generateRemindersForEnvelope(supabase, user.id, envelopeId, [data]);
  }

  return NextResponse.json({ recipient: data }, { status: 201 });
}

/**
 * Helper: Update envelope target_amount based on sum of gift recipients (gift + party amounts)
 */
async function updateEnvelopeTargetFromRecipients(
  supabase: any,
  userId: string,
  envelopeId: string
) {
  const { data: recipients } = await supabase
    .from("gift_recipients")
    .select("gift_amount, party_amount")
    .eq("envelope_id", envelopeId)
    .eq("user_id", userId);

  const totalAmount = (recipients || []).reduce(
    (sum: number, r: any) => sum + Number(r.gift_amount || 0) + Number(r.party_amount || 0),
    0
  );

  await supabase
    .from("envelopes")
    .update({ target_amount: totalAmount })
    .eq("id", envelopeId)
    .eq("user_id", userId);
}

/**
 * Helper: Generate reminders for gift recipients with celebration dates
 */
async function generateRemindersForEnvelope(
  supabase: any,
  userId: string,
  envelopeId: string,
  recipients: any[]
) {
  // Get user's reminder preference
  const { data: profile } = await supabase
    .from("profiles")
    .select("celebration_reminder_weeks")
    .eq("id", userId)
    .single();

  const reminderWeeks = profile?.celebration_reminder_weeks ?? 3;
  if (reminderWeeks === 0) return; // Reminders disabled

  // Delete existing reminders for this envelope's recipients
  const recipientIds = recipients.map((r) => r.id).filter(Boolean);
  if (recipientIds.length > 0) {
    await supabase
      .from("celebration_reminders")
      .delete()
      .eq("user_id", userId)
      .in("gift_recipient_id", recipientIds);
  }

  // Create new reminders for recipients with dates
  const now = new Date();
  const remindersToInsert = recipients
    .filter((r) => r.celebration_date)
    .map((r) => {
      const celebrationDate = new Date(r.celebration_date);
      // Set to this year or next year
      celebrationDate.setFullYear(now.getFullYear());
      if (celebrationDate < now) {
        celebrationDate.setFullYear(now.getFullYear() + 1);
      }

      const reminderDate = new Date(celebrationDate);
      reminderDate.setDate(reminderDate.getDate() - reminderWeeks * 7);

      return {
        user_id: userId,
        gift_recipient_id: r.id,
        envelope_id: envelopeId,
        reminder_date: reminderDate.toISOString().split("T")[0],
        celebration_date: celebrationDate.toISOString().split("T")[0],
        recipient_name: r.recipient_name,
        gift_amount: r.gift_amount,
      };
    });

  if (remindersToInsert.length > 0) {
    await supabase.from("celebration_reminders").upsert(remindersToInsert, {
      onConflict: "gift_recipient_id,celebration_date",
    });
  }
}
