import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { checkBetaAccess } from "@/lib/utils/beta-access";
import { TransferRequestsClient } from "./transfer-requests-client";

export const metadata = {
  title: "Transfer Requests | Kids",
  description: "Review and manage your children's money transfer requests",
};

export default async function TransferRequestsPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/sign-in");
  }

  // Check beta access
  const betaAccess = await checkBetaAccess();
  if (!betaAccess.hasAccess) {
    redirect("/dashboard");
  }

  // Get all children for this parent
  const { data: children, error: childrenError } = await supabase
    .from("child_profiles")
    .select("id, name, avatar_url")
    .eq("parent_user_id", user.id)
    .order("name");

  if (childrenError) {
    console.error("Error fetching children:", childrenError);
  }

  // Get all transfer requests for all children
  const childIds = (children || []).map((c) => c.id);

  let requests: any[] = [];
  if (childIds.length > 0) {
    const { data: requestsData, error: requestsError } = await supabase
      .from("kid_transfer_requests")
      .select("*")
      .in("child_profile_id", childIds)
      .order("created_at", { ascending: false });

    if (requestsError) {
      console.error("Error fetching transfer requests:", requestsError);
    } else {
      requests = requestsData || [];
    }
  }

  // Map children data
  const childrenMap = new Map((children || []).map((c) => [c.id, c]));

  // Enrich requests with child info
  const enrichedRequests = requests.map((req) => ({
    ...req,
    childName: childrenMap.get(req.child_profile_id)?.name || "Unknown",
    childAvatar: childrenMap.get(req.child_profile_id)?.avatar_url,
  }));

  // Separate pending and resolved
  const pendingRequests = enrichedRequests.filter((r) => r.status === "pending");
  const resolvedRequests = enrichedRequests.filter((r) => r.status !== "pending");

  return (
    <TransferRequestsClient
      pendingRequests={pendingRequests}
      resolvedRequests={resolvedRequests}
      children={children || []}
    />
  );
}
