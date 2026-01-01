import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  icon: z.string().max(10).optional(),
  display_order: z.number().int().min(0).optional(),
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

  // Try with full schema
  const fullResult = await supabase
    .from("envelope_categories")
    .select("id, name, icon, is_system, display_order, created_at, updated_at")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!fullResult.error) {
    return NextResponse.json({ category: fullResult.data });
  }

  // Fallback to minimal schema
  const minimalResult = await supabase
    .from("envelope_categories")
    .select("id, name, created_at, updated_at")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (minimalResult.error) {
    console.error("Failed to fetch envelope category:", minimalResult.error);
    return NextResponse.json({ error: minimalResult.error.message }, { status: 404 });
  }

  const category = {
    ...minimalResult.data,
    icon: null,
    is_system: false,
    display_order: 0,
  };

  return NextResponse.json({ category });
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

  // Verify category belongs to user - try full schema first
  let existingCategory: { id: string; is_system?: boolean } | null = null;

  const fullCheck = await supabase
    .from("envelope_categories")
    .select("id, is_system")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!fullCheck.error) {
    existingCategory = fullCheck.data;
  } else {
    // Try minimal schema
    const minimalCheck = await supabase
      .from("envelope_categories")
      .select("id")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single();

    if (minimalCheck.error || !minimalCheck.data) {
      return NextResponse.json(
        { error: "Category not found or unauthorised" },
        { status: 404 }
      );
    }
    existingCategory = { id: minimalCheck.data.id, is_system: false };
  }

  if (!existingCategory) {
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

  // Build update data based on what's being updated
  const updateData: Record<string, unknown> = {};

  // System categories can only have display_order updated
  if (existingCategory.is_system) {
    if (parsed.data.display_order !== undefined) {
      updateData.display_order = parsed.data.display_order;
    }
  } else {
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name.trim();
    if (parsed.data.icon !== undefined) updateData.icon = parsed.data.icon || null;
    if (parsed.data.display_order !== undefined) updateData.display_order = parsed.data.display_order;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ category: existingCategory });
  }

  // Try update with full schema
  const fullUpdate = await supabase
    .from("envelope_categories")
    .update(updateData)
    .eq("id", params.id)
    .eq("user_id", user.id)
    .select("id, name, icon, is_system, display_order")
    .single();

  if (!fullUpdate.error) {
    return NextResponse.json({ category: fullUpdate.data });
  }

  // Fallback - remove fields that may not exist
  const minimalUpdateData: Record<string, unknown> = {};
  if (updateData.name !== undefined) minimalUpdateData.name = updateData.name;

  if (Object.keys(minimalUpdateData).length === 0) {
    // Nothing to update in minimal schema
    return NextResponse.json({ category: existingCategory });
  }

  const minimalUpdate = await supabase
    .from("envelope_categories")
    .update(minimalUpdateData)
    .eq("id", params.id)
    .eq("user_id", user.id)
    .select("id, name")
    .single();

  if (minimalUpdate.error) {
    console.error("Failed to update envelope category:", minimalUpdate.error);
    return NextResponse.json({ error: minimalUpdate.error.message }, { status: 400 });
  }

  const category = {
    ...minimalUpdate.data,
    icon: null,
    is_system: false,
    display_order: 0,
  };

  return NextResponse.json({ category });
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

  // Verify category belongs to user and check if it's a system category
  const fullCheck = await supabase
    .from("envelope_categories")
    .select("id, is_system")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!fullCheck.error && fullCheck.data) {
    // Full schema - check system flag
    if (fullCheck.data.is_system) {
      return NextResponse.json(
        { error: "Cannot delete system category" },
        { status: 400 }
      );
    }
  } else {
    // Try minimal schema
    const minimalCheck = await supabase
      .from("envelope_categories")
      .select("id")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single();

    if (minimalCheck.error || !minimalCheck.data) {
      return NextResponse.json(
        { error: "Category not found or unauthorised" },
        { status: 404 }
      );
    }
  }

  // Delete category (envelopes will have category_id set to NULL via ON DELETE SET NULL)
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
