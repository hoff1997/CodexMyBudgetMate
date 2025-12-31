import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { dismissSuggestedEnvelope, restoreSuggestedEnvelope } from "@/lib/utils/suggested-envelopes";

const schema = z.object({
  envelopeId: z.string().uuid(),
  dismiss: z.boolean(), // true to dismiss, false to restore
});

/**
 * POST /api/envelopes/suggested/dismiss
 * Dismiss or restore a suggested envelope
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error },
      { status: 400 }
    );
  }

  const { envelopeId, dismiss } = parsed.data;

  const result = dismiss
    ? await dismissSuggestedEnvelope(supabase, user.id, envelopeId)
    : await restoreSuggestedEnvelope(supabase, user.id, envelopeId);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, dismissed: dismiss });
}
