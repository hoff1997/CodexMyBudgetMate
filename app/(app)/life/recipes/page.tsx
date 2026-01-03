import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { checkBetaAccess } from "@/lib/utils/beta-access";
import { RecipesClient } from "./recipes-client";

export default async function RecipesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check beta access
  const betaAccess = await checkBetaAccess();
  if (!betaAccess.hasAccess) {
    redirect("/dashboard");
  }

  // Fetch recipes
  const { data: recipes } = await supabase
    .from("recipes")
    .select("*")
    .eq("parent_user_id", user.id)
    .order("created_at", { ascending: false });

  // Get unique tags
  const allTags = new Set<string>();
  recipes?.forEach((recipe) => {
    if (recipe.tags) {
      recipe.tags.forEach((tag: string) => allTags.add(tag));
    }
  });

  return (
    <RecipesClient
      initialRecipes={recipes || []}
      availableTags={Array.from(allTags).sort()}
    />
  );
}
