import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { checkBetaAccess } from "@/lib/utils/beta-access";
import { LifeSettingsClient } from "./life-settings-client";

export const metadata = {
  title: "Life Settings | My Budget Mate",
  description: "Configure your Life module preferences",
};

export default async function LifeSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Check beta access
  const betaAccess = await checkBetaAccess();
  if (!betaAccess.hasAccess) {
    redirect("/dashboard");
  }

  return <LifeSettingsClient />;
}
