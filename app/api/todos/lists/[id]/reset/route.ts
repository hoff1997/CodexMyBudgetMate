import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import {
  createUnauthorizedError,
  createNotFoundError,
  createErrorResponse,
} from "@/lib/utils/api-error";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/todos/lists/[id]/reset - Uncheck all items in a list (reset for reuse)
export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  // Verify ownership of the list
  const { data: list, error: listError } = await supabase
    .from("todo_lists")
    .select("id")
    .eq("id", id)
    .eq("parent_user_id", user.id)
    .single();

  if (listError || !list) {
    return createNotFoundError("List");
  }

  // Reset all items in the list (uncheck them)
  const { data: updatedItems, error } = await supabase
    .from("todo_items")
    .update({
      is_completed: false,
      completed_at: null,
      completed_by_id: null,
      completed_by_type: null,
    })
    .eq("todo_list_id", id)
    .select();

  if (error) {
    console.error("Error resetting todo items:", error);
    return createErrorResponse(error, 500, "Failed to reset list");
  }

  return NextResponse.json({
    success: true,
    itemsReset: updatedItems?.length || 0,
  });
}
