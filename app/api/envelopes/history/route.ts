import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { mapTransferHistory } from "@/lib/types/envelopes";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limit = Math.min(Number.parseInt(url.searchParams.get("limit") ?? "20", 10), 100);
  const envelopeFilter = url.searchParams.get("envelopeId");

  let query = supabase
    .from("envelope_transfers")
    .select(
      "id, amount, note, created_at, from_envelope:from_envelope_id(id, name), to_envelope:to_envelope_id(id, name)",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(Number.isFinite(limit) && limit > 0 ? limit : 20);

  if (envelopeFilter) {
    query = query.or(`from_envelope_id.eq.${envelopeFilter},to_envelope_id.eq.${envelopeFilter}`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ transfers: mapTransferHistory(data as any) });
}
