import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST /api/shopping/lists/[id]/complete - Mark a shopping list as complete
export async function POST(request: Request, context: RouteContext) {
  const supabase = await createClient();
  const { id: listId } = await context.params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { actual_total, record_to_envelope } = body;

  // Verify the list belongs to the user
  const { data: list, error: listError } = await supabase
    .from("shopping_lists")
    .select(`
      id,
      name,
      linked_envelope_id,
      total_estimated,
      total_actual,
      is_completed
    `)
    .eq("id", listId)
    .eq("parent_user_id", user.id)
    .maybeSingle();

  if (listError || !list) {
    return NextResponse.json({ error: "Shopping list not found" }, { status: 404 });
  }

  if (list.is_completed) {
    return NextResponse.json({ error: "List is already completed" }, { status: 400 });
  }

  // Determine the amount to record
  const amountSpent = actual_total !== undefined
    ? parseFloat(actual_total)
    : (list.total_actual || list.total_estimated || 0);

  // Update the shopping list
  const { error: updateError } = await supabase
    .from("shopping_lists")
    .update({
      is_completed: true,
      completed_at: new Date().toISOString(),
      total_actual: amountSpent,
      updated_at: new Date().toISOString(),
    })
    .eq("id", listId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  // If recording to envelope
  let envelopeUpdate = null;
  if (record_to_envelope && list.linked_envelope_id && amountSpent > 0) {
    // Get the envelope
    const { data: envelope } = await supabase
      .from("envelopes")
      .select("id, name, current_balance")
      .eq("id", list.linked_envelope_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (envelope) {
      const newBalance = Number(envelope.current_balance) - amountSpent;

      const { error: envUpdateError } = await supabase
        .from("envelopes")
        .update({
          current_balance: newBalance,
          updated_at: new Date().toISOString(),
        })
        .eq("id", envelope.id);

      if (!envUpdateError) {
        envelopeUpdate = {
          envelope_id: envelope.id,
          envelope_name: envelope.name,
          previous_balance: Number(envelope.current_balance),
          new_balance: newBalance,
          amount_deducted: amountSpent,
        };
      }
    }
  }

  return NextResponse.json({
    success: true,
    list: {
      id: list.id,
      name: list.name,
      is_completed: true,
      total_spent: amountSpent,
    },
    envelope_update: envelopeUpdate,
  });
}

// DELETE /api/shopping/lists/[id]/complete - Reopen a completed shopping list
export async function DELETE(request: Request, context: RouteContext) {
  const supabase = await createClient();
  const { id: listId } = await context.params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify the list belongs to the user
  const { data: list, error: listError } = await supabase
    .from("shopping_lists")
    .select("id")
    .eq("id", listId)
    .eq("parent_user_id", user.id)
    .maybeSingle();

  if (listError || !list) {
    return NextResponse.json({ error: "Shopping list not found" }, { status: 404 });
  }

  // Reopen the list
  const { error: updateError } = await supabase
    .from("shopping_lists")
    .update({
      is_completed: false,
      completed_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", listId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
