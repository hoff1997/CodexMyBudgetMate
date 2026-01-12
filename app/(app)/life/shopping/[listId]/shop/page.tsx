import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ShoppingMode } from "@/components/shopping/shopping-mode";

interface PageProps {
  params: Promise<{ listId: string }>;
}

// Default category order for sorting
const DEFAULT_CATEGORY_ORDER = [
  "Produce",
  "Bakery",
  "Deli",
  "Meat",
  "Seafood",
  "Dairy",
  "Frozen",
  "Pantry",
  "Snacks",
  "Beverages",
  "Health & Beauty",
  "Cleaning",
  "Baby",
  "Pet",
  "Uncategorised",
];

export default async function ShoppingModePage({ params }: PageProps) {
  const { listId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch the shopping list with items
  const { data: list, error: listError } = await supabase
    .from("shopping_lists")
    .select(`
      id,
      name,
      icon,
      items:shopping_items(
        id,
        text,
        quantity,
        aisle_name,
        category_id,
        is_checked,
        sort_order
      )
    `)
    .eq("id", listId)
    .eq("parent_user_id", user.id)
    .single();

  if (listError || !list) {
    redirect("/life/shopping");
  }

  // Fetch categories for mapping
  const { data: categories } = await supabase
    .from("shopping_categories")
    .select("id, name, icon, default_sort_order")
    .eq("parent_user_id", user.id)
    .order("default_sort_order");

  // Fetch user's supermarkets
  const { data: supermarkets } = await supabase
    .from("supermarkets")
    .select("id, name")
    .eq("parent_user_id", user.id)
    .order("name", { ascending: true });

  // Build category map
  const categoryMap = new Map(
    (categories || []).map((c) => [c.id, c])
  );

  // Build category order from user's categories or use default
  const categoryOrder = categories?.length
    ? categories.map((c) => c.name)
    : DEFAULT_CATEGORY_ORDER;

  // Map items to client format
  const mappedItems = (list.items || []).map((item) => {
    // Get category name from category_id or fall back to aisle_name
    let categoryName = "Uncategorised";
    if (item.category_id && categoryMap.has(item.category_id)) {
      categoryName = categoryMap.get(item.category_id)!.name;
    } else if (item.aisle_name) {
      categoryName = item.aisle_name;
    }

    return {
      id: item.id,
      name: item.text,
      quantity: item.quantity ? parseInt(item.quantity) || 1 : 1,
      category: categoryName,
      checked: item.is_checked,
      sortOrder: item.sort_order || 0,
    };
  });

  // Get category icons
  const categoryIcons: Record<string, string> = {};
  (categories || []).forEach((c) => {
    if (c.icon) categoryIcons[c.name] = c.icon;
  });

  // Add fallback icons for common categories
  const fallbackIcons: Record<string, string> = {
    Produce: "🥬",
    Dairy: "🥛",
    Meat: "🥩",
    Seafood: "🐟",
    Bakery: "🥖",
    Frozen: "🧊",
    Deli: "🧀",
    Beverages: "🥤",
    Snacks: "🍿",
    Pantry: "🥫",
    Household: "🧹",
    "Health & Beauty": "🧴",
    Cleaning: "🧹",
    Baby: "👶",
    Pet: "🐾",
    Uncategorised: "📦",
  };

  Object.keys(fallbackIcons).forEach((key) => {
    if (!categoryIcons[key]) {
      categoryIcons[key] = fallbackIcons[key];
    }
  });

  // Map supermarkets to client format
  const supermarketList = supermarkets?.map((s) => ({
    id: s.id,
    name: s.name,
  })) || [];

  return (
    <ShoppingMode
      listId={list.id}
      listName={list.name}
      listIcon={list.icon || "🛒"}
      initialItems={mappedItems}
      categoryOrder={categoryOrder}
      categoryIcons={categoryIcons}
      supermarkets={supermarketList}
      defaultCategoryOrder={DEFAULT_CATEGORY_ORDER}
    />
  );
}
