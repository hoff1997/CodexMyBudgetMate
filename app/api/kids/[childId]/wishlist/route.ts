import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteContext {
  params: Promise<{ childId: string }>;
}

// GET /api/kids/[childId]/wishlist - List all wishlist items for a child
export async function GET(request: Request, context: RouteContext) {
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

  // Get all wishlist items for this child with converted goal info
  const { data: items, error: itemsError } = await supabase
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
    .eq("child_profile_id", childId)
    .order("priority", { ascending: true });

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 400 });
  }

  return NextResponse.json({ items: items || [] });
}

// POST /api/kids/[childId]/wishlist - Create a new wishlist item
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
  const { name, description, estimated_cost, image_url, link_url } = body;

  if (!name || name.trim() === "") {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  // Get the max priority to add at the end
  const { data: maxPriority } = await supabase
    .from("teen_wishlists")
    .select("priority")
    .eq("child_profile_id", childId)
    .order("priority", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextPriority = (maxPriority?.priority ?? -1) + 1;

  // Create the wishlist item
  const { data: item, error: createError } = await supabase
    .from("teen_wishlists")
    .insert({
      child_profile_id: childId,
      name: name.trim(),
      description: description?.trim() || null,
      estimated_cost: estimated_cost || null,
      image_url: image_url?.trim() || null,
      link_url: link_url?.trim() || null,
      priority: nextPriority,
      status: "active",
    })
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

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 400 });
  }

  return NextResponse.json({ item }, { status: 201 });
}
