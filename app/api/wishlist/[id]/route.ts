import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { createErrorResponse, createUnauthorizedError, createValidationError } from "@/lib/utils/api-error";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/wishlist/[id] - Get a single wishlist item
export async function GET(request: Request, context: RouteContext) {
  const supabase = await createClient();
  const { id } = await context.params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const { data: item, error } = await supabase
    .from("wishlists")
    .select(`
      *,
      converted_envelope:envelopes!converted_envelope_id (
        id,
        name,
        current_balance,
        target_amount
      )
    `)
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return createErrorResponse(error, 400, "Failed to fetch wishlist item");
  }

  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  return NextResponse.json({ item });
}

// PATCH /api/wishlist/[id] - Update a wishlist item
const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  estimated_cost: z.number().min(0).optional().nullable(),
  image_url: z.string().url().optional().nullable().or(z.literal("")),
  link_url: z.string().url().optional().nullable().or(z.literal("")),
  status: z.enum(["active", "converted", "purchased"]).optional(),
  priority: z.number().int().min(0).optional(),
});

export async function PATCH(request: Request, context: RouteContext) {
  const supabase = await createClient();
  const { id } = await context.params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return createValidationError("Invalid JSON");
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 400 }
    );
  }

  // Verify item exists and belongs to user
  const { data: existing } = await supabase
    .from("wishlists")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  // Build update object with only provided fields
  const updateData: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description || null;
  if (parsed.data.estimated_cost !== undefined) updateData.estimated_cost = parsed.data.estimated_cost;
  if (parsed.data.image_url !== undefined) updateData.image_url = parsed.data.image_url || null;
  if (parsed.data.link_url !== undefined) updateData.link_url = parsed.data.link_url || null;
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
  if (parsed.data.priority !== undefined) updateData.priority = parsed.data.priority;

  if (Object.keys(updateData).length === 0) {
    return createValidationError("No fields to update");
  }

  const { data: item, error } = await supabase
    .from("wishlists")
    .update(updateData)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return createErrorResponse(error, 400, "Failed to update wishlist item");
  }

  return NextResponse.json({ item });
}

// DELETE /api/wishlist/[id] - Delete a wishlist item
export async function DELETE(request: Request, context: RouteContext) {
  const supabase = await createClient();
  const { id } = await context.params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const { error } = await supabase
    .from("wishlists")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return createErrorResponse(error, 400, "Failed to delete wishlist item");
  }

  return NextResponse.json({ success: true });
}
