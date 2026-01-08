import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

// GET /api/wishlist - List all wishlist items
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch wishlist items with converted envelope details
  const { data: items, error } = await supabase
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
    .eq("user_id", user.id)
    .order("priority", { ascending: true });

  if (error) {
    console.error("Error fetching wishlist:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ items: items || [] });
}

// POST /api/wishlist - Create new wishlist item
const createSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional().nullable(),
  estimated_cost: z.number().min(0).optional().nullable(),
  image_url: z.string().url().optional().nullable().or(z.literal("")),
  link_url: z.string().url().optional().nullable().or(z.literal("")),
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

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 400 }
    );
  }

  const { name, description, estimated_cost, image_url, link_url } = parsed.data;

  // Get the highest priority to add new item at the end
  const { data: lastItem } = await supabase
    .from("wishlists")
    .select("priority")
    .eq("user_id", user.id)
    .order("priority", { ascending: false })
    .limit(1)
    .maybeSingle();

  const newPriority = (lastItem?.priority ?? -1) + 1;

  const { data: item, error } = await supabase
    .from("wishlists")
    .insert({
      user_id: user.id,
      name,
      description: description || null,
      estimated_cost: estimated_cost || null,
      image_url: image_url || null,
      link_url: link_url || null,
      priority: newPriority,
      status: "active",
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating wishlist item:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ item }, { status: 201 });
}
