import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { createErrorResponse, createUnauthorizedError } from "@/lib/utils/api-error";

// GET /api/shopping/suggestions?q=query - Fetch item suggestions
export async function GET(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.toLowerCase().trim();

  if (!query || query.length < 2) {
    return NextResponse.json([]);
  }

  // Search for matching items in history, sorted by use_count
  const { data: suggestions, error } = await supabase
    .from("shopping_item_history")
    .select("item_name, category_id, aisle_name, use_count")
    .eq("parent_user_id", user.id)
    .ilike("item_name", `%${query}%`)
    .order("use_count", { ascending: false })
    .limit(10);

  if (error) {
    console.error("Error fetching suggestions:", error);
    return createErrorResponse(error, 500, "Failed to fetch suggestions");
  }

  // Transform to client format
  const result = (suggestions || []).map((item) => ({
    name: item.item_name,
    categoryId: item.category_id,
    aisleName: item.aisle_name,
    useCount: item.use_count,
  }));

  return NextResponse.json(result);
}
