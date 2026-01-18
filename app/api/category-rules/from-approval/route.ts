import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createRuleFromApproval } from "@/lib/services/transaction-rules";
import {
  createErrorResponse,
  createUnauthorizedError,
  createValidationError,
  createNotFoundError,
} from "@/lib/utils/api-error";

/**
 * POST /api/category-rules/from-approval
 * Create a rule from a transaction approval (merchant -> envelope mapping)
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const body = await request.json();
  const { merchantName, envelopeId, matchType = "contains" } = body;

  if (!merchantName || !envelopeId) {
    return createValidationError("merchantName and envelopeId are required");
  }

  // Verify envelope belongs to user
  const { data: envelope } = await supabase
    .from("envelopes")
    .select("id, name, icon")
    .eq("id", envelopeId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!envelope) {
    return createNotFoundError("Envelope");
  }

  // Create the rule
  const result = await createRuleFromApproval(
    supabase,
    user.id,
    merchantName,
    envelopeId,
    matchType
  );

  if (!result.created) {
    return createErrorResponse(
      { message: result.error || "Failed to create rule" },
      400,
      "Failed to create rule"
    );
  }

  return NextResponse.json({
    success: true,
    ruleId: result.ruleId,
    message: `Rule created: "${merchantName}" will now be assigned to ${envelope.name}`,
    envelope: {
      id: envelope.id,
      name: envelope.name,
      icon: envelope.icon,
    },
  });
}
