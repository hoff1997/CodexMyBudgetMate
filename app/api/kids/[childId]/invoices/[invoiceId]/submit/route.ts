import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { KidInvoice } from "@/lib/types/kids-invoice";

interface RouteContext {
  params: Promise<{ childId: string; invoiceId: string }>;
}

// POST /api/kids/[childId]/invoices/[invoiceId]/submit - Submit an invoice for payment
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
    .select("id")
    .eq("id", childId)
    .eq("parent_user_id", user.id)
    .maybeSingle();

  if (!child) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  // Get invoice
  const { data: invoice } = await supabase
    .from("kid_invoices")
    .select("*, items:kid_invoice_items(*)")
    .eq("id", invoiceId)
    .eq("child_profile_id", childId)
    .maybeSingle();

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  if (invoice.status !== "draft") {
    return NextResponse.json(
      { error: "Invoice has already been submitted" },
      { status: 400 }
    );
  }

  // Check if invoice has any items
  if (!invoice.items || invoice.items.length === 0) {
    return NextResponse.json(
      { error: "Cannot submit an empty invoice" },
      { status: 400 }
    );
  }

  // Check if all items are approved (optional - can be removed if not required)
  const unapprovedItems = invoice.items.filter(
    (item: { approved_at: string | null }) => !item.approved_at
  );

  if (unapprovedItems.length > 0) {
    return NextResponse.json(
      {
        error: `${unapprovedItems.length} item(s) pending approval`,
        unapprovedCount: unapprovedItems.length,
      },
      { status: 400 }
    );
  }

  // Submit invoice
  const { data: updatedInvoice, error } = await supabase
    .from("kid_invoices")
    .update({
      status: "submitted",
      submitted_at: new Date().toISOString(),
    })
    .eq("id", invoiceId)
    .eq("child_profile_id", childId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // TODO: Send notification to parent about submitted invoice

  return NextResponse.json({
    success: true,
    invoice: updatedInvoice as KidInvoice,
    message: "Invoice submitted for payment",
  });
}
