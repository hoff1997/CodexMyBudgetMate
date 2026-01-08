import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { checkBetaAccess } from "@/lib/utils/beta-access";
import { KidInvoiceClient } from "./kid-invoice-client";

interface PageProps {
  params: Promise<{ childId: string }>;
}

export default async function KidInvoicePage({ params }: PageProps) {
  const { childId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check beta access
  const betaAccess = await checkBetaAccess();
  if (!betaAccess.hasAccess) {
    redirect("/dashboard");
  }

  // Fetch the child profile (verify parent ownership)
  const { data: child } = await supabase
    .from("child_profiles")
    .select("id, name, avatar_url")
    .eq("id", childId)
    .eq("parent_user_id", user.id)
    .single();

  if (!child) {
    redirect("/kids/setup");
  }

  // Fetch all invoices (draft, submitted, paid) with items
  const { data: invoices } = await supabase
    .from("kid_invoices")
    .select(`
      id,
      invoice_number,
      status,
      total_amount,
      created_at,
      submitted_at,
      paid_at,
      kid_invoice_items (
        id,
        chore_name,
        amount,
        completed_at,
        approved_at,
        chore_assignment:chore_assignments (
          id,
          week_starting,
          chore_template:chore_templates (
            icon
          )
        )
      )
    `)
    .eq("child_profile_id", childId)
    .in("status", ["draft", "submitted", "paid"])
    .order("created_at", { ascending: false });

  // Format all invoices with their items
  const formattedInvoices = (invoices || []).map((invoice: any) => {
    const items = (invoice.kid_invoice_items || []).map((item: any) => {
      const assignment = Array.isArray(item.chore_assignment)
        ? item.chore_assignment[0]
        : item.chore_assignment;
      const template = assignment?.chore_template
        ? (Array.isArray(assignment.chore_template)
            ? assignment.chore_template[0]
            : assignment.chore_template)
        : null;

      return {
        id: item.id,
        name: item.chore_name,
        icon: template?.icon || "💰",
        amount: Number(item.amount),
        approvedAt: item.approved_at || item.completed_at,
        weekStarting: assignment?.week_starting || new Date().toISOString().split("T")[0],
      };
    });

    return {
      id: invoice.id,
      invoiceNumber: invoice.invoice_number,
      status: invoice.status,
      totalAmount: Number(invoice.total_amount),
      createdAt: invoice.created_at,
      submittedAt: invoice.submitted_at,
      paidAt: invoice.paid_at,
      items,
    };
  });

  // Separate current (draft/submitted) from history (paid)
  const currentInvoice = formattedInvoices.find(
    (inv: any) => inv.status === "draft" || inv.status === "submitted"
  ) || null;
  const invoiceHistory = formattedInvoices.filter(
    (inv: any) => inv.status === "paid"
  );

  return (
    <KidInvoiceClient
      child={child}
      currentInvoice={currentInvoice}
      invoiceHistory={invoiceHistory}
    />
  );
}
