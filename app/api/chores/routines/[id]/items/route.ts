import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/chores/routines/[id]/items - Add items to a routine
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id: routineId } = await params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify ownership
  const { data: routine } = await supabase
    .from("chore_routines")
    .select("id")
    .eq("id", routineId)
    .eq("parent_user_id", user.id)
    .single();

  if (!routine) {
    return NextResponse.json({ error: "Routine not found" }, { status: 404 });
  }

  const body = await request.json();
  const { items } = body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      { error: "Items array is required" },
      { status: 400 }
    );
  }

  // Get current max sort_order
  const { data: existingItems } = await supabase
    .from("chore_routine_items")
    .select("sort_order")
    .eq("routine_id", routineId)
    .order("sort_order", { ascending: false })
    .limit(1);

  let nextSortOrder = (existingItems?.[0]?.sort_order ?? -1) + 1;

  const newItems = items.map(
    (item: {
      chore_template_id: string;
      sort_order?: number;
      is_required?: boolean;
      override_currency_type?: string;
      override_currency_amount?: number;
    }) => ({
      routine_id: routineId,
      chore_template_id: item.chore_template_id,
      sort_order: item.sort_order ?? nextSortOrder++,
      is_required: item.is_required ?? true,
      override_currency_type: item.override_currency_type || null,
      override_currency_amount: item.override_currency_amount ?? null,
    })
  );

  const { data: insertedItems, error } = await supabase
    .from("chore_routine_items")
    .insert(newItems)
    .select(
      `
      id,
      chore_template_id,
      sort_order,
      is_required,
      override_currency_type,
      override_currency_amount,
      chore_template:chore_templates (
        id,
        name,
        icon,
        category
      )
    `
    );

  if (error) {
    console.error("Error adding routine items:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(insertedItems, { status: 201 });
}

// PUT /api/chores/routines/[id]/items - Replace all items in a routine
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id: routineId } = await params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify ownership
  const { data: routine } = await supabase
    .from("chore_routines")
    .select("id")
    .eq("id", routineId)
    .eq("parent_user_id", user.id)
    .single();

  if (!routine) {
    return NextResponse.json({ error: "Routine not found" }, { status: 404 });
  }

  const body = await request.json();
  const { items } = body;

  if (!items || !Array.isArray(items)) {
    return NextResponse.json(
      { error: "Items array is required" },
      { status: 400 }
    );
  }

  // Delete existing items
  await supabase
    .from("chore_routine_items")
    .delete()
    .eq("routine_id", routineId);

  if (items.length === 0) {
    return NextResponse.json([]);
  }

  // Insert new items
  const newItems = items.map(
    (
      item: {
        chore_template_id: string;
        sort_order?: number;
        is_required?: boolean;
        override_currency_type?: string;
        override_currency_amount?: number;
      },
      index: number
    ) => ({
      routine_id: routineId,
      chore_template_id: item.chore_template_id,
      sort_order: item.sort_order ?? index,
      is_required: item.is_required ?? true,
      override_currency_type: item.override_currency_type || null,
      override_currency_amount: item.override_currency_amount ?? null,
    })
  );

  const { data: insertedItems, error } = await supabase
    .from("chore_routine_items")
    .insert(newItems)
    .select(
      `
      id,
      chore_template_id,
      sort_order,
      is_required,
      override_currency_type,
      override_currency_amount,
      chore_template:chore_templates (
        id,
        name,
        icon,
        category
      )
    `
    );

  if (error) {
    console.error("Error replacing routine items:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Update routine timestamp
  await supabase
    .from("chore_routines")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", routineId);

  return NextResponse.json(insertedItems);
}

// DELETE /api/chores/routines/[id]/items - Remove specific items from a routine
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id: routineId } = await params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify ownership
  const { data: routine } = await supabase
    .from("chore_routines")
    .select("id")
    .eq("id", routineId)
    .eq("parent_user_id", user.id)
    .single();

  if (!routine) {
    return NextResponse.json({ error: "Routine not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const itemIds = searchParams.get("item_ids")?.split(",");

  if (!itemIds || itemIds.length === 0) {
    return NextResponse.json(
      { error: "item_ids query parameter is required" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("chore_routine_items")
    .delete()
    .eq("routine_id", routineId)
    .in("id", itemIds);

  if (error) {
    console.error("Error deleting routine items:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, deleted: itemIds });
}
