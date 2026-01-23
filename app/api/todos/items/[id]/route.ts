import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET /api/todos/items/[id] - Fetch a single todo item
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get the item and verify ownership via the list
  const { data: item, error } = await supabase
    .from("todo_items")
    .select(`
      *,
      todo_lists!inner(parent_user_id)
    `)
    .eq("id", id)
    .eq("todo_lists.parent_user_id", user.id)
    .single();

  if (error) {
    console.error("Error fetching todo item:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  // Map to client format
  return NextResponse.json({
    id: item.id,
    list_id: item.todo_list_id,
    text: item.text,
    completed: item.is_completed,
    completed_at: item.completed_at,
    due_date: null,
    assigned_to: item.assigned_to_id,
    assigned_to_type: item.assigned_to_type,
    category: item.category || null,
    notes: null,
    sort_order: item.sort_order,
  });
}

// PATCH /api/todos/items/[id] - Update a todo item
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { text, completed, sort_order, assigned_to, assigned_to_type, category } = body;

  // First verify ownership via the list
  const { data: existingItem, error: fetchError } = await supabase
    .from("todo_items")
    .select(`
      id,
      todo_list_id,
      todo_lists!inner(parent_user_id)
    `)
    .eq("id", id)
    .eq("todo_lists.parent_user_id", user.id)
    .single();

  if (fetchError || !existingItem) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  // Build update object with only provided fields using correct column names
  const updates: Record<string, unknown> = {};
  if (text !== undefined) updates.text = text;
  if (completed !== undefined) {
    updates.is_completed = completed;
    updates.completed_at = completed ? new Date().toISOString() : null;
  }
  if (sort_order !== undefined) updates.sort_order = sort_order;
  if (assigned_to !== undefined) updates.assigned_to_id = assigned_to === "parent" ? null : assigned_to;
  if (assigned_to_type !== undefined) updates.assigned_to_type = assigned_to_type;
  if (category !== undefined) updates.category = category;

  const { data: item, error } = await supabase
    .from("todo_items")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating todo item:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Map to client format
  return NextResponse.json({
    id: item.id,
    list_id: item.todo_list_id,
    text: item.text,
    completed: item.is_completed,
    completed_at: item.completed_at,
    due_date: null,
    assigned_to: item.assigned_to_id,
    assigned_to_type: item.assigned_to_type,
    category: item.category || null,
    notes: null,
    sort_order: item.sort_order,
  });
}

// DELETE /api/todos/items/[id] - Delete a todo item
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify ownership via the list first
  const { data: existingItem, error: fetchError } = await supabase
    .from("todo_items")
    .select(`
      id,
      todo_lists!inner(parent_user_id)
    `)
    .eq("id", id)
    .eq("todo_lists.parent_user_id", user.id)
    .single();

  if (fetchError || !existingItem) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const { error } = await supabase
    .from("todo_items")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting todo item:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
