import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const updateCategorySchema = z.object({
  name: z.string().min(1, "Category name is required").optional(),
  icon: z.string().min(1, "Icon is required").optional(),
  color: z.string().min(1, "Color is required").optional(),
  sort_order: z.number().int().min(0).optional(),
  is_collapsed: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { data: category, error } = await supabase
    .from("envelope_categories")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (error) {
    console.error("Failed to fetch envelope category:", error);
    return NextResponse.json({ error: error.message }, { status: 404 });
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

  return NextResponse.json({ category: transformedCategory });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  // Verify category belongs to user
  const { data: existingCategory, error: fetchError } = await supabase
    .from("envelope_categories")
    .select("id")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !existingCategory) {
    return NextResponse.json(
      { error: "Category not found or unauthorised" },
      { status: 404 }
    );
  }

  const body = await request.json();
  const parsed = updateCategorySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.errors },
      { status: 400 }
    );
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.icon !== undefined) updateData.icon = parsed.data.icon;
  if (parsed.data.color !== undefined) updateData.color = parsed.data.color;
  if (parsed.data.sort_order !== undefined)
    updateData.sort_order = parsed.data.sort_order;
  if (parsed.data.is_collapsed !== undefined)
    updateData.is_collapsed = parsed.data.is_collapsed;
  if (parsed.data.is_active !== undefined)
    updateData.is_active = parsed.data.is_active;

  const { data: category, error } = await supabase
    .from("envelope_categories")
    .update(updateData)
    .eq("id", params.id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    console.error("Failed to update envelope category:", error);
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

  return NextResponse.json({ category: transformedCategory });
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  // Verify category belongs to user
  const { data: existingCategory, error: fetchError } = await supabase
    .from("envelope_categories")
    .select("id")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !existingCategory) {
    return NextResponse.json(
      { error: "Category not found or unauthorised" },
      { status: 404 }
    );
  }

  // Check if any envelopes use this category
  const { data: envelopes, error: envelopesError } = await supabase
    .from("envelopes")
    .select("id")
    .eq("category_id", params.id)
    .limit(1);

  if (envelopesError) {
    console.error("Failed to check envelopes:", envelopesError);
    return NextResponse.json(
      { error: "Failed to verify category usage" },
      { status: 500 }
    );
  }

  if (envelopes && envelopes.length > 0) {
    return NextResponse.json(
      {
        error:
          "Cannot delete category with associated envelopes. Please reassign or delete the envelopes first.",
      },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("envelope_categories")
    .delete()
    .eq("id", params.id)
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to delete envelope category:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
