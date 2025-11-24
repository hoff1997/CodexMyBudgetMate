import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const payloadSchema = z.object({
  labels: z.array(z.string().trim().min(1)).optional(),
  mode: z.enum(["replace", "append"]).default("replace"),
});

const colourPalette = [
  "#0ea5e9",
  "#f97316",
  "#22c55e",
  "#6366f1",
  "#f59e0b",
  "#06b6d4",
  "#ef4444",
  "#e879f9",
  "#a855f7",
];

function pickColour(index: number) {
  return colourPalette[index % colourPalette.length];
}

export async function GET(
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

  const { data: transaction, error: txError } = await supabase
    .from("transactions")
    .select("id")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (txError) {
    return NextResponse.json({ error: txError.message }, { status: 400 });
  }

  if (!transaction) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  const { data: transactionLabels, error: labelsError } = await supabase
    .from("transaction_labels")
    .select(`
      label_id,
      labels (
        id,
        name,
        colour
      )
    `)
    .eq("transaction_id", params.id)
    .eq("user_id", user.id);

  if (labelsError) {
    return NextResponse.json({ error: labelsError.message }, { status: 400 });
  }

  const labels = (transactionLabels ?? [])
    .map((tl: any) => tl.labels)
    .filter(Boolean);

  return NextResponse.json({ labels });
}

export async function POST(
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

  const payloadRaw = await request.json();
  const parsed = payloadSchema.safeParse(payloadRaw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().formErrors[0] ?? "Invalid payload" },
      { status: 400 },
    );
  }

  const payload = parsed.data;
  const labelsRequested = Array.from(
    new Set((payload.labels ?? []).map((label) => label.trim()).filter(Boolean)),
  );

  if (payload.mode === "append" && labelsRequested.length === 0) {
    return NextResponse.json({ error: "Specify at least one label to append" }, { status: 400 });
  }

  const { data: transaction, error: txError } = await supabase
    .from("transactions")
    .select("id")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (txError) {
    return NextResponse.json({ error: txError.message }, { status: 400 });
  }

  if (!transaction) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  const { data: existingLabels, error: labelsError } = await supabase
    .from("labels")
    .select("id, name, colour")
    .eq("user_id", user.id);

  if (labelsError) {
    return NextResponse.json({ error: labelsError.message }, { status: 400 });
  }

  const resolvedLabels = new Map<
    string,
    { id: string; name: string; colour: string | null }
  >();

  labelsRequested.forEach((label) => {
    const match = (existingLabels ?? []).find(
      (candidate) => candidate.name.trim().toLowerCase() === label.toLowerCase(),
    );
    if (match) {
      resolvedLabels.set(label, match);
    }
  });

  const missingLabels = labelsRequested.filter((label) => !resolvedLabels.has(label));

  if (missingLabels.length) {
    const { data: inserted, error: insertError } = await supabase
      .from("labels")
      .insert(
        missingLabels.map((label, index) => ({
          user_id: user.id,
          name: label,
          colour: pickColour(index),
        })),
      )
      .select("id, name, colour");

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    (inserted ?? []).forEach((label) => {
      resolvedLabels.set(label.name, label);
    });
  }

  const finalLabels = labelsRequested
    .map((label) => resolvedLabels.get(label))
    .filter((item): item is { id: string; name: string; colour: string | null } => Boolean(item));

  if (payload.mode === "replace") {
    await supabase
      .from("transaction_labels")
      .delete()
      .eq("transaction_id", params.id)
      .eq("user_id", user.id);

    if (!finalLabels.length) {
      return NextResponse.json({
        transaction: {
          id: params.id,
          labels: [],
        },
      });
    }
  }

  if (!finalLabels.length) {
    return NextResponse.json(
      { error: "Unable to resolve labels for transaction" },
      { status: 400 },
    );
  }

  const { error: upsertError } = await supabase.from("transaction_labels").upsert(
    finalLabels.map((label) => ({
      transaction_id: params.id,
      label_id: label.id,
      user_id: user.id,
    })),
    { onConflict: "transaction_id,label_id" },
  );

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 400 });
  }

  return NextResponse.json({
    transaction: {
      id: params.id,
      labels: finalLabels.map((label) => ({
        id: label.id,
        name: label.name,
        colour: label.colour,
      })),
    },
  });
}
