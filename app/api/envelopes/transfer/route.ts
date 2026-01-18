import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createErrorResponse, createUnauthorizedError, createValidationError } from "@/lib/utils/api-error";

const schema = z.object({
  fromId: z.string().uuid(),
  toId: z.string().uuid(),
  amount: z.number().positive(),
  note: z.string().trim().max(255).optional(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const body = await request.json();
  const parsed = schema.safeParse({
    ...body,
    amount: typeof body.amount === "string" ? Number(body.amount) : body.amount,
  });

  if (!parsed.success) {
    return createValidationError("Invalid payload");
  }

  const { fromId, toId, amount, note } = parsed.data;

  if (fromId === toId) {
    return NextResponse.json({ error: "Cannot transfer to the same envelope" }, { status: 400 });
  }

  const { data: envelopes, error } = await supabase
    .from("envelopes")
    .select("id, current_amount")
    .eq("user_id", user.id)
    .in("id", [fromId, toId]);

  if (error) {
    return createErrorResponse(error, 400, "Failed to fetch envelopes");
  }

  if (!envelopes || envelopes.length !== 2) {
    return NextResponse.json({ error: "Envelopes not found" }, { status: 404 });
  }

  const fromEnvelope = envelopes.find((env) => env.id === fromId);
  const toEnvelope = envelopes.find((env) => env.id === toId);

  if (!fromEnvelope || !toEnvelope) {
    return NextResponse.json({ error: "Envelopes not found" }, { status: 404 });
  }

  const fromBalance = Number(fromEnvelope.current_amount ?? 0);

  if (fromBalance < amount) {
    return NextResponse.json({ error: "Insufficient funds" }, { status: 400 });
  }

  const { data: transfer, error: transferError } = await supabase.rpc(
    "transfer_between_envelopes",
    {
      p_user_id: user.id,
      p_from_envelope_id: fromId,
      p_to_envelope_id: toId,
      p_amount: amount,
      p_note: note ?? null,
    },
  );

  if (transferError) {
    return createErrorResponse(transferError, 400, "Unable to complete transfer");
  }

  const { data: updatedEnvelopes } = await supabase
    .from("envelopes")
    .select("id, name, current_amount, goal_type, is_goal")
    .eq("user_id", user.id)
    .in("id", [fromId, toId]);

  // Check for savings milestone achievements (non-blocking)
  try {
    const toEnvelopeUpdated = updatedEnvelopes?.find((env) => env.id === toId);

    if (toEnvelopeUpdated) {
      const newBalance = Number(toEnvelopeUpdated.current_amount ?? 0);

      // Check if this is an emergency fund envelope and reached $1000
      const isEmergencyFund =
        toEnvelopeUpdated.goal_type === "emergency_fund" ||
        toEnvelopeUpdated.name?.toLowerCase().includes("emergency") ||
        toEnvelopeUpdated.name?.toLowerCase().includes("starter stash");

      if (isEmergencyFund && newBalance >= 1000) {
        // Award emergency_fund_complete achievement (Starter Stash!)
        await supabase
          .from("achievements")
          .upsert(
            {
              user_id: user.id,
              achievement_key: "emergency_fund_complete",
              achieved_at: new Date().toISOString(),
              metadata: { balance: newBalance, envelopeName: toEnvelopeUpdated.name },
            },
            { onConflict: "user_id,achievement_key", ignoreDuplicates: true }
          );

        // Also award savings_1000 achievement
        await supabase
          .from("achievements")
          .upsert(
            {
              user_id: user.id,
              achievement_key: "savings_1000",
              achieved_at: new Date().toISOString(),
              metadata: { balance: newBalance, envelopeName: toEnvelopeUpdated.name },
            },
            { onConflict: "user_id,achievement_key", ignoreDuplicates: true }
          );
      }

      // Check total savings across all savings envelopes
      const { data: allSavingsEnvelopes } = await supabase
        .from("envelopes")
        .select("current_amount")
        .eq("user_id", user.id)
        .or("subtype.eq.savings,is_goal.eq.true,goal_type.eq.emergency_fund");

      if (allSavingsEnvelopes) {
        const totalSavings = allSavingsEnvelopes.reduce(
          (sum, env) => sum + Number(env.current_amount ?? 0),
          0
        );

        // Award savings_1000 if total savings >= $1000
        if (totalSavings >= 1000) {
          await supabase
            .from("achievements")
            .upsert(
              {
                user_id: user.id,
                achievement_key: "savings_1000",
                achieved_at: new Date().toISOString(),
                metadata: { totalSavings },
              },
              { onConflict: "user_id,achievement_key", ignoreDuplicates: true }
            );
        }
      }

      // Check if a goal was achieved (balance >= target)
      if (toEnvelopeUpdated.is_goal) {
        const { data: goalEnvelope } = await supabase
          .from("envelopes")
          .select("target_amount, name")
          .eq("id", toId)
          .single();

        if (goalEnvelope && newBalance >= Number(goalEnvelope.target_amount ?? 0)) {
          await supabase
            .from("achievements")
            .upsert(
              {
                user_id: user.id,
                achievement_key: "goal_achieved",
                achieved_at: new Date().toISOString(),
                metadata: { goalName: goalEnvelope.name, balance: newBalance },
              },
              { onConflict: "user_id,achievement_key", ignoreDuplicates: true }
            );
        }
      }
    }
  } catch (achievementError) {
    console.warn("Achievement check failed (non-critical):", achievementError);
  }

  return NextResponse.json({
    transfer,
    envelopes: updatedEnvelopes ?? [],
  });
}
