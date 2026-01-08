import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: { id: string };
}

/**
 * GET /api/recipes/[id]/categories
 * Get all category IDs for a recipe
 */
export async function GET(request: Request, { params }: RouteParams) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: recipeId } = params;

  try {
    // Verify recipe belongs to user
    const { data: recipe, error: recipeError } = await supabase
      .from("recipes")
      .select("id")
      .eq("id", recipeId)
      .eq("parent_user_id", user.id)
      .maybeSingle();

    if (recipeError || !recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    // Get category IDs for this recipe
    const { data: tags, error } = await supabase
      .from("recipe_category_tags")
      .select("category_id")
      .eq("recipe_id", recipeId);

    if (error) throw error;

    const categoryIds = tags?.map((t) => t.category_id) || [];

    return NextResponse.json({ categoryIds });
  } catch (error) {
    console.error("Get recipe categories error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get categories" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/recipes/[id]/categories
 * Replace all categories for a recipe
 */
export async function PUT(request: Request, { params }: RouteParams) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: recipeId } = params;

  try {
    const body = await request.json();
    const { categoryIds } = body as { categoryIds: string[] };

    if (!Array.isArray(categoryIds)) {
      return NextResponse.json(
        { error: "categoryIds must be an array" },
        { status: 400 }
      );
    }

    // Verify recipe belongs to user
    const { data: recipe, error: recipeError } = await supabase
      .from("recipes")
      .select("id")
      .eq("id", recipeId)
      .eq("parent_user_id", user.id)
      .maybeSingle();

    if (recipeError || !recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    // Verify all categories belong to user
    if (categoryIds.length > 0) {
      const { data: validCategories, error: catError } = await supabase
        .from("recipe_categories")
        .select("id")
        .eq("user_id", user.id)
        .in("id", categoryIds);

      if (catError) throw catError;

      if (validCategories?.length !== categoryIds.length) {
        return NextResponse.json(
          { error: "One or more categories not found" },
          { status: 400 }
        );
      }
    }

    // Delete existing category tags for this recipe
    const { error: deleteError } = await supabase
      .from("recipe_category_tags")
      .delete()
      .eq("recipe_id", recipeId);

    if (deleteError) throw deleteError;

    // Insert new category tags
    if (categoryIds.length > 0) {
      const insertData = categoryIds.map((categoryId) => ({
        recipe_id: recipeId,
        category_id: categoryId,
      }));

      const { error: insertError } = await supabase
        .from("recipe_category_tags")
        .insert(insertData);

      if (insertError) throw insertError;
    }

    return NextResponse.json({ success: true, categoryIds });
  } catch (error) {
    console.error("Update recipe categories error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update categories" },
      { status: 500 }
    );
  }
}
