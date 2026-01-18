import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createErrorResponse,
  createUnauthorizedError,
  createValidationError,
} from "@/lib/utils/api-error";

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return createUnauthorizedError();
    }

    const { payCycle } = await request.json();

    if (!payCycle || !["weekly", "fortnightly", "monthly"].includes(payCycle)) {
      return createValidationError("Invalid pay cycle. Must be 'weekly', 'fortnightly', or 'monthly'");
    }

    // Update user profile with pay cycle
    const { error } = await supabase
      .from("profiles")
      .update({ pay_cycle: payCycle })
      .eq("id", user.id);

    if (error) {
      console.error("Error updating pay cycle:", error);
      return createErrorResponse(error, 500, "Failed to update pay cycle");
    }

    return NextResponse.json({ success: true, payCycle });
  } catch (error: unknown) {
    console.error("Error in pay-cycle endpoint:", error);
    return createErrorResponse(error as { message: string }, 500, "Failed to update pay cycle");
  }
}
