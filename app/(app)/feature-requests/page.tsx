import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FeatureRequestsClient } from "@/components/layout/feature-requests/feature-requests-client";

export default async function FeatureRequestsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <FeatureRequestsClient />;
}
