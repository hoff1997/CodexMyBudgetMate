import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { createErrorResponse, createUnauthorizedError, createValidationError } from "@/lib/utils/api-error";

// GET /api/shopping/categories - List all user's shopping categories
export async function GET(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const { searchParams } = new URL(request.url);
  const supermarketId = searchParams.get("supermarket");

  // Get user's categories
  const { data: categories, error } = await supabase
    .from("shopping_categories")
    .select("*")
    .eq("parent_user_id", user.id)
    .order("default_sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching shopping categories:", error);
    return createErrorResponse(error, 500, "Failed to fetch shopping categories");
  }

  // If supermarket specified, get the custom ordering
  if (supermarketId) {
    const { data: orders } = await supabase
      .from("supermarket_category_orders")
      .select("category_id, sort_order")
      .eq("supermarket_id", supermarketId);

    if (orders && orders.length > 0) {
      const orderMap = new Map(orders.map((o) => [o.category_id, o.sort_order]));

      // Sort by supermarket order, falling back to default order
      categories?.sort((a, b) => {
        const aOrder = orderMap.get(a.id) ?? a.default_sort_order;
        const bOrder = orderMap.get(b.id) ?? b.default_sort_order;
        return aOrder - bOrder;
      });
    }
  }

  return NextResponse.json(categories || []);
}

// POST /api/shopping/categories - Create a new category
export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const body = await request.json();
  const { name, icon, default_sort_order } = body;

  if (!name) {
    return createValidationError("Name is required");
  }

  // Get highest sort order if not specified
  let sortOrder = default_sort_order;
  if (sortOrder === undefined) {
    const { data: existing } = await supabase
      .from("shopping_categories")
      .select("default_sort_order")
      .eq("parent_user_id", user.id)
      .order("default_sort_order", { ascending: false })
      .limit(1);

    sortOrder = (existing?.[0]?.default_sort_order || 0) + 1;
  }

  const { data: category, error } = await supabase
    .from("shopping_categories")
    .insert({
      parent_user_id: user.id,
      name: name.trim(),
      icon: icon || null,
      default_sort_order: sortOrder,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating shopping category:", error);
    return createErrorResponse(error, 500, "Failed to create shopping category");
  }

  return NextResponse.json(category, { status: 201 });
}
