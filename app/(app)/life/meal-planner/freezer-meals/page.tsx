import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { checkBetaAccess } from "@/lib/utils/beta-access";
import { FreezerMealsClient } from "./freezer-meals-client";

export default async function FreezerMealsPage() {
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

  // Fetch initial freezer meals
  const { data: freezerMeals } = await supabase
    .from("freezer_meals")
    .select("*")
    .eq("parent_user_id", user.id)
    .eq("is_used", false)
    .order("created_at", { ascending: false });

  return <FreezerMealsClient initialMeals={freezerMeals || []} />;
}
