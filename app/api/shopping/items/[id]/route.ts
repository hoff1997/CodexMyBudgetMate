import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { createErrorResponse, createUnauthorizedError } from "@/lib/utils/api-error";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Helper to verify item belongs to user's list
async function verifyItemOwnership(supabase: Awaited<ReturnType<typeof createClient>>, itemId: string, userId: string) {
  const { data: item } = await supabase
    .from("shopping_items")
    .select("id, shopping_list_id, shopping_lists!inner(parent_user_id)")
    .eq("id", itemId)
    .single();

  if (!item) return null;

  // Check if the list belongs to this user
  const listData = item.shopping_lists as unknown as { parent_user_id: string };
  if (listData.parent_user_id !== userId) return null;

  return item;
}

// GET /api/shopping/items/[id] - Fetch a single shopping item
export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const item = await verifyItemOwnership(supabase, id, user.id);

  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  // Fetch full item data
  const { data: fullItem, error } = await supabase
    .from("shopping_items")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !fullItem) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  // Return in client expected format
  return NextResponse.json({
    id: fullItem.id,
    list_id: fullItem.shopping_list_id,
    name: fullItem.text,
    quantity: fullItem.quantity ? parseInt(fullItem.quantity) || 1 : 1,
    unit: null,
    aisle: fullItem.aisle_name || null,
    category_id: fullItem.category_id || null,
    estimated_price: fullItem.estimated_price || null,
    price_unit: fullItem.price_unit || 'each',
    notes: fullItem.notes || null,
    checked: fullItem.is_checked,
    checked_at: null,
    sort_order: 0,
    photo_url: fullItem.photo_url || null,
  });
}

// PATCH /api/shopping/items/[id] - Update a shopping item
export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  // Verify ownership
  const ownershipCheck = await verifyItemOwnership(supabase, id, user.id);
  if (!ownershipCheck) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const body = await request.json();
  const { name, quantity, aisle, category_id, checked, photo_url, estimated_price, price_unit, notes } = body;

  // Build update object with only provided fields (mapped to DB columns)
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.text = name;
  if (quantity !== undefined) updates.quantity = quantity ? String(quantity) : null;
  if (aisle !== undefined) updates.aisle_name = aisle;
  if (category_id !== undefined) updates.category_id = category_id;
  if (checked !== undefined) updates.is_checked = checked;
  if (photo_url !== undefined) updates.photo_url = photo_url;
  if (estimated_price !== undefined) updates.estimated_price = estimated_price;
  if (price_unit !== undefined) updates.price_unit = price_unit;
  if (notes !== undefined) updates.notes = notes;

  const { data: item, error } = await supabase
    .from("shopping_items")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating shopping item:", error);
    return createErrorResponse(error, 500, "Failed to update shopping item");
  }

  // Return in client expected format
  return NextResponse.json({
    id: item.id,
    list_id: item.shopping_list_id,
    name: item.text,
    quantity: item.quantity ? parseInt(item.quantity) || 1 : 1,
    unit: null,
    aisle: item.aisle_name || null,
    category_id: item.category_id || null,
    estimated_price: item.estimated_price || null,
    price_unit: item.price_unit || 'each',
    notes: item.notes || null,
    checked: item.is_checked,
    checked_at: null,
    sort_order: 0,
    photo_url: item.photo_url || null,
  });
}

// DELETE /api/shopping/items/[id] - Delete a shopping item
export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  // Verify ownership
  const ownershipCheck = await verifyItemOwnership(supabase, id, user.id);
  if (!ownershipCheck) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const { error } = await supabase
    .from("shopping_items")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting shopping item:", error);
    return createErrorResponse(error, 500, "Failed to delete shopping item");
  }

  return NextResponse.json({ success: true });
}
