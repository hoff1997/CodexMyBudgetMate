import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST /api/shopping/lists/[id]/link-envelope - Link a shopping list to a budget envelope
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
  const { envelope_id } = body;

  if (!envelope_id) {
    return NextResponse.json({ error: "envelope_id required" }, { status: 400 });
  }

  // Verify the list belongs to the user
  const { data: list, error: listError } = await supabase
    .from("shopping_lists")
    .select("id, name")
    .eq("id", listId)
    .eq("parent_user_id", user.id)
    .maybeSingle();

  if (listError || !list) {
    return NextResponse.json({ error: "Shopping list not found" }, { status: 404 });
  }

  // Verify the envelope belongs to the user
  const { data: envelope, error: envError } = await supabase
    .from("envelopes")
    .select("id, name")
    .eq("id", envelope_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (envError || !envelope) {
    return NextResponse.json({ error: "Envelope not found" }, { status: 404 });
  }

  // Update the shopping list with the linked envelope
  const { error: updateError } = await supabase
    .from("shopping_lists")
    .update({
      linked_envelope_id: envelope_id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", listId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    list: { id: list.id, name: list.name },
    envelope: { id: envelope.id, name: envelope.name },
  });
}

// DELETE /api/shopping/lists/[id]/link-envelope - Unlink a shopping list from its envelope
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

  // Remove the envelope link
  const { error: updateError } = await supabase
    .from("shopping_lists")
    .update({
      linked_envelope_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", listId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
