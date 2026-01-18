import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkBetaAccess } from "@/lib/utils/beta-access";
import { createUnauthorizedError } from "@/lib/utils/api-error";
import { getTeenLimitsStatus, TEEN_MODE_LIMITS } from "@/lib/utils/teen-limits";

interface RouteParams {
  params: Promise<{ childId: string }>;
}

/**
 * GET /api/kids/[childId]/limits
 *
 * Get the current limits status for a teen in teen mode.
 * Returns envelope count, external income count, bank connection count,
 * days until auto-graduation, and grace period info.
 */
export async function GET(request: Request, { params }: RouteParams) {
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
    // Verify parent owns this child profile
    const { data: child, error: childError } = await supabase
      .from("child_profiles")
      .select(
        `
        id,
        name,
        parent_user_id,
        is_teen_mode,
        graduation_status,
        date_of_birth,
        auto_graduation_date
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

    if (child.parent_user_id !== user.id) {
      return NextResponse.json(
        { error: "You do not have permission to view this child's limits" },
        { status: 403 }
      );
    }

    // If not in teen mode, return basic info
    if (!child.is_teen_mode) {
      return NextResponse.json({
        isTeenMode: false,
        graduationStatus: child.graduation_status,
        message: "Teen mode is not enabled for this child",
        limits: TEEN_MODE_LIMITS,
      });
    }

    // Get full limits status
    const limitsStatus = await getTeenLimitsStatus(childId);

    if (!limitsStatus) {
      return NextResponse.json(
        { error: "Failed to fetch limits status" },
        { status: 500 }
      );
    }

    // Calculate age for display
    let currentAge: number | null = null;
    if (child.date_of_birth) {
      const dob = new Date(child.date_of_birth);
      const today = new Date();
      currentAge = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < dob.getDate())
      ) {
        currentAge--;
      }
    }

    // Determine if graduation warning should be shown
    const showGraduationWarning =
      limitsStatus.daysUntilAutoGraduation !== null &&
      limitsStatus.daysUntilAutoGraduation <= 30 &&
      limitsStatus.daysUntilAutoGraduation > 0;

    // Determine if any limit is reached
    const atEnvelopeLimit = limitsStatus.envelopes.remaining === 0;
    const atIncomeLimit = limitsStatus.externalIncome.remaining === 0;
    const atBankLimit = limitsStatus.bankConnections.remaining === 0;

    return NextResponse.json({
      isTeenMode: true,
      graduationStatus: child.graduation_status,
      childName: child.name,
      currentAge,
      dateOfBirth: child.date_of_birth,

      // Limits details
      envelopes: limitsStatus.envelopes,
      externalIncome: limitsStatus.externalIncome,
      bankConnections: limitsStatus.bankConnections,

      // Overall status
      isAtAnyLimit: limitsStatus.isAtAnyLimit,
      atEnvelopeLimit,
      atIncomeLimit,
      atBankLimit,

      // Graduation info
      autoGraduationDate: limitsStatus.autoGraduationDate,
      daysUntilAutoGraduation: limitsStatus.daysUntilAutoGraduation,
      showGraduationWarning,

      // Grace period info
      isInGracePeriod: limitsStatus.isInGracePeriod,
      gracePeriodEndsAt: limitsStatus.gracePeriodEndsAt,

      // Upgrade prompts when limits hit
      upgradePrompts: {
        envelopes:
          atEnvelopeLimit
            ? {
                title: "You've Grown!",
                message: `You're managing ${TEEN_MODE_LIMITS.envelopes} envelopes like a pro. Graduate to unlock unlimited envelopes.`,
                ctaText: "Graduate Now - It's Free!",
                ctaUrl: `/kids/${childId}/graduate`,
              }
            : null,
        income:
          atIncomeLimit
            ? {
                title: "Multiple Income Streams!",
                message: `You have ${TEEN_MODE_LIMITS.externalIncomeSources} income sources. Graduate to add more and unlock advanced budgeting.`,
                ctaText: "Graduate Now - It's Free!",
                ctaUrl: `/kids/${childId}/graduate`,
              }
            : null,
        banks:
          atBankLimit
            ? {
                title: "Ready for More?",
                message:
                  "Graduate to connect multiple bank accounts and get a complete view of your finances.",
                ctaText: "Graduate Now - It's Free!",
                ctaUrl: `/kids/${childId}/graduate`,
              }
            : null,
      },

      // Feature comparison (teen vs graduated)
      featureComparison: {
        teenMode: {
          envelopes: `${TEEN_MODE_LIMITS.envelopes} max`,
          externalIncome: `${TEEN_MODE_LIMITS.externalIncomeSources} max`,
          bankConnections: `${TEEN_MODE_LIMITS.bankConnections} max`,
          debtTracking: "Basic only",
          reports: "No",
          netWorth: "No",
          transactionReconciliation: "Yes",
        },
        graduated: {
          envelopes: "Unlimited",
          externalIncome: "Unlimited",
          bankConnections: "Unlimited",
          debtTracking: "Full snowball/avalanche",
          reports: "Yes (PDF export)",
          netWorth: "Yes",
          transactionReconciliation: "Yes",
        },
      },
    });
  } catch (err) {
    console.error("Error in GET /api/kids/[childId]/limits:", err);
    return NextResponse.json(
      { error: "Failed to fetch limits status" },
      { status: 500 }
    );
  }
}
