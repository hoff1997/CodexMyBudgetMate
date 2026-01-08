import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteContext {
  params: Promise<{ childId: string; id: string }>;
}

// GET /api/kids/[childId]/wishlist/[id] - Get a single wishlist item
export async function GET(request: Request, context: RouteContext) {
  const supabase = await createClient();
  const { childId, id } = await context.params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify parent owns this child
  const { data: child, error: childError } = await supabase
    .from("child_profiles")
    .select("id, parent_user_id")
    .eq("id", childId)
    .eq("parent_user_id", user.id)
    .maybeSingle();

  if (childError || !child) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  // Get the wishlist item
  const { data: item, error: itemError } = await supabase
    .from("teen_wishlists")
    .select(`
      *,
      converted_goal:teen_savings_goals (
        id,
        name,
        target_amount,
        current_amount
      )
    `)
    .eq("id", id)
    .eq("child_profile_id", childId)
    .maybeSingle();

  if (itemError) {
    return NextResponse.json({ error: itemError.message }, { status: 400 });
  }

  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  return NextResponse.json({ item });
}

// PATCH /api/kids/[childId]/wishlist/[id] - Update a wishlist item
export async function PATCH(request: Request, context: RouteContext) {
  const supabase = await createClient();
  const { childId, id } = await context.params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify parent owns this child
  const { data: child, error: childError } = await supabase
    .from("child_profiles")
    .select("id, parent_user_id")
    .eq("id", childId)
    .eq("parent_user_id", user.id)
    .maybeSingle();

  if (childError || !child) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  // Verify item exists and belongs to this child
  const { data: existing } = await supabase
    .from("teen_wishlists")
    .select("id")
    .eq("id", id)
    .eq("child_profile_id", childId)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const body = await request.json();
  const { name, description, estimated_cost, image_url, link_url } = body;

  // Build update object with only provided fields
  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name.trim();
  if (description !== undefined) updateData.description = description?.trim() || null;
  if (estimated_cost !== undefined) updateData.estimated_cost = estimated_cost;
  if (image_url !== undefined) updateData.image_url = image_url?.trim() || null;
  if (link_url !== undefined) updateData.link_url = link_url?.trim() || null;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { data: item, error: updateError } = await supabase
    .from("teen_wishlists")
    .update(updateData)
    .eq("id", id)
    .eq("child_profile_id", childId)
    .select(`
      *,
      converted_goal:teen_savings_goals (
        id,
        name,
        target_amount,
        current_amount
      )
    `)
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json({ item });
}

// DELETE /api/kids/[childId]/wishlist/[id] - Delete a wishlist item
export async function DELETE(request: Request, context: RouteContext) {
  const supabase = await createClient();
  const { childId, id } = await context.params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify parent owns this child
  const { data: child, error: childError } = await supabase
    .from("child_profiles")
    .select("id, parent_user_id")
    .eq("id", childId)
    .eq("parent_user_id", user.id)
    .maybeSingle();

  if (childError || !child) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  const { error: deleteError } = await supabase
    .from("teen_wishlists")
    .delete()
    .eq("id", id)
    .eq("child_profile_id", childId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
