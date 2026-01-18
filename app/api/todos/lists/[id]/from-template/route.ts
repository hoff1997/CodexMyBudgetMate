import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import {
  createErrorResponse,
  createUnauthorizedError,
  createNotFoundError,
  createValidationError,
} from "@/lib/utils/api-error";

interface RouteParams {
  params: { id: string };
}

// POST /api/todos/lists/[id]/from-template - Create items from a template
export async function POST(request: Request, { params }: RouteParams) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const body = await request.json();
  const { template_id } = body;

  if (!template_id) {
    return createValidationError("Template ID is required");
  }

  // Verify the list belongs to the user
  const { data: list, error: listError } = await supabase
    .from("todo_lists")
    .select("id")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (listError || !list) {
    return createNotFoundError("List");
  }

  // Fetch the template
  const { data: template, error: templateError } = await supabase
    .from("todo_templates")
    .select("*")
    .eq("id", template_id)
    .single();

  if (templateError || !template) {
    return createNotFoundError("Template");
  }

  // Get the highest sort order in the current list
  const { data: existingItems } = await supabase
    .from("todo_items")
    .select("sort_order")
    .eq("list_id", params.id)
    .order("sort_order", { ascending: false })
    .limit(1);

  const startOrder = (existingItems?.[0]?.sort_order || 0) + 1;

  // Create items from template
  const templateItems = template.items as Array<{ text: string; category?: string }>;
  const newItems = templateItems.map((item, index) => ({
    list_id: params.id,
    user_id: user.id,
    text: item.text,
    category: item.category || null,
    completed: false,
    sort_order: startOrder + index,
  }));

  const { data: createdItems, error: insertError } = await supabase
    .from("todo_items")
    .insert(newItems)
    .select();

  if (insertError) {
    console.error("Error creating items from template:", insertError);
    return createErrorResponse(insertError, 500, "Failed to create items from template");
  }

  return NextResponse.json({
    success: true,
    items_created: createdItems?.length || 0,
    items: createdItems,
  });
}
