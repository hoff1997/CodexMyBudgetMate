import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type {
  KidPaymentSettings,
  UpdateKidPaymentSettingsRequest,
} from "@/lib/types/kids-invoice";
import { createErrorResponse, createUnauthorizedError, createValidationError, createNotFoundError } from "@/lib/utils/api-error";

interface RouteContext {
  params: Promise<{ childId: string }>;
}

// GET /api/kids/[childId]/payment-settings - Get payment settings for a child
export async function GET(request: Request, context: RouteContext) {
  const supabase = await createClient();
  const { childId } = await context.params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  // Verify parent owns this child
  const { data: child } = await supabase
    .from("child_profiles")
    .select("id, name")
    .eq("id", childId)
    .eq("parent_user_id", user.id)
    .maybeSingle();

  if (!child) {
    return createNotFoundError("Child");
  }

  // Get payment settings
  const { data: settings, error } = await supabase
    .from("kid_payment_settings")
    .select("*")
    .eq("child_profile_id", childId)
    .maybeSingle();

  if (error) {
    return createErrorResponse(error, 400, "Failed to fetch payment settings");
  }

  // Return defaults if no settings exist
  const paymentSettings: KidPaymentSettings = settings || {
    id: "",
    child_profile_id: childId,
    invoice_frequency: "weekly",
    invoice_day: 5, // Friday
    reminder_enabled: true,
    auto_submit: false,
    created_at: "",
    updated_at: "",
  };

  return NextResponse.json({
    childId,
    childName: child.name,
    settings: paymentSettings,
    isDefault: !settings,
  });
}

// PUT /api/kids/[childId]/payment-settings - Create or update payment settings
export async function PUT(request: Request, context: RouteContext) {
  const supabase = await createClient();
  const { childId } = await context.params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  // Verify parent owns this child
  const { data: child } = await supabase
    .from("child_profiles")
    .select("id")
    .eq("id", childId)
    .eq("parent_user_id", user.id)
    .maybeSingle();

  if (!child) {
    return createNotFoundError("Child");
  }

  const body: UpdateKidPaymentSettingsRequest = await request.json();

  // Validate invoice_day based on frequency
  if (body.invoice_day !== undefined) {
    if (body.invoice_frequency === "weekly" || body.invoice_frequency === "fortnightly") {
      if (body.invoice_day < 0 || body.invoice_day > 6) {
        return createValidationError("Invoice day must be 0-6 for weekly/fortnightly frequency");
      }
    } else if (body.invoice_frequency === "monthly") {
      if (body.invoice_day < 1 || body.invoice_day > 28) {
        return createValidationError("Invoice day must be 1-28 for monthly frequency");
      }
    }
  }

  // Check if settings exist
  const { data: existing } = await supabase
    .from("kid_payment_settings")
    .select("id")
    .eq("child_profile_id", childId)
    .maybeSingle();

  if (existing) {
    // Update existing settings
    const { data: settings, error } = await supabase
      .from("kid_payment_settings")
      .update({
        invoice_frequency: body.invoice_frequency,
        invoice_day: body.invoice_day,
        reminder_enabled: body.reminder_enabled,
        auto_submit: body.auto_submit,
      })
      .eq("child_profile_id", childId)
      .select()
      .single();

    if (error) {
      return createErrorResponse(error, 400, "Failed to update payment settings");
    }

    return NextResponse.json({
      success: true,
      settings: settings as KidPaymentSettings,
    });
  } else {
    // Create new settings
    const { data: settings, error } = await supabase
      .from("kid_payment_settings")
      .insert({
        child_profile_id: childId,
        invoice_frequency: body.invoice_frequency || "weekly",
        invoice_day: body.invoice_day || 5,
        reminder_enabled: body.reminder_enabled ?? true,
        auto_submit: body.auto_submit ?? false,
      })
      .select()
      .single();

    if (error) {
      return createErrorResponse(error, 400, "Failed to create payment settings");
    }

    return NextResponse.json({
      success: true,
      settings: settings as KidPaymentSettings,
      created: true,
    });
  }
}
