import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/recipes/categories
 * Fetch all categories for authenticated user
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data: categories, error } = await supabase
      .from("recipe_categories")
      .select("*")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ categories: categories || [] });
  } catch (error) {
    console.error("Fetch categories error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/recipes/categories
 * Create a new category
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, color, slug } = body;

    // Validation
    if (!name || !color) {
      return NextResponse.json(
        { error: "Name and color are required" },
        { status: 400 }
      );
    }

    // Auto-generate slug if not provided
    const categorySlug =
      slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");

    // Check for duplicate slug
    const { data: existing } = await supabase
      .from("recipe_categories")
      .select("id")
      .eq("user_id", user.id)
      .eq("slug", categorySlug)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "A category with this name already exists" },
        { status: 409 }
      );
    }

    // Get next sort_order
    const { data: maxOrder } = await supabase
      .from("recipe_categories")
      .select("sort_order")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextOrder = (maxOrder?.sort_order || 0) + 1;

    // Create category
    const { data: category, error } = await supabase
      .from("recipe_categories")
      .insert({
        user_id: user.id,
        name,
        slug: categorySlug,
        color,
        sort_order: nextOrder,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    console.error("Create category error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create category" },
      { status: 500 }
    );
  }
}
