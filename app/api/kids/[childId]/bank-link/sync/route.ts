import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteContext {
  params: Promise<{ childId: string }>;
}

// POST /api/kids/[childId]/bank-link/sync - Sync bank account balances and transactions
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
    .select("id, name")
    .eq("id", childId)
    .eq("parent_user_id", user.id)
    .maybeSingle();

  if (!child) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  // Get active connection
  const { data: connection, error: connError } = await supabase
    .from("teen_akahu_connections")
    .select("*")
    .eq("child_profile_id", childId)
    .eq("connection_status", "active")
    .maybeSingle();

  if (connError || !connection) {
    return NextResponse.json(
      { error: "No active bank connection found" },
      { status: 400 }
    );
  }

  // In a real implementation, this would:
  // 1. Use the Akahu access token to fetch account balances
  // 2. Fetch new transactions since last sync
  // 3. Detect interest transactions and trigger goal allocation
  // 4. Update teen_linked_accounts with new balances
  // 5. Insert new transactions into teen_imported_transactions

  // For now, we'll simulate a successful sync
  const { data: linkedAccounts } = await supabase
    .from("teen_linked_accounts")
    .select("*")
    .eq("child_profile_id", childId)
    .eq("is_active", true);

  // Update last sync time
  await supabase
    .from("teen_akahu_connections")
    .update({
      last_sync_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", connection.id);

  // Update child_bank_accounts with real balance if linked
  for (const account of linkedAccounts || []) {
    if (account.child_bank_account_id) {
      await supabase
        .from("child_bank_accounts")
        .update({
          current_balance: account.current_balance,
          updated_at: new Date().toISOString(),
        })
        .eq("id", account.child_bank_account_id);
    }
  }

  return NextResponse.json({
    success: true,
    message: `Bank accounts synced for ${child.name}`,
    syncedAt: new Date().toISOString(),
    accountsUpdated: linkedAccounts?.length || 0,
  });
}

// GET /api/kids/[childId]/bank-link/sync - Get last sync info
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
    .select("id")
    .eq("id", childId)
    .eq("parent_user_id", user.id)
    .maybeSingle();

  if (!child) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  // Get connection with last sync info
  const { data: connection } = await supabase
    .from("teen_akahu_connections")
    .select("last_sync_at, connection_status, last_error")
    .eq("child_profile_id", childId)
    .maybeSingle();

  if (!connection) {
    return NextResponse.json({ error: "No connection found" }, { status: 404 });
  }

  return NextResponse.json({
    lastSyncAt: connection.last_sync_at,
    connectionStatus: connection.connection_status,
    lastError: connection.last_error,
  });
}
