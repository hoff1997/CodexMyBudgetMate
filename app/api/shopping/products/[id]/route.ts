import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/shopping/products/[id] - Get a single product
export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: product, error } = await supabase
    .from("saved_products")
    .select(`
      *,
      category:shopping_categories(id, name, icon)
    `)
    .eq("id", id)
    .eq("parent_user_id", user.id)
    .single();

  if (error || !product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  return NextResponse.json(product);
}

// PATCH /api/shopping/products/[id] - Update a product
export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, category_id, default_quantity, typical_price, price_unit, photo_url, notes } = body;

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (name !== undefined) updates.name = name.trim();
  if (category_id !== undefined) updates.category_id = category_id;
  if (default_quantity !== undefined) updates.default_quantity = default_quantity;
  if (typical_price !== undefined) updates.typical_price = typical_price;
  if (price_unit !== undefined) updates.price_unit = price_unit;
  if (photo_url !== undefined) updates.photo_url = photo_url;
  if (notes !== undefined) updates.notes = notes;

  const { data: product, error } = await supabase
    .from("saved_products")
    .update(updates)
    .eq("id", id)
    .eq("parent_user_id", user.id)
    .select(`
      *,
      category:shopping_categories(id, name, icon)
    `)
    .single();

  if (error) {
    console.error("Error updating product:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(product);
}

// DELETE /api/shopping/products/[id] - Delete a product
export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("saved_products")
    .delete()
    .eq("id", id)
    .eq("parent_user_id", user.id);

  if (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
