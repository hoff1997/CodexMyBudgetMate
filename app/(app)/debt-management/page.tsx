import { createClient } from "@/lib/supabase/server";
import { DebtManagementClient } from "@/components/layout/debt-management/debt-management-client";
import type { DebtEnvelope, DebtLiability } from "@/lib/types/debt";

export default async function DebtManagementPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const [liabilitiesRes, envelopesRes] = await Promise.all([
    supabase
      .from("liabilities")
      .select("id, name, liability_type, current_balance, interest_rate")
      .eq("user_id", session?.user.id ?? "")
      .order("updated_at", { ascending: false }),
    supabase
      .from("envelopes")
      .select("id, name, target_amount, current_amount, pay_cycle_amount, frequency, next_payment_due")
      .eq("user_id", session?.user.id ?? "")
      .order("updated_at", { ascending: false }),
  ]);

  let liabilities: DebtLiability[] =
    (liabilitiesRes.data ?? []).map((liability) => ({
      id: liability.id,
      name: liability.name,
      liabilityType: liability.liability_type,
      balance: Number(liability.current_balance ?? 0),
      interestRate: Number(liability.interest_rate ?? 0),
    })) ?? [];

  let envelopes: DebtEnvelope[] =
    (envelopesRes.data ?? []).map((envelope) => ({
      id: envelope.id,
      name: envelope.name,
      targetAmount: Number(envelope.target_amount ?? 0),
      currentAmount: Number(envelope.current_amount ?? 0),
      payCycleAmount: Number(envelope.pay_cycle_amount ?? 0),
      frequency: envelope.frequency,
      nextPaymentDue: envelope.next_payment_due,
    })) ?? [];

  const demoMode = !session;

  if (demoMode) {
    liabilities = [
      {
        id: "demo-anz-card",
        name: "ANZ credit card",
        liabilityType: "credit_card",
        balance: 4200,
        interestRate: 19.95,
      },
      {
        id: "demo-westpac-loan",
        name: "Westpac personal loan",
        liabilityType: "personal_loan",
        balance: 11800,
        interestRate: 12.5,
      },
      {
        id: "demo-studylink",
        name: "StudyLink student loan",
        liabilityType: "student_loan",
        balance: 26400,
        interestRate: 3.9,
      },
      {
        id: "demo-harvey-norman",
        name: "Harvey Norman store card",
        liabilityType: "store_card",
        balance: 2300,
        interestRate: 23.5,
      },
    ];

    envelopes = [
      {
        id: "demo-env-anz",
        name: "ANZ card payment",
        targetAmount: 0,
        currentAmount: 0,
        payCycleAmount: 220,
        frequency: "monthly",
        nextPaymentDue: null,
      },
      {
        id: "demo-env-westpac",
        name: "Westpac loan payment",
        targetAmount: 0,
        currentAmount: 0,
        payCycleAmount: 410,
        frequency: "monthly",
        nextPaymentDue: null,
      },
      {
        id: "demo-env-studylink",
        name: "StudyLink repayment",
        targetAmount: 0,
        currentAmount: 0,
        payCycleAmount: 180,
        frequency: "monthly",
        nextPaymentDue: null,
      },
    ];
  }

  return (
    <DebtManagementClient liabilities={liabilities} envelopes={envelopes} demoMode={demoMode} />
  );
}
