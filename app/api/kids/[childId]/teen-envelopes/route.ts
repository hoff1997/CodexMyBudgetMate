import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkBetaAccess } from "@/lib/utils/beta-access";
import {
  createErrorResponse,
  createUnauthorizedError,
} from "@/lib/utils/api-error";
import { canTeenAddEnvelope, TEEN_MODE_LIMITS } from "@/lib/utils/teen-limits";

interface RouteParams {
  params: Promise<{ childId: string }>;
}

/**
 * GET /api/kids/[childId]/teen-envelopes
 *
 * Get all teen envelopes for a child in teen mode
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

    if (!child.is_teen_mode) {
      return NextResponse.json(
        { error: "Teen mode is not enabled for this child" },
        { status: 400 }
      );
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get("includeInactive") === "true";

    // Fetch teen envelopes
    let query = supabase
      .from("teen_envelopes")
      .select("*")
      .eq("child_profile_id", childId)
      .order("sort_order", { ascending: true });

    if (!includeInactive) {
      query = query.eq("is_active", true);
    }

    const { data: envelopes, error: envelopesError } = await query;

    if (envelopesError) {
      return createErrorResponse(
        envelopesError,
        400,
        "Failed to fetch teen envelopes"
      );
    }

    // Get envelope count for limit info
    const activeCount = envelopes?.filter((e) => e.is_active).length || 0;

    return NextResponse.json({
      data: envelopes || [],
      limits: {
        current: activeCount,
        max: TEEN_MODE_LIMITS.envelopes,
        canAdd: activeCount < TEEN_MODE_LIMITS.envelopes,
        remaining: Math.max(0, TEEN_MODE_LIMITS.envelopes - activeCount),
      },
    });
  } catch (err) {
    console.error("Error in GET /api/kids/[childId]/teen-envelopes:", err);
    return NextResponse.json(
      { error: "Failed to fetch teen envelopes" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/kids/[childId]/teen-envelopes
 *
 * Create a new teen envelope (subject to 6 envelope limit)
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
      .select("id, parent_user_id, is_teen_mode, graduation_status")
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
          error: "You do not have permission to create envelopes for this child",
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

    // Check envelope limit
    const limitCheck = await canTeenAddEnvelope(childId);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error: "Envelope limit reached",
          code: "TEEN_ENVELOPE_LIMIT",
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
      icon,
      subtype,
      targetAmount,
      currentAmount,
      frequency,
      dueDate,
      priority,
      payCycleAmount,
      notes,
      sortOrder,
    } = body;

    // Validate required fields
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Envelope name is required" },
        { status: 400 }
      );
    }

    const validSubtypes = [
      "bill",
      "spending",
      "savings",
      "goal",
      "tracking",
      "debt",
    ];
    if (!subtype || !validSubtypes.includes(subtype)) {
      return NextResponse.json(
        { error: `Subtype must be one of: ${validSubtypes.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate priority if provided
    const validPriorities = ["essential", "important", "discretionary"];
    if (priority && !validPriorities.includes(priority)) {
      return NextResponse.json(
        { error: `Priority must be one of: ${validPriorities.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate frequency if provided
    const validFrequencies = [
      "weekly",
      "fortnightly",
      "monthly",
      "quarterly",
      "annually",
    ];
    if (frequency && !validFrequencies.includes(frequency)) {
      return NextResponse.json(
        { error: `Frequency must be one of: ${validFrequencies.join(", ")}` },
        { status: 400 }
      );
    }

    // Create the envelope
    const { data: envelope, error: insertError } = await supabase
      .from("teen_envelopes")
      .insert({
        child_profile_id: childId,
        name: name.trim(),
        icon: icon || "📦",
        subtype,
        target_amount: targetAmount || 0,
        current_amount: currentAmount || 0,
        frequency: frequency || null,
        due_date: dueDate || null,
        priority: priority || null,
        pay_cycle_amount: payCycleAmount || 0,
        notes: notes || null,
        sort_order: sortOrder ?? 0,
        is_active: true,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating teen envelope:", insertError);
      return createErrorResponse(
        insertError,
        400,
        "Failed to create teen envelope"
      );
    }

    // Return success with updated limit info
    return NextResponse.json(
      {
        success: true,
        data: envelope,
        limits: {
          current: limitCheck.currentCount + 1,
          max: TEEN_MODE_LIMITS.envelopes,
          canAdd: limitCheck.currentCount + 1 < TEEN_MODE_LIMITS.envelopes,
          remaining: Math.max(
            0,
            TEEN_MODE_LIMITS.envelopes - (limitCheck.currentCount + 1)
          ),
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Error in POST /api/kids/[childId]/teen-envelopes:", err);
    return NextResponse.json(
      { error: "Failed to create teen envelope" },
      { status: 500 }
    );
  }
}
