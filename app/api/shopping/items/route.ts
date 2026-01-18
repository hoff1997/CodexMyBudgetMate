import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { createErrorResponse, createUnauthorizedError, createValidationError } from "@/lib/utils/api-error";

// Common product to category name mappings for auto-categorization
const PRODUCT_CATEGORY_MAPPINGS: Record<string, string[]> = {
  Produce: [
    "apple", "banana", "orange", "grape", "lemon", "lime", "avocado",
    "tomato", "lettuce", "spinach", "carrot", "onion", "potato", "broccoli",
    "cucumber", "capsicum", "pepper", "garlic", "ginger", "mushroom",
    "celery", "corn", "pumpkin", "kumara", "zucchini", "eggplant",
    "herbs", "basil", "parsley", "coriander", "mint", "fruit", "vegetables",
    "salad", "coleslaw", "berries", "strawberry", "blueberry", "raspberry",
    "kiwifruit", "mandarin", "pear", "plum", "nectarine", "peach",
  ],
  Bakery: [
    "bread", "roll", "bun", "bagel", "croissant", "muffin", "scone",
    "cake", "pie", "pastry", "donut", "doughnut", "baguette", "loaf",
    "sourdough", "ciabatta", "wrap", "tortilla", "pita",
  ],
  Deli: [
    "ham", "salami", "prosciutto", "chorizo", "pastrami", "deli", "sliced",
    "olives", "hummus", "dip", "antipasto", "feta", "brie", "camembert",
    "blue cheese", "pate",
  ],
  Meat: [
    "chicken", "beef", "lamb", "pork", "mince", "steak", "sausage",
    "bacon", "chop", "roast", "rump", "sirloin", "fillet", "drumstick",
    "thigh", "breast", "wing", "patty", "burger",
  ],
  Seafood: [
    "fish", "salmon", "tuna", "snapper", "hoki", "prawn", "shrimp",
    "mussel", "oyster", "crab", "squid", "calamari", "seafood", "fillet",
  ],
  Dairy: [
    "milk", "cheese", "yoghurt", "yogurt", "butter", "cream", "eggs",
    "sour cream", "cottage cheese", "cheddar", "mozzarella", "parmesan",
    "margarine", "custard", "dairy",
  ],
  Frozen: [
    "frozen", "ice cream", "gelato", "sorbet", "pizza", "chips", "fries",
    "peas", "corn", "vegetables", "berries", "fish fingers", "nuggets",
    "ice", "iceblock", "pastry", "frozen meal",
  ],
  Pantry: [
    "rice", "pasta", "noodle", "flour", "sugar", "salt", "oil", "olive oil",
    "sauce", "tomato sauce", "soy sauce", "vinegar", "spice", "seasoning",
    "canned", "beans", "chickpeas", "lentils", "coconut milk", "stock",
    "broth", "cereal", "oats", "porridge", "muesli", "honey", "jam",
    "peanut butter", "nutella", "vegemite", "marmite", "tin", "can",
  ],
  Snacks: [
    "chips", "crisps", "popcorn", "nuts", "crackers", "biscuit", "cookie",
    "chocolate", "candy", "lolly", "lollies", "snack", "bar", "muesli bar",
    "dried fruit", "pretzel",
  ],
  Beverages: [
    "juice", "water", "soda", "soft drink", "fizzy", "cola", "lemonade",
    "coffee", "tea", "wine", "beer", "spirits", "alcohol", "drink",
    "energy drink", "sports drink", "cordial", "kombucha",
  ],
  "Health & Beauty": [
    "shampoo", "conditioner", "soap", "body wash", "toothpaste", "toothbrush",
    "deodorant", "razor", "shaving", "makeup", "cosmetic", "lotion",
    "moisturiser", "sunscreen", "vitamin", "medicine", "panadol", "ibuprofen",
    "bandaid", "plaster", "first aid", "feminine", "tampon", "pad",
  ],
  Cleaning: [
    "cleaner", "detergent", "dishwash", "laundry", "bleach", "spray",
    "wipes", "sponge", "cloth", "mop", "broom", "rubbish bag", "bin liner",
    "toilet paper", "tissue", "paper towel", "glad wrap", "foil", "cling",
  ],
  Baby: [
    "nappy", "nappies", "diaper", "formula", "baby food", "baby wipes",
    "baby", "infant",
  ],
  Pet: [
    "pet food", "dog food", "cat food", "pet", "dog", "cat", "treats",
    "litter", "pet treats",
  ],
};

function guessCategoryName(productName: string): string {
  const lowerName = productName.toLowerCase();

  for (const [category, keywords] of Object.entries(PRODUCT_CATEGORY_MAPPINGS)) {
    for (const keyword of keywords) {
      if (lowerName.includes(keyword)) {
        return category;
      }
    }
  }

  return "Other";
}

// GET /api/shopping/items - Fetch items (optionally filtered by list)
export async function GET(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const { searchParams } = new URL(request.url);
  const listId = searchParams.get("list_id");
  const includeChecked = searchParams.get("includeChecked") === "true";

  // First get the user's shopping lists to filter items
  const { data: userLists } = await supabase
    .from("shopping_lists")
    .select("id")
    .eq("parent_user_id", user.id);

  const listIds = userLists?.map((l) => l.id) || [];

  if (listIds.length === 0) {
    return NextResponse.json([]);
  }

  let query = supabase
    .from("shopping_items")
    .select("*")
    .in("shopping_list_id", listIds)
    .order("created_at", { ascending: true });

  if (listId) {
    query = query.eq("shopping_list_id", listId);
  }

  if (!includeChecked) {
    query = query.eq("is_checked", false);
  }

  const { data: items, error } = await query;

  if (error) {
    console.error("Error fetching shopping items:", error);
    return createErrorResponse(error, 500, "Failed to fetch shopping items");
  }

  // Map DB columns to client expected format
  const mappedItems = items?.map((item) => ({
    id: item.id,
    list_id: item.shopping_list_id,
    name: item.text,
    quantity: item.quantity ? parseInt(item.quantity) || 1 : 1,
    unit: null,
    aisle: item.aisle_name || null,
    category_id: item.category_id || null,
    estimated_price: item.estimated_price || null,
    notes: item.notes || null,
    checked: item.is_checked,
    checked_at: null,
    sort_order: 0,
    photo_url: item.photo_url || null,
  })) || [];

  return NextResponse.json(mappedItems);
}

// POST /api/shopping/items - Create a new shopping item
export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const body = await request.json();
  const { list_id, name, quantity } = body;

  if (!list_id) {
    return createValidationError("List ID is required");
  }

  if (!name) {
    return createValidationError("Name is required");
  }

  // Verify the list belongs to the user
  const { data: list, error: listError } = await supabase
    .from("shopping_lists")
    .select("id")
    .eq("id", list_id)
    .eq("parent_user_id", user.id)
    .single();

  if (listError || !list) {
    return NextResponse.json({ error: "List not found" }, { status: 404 });
  }

  // Auto-guess aisle based on product name
  const guessedAisle = guessCategoryName(name);

  const { data: item, error } = await supabase
    .from("shopping_items")
    .insert({
      shopping_list_id: list_id,
      text: name,
      quantity: quantity ? String(quantity) : null,
      aisle_name: guessedAisle,
      is_checked: false,
      added_by_id: user.id,
      added_by_type: "parent",
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating shopping item:", error);
    return createErrorResponse(error, 500, "Failed to create shopping item");
  }

  // Return in client expected format
  return NextResponse.json({
    id: item.id,
    list_id: item.shopping_list_id,
    name: item.text,
    quantity: item.quantity ? parseInt(item.quantity) || 1 : 1,
    unit: null,
    aisle: item.aisle_name || null,
    category_id: item.category_id || null,
    estimated_price: item.estimated_price || null,
    notes: item.notes || null,
    checked: item.is_checked,
    checked_at: null,
    sort_order: 0,
    photo_url: item.photo_url || null,
  }, { status: 201 });
}
