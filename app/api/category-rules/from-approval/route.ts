import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createRuleFromApproval } from "@/lib/services/transaction-rules";

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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { merchantName, envelopeId, matchType = "contains" } = body;

  if (!merchantName || !envelopeId) {
    return NextResponse.json(
      { error: "merchantName and envelopeId are required" },
      { status: 400 }
    );
  }

  // Verify envelope belongs to user
  const { data: envelope } = await supabase
    .from("envelopes")
    .select("id, name, icon")
    .eq("id", envelopeId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!envelope) {
    return NextResponse.json(
      { error: "Envelope not found" },
      { status: 404 }
    );
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
    return NextResponse.json(
      { error: result.error || "Failed to create rule" },
      { status: 400 }
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
