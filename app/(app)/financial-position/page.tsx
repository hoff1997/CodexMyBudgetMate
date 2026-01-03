import { createClient } from "@/lib/supabase/server";
import { FinancialPositionClient } from "@/components/layout/financial-position/financial-position-client";
import type { AssetRow, LiabilityRow, NetWorthSnapshotRow } from "@/lib/types/net-worth";
import type { AccountRow } from "@/lib/types/accounts";

// Type for budget allocation by category
export type BudgetCategoryAllocation = {
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  totalBudget: number;
};

export default async function FinancialPositionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [assetsRes, liabilitiesRes, snapshotsRes, monthlyRes, accountsRes, envelopesRes, categoriesRes] = await Promise.all([
    supabase
      .from("assets")
      .select("id, name, asset_type, current_value, notes, updated_at")
      .eq("user_id", user?.id ?? "")
      .order("updated_at", { ascending: false }),
    supabase
      .from("liabilities")
      .select("id, name, liability_type, current_balance, interest_rate, notes, updated_at")
      .eq("user_id", user?.id ?? "")
      .order("updated_at", { ascending: false }),
    supabase
      .from("net_worth_snapshots")
      .select("id, snapshot_date, total_assets, total_liabilities, net_worth")
      .eq("user_id", user?.id ?? "")
      .order("snapshot_date", { ascending: true }),
    supabase
      .from("net_worth_snapshots_monthly")
      .select("month_date, source_snapshot_date, total_assets, total_liabilities, net_worth")
      .eq("user_id", user?.id ?? "")
      .order("month_date", { ascending: true }),
    supabase
      .from("accounts")
      .select("id, name, type, current_balance, institution, reconciled, updated_at")
      .order("type"),
    // Fetch envelopes with their category info for budget allocation
    supabase
      .from("envelopes")
      .select("id, name, category_id, pay_cycle_amount, target_amount, frequency")
      .eq("user_id", user?.id ?? ""),
    // Fetch categories
    supabase
      .from("envelope_categories")
      .select("id, name, icon, display_order")
      .eq("user_id", user?.id ?? "")
      .order("display_order", { ascending: true }),
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
  let accounts = (accountsRes.data ?? []) as AccountRow[];
  const envelopes = (envelopesRes.data ?? []) as Array<{
    id: string;
    name: string;
    category_id: string | null;
    pay_cycle_amount: number | null;
    target_amount: number | null;
    frequency: string | null;
  }>;
  const categories = (categoriesRes.data ?? []) as Array<{
    id: string;
    name: string;
    icon: string | null;
    display_order: number;
  }>;

  // Calculate budget allocation by category
  const categoryMap = new Map(categories.map(c => [c.id, c]));
  const budgetByCategory = new Map<string, { name: string; icon: string | null; total: number }>();

  // Initialize with "Uncategorized"
  budgetByCategory.set("uncategorized", { name: "Uncategorized", icon: "📁", total: 0 });

  // Add all categories
  categories.forEach(cat => {
    budgetByCategory.set(cat.id, { name: cat.name, icon: cat.icon, total: 0 });
  });

  // Sum up budget amounts per category
  // Use pay_cycle_amount if set, otherwise use target_amount as the monthly budget
  envelopes.forEach(env => {
    // Prefer pay_cycle_amount, fallback to target_amount
    let amount = Number(env.pay_cycle_amount ?? 0);
    if (amount === 0) {
      // If no pay_cycle_amount, use target_amount directly (assuming monthly for display)
      amount = Number(env.target_amount ?? 0);
    }
    const categoryId = env.category_id ?? "uncategorized";
    const existing = budgetByCategory.get(categoryId);
    if (existing) {
      existing.total += amount;
    } else {
      // Category might have been deleted but envelope still references it
      budgetByCategory.set(categoryId, { name: "Unknown", icon: null, total: amount });
    }
  });

  // Convert to array and filter out empty categories
  let budgetAllocation: BudgetCategoryAllocation[] = Array.from(budgetByCategory.entries())
    .filter(([, value]) => value.total > 0)
    .map(([id, value]) => ({
      categoryId: id,
      categoryName: value.name,
      categoryIcon: value.icon,
      totalBudget: value.total,
    }))
    .sort((a, b) => b.totalBudget - a.totalBudget); // Sort by amount descending

  if (!user) {
    // Demo budget allocation data
    budgetAllocation = [
      { categoryId: "housing", categoryName: "Housing", categoryIcon: "🏠", totalBudget: 2200 },
      { categoryId: "transport", categoryName: "Transport", categoryIcon: "🚗", totalBudget: 450 },
      { categoryId: "groceries", categoryName: "Groceries", categoryIcon: "🛒", totalBudget: 600 },
      { categoryId: "utilities", categoryName: "Utilities", categoryIcon: "⚡", totalBudget: 350 },
      { categoryId: "savings", categoryName: "Savings", categoryIcon: "💰", totalBudget: 500 },
      { categoryId: "entertainment", categoryName: "Entertainment", categoryIcon: "🎬", totalBudget: 200 },
    ];
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
    accounts = [
      {
        id: crypto.randomUUID(),
        name: "ANZ Everyday",
        type: "transaction",
        current_balance: 1250.50,
        institution: "ANZ",
        reconciled: true,
      },
      {
        id: crypto.randomUUID(),
        name: "Savings Account",
        type: "savings",
        current_balance: 5000,
        institution: "ANZ",
        reconciled: true,
      },
      {
        id: crypto.randomUUID(),
        name: "Credit Card",
        type: "debt",
        current_balance: -1200,
        institution: "ASB",
        reconciled: false,
      },
    ];
  }

  return (
    <FinancialPositionClient
      assets={assets}
      liabilities={liabilities}
      snapshots={snapshots}
      monthlySnapshots={monthly}
      accounts={accounts}
      canEdit={Boolean(user)}
      budgetAllocation={budgetAllocation}
    />
  );
}
