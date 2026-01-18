import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkBetaAccess } from "@/lib/utils/beta-access";
import {
  createErrorResponse,
  createUnauthorizedError,
} from "@/lib/utils/api-error";

interface RouteParams {
  params: Promise<{ childId: string; envelopeId: string }>;
}

/**
 * GET /api/kids/[childId]/teen-envelopes/[envelopeId]
 *
 * Get a single teen envelope by ID
 */
export async function GET(request: Request, { params }: RouteParams) {
  const supabase = await createClient();
  const { childId, envelopeId } = await params;

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
      .select("id, parent_user_id, is_teen_mode")
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
        { error: "You do not have permission to view this child's envelopes" },
        { status: 403 }
      );
    }

    // Fetch the envelope
    const { data: envelope, error: envelopeError } = await supabase
      .from("teen_envelopes")
      .select("*")
      .eq("id", envelopeId)
      .eq("child_profile_id", childId)
      .single();

    if (envelopeError || !envelope) {
      return NextResponse.json(
        { error: "Teen envelope not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: envelope });
  } catch (err) {
    console.error(
      "Error in GET /api/kids/[childId]/teen-envelopes/[envelopeId]:",
      err
    );
    return NextResponse.json(
      { error: "Failed to fetch teen envelope" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/kids/[childId]/teen-envelopes/[envelopeId]
 *
 * Update a teen envelope
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  const supabase = await createClient();
  const { childId, envelopeId } = await params;

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
      .select("id, parent_user_id, is_teen_mode")
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
            "You do not have permission to update this child's envelopes",
        },
        { status: 403 }
      );
    }

    // Verify envelope exists and belongs to this child
    const { data: existingEnvelope, error: existingError } = await supabase
      .from("teen_envelopes")
      .select("id")
      .eq("id", envelopeId)
      .eq("child_profile_id", childId)
      .single();

    if (existingError || !existingEnvelope) {
      return NextResponse.json(
        { error: "Teen envelope not found" },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Build update payload (only include provided fields)
    const updatePayload: Record<string, unknown> = {};

    if (body.name !== undefined) {
      if (typeof body.name !== "string" || body.name.trim().length === 0) {
        return NextResponse.json(
          { error: "Envelope name cannot be empty" },
          { status: 400 }
        );
      }
      updatePayload.name = body.name.trim();
    }

    if (body.icon !== undefined) {
      updatePayload.icon = body.icon;
    }

    if (body.subtype !== undefined) {
      const validSubtypes = [
        "bill",
        "spending",
        "savings",
        "goal",
        "tracking",
        "debt",
      ];
      if (!validSubtypes.includes(body.subtype)) {
        return NextResponse.json(
          { error: `Subtype must be one of: ${validSubtypes.join(", ")}` },
          { status: 400 }
        );
      }
      updatePayload.subtype = body.subtype;
    }

    if (body.targetAmount !== undefined) {
      updatePayload.target_amount = body.targetAmount;
    }

    if (body.currentAmount !== undefined) {
      updatePayload.current_amount = body.currentAmount;
    }

    if (body.frequency !== undefined) {
      const validFrequencies = [
        "weekly",
        "fortnightly",
        "monthly",
        "quarterly",
        "annually",
        null,
      ];
      if (!validFrequencies.includes(body.frequency)) {
        return NextResponse.json(
          {
            error: `Frequency must be one of: ${validFrequencies
              .filter(Boolean)
              .join(", ")} or null`,
          },
          { status: 400 }
        );
      }
      updatePayload.frequency = body.frequency;
    }

    if (body.dueDate !== undefined) {
      updatePayload.due_date = body.dueDate;
    }

    if (body.priority !== undefined) {
      const validPriorities = [
        "essential",
        "important",
        "discretionary",
        null,
      ];
      if (!validPriorities.includes(body.priority)) {
        return NextResponse.json(
          {
            error: `Priority must be one of: ${validPriorities
              .filter(Boolean)
              .join(", ")} or null`,
          },
          { status: 400 }
        );
      }
      updatePayload.priority = body.priority;
    }

    if (body.payCycleAmount !== undefined) {
      updatePayload.pay_cycle_amount = body.payCycleAmount;
    }

    if (body.notes !== undefined) {
      updatePayload.notes = body.notes;
    }

    if (body.sortOrder !== undefined) {
      updatePayload.sort_order = body.sortOrder;
    }

    if (body.isActive !== undefined) {
      updatePayload.is_active = body.isActive;
    }

    // Add updated timestamp
    updatePayload.updated_at = new Date().toISOString();

    // Update the envelope
    const { data: updatedEnvelope, error: updateError } = await supabase
      .from("teen_envelopes")
      .update(updatePayload)
      .eq("id", envelopeId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating teen envelope:", updateError);
      return createErrorResponse(
        updateError,
        400,
        "Failed to update teen envelope"
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedEnvelope,
    });
  } catch (err) {
    console.error(
      "Error in PATCH /api/kids/[childId]/teen-envelopes/[envelopeId]:",
      err
    );
    return NextResponse.json(
      { error: "Failed to update teen envelope" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/kids/[childId]/teen-envelopes/[envelopeId]
 *
 * Delete (or deactivate) a teen envelope
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  const supabase = await createClient();
  const { childId, envelopeId } = await params;

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
            "You do not have permission to delete this child's envelopes",
        },
        { status: 403 }
      );
    }

    // Parse query params for soft delete option
    const { searchParams } = new URL(request.url);
    const hardDelete = searchParams.get("hardDelete") === "true";

    // Verify envelope exists
    const { data: envelope, error: envelopeError } = await supabase
      .from("teen_envelopes")
      .select("id, name, current_amount")
      .eq("id", envelopeId)
      .eq("child_profile_id", childId)
      .single();

    if (envelopeError || !envelope) {
      return NextResponse.json(
        { error: "Teen envelope not found" },
        { status: 404 }
      );
    }

    // Warn if envelope has balance
    if (envelope.current_amount > 0 && hardDelete) {
      return NextResponse.json(
        {
          error:
            "Cannot hard delete envelope with remaining balance. Transfer funds first or use soft delete.",
          code: "HAS_BALANCE",
          balance: envelope.current_amount,
        },
        { status: 400 }
      );
    }

    if (hardDelete) {
      // Hard delete - remove from database
      // First, delete any allocations
      await supabase
        .from("teen_envelope_allocations")
        .delete()
        .eq("teen_envelope_id", envelopeId);

      // Then delete the envelope
      const { error: deleteError } = await supabase
        .from("teen_envelopes")
        .delete()
        .eq("id", envelopeId);

      if (deleteError) {
        console.error("Error deleting teen envelope:", deleteError);
        return createErrorResponse(
          deleteError,
          400,
          "Failed to delete teen envelope"
        );
      }
    } else {
      // Soft delete - just mark as inactive
      const { error: updateError } = await supabase
        .from("teen_envelopes")
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", envelopeId);

      if (updateError) {
        console.error("Error deactivating teen envelope:", updateError);
        return createErrorResponse(
          updateError,
          400,
          "Failed to deactivate teen envelope"
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: hardDelete
        ? `Envelope "${envelope.name}" deleted`
        : `Envelope "${envelope.name}" deactivated`,
      hardDeleted: hardDelete,
    });
  } catch (err) {
    console.error(
      "Error in DELETE /api/kids/[childId]/teen-envelopes/[envelopeId]:",
      err
    );
    return NextResponse.json(
      { error: "Failed to delete teen envelope" },
      { status: 500 }
    );
  }
}
