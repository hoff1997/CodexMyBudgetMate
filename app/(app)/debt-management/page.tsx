import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DebtClient } from "./debt-client";

export default async function DebtManagementPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  // Fetch categories for the create dialog
  const { data: categories } = await supabase
    .from("envelope_categories")
    .select("id, name")
    .eq("user_id", session.user.id)
    .order("name");

  return <DebtClient categories={categories || []} />;
}
