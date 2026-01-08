import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { KidInvoiceItem } from "@/lib/types/kids-invoice";

interface RouteContext {
  params: Promise<{ childId: string; invoiceId: string; itemId: string }>;
}

// GET /api/kids/[childId]/invoices/[invoiceId]/items/[itemId] - Get a specific item
export async function GET(request: Request, context: RouteContext) {
  const supabase = await createClient();
  const { childId, invoiceId, itemId } = await context.params;

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
    .select("id")
    .eq("id", invoiceId)
    .eq("child_profile_id", childId)
    .maybeSingle();

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  // Get item
  const { data: item, error } = await supabase
    .from("kid_invoice_items")
    .select("*")
    .eq("id", itemId)
    .eq("invoice_id", invoiceId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  return NextResponse.json({
    item: item as KidInvoiceItem,
  });
}

// PATCH /api/kids/[childId]/invoices/[invoiceId]/items/[itemId] - Approve an item
export async function PATCH(request: Request, context: RouteContext) {
  const supabase = await createClient();
  const { childId, invoiceId, itemId } = await context.params;

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
    .select("id, status")
    .eq("id", invoiceId)
    .eq("child_profile_id", childId)
    .maybeSingle();

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  if (invoice.status === "paid") {
    return NextResponse.json(
      { error: "Cannot modify items on a paid invoice" },
      { status: 400 }
    );
  }

  const body = await request.json();

  // Update item - currently only supports approval
  const updateData: Record<string, unknown> = {};

  if (body.approve === true) {
    updateData.approved_at = new Date().toISOString();
    updateData.approved_by = user.id;
  } else if (body.approve === false) {
    updateData.approved_at = null;
    updateData.approved_by = null;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 }
    );
  }

  const { data: item, error } = await supabase
    .from("kid_invoice_items")
    .update(updateData)
    .eq("id", itemId)
    .eq("invoice_id", invoiceId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    item: item as KidInvoiceItem,
    message: body.approve ? "Item approved" : "Item approval revoked",
  });
}

// DELETE /api/kids/[childId]/invoices/[invoiceId]/items/[itemId] - Remove an item
export async function DELETE(request: Request, context: RouteContext) {
  const supabase = await createClient();
  const { childId, invoiceId, itemId } = await context.params;

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
      { error: "Cannot remove items from a submitted or paid invoice" },
      { status: 400 }
    );
  }

  // Delete item
  const { error } = await supabase
    .from("kid_invoice_items")
    .delete()
    .eq("id", itemId)
    .eq("invoice_id", invoiceId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Total is auto-updated by database trigger

  return NextResponse.json({ success: true });
}
