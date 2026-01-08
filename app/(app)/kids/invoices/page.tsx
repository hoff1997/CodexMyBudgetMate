import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { checkBetaAccess } from "@/lib/utils/beta-access";
import { InvoicesClient } from "./invoices-client";

export default async function InvoicesPage() {
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

  // Fetch all children for this parent
  const { data: children } = await supabase
    .from("child_profiles")
    .select("id, name, avatar_url")
    .eq("parent_user_id", user.id)
    .order("name");

  if (!children || children.length === 0) {
    redirect("/kids/setup");
  }

  // Fetch invoices (draft, submitted, and paid) with their items for each child
  const { data: invoices } = await supabase
    .from("kid_invoices")
    .select(`
      id,
      child_profile_id,
      invoice_number,
      status,
      total_amount,
      created_at,
      submitted_at,
      paid_at,
      payment_notes,
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
    .in("status", ["draft", "submitted", "paid"])
    .in(
      "child_profile_id",
      children.map((c) => c.id)
    )
    .order("created_at", { ascending: false });

  // Group by child and calculate totals from invoice items
  const childEarnings: Record<
    string,
    {
      total: number;
      invoiceId: string | null;
      invoiceNumber: string | null;
      status: string;
      submittedAt: string | null;
      paidAt: string | null;
      chores: Array<{
        id: string;
        name: string;
        icon: string;
        amount: number;
        approvedAt: string;
        weekStarting: string;
      }>;
    }
  > = {};

  for (const child of children) {
    childEarnings[child.id] = { total: 0, invoiceId: null, invoiceNumber: null, status: "none", submittedAt: null, paidAt: null, chores: [] };
  }

  for (const invoice of invoices || []) {
    const childId = invoice.child_profile_id;
    if (childEarnings[childId]) {
      childEarnings[childId].invoiceId = invoice.id;
      childEarnings[childId].invoiceNumber = invoice.invoice_number;
      childEarnings[childId].status = invoice.status;
      childEarnings[childId].submittedAt = invoice.submitted_at;
      childEarnings[childId].paidAt = invoice.paid_at;

      const items = invoice.kid_invoice_items || [];
      for (const item of items) {
        // Handle nested Supabase array joins
        const assignment = Array.isArray(item.chore_assignment)
          ? item.chore_assignment[0]
          : item.chore_assignment;
        const template = assignment?.chore_template
          ? (Array.isArray(assignment.chore_template)
              ? assignment.chore_template[0]
              : assignment.chore_template)
          : null;

        childEarnings[childId].total += Number(item.amount);
        childEarnings[childId].chores.push({
          id: item.id,
          name: item.chore_name,
          icon: template?.icon || "💰",
          amount: Number(item.amount),
          approvedAt: item.approved_at || item.completed_at,
          weekStarting: assignment?.week_starting || new Date().toISOString().split("T")[0],
        });
      }
    }
  }

  return (
    <InvoicesClient
      childProfiles={children}
      earnings={childEarnings}
    />
  );
}
