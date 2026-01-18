import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { createErrorResponse, createUnauthorizedError, createValidationError } from "@/lib/utils/api-error";

// GET /api/shopping/products - Search/list saved products
export async function GET(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const categoryId = searchParams.get("category");
  const limit = parseInt(searchParams.get("limit") || "20");

  let query = supabase
    .from("saved_products")
    .select(`
      *,
      category:shopping_categories(id, name, icon)
    `)
    .eq("parent_user_id", user.id)
    .order("name", { ascending: true })
    .limit(limit);

  if (search) {
    query = query.ilike("name", `%${search}%`);
  }

  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }

  const { data: products, error } = await query;

  if (error) {
    console.error("Error fetching saved products:", error);
    return createErrorResponse(error, 500, "Failed to fetch saved products");
  }

  return NextResponse.json(products || []);
}

// POST /api/shopping/products - Create or update a saved product
export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const body = await request.json();
  const { name, category_id, default_quantity, typical_price, price_unit, photo_url, notes } = body;

  if (!name) {
    return createValidationError("Name is required");
  }

  // Upsert - insert or update if name already exists
  const { data: product, error } = await supabase
    .from("saved_products")
    .upsert({
      parent_user_id: user.id,
      name: name.trim(),
      category_id: category_id || null,
      default_quantity: default_quantity || null,
      typical_price: typical_price || null,
      price_unit: price_unit || null,
      photo_url: photo_url || null,
      notes: notes || null,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: "parent_user_id,name",
    })
    .select(`
      *,
      category:shopping_categories(id, name, icon)
    `)
    .single();

  if (error) {
    console.error("Error saving product:", error);
    return createErrorResponse(error, 500, "Failed to save product");
  }

  return NextResponse.json(product, { status: 201 });
}
