import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GoalsClient } from "./goals-client";

export default async function GoalsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch categories for the create dialog
  const { data: categories } = await supabase
    .from("envelope_categories")
    .select("id, name")
    .eq("user_id", user.id)
    .order("name");

  return <GoalsClient categories={categories || []} />;
}
