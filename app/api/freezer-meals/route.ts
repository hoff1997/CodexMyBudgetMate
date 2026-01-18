import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createErrorResponse,
  createUnauthorizedError,
  createValidationError,
} from "@/lib/utils/api-error";

/**
 * GET /api/freezer-meals
 * Get all freezer meals for the user
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const { searchParams } = new URL(request.url);
  const showUsed = searchParams.get("show_used") === "true";

  let query = supabase
    .from("freezer_meals")
    .select("*")
    .eq("parent_user_id", user.id)
    .order("created_at", { ascending: false });

  // By default, only show unused items
  if (!showUsed) {
    query = query.eq("is_used", false);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[freezer-meals] GET error:", error);
    return createErrorResponse(error, 400, "Failed to fetch freezer meals");
  }

  return NextResponse.json({ freezerMeals: data || [] });
}

/**
 * POST /api/freezer-meals
 * Create a new freezer meal
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const body = await request.json();

  if (!body.name?.trim()) {
    return createValidationError("Name is required");
  }

  const { data, error } = await supabase
    .from("freezer_meals")
    .insert({
      parent_user_id: user.id,
      name: body.name.trim(),
      description: body.description?.trim() || null,
      servings: body.servings || null,
      date_frozen: body.date_frozen || null,
      expiry_date: body.expiry_date || null,
      tags: body.tags || [],
    })
    .select()
    .single();

  if (error) {
    console.error("[freezer-meals] POST error:", error);
    return createErrorResponse(error, 400, "Failed to create freezer meal");
  }

  return NextResponse.json({ freezerMeal: data });
}
