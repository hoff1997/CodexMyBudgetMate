import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { checkBetaAccess } from "@/lib/utils/beta-access";
import { KidsSetupClient } from "./kids-setup-client";

export default async function KidsSetupPage() {
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

  // Fetch existing child profiles
  const { data: children } = await supabase
    .from("child_profiles")
    .select(
      `
      id,
      name,
      date_of_birth,
      avatar_url,
      family_access_code,
      star_balance,
      screen_time_balance,
      created_at
    `
    )
    .eq("parent_user_id", user.id)
    .order("created_at", { ascending: true });

  return <KidsSetupClient initialChildren={children || []} />;
}
