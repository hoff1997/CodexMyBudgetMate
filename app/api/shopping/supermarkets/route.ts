import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { createErrorResponse, createUnauthorizedError, createValidationError } from "@/lib/utils/api-error";

// GET /api/shopping/supermarkets - Fetch all user's supermarkets with their category orders
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  // Get supermarkets with their category orders
  const { data: supermarkets, error } = await supabase
    .from("supermarkets")
    .select(`
      *,
      category_orders:supermarket_category_orders(
        category_id,
        sort_order,
        category:shopping_categories(id, name, icon)
      )
    `)
    .eq("parent_user_id", user.id)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching supermarkets:", error);
    return createErrorResponse(error, 500, "Failed to fetch supermarkets");
  }

  // Map to client format
  const mapped = (supermarkets || []).map((s) => {
    const categoryOrders = s.category_orders || [];
    // Sort by sort_order and extract categories
    const sortedCategories = categoryOrders
      .sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)
      .map((co: { category: { id: string; name: string; icon: string } }) => co.category)
      .filter(Boolean);

    return {
      id: s.id,
      name: s.name,
      categories: sortedCategories,
      // Legacy support - keep aisle_structure if it exists
      aisle_structure: s.aisle_structure,
    };
  });

  return NextResponse.json(mapped);
}

// POST /api/shopping/supermarkets - Create a new supermarket
export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const body = await request.json();
  const { name, category_order } = body;

  if (!name) {
    return createValidationError("Name is required");
  }

  // Create supermarket with empty aisle_structure (will use category orders instead)
  const { data: supermarket, error } = await supabase
    .from("supermarkets")
    .insert({
      parent_user_id: user.id,
      name: name.trim(),
      aisle_structure: [], // Empty - we use category_orders table now
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating supermarket:", error);
    return createErrorResponse(error, 500, "Failed to create supermarket");
  }

  // If category_order provided, insert the ordering
  if (category_order && Array.isArray(category_order)) {
    const orderInserts = category_order.map((categoryId: string, index: number) => ({
      supermarket_id: supermarket.id,
      category_id: categoryId,
      sort_order: index + 1,
    }));

    const { error: orderError } = await supabase
      .from("supermarket_category_orders")
      .insert(orderInserts);

    if (orderError) {
      console.error("Error saving category order:", orderError);
      // Don't fail - supermarket was created
    }
  }

  return NextResponse.json({
    id: supermarket.id,
    name: supermarket.name,
    categories: [],
    aisle_structure: [],
  }, { status: 201 });
}
