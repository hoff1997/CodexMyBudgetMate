import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteContext {
  params: Promise<{ childId: string }>;
}

// POST /api/kids/[childId]/wishlist/reorder - Batch update wishlist item priorities
export async function POST(request: Request, context: RouteContext) {
  const supabase = await createClient();
  const { childId } = await context.params;

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

  const body = await request.json();
  const { items } = body;

  if (!Array.isArray(items)) {
    return NextResponse.json(
      { error: "Items must be an array" },
      { status: 400 }
    );
  }

  // Validate all items have required fields
  for (const item of items) {
    if (!item.id || typeof item.priority !== "number") {
      return NextResponse.json(
        { error: "Each item must have id and priority" },
        { status: 400 }
      );
    }
  }

  // Update each item's priority
  const updates = items.map(async (item: { id: string; priority: number }) => {
    return supabase
      .from("teen_wishlists")
      .update({ priority: item.priority })
      .eq("id", item.id)
      .eq("child_profile_id", childId);
  });

  try {
    await Promise.all(updates);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true });
}
