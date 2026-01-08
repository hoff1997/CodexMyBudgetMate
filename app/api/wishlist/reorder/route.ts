import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

// POST /api/wishlist/reorder - Batch update priorities after drag-drop
const reorderSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().uuid(),
      priority: z.number().int().min(0),
    })
  ),
});

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = reorderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 400 }
    );
  }

  const { items } = parsed.data;

  // Verify all items belong to this user
  const itemIds = items.map((i) => i.id);
  const { data: existingItems, error: fetchError } = await supabase
    .from("wishlists")
    .select("id")
    .eq("user_id", user.id)
    .in("id", itemIds);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 400 });
  }

  const existingIds = new Set(existingItems?.map((i) => i.id) || []);
  const invalidIds = itemIds.filter((id) => !existingIds.has(id));

  if (invalidIds.length > 0) {
    return NextResponse.json(
      { error: "Some items not found or don't belong to you" },
      { status: 400 }
    );
  }

  // Update priorities in a batch
  const updates = items.map(({ id, priority }) =>
    supabase
      .from("wishlists")
      .update({ priority })
      .eq("id", id)
      .eq("user_id", user.id)
  );

  const results = await Promise.all(updates);

  // Check for any errors
  const errors = results.filter((r) => r.error);
  if (errors.length > 0) {
    console.error("Reorder errors:", errors);
    return NextResponse.json(
      { error: "Some updates failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
