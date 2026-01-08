import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteContext {
  params: Promise<{ childId: string }>;
}

// GET /api/kids/[childId]/bank-link/status - Get bank linking status
export async function GET(request: Request, context: RouteContext) {
  const supabase = await createClient();
  const { childId } = await context.params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify parent owns this child
  const { data: child, error: childError } = await supabase
    .from("child_profiles")
    .select(`
      id,
      name,
      date_of_birth,
      bank_linking_enabled,
      bank_linking_approved_at,
      min_age_for_bank_linking
    `)
    .eq("id", childId)
    .eq("parent_user_id", user.id)
    .maybeSingle();

  if (childError || !child) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  // Calculate age
  let age: number | null = null;
  let isEligible = false;
  const minAge = child.min_age_for_bank_linking || 13;

  if (child.date_of_birth) {
    age = Math.floor(
      (Date.now() - new Date(child.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    );
    isEligible = age >= minAge;
  }

  // Get pending request
  const { data: pendingRequest } = await supabase
    .from("teen_bank_link_requests")
    .select("*")
    .eq("child_profile_id", childId)
    .eq("request_status", "pending")
    .maybeSingle();

  // Get active connection
  const { data: connection } = await supabase
    .from("teen_akahu_connections")
    .select("*")
    .eq("child_profile_id", childId)
    .maybeSingle();

  // Get linked accounts
  const { data: linkedAccounts } = await supabase
    .from("teen_linked_accounts")
    .select("*")
    .eq("child_profile_id", childId)
    .eq("is_active", true);

  // Determine overall status
  let overallStatus: "not_eligible" | "not_requested" | "pending_approval" | "approved_pending_link" | "connected" | "error";

  if (!isEligible) {
    overallStatus = "not_eligible";
  } else if (!child.bank_linking_enabled && !pendingRequest) {
    overallStatus = "not_requested";
  } else if (pendingRequest) {
    overallStatus = "pending_approval";
  } else if (connection?.connection_status === "active" && linkedAccounts && linkedAccounts.length > 0) {
    overallStatus = "connected";
  } else if (connection?.connection_status === "error") {
    overallStatus = "error";
  } else if (child.bank_linking_enabled) {
    overallStatus = "approved_pending_link";
  } else {
    overallStatus = "not_requested";
  }

  return NextResponse.json({
    childName: child.name,
    age,
    minAge,
    isEligible,
    bankLinkingEnabled: child.bank_linking_enabled,
    approvedAt: child.bank_linking_approved_at,
    overallStatus,
    pendingRequest,
    connection,
    linkedAccounts: linkedAccounts || [],
    statusMessages: {
      not_eligible: `${child.name} must be at least ${minAge} years old to link a bank account.`,
      not_requested: `${child.name} hasn't requested to link their bank account yet.`,
      pending_approval: `Waiting for your approval to link ${child.name}'s bank account.`,
      approved_pending_link: `${child.name} can now connect their bank account via Akahu.`,
      connected: `${child.name}'s bank account is connected and syncing.`,
      error: `There was an error with ${child.name}'s bank connection. Please try reconnecting.`,
    },
  });
}
