import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createErrorResponse, createUnauthorizedError } from "@/lib/utils/api-error";

export async function POST(
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

  const { error } = await supabase
    .from("transactions")
    .update({ status: "approved" })
    .eq("id", params.id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return createErrorResponse(error, 400, "Failed to approve transaction");
  }

  // Check and award achievements (non-blocking)
  try {
    // Get approved transaction count for this user
    const { count: approvedCount } = await supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "approved");

    const transactionCount = approvedCount ?? 0;

    // Check first_reconciliation achievement (first approved transaction)
    if (transactionCount === 1) {
      await supabase
        .from("achievements")
        .upsert(
          {
            user_id: user.id,
            achievement_key: "first_reconciliation",
            achieved_at: new Date().toISOString(),
            metadata: { count: 1 },
          },
          { onConflict: "user_id,achievement_key", ignoreDuplicates: true }
        );
    }

    // Check first_transaction achievement
    if (transactionCount >= 1) {
      await supabase
        .from("achievements")
        .upsert(
          {
            user_id: user.id,
            achievement_key: "first_transaction",
            achieved_at: new Date().toISOString(),
            metadata: { count: transactionCount },
          },
          { onConflict: "user_id,achievement_key", ignoreDuplicates: true }
        );
    }

    // Check transactions_10 achievement
    if (transactionCount >= 10) {
      await supabase
        .from("achievements")
        .upsert(
          {
            user_id: user.id,
            achievement_key: "transactions_10",
            achieved_at: new Date().toISOString(),
            metadata: { count: transactionCount },
          },
          { onConflict: "user_id,achievement_key", ignoreDuplicates: true }
        );
    }

    // Check transactions_50 achievement
    if (transactionCount >= 50) {
      await supabase
        .from("achievements")
        .upsert(
          {
            user_id: user.id,
            achievement_key: "transactions_50",
            achieved_at: new Date().toISOString(),
            metadata: { count: transactionCount },
          },
          { onConflict: "user_id,achievement_key", ignoreDuplicates: true }
        );
    }

    // Check transactions_100 achievement
    if (transactionCount >= 100) {
      await supabase
        .from("achievements")
        .upsert(
          {
            user_id: user.id,
            achievement_key: "transactions_100",
            achieved_at: new Date().toISOString(),
            metadata: { count: transactionCount },
          },
          { onConflict: "user_id,achievement_key", ignoreDuplicates: true }
        );
    }
  } catch (achievementError) {
    // Non-critical - log but don't fail the transaction approval
    console.warn("Achievement check failed (non-critical):", achievementError);
  }

  return NextResponse.json({ status: "approved" });
}
