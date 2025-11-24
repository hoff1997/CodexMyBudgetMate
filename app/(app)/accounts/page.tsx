import { createClient } from "@/lib/supabase/server";
import { AccountManagerClient } from "@/components/layout/accounts/account-manager-client";
import { AccountRow } from "@/lib/types/accounts";

export default async function AccountsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("accounts")
    .select("id, name, type, current_balance, institution, reconciled, updated_at")
    .order("type");

  const list = error ? [] : (data ?? []);

  return <AccountManagerClient accounts={list as AccountRow[]} canEdit={Boolean(session)} />;
}
