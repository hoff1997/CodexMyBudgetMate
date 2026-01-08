import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { KidInvoice } from "@/lib/types/kids-invoice";

interface RouteContext {
  params: Promise<{ childId: string; invoiceId: string }>;
}

// GET /api/kids/[childId]/invoices/[invoiceId] - Get a specific invoice with items
export async function GET(request: Request, context: RouteContext) {
  const supabase = await createClient();
  const { childId, invoiceId } = await context.params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify parent owns this child
  const { data: child } = await supabase
    .from("child_profiles")
    .select("id, name")
    .eq("id", childId)
    .eq("parent_user_id", user.id)
    .maybeSingle();

  if (!child) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  // Get invoice with items
  const { data: invoice, error } = await supabase
    .from("kid_invoices")
    .select("*, items:kid_invoice_items(*)")
    .eq("id", invoiceId)
    .eq("child_profile_id", childId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  return NextResponse.json({
    invoice: invoice as KidInvoice,
    childName: child.name,
  });
}

// PATCH /api/kids/[childId]/invoices/[invoiceId] - Update invoice (e.g., mark as paid)
export async function PATCH(request: Request, context: RouteContext) {
  const supabase = await createClient();
  const { childId, invoiceId } = await context.params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify parent owns this child
  const { data: child } = await supabase
    .from("child_profiles")
    .select("id")
    .eq("id", childId)
    .eq("parent_user_id", user.id)
    .maybeSingle();

  if (!child) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  const body = await request.json();
  const { status, payment_notes } = body;

  // Validate status
  const validStatuses = ["draft", "submitted", "paid"];
  if (status && !validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  // Build update object
  const updateData: Record<string, unknown> = {};

  if (status === "paid") {
    updateData.status = "paid";
    updateData.paid_at = new Date().toISOString();
  } else if (status) {
    updateData.status = status;
    // Clear paid_at if unmarking as paid
    if (status !== "paid") {
      updateData.paid_at = null;
    }
  }

  if (payment_notes !== undefined) {
    updateData.payment_notes = payment_notes;
  }

  const { data: invoice, error } = await supabase
    .from("kid_invoices")
    .update(updateData)
    .eq("id", invoiceId)
    .eq("child_profile_id", childId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ invoice });
}

// DELETE /api/kids/[childId]/invoices/[invoiceId] - Delete a draft invoice
export async function DELETE(request: Request, context: RouteContext) {
  const supabase = await createClient();
  const { childId, invoiceId } = await context.params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify parent owns this child
  const { data: child } = await supabase
    .from("child_profiles")
    .select("id")
    .eq("id", childId)
    .eq("parent_user_id", user.id)
    .maybeSingle();

  if (!child) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  // Only allow deleting draft invoices
  const { data: invoice } = await supabase
    .from("kid_invoices")
    .select("status")
    .eq("id", invoiceId)
    .eq("child_profile_id", childId)
    .maybeSingle();

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  if (invoice.status !== "draft") {
    return NextResponse.json(
      { error: "Can only delete draft invoices" },
      { status: 400 }
    );
  }

  // Delete invoice (items will cascade)
  const { error } = await supabase
    .from("kid_invoices")
    .delete()
    .eq("id", invoiceId)
    .eq("child_profile_id", childId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
