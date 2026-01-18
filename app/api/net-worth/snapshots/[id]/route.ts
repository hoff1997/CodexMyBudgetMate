import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createErrorResponse, createUnauthorizedError, createValidationError } from "@/lib/utils/api-error";

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
    return createUnauthorizedError();
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
    return createValidationError(
      parsed.error.flatten().formErrors[0] ?? "Invalid payload"
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
      return createValidationError("Invalid snapshot date");
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
    return createErrorResponse(error, 400, "Failed to update snapshot");
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
    return createUnauthorizedError();
  }

  const { error, count } = await supabase
    .from("net_worth_snapshots")
    .delete({ count: "exact" })
    .eq("id", params.id)
    .eq("user_id", user.id);

  if (error) {
    return createErrorResponse(error, 400, "Failed to delete snapshot");
  }

  if (!count) {
    return NextResponse.json({ error: "Snapshot not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
