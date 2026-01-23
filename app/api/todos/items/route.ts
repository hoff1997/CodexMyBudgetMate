import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET /api/todos/items - Fetch items (optionally filtered by list)
export async function GET(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const listId = searchParams.get("list_id");
  const includeCompleted = searchParams.get("includeCompleted") === "true";

  // Get user's lists first
  const { data: userLists } = await supabase
    .from("todo_lists")
    .select("id")
    .eq("parent_user_id", user.id);

  const listIds = userLists?.map((l) => l.id) || [];

  if (listIds.length === 0) {
    return NextResponse.json([]);
  }

  let query = supabase
    .from("todo_items")
    .select("*")
    .in("todo_list_id", listIds)
    .order("sort_order", { ascending: true });

  if (listId) {
    query = query.eq("todo_list_id", listId);
  }

  if (!includeCompleted) {
    query = query.eq("is_completed", false);
  }

  const { data: items, error } = await query;

  if (error) {
    console.error("Error fetching todo items:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Map to client format
  const mappedItems = items?.map((item) => ({
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
  })) || [];

  return NextResponse.json(mappedItems);
}

// POST /api/todos/items - Create a new todo item
export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { list_id, text, category } = body;

  if (!list_id) {
    return NextResponse.json({ error: "List ID is required" }, { status: 400 });
  }

  if (!text) {
    return NextResponse.json({ error: "Text is required" }, { status: 400 });
  }

  // Verify the list belongs to the user
  const { data: list, error: listError } = await supabase
    .from("todo_lists")
    .select("id")
    .eq("id", list_id)
    .eq("parent_user_id", user.id)
    .single();

  if (listError || !list) {
    return NextResponse.json({ error: "List not found" }, { status: 404 });
  }

  // Get the highest sort order
  const { data: existingItems } = await supabase
    .from("todo_items")
    .select("sort_order")
    .eq("todo_list_id", list_id)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextOrder = (existingItems?.[0]?.sort_order || 0) + 1;

  const { data: item, error } = await supabase
    .from("todo_items")
    .insert({
      todo_list_id: list_id,
      text,
      is_completed: false,
      sort_order: nextOrder,
      category: category || null,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating todo item:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Return in client format
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
  }, { status: 201 });
}
