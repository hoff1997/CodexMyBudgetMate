import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { KidsSettingsClient } from "./kids-settings-client";
import { KidsSettingsHeader } from "./kids-settings-header";

export default async function KidsSettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch all children for this parent
  // Use only basic columns that we know exist - settings-specific columns may not exist yet
  const { data: children, error: childrenError } = await supabase
    .from("child_profiles")
    .select(`
      id,
      name,
      date_of_birth,
      avatar_url,
      family_access_code
    `)
    .eq("parent_user_id", user.id)
    .order("created_at");

  if (childrenError) {
    console.error("Error fetching children:", childrenError);
  }

  // Fetch child feature access
  const { data: featureAccess } = await supabase
    .from("child_feature_access")
    .select("*")
    .in(
      "child_profile_id",
      children?.map((c) => c.id) || []
    );

  // Fetch payment settings for all children
  const { data: paymentSettings } = await supabase
    .from("kid_payment_settings")
    .select("*")
    .in(
      "child_profile_id",
      children?.map((c) => c.id) || []
    );

  // Map feature access and payment settings to children
  const childrenWithFeatures = children?.map((child) => ({
    ...child,
    featureAccess: featureAccess?.find((fa) => fa.child_profile_id === child.id) || null,
    paymentSettings: paymentSettings?.find((ps) => ps.child_profile_id === child.id) || null,
  }));

  return (
    <div className="container max-w-4xl py-6 space-y-6">
      <KidsSettingsHeader />

      <KidsSettingsClient children={childrenWithFeatures || []} />
    </div>
  );
}
