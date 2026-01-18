import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createErrorResponse, createUnauthorizedError, createValidationError } from "@/lib/utils/api-error";

/**
 * GET /api/birthdays
 * Get all birthdays for the current user
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const { data: recipients, error } = await supabase
    .from("gift_recipients")
    .select(`
      id,
      recipient_name,
      gift_amount,
      party_amount,
      celebration_date,
      notes,
      needs_gift,
      envelope_id,
      envelopes (
        id,
        name,
        icon
      )
    `)
    .eq("user_id", user.id)
    .not("celebration_date", "is", null)
    .order("celebration_date", { ascending: true });

  if (error) {
    console.error("[birthdays] GET error:", error);
    return createErrorResponse(error, 400, "Failed to fetch birthdays");
  }

  return NextResponse.json(recipients || []);
}

/**
 * POST /api/birthdays
 * Add a new birthday - optionally creates a Birthdays envelope if one doesn't exist
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const body = await request.json();

  const {
    recipient_name,
    celebration_date,
    gift_amount = 0,
    party_amount = 0,
    notes = null,
    needs_gift = true,
    create_envelope = false,
  } = body;

  // Validate required fields
  if (!recipient_name?.trim()) {
    return createValidationError("Name is required");
  }

  if (!celebration_date) {
    return createValidationError("Date is required");
  }

  // Find or create a Birthdays envelope
  let envelopeId: string | null = null;

  // First, try to find an existing Birthdays envelope
  const { data: existingEnvelope } = await supabase
    .from("envelopes")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_celebration", true)
    .ilike("name", "%birthday%")
    .limit(1)
    .maybeSingle();

  if (existingEnvelope) {
    envelopeId = existingEnvelope.id;
  } else if (create_envelope || needs_gift) {
    // Create a Birthdays envelope if user wants to budget or it's a gift birthday

    // Get or create Celebrations category
    let categoryId: string | null = null;
    const { data: celebrationsCategory } = await supabase
      .from("envelope_categories")
      .select("id")
      .eq("user_id", user.id)
      .eq("name", "Celebrations")
      .maybeSingle();

    if (celebrationsCategory) {
      categoryId = celebrationsCategory.id;
    } else {
      // Create Celebrations category
      const { data: newCategory } = await supabase
        .from("envelope_categories")
        .insert({
          user_id: user.id,
          name: "Celebrations",
          icon: "🎉",
          is_system: false,
          display_order: 99,
        })
        .select("id")
        .single();

      categoryId = newCategory?.id || null;
    }

    // Create Birthdays envelope
    const { data: newEnvelope, error: envelopeError } = await supabase
      .from("envelopes")
      .insert({
        user_id: user.id,
        name: "Birthdays",
        icon: "🎂",
        subtype: "savings",
        is_celebration: true,
        category_id: categoryId,
        target_amount: needs_gift ? (Number(gift_amount) + Number(party_amount)) : 0,
        current_balance: 0,
        priority: "important",
      })
      .select("id")
      .single();

    if (envelopeError) {
      console.error("[birthdays] Failed to create envelope:", envelopeError);
      return NextResponse.json(
        { error: "Failed to create birthday envelope" },
        { status: 400 }
      );
    }

    envelopeId = newEnvelope.id;
  }

  // If we still don't have an envelope (shouldn't happen), create a generic one
  if (!envelopeId) {
    // This shouldn't happen but safety check
    const { data: anyEnvelope } = await supabase
      .from("envelopes")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_celebration", true)
      .limit(1)
      .maybeSingle();

    if (!anyEnvelope) {
      // Create minimal envelope
      const { data: fallback } = await supabase
        .from("envelopes")
        .insert({
          user_id: user.id,
          name: "Birthdays",
          icon: "🎂",
          subtype: "tracking",
          is_celebration: true,
          target_amount: 0,
          current_balance: 0,
        })
        .select("id")
        .single();

      envelopeId = fallback?.id || null;
    } else {
      envelopeId = anyEnvelope.id;
    }
  }

  if (!envelopeId) {
    return NextResponse.json(
      { error: "Failed to find or create envelope" },
      { status: 500 }
    );
  }

  // Create the birthday recipient
  const { data: recipient, error: recipientError } = await supabase
    .from("gift_recipients")
    .insert({
      user_id: user.id,
      envelope_id: envelopeId,
      recipient_name: recipient_name.trim(),
      celebration_date,
      gift_amount: needs_gift ? Number(gift_amount) : 0,
      party_amount: needs_gift ? Number(party_amount) : 0,
      notes: notes?.trim() || null,
      needs_gift,
    })
    .select(`
      id,
      recipient_name,
      gift_amount,
      party_amount,
      celebration_date,
      notes,
      needs_gift,
      envelope_id,
      envelopes (
        id,
        name,
        icon
      )
    `)
    .single();

  if (recipientError) {
    console.error("[birthdays] Failed to create recipient:", recipientError);
    return createErrorResponse(recipientError, 400, "Failed to create birthday");
  }

  // Update envelope target amount to sum of all recipients
  if (needs_gift) {
    const { data: allRecipients } = await supabase
      .from("gift_recipients")
      .select("gift_amount, party_amount")
      .eq("envelope_id", envelopeId)
      .eq("user_id", user.id);

    const totalAmount = (allRecipients || []).reduce(
      (sum, r) => sum + Number(r.gift_amount || 0) + Number(r.party_amount || 0),
      0
    );

    await supabase
      .from("envelopes")
      .update({ target_amount: totalAmount })
      .eq("id", envelopeId)
      .eq("user_id", user.id);
  }

  return NextResponse.json({
    birthday: recipient,
    envelope_created: !existingEnvelope && (create_envelope || needs_gift),
  });
}
