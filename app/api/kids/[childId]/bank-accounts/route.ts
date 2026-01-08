import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteContext {
  params: Promise<{ childId: string }>;
}

interface BankAccount {
  id: string;
  envelope_type: "spend" | "save" | "invest" | "give";
  account_name: string;
  current_balance: number;
  last_synced_at: string | null;
  is_linked: boolean;
}

// GET /api/kids/[childId]/bank-accounts - Get all bank accounts for a child
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

  // Try to get linked bank accounts from kid_bank_accounts table
  const { data: linkedAccounts, error: linkedError } = await supabase
    .from("kid_bank_accounts")
    .select("*")
    .eq("child_profile_id", childId);

  if (linkedError) {
    // Table might not exist yet - return placeholder accounts
    const placeholderAccounts: BankAccount[] = [
      { id: "spend-placeholder", envelope_type: "spend", account_name: "Spend", current_balance: 0, last_synced_at: null, is_linked: false },
      { id: "save-placeholder", envelope_type: "save", account_name: "Save", current_balance: 0, last_synced_at: null, is_linked: false },
      { id: "invest-placeholder", envelope_type: "invest", account_name: "Invest", current_balance: 0, last_synced_at: null, is_linked: false },
      { id: "give-placeholder", envelope_type: "give", account_name: "Give", current_balance: 0, last_synced_at: null, is_linked: false },
    ];

    return NextResponse.json({
      childId,
      childName: child.name,
      accounts: placeholderAccounts,
      isLinked: false,
      totalBalance: 0,
    });
  }

  // If we have linked accounts, format them
  if (linkedAccounts && linkedAccounts.length > 0) {
    const accounts: BankAccount[] = linkedAccounts.map((acc) => ({
      id: acc.id,
      envelope_type: acc.envelope_type,
      account_name: acc.account_name || acc.envelope_type,
      current_balance: acc.current_balance || 0,
      last_synced_at: acc.last_synced_at,
      is_linked: true,
    }));

    const totalBalance = accounts.reduce((sum, acc) => sum + acc.current_balance, 0);

    return NextResponse.json({
      childId,
      childName: child.name,
      accounts,
      isLinked: true,
      totalBalance,
    });
  }

  // No linked accounts - return placeholder structure
  const placeholderAccounts: BankAccount[] = [
    { id: "spend-placeholder", envelope_type: "spend", account_name: "Spend", current_balance: 0, last_synced_at: null, is_linked: false },
    { id: "save-placeholder", envelope_type: "save", account_name: "Save", current_balance: 0, last_synced_at: null, is_linked: false },
    { id: "invest-placeholder", envelope_type: "invest", account_name: "Invest", current_balance: 0, last_synced_at: null, is_linked: false },
    { id: "give-placeholder", envelope_type: "give", account_name: "Give", current_balance: 0, last_synced_at: null, is_linked: false },
  ];

  return NextResponse.json({
    childId,
    childName: child.name,
    accounts: placeholderAccounts,
    isLinked: false,
    totalBalance: 0,
  });
}
