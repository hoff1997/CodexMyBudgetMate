import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const createCategorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  icon: z.string().min(1, "Icon is required"),
  color: z.string().min(1, "Color is required"),
});

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { data: categories, error } = await supabase
    .from("envelope_categories")
    .select("*")
    .eq("user_id", session.user.id)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Failed to fetch envelope categories:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Transform to camelCase for frontend
  const transformedCategories = (categories || []).map((cat) => ({
    id: cat.id,
    name: cat.name,
    icon: cat.icon,
    color: cat.color,
    sortOrder: cat.sort_order,
    userId: cat.user_id,
    isCollapsed: cat.is_collapsed ?? false,
    isActive: cat.is_active ?? true,
    createdAt: cat.created_at,
    updatedAt: cat.updated_at,
  }));

  return NextResponse.json({ categories: transformedCategories });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createCategorySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.errors },
      { status: 400 }
    );
  }

  const { name, icon, color } = parsed.data;

  // Get the highest sort_order to append new category at the end
  const { data: existingCategories } = await supabase
    .from("envelope_categories")
    .select("sort_order")
    .eq("user_id", session.user.id)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextSortOrder =
    existingCategories && existingCategories.length > 0
      ? (existingCategories[0].sort_order ?? 0) + 1
      : 0;

  const { data: category, error } = await supabase
    .from("envelope_categories")
    .insert({
      name,
      icon,
      color,
      user_id: session.user.id,
      sort_order: nextSortOrder,
      is_collapsed: false,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to create envelope category:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Transform to camelCase
  const transformedCategory = {
    id: category.id,
    name: category.name,
    icon: category.icon,
    color: category.color,
    sortOrder: category.sort_order,
    userId: category.user_id,
    isCollapsed: category.is_collapsed ?? false,
    isActive: category.is_active ?? true,
    createdAt: category.created_at,
    updatedAt: category.updated_at,
  };

  return NextResponse.json({ category: transformedCategory }, { status: 201 });
}
