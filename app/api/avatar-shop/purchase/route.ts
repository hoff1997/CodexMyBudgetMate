import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { child_id, item_id } = body;

  if (!child_id || !item_id) {
    return NextResponse.json(
      { error: "child_id and item_id required" },
      { status: 400 }
    );
  }

  // Get child's star balance (verify ownership)
  const { data: child } = await supabase
    .from("child_profiles")
    .select("id, star_balance, parent_user_id")
    .eq("id", child_id)
    .single();

  if (!child) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  // Verify parent owns this child
  if (child.parent_user_id !== user.id) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  // Get item cost
  const { data: item } = await supabase
    .from("avatar_shop_items")
    .select("*")
    .eq("id", item_id)
    .single();

  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  // Check if already owned
  const { data: existing } = await supabase
    .from("child_avatar_inventory")
    .select("id")
    .eq("child_profile_id", child_id)
    .eq("shop_item_id", item_id)
    .single();

  if (existing) {
    return NextResponse.json({ error: "Already owned" }, { status: 400 });
  }

  // Check sufficient balance
  const starBalance = child.star_balance || 0;
  if (starBalance < item.star_cost) {
    return NextResponse.json(
      {
        error: "Insufficient stars",
        needed: item.star_cost,
        have: starBalance,
      },
      { status: 400 }
    );
  }

  // Deduct stars
  const newBalance = starBalance - item.star_cost;
  await supabase
    .from("child_profiles")
    .update({ star_balance: newBalance })
    .eq("id", child_id);

  // Add to inventory
  await supabase.from("child_avatar_inventory").insert({
    child_profile_id: child_id,
    shop_item_id: item_id,
  });

  // Create star transaction record
  await supabase.from("star_transactions").insert({
    child_profile_id: child_id,
    amount: -item.star_cost,
    source: "shop_purchase",
    reference_id: item_id,
    description: `Purchased: ${item.name}`,
  });

  return NextResponse.json({
    success: true,
    item,
    new_balance: newBalance,
    celebration: true,
  });
}
