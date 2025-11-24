import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const updateSchema = z
  .object({
    totalAssets: z.number().optional(),
    totalLiabilities: z.number().optional(),
    netWorth: z.number().optional(),
    snapshotDate: z.string().optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one field is required",
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

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await request.json();
  const normalised: Record<string, unknown> = { ...body };
  if (normalised.totalAssets !== undefined) {
    normalised.totalAssets =
      typeof normalised.totalAssets === "string"
        ? Number(normalised.totalAssets)
        : normalised.totalAssets;
  }
  if (normalised.totalLiabilities !== undefined) {
    normalised.totalLiabilities =
      typeof normalised.totalLiabilities === "string"
        ? Number(normalised.totalLiabilities)
        : normalised.totalLiabilities;
  }
  if (normalised.netWorth !== undefined) {
    normalised.netWorth =
      typeof normalised.netWorth === "string" ? Number(normalised.netWorth) : normalised.netWorth;
  }

  const parsed = updateSchema.safeParse(normalised);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().formErrors[0] ?? "Invalid payload" },
      { status: 400 },
    );
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.totalAssets !== undefined) updates.total_assets = parsed.data.totalAssets;
  if (parsed.data.totalLiabilities !== undefined)
    updates.total_liabilities = parsed.data.totalLiabilities;
  if (parsed.data.netWorth !== undefined) updates.net_worth = parsed.data.netWorth;
  if (parsed.data.snapshotDate !== undefined) {
    const snapshotDate = normaliseSnapshotDate(parsed.data.snapshotDate);
    if (!snapshotDate) {
      return NextResponse.json({ error: "Invalid snapshot date" }, { status: 400 });
    }
    updates.snapshot_date = snapshotDate;
  }

  const { data, error } = await supabase
    .from("net_worth_snapshots")
    .update(updates)
    .eq("id", params.id)
    .eq("user_id", user.id)
    .select(listColumns.join(", "))
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data) {
    return NextResponse.json({ error: "Snapshot not found" }, { status: 404 });
  }

  return NextResponse.json({ snapshot: data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { error, count } = await supabase
    .from("net_worth_snapshots")
    .delete({ count: "exact" })
    .eq("id", params.id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!count) {
    return NextResponse.json({ error: "Snapshot not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
