import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { recalculateSafetyNetTarget } from "@/lib/utils/suggested-envelopes";
import { createErrorResponse, createUnauthorizedError, createValidationError } from "@/lib/utils/api-error";

const frequencySchema = z.enum(["weekly", "fortnightly", "monthly", "quarterly", "annually", "none"]).optional();
const envelopeTypeSchema = z.enum(["income", "expense"]).optional();
const subtypeSchema = z.enum(["bill", "spending", "savings", "goal"]).optional();
const prioritySchema = z.enum(["essential", "important", "discretionary"]);
const goalTypeSchema = z.enum(["savings", "debt_payoff", "purchase", "emergency_fund", "other"]).optional();

const seasonalPatternSchema = z.enum(["winter-peak", "summer-peak", "custom"]).optional();

const levelingDataSchema = z.object({
  monthlyAmounts: z.array(z.number()).length(12),
  yearlyAverage: z.number(),
  bufferPercent: z.number(),
  estimationType: z.enum(["12-month", "quick-estimate"]),
  highSeasonEstimate: z.number().optional(),
  lowSeasonEstimate: z.number().optional(),
  lastUpdated: z.string(),
}).optional();

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
  // Leveled bill fields
  isLeveled: z.boolean().optional(),
  levelingData: levelingDataSchema,
  seasonalPattern: seasonalPatternSchema,
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

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  // Check for include_archived query param
  const { searchParams } = new URL(request.url);
  const includeArchived = searchParams.get("include_archived") === "true";

  // Try to query with new suggested envelope columns first
  let data, error;

  // First try with the new columns (after migration is applied)
  // Note: We return ALL envelopes including dismissed suggested ones,
  // so the client can show the "Restore" button for hidden envelopes
  let query = supabase
    .from("envelopes")
    .select("id, name, envelope_type, subtype, priority, target_amount, annual_amount, pay_cycle_amount, opening_balance, current_amount, frequency, custom_weeks, next_payment_due, due_date, notes, icon, is_spending, is_monitored, category_id, category_display_order, is_goal, goal_type, goal_target_date, goal_completed_at, interest_rate, sort_order, is_suggested, suggestion_type, is_dismissed, auto_calculate_target, description, snoozed_until, is_tracking_only, is_archived, archived_at, archive_reason, is_leveled, leveling_data, seasonal_pattern, is_celebration, gift_recipients(count)")
    .eq("user_id", user.id);

  // Filter out archived unless explicitly requested
  if (!includeArchived) {
    query = query.or("is_archived.is.null,is_archived.eq.false");
  }

  const result = await query
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (result.error && result.error.message.includes("column")) {
    // Fallback to query without archive columns (before migration)
    let fallbackQuery = supabase
      .from("envelopes")
      .select("id, name, envelope_type, subtype, priority, target_amount, annual_amount, pay_cycle_amount, opening_balance, current_amount, frequency, custom_weeks, next_payment_due, due_date, notes, icon, is_spending, is_monitored, category_id, category_display_order, is_goal, goal_type, goal_target_date, goal_completed_at, interest_rate, sort_order, is_tracking_only, is_celebration")
      .eq("user_id", user.id);

    const fallback = await fallbackQuery
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    data = fallback.data;
    error = fallback.error;
  } else {
    data = result.data;
    error = result.error;
  }

  if (error) {
    return createErrorResponse(error, 400, "Failed to load envelopes");
  }

  // Transform gift_recipients count from nested object to flat field
  const transformedData = (data || []).map((envelope: Record<string, unknown>) => {
    const giftRecipients = envelope.gift_recipients as { count: number }[] | undefined;
    return {
      ...envelope,
      gift_recipient_count: giftRecipients?.[0]?.count ?? 0,
      gift_recipients: undefined, // Remove the nested object
    };
  });

  return NextResponse.json(transformedData);
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
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    // Check specifically for priority errors
    const priorityError = parsed.error.errors.find(e => e.path.includes('priority'));
    if (priorityError) {
      return createValidationError("Priority is required");
    }
    return createValidationError("Invalid payload");
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
        return createErrorResponse(categoryError, 400, "Failed to create category");
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
    // Leveled bill fields
    is_leveled: payload.isLeveled ?? false,
    leveling_data: payload.levelingData ?? null,
    seasonal_pattern: payload.seasonalPattern ?? null,
  });

  if (error) {
    return createErrorResponse(error, 400, "Failed to create envelope");
  }

  // Recalculate Safety Net target if an essential envelope was created
  if (payload.priority === "essential") {
    await recalculateSafetyNetTarget(supabase, user.id);
  }

  // Check and award envelope achievements (non-blocking)
  try {
    // Get envelope count for this user
    const { count: envelopeCount } = await supabase
      .from("envelopes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .or("is_archived.is.null,is_archived.eq.false");

    const count = envelopeCount ?? 0;

    // Check first_envelope achievement
    if (count >= 1) {
      await supabase
        .from("achievements")
        .upsert(
          {
            user_id: user.id,
            achievement_key: "first_envelope",
            achieved_at: new Date().toISOString(),
            metadata: { count: 1 },
          },
          { onConflict: "user_id,achievement_key", ignoreDuplicates: true }
        );
    }

    // Check envelopes_5 achievement
    if (count >= 5) {
      await supabase
        .from("achievements")
        .upsert(
          {
            user_id: user.id,
            achievement_key: "envelopes_5",
            achieved_at: new Date().toISOString(),
            metadata: { count },
          },
          { onConflict: "user_id,achievement_key", ignoreDuplicates: true }
        );
    }

    // Check envelopes_10 achievement
    if (count >= 10) {
      await supabase
        .from("achievements")
        .upsert(
          {
            user_id: user.id,
            achievement_key: "envelopes_10",
            achieved_at: new Date().toISOString(),
            metadata: { count },
          },
          { onConflict: "user_id,achievement_key", ignoreDuplicates: true }
        );
    }

    // Check if this is an emergency fund envelope (goal achievements)
    if (payload.goalType === "emergency_fund" || payload.name.toLowerCase().includes("emergency")) {
      await supabase
        .from("achievements")
        .upsert(
          {
            user_id: user.id,
            achievement_key: "emergency_fund_started",
            achieved_at: new Date().toISOString(),
            metadata: { envelopeName: payload.name },
          },
          { onConflict: "user_id,achievement_key", ignoreDuplicates: true }
        );
    }

    // Check if this is a goal envelope
    if (payload.isGoal) {
      await supabase
        .from("achievements")
        .upsert(
          {
            user_id: user.id,
            achievement_key: "first_goal",
            achieved_at: new Date().toISOString(),
            metadata: { goalName: payload.name, goalType: payload.goalType },
          },
          { onConflict: "user_id,achievement_key", ignoreDuplicates: true }
        );
    }
  } catch (achievementError) {
    // Non-critical - log but don't fail the envelope creation
    console.warn("Achievement check failed (non-critical):", achievementError);
  }

  return NextResponse.json({ ok: true });
}
