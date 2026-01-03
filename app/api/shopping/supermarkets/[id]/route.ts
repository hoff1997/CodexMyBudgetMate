import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/shopping/supermarkets/[id] - Get a single supermarket with category order
export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: supermarket, error } = await supabase
    .from("supermarkets")
    .select(`
      *,
      category_orders:supermarket_category_orders(
        category_id,
        sort_order,
        category:shopping_categories(id, name, icon)
      )
    `)
    .eq("id", id)
    .eq("parent_user_id", user.id)
    .single();

  if (error || !supermarket) {
    return NextResponse.json({ error: "Supermarket not found" }, { status: 404 });
  }

  const categoryOrders = supermarket.category_orders || [];
  const sortedCategories = categoryOrders
    .sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)
    .map((co: { category: { id: string; name: string; icon: string } }) => co.category)
    .filter(Boolean);

  return NextResponse.json({
    id: supermarket.id,
    name: supermarket.name,
    categories: sortedCategories,
    aisle_structure: supermarket.aisle_structure, // Legacy support
  });
}

// PATCH /api/shopping/supermarkets/[id] - Update a supermarket (name and/or category order)
export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify ownership
  const { data: existing } = await supabase
    .from("supermarkets")
    .select("id")
    .eq("id", id)
    .eq("parent_user_id", user.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Supermarket not found" }, { status: 404 });
  }

  const body = await request.json();
  const { name, category_order } = body;

  // Update name if provided
  if (name !== undefined) {
    const { error } = await supabase
      .from("supermarkets")
      .update({ name: name.trim() })
      .eq("id", id);

    if (error) {
      console.error("Error updating supermarket name:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // Update category order if provided
  if (category_order && Array.isArray(category_order)) {
    // Delete existing orders
    await supabase
      .from("supermarket_category_orders")
      .delete()
      .eq("supermarket_id", id);

    // Insert new orders
    if (category_order.length > 0) {
      const orderInserts = category_order.map((categoryId: string, index: number) => ({
        supermarket_id: id,
        category_id: categoryId,
        sort_order: index + 1,
      }));

      const { error: orderError } = await supabase
        .from("supermarket_category_orders")
        .insert(orderInserts);

      if (orderError) {
        console.error("Error saving category order:", orderError);
        return NextResponse.json({ error: orderError.message }, { status: 500 });
      }
    }
  }

  // Fetch updated supermarket
  const { data: supermarket, error } = await supabase
    .from("supermarkets")
    .select(`
      *,
      category_orders:supermarket_category_orders(
        category_id,
        sort_order,
        category:shopping_categories(id, name, icon)
      )
    `)
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching updated supermarket:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const categoryOrders = supermarket.category_orders || [];
  const sortedCategories = categoryOrders
    .sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)
    .map((co: { category: { id: string; name: string; icon: string } }) => co.category)
    .filter(Boolean);

  return NextResponse.json({
    id: supermarket.id,
    name: supermarket.name,
    categories: sortedCategories,
    aisle_structure: supermarket.aisle_structure,
  });
}

// DELETE /api/shopping/supermarkets/[id] - Delete a supermarket
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
    .from("supermarkets")
    .delete()
    .eq("id", id)
    .eq("parent_user_id", user.id);

  if (error) {
    console.error("Error deleting supermarket:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
