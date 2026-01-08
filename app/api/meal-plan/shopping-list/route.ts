import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface ParsedIngredient {
  name: string;
  quantity: string | null;
  originalText: string;
}

// Parse ingredient string to extract quantity and name
function parseIngredient(ingredient: string): ParsedIngredient {
  const trimmed = ingredient.trim();

  // Common patterns: "2 cups flour", "1/2 tsp salt", "3 large eggs"
  const quantityPattern = /^([\d\/\.\s]+(?:cups?|tbsp?|tsp?|oz|g|kg|ml|l|lb|pound|slice|clove|bunch|can|jar|pkg|package|piece|medium|large|small)?)\s+(.+)$/i;
  const match = trimmed.match(quantityPattern);

  if (match) {
    return {
      name: match[2].trim(),
      quantity: match[1].trim(),
      originalText: trimmed,
    };
  }

  return {
    name: trimmed,
    quantity: null,
    originalText: trimmed,
  };
}

// Normalize ingredient name for comparison
function normalizeIngredientName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/,.*$/, "") // Remove anything after comma
    .replace(/\(.*\)/, "") // Remove parenthetical notes
    .trim();
}

// Consolidate duplicate ingredients
function consolidateIngredients(ingredients: string[]): ParsedIngredient[] {
  const consolidated = new Map<string, ParsedIngredient>();

  for (const ing of ingredients) {
    const parsed = parseIngredient(ing);
    const normalized = normalizeIngredientName(parsed.name);

    if (consolidated.has(normalized)) {
      // Item already exists - keep the more detailed version
      const existing = consolidated.get(normalized)!;
      if (parsed.originalText.length > existing.originalText.length) {
        consolidated.set(normalized, parsed);
      }
    } else {
      consolidated.set(normalized, parsed);
    }
  }

  return Array.from(consolidated.values());
}

// Suggest category/aisle based on ingredient name
function suggestCategory(ingredientName: string): string | null {
  const name = ingredientName.toLowerCase();

  // Produce
  if (/lettuce|tomato|onion|garlic|pepper|carrot|celery|cucumber|spinach|kale|broccoli|cauliflower|zucchini|potato|avocado|lemon|lime|apple|banana|orange|grape|berry|strawberr|blueberr|raspberr/.test(name)) {
    return "Fruit & Veg";
  }

  // Meat & Seafood
  if (/chicken|beef|pork|lamb|fish|salmon|shrimp|prawn|bacon|sausage|mince|steak|turkey|duck/.test(name)) {
    return "Meat & Seafood";
  }

  // Dairy
  if (/milk|cheese|butter|cream|yogurt|yoghurt|egg|sour cream|cottage/.test(name)) {
    return "Dairy";
  }

  // Bakery
  if (/bread|roll|bun|muffin|bagel|croissant|pastry|pita/.test(name)) {
    return "Bakery";
  }

  // Pantry
  if (/flour|sugar|salt|pepper|oil|vinegar|sauce|pasta|rice|noodle|bean|lentil|can|stock|broth|spice|herb|seasoning/.test(name)) {
    return "Pantry";
  }

  // Frozen
  if (/frozen|ice cream|pizza/.test(name)) {
    return "Frozen";
  }

  // Beverages
  if (/juice|water|soda|coffee|tea|milk/.test(name)) {
    return "Beverages";
  }

  return null;
}

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
  const { start_date, end_date, shopping_list_id, create_new_list, new_list_name } = body;

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
      id,
      date,
      meal_type,
      meal_name,
      recipe:recipes(id, title, ingredients)
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

  // Collect all ingredients with source tracking
  const allIngredients: string[] = [];
  const recipeNames: string[] = [];

  meals.forEach((meal) => {
    const recipe = Array.isArray(meal.recipe) ? meal.recipe[0] : meal.recipe;
    if (recipe?.ingredients && Array.isArray(recipe.ingredients)) {
      allIngredients.push(...recipe.ingredients);
      recipeNames.push(recipe.title);
    }
  });

  if (allIngredients.length === 0) {
    return NextResponse.json(
      { error: "No ingredients found in meal plans" },
      { status: 404 }
    );
  }

  // Consolidate ingredients
  const consolidatedIngredients = consolidateIngredients(allIngredients);

  // Create new list if requested
  let targetListId = shopping_list_id;

  if (create_new_list) {
    const listName = new_list_name || `Meal Plan ${start_date} - ${end_date}`;

    const { data: newList, error: listError } = await supabase
      .from("shopping_lists")
      .insert({
        parent_user_id: user.id,
        name: listName,
        icon: "🍳",
        is_active: true,
      })
      .select()
      .single();

    if (listError) {
      return NextResponse.json({ error: listError.message }, { status: 400 });
    }

    targetListId = newList.id;
  }

  // If we have a target list, add items to it
  if (targetListId) {
    // Get existing items to avoid duplicates
    const { data: existingItems } = await supabase
      .from("shopping_items")
      .select("text")
      .eq("list_id", targetListId);

    const existingNames = new Set(
      (existingItems || []).map((item) => normalizeIngredientName(item.text))
    );

    // Filter out items already on the list
    const newIngredients = consolidatedIngredients.filter(
      (ing) => !existingNames.has(normalizeIngredientName(ing.name))
    );

    if (newIngredients.length > 0) {
      const shoppingItems = newIngredients.map((ingredient, index) => ({
        list_id: targetListId,
        parent_user_id: user.id,
        text: ingredient.quantity
          ? `${ingredient.quantity} ${ingredient.name}`
          : ingredient.name,
        quantity: ingredient.quantity || null,
        aisle_name: suggestCategory(ingredient.name),
        is_checked: false,
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
        list_id: targetListId,
        items_added: items?.length || 0,
        items_skipped: consolidatedIngredients.length - newIngredients.length,
        recipes_included: [...new Set(recipeNames)],
        ingredients: newIngredients.map((i) => i.originalText),
      });
    } else {
      return NextResponse.json({
        success: true,
        list_id: targetListId,
        items_added: 0,
        items_skipped: consolidatedIngredients.length,
        message: "All ingredients already on the list",
        recipes_included: [...new Set(recipeNames)],
      });
    }
  }

  // Just return the consolidated ingredients list
  return NextResponse.json({
    ingredients: consolidatedIngredients.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      originalText: i.originalText,
      suggestedCategory: suggestCategory(i.name),
    })),
    count: consolidatedIngredients.length,
    original_count: allIngredients.length,
    recipes_included: [...new Set(recipeNames)],
  });
}
