import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/shopping/envelopes - Get envelopes suitable for shopping list linking
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get spending and tracking envelopes (most suitable for shopping)
  const { data: envelopes, error } = await supabase
    .from("envelopes")
    .select(`
      id,
      name,
      icon,
      subtype,
      current_balance,
      category:category_id (
        id,
        name
      )
    `)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .in("subtype", ["spending", "tracking", "bill"])
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Group by category and suggest "Groceries" type envelopes first
  const groceryKeywords = ["grocery", "groceries", "food", "shopping", "supermarket"];

  const sortedEnvelopes = (envelopes || []).sort((a, b) => {
    const aIsGrocery = groceryKeywords.some((kw) =>
      a.name.toLowerCase().includes(kw)
    );
    const bIsGrocery = groceryKeywords.some((kw) =>
      b.name.toLowerCase().includes(kw)
    );

    if (aIsGrocery && !bIsGrocery) return -1;
    if (!aIsGrocery && bIsGrocery) return 1;
    return a.name.localeCompare(b.name);
  });

  return NextResponse.json({
    envelopes: sortedEnvelopes.map((env) => ({
      id: env.id,
      name: env.name,
      icon: env.icon,
      subtype: env.subtype,
      current_balance: env.current_balance,
      category: env.category,
      is_suggested: groceryKeywords.some((kw) =>
        env.name.toLowerCase().includes(kw)
      ),
    })),
  });
}
