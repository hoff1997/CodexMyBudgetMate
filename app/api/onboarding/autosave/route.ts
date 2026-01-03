import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * GET /api/onboarding/autosave
 * Retrieves the user's onboarding draft if one exists
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the draft
    const { data: draft, error } = await supabase
      .from("onboarding_drafts")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching onboarding draft:", error);
      return NextResponse.json({ error: "Failed to fetch draft" }, { status: 500 });
    }

    if (!draft) {
      return NextResponse.json({ hasDraft: false });
    }

    return NextResponse.json({
      hasDraft: true,
      draft: {
        currentStep: draft.current_step,
        fullName: draft.full_name,
        bankAccounts: draft.bank_accounts || [],
        incomeSources: draft.income_sources || [],
        useTemplate: draft.use_template,
        envelopes: draft.envelopes || [],
        envelopeAllocations: draft.envelope_allocations || {},
        openingBalances: draft.opening_balances || {},
        lastSavedAt: draft.last_saved_at,
      },
    });
  } catch (error) {
    console.error("Autosave GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/onboarding/autosave
 * Saves the user's onboarding progress
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      currentStep,
      fullName,
      bankAccounts,
      incomeSources,
      useTemplate,
      envelopes,
      envelopeAllocations,
      openingBalances,
    } = body;

    // Upsert the draft
    const { error } = await supabase
      .from("onboarding_drafts")
      .upsert(
        {
          user_id: user.id,
          current_step: currentStep,
          full_name: fullName || null,
          bank_accounts: bankAccounts || [],
          income_sources: incomeSources || [],
          use_template: useTemplate ?? true,
          envelopes: envelopes || [],
          envelope_allocations: envelopeAllocations || {},
          opening_balances: openingBalances || {},
        },
        {
          onConflict: "user_id",
        }
      );

    if (error) {
      console.error("Error saving onboarding draft:", error);
      return NextResponse.json({ error: "Failed to save draft" }, { status: 500 });
    }

    // Update profile to mark that there's a draft
    await supabase
      .from("profiles")
      .update({ has_onboarding_draft: true })
      .eq("id", user.id);

    return NextResponse.json({
      success: true,
      message: "Draft saved",
    });
  } catch (error) {
    console.error("Autosave POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/onboarding/autosave
 * Deletes the user's onboarding draft (called when onboarding completes)
 */
export async function DELETE() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Delete the draft
    const { error } = await supabase
      .from("onboarding_drafts")
      .delete()
      .eq("user_id", user.id);

    if (error) {
      console.error("Error deleting onboarding draft:", error);
      return NextResponse.json({ error: "Failed to delete draft" }, { status: 500 });
    }

    // Update profile to mark that there's no draft
    await supabase
      .from("profiles")
      .update({ has_onboarding_draft: false })
      .eq("id", user.id);

    return NextResponse.json({
      success: true,
      message: "Draft deleted",
    });
  } catch (error) {
    console.error("Autosave DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
