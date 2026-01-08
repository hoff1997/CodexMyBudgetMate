import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { KidInvoice } from "@/lib/types/kids-invoice";

interface RouteContext {
  params: Promise<{ childId: string }>;
}

// GET /api/kids/[childId]/invoices - Get all invoices for a child
export async function GET(request: Request, context: RouteContext) {
  const supabase = await createClient();
  const { childId } = await context.params;

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

  // Parse query params for filtering
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const limit = parseInt(searchParams.get("limit") || "20");

  // Build query
  let query = supabase
    .from("kid_invoices")
    .select("*, items:kid_invoice_items(*)")
    .eq("child_profile_id", childId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status) {
    query = query.eq("status", status);
  }

  const { data: invoices, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    childId,
    childName: child.name,
    invoices: invoices as KidInvoice[],
  });
}

// POST /api/kids/[childId]/invoices - Create a new draft invoice
export async function POST(request: Request, context: RouteContext) {
  const supabase = await createClient();
  const { childId } = await context.params;

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

  // Check if there's already a draft invoice
  const { data: existingDraft } = await supabase
    .from("kid_invoices")
    .select("id, invoice_number")
    .eq("child_profile_id", childId)
    .eq("status", "draft")
    .maybeSingle();

  if (existingDraft) {
    return NextResponse.json({
      success: true,
      invoice: existingDraft,
      message: "Draft invoice already exists",
    });
  }

  // Generate invoice number using the database function
  const { data: invoiceNumberResult, error: invoiceNumberError } = await supabase
    .rpc("generate_kid_invoice_number", { p_child_id: childId });

  if (invoiceNumberError) {
    // Fallback if function doesn't exist yet
    const year = new Date().getFullYear();
    const { count } = await supabase
      .from("kid_invoices")
      .select("id", { count: "exact", head: true })
      .eq("child_profile_id", childId);

    const invoiceNumber = `INV-${year}-${String((count || 0) + 1).padStart(3, "0")}`;

    const { data: invoice, error } = await supabase
      .from("kid_invoices")
      .insert({
        child_profile_id: childId,
        invoice_number: invoiceNumber,
        status: "draft",
        total_amount: 0,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      invoice: invoice as KidInvoice,
    });
  }

  // Create invoice with generated number
  const { data: invoice, error } = await supabase
    .from("kid_invoices")
    .insert({
      child_profile_id: childId,
      invoice_number: invoiceNumberResult,
      status: "draft",
      total_amount: 0,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    invoice: invoice as KidInvoice,
  });
}
