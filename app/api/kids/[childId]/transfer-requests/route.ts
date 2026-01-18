import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createErrorResponse, createUnauthorizedError, createValidationError, createNotFoundError } from "@/lib/utils/api-error";
import type {
  KidTransferRequest,
  CreateTransferRequestRequest,
} from "@/lib/types/kids-invoice";
import { KidsNotifications } from "@/lib/services/notifications";

interface RouteContext {
  params: Promise<{ childId: string }>;
}

// GET /api/kids/[childId]/transfer-requests - Get all transfer requests for a child
export async function GET(request: Request, context: RouteContext) {
  const supabase = await createClient();
  const { childId } = await context.params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  // Verify parent owns this child
  const { data: child } = await supabase
    .from("child_profiles")
    .select("id, name")
    .eq("id", childId)
    .eq("parent_user_id", user.id)
    .maybeSingle();

  if (!child) {
    return createNotFoundError("Child");
  }

  // Parse query params for filtering
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  // SECURITY: Cap limit to prevent DoS via unbounded queries
  const MAX_LIMIT = 100;
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), MAX_LIMIT);

  // Build query
  let query = supabase
    .from("kid_transfer_requests")
    .select("*")
    .eq("child_profile_id", childId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status) {
    query = query.eq("status", status);
  }

  const { data: requests, error } = await query;

  if (error) {
    return createErrorResponse(error, 400, "Failed to load transfer requests");
  }

  return NextResponse.json({
    childId,
    childName: child.name,
    requests: requests as KidTransferRequest[],
  });
}

// POST /api/kids/[childId]/transfer-requests - Create a new transfer request
export async function POST(request: Request, context: RouteContext) {
  const supabase = await createClient();
  const { childId } = await context.params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  // Verify parent owns this child
  const { data: child } = await supabase
    .from("child_profiles")
    .select("id, name")
    .eq("id", childId)
    .eq("parent_user_id", user.id)
    .maybeSingle();

  if (!child) {
    return createNotFoundError("Child");
  }

  const body: CreateTransferRequestRequest = await request.json();

  // Validate required fields
  if (!body.from_envelope) {
    return createValidationError("From envelope is required");
  }

  const validEnvelopes = ["save", "invest", "give"];
  if (!validEnvelopes.includes(body.from_envelope)) {
    return createValidationError("From envelope must be save, invest, or give");
  }

  if (!body.amount || body.amount <= 0) {
    return createValidationError("Amount must be positive");
  }

  // Check if child has sufficient balance in the from envelope
  // This would require checking child_bank_accounts or teen_linked_accounts
  // For now, we'll create the request and let the parent verify

  // Create transfer request
  const { data: transferRequest, error } = await supabase
    .from("kid_transfer_requests")
    .insert({
      child_profile_id: childId,
      from_envelope: body.from_envelope,
      to_envelope: "spend",
      amount: body.amount,
      reason: body.reason || null,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    return createErrorResponse(error, 400, "Failed to create transfer request");
  }

  // Notify parent about new transfer request
  await KidsNotifications.transferRequested(
    supabase,
    user.id,
    child.name,
    childId,
    transferRequest.id,
    body.amount,
    body.from_envelope,
    "Spend"
  );

  return NextResponse.json({
    success: true,
    request: transferRequest as KidTransferRequest,
    message: "Transfer request submitted for approval",
  });
}
