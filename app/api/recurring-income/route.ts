import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const frequencySchema = z.enum(["weekly", "fortnightly", "monthly", "quarterly", "annually", "none"]);

const allocationSchema = z.object({
  envelope: z.string().trim().min(1),
  amount: z.number().nonnegative(),
  envelopeId: z.string().uuid().optional(),
});

const baseSchema = z.object({
  name: z.string().trim().min(1),
  amount: z.number().nonnegative(),
  frequency: frequencySchema,
  nextDate: z.string().trim().optional(),
  allocations: z.array(allocationSchema).default([]),
  surplusEnvelope: z.string().trim().optional(),
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

export async function GET() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("recurring_income")
    .select(listColumns.join(", "))
    .eq("user_id", session.user.id)
    .order("name", { ascending: true })
    .returns<DbStream[]>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    streams: (data ?? []).map((stream) => formatStream(stream)),
  });
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
  const parsed = baseSchema.safeParse({
    ...body,
    amount: typeof body.amount === "string" ? Number(body.amount) : body.amount,
    allocations: Array.isArray(body.allocations) ? body.allocations : [],
  });

  if (!parsed.success) {
    const message = parsed.error.flatten().formErrors[0] ?? "Invalid payload";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const payload = parsed.data;

  const { data, error } = await supabase
    .from("recurring_income")
    .insert({
      user_id: session.user.id,
      name: payload.name,
      amount: payload.amount,
      frequency: payload.frequency,
      next_date: normaliseDate(payload.nextDate),
      allocations: cleanAllocations(payload.allocations),
      surplus_envelope: payload.surplusEnvelope ?? null,
    })
    .select(listColumns.join(", "))
    .returns<DbStream>()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data) {
    return NextResponse.json({ error: "Unable to save income stream" }, { status: 500 });
  }

  return NextResponse.json(
    {
      stream: formatStream(data),
    },
    { status: 201 },
  );
}
