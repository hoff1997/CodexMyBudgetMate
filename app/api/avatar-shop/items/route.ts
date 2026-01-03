import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const childId = searchParams.get("child_id");
  const category = searchParams.get("category");

  let query = supabase
    .from("avatar_shop_items")
    .select("*")
    .order("tier")
    .order("star_cost");

  if (category && category !== "all") {
    query = query.eq("category", category);
  }

  const { data: items, error } = await query;

  if (error) {
    console.error("Error fetching shop items:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // If child_id provided, mark owned items
  if (childId) {
    const { data: inventory } = await supabase
      .from("child_avatar_inventory")
      .select("shop_item_id")
      .eq("child_profile_id", childId);

    const ownedIds = new Set(inventory?.map((i) => i.shop_item_id) || []);

    const itemsWithOwnership = items?.map((item) => ({
      ...item,
      owned: ownedIds.has(item.id),
    }));

    return NextResponse.json({ items: itemsWithOwnership });
  }

  return NextResponse.json({ items });
}
