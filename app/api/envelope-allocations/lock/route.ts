import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import {
  createErrorResponse,
  createUnauthorizedError,
  createValidationError,
} from "@/lib/utils/api-error";

/**
 * PATCH /api/envelope-allocations/lock
 *
 * Lock or unlock allocation suggestions for an envelope.
 * When locked, the suggested allocations become active rules.
 * Auto-unlocks if bill details (amount, frequency) change.
 */
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  try {
    const body = await request.json();
    const { envelope_id, lock, suggested_allocations } = body;

    if (!envelope_id) {
      return createValidationError("envelope_id is required");
    }

    if (lock === undefined) {
      return createValidationError("lock (boolean) is required");
    }

    // If locking, we need suggested_allocations
    if (lock && !suggested_allocations) {
      return createValidationError("suggested_allocations required when locking");
    }

    // Get existing allocations for this envelope
    const { data: existingAllocations, error: fetchError } = await supabase
      .from("envelope_income_allocations")
      .select("id, income_source_id, allocation_amount")
      .eq("envelope_id", envelope_id)
      .eq("user_id", user.id);

    if (fetchError) {
      throw fetchError;
    }

    if (lock) {
      // LOCKING: Update each allocation with suggested amount and lock it
      const updates = [];

      for (const [incomeSourceId, amount] of Object.entries(suggested_allocations as Record<string, number>)) {
        const existing = existingAllocations?.find(
          (a: any) => a.income_source_id === incomeSourceId
        );

        if (existing) {
          // Update existing allocation
          updates.push(
            supabase
              .from("envelope_income_allocations")
              .update({
                allocation_amount: amount,
                suggested_amount: amount,
                allocation_locked: true,
                locked_at: new Date().toISOString(),
              })
              .eq("id", existing.id)
              .eq("user_id", user.id)
          );
        } else {
          // Create new allocation
          updates.push(
            supabase
              .from("envelope_income_allocations")
              .insert({
                envelope_id,
                income_source_id: incomeSourceId,
                allocation_amount: amount,
                suggested_amount: amount,
                allocation_locked: true,
                locked_at: new Date().toISOString(),
                user_id: user.id,
              })
          );
        }
      }

      await Promise.all(updates);

      return NextResponse.json({
        success: true,
        message: "Allocations locked successfully",
        locked: true,
      });

    } else {
      // UNLOCKING: Remove lock but keep amounts
      if (!existingAllocations || existingAllocations.length === 0) {
        return NextResponse.json({
          success: true,
          message: "No allocations to unlock",
          locked: false,
        });
      }

      const updates = existingAllocations.map((allocation: any) =>
        supabase
          .from("envelope_income_allocations")
          .update({
            allocation_locked: false,
            locked_at: null,
          })
          .eq("id", allocation.id)
          .eq("user_id", user.id)
      );

      await Promise.all(updates);

      return NextResponse.json({
        success: true,
        message: "Allocations unlocked successfully",
        locked: false,
      });
    }

  } catch (error: unknown) {
    console.error("Error locking/unlocking allocations:", error);
    return createErrorResponse(
      error as { message: string; code?: string },
      500,
      "Failed to update lock status"
    );
  }
}
