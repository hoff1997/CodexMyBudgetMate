import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type SplitPayload = {
  envelopeId: string;
  amount: number;
};

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = (await request.json()) as { splits: SplitPayload[] };
  const splits = Array.isArray(body.splits) ? body.splits : [];
  if (!splits.length) {
    return NextResponse.json({ error: "At least one split is required" }, { status: 400 });
  }

  const total = splits.reduce((sum, split) => sum + Number(split.amount ?? 0), 0);
  const diff = Math.abs(total);
  if (diff > 0.01) {
    return NextResponse.json({ error: "Split amounts must balance the transaction" }, { status: 400 });
  }

  // TODO: implement Supabase RPC/mutations to persist splits
  return NextResponse.json({ ok: true });
}
