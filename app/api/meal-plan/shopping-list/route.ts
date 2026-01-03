import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Generate a shopping list from a week's meal plan
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { start_date, end_date, shopping_list_id } = body;

  if (!start_date || !end_date) {
    return NextResponse.json(
      { error: "start_date and end_date required" },
      { status: 400 }
    );
  }

  // Get meals with recipes for the date range
  const { data: meals } = await supabase
    .from("meal_plans")
    .select(
      `
      *,
      recipe:recipes(ingredients)
    `
    )
    .eq("parent_user_id", user.id)
    .gte("date", start_date)
    .lte("date", end_date);

  if (!meals || meals.length === 0) {
    return NextResponse.json(
      { error: "No meals found in date range" },
      { status: 404 }
    );
  }

  // Collect all ingredients
  const allIngredients: string[] = [];
  meals.forEach((meal) => {
    const recipe = Array.isArray(meal.recipe) ? meal.recipe[0] : meal.recipe;
    if (recipe?.ingredients && Array.isArray(recipe.ingredients)) {
      allIngredients.push(...recipe.ingredients);
    }
  });

  if (allIngredients.length === 0) {
    return NextResponse.json(
      { error: "No ingredients found in meal plans" },
      { status: 404 }
    );
  }

  // If shopping list ID provided, add items to it
  if (shopping_list_id) {
    const shoppingItems = allIngredients.map((ingredient, index) => ({
      list_id: shopping_list_id,
      user_id: user.id,
      name: ingredient,
      quantity: 1,
      checked: false,
      sort_order: index + 1,
    }));

    const { data: items, error } = await supabase
      .from("shopping_items")
      .insert(shoppingItems)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      items_added: items?.length || 0,
      ingredients: allIngredients,
    });
  }

  // Just return the ingredients list
  return NextResponse.json({
    ingredients: allIngredients,
    count: allIngredients.length,
  });
}
