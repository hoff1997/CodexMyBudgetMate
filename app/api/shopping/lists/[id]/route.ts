import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Default aisle order for sorting
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
  "Uncategorised",
];

// GET /api/shopping/lists/[id] - Fetch a shopping list with sorted items
export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const includeCompleted = searchParams.get("includeCompleted") === "true";
  const sortByAisle = searchParams.get("sortByAisle") === "true";
  const supermarketId = searchParams.get("supermarket"); // Filter by supermarket for aisle sorting

  const { data: list, error } = await supabase
    .from("shopping_lists")
    .select(`
      *,
      items:shopping_items(*)
    `)
    .eq("id", id)
    .eq("parent_user_id", user.id)
    .single();

  if (error) {
    console.error("Error fetching shopping list:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!list) {
    return NextResponse.json({ error: "List not found" }, { status: 404 });
  }

  // Get aisle order (from supermarket layout or default)
  let aisleOrder = DEFAULT_AISLE_ORDER;
  if (supermarketId) {
    const { data: layout } = await supabase
      .from("supermarket_layouts")
      .select("aisle_order")
      .eq("parent_user_id", user.id)
      .eq("supermarket_id", supermarketId)
      .single();

    if (layout?.aisle_order) {
      aisleOrder = layout.aisle_order;
    }
  }

  // Filter and sort items - map from DB columns
  let items = (list.items || []).map((item: {
    id: string;
    shopping_list_id: string;
    text: string;
    quantity: string | null;
    aisle_name: string | null;
    is_checked: boolean;
    created_at: string;
  }) => ({
    id: item.id,
    list_id: item.shopping_list_id,
    name: item.text,
    quantity: item.quantity ? parseInt(item.quantity) || 1 : 1,
    unit: null,
    aisle: item.aisle_name,
    estimated_price: null,
    notes: null,
    checked: item.is_checked,
    checked_at: null,
    sort_order: 0,
  }));

  if (!includeCompleted) {
    items = items.filter((item: { checked: boolean }) => !item.checked);
  }

  if (sortByAisle) {
    items = items.sort((a: { aisle: string | null }, b: { aisle: string | null }) => {
      const aIndex = aisleOrder.indexOf(a.aisle || "Other");
      const bIndex = aisleOrder.indexOf(b.aisle || "Other");
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    });
  } else {
    items = items.sort(
      (a: { sort_order: number }, b: { sort_order: number }) =>
        (a.sort_order || 0) - (b.sort_order || 0)
    );
  }

  // Group by aisle if sorting by aisle
  const itemsByAisle: Record<string, typeof items> = {};
  if (sortByAisle) {
    items.forEach((item: { aisle: string | null }) => {
      const aisle = item.aisle || "Other";
      if (!itemsByAisle[aisle]) {
        itemsByAisle[aisle] = [];
      }
      itemsByAisle[aisle].push(item);
    });
  }

  const allItems = list.items || [];
  const processedList = {
    id: list.id,
    name: list.name,
    icon: list.icon || "🛒",
    store: null, // Supermarket is now a filter, not stored on list
    budget: null,
    items,
    itemsByAisle: sortByAisle ? itemsByAisle : null,
    aisleOrder,
    totalItems: allItems.length,
    checkedItems: allItems.filter((item: { is_checked: boolean }) => item.is_checked).length,
    estimatedTotal: 0,
  };

  return NextResponse.json(processedList);
}

// PATCH /api/shopping/lists/[id] - Update a shopping list
export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, icon, is_active, show_on_hub } = body;

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (icon !== undefined) updates.icon = icon;
  if (is_active !== undefined) updates.is_active = is_active;
  if (show_on_hub !== undefined) updates.show_on_hub = show_on_hub;

  const { data: list, error } = await supabase
    .from("shopping_lists")
    .update(updates)
    .eq("id", id)
    .eq("parent_user_id", user.id)
    .select()
    .single();

  if (error) {
    console.error("Error updating shopping list:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    id: list.id,
    name: list.name,
    icon: list.icon || "🛒",
    store: null,
    budget: null,
    show_on_hub: list.show_on_hub ?? true,
  });
}

// DELETE /api/shopping/lists/[id] - Delete a shopping list
export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("shopping_lists")
    .delete()
    .eq("id", id)
    .eq("parent_user_id", user.id);

  if (error) {
    console.error("Error deleting shopping list:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
