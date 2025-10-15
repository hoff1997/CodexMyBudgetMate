import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const createSchema = z.object({
  totalAssets: z.number(),
  totalLiabilities: z.number(),
  netWorth: z.number(),
  snapshotDate: z.string().optional(),
});

const listColumns = [
  "id",
  "snapshot_date",
  "total_assets",
  "total_liabilities",
  "net_worth",
] as const;

function normaliseSnapshotDate(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString().slice(0, 10);
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("net_worth_snapshots")
    .select(listColumns.join(", "))
    .eq("user_id", session.user.id)
    .order("snapshot_date", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ snapshots: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createSchema.safeParse({
    ...body,
    totalAssets: typeof body.totalAssets === "string" ? Number(body.totalAssets) : body.totalAssets,
    totalLiabilities:
      typeof body.totalLiabilities === "string" ? Number(body.totalLiabilities) : body.totalLiabilities,
    netWorth: typeof body.netWorth === "string" ? Number(body.netWorth) : body.netWorth,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const snapshotDate = normaliseSnapshotDate(parsed.data.snapshotDate);

  const { data: inserted, error } = await supabase
    .from("net_worth_snapshots")
    .insert({
      user_id: session.user.id,
      total_assets: parsed.data.totalAssets,
      total_liabilities: parsed.data.totalLiabilities,
      net_worth: parsed.data.netWorth,
      snapshot_date: snapshotDate,
    })
    .select(listColumns.join(", "))
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ snapshot: inserted }, { status: 201 });
}
