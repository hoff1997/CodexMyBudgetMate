import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createErrorResponse, createUnauthorizedError, createValidationError } from "@/lib/utils/api-error";

const schema = z.object({
  duplicateId: z.string().uuid(),
  decision: z.enum(["merge", "ignore"]),
  note: z.string().trim().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const payload = schema.safeParse(await request.json());
  if (!payload.success) {
    const message = payload.error.flatten().formErrors[0] ?? "Invalid payload";
    return createValidationError(message);
  }

  const { duplicateId, decision, note } = payload.data;

  const { data: event, error } = await supabase.rpc("resolve_transaction_duplicate", {
    p_user_id: user.id,
    p_primary_transaction_id: params.id,
    p_duplicate_transaction_id: duplicateId,
    p_decision: decision,
    p_note: note ?? null,
  });

  if (error) {
    return createErrorResponse(error, 400, "Failed to resolve duplicate");
  }

  const { data: updated, error: fetchError } = await supabase
    .from("transactions")
    .select("id, duplicate_of, duplicate_status, duplicate_reviewed_at")
    .in("id", [params.id, duplicateId]);

  if (fetchError) {
    return NextResponse.json(
      { event, warning: "Decision saved, but failed to refresh transactions", error: fetchError.message },
      { status: 207 },
    );
  }

  return NextResponse.json({ event, transactions: updated ?? [] });
}
