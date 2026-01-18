import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { createErrorResponse, createUnauthorizedError, createValidationError, createNotFoundError } from "@/lib/utils/api-error";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/shopping/templates/[id] - Fetch a single template
export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const { data: template, error } = await supabase
    .from("shopping_list_templates")
    .select("*")
    .eq("id", id)
    .eq("parent_user_id", user.id)
    .single();

  if (error) {
    console.error("Error fetching template:", error);
    return createErrorResponse(error, 500, "Failed to fetch template");
  }

  if (!template) {
    return createNotFoundError("Template");
  }

  return NextResponse.json(template);
}

// PATCH /api/shopping/templates/[id] - Update a template
export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const body = await request.json();
  const { name, icon, items } = body;

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (icon !== undefined) updates.icon = icon;
  if (items !== undefined) updates.items = items;

  if (Object.keys(updates).length === 0) {
    return createValidationError("No updates provided");
  }

  const { data: template, error } = await supabase
    .from("shopping_list_templates")
    .update(updates)
    .eq("id", id)
    .eq("parent_user_id", user.id)
    .select()
    .single();

  if (error) {
    console.error("Error updating template:", error);
    return createErrorResponse(error, 500, "Failed to update template");
  }

  return NextResponse.json(template);
}

// DELETE /api/shopping/templates/[id] - Delete a template
export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const { error } = await supabase
    .from("shopping_list_templates")
    .delete()
    .eq("id", id)
    .eq("parent_user_id", user.id);

  if (error) {
    console.error("Error deleting template:", error);
    return createErrorResponse(error, 500, "Failed to delete template");
  }

  return NextResponse.json({ success: true });
}
