import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { createErrorResponse, createUnauthorizedError, createValidationError } from "@/lib/utils/api-error";

// GET /api/shopping/lists - Fetch all shopping lists
export async function GET(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const { searchParams } = new URL(request.url);
  const includeCompleted = searchParams.get("includeCompleted") === "true";

  // Fetch shopping lists with items and linked envelope balance
  const { data: lists, error } = await supabase
    .from("shopping_lists")
    .select(`
      *,
      items:shopping_items(*),
      envelope:envelopes!shopping_lists_linked_envelope_id_fkey(id, name, current_balance)
    `)
    .eq("parent_user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching shopping lists:", error);
    return createErrorResponse(error, 500, "Failed to fetch shopping lists");
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
      estimated_price?: number | null;
      price_unit?: string | null;
      notes?: string | null;
      is_checked: boolean;
      checked_at?: string | null;
      sort_order?: number | null;
      photo_url?: string | null;
      created_at?: string;
    }) => ({
      id: item.id,
      name: item.text,
      quantity: item.quantity ? parseInt(item.quantity) || 1 : 1,
      unit: null,
      aisle: item.aisle_name,
      category_id: item.category_id || null,
      estimated_price: item.estimated_price || null,
      price_unit: item.price_unit || 'each',
      notes: item.notes || null,
      checked: item.is_checked,
      checked_at: item.checked_at || null,
      sort_order: item.sort_order || 0,
      photo_url: item.photo_url || null,
    }));

    // Get envelope data if linked
    const envelope = list.envelope as { id: string; name: string; current_balance: number } | null;

    // Calculate estimated total from items
    const estimatedTotal = allItems.reduce((sum: number, item: { estimated_price?: number | null; quantity?: string | null }) => {
      const price = item.estimated_price || 0;
      const qty = item.quantity ? parseInt(item.quantity) || 1 : 1;
      return sum + (price * qty);
    }, 0);

    return {
      id: list.id,
      name: list.name,
      icon: list.icon || "🛒",
      list_type: list.list_type || "grocery",
      store: null,
      budget: null,
      items: mappedItems,
      itemsByAisle: null,
      totalItems: allItems.length,
      checkedItems: allItems.filter((item: { is_checked: boolean }) => item.is_checked).length,
      estimatedTotal,
      linked_envelope_id: list.linked_envelope_id || null,
      linked_envelope_name: envelope?.name || list.linked_envelope_name || null,
      linked_envelope_balance: envelope?.current_balance ?? null,
      is_completed: list.is_completed || false,
      show_on_hub: list.show_on_hub ?? true,
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
    return createUnauthorizedError();
  }

  const body = await request.json();
  const { name, icon, from_template_id, list_type } = body;

  if (!name) {
    return createValidationError("Name is required");
  }

  const { data: list, error } = await supabase
    .from("shopping_lists")
    .insert({
      parent_user_id: user.id,
      name,
      icon: icon || "🛒",
      is_active: true,
      list_type: list_type || "grocery",
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating shopping list:", error);
    return createErrorResponse(error, 500, "Failed to create shopping list");
  }

  // If creating from template, copy the items
  if (from_template_id) {
    const { data: template } = await supabase
      .from("shopping_list_templates")
      .select("items")
      .eq("id", from_template_id)
      .eq("parent_user_id", user.id)
      .single();

    if (template?.items && Array.isArray(template.items)) {
      const itemsToInsert = template.items.map((item: {
        name: string;
        quantity?: number;
        category_id?: string | null;
        aisle_name?: string | null;
      }, index: number) => ({
        shopping_list_id: list.id,
        text: item.name,
        quantity: item.quantity?.toString() || "1",
        category_id: item.category_id || null,
        aisle_name: item.aisle_name || null,
        is_checked: false,
        sort_order: index,
      }));

      if (itemsToInsert.length > 0) {
        await supabase.from("shopping_items").insert(itemsToInsert);
      }
    }
  }

  // Return in client expected format
  return NextResponse.json({
    id: list.id,
    name: list.name,
    icon: list.icon || "🛒",
    list_type: list.list_type || "grocery",
    store: null,
    budget: null,
    show_on_hub: list.show_on_hub ?? true,
  }, { status: 201 });
}
