import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

// Schema for bulk envelope reordering
const reorderSchema = z.object({
  envelopes: z.array(
    z.object({
      id: z.string().uuid(),
      sort_order: z.number().int().min(0),
      category_id: z.string().uuid().nullable().optional(),
    })
  ),
});

// Schema for bulk category reordering
const categoryReorderSchema = z.object({
  categories: z.array(
    z.object({
      id: z.string().uuid(),
      sort_order: z.number().int().min(0),
    })
  ),
});

/**
 * PUT /api/envelopes/reorder
 * Bulk update envelope sort orders and category assignments
 */
export async function PUT(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = reorderSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.errors },
      { status: 400 }
    );
  }

  const { envelopes } = parsed.data;

  // Update each envelope's sort_order and category_id
  const errors: string[] = [];

  for (const envelope of envelopes) {
    const updateData: { sort_order: number; category_id?: string | null } = {
      sort_order: envelope.sort_order,
    };

    // Only update category_id if it's explicitly provided
    if (envelope.category_id !== undefined) {
      updateData.category_id = envelope.category_id;
    }

    const { error } = await supabase
      .from("envelopes")
      .update(updateData)
      .eq("id", envelope.id)
      .eq("user_id", user.id);

    if (error) {
      errors.push(`Failed to update envelope ${envelope.id}: ${error.message}`);
    }
  }

  if (errors.length > 0) {
    console.error("Envelope reorder errors:", errors);
    return NextResponse.json(
      { error: "Some updates failed", details: errors },
      { status: 207 } // Multi-Status
    );
  }

  return NextResponse.json({ ok: true, updated: envelopes.length });
}

/**
 * PATCH /api/envelopes/reorder
 * Bulk update category sort orders
 */
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = categoryReorderSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.errors },
      { status: 400 }
    );
  }

  const { categories } = parsed.data;

  // Update each category's sort_order
  const errors: string[] = [];

  for (const category of categories) {
    const { error } = await supabase
      .from("envelope_categories")
      .update({ sort_order: category.sort_order })
      .eq("id", category.id)
      .eq("user_id", user.id);

    if (error) {
      errors.push(`Failed to update category ${category.id}: ${error.message}`);
    }
  }

  if (errors.length > 0) {
    console.error("Category reorder errors:", errors);
    return NextResponse.json(
      { error: "Some updates failed", details: errors },
      { status: 207 } // Multi-Status
    );
  }

  return NextResponse.json({ ok: true, updated: categories.length });
}
