import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { snoozeSuggestedEnvelope, unsnoozeSuggestedEnvelope } from "@/lib/utils/suggested-envelopes";

const schema = z.object({
  envelopeId: z.string().uuid(),
  days: z.number().int().min(1).max(90).optional(), // If not provided, unsnooze
});

/**
 * POST /api/envelopes/suggested/snooze
 * Snooze or unsnooze a suggested envelope
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

  const { envelopeId, days } = parsed.data;

  // If days provided, snooze. Otherwise, unsnooze.
  const result = days
    ? await snoozeSuggestedEnvelope(supabase, user.id, envelopeId, days)
    : await unsnoozeSuggestedEnvelope(supabase, user.id, envelopeId);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    snoozedUntil: 'snoozedUntil' in result ? result.snoozedUntil : null,
  });
}
