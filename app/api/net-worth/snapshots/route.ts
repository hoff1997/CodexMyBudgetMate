import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  totalAssets: z.number(),
  totalLiabilities: z.number(),
  netWorth: z.number(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = schema.safeParse({
    ...body,
    totalAssets: typeof body.totalAssets === "string" ? Number(body.totalAssets) : body.totalAssets,
    totalLiabilities:
      typeof body.totalLiabilities === "string" ? Number(body.totalLiabilities) : body.totalLiabilities,
    netWorth: typeof body.netWorth === "string" ? Number(body.netWorth) : body.netWorth,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { error } = await supabase
    .from("net_worth_snapshots")
    .insert({
      user_id: session.user.id,
      total_assets: parsed.data.totalAssets,
      total_liabilities: parsed.data.totalLiabilities,
      net_worth: parsed.data.netWorth,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
