import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { checkBetaAccess } from "@/lib/utils/beta-access";
import { ShoppingClient } from "./shopping-client";

// Default aisle order (fallback if no categories defined)
const DEFAULT_AISLE_ORDER = [
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
  "Other",
];

export default async function ShoppingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check beta access
  const betaAccess = await checkBetaAccess();
  if (!betaAccess.hasAccess) {
    redirect("/dashboard");
  }

  // Fetch shopping lists with items
  const { data: lists } = await supabase
    .from("shopping_lists")
    .select(`
      *,
      items:shopping_items(*)
    `)
    .eq("parent_user_id", user.id)
    .order("created_at", { ascending: false });

  // Fetch user's categories
  const { data: categories } = await supabase
    .from("shopping_categories")
    .select("*")
    .eq("parent_user_id", user.id)
    .order("default_sort_order", { ascending: true });

  // Fetch user's supermarkets
  const { data: supermarkets } = await supabase
    .from("supermarkets")
    .select("id, name")
    .eq("parent_user_id", user.id)
    .order("name", { ascending: true });

  // Process lists to add counts and totals
  const processedLists = lists?.map((list) => ({
    ...list,
    totalItems: list.items?.length || 0,
    checkedItems: list.items?.filter((i: { is_checked: boolean }) => i.is_checked).length || 0,
    estimatedTotal: list.items?.reduce(
      (sum: number, item: { estimated_price: number | null; quantity: number }) =>
        sum + (item.estimated_price || 0) * (item.quantity || 1),
      0
    ) || 0,
    itemsByAisle: null,
    // Map items to client format
    items: list.items?.map((item: {
      id: string;
      text: string;
      quantity: string | null;
      unit: string | null;
      aisle_name: string | null;
      category_id: string | null;
      estimated_price: number | null;
      notes: string | null;
      is_checked: boolean;
      checked_at: string | null;
      sort_order: number | null;
      photo_url: string | null;
    }) => ({
      id: item.id,
      name: item.text || "",
      quantity: item.quantity ? parseInt(item.quantity) || 1 : 1,
      unit: item.unit,
      aisle: item.aisle_name,
      category_id: item.category_id,
      estimated_price: item.estimated_price,
      notes: item.notes,
      checked: item.is_checked,
      checked_at: item.checked_at,
      sort_order: item.sort_order || 0,
      photo_url: item.photo_url,
    })) || [],
  })) || [];

  // Build category order from database categories or use default
  const categoryOrder = categories && categories.length > 0
    ? categories.map((c) => c.name)
    : DEFAULT_AISLE_ORDER;

  // Map supermarkets to client format (or use empty array if none)
  const supermarketList = supermarkets?.map((s) => ({
    id: s.id,
    name: s.name,
  })) || [];

  // Map categories to client format
  const categoryList = categories?.map((c) => ({
    id: c.id,
    name: c.name,
    icon: c.icon,
    default_sort_order: c.default_sort_order,
  })) || [];

  return (
    <ShoppingClient
      initialLists={processedLists}
      supermarkets={supermarketList}
      defaultAisleOrder={categoryOrder}
      categories={categoryList}
    />
  );
}
