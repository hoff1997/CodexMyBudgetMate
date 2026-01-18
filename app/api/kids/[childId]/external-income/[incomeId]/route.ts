import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkBetaAccess } from "@/lib/utils/beta-access";
import {
  createErrorResponse,
  createUnauthorizedError,
} from "@/lib/utils/api-error";

interface RouteParams {
  params: Promise<{ childId: string; incomeId: string }>;
}

/**
 * GET /api/kids/[childId]/external-income/[incomeId]
 *
 * Get a single external income source
 */
export async function GET(request: Request, { params }: RouteParams) {
  const supabase = await createClient();
  const { childId, incomeId } = await params;

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
      .select("id, parent_user_id")
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

    // Fetch the income source
    const { data: income, error: incomeError } = await supabase
      .from("teen_external_income")
      .select(
        `
        *,
        linked_bank_account:teen_linked_accounts(id, account_name, bank_name)
      `
      )
      .eq("id", incomeId)
      .eq("child_profile_id", childId)
      .single();

    if (incomeError || !income) {
      return NextResponse.json(
        { error: "External income source not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: income });
  } catch (err) {
    console.error(
      "Error in GET /api/kids/[childId]/external-income/[incomeId]:",
      err
    );
    return NextResponse.json(
      { error: "Failed to fetch external income source" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/kids/[childId]/external-income/[incomeId]
 *
 * Update an external income source
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  const supabase = await createClient();
  const { childId, incomeId } = await params;

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
      .select("id, parent_user_id")
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
            "You do not have permission to update this child's income sources",
        },
        { status: 403 }
      );
    }

    // Verify income source exists
    const { data: existingIncome, error: existingError } = await supabase
      .from("teen_external_income")
      .select("id")
      .eq("id", incomeId)
      .eq("child_profile_id", childId)
      .single();

    if (existingError || !existingIncome) {
      return NextResponse.json(
        { error: "External income source not found" },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Build update payload
    const updatePayload: Record<string, unknown> = {};

    if (body.name !== undefined) {
      if (typeof body.name !== "string" || body.name.trim().length === 0) {
        return NextResponse.json(
          { error: "Income source name cannot be empty" },
          { status: 400 }
        );
      }
      updatePayload.name = body.name.trim();
    }

    if (body.employerName !== undefined) {
      updatePayload.employer_name = body.employerName?.trim() || null;
    }

    if (body.amount !== undefined) {
      if (body.amount <= 0) {
        return NextResponse.json(
          { error: "Amount must be greater than 0" },
          { status: 400 }
        );
      }
      updatePayload.amount = body.amount;
    }

    if (body.frequency !== undefined) {
      const validFrequencies = ["weekly", "fortnightly", "monthly"];
      if (!validFrequencies.includes(body.frequency)) {
        return NextResponse.json(
          { error: `Frequency must be one of: ${validFrequencies.join(", ")}` },
          { status: 400 }
        );
      }
      updatePayload.frequency = body.frequency;
    }

    if (body.nextPayDate !== undefined) {
      updatePayload.next_pay_date = body.nextPayDate;
    }

    if (body.linkedBankAccountId !== undefined) {
      updatePayload.linked_bank_account_id = body.linkedBankAccountId;
    }

    if (body.isActive !== undefined) {
      updatePayload.is_active = body.isActive;
    }

    // Add updated timestamp
    updatePayload.updated_at = new Date().toISOString();

    // Update the income source
    const { data: updatedIncome, error: updateError } = await supabase
      .from("teen_external_income")
      .update(updatePayload)
      .eq("id", incomeId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating external income:", updateError);
      return createErrorResponse(
        updateError,
        400,
        "Failed to update external income source"
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedIncome,
    });
  } catch (err) {
    console.error(
      "Error in PATCH /api/kids/[childId]/external-income/[incomeId]:",
      err
    );
    return NextResponse.json(
      { error: "Failed to update external income source" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/kids/[childId]/external-income/[incomeId]
 *
 * Delete (or deactivate) an external income source
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  const supabase = await createClient();
  const { childId, incomeId } = await params;

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
      .select("id, parent_user_id")
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
            "You do not have permission to delete this child's income sources",
        },
        { status: 403 }
      );
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const hardDelete = searchParams.get("hardDelete") === "true";

    // Verify income source exists
    const { data: income, error: incomeError } = await supabase
      .from("teen_external_income")
      .select("id, name")
      .eq("id", incomeId)
      .eq("child_profile_id", childId)
      .single();

    if (incomeError || !income) {
      return NextResponse.json(
        { error: "External income source not found" },
        { status: 404 }
      );
    }

    if (hardDelete) {
      // Hard delete - remove allocations first
      await supabase
        .from("teen_envelope_allocations")
        .delete()
        .eq("income_source_id", incomeId)
        .eq("income_source_type", "external_income");

      // Then delete the income source
      const { error: deleteError } = await supabase
        .from("teen_external_income")
        .delete()
        .eq("id", incomeId);

      if (deleteError) {
        console.error("Error deleting external income:", deleteError);
        return createErrorResponse(
          deleteError,
          400,
          "Failed to delete external income source"
        );
      }
    } else {
      // Soft delete
      const { error: updateError } = await supabase
        .from("teen_external_income")
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", incomeId);

      if (updateError) {
        console.error("Error deactivating external income:", updateError);
        return createErrorResponse(
          updateError,
          400,
          "Failed to deactivate external income source"
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: hardDelete
        ? `Income source "${income.name}" deleted`
        : `Income source "${income.name}" deactivated`,
      hardDeleted: hardDelete,
    });
  } catch (err) {
    console.error(
      "Error in DELETE /api/kids/[childId]/external-income/[incomeId]:",
      err
    );
    return NextResponse.json(
      { error: "Failed to delete external income source" },
      { status: 500 }
    );
  }
}
