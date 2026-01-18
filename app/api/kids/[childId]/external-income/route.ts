import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkBetaAccess } from "@/lib/utils/beta-access";
import {
  createErrorResponse,
  createUnauthorizedError,
} from "@/lib/utils/api-error";
import {
  canTeenAddExternalIncome,
  TEEN_MODE_LIMITS,
} from "@/lib/utils/teen-limits";

interface RouteParams {
  params: Promise<{ childId: string }>;
}

/**
 * GET /api/kids/[childId]/external-income
 *
 * Get all external income sources for a teen
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
      .select("id, parent_user_id, is_teen_mode, can_add_external_income")
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
        {
          error:
            "You do not have permission to view this child's income sources",
        },
        { status: 403 }
      );
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get("includeInactive") === "true";

    // Fetch external income sources
    let query = supabase
      .from("teen_external_income")
      .select(
        `
        *,
        linked_bank_account:teen_linked_accounts(id, account_name, bank_name)
      `
      )
      .eq("child_profile_id", childId)
      .order("created_at", { ascending: false });

    if (!includeInactive) {
      query = query.eq("is_active", true);
    }

    const { data: incomes, error: incomesError } = await query;

    if (incomesError) {
      return createErrorResponse(
        incomesError,
        400,
        "Failed to fetch external income sources"
      );
    }

    // Get count for limit info
    const activeCount = incomes?.filter((i) => i.is_active).length || 0;

    return NextResponse.json({
      data: incomes || [],
      limits: {
        current: activeCount,
        max: TEEN_MODE_LIMITS.externalIncomeSources,
        canAdd: activeCount < TEEN_MODE_LIMITS.externalIncomeSources,
        remaining: Math.max(
          0,
          TEEN_MODE_LIMITS.externalIncomeSources - activeCount
        ),
      },
      teenModeEnabled: child.is_teen_mode,
      externalIncomeEnabled: child.can_add_external_income,
    });
  } catch (err) {
    console.error("Error in GET /api/kids/[childId]/external-income:", err);
    return NextResponse.json(
      { error: "Failed to fetch external income sources" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/kids/[childId]/external-income
 *
 * Create a new external income source (subject to 2 income limit)
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
    // Verify parent owns this child profile
    const { data: child, error: childError } = await supabase
      .from("child_profiles")
      .select("id, parent_user_id, is_teen_mode, can_add_external_income")
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
        {
          error:
            "You do not have permission to add income sources for this child",
        },
        { status: 403 }
      );
    }

    if (!child.is_teen_mode) {
      return NextResponse.json(
        { error: "Teen mode is not enabled for this child" },
        { status: 400 }
      );
    }

    if (!child.can_add_external_income) {
      return NextResponse.json(
        {
          error: "External income is not enabled for this child",
          code: "EXTERNAL_INCOME_DISABLED",
        },
        { status: 400 }
      );
    }

    // Check income limit
    const limitCheck = await canTeenAddExternalIncome(childId);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error: "External income limit reached",
          code: "TEEN_INCOME_LIMIT",
          currentCount: limitCheck.currentCount,
          maxAllowed: limitCheck.maxAllowed,
          reason: limitCheck.reason,
          upgradePrompt: limitCheck.upgradePrompt,
        },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      name,
      employerName,
      amount,
      frequency,
      nextPayDate,
      linkedBankAccountId,
    } = body;

    // Validate required fields
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Income source name is required" },
        { status: 400 }
      );
    }

    if (amount === undefined || amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be greater than 0" },
        { status: 400 }
      );
    }

    const validFrequencies = ["weekly", "fortnightly", "monthly"];
    if (!frequency || !validFrequencies.includes(frequency)) {
      return NextResponse.json(
        { error: `Frequency must be one of: ${validFrequencies.join(", ")}` },
        { status: 400 }
      );
    }

    // Create the income source
    const { data: income, error: insertError } = await supabase
      .from("teen_external_income")
      .insert({
        child_profile_id: childId,
        name: name.trim(),
        employer_name: employerName?.trim() || null,
        amount,
        frequency,
        next_pay_date: nextPayDate || null,
        linked_bank_account_id: linkedBankAccountId || null,
        is_active: true,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating external income:", insertError);
      return createErrorResponse(
        insertError,
        400,
        "Failed to create external income source"
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: income,
        limits: {
          current: limitCheck.currentCount + 1,
          max: TEEN_MODE_LIMITS.externalIncomeSources,
          canAdd:
            limitCheck.currentCount + 1 <
            TEEN_MODE_LIMITS.externalIncomeSources,
          remaining: Math.max(
            0,
            TEEN_MODE_LIMITS.externalIncomeSources -
              (limitCheck.currentCount + 1)
          ),
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Error in POST /api/kids/[childId]/external-income:", err);
    return NextResponse.json(
      { error: "Failed to create external income source" },
      { status: 500 }
    );
  }
}
