import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createErrorResponse, createUnauthorizedError, createValidationError } from "@/lib/utils/api-error";

/**
 * Merchant Memory API
 *
 * Returns the most recently used envelope for a given merchant name.
 * This enables auto-suggestion of envelopes based on transaction history.
 *
 * Query params:
 * - merchant: The merchant name to search for (case-insensitive, partial match)
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const { searchParams } = new URL(request.url);
  const merchant = searchParams.get("merchant");

  if (!merchant || merchant.trim().length < 2) {
    return createValidationError("Merchant name must be at least 2 characters");
  }

  // Find the most recent transaction for this merchant with an assigned envelope
  const { data: recentTransactionRaw, error } = await supabase
    .from("transactions")
    .select(`
      id,
      merchant_name,
      envelope_id,
      envelopes!envelope_id(id, name),
      occurred_at
    `)
    .eq("user_id", user.id)
    .ilike("merchant_name", `%${merchant.trim()}%`)
    .not("envelope_id", "is", null)
    .order("occurred_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return createErrorResponse(error, 400, "Failed to fetch merchant memory");
  }

  // No matching transactions found
  if (!recentTransactionRaw) {
    return NextResponse.json({ suggestion: null });
  }

  // Transform the envelope from array to object
  const envelope = Array.isArray(recentTransactionRaw.envelopes)
    ? recentTransactionRaw.envelopes[0]
    : recentTransactionRaw.envelopes;

  // Return the suggested envelope
  return NextResponse.json({
    suggestion: {
      envelopeId: recentTransactionRaw.envelope_id,
      envelopeName: envelope?.name,
      merchantName: recentTransactionRaw.merchant_name,
      lastUsed: recentTransactionRaw.occurred_at,
      confidence: "high", // Could be calculated based on frequency in the future
    },
  });
}
