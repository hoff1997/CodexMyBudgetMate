import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { checkBetaAccess } from "@/lib/utils/beta-access";
import { RecipeDetailClient } from "./recipe-detail-client";

interface Props {
  params: { id: string };
}

export default async function RecipeDetailPage({ params }: Props) {
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

  // Fetch recipe
  const { data: recipe, error } = await supabase
    .from("recipes")
    .select("*")
    .eq("id", params.id)
    .eq("parent_user_id", user.id)
    .single();

  if (error || !recipe) {
    notFound();
  }

  return <RecipeDetailClient recipe={recipe} />;
}
