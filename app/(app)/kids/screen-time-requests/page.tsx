import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ScreenTimeRequestsClient } from "./screen-time-requests-client";

export default async function ScreenTimeRequestsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch pending requests
  const { data: requestsRaw } = await supabase
    .from("screen_time_requests")
    .select(
      `
      *,
      child_profile:child_profiles(id, name, avatar)
    `
    )
    .eq("parent_user_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  // Transform child_profile from array to object
  const requests = (requestsRaw || []).map((req) => ({
    ...req,
    child_profile: Array.isArray(req.child_profile)
      ? req.child_profile[0] || null
      : req.child_profile,
  }));

  return <ScreenTimeRequestsClient initialRequests={requests} />;
}
