import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { KidInvoiceItem, AddInvoiceItemRequest } from "@/lib/types/kids-invoice";

interface RouteContext {
  params: Promise<{ childId: string; invoiceId: string }>;
}

// GET /api/kids/[childId]/invoices/[invoiceId]/items - Get all items for an invoice
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
    .select("id")
    .eq("id", childId)
    .eq("parent_user_id", user.id)
    .maybeSingle();

  if (!child) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  // Verify invoice exists and belongs to child
  const { data: invoice } = await supabase
    .from("kid_invoices")
    .select("id, invoice_number")
    .eq("id", invoiceId)
    .eq("child_profile_id", childId)
    .maybeSingle();

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  // Get items
  const { data: items, error } = await supabase
    .from("kid_invoice_items")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("completed_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    invoiceNumber: invoice.invoice_number,
    items: items as KidInvoiceItem[],
  });
}

// POST /api/kids/[childId]/invoices/[invoiceId]/items - Add an item to an invoice
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

  // Verify invoice exists, belongs to child, and is still a draft
  const { data: invoice } = await supabase
    .from("kid_invoices")
    .select("id, status")
    .eq("id", invoiceId)
    .eq("child_profile_id", childId)
    .maybeSingle();

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  if (invoice.status !== "draft") {
    return NextResponse.json(
      { error: "Cannot add items to a submitted or paid invoice" },
      { status: 400 }
    );
  }

  const body: AddInvoiceItemRequest = await request.json();

  // Validate required fields
  if (!body.chore_name) {
    return NextResponse.json(
      { error: "Chore name is required" },
      { status: 400 }
    );
  }

  if (!body.amount || body.amount <= 0) {
    return NextResponse.json(
      { error: "Amount must be positive" },
      { status: 400 }
    );
  }

  if (!body.completed_at) {
    return NextResponse.json(
      { error: "Completed date is required" },
      { status: 400 }
    );
  }

  // Add item
  const { data: item, error } = await supabase
    .from("kid_invoice_items")
    .insert({
      invoice_id: invoiceId,
      chore_assignment_id: body.chore_assignment_id || null,
      chore_name: body.chore_name,
      amount: body.amount,
      completed_at: body.completed_at,
      photo_proof_url: body.photo_proof_url || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Total is auto-updated by database trigger

  return NextResponse.json({
    success: true,
    item: item as KidInvoiceItem,
  });
}
