import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

interface RouteParams {
  params: { id: string };
}

// GET /api/todos/lists/[id] - Fetch a single todo list with items
export async function GET(request: Request, { params }: RouteParams) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const includeCompleted = searchParams.get("includeCompleted") === "true";

  const { data: list, error } = await supabase
    .from("todo_lists")
    .select(`
      *,
      items:todo_items(*)
    `)
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (error) {
    console.error("Error fetching todo list:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!list) {
    return NextResponse.json({ error: "List not found" }, { status: 404 });
  }

  // Filter and sort items
  const processedList = {
    ...list,
    items: (includeCompleted
      ? list.items
      : list.items?.filter((item: { completed: boolean }) => !item.completed) || []
    ).sort((a: { sort_order: number }, b: { sort_order: number }) =>
      (a.sort_order || 0) - (b.sort_order || 0)
    ),
    totalItems: list.items?.length || 0,
    completedItems: list.items?.filter((item: { completed: boolean }) => item.completed).length || 0,
  };

  return NextResponse.json(processedList);
}

// PATCH /api/todos/lists/[id] - Update a todo list
export async function PATCH(request: Request, { params }: RouteParams) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, icon, color, shared_with_children } = body;

  // Build update object with only provided fields
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (icon !== undefined) updates.icon = icon;
  if (color !== undefined) updates.color = color;
  if (shared_with_children !== undefined) updates.shared_with_children = shared_with_children;

  const { data: list, error } = await supabase
    .from("todo_lists")
    .update(updates)
    .eq("id", params.id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    console.error("Error updating todo list:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(list);
}

// DELETE /api/todos/lists/[id] - Delete a todo list and its items
export async function DELETE(request: Request, { params }: RouteParams) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Items will be deleted via cascade
  const { error } = await supabase
    .from("todo_lists")
    .delete()
    .eq("id", params.id)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error deleting todo list:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
