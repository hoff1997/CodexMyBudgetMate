import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/recipes/categories/[id]
 * Get a single category with its recipes
 */
export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get category
    const { data: category, error: categoryError } = await supabase
      .from("recipe_categories")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (categoryError || !category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    // Get recipes in this category
    const { data: tags } = await supabase
      .from("recipe_category_tags")
      .select("recipe_id")
      .eq("category_id", id);

    const recipeIds = tags?.map((t) => t.recipe_id) || [];

    let recipes: unknown[] = [];
    if (recipeIds.length > 0) {
      const { data: recipeData } = await supabase
        .from("recipes")
        .select("*")
        .in("id", recipeIds)
        .order("title", { ascending: true });
      recipes = recipeData || [];
    }

    return NextResponse.json({ category, recipes });
  } catch (error) {
    console.error("Fetch category error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch category" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/recipes/categories/[id]
 * Update a category
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, color } = body;

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updates.name = name;
    if (color !== undefined) updates.color = color;

    const { data: category, error } = await supabase
      .from("recipe_categories")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ category });
  } catch (error) {
    console.error("Update category error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update category" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/recipes/categories/[id]
 * Delete a category
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if category has recipes
    const { data: tags } = await supabase
      .from("recipe_category_tags")
      .select("id")
      .eq("category_id", id)
      .limit(1);

    if (tags && tags.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete category with recipes. Remove recipes first." },
        { status: 400 }
      );
    }

    // Delete category
    const { error } = await supabase
      .from("recipe_categories")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete category error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete category" },
      { status: 500 }
    );
  }
}
