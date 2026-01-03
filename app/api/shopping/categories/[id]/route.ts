import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/shopping/categories/[id] - Get a single category
export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: category, error } = await supabase
    .from("shopping_categories")
    .select("*")
    .eq("id", id)
    .eq("parent_user_id", user.id)
    .single();

  if (error || !category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  return NextResponse.json(category);
}

// PATCH /api/shopping/categories/[id] - Update a category
export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, icon, default_sort_order } = body;

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name.trim();
  if (icon !== undefined) updates.icon = icon;
  if (default_sort_order !== undefined) updates.default_sort_order = default_sort_order;

  const { data: category, error } = await supabase
    .from("shopping_categories")
    .update(updates)
    .eq("id", id)
    .eq("parent_user_id", user.id)
    .select()
    .single();

  if (error) {
    console.error("Error updating category:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(category);
}

// DELETE /api/shopping/categories/[id] - Delete a category
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
    .from("shopping_categories")
    .delete()
    .eq("id", id)
    .eq("parent_user_id", user.id);

  if (error) {
    console.error("Error deleting category:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
