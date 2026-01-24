import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import {
  createErrorResponse,
  createUnauthorizedError,
} from "@/lib/utils/api-error";

/**
 * POST /api/onboarding/steps/progress
 * Updates only the step progress (currentStep and highestStepReached)
 * Used for quick navigation updates without full data save
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return createUnauthorizedError();
    }

    const body = await request.json();
    const { currentStep, highestStepReached } = body;

    if (typeof currentStep !== "number" || currentStep < 0 || currentStep > 12) {
      return NextResponse.json(
        { success: false, error: "Invalid currentStep value" },
        { status: 400 }
      );
    }

    // Update profile with step progress
    const updateData: Record<string, unknown> = {
      onboarding_current_step: currentStep,
      onboarding_last_saved_at: new Date().toISOString(),
    };

    // Only update highest step if provided and greater than current
    if (typeof highestStepReached === "number" && highestStepReached >= currentStep) {
      updateData.onboarding_highest_step = highestStepReached;
    }

    // If this is the first step (step 1), mark onboarding as started
    if (currentStep === 1) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_started_at")
        .eq("id", user.id)
        .single();

      if (!profile?.onboarding_started_at) {
        updateData.onboarding_started_at = new Date().toISOString();
      }
    }

    // Mark that there's a draft in progress
    updateData.has_onboarding_draft = currentStep > 0;

    const { error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", user.id);

    if (error) {
      console.error("Error updating progress:", error);
      return createErrorResponse(error, 500, "Failed to update progress");
    }

    return NextResponse.json({
      success: true,
      currentStep,
      highestStepReached: highestStepReached || currentStep,
    });
  } catch (error) {
    console.error("Progress update error:", error);
    return createErrorResponse(
      error as { message: string },
      500,
      "Internal server error"
    );
  }
}
