import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { recalculateSafetyNetTarget } from "@/lib/utils/suggested-envelopes";

const frequencySchema = z.enum(["weekly", "fortnightly", "monthly", "quarterly", "annually", "none"]).optional();
const envelopeTypeSchema = z.enum(["income", "expense"]).optional();
const subtypeSchema = z.enum(["bill", "spending", "savings", "goal"]).optional();
const prioritySchema = z.enum(["essential", "important", "discretionary"]);
const goalTypeSchema = z.enum(["savings", "debt_payoff", "purchase", "emergency_fund", "other"]).optional();

const schema = z.object({
  name: z.string().min(1),
  categoryId: z.string().uuid().optional(),
  categoryName: z.string().min(1).optional(),
  envelopeType: envelopeTypeSchema,
  subtype: subtypeSchema,
  priority: prioritySchema,
  targetAmount: z.number().nonnegative().default(0),
  payCycleAmount: z.number().nonnegative().default(0),
  frequency: frequencySchema,
  nextDue: z.string().optional(),
  openingBalance: z.number().default(0),
  notes: z.string().max(2000).optional(),
  icon: z.string().max(10).optional(),
  isSpending: z.boolean().optional(),
  isMonitored: z.boolean().optional(),
  // Goal-specific fields
  isGoal: z.boolean().optional(),
  goalType: goalTypeSchema,
  goalTargetDate: z.string().optional(),
  interestRate: z.number().nonnegative().optional(), // For debt payoff goals
}).superRefine((data, ctx) => {
  // Validate bill-specific requirements
  if (data.subtype === 'bill') {
    if (!data.frequency || data.frequency === 'none') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Bills must have a frequency',
        path: ['frequency'],
      });
    }
  }
});

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  // Try to query with new suggested envelope columns first
  let data, error;

  // First try with the new columns (after migration is applied)
  // Note: We return ALL envelopes including dismissed suggested ones,
  // so the client can show the "Restore" button for hidden envelopes
  const result = await supabase
    .from("envelopes")
    .select("id, name, envelope_type, subtype, priority, target_amount, annual_amount, pay_cycle_amount, opening_balance, current_amount, frequency, next_payment_due, due_date, notes, icon, is_spending, is_monitored, category_id, is_goal, goal_type, goal_target_date, goal_completed_at, interest_rate, sort_order, is_suggested, suggestion_type, is_dismissed, auto_calculate_target, description, snoozed_until")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (result.error && result.error.message.includes("column")) {
    // Fallback to query without suggested envelope columns (before migration)
    const fallback = await supabase
      .from("envelopes")
      .select("id, name, envelope_type, subtype, priority, target_amount, annual_amount, pay_cycle_amount, opening_balance, current_amount, frequency, next_payment_due, due_date, notes, icon, is_spending, is_monitored, category_id, is_goal, goal_type, goal_target_date, goal_completed_at, interest_rate, sort_order")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    data = fallback.data;
    error = fallback.error;
  } else {
    data = result.data;
    error = result.error;
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data || []);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    // Check specifically for priority errors
    const priorityError = parsed.error.errors.find(e => e.path.includes('priority'));
    if (priorityError) {
      return NextResponse.json({ error: "Priority is required" }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const payload = parsed.data;

  let categoryId = payload.categoryId;
  if (!categoryId && payload.categoryName) {
    const { data: existingCategory } = await supabase
      .from("envelope_categories")
      .select("id")
      .eq("user_id", user.id)
      .ilike("name", payload.categoryName)
      .maybeSingle();

    if (existingCategory) {
      categoryId = existingCategory.id;
    } else {
      const { data: categoryInsert, error: categoryError } = await supabase
        .from("envelope_categories")
        .insert({ user_id: user.id, name: payload.categoryName })
        .select("id")
        .maybeSingle();

      if (categoryError) {
        return NextResponse.json({ error: categoryError.message }, { status: 400 });
      }
      categoryId = categoryInsert?.id ?? undefined;
    }
  }

  const { error } = await supabase.from("envelopes").insert({
    user_id: user.id,
    name: payload.name,
    category_id: categoryId,
    envelope_type: payload.envelopeType ?? 'expense',
    subtype: payload.subtype ?? 'bill',
    priority: payload.priority, // Required field, no fallback
    target_amount: payload.targetAmount,
    pay_cycle_amount: payload.payCycleAmount,
    frequency: payload.frequency ?? null,
    next_payment_due: payload.nextDue ?? null,
    opening_balance: payload.openingBalance,
    current_amount: payload.openingBalance,
    notes: payload.notes?.trim() ? payload.notes.trim() : null,
    icon: payload.icon ?? null,
    is_spending: payload.isSpending ?? false,
    is_monitored: payload.isMonitored ?? false,
    // Goal-specific fields
    is_goal: payload.isGoal ?? false,
    goal_type: payload.goalType ?? null,
    goal_target_date: payload.goalTargetDate ?? null,
    interest_rate: payload.interestRate ?? null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Recalculate Safety Net target if an essential envelope was created
  if (payload.priority === "essential") {
    await recalculateSafetyNetTarget(supabase, user.id);
  }

  return NextResponse.json({ ok: true });
}
