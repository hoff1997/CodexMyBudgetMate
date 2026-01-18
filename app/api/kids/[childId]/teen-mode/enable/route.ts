import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkBetaAccess } from "@/lib/utils/beta-access";
import {
  createErrorResponse,
  createUnauthorizedError,
} from "@/lib/utils/api-error";
import { calculateAge, isEligibleForTeenMode } from "@/lib/utils/teen-limits";

interface RouteParams {
  params: Promise<{ childId: string }>;
}

/**
 * POST /api/kids/[childId]/teen-mode/enable
 *
 * Parent enables teen mode for a child. Requirements:
 * - Child must have a date of birth set (conversion safeguard)
 * - Child must be at least 13 years old (teen mode eligibility)
 * - Parent must own the child profile
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
        date_of_birth,
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

    // Check if already in teen mode
    if (child.is_teen_mode) {
      return NextResponse.json(
        { error: "Teen mode is already enabled for this child" },
        { status: 400 }
      );
    }

    // Check if already graduated
    if (child.graduation_status === "graduated") {
      return NextResponse.json(
        { error: "This child has already graduated to their own account" },
        { status: 400 }
      );
    }

    // CRITICAL: Date of birth is required for teen mode (conversion safeguard)
    if (!child.date_of_birth) {
      return NextResponse.json(
        {
          error: "Date of birth is required to enable teen mode",
          code: "DOB_REQUIRED",
          message:
            "Please add your child's date of birth in their profile settings before enabling teen mode.",
        },
        { status: 400 }
      );
    }

    // Check age eligibility (13+)
    const dob = new Date(child.date_of_birth);
    if (!isEligibleForTeenMode(dob)) {
      const age = calculateAge(dob);
      return NextResponse.json(
        {
          error: "Child must be at least 13 years old for teen mode",
          code: "AGE_INELIGIBLE",
          currentAge: age,
          requiredAge: 13,
        },
        { status: 400 }
      );
    }

    // Parse request body for optional settings
    let settings = {
      canReconcileTransactions: true,
      canAddExternalIncome: true,
      bankLinkingEnabled: false,
    };

    try {
      const body = await request.json();
      if (body.canReconcileTransactions !== undefined) {
        settings.canReconcileTransactions = Boolean(
          body.canReconcileTransactions
        );
      }
      if (body.canAddExternalIncome !== undefined) {
        settings.canAddExternalIncome = Boolean(body.canAddExternalIncome);
      }
      if (body.bankLinkingEnabled !== undefined) {
        settings.bankLinkingEnabled = Boolean(body.bankLinkingEnabled);
      }
    } catch {
      // No body or invalid JSON, use defaults
    }

    // Calculate auto-graduation date (18th birthday)
    const autoGraduationDate = new Date(dob);
    autoGraduationDate.setFullYear(autoGraduationDate.getFullYear() + 18);

    // Enable teen mode
    const { data: updatedChild, error: updateError } = await supabase
      .from("child_profiles")
      .update({
        is_teen_mode: true,
        teen_mode_enabled_at: new Date().toISOString(),
        can_reconcile_transactions: settings.canReconcileTransactions,
        can_add_external_income: settings.canAddExternalIncome,
        bank_linking_enabled: settings.bankLinkingEnabled,
        graduation_status: "teen_mode",
        auto_graduation_date: autoGraduationDate.toISOString().split("T")[0],
      })
      .eq("id", childId)
      .select()
      .single();

    if (updateError) {
      console.error("Error enabling teen mode:", updateError);
      return createErrorResponse(updateError, 400, "Failed to enable teen mode");
    }

    // Create graduation request record for tracking
    await supabase.from("teen_graduation_requests").insert({
      child_profile_id: childId,
      parent_user_id: user.id,
      request_type: "teen_mode",
      status: "completed",
      teen_mode_enabled_at: new Date().toISOString(),
    });

    // Return success with teen mode info
    return NextResponse.json({
      success: true,
      message: `Teen mode enabled for ${child.name}`,
      data: {
        childId: updatedChild.id,
        name: updatedChild.name,
        isTeenMode: updatedChild.is_teen_mode,
        teenModeEnabledAt: updatedChild.teen_mode_enabled_at,
        canReconcileTransactions: updatedChild.can_reconcile_transactions,
        canAddExternalIncome: updatedChild.can_add_external_income,
        autoGraduationDate: updatedChild.auto_graduation_date,
        limits: {
          envelopes: { max: 6, current: 0 },
          externalIncome: { max: 2, current: 0 },
          bankConnections: { max: 1, current: 0 },
        },
      },
    });
  } catch (err) {
    console.error("Error in POST /api/kids/[childId]/teen-mode/enable:", err);
    return NextResponse.json(
      { error: "Failed to enable teen mode" },
      { status: 500 }
    );
  }
}
