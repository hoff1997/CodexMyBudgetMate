import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createErrorResponse, createUnauthorizedError, createValidationError } from "@/lib/utils/api-error";

// GET a single template
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const { id } = await params;

  const { data, error } = await supabase
    .from("meal_plan_templates")
    .select("*")
    .eq("id", id)
    .eq("parent_user_id", user.id)
    .single();

  if (error) {
    return createErrorResponse(error, 400, "Failed to fetch template");
  }

  return NextResponse.json({ template: data });
}

// DELETE a template
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const { id } = await params;

  const { error } = await supabase
    .from("meal_plan_templates")
    .delete()
    .eq("id", id)
    .eq("parent_user_id", user.id);

  if (error) {
    return createErrorResponse(error, 400, "Failed to delete template");
  }

  return NextResponse.json({ success: true });
}

// PATCH update a template
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const { id } = await params;
  const body = await request.json();

  // Only update provided fields
  const updateData: Record<string, unknown> = {};
  if (body.name !== undefined) updateData.name = body.name;
  if (body.cycle_type !== undefined) updateData.cycle_type = body.cycle_type;
  if (body.template_data !== undefined) updateData.template_data = body.template_data;

  if (Object.keys(updateData).length === 0) {
    return createValidationError("No fields to update");
  }

  const { data, error } = await supabase
    .from("meal_plan_templates")
    .update(updateData)
    .eq("id", id)
    .eq("parent_user_id", user.id)
    .select()
    .single();

  if (error) {
    return createErrorResponse(error, 400, "Failed to update template");
  }

  return NextResponse.json({ template: data });
}
