import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// POST /api/shopping/categories/reorder - Reorder categories
export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { order } = body;

  if (!order || !Array.isArray(order)) {
    return NextResponse.json(
      { error: "Order array is required" },
      { status: 400 }
    );
  }

  // Update each category's sort order
  const updates = order.map(
    (item: { id: string; sort_order: number }) =>
      supabase
        .from("shopping_categories")
        .update({ default_sort_order: item.sort_order })
        .eq("id", item.id)
        .eq("parent_user_id", user.id)
  );

  const results = await Promise.all(updates);

  const errors = results.filter((r) => r.error);
  if (errors.length > 0) {
    console.error("Error reordering categories:", errors);
    return NextResponse.json(
      { error: "Failed to reorder some categories" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
