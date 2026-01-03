import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/freezer-meals/[id]
 * Get a single freezer meal
 */
export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("freezer_meals")
    .select("*")
    .eq("id", id)
    .eq("parent_user_id", user.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ freezerMeal: data });
}

/**
 * PUT /api/freezer-meals/[id]
 * Update a freezer meal
 */
export async function PUT(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  // Build update payload
  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.name !== undefined) {
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    updatePayload.name = body.name.trim();
  }

  if (body.description !== undefined) {
    updatePayload.description = body.description?.trim() || null;
  }

  if (body.servings !== undefined) {
    updatePayload.servings = body.servings || null;
  }

  if (body.date_frozen !== undefined) {
    updatePayload.date_frozen = body.date_frozen || null;
  }

  if (body.expiry_date !== undefined) {
    updatePayload.expiry_date = body.expiry_date || null;
  }

  if (body.tags !== undefined) {
    updatePayload.tags = body.tags || [];
  }

  // Handle marking as used/unused
  if (body.is_used !== undefined) {
    updatePayload.is_used = body.is_used;
    if (body.is_used) {
      updatePayload.used_at = new Date().toISOString();
    } else {
      updatePayload.used_at = null;
    }
  }

  const { data, error } = await supabase
    .from("freezer_meals")
    .update(updatePayload)
    .eq("id", id)
    .eq("parent_user_id", user.id)
    .select()
    .single();

  if (error) {
    console.error("[freezer-meals] PUT error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ freezerMeal: data });
}

/**
 * DELETE /api/freezer-meals/[id]
 * Delete a freezer meal
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("freezer_meals")
    .delete()
    .eq("id", id)
    .eq("parent_user_id", user.id);

  if (error) {
    console.error("[freezer-meals] DELETE error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
