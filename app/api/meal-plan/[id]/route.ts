import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createErrorResponse, createUnauthorizedError } from "@/lib/utils/api-error";

interface RouteParams {
  params: { id: string };
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const body = await request.json();

  const { data, error } = await supabase
    .from("meal_plans")
    .update(body)
    .eq("id", params.id)
    .eq("parent_user_id", user.id)
    .select(
      `
      *,
      recipe:recipes(*)
    `
    )
    .single();

  if (error) {
    return createErrorResponse(error, 400, "Failed to update meal plan");
  }

  // Transform recipe from array to object
  const meal = {
    ...data,
    recipe: Array.isArray(data.recipe) ? data.recipe[0] || null : data.recipe,
  };

  return NextResponse.json({ meal });
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const { error } = await supabase
    .from("meal_plans")
    .delete()
    .eq("id", params.id)
    .eq("parent_user_id", user.id);

  if (error) {
    return createErrorResponse(error, 400, "Failed to delete meal plan");
  }

  return NextResponse.json({ success: true });
}
