import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createErrorResponse, createUnauthorizedError, createValidationError } from "@/lib/utils/api-error";
import type { DebtItemInput, DebtItem } from "@/lib/types/debt";
import { calculateDebtSummary, sortBySnowball } from "@/lib/types/debt";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/envelopes/[id]/debt-items
 * Fetch all debt items for a debt envelope (ordered by snowball - smallest balance first)
 */
export async function GET(
  request: Request,
  { params }: RouteParams
) {
  const { id: envelopeId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const { data, error } = await supabase
    .from("debt_items")
    .select("*")
    .eq("envelope_id", envelopeId)
    .eq("user_id", user.id)
    .order("current_balance", { ascending: true });

  if (error) {
    console.error("[debt-items] GET error:", error);
    return createErrorResponse(error, 400, "Failed to fetch debt items");
  }

  // Apply snowball sorting (smallest balance first, paid off at end)
  const sortedItems = sortBySnowball(data || []);
  const summary = calculateDebtSummary(data || []);

  return NextResponse.json({
    items: sortedItems,
    summary,
  });
}

/**
 * PUT /api/envelopes/[id]/debt-items
 * Replace all debt items for a debt envelope
 * Also updates the envelope target_amount (sum of minimum payments)
 */
export async function PUT(
  request: Request,
  { params }: RouteParams
) {
  const { id: envelopeId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const body = await request.json();
  const items: DebtItemInput[] = body.items || [];

  // Verify envelope belongs to user and is a debt envelope
  const { data: envelope, error: envelopeError } = await supabase
    .from("envelopes")
    .select("id, name, is_debt")
    .eq("id", envelopeId)
    .eq("user_id", user.id)
    .single();

  if (envelopeError || !envelope) {
    return NextResponse.json({ error: "Envelope not found" }, { status: 404 });
  }

  // Delete existing items
  const { error: deleteError } = await supabase
    .from("debt_items")
    .delete()
    .eq("envelope_id", envelopeId)
    .eq("user_id", user.id);

  if (deleteError) {
    console.error("[debt-items] DELETE error:", deleteError);
    return createErrorResponse(deleteError, 400, "Failed to update debt items");
  }

  // Insert new items if any
  let insertedItems: DebtItem[] = [];
  if (items.length > 0) {
    const itemsToInsert = items.map((item, index) => ({
      user_id: user.id,
      envelope_id: envelopeId,
      name: item.name.trim(),
      debt_type: item.debt_type || 'other',
      linked_account_id: item.linked_account_id || null,
      starting_balance: Number(item.starting_balance) || 0,
      current_balance: Number(item.current_balance) || 0,
      interest_rate: item.interest_rate != null ? Number(item.interest_rate) : null,
      minimum_payment: item.minimum_payment != null ? Number(item.minimum_payment) : null,
      display_order: index,
    }));

    const { data: inserted, error: insertError } = await supabase
      .from("debt_items")
      .insert(itemsToInsert)
      .select();

    if (insertError) {
      console.error("[debt-items] INSERT error:", insertError);
      return createErrorResponse(insertError, 400, "Failed to save debt items");
    }

    insertedItems = (inserted || []) as DebtItem[];
  }

  // Calculate and update envelope target_amount (sum of minimum payments as monthly budget)
  const totalMinimumPayments = items.reduce(
    (sum, item) => sum + Number(item.minimum_payment || 0),
    0
  );

  const { error: updateError } = await supabase
    .from("envelopes")
    .update({
      target_amount: totalMinimumPayments,
      is_debt: true,
    })
    .eq("id", envelopeId)
    .eq("user_id", user.id);

  if (updateError) {
    console.error("[debt-items] Envelope update error:", updateError);
    // Non-fatal - items are saved
  }

  // Apply snowball sorting and calculate summary
  const sortedItems = sortBySnowball(insertedItems);
  const summary = calculateDebtSummary(insertedItems);

  return NextResponse.json({
    items: sortedItems,
    summary,
  });
}

/**
 * POST /api/envelopes/[id]/debt-items
 * Add a single debt item to a debt envelope
 */
export async function POST(
  request: Request,
  { params }: RouteParams
) {
  const { id: envelopeId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const body = await request.json();
  const item: DebtItemInput = body;

  if (!item.name?.trim()) {
    return createValidationError("Debt name is required");
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

  // Get current max display_order
  const { data: existingItems } = await supabase
    .from("debt_items")
    .select("display_order")
    .eq("envelope_id", envelopeId)
    .eq("user_id", user.id)
    .order("display_order", { ascending: false })
    .limit(1);

  const maxOrder = existingItems?.[0]?.display_order ?? -1;

  const { data, error } = await supabase
    .from("debt_items")
    .insert({
      user_id: user.id,
      envelope_id: envelopeId,
      name: item.name.trim(),
      debt_type: item.debt_type || 'other',
      linked_account_id: item.linked_account_id || null,
      starting_balance: Number(item.starting_balance) || 0,
      current_balance: Number(item.current_balance) || 0,
      interest_rate: item.interest_rate != null ? Number(item.interest_rate) : null,
      minimum_payment: item.minimum_payment != null ? Number(item.minimum_payment) : null,
      display_order: maxOrder + 1,
    })
    .select()
    .single();

  if (error) {
    console.error("[debt-items] POST error:", error);
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "A debt with this name already exists in this envelope" },
        { status: 409 }
      );
    }
    return createErrorResponse(error, 400, "Failed to add debt item");
  }

  // Update envelope target amount
  await updateEnvelopeTargetFromDebtItems(supabase, user.id, envelopeId);

  return NextResponse.json({ item: data }, { status: 201 });
}

/**
 * Helper: Update envelope target_amount based on sum of debt item minimum payments
 */
async function updateEnvelopeTargetFromDebtItems(
  supabase: any,
  userId: string,
  envelopeId: string
) {
  const { data: items } = await supabase
    .from("debt_items")
    .select("minimum_payment")
    .eq("envelope_id", envelopeId)
    .eq("user_id", userId);

  const totalMinimumPayments = (items || []).reduce(
    (sum: number, item: any) => sum + Number(item.minimum_payment || 0),
    0
  );

  await supabase
    .from("envelopes")
    .update({ target_amount: totalMinimumPayments })
    .eq("id", envelopeId)
    .eq("user_id", userId);
}
