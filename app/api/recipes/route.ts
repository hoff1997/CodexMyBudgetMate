import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");
  const tags = searchParams.get("tags")?.split(",").filter(Boolean);
  const is_favorite = searchParams.get("is_favorite") === "true";

  let query = supabase
    .from("recipes")
    .select("*")
    .eq("parent_user_id", user.id)
    .order("created_at", { ascending: false });

  if (search) {
    query = query.or(`title.ilike.%${search}%,instructions.ilike.%${search}%`);
  }

  if (is_favorite) {
    query = query.eq("is_favorite", true);
  }

  if (tags && tags.length > 0) {
    query = query.contains("tags", tags);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Get category mappings for all recipes
  const recipeIds = data?.map((r) => r.id) || [];
  let recipeCategoryMap: Record<string, string[]> = {};

  if (recipeIds.length > 0) {
    const { data: categoryTags } = await supabase
      .from("recipe_category_tags")
      .select("recipe_id, category_id")
      .in("recipe_id", recipeIds);

    if (categoryTags) {
      categoryTags.forEach((tag) => {
        if (!recipeCategoryMap[tag.recipe_id]) {
          recipeCategoryMap[tag.recipe_id] = [];
        }
        recipeCategoryMap[tag.recipe_id].push(tag.category_id);
      });
    }
  }

  // Add category_ids to each recipe
  const recipesWithCategories = data?.map((recipe) => ({
    ...recipe,
    category_ids: recipeCategoryMap[recipe.id] || [],
  }));

  return NextResponse.json({ recipes: recipesWithCategories });
}

// Helper to parse time strings like "15 min", "30 minutes", "1 hour" to minutes
function parseTimeToMinutes(timeStr: string | number | undefined | null): number | null {
  if (timeStr === undefined || timeStr === null) return null;
  if (typeof timeStr === "number") return timeStr;

  const str = timeStr.toString().toLowerCase().trim();
  if (!str) return null;

  // Try to extract numbers
  const hourMatch = str.match(/(\d+)\s*(h|hour)/);
  const minMatch = str.match(/(\d+)\s*(m|min)/);

  let minutes = 0;
  if (hourMatch) {
    minutes += parseInt(hourMatch[1], 10) * 60;
  }
  if (minMatch) {
    minutes += parseInt(minMatch[1], 10);
  }

  // If no match but has a number, assume minutes
  if (minutes === 0) {
    const numMatch = str.match(/(\d+)/);
    if (numMatch) {
      minutes = parseInt(numMatch[1], 10);
    }
  }

  return minutes > 0 ? minutes : null;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  // Handle prep_time and cook_time - convert strings to minutes if needed
  const prepTimeMinutes = body.prep_time_minutes ?? parseTimeToMinutes(body.prep_time);
  const cookTimeMinutes = body.cook_time_minutes ?? parseTimeToMinutes(body.cook_time);

  const { data, error } = await supabase
    .from("recipes")
    .insert({
      parent_user_id: user.id,
      title: body.title,
      source_type: body.source_type,
      source_url: body.source_url,
      ingredients: body.ingredients,
      instructions: body.instructions || body.description,
      prep_time_minutes: prepTimeMinutes,
      cook_time_minutes: cookTimeMinutes,
      servings: body.servings,
      image_url: body.image_url,
      scraped_data: body.scraped_data,
      tags: body.tags || [],
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ recipe: data });
}
