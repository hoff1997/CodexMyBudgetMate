import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET /api/shopping/lists - Fetch all shopping lists
export async function GET(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const includeCompleted = searchParams.get("includeCompleted") === "true";

  // Fetch shopping lists with items
  const { data: lists, error } = await supabase
    .from("shopping_lists")
    .select(`
      *,
      items:shopping_items(*)
    `)
    .eq("parent_user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching shopping lists:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Process lists - map DB column names to client expected names
  const processedLists = lists?.map((list) => {
    const allItems = list.items || [];
    const items = includeCompleted
      ? allItems
      : allItems.filter((item: { is_checked: boolean }) => !item.is_checked);

    // Map items to client format
    const mappedItems = items.map((item: {
      id: string;
      text: string;
      quantity: string | null;
      aisle_name: string | null;
      category_id: string | null;
      estimated_price: number | null;
      notes: string | null;
      is_checked: boolean;
      checked_at: string | null;
      sort_order: number | null;
      photo_url: string | null;
      created_at: string;
    }) => ({
      id: item.id,
      name: item.text,
      quantity: item.quantity ? parseInt(item.quantity) || 1 : 1,
      unit: null,
      aisle: item.aisle_name,
      category_id: item.category_id || null,
      estimated_price: item.estimated_price || null,
      notes: item.notes || null,
      checked: item.is_checked,
      checked_at: item.checked_at || null,
      sort_order: item.sort_order || 0,
      photo_url: item.photo_url || null,
    }));

    return {
      id: list.id,
      name: list.name,
      icon: list.icon || "🛒",
      store: null,
      budget: null,
      items: mappedItems,
      itemsByAisle: null,
      totalItems: allItems.length,
      checkedItems: allItems.filter((item: { is_checked: boolean }) => item.is_checked).length,
      estimatedTotal: 0,
    };
  });

  return NextResponse.json(processedLists || []);
}

// POST /api/shopping/lists - Create a new shopping list
export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, icon } = body;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const { data: list, error } = await supabase
    .from("shopping_lists")
    .insert({
      parent_user_id: user.id,
      name,
      icon: icon || "🛒",
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating shopping list:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Return in client expected format
  return NextResponse.json({
    id: list.id,
    name: list.name,
    icon: list.icon || "🛒",
    store: null,
    budget: null,
  }, { status: 201 });
}
