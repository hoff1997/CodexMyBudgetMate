import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type {
  KidTransferRequest,
  RespondToTransferRequestRequest,
} from "@/lib/types/kids-invoice";
import { KidsNotifications } from "@/lib/services/notifications";
import { createErrorResponse, createUnauthorizedError, createValidationError, createNotFoundError } from "@/lib/utils/api-error";

interface RouteContext {
  params: Promise<{ childId: string; requestId: string }>;
}

// GET /api/kids/[childId]/transfer-requests/[requestId] - Get a specific transfer request
export async function GET(request: Request, context: RouteContext) {
  const supabase = await createClient();
  const { childId, requestId } = await context.params;

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

  // Get transfer request
  const { data: transferRequest, error } = await supabase
    .from("kid_transfer_requests")
    .select("*")
    .eq("id", requestId)
    .eq("child_profile_id", childId)
    .maybeSingle();

  if (error) {
    return createErrorResponse(error, 400, "Failed to fetch transfer request");
  }

  if (!transferRequest) {
    return createNotFoundError("Transfer request");
  }

  return NextResponse.json({
    request: transferRequest as KidTransferRequest,
    childName: child.name,
  });
}

// PATCH /api/kids/[childId]/transfer-requests/[requestId] - Respond to a transfer request
export async function PATCH(request: Request, context: RouteContext) {
  const supabase = await createClient();
  const { childId, requestId } = await context.params;

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

  // Get existing transfer request
  const { data: existing } = await supabase
    .from("kid_transfer_requests")
    .select("status")
    .eq("id", requestId)
    .eq("child_profile_id", childId)
    .maybeSingle();

  if (!existing) {
    return createNotFoundError("Transfer request");
  }

  if (existing.status !== "pending") {
    return createValidationError("Transfer request has already been responded to");
  }

  const body: RespondToTransferRequestRequest = await request.json();

  // Validate status
  if (!body.status || !["approved", "denied"].includes(body.status)) {
    return createValidationError("Status must be 'approved' or 'denied'");
  }

  // Update transfer request
  const { data: transferRequest, error } = await supabase
    .from("kid_transfer_requests")
    .update({
      status: body.status,
      parent_notes: body.parent_notes || null,
      responded_by: user.id,
      responded_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("child_profile_id", childId)
    .select()
    .single();

  if (error) {
    return createErrorResponse(error, 400, "Failed to update transfer request");
  }

  // Notify about the decision
  await KidsNotifications.transferDecision(
    supabase,
    user.id,
    child.name,
    childId,
    body.status === "approved",
    transferRequest.amount
  );

  const message =
    body.status === "approved"
      ? `Transfer request approved. Please make the bank transfer from ${child.name}'s ${transferRequest.from_envelope} to their spend account.`
      : "Transfer request denied.";

  return NextResponse.json({
    success: true,
    request: transferRequest as KidTransferRequest,
    message,
    childName: child.name,
  });
}

// DELETE /api/kids/[childId]/transfer-requests/[requestId] - Cancel a pending transfer request
export async function DELETE(request: Request, context: RouteContext) {
  const supabase = await createClient();
  const { childId, requestId } = await context.params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  // Verify parent owns this child
  const { data: child } = await supabase
    .from("child_profiles")
    .select("id")
    .eq("id", childId)
    .eq("parent_user_id", user.id)
    .maybeSingle();

  if (!child) {
    return createNotFoundError("Child");
  }

  // Only allow deleting pending requests
  const { data: existing } = await supabase
    .from("kid_transfer_requests")
    .select("status")
    .eq("id", requestId)
    .eq("child_profile_id", childId)
    .maybeSingle();

  if (!existing) {
    return createNotFoundError("Transfer request");
  }

  if (existing.status !== "pending") {
    return createValidationError("Can only delete pending transfer requests");
  }

  // Delete transfer request
  const { error } = await supabase
    .from("kid_transfer_requests")
    .delete()
    .eq("id", requestId)
    .eq("child_profile_id", childId);

  if (error) {
    return createErrorResponse(error, 400, "Failed to delete transfer request");
  }

  return NextResponse.json({ success: true });
}
