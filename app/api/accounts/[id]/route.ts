import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(["transaction", "savings", "debt", "investment", "cash", "liability"]).optional(),
  institution: z.string().optional(),
  balance: z.number().optional(),
  reconciled: z.boolean().optional(),
  // Credit card fields
  apr: z.number().min(0).max(100).nullable().optional(),
  credit_limit: z.number().min(0).nullable().optional(),
  minimum_payment_amount: z.number().min(0).nullable().optional(),
  minimum_payment_percentage: z.number().min(0).max(100).nullable().optional(),
  payment_due_day: z.number().int().min(1).max(31).nullable().optional(),
  statement_closing_day: z.number().int().min(1).max(31).nullable().optional(),
  payment_strategy: z.enum(["pay_off", "minimum_only", "avalanche", "snowball", "custom"]).nullable().optional(),
  payoff_priority: z.number().int().nullable().optional(),
  amount_due_next_statement: z.number().min(0).nullable().optional(),
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = schema.safeParse({
    ...body,
    balance: typeof body.balance === "string" ? Number(body.balance) : body.balance,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const payload = parsed.data;

  // Build update object with only provided fields
  const updateData: Record<string, any> = {};

  if (payload.name !== undefined) updateData.name = payload.name;
  if (payload.type !== undefined) updateData.type = payload.type;
  if (payload.institution !== undefined) updateData.institution = payload.institution;
  if (payload.balance !== undefined) updateData.current_balance = payload.balance;
  if (payload.reconciled !== undefined) updateData.reconciled = payload.reconciled;

  // Credit card fields
  if (payload.apr !== undefined) updateData.apr = payload.apr;
  if (payload.credit_limit !== undefined) updateData.credit_limit = payload.credit_limit;
  if (payload.minimum_payment_amount !== undefined) updateData.minimum_payment_amount = payload.minimum_payment_amount;
  if (payload.minimum_payment_percentage !== undefined) updateData.minimum_payment_percentage = payload.minimum_payment_percentage;
  if (payload.payment_due_day !== undefined) updateData.payment_due_day = payload.payment_due_day;
  if (payload.statement_closing_day !== undefined) updateData.statement_closing_day = payload.statement_closing_day;
  if (payload.payment_strategy !== undefined) updateData.payment_strategy = payload.payment_strategy;
  if (payload.payoff_priority !== undefined) updateData.payoff_priority = payload.payoff_priority;
  if (payload.amount_due_next_statement !== undefined) updateData.amount_due_next_statement = payload.amount_due_next_statement;

  const { error } = await supabase
    .from("accounts")
    .update(updateData)
    .eq("id", params.id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { error } = await supabase
    .from("accounts")
    .delete()
    .eq("id", params.id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
