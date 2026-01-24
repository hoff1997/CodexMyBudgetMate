import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import {
  createErrorResponse,
  createUnauthorizedError,
} from "@/lib/utils/api-error";

/**
 * POST /api/onboarding/steps/profile
 * Saves profile data (fullName) and updates step progress
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
    const { fullName, currentStep, highestStepReached } = body;

    // Update profile with name and step progress
    const updateData: Record<string, unknown> = {
      onboarding_current_step: currentStep || 2,
      onboarding_last_saved_at: new Date().toISOString(),
      has_onboarding_draft: true,
    };

    if (fullName) {
      updateData.full_name = fullName;
    }

    if (typeof highestStepReached === "number") {
      updateData.onboarding_highest_step = highestStepReached;
    }

    // Mark started if not already
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_started_at")
      .eq("id", user.id)
      .single();

    if (!profile?.onboarding_started_at) {
      updateData.onboarding_started_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", user.id);

    if (error) {
      console.error("Error updating profile:", error);
      return createErrorResponse(error, 500, "Failed to update profile");
    }

    return NextResponse.json({
      success: true,
      message: "Profile saved",
    });
  } catch (error) {
    console.error("Profile save error:", error);
    return createErrorResponse(
      error as { message: string },
      500,
      "Internal server error"
    );
  }
}
