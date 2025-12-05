/**
 * @deprecated This API is deprecated. Use /api/income-sources/[id] instead.
 *
 * The recurring_income table is being phased out in favor of:
 * - income_sources (for income stream configuration)
 * - envelope_income_allocations (for allocation rules)
 * - income_reconciliation_events (for reconciliation audit trail)
 *
 * This endpoint remains functional for backwards compatibility but will be removed
 * in a future release. All new development should use /api/income-sources.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// Deprecation warning header
const DEPRECATION_HEADER = {
  "X-Deprecated": "true",
  "X-Deprecation-Notice": "Use /api/income-sources/[id] instead. This endpoint will be removed in a future release.",
};

const frequencySchema = z.enum(["weekly", "fortnightly", "monthly", "quarterly", "annually", "none"]);

const allocationSchema = z.object({
  envelope: z.string().trim().min(1),
  amount: z.number().nonnegative(),
  envelopeId: z.string().uuid().optional(),
});

const updateSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    amount: z.number().nonnegative().optional(),
    frequency: frequencySchema.optional(),
    nextDate: z.string().trim().optional(),
    allocations: z.array(allocationSchema).optional(),
    surplusEnvelope: z.string().trim().optional().nullable(),
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one field is required",
  });

const listColumns = [
  "id",
  "name",
  "amount",
  "frequency",
  "next_date",
  "allocations",
  "surplus_envelope",
  "updated_at",
] as const;

type DbStream = {
  id: string;
  name: string;
  amount: number | string;
  frequency: string;
  next_date: string | null;
  allocations: any;
  surplus_envelope: string | null;
};

function normaliseDate(value?: string) {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString().slice(0, 10);
}

function cleanAllocations(
  allocations: Array<z.infer<typeof allocationSchema>>,
): Array<{ envelope: string; amount: number; envelope_id?: string | null }> {
  return allocations
    .filter((item) => item.amount >= 0)
    .map((item) => ({
      envelope: item.envelope.trim(),
      amount: Number(item.amount),
      envelope_id: item.envelopeId ?? null,
    }));
}

function formatStream(stream: DbStream) {
  const rawAllocations = Array.isArray(stream.allocations) ? stream.allocations : [];
  return {
    id: stream.id,
    name: stream.name,
    amount: Number(stream.amount ?? 0),
    frequency: stream.frequency,
    nextDate: stream.next_date,
    allocations: rawAllocations.map((allocation: any) => ({
      envelope: allocation.envelope ?? allocation.envelope_name ?? "",
      amount: Number(allocation.amount ?? 0),
      envelopeId: allocation.envelope_id ?? undefined,
    })),
    surplusEnvelope: stream.surplus_envelope,
  };
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
  const parseInput: Record<string, unknown> = { ...body };

  if (body.amount !== undefined) {
    parseInput.amount = typeof body.amount === "string" ? Number(body.amount) : body.amount;
  }
  if (body.frequency !== undefined) {
    parseInput.frequency = body.frequency;
  }
  if (body.allocations !== undefined) {
    parseInput.allocations = Array.isArray(body.allocations) ? body.allocations : null;
  }

  const parsed = updateSchema.safeParse(parseInput);

  if (!parsed.success) {
    const message = parsed.error.flatten().formErrors[0] ?? "Invalid payload";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const payload = parsed.data;
  const updates: Record<string, unknown> = {};

  if (payload.name !== undefined) updates.name = payload.name;
  if (payload.amount !== undefined) updates.amount = payload.amount;
  if (payload.frequency !== undefined) updates.frequency = payload.frequency;
  if (payload.nextDate !== undefined) updates.next_date = normaliseDate(payload.nextDate);
  if (payload.allocations !== undefined) updates.allocations = cleanAllocations(payload.allocations);
  if (payload.surplusEnvelope !== undefined)
    updates.surplus_envelope = payload.surplusEnvelope ?? null;
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("recurring_income")
    .update(updates)
    .eq("id", params.id)
    .eq("user_id", user.id)
    .select(listColumns.join(", "))
    .returns<DbStream>()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data) {
    return NextResponse.json({ error: "Income stream not found" }, { status: 404 });
  }

  return NextResponse.json(
    {
      stream: formatStream(data),
      _deprecated: true,
      _notice: "This API is deprecated. Use /api/income-sources/[id] instead.",
    },
    { headers: DEPRECATION_HEADER }
  );
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
    .from("recurring_income")
    .delete({ count: "exact" })
    .eq("id", params.id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!count) {
    return NextResponse.json({ error: "Income stream not found" }, { status: 404 });
  }

  return NextResponse.json(
    {
      ok: true,
      _deprecated: true,
      _notice: "This API is deprecated. Use /api/income-sources/[id] instead.",
    },
    { headers: DEPRECATION_HEADER }
  );
}
