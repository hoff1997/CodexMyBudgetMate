import { createClient } from "@/lib/supabase/server";
import { NetWorthClient } from "@/components/layout/net-worth/net-worth-client";
import type { AssetRow, LiabilityRow, NetWorthSnapshotRow } from "@/lib/types/net-worth";

export default async function NetWorthPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [assetsRes, liabilitiesRes, snapshotsRes, monthlyRes] = await Promise.all([
    supabase
      .from("assets")
      .select("id, name, asset_type, current_value, notes, updated_at")
      .eq("user_id", session?.user.id ?? "")
      .order("updated_at", { ascending: false }),
    supabase
      .from("liabilities")
      .select("id, name, liability_type, current_balance, interest_rate, notes, updated_at")
      .eq("user_id", session?.user.id ?? "")
      .order("updated_at", { ascending: false }),
    supabase
      .from("net_worth_snapshots")
      .select("id, snapshot_date, total_assets, total_liabilities, net_worth")
      .eq("user_id", session?.user.id ?? "")
      .order("snapshot_date", { ascending: true }),
    supabase
      .from("net_worth_snapshots_monthly")
      .select("month_date, source_snapshot_date, total_assets, total_liabilities, net_worth")
      .eq("user_id", session?.user.id ?? "")
      .order("month_date", { ascending: true }),
  ]);

  let assets = (assetsRes.data ?? []) as AssetRow[];
  let liabilities = (liabilitiesRes.data ?? []) as LiabilityRow[];
  let snapshots = (snapshotsRes.data ?? []) as NetWorthSnapshotRow[];
  let monthly = (monthlyRes.data ?? []) as Array<{
    month_date: string;
    source_snapshot_date: string;
    total_assets: number;
    total_liabilities: number;
    net_worth: number;
  }>;

  if (!user) {
    assets = [
      {
        id: crypto.randomUUID(),
        name: "Everyday account",
        asset_type: "cash",
        current_value: 2400,
        notes: null,
      },
      {
        id: crypto.randomUUID(),
        name: "KiwiSaver",
        asset_type: "investment",
        current_value: 12500,
        notes: null,
      },
    ];
    liabilities = [
      {
        id: crypto.randomUUID(),
        name: "Mortgage",
        liability_type: "mortgage",
        current_balance: 320000,
        interest_rate: 5.9,
        notes: null,
      },
    ];
    snapshots = [
      {
        id: crypto.randomUUID(),
        snapshot_date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString(),
        total_assets: 35000,
        total_liabilities: 320000,
        net_worth: -285000,
      },
      {
        id: crypto.randomUUID(),
        snapshot_date: new Date().toISOString(),
        total_assets: 41000,
        total_liabilities: 318000,
        net_worth: -277000,
      },
    ];
    monthly = snapshots.map((snapshot) => ({
      month_date: snapshot.snapshot_date,
      source_snapshot_date: snapshot.snapshot_date,
      total_assets: Number(snapshot.total_assets ?? 0),
      total_liabilities: Number(snapshot.total_liabilities ?? 0),
      net_worth: Number(snapshot.net_worth ?? 0),
    }));
  }

  return (
    <NetWorthClient
      assets={assets}
      liabilities={liabilities}
      snapshots={snapshots}
      monthlySnapshots={monthly}
      canEdit={Boolean(session)}
    />
  );
}
