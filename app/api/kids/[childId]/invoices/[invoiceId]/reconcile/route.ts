import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { KidInvoice, ReconcileInvoiceRequest } from "@/lib/types/kids-invoice";
import { KidsNotifications } from "@/lib/services/notifications";

interface RouteContext {
  params: Promise<{ childId: string; invoiceId: string }>;
}

// POST /api/kids/[childId]/invoices/[invoiceId]/reconcile - Mark invoice as paid
export async function POST(request: Request, context: RouteContext) {
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

  // Get invoice
  const { data: invoice } = await supabase
    .from("kid_invoices")
    .select("*")
    .eq("id", invoiceId)
    .eq("child_profile_id", childId)
    .maybeSingle();

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  if (invoice.status === "paid") {
    return NextResponse.json(
      { error: "Invoice has already been paid" },
      { status: 400 }
    );
  }

  if (invoice.status === "draft") {
    return NextResponse.json(
      { error: "Invoice must be submitted before it can be paid" },
      { status: 400 }
    );
  }

  const body: ReconcileInvoiceRequest = await request.json();

  // Mark as paid
  const { data: updatedInvoice, error } = await supabase
    .from("kid_invoices")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      payment_transaction_id: body.payment_transaction_id || null,
      payment_notes: body.payment_notes || null,
    })
    .eq("id", invoiceId)
    .eq("child_profile_id", childId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Notify that invoice was paid (parent sees this, indicates child's earnings)
  await KidsNotifications.invoicePaid(
    supabase,
    user.id,
    childId,
    child.name,
    invoice.total_amount || 0
  );

  // TODO: Trigger auto-distribution to child's envelopes if configured

  return NextResponse.json({
    success: true,
    invoice: updatedInvoice as KidInvoice,
    message: `Invoice ${invoice.invoice_number} marked as paid`,
    childName: child.name,
  });
}
