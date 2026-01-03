import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get all unique tags from user's recipes
  const { data: recipes } = await supabase
    .from("recipes")
    .select("tags")
    .eq("parent_user_id", user.id);

  const allTags = new Set<string>();
  recipes?.forEach((recipe) => {
    if (recipe.tags) {
      recipe.tags.forEach((tag: string) => allTags.add(tag));
    }
  });

  return NextResponse.json({ tags: Array.from(allTags).sort() });
}
