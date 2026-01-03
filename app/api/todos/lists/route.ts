import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET /api/todos/lists - Fetch all todo lists for the user
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

  // Fetch todo lists with their items
  const { data: lists, error } = await supabase
    .from("todo_lists")
    .select(`
      *,
      items:todo_items(*)
    `)
    .eq("parent_user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching todo lists:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Filter out completed items if not requested
  // Map DB column 'is_completed' to client-expected 'completed'
  const processedLists = lists?.map((list) => {
    const allItems = list.items || [];
    const mappedItems = allItems.map((item: {
      id: string;
      text: string;
      is_completed: boolean;
      completed_at: string | null;
      assigned_to_id: string | null;
      assigned_to_type: string | null;
      sort_order: number;
    }) => ({
      id: item.id,
      text: item.text,
      completed: item.is_completed,
      completed_at: item.completed_at,
      due_date: null,
      assigned_to: item.assigned_to_id,
      category: null,
      notes: null,
      sort_order: item.sort_order,
    }));

    const filteredItems = includeCompleted
      ? mappedItems
      : mappedItems.filter((item: { completed: boolean }) => !item.completed);

    return {
      ...list,
      items: filteredItems,
      totalItems: allItems.length,
      completedItems: allItems.filter((item: { is_completed: boolean }) => item.is_completed).length,
    };
  });

  return NextResponse.json(processedLists || []);
}

// POST /api/todos/lists - Create a new todo list
export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, icon, color, shared_with_children } = body;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const { data: list, error } = await supabase
    .from("todo_lists")
    .insert({
      parent_user_id: user.id,
      name,
      icon: icon || "📝",
      color: color || "sage",
      shared_with_children: shared_with_children || [],
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating todo list:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(list, { status: 201 });
}
