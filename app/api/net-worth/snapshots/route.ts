import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createErrorResponse, createUnauthorizedError, createValidationError } from "@/lib/utils/api-error";

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
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const { data, error } = await supabase
    .from("net_worth_snapshots")
    .select(listColumns.join(", "))
    .eq("user_id", user.id)
    .order("snapshot_date", { ascending: true });

  if (error) {
    return createErrorResponse(error, 400, "Failed to fetch snapshots");
  }

  return NextResponse.json({ snapshots: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
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
    return createValidationError("Invalid payload");
  }

  const snapshotDate = normaliseSnapshotDate(parsed.data.snapshotDate);

  const { data: inserted, error } = await supabase
    .from("net_worth_snapshots")
    .insert({
      user_id: user.id,
      total_assets: parsed.data.totalAssets,
      total_liabilities: parsed.data.totalLiabilities,
      net_worth: parsed.data.netWorth,
      snapshot_date: snapshotDate,
    })
    .select(listColumns.join(", "))
    .maybeSingle();

  if (error) {
    return createErrorResponse(error, 400, "Failed to create snapshot");
  }

  return NextResponse.json({ snapshot: inserted }, { status: 201 });
}
