import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkBetaAccess } from "@/lib/utils/beta-access";
import {
  createErrorResponse,
  createUnauthorizedError,
} from "@/lib/utils/api-error";

interface RouteParams {
  params: Promise<{ childId: string }>;
}

/**
 * POST /api/kids/[childId]/teen-mode/disable
 *
 * Parent disables teen mode for a child.
 * - Teen envelopes and allocations are preserved but become inactive
 * - External income sources are deactivated
 * - Child returns to regular Kids Module experience
 */
export async function POST(request: Request, { params }: RouteParams) {
  const supabase = await createClient();
  const { childId } = await params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  // Check beta access
  const betaAccess = await checkBetaAccess();
  if (!betaAccess.hasAccess) {
    return NextResponse.json(
      { error: "You don't have access to Kids features" },
      { status: 403 }
    );
  }

  try {
    // Fetch child profile and verify ownership
    const { data: child, error: childError } = await supabase
      .from("child_profiles")
      .select(
        `
        id,
        name,
        parent_user_id,
        is_teen_mode,
        graduation_status
      `
      )
      .eq("id", childId)
      .single();

    if (childError || !child) {
      return NextResponse.json(
        { error: "Child profile not found" },
        { status: 404 }
      );
    }

    // Verify parent owns this child profile
    if (child.parent_user_id !== user.id) {
      return NextResponse.json(
        { error: "You do not have permission to manage this child profile" },
        { status: 403 }
      );
    }

    // Check if already not in teen mode
    if (!child.is_teen_mode) {
      return NextResponse.json(
        { error: "Teen mode is not currently enabled for this child" },
        { status: 400 }
      );
    }

    // Check if graduated (can't disable after graduation)
    if (
      child.graduation_status === "graduated" ||
      child.graduation_status === "graduating"
    ) {
      return NextResponse.json(
        {
          error: "Cannot disable teen mode after graduation has started",
          code: "GRADUATION_IN_PROGRESS",
        },
        { status: 400 }
      );
    }

    // Parse request body for options
    let options = {
      preserveData: true, // By default, preserve teen data
    };

    try {
      const body = await request.json();
      if (body.preserveData !== undefined) {
        options.preserveData = Boolean(body.preserveData);
      }
    } catch {
      // No body or invalid JSON, use defaults
    }

    // Disable teen mode
    const { data: updatedChild, error: updateError } = await supabase
      .from("child_profiles")
      .update({
        is_teen_mode: false,
        can_reconcile_transactions: false,
        can_add_external_income: false,
        bank_linking_enabled: false,
        graduation_status: "child",
        // Keep teen_mode_enabled_at for historical tracking
        // Keep auto_graduation_date for potential re-enablement
      })
      .eq("id", childId)
      .select()
      .single();

    if (updateError) {
      console.error("Error disabling teen mode:", updateError);
      return createErrorResponse(
        updateError,
        400,
        "Failed to disable teen mode"
      );
    }

    // Optionally deactivate teen data (but don't delete)
    if (!options.preserveData) {
      // Deactivate teen envelopes
      await supabase
        .from("teen_envelopes")
        .update({ is_active: false })
        .eq("child_profile_id", childId);

      // Deactivate external income sources
      await supabase
        .from("teen_external_income")
        .update({ is_active: false })
        .eq("child_profile_id", childId);
    }

    // Update graduation request record
    await supabase
      .from("teen_graduation_requests")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("child_profile_id", childId)
      .eq("request_type", "teen_mode")
      .eq("status", "completed");

    return NextResponse.json({
      success: true,
      message: `Teen mode disabled for ${child.name}`,
      data: {
        childId: updatedChild.id,
        name: updatedChild.name,
        isTeenMode: updatedChild.is_teen_mode,
        graduationStatus: updatedChild.graduation_status,
        dataPreserved: options.preserveData,
      },
    });
  } catch (err) {
    console.error("Error in POST /api/kids/[childId]/teen-mode/disable:", err);
    return NextResponse.json(
      { error: "Failed to disable teen mode" },
      { status: 500 }
    );
  }
}
