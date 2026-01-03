"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AssetRow, LiabilityRow, NetWorthSnapshotRow } from "@/lib/types/net-worth";
import type { AccountRow } from "@/lib/types/accounts";
import { formatCurrency } from "@/lib/finance";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { Pencil, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { RemyHelpPanel } from "@/components/coaching/RemyHelpPanel";

type MonthlySnapshot = {
  month_date: string;
  source_snapshot_date: string;
  total_assets: number;
  total_liabilities: number;
  net_worth: number;
};

// Account type labels for display
const accountTypeLabels: Record<string, string> = {
  transaction: "Cheque / everyday",
  savings: "Savings",
  debt: "Debt",
  investment: "Investment",
  cash: "Cash",
  liability: "Liability",
};

// Type for budget allocation by category (from page.tsx)
export type BudgetCategoryAllocation = {
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  totalBudget: number;
};

interface Props {
  assets: AssetRow[];
  liabilities: LiabilityRow[];
  snapshots: NetWorthSnapshotRow[];
  monthlySnapshots: MonthlySnapshot[];
  accounts: AccountRow[];
  canEdit: boolean;
  budgetAllocation?: BudgetCategoryAllocation[];
}

// Category colors for budget allocation pie chart - matches category-groups.tsx
const BUDGET_CATEGORY_COLORS = [
  "#5A7E7A", // sage
  "#6B9ECE", // blue
  "#D4A853", // gold
  "#9CA3AF", // silver
  "#EC4899", // pink
  "#6366F1", // indigo
  "#10B981", // emerald
  "#F59E0B", // amber
];

export function FinancialPositionClient({ assets, liabilities, snapshots, monthlySnapshots, accounts, canEdit, budgetAllocation = [] }: Props) {
  const router = useRouter();
  const [assetDrawerOpen, setAssetDrawerOpen] = useState(false);
  const [liabilityDrawerOpen, setLiabilityDrawerOpen] = useState(false);
  const [accountDrawerOpen, setAccountDrawerOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AssetRow | null>(null);
  const [selectedLiability, setSelectedLiability] = useState<LiabilityRow | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<AccountRow | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);

  // Calculate totals from accounts (positive = asset, negative/debt type = liability)
  const accountTotals = useMemo(() => {
    return accounts.reduce(
      (acc, account) => {
        const balance = Number(account.current_balance ?? 0);
        if (account.type === "debt" || account.type === "liability" || balance < 0) {
          acc.liabilities += Math.abs(balance);
        } else {
          acc.assets += balance;
        }
        return acc;
      },
      { assets: 0, liabilities: 0 },
    );
  }, [accounts]);

  const assetTotals = useMemo(() => {
    const fromAssets = assets.reduce((sum, asset) => sum + Number(asset.current_value ?? 0), 0);
    return fromAssets + accountTotals.assets;
  }, [assets, accountTotals.assets]);

  const liabilityTotals = useMemo(() => {
    const fromLiabilities = liabilities.reduce((sum, liability) => sum + Number(liability.current_balance ?? 0), 0);
    return fromLiabilities + accountTotals.liabilities;
  }, [liabilities, accountTotals.liabilities]);

  const netWorth = assetTotals - liabilityTotals;

  const allocation = useMemo(() => {
    const buckets: Record<string, { total: number; label: string; colour: string }> = {
      cash: { total: 0, label: "Cash & Savings", colour: "#7A9E9A" }, // sage
      investment: { total: 0, label: "Investments", colour: "#6B9ECE" }, // blue
      property: { total: 0, label: "Property", colour: "#5A7E7A" }, // sage-dark
      vehicle: { total: 0, label: "Vehicles", colour: "#9CA3AF" }, // silver
      other: { total: 0, label: "Other", colour: "#CBD5E1" }, // slate-300
    };

    // Include assets from assets table
    assets.forEach((asset) => {
      const bucket = buckets[asset.asset_type] ?? buckets.other;
      bucket.total += Number(asset.current_value ?? 0);
    });

    // Include accounts (only positive balances, not debt/liability types)
    accounts.forEach((account) => {
      const balance = Number(account.current_balance ?? 0);
      if (balance > 0 && account.type !== "debt" && account.type !== "liability") {
        // Map account types to allocation buckets
        const bucketMap: Record<string, string> = {
          transaction: "cash",
          savings: "cash",
          cash: "cash",
          investment: "investment",
        };
        const bucketKey = bucketMap[account.type] ?? "other";
        buckets[bucketKey].total += balance;
      }
    });

    return Object.entries(buckets)
      .filter(([, value]) => value.total > 0)
      .map(([key, value]) => ({
        key,
        label: value.label,
        total: value.total,
        fraction: value.total / (assetTotals || 1),
        colour: value.colour,
      }));
  }, [assets, accounts, assetTotals]);

  const timeline = useMemo(() => {
    const base = monthlySnapshots.length
      ? monthlySnapshots
      : snapshots.length
        ? snapshots.map((snapshot) => ({
            month_date: snapshot.snapshot_date,
            source_snapshot_date: snapshot.snapshot_date,
            total_assets: Number(snapshot.total_assets ?? 0),
            total_liabilities: Number(snapshot.total_liabilities ?? 0),
            net_worth: Number(snapshot.net_worth ?? 0),
          }))
        : [
            {
              month_date: new Date().toISOString(),
              source_snapshot_date: new Date().toISOString(),
              total_assets: assetTotals,
              total_liabilities: liabilityTotals,
              net_worth: netWorth,
            },
          ];
    return base.map((snapshot) => ({
      id: snapshot.source_snapshot_date,
      date: new Date(snapshot.month_date),
      net: Number(snapshot.net_worth ?? 0),
    }));
  }, [monthlySnapshots, snapshots, assetTotals, liabilityTotals, netWorth]);

  // Transform budget allocation data for PieChart
  const budgetAllocationData = useMemo(() => {
    if (!budgetAllocation.length) return [];

    const total = budgetAllocation.reduce((sum, cat) => sum + cat.totalBudget, 0);
    if (total === 0) return [];

    return budgetAllocation.map((cat, index) => ({
      key: cat.categoryId,
      label: cat.categoryIcon ? `${cat.categoryIcon} ${cat.categoryName}` : cat.categoryName,
      total: cat.totalBudget,
      fraction: cat.totalBudget / total,
      colour: BUDGET_CATEGORY_COLORS[index % BUDGET_CATEGORY_COLORS.length],
    }));
  }, [budgetAllocation]);

  async function createSnapshot() {
    try {
      setSnapshotLoading(true);
      const response = await fetch("/api/net-worth/snapshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          totalAssets: assetTotals,
          totalLiabilities: liabilityTotals,
          netWorth,
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: "Unable to create snapshot" }));
        throw new Error(payload.error ?? "Unable to create snapshot");
      }
      toast.success("Snapshot saved");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Unable to create snapshot");
    } finally {
      setSnapshotLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 pb-16 pt-6 md:px-8 md:pb-8">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-[#3D3D3D]">Financial Position</h1>
          <p className="text-sm text-[#6B6B6B]">Track your financial momentum</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/budgetallocation">Planner</Link>
          </Button>
          <Button size="sm" onClick={createSnapshot} disabled={!canEdit || snapshotLoading} className="bg-[#7A9E9A] hover:bg-[#5A7E7A] text-white">
            {snapshotLoading ? "Saving…" : "Take snapshot"}
          </Button>
          <RemyHelpPanel pageId="financial-position" />
        </div>
      </header>

      <div className="md:hidden">
        <MobileNetWorthSummary
          items={[
            { id: "assets", label: "Assets", value: formatCurrency(assetTotals), tone: "positive" },
            {
              id: "liabilities",
              label: "Liabilities",
              value: formatCurrency(liabilityTotals),
              tone: "negative",
            },
            { id: "net-worth", label: "Net worth", value: formatCurrency(netWorth) },
          ]}
          allocation={allocation}
        />
      </div>

      <section className="hidden gap-4 md:grid md:grid-cols-3">
        <MetricCard title="Assets" value={formatCurrency(assetTotals)} tone="positive" />
        <MetricCard title="Liabilities" value={formatCurrency(liabilityTotals)} tone="negative" />
        <MetricCard title="Net worth" value={formatCurrency(netWorth)} tone="neutral" />
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.6fr,1fr]">
        <Card className="border border-[#E5E7EB] overflow-hidden">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-medium text-[#3D3D3D]">Net worth trend</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <Sparkline data={timeline} />
          </CardContent>
        </Card>
        <Card className="border border-[#E5E7EB]">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-medium text-[#3D3D3D]">Asset allocation</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 flex flex-col items-center gap-3">
            <PieChart data={allocation} />
            <AllocationLegend data={allocation} />
          </CardContent>
        </Card>
      </div>

      {/* Budget Allocation by Category */}
      <Card className="border border-[#E5E7EB]">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-medium text-[#3D3D3D]">Budget allocation by category</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {budgetAllocationData.length > 0 ? (
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex-shrink-0">
                <PieChart data={budgetAllocationData} />
              </div>
              <div className="flex-1 w-full">
                <AllocationLegend data={budgetAllocationData} />
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No budget data available. Set up envelopes with categories and amounts to see your budget allocation.</p>
          )}
        </CardContent>
      </Card>

      {/* Unified Accounts & Assets Section */}
      <UnifiedAccountsSection
        accounts={accounts}
        assets={assets}
        liabilities={liabilities}
        canEdit={canEdit}
        onAddAccount={() => {
          setSelectedAccount(null);
          setAccountDrawerOpen(true);
        }}
        onEditAccount={(account) => {
          setSelectedAccount(account);
          setAccountDrawerOpen(true);
        }}
        onDeleteAccount={async (account) => {
          if (!window.confirm(`Delete ${account.name}?`)) return;
          try {
            const response = await fetch(`/api/accounts/${account.id}`, { method: "DELETE" });
            if (!response.ok) throw new Error("Unable to delete account");
            toast.success("Account deleted");
            router.refresh();
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Unable to delete account");
          }
        }}
        onAddAsset={() => {
          setSelectedAsset(null);
          setAssetDrawerOpen(true);
        }}
        onEditAsset={(asset) => {
          setSelectedAsset(asset);
          setAssetDrawerOpen(true);
        }}
        onDeleteAsset={async (asset) => {
          if (!window.confirm(`Delete ${asset.name}?`)) return;
          try {
            const response = await fetch(`/api/net-worth/assets/${asset.id}`, { method: "DELETE" });
            if (!response.ok) throw new Error("Unable to delete asset");
            toast.success("Asset deleted");
            router.refresh();
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Unable to delete asset");
          }
        }}
        onAddLiability={() => {
          setSelectedLiability(null);
          setLiabilityDrawerOpen(true);
        }}
        onEditLiability={(liability) => {
          setSelectedLiability(liability);
          setLiabilityDrawerOpen(true);
        }}
        onDeleteLiability={async (liability) => {
          if (!window.confirm(`Delete ${liability.name}?`)) return;
          try {
            const response = await fetch(`/api/net-worth/liabilities/${liability.id}`, { method: "DELETE" });
            if (!response.ok) throw new Error("Unable to delete liability");
            toast.success("Liability deleted");
            router.refresh();
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Unable to delete liability");
          }
        }}
      />

      <HistoryList data={timeline} />
      <MobileNav />

      <AssetDrawer
        open={assetDrawerOpen}
        onOpenChange={setAssetDrawerOpen}
        asset={selectedAsset}
        onMutated={() => router.refresh()}
      />
      <LiabilityDrawer
        open={liabilityDrawerOpen}
        onOpenChange={setLiabilityDrawerOpen}
        liability={selectedLiability}
        onMutated={() => router.refresh()}
      />
      <AccountDrawer
        open={accountDrawerOpen}
        onOpenChange={setAccountDrawerOpen}
        account={selectedAccount}
        onMutated={() => router.refresh()}
      />
    </div>
  );
}

type NetWorthMetric = {
  id: string;
  label: string;
  value: string;
  tone?: "positive" | "negative";
};

function MobileNetWorthSummary({
  items,
  allocation,
}: {
  items: NetWorthMetric[];
  allocation: Array<{ key: string; label: string; fraction: number; colour: string; total: number }>;
}) {
  const topAllocation = allocation.slice(0, 3);
  return (
    <div className="space-y-4 rounded-2xl border border-border bg-muted/20 p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Net worth snapshot
      </h2>
      <ul className="divide-y divide-border text-sm">
        {items.map((item) => {
          // Style guide: sage for assets, blue for liabilities
          const tone =
            item.tone === "positive"
              ? "text-[#5A7E7A]"
              : item.tone === "negative"
              ? "text-[#6B9ECE]"
              : "text-[#3D3D3D]";
          return (
            <li key={item.id} className="flex items-center justify-between py-3">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {item.label}
              </span>
              <span className={cn("text-base font-semibold", tone)}>{item.value}</span>
            </li>
          );
        })}
      </ul>
      {topAllocation.length ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Top allocations
          </p>
          <div className="mt-2 space-y-2 text-sm text-secondary">
            {topAllocation.map((entry) => (
              <div key={entry.key} className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.colour }} />
                  {entry.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {(entry.fraction * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MetricCard({ title, value, tone }: { title: string; value: string; tone: "positive" | "negative" | "neutral" }) {
  // Style guide colors: sage for positive (assets), blue for negative (liabilities), neutral grey for net worth
  const colour =
    tone === "positive" ? "text-[#5A7E7A]" : tone === "negative" ? "text-[#6B9ECE]" : "text-[#3D3D3D]";
  const bgColour =
    tone === "positive" ? "bg-[#E2EEEC] border-[#B8D4D0]" : tone === "negative" ? "bg-[#DDEAF5] border-[#6B9ECE]" : "bg-[#F3F4F6] border-[#E5E7EB]";
  return (
    <Card className={cn("border rounded-xl", bgColour)}>
      <CardHeader className="pb-0.5 pt-3 px-4">
        <CardTitle className="text-xs font-medium text-[#6B6B6B]">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        <p className={`text-xl font-semibold ${colour}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function Sparkline({ data }: { data: Array<{ id: string; date: Date; net: number }> }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
        No net worth history yet. Take a snapshot to start tracking.
      </div>
    );
  }

  const width = 400;
  const height = 150;
  const paddingLeft = 55; // Space for Y-axis labels
  const paddingRight = 8;
  const paddingTop = 15;
  const paddingBottom = 28; // Space for X-axis labels
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const min = Math.min(...data.map((item) => item.net));
  const max = Math.max(...data.map((item) => item.net));
  const range = max - min || 1;

  // Calculate nice Y-axis ticks
  const yTicks = [min, min + range / 2, max];

  // Calculate points for the line
  const pointsData = data.map((item, index) => {
    const x = paddingLeft + (index / Math.max(data.length - 1, 1)) * chartWidth;
    const y = paddingTop + chartHeight - ((item.net - min) / range) * chartHeight;
    return { x, y, date: item.date, net: item.net };
  });

  const polylinePoints = pointsData.map(p => `${p.x},${p.y}`).join(" ");

  // First and last values for summary
  const firstValue = data[0]?.net ?? 0;
  const lastValue = data[data.length - 1]?.net ?? 0;
  const change = lastValue - firstValue;
  const changePercent = firstValue !== 0 ? (change / Math.abs(firstValue)) * 100 : 0;
  const isPositiveChange = change >= 0;

  // Format date for X-axis
  const formatAxisDate = (date: Date) => {
    return date.toLocaleDateString("en-NZ", { month: "short", year: "2-digit" });
  };

  // Format date for tooltip
  const formatTooltipDate = (date: Date) => {
    return date.toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" });
  };

  // Determine which X-axis labels to show (avoid overcrowding)
  const xLabelsToShow = data.length <= 6
    ? data.map((_, i) => i)
    : [0, Math.floor(data.length / 2), data.length - 1];

  return (
    <div>
      {/* Change summary */}
      <div className="flex items-center justify-between text-xs px-4 pb-2">
        <span className="text-muted-foreground">
          {data.length > 1
            ? `${formatAxisDate(data[0].date)} → ${formatAxisDate(data[data.length - 1].date)}`
            : formatAxisDate(data[0].date)
          }
        </span>
        {data.length > 1 && (
          <span className={cn(
            "font-medium",
            isPositiveChange ? "text-[#5A7E7A]" : "text-[#6B9ECE]"
          )}>
            {isPositiveChange ? "↑" : "↓"} {formatCurrency(Math.abs(change))} ({Math.abs(changePercent).toFixed(1)}%)
          </span>
        )}
      </div>

      {/* Chart */}
      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-44 w-full">
          {/* Grid lines */}
          {yTicks.map((tick, i) => {
            const y = paddingTop + chartHeight - ((tick - min) / range) * chartHeight;
            return (
              <g key={i}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="#E5E7EB"
                  strokeWidth="1"
                  strokeDasharray={i === 1 ? "4,4" : "0"}
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-[#6B6B6B] text-[10px]"
                >
                  {formatCurrency(tick)}
                </text>
              </g>
            );
          })}

          {/* X-axis labels */}
          {xLabelsToShow.map((index) => {
            const point = pointsData[index];
            if (!point) return null;
            return (
              <text
                key={index}
                x={point.x}
                y={height - 8}
                textAnchor="middle"
                className="fill-[#6B6B6B] text-[10px]"
              >
                {formatAxisDate(data[index].date)}
              </text>
            );
          })}

          {/* Area fill under line */}
          <path
            d={`M ${pointsData[0]?.x ?? paddingLeft},${paddingTop + chartHeight} ${polylinePoints} L ${pointsData[pointsData.length - 1]?.x ?? width - paddingRight},${paddingTop + chartHeight} Z`}
            fill="url(#areaGradient)"
            opacity="0.3"
          />

          {/* Gradient definition */}
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7A9E9A" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#7A9E9A" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Line */}
          <polyline
            fill="none"
            stroke="#5A7E7A"
            strokeWidth="2.5"
            points={polylinePoints}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points (interactive) */}
          {pointsData.map((point, index) => (
            <g key={index}>
              {/* Invisible larger hitbox for easier hovering */}
              <circle
                cx={point.x}
                cy={point.y}
                r="12"
                fill="transparent"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                style={{ cursor: "pointer" }}
              />
              {/* Visible point */}
              <circle
                cx={point.x}
                cy={point.y}
                r={hoveredIndex === index ? 6 : 4}
                fill={hoveredIndex === index ? "#5A7E7A" : "#fff"}
                stroke="#5A7E7A"
                strokeWidth="2"
                className="transition-all duration-150"
              />
            </g>
          ))}

          {/* Tooltip */}
          {hoveredIndex !== null && pointsData[hoveredIndex] && (
            <g>
              {/* Tooltip background */}
              <rect
                x={Math.min(Math.max(pointsData[hoveredIndex].x - 55, paddingLeft), width - paddingRight - 110)}
                y={Math.max(pointsData[hoveredIndex].y - 50, 5)}
                width="110"
                height="40"
                rx="4"
                fill="#3D3D3D"
                opacity="0.95"
              />
              {/* Tooltip date */}
              <text
                x={Math.min(Math.max(pointsData[hoveredIndex].x, paddingLeft + 55), width - paddingRight - 55)}
                y={Math.max(pointsData[hoveredIndex].y - 32, 20)}
                textAnchor="middle"
                className="fill-white text-[10px]"
              >
                {formatTooltipDate(data[hoveredIndex].date)}
              </text>
              {/* Tooltip value */}
              <text
                x={Math.min(Math.max(pointsData[hoveredIndex].x, paddingLeft + 55), width - paddingRight - 55)}
                y={Math.max(pointsData[hoveredIndex].y - 18, 35)}
                textAnchor="middle"
                className="fill-white text-[11px] font-semibold"
              >
                {formatCurrency(data[hoveredIndex].net)}
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* Start and end values */}
      {data.length > 1 && (
        <div className="flex justify-between text-xs text-muted-foreground px-4 py-3 bg-[#F9FAFB] border-t border-[#E5E7EB]">
          <div>
            <span className="font-medium text-[#3D3D3D]">{formatCurrency(firstValue)}</span>
            <span className="ml-1">start</span>
          </div>
          <div className="text-right">
            <span className="font-medium text-[#3D3D3D]">{formatCurrency(lastValue)}</span>
            <span className="ml-1">current</span>
          </div>
        </div>
      )}
    </div>
  );
}

function PieChart({
  data,
}: {
  data: Array<{ key: string; label: string; total: number; fraction: number; colour: string }>;
}) {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <svg viewBox="0 0 120 120" className="h-40 w-40">
      <circle cx="60" cy="60" r={radius} fill="#f8fafc" />
      {data.map((slice) => {
        const length = slice.fraction * circumference;
        const dasharray = `${length} ${circumference - length}`;
        const circle = (
          <circle
            key={slice.key}
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={slice.colour}
            strokeWidth="18"
            strokeDasharray={dasharray}
            strokeDashoffset={-offset}
          />
        );
        offset += length;
        return circle;
      })}
    </svg>
  );
}

function AllocationLegend({
  data,
}: {
  data: Array<{ key: string; label: string; total: number; fraction: number; colour: string }>;
}) {
  if (!data.length) {
    return <p className="text-xs text-muted-foreground">Add assets to see allocation.</p>;
  }
  return (
    <div className="w-full space-y-2 text-xs">
      {data.map((entry) => (
        <div key={entry.key} className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.colour }} />
            <span>{entry.label}</span>
          </div>
          <div className="text-muted-foreground">
            {formatCurrency(entry.total)} · {(entry.fraction * 100).toFixed(1)}%
          </div>
        </div>
      ))}
    </div>
  );
}

// Grid column template for consistent table layout - used in header, category rows, and data rows
const GRID_COLS = "grid-cols-[1fr_140px_130px_110px_50px]";

// Table header component - prominent styling with dark text
function AccountTableHeader() {
  return (
    <div
      className={cn(
        "grid items-center gap-4 border-y border-[#D1D5DB] bg-[#E5E7EB] px-4 py-3",
        GRID_COLS
      )}
    >
      <div className="text-xs font-semibold text-[#3D3D3D] uppercase tracking-wider">Account</div>
      <div className="text-xs font-semibold text-[#3D3D3D] uppercase tracking-wider">Type</div>
      <div className="text-xs font-semibold text-[#3D3D3D] uppercase tracking-wider">Institution</div>
      <div className="text-xs font-semibold text-[#3D3D3D] uppercase tracking-wider text-right">Balance</div>
      <div></div>
    </div>
  );
}

// Collapsible category section component - uses grid for alignment
function CategorySection({
  icon,
  label,
  total,
  itemCount,
  isLiability = false,
  defaultExpanded = true,
  children,
}: {
  icon: string;
  label: string;
  total: number;
  itemCount: number;
  isLiability?: boolean;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const textColor = total === 0
    ? "text-[#9CA3AF]"
    : isLiability
    ? "text-[#6B9ECE]"
    : "text-[#5A7E7A]";

  return (
    <div>
      {/* Collapsible Header - uses same grid for alignment */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "w-full grid items-center gap-4 px-4 py-2.5 bg-[#F9FAFB] border-b border-[#E5E7EB] hover:bg-[#F3F4F6] transition-colors cursor-pointer text-left",
          GRID_COLS
        )}
      >
        {/* Account column - chevron, icon, label */}
        <div className="flex items-center gap-2">
          <ChevronDown
            className={cn(
              "w-4 h-4 text-[#6B6B6B] transition-transform flex-shrink-0",
              !isExpanded && "-rotate-90"
            )}
          />
          <span className="text-base flex-shrink-0">{icon}</span>
          <span className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wide">
            {label}
          </span>
          {!isExpanded && itemCount > 0 && (
            <span className="text-xs text-[#9CA3AF]">({itemCount})</span>
          )}
        </div>

        {/* Type column - empty */}
        <div></div>

        {/* Institution column - empty */}
        <div></div>

        {/* Balance column - total aligned */}
        <div className={cn("text-sm font-semibold text-right", textColor)}>
          {formatCurrency(total)}
        </div>

        {/* Actions column - empty */}
        <div></div>
      </button>

      {/* Collapsible Content */}
      {isExpanded && (
        <div className="animate-in slide-in-from-top-1 duration-200">
          {children}
        </div>
      )}
    </div>
  );
}

// Account row component using CSS Grid - indented account names
function AccountRow({
  name,
  type,
  institution,
  balance,
  isLiability = false,
  canEdit,
  onEdit,
  onDelete,
}: {
  name: string;
  type: string;
  institution: string | null;
  balance: number;
  isLiability?: boolean;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const balanceColor = balance === 0
    ? "text-[#9CA3AF]"
    : isLiability
    ? "text-[#6B9ECE]"
    : "text-[#5A7E7A]";
  const hoverBg = isLiability ? "hover:bg-[#F5F9FC]" : "hover:bg-[#F5F9F8]";

  return (
    <div
      className={cn(
        "group grid items-center gap-4 px-4 transition-colors border-b border-[#E5E7EB]",
        GRID_COLS,
        hoverBg
      )}
      style={{ height: "44px" }}
    >
      {/* Account - indented to align under category label */}
      <div className="pl-8 text-sm font-medium text-[#3D3D3D] truncate">{name}</div>
      <div className="text-sm text-[#6B6B6B] truncate">{type}</div>
      <div className="text-sm text-[#6B6B6B] truncate">{institution || "—"}</div>
      <div className={cn("text-sm font-medium text-right", balanceColor)}>
        {formatCurrency(balance)}
      </div>
      <div className="flex items-center justify-end gap-1">
        {canEdit && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="p-1 rounded hover:bg-[#E5E7EB] text-[#6B6B6B]"
              title="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-1 rounded hover:bg-[#DDEAF5] text-[#6B9ECE]"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Unified Accounts & Assets Section - consolidates bank accounts, other assets, and loans
function UnifiedAccountsSection({
  accounts,
  assets,
  liabilities,
  canEdit,
  onAddAccount,
  onEditAccount,
  onDeleteAccount,
  onAddAsset,
  onEditAsset,
  onDeleteAsset,
  onAddLiability,
  onEditLiability,
  onDeleteLiability,
}: {
  accounts: AccountRow[];
  assets: AssetRow[];
  liabilities: LiabilityRow[];
  canEdit: boolean;
  onAddAccount: () => void;
  onEditAccount: (account: AccountRow) => void;
  onDeleteAccount: (account: AccountRow) => void;
  onAddAsset: () => void;
  onEditAsset: (asset: AssetRow) => void;
  onDeleteAsset: (asset: AssetRow) => void;
  onAddLiability: () => void;
  onEditLiability: (liability: LiabilityRow) => void;
  onDeleteLiability: (liability: LiabilityRow) => void;
}) {
  // Group accounts by type
  const assetAccounts = accounts.filter(
    (a) => a.type !== "debt" && a.type !== "liability" && Number(a.current_balance ?? 0) >= 0
  );
  const debtAccounts = accounts.filter(
    (a) => a.type === "debt" || a.type === "liability" || Number(a.current_balance ?? 0) < 0
  );

  const assetAccountTotal = assetAccounts.reduce((sum, a) => sum + Number(a.current_balance ?? 0), 0);
  const debtAccountTotal = debtAccounts.reduce((sum, a) => sum + Math.abs(Number(a.current_balance ?? 0)), 0);
  const otherAssetsTotal = assets.reduce((sum, a) => sum + Number(a.current_value ?? 0), 0);
  const loansTotal = liabilities.reduce((sum, l) => sum + Number(l.current_balance ?? 0), 0);

  // Liability type labels
  const liabilityTypeLabels: Record<string, string> = {
    mortgage: "Mortgage",
    loan: "Personal Loan",
    car_loan: "Car Loan",
    student_loan: "Student Loan",
    credit: "Credit Card",
    liability: "Liability",
  };

  // Asset type labels
  const assetTypeLabels: Record<string, string> = {
    property: "Property",
    vehicle: "Vehicle",
    investment: "Investment",
    cash: "Cash",
    other: "Other",
  };

  return (
    <Card className="border border-[#E5E7EB] rounded-xl overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between border-b border-[#E5E7EB] py-3 px-4 bg-white">
        <div>
          <CardTitle className="text-sm font-semibold text-[#3D3D3D]">Accounts & Assets</CardTitle>
          <p className="text-xs text-[#6B6B6B]">All your financial accounts in one place</p>
        </div>
        <Button
          size="sm"
          onClick={onAddAccount}
          disabled={!canEdit}
          className="bg-[#7A9E9A] hover:bg-[#5A7E7A] text-white h-8 text-xs"
        >
          Add account
        </Button>
      </CardHeader>

      {/* Table Header */}
      <AccountTableHeader />

      {/* Cash & Bank Accounts - Collapsible */}
      <CategorySection
        icon="💰"
        label="Cash & Savings"
        total={assetAccountTotal}
        itemCount={assetAccounts.length}
        defaultExpanded={true}
      >
        {assetAccounts.length > 0 ? (
          <div>
            {assetAccounts.map((account) => (
              <AccountRow
                key={account.id}
                name={account.name}
                type={accountTypeLabels[account.type] ?? account.type}
                institution={account.institution}
                balance={Number(account.current_balance ?? 0)}
                canEdit={canEdit}
                onEdit={() => onEditAccount(account)}
                onDelete={() => onDeleteAccount(account)}
              />
            ))}
          </div>
        ) : (
          <div className="px-4 py-3 text-xs text-[#9CA3AF] text-center border-b border-[#E5E7EB] pl-8">
            No bank accounts yet
          </div>
        )}
      </CategorySection>

      {/* Debt & Credit - Collapsible */}
      <CategorySection
        icon="💳"
        label="Debt & Credit"
        total={debtAccountTotal}
        itemCount={debtAccounts.length}
        isLiability
        defaultExpanded={true}
      >
        {debtAccounts.length > 0 ? (
          <div>
            {debtAccounts.map((account) => (
              <AccountRow
                key={account.id}
                name={account.name}
                type={accountTypeLabels[account.type] ?? account.type}
                institution={account.institution}
                balance={Math.abs(Number(account.current_balance ?? 0))}
                isLiability
                canEdit={canEdit}
                onEdit={() => onEditAccount(account)}
                onDelete={() => onDeleteAccount(account)}
              />
            ))}
          </div>
        ) : (
          <div className="px-4 py-3 text-xs text-[#9CA3AF] text-center border-b border-[#E5E7EB] pl-8">
            No credit cards or debt accounts
          </div>
        )}
      </CategorySection>

      {/* Loans (from liabilities table) - Collapsible */}
      <CategorySection
        icon="🏦"
        label="Loans"
        total={loansTotal}
        itemCount={liabilities.length}
        isLiability
        defaultExpanded={true}
      >
        {liabilities.length > 0 ? (
          <div>
            {liabilities.map((liability) => (
              <AccountRow
                key={liability.id}
                name={liability.name}
                type={liabilityTypeLabels[liability.liability_type] ?? liability.liability_type}
                institution={liability.interest_rate ? `${liability.interest_rate}% p.a.` : null}
                balance={Number(liability.current_balance ?? 0)}
                isLiability
                canEdit={canEdit}
                onEdit={() => onEditLiability(liability)}
                onDelete={() => onDeleteLiability(liability)}
              />
            ))}
          </div>
        ) : (
          <button
            onClick={onAddLiability}
            disabled={!canEdit}
            className="w-full px-4 py-3 text-xs text-[#5A7E7A] hover:bg-[#F5F9F8] transition-colors disabled:opacity-50 border-b border-[#E5E7EB] pl-8 text-left"
          >
            + Add a loan
          </button>
        )}
      </CategorySection>

      {/* Other Assets (property, vehicles, investments) - Collapsible */}
      <CategorySection
        icon="🏠"
        label="Other Assets"
        total={otherAssetsTotal}
        itemCount={assets.length}
        defaultExpanded={true}
      >
        {assets.length > 0 ? (
          <div>
            {assets.map((asset) => (
              <AccountRow
                key={asset.id}
                name={asset.name}
                type={assetTypeLabels[asset.asset_type] ?? asset.asset_type}
                institution={null}
                balance={Number(asset.current_value ?? 0)}
                canEdit={canEdit}
                onEdit={() => onEditAsset(asset)}
                onDelete={() => onDeleteAsset(asset)}
              />
            ))}
          </div>
        ) : (
          <button
            onClick={onAddAsset}
            disabled={!canEdit}
            className="w-full px-4 py-3 text-xs text-[#5A7E7A] hover:bg-[#F5F9F8] transition-colors disabled:opacity-50 pl-8 text-left"
          >
            + Add property, vehicle, or investment
          </button>
        )}
      </CategorySection>
    </Card>
  );
}

function HistoryList({ data }: { data: Array<{ id: string; date: Date; net: number }> }) {
  if (!data.length) {
    return null;
  }
  return (
    <Card className="border border-[#E5E7EB]">
      <CardHeader className="py-3 px-4 border-b border-[#E5E7EB]">
        <CardTitle className="text-sm font-semibold text-[#3D3D3D]">Snapshot history</CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-1">
        {data.map((item) => (
          <div key={item.id} className="flex items-center justify-between py-1.5 border-b border-[#E5E7EB] last:border-0">
            <span className="text-xs text-[#6B6B6B]">{item.date.toLocaleDateString("en-NZ", { dateStyle: "medium" })}</span>
            <span className={`text-sm font-medium ${item.net >= 0 ? "text-[#5A7E7A]" : "text-[#6B9ECE]"}`}>
              {formatCurrency(item.net)}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function AssetDrawer({
  open,
  onOpenChange,
  asset,
  onMutated,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  asset: AssetRow | null;
  onMutated: () => void;
}) {
  const [localAsset, setLocalAsset] = useState<AssetRow | null>(asset);
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(asset);

  useEffect(() => {
    if (open) {
      setLocalAsset(asset);
    }
  }, [asset, open]);

  const baseAsset: AssetRow = {
    id: asset?.id ?? "",
    name: "",
    asset_type: "other",
    current_value: 0,
    notes: "",
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setSaving(true);
      const payload = {
        name: localAsset?.name ?? "",
        assetType: localAsset?.asset_type ?? "other",
        currentValue: Number(localAsset?.current_value ?? 0),
        notes: localAsset?.notes ?? "",
      };

      const response = await fetch(
        isEdit ? `/api/net-worth/assets/${asset?.id}` : "/api/net-worth/assets",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const result = await response.json().catch(() => ({ error: "Unable to save asset" }));
        throw new Error(result.error ?? "Unable to save asset");
      }

      toast.success(isEdit ? "Asset updated" : "Asset added");
      onMutated();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Unable to save asset");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!asset) return;
    const confirmed = window.confirm(`Delete ${asset.name}?`);
    if (!confirmed) return;
    try {
      setSaving(true);
      const response = await fetch(`/api/net-worth/assets/${asset.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({ error: "Unable to delete asset" }));
        throw new Error(result.error ?? "Unable to delete asset");
      }
      toast.success("Asset deleted");
      onMutated();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Unable to delete asset");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(value) => {
        onOpenChange(value);
        if (!value) {
          setLocalAsset(asset);
          setSaving(false);
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-background rounded-xl p-6 shadow-xl">
          <Dialog.Title className="text-lg font-semibold text-[#3D3D3D]">
            {isEdit ? "Edit asset" : "Add asset"}
          </Dialog.Title>
          <form className="flex flex-col gap-5 mt-4" onSubmit={handleSubmit}>
            {/* Name field */}
            <div>
              <label className="block text-sm font-medium text-[#3D3D3D] mb-1">
                Asset name <span className="text-[#6B9ECE]">*</span>
              </label>
              <Input
                placeholder="e.g., House, Car, KiwiSaver"
                value={localAsset?.name ?? ""}
                onChange={(event) =>
                  setLocalAsset((prev) => ({
                    ...(prev ?? baseAsset),
                    name: event.target.value,
                  }))
                }
                required
                className="border-[#E5E7EB] focus:border-[#7A9E9A] focus:ring-1 focus:ring-[#7A9E9A]"
              />
            </div>

            {/* Type field */}
            <div>
              <label className="block text-sm font-medium text-[#3D3D3D] mb-1">
                Asset type
              </label>
              <select
                className="w-full h-10 rounded-md border border-[#E5E7EB] px-3 text-sm focus:border-[#7A9E9A] focus:outline-none"
                value={localAsset?.asset_type ?? "other"}
                onChange={(event) =>
                  setLocalAsset((prev) => ({
                    ...(prev ?? baseAsset),
                    asset_type: event.target.value,
                  }))
                }
              >
                <option value="property">Property</option>
                <option value="vehicle">Vehicle</option>
                <option value="investment">Investment / KiwiSaver</option>
                <option value="cash">Cash & Savings</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Value field with $ prefix */}
            <div>
              <label className="block text-sm font-medium text-[#3D3D3D] mb-1">
                Current value
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]">$</span>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={localAsset?.current_value ?? ""}
                  onChange={(event) =>
                    setLocalAsset((prev) => ({
                      ...(prev ?? baseAsset),
                      current_value: event.target.value ? Number(event.target.value) : 0,
                    }))
                  }
                  className="pl-7 border-[#E5E7EB] focus:border-[#7A9E9A] focus:ring-1 focus:ring-[#7A9E9A]"
                />
              </div>
            </div>

            {/* Notes - collapsible */}
            <details className="text-sm">
              <summary className="text-[#5A7E7A] cursor-pointer hover:underline">
                + Add notes
              </summary>
              <textarea
                className="w-full mt-2 px-3 py-2 border border-[#E5E7EB] rounded-lg resize-none text-sm"
                placeholder="Optional notes..."
                rows={2}
                value={localAsset?.notes ?? ""}
                onChange={(event) =>
                  setLocalAsset((prev) => ({
                    ...(prev ?? baseAsset),
                    notes: event.target.value,
                  }))
                }
              />
            </details>

            <div className="flex flex-wrap justify-between gap-2 pt-2">
              <div>
                {isEdit ? (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={saving}
                  >
                    Delete
                  </Button>
                ) : null}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-[#7A9E9A] hover:bg-[#5A7E7A] text-white"
                >
                  {saving ? "Saving…" : isEdit ? "Save changes" : "Add asset"}
                </Button>
              </div>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function LiabilityDrawer({
  open,
  onOpenChange,
  liability,
  onMutated,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  liability: LiabilityRow | null;
  onMutated: () => void;
}) {
  const [localLiability, setLocalLiability] = useState<LiabilityRow | null>(liability);
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(liability);

  useEffect(() => {
    if (open) {
      setLocalLiability(liability);
    }
  }, [liability, open]);

  const baseLiability: LiabilityRow = {
    id: liability?.id ?? "",
    name: "",
    liability_type: "liability",
    current_balance: 0,
    interest_rate: 0,
    notes: "",
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setSaving(true);
      const payload = {
        name: localLiability?.name ?? "",
        liabilityType: localLiability?.liability_type ?? "liability",
        currentBalance: Number(localLiability?.current_balance ?? 0),
        interestRate:
          localLiability?.interest_rate === null
            ? null
            : Number(localLiability?.interest_rate ?? 0),
        notes: localLiability?.notes ?? "",
      };

      const response = await fetch(
        isEdit ? `/api/net-worth/liabilities/${liability?.id}` : "/api/net-worth/liabilities",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const result = await response.json().catch(() => ({ error: "Unable to save liability" }));
        throw new Error(result.error ?? "Unable to save liability");
      }

      toast.success(isEdit ? "Liability updated" : "Liability added");
      onMutated();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Unable to save liability");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!liability) return;
    const confirmed = window.confirm(`Delete ${liability.name}?`);
    if (!confirmed) return;
    try {
      setSaving(true);
      const response = await fetch(`/api/net-worth/liabilities/${liability.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({ error: "Unable to delete liability" }));
        throw new Error(result.error ?? "Unable to delete liability");
      }
      toast.success("Liability deleted");
      onMutated();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Unable to delete liability");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(value) => {
        onOpenChange(value);
        if (!value) {
          setLocalLiability(liability);
          setSaving(false);
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-background rounded-xl p-6 shadow-xl">
          <Dialog.Title className="text-lg font-semibold text-[#3D3D3D]">
            {isEdit ? "Edit loan" : "Add loan"}
          </Dialog.Title>
          <form className="flex flex-col gap-5 mt-4" onSubmit={handleSubmit}>
            {/* Name field */}
            <div>
              <label className="block text-sm font-medium text-[#3D3D3D] mb-1">
                Loan name <span className="text-[#6B9ECE]">*</span>
              </label>
              <Input
                placeholder="e.g., Mortgage, Car Loan"
                value={localLiability?.name ?? ""}
                onChange={(event) =>
                  setLocalLiability((prev) => ({
                    ...(prev ?? baseLiability),
                    name: event.target.value,
                  }))
                }
                required
                className="border-[#E5E7EB] focus:border-[#7A9E9A] focus:ring-1 focus:ring-[#7A9E9A]"
              />
            </div>

            {/* Type field */}
            <div>
              <label className="block text-sm font-medium text-[#3D3D3D] mb-1">
                Loan type
              </label>
              <select
                className="w-full h-10 rounded-md border border-[#E5E7EB] px-3 text-sm focus:border-[#7A9E9A] focus:outline-none"
                value={localLiability?.liability_type ?? "liability"}
                onChange={(event) =>
                  setLocalLiability((prev) => ({
                    ...(prev ?? baseLiability),
                    liability_type: event.target.value,
                  }))
                }
              >
                <option value="mortgage">Mortgage</option>
                <option value="loan">Personal Loan</option>
                <option value="car_loan">Car Loan</option>
                <option value="student_loan">Student Loan</option>
                <option value="credit">Credit Card</option>
                <option value="liability">Other</option>
              </select>
            </div>

            {/* Balance field with $ prefix */}
            <div>
              <label className="block text-sm font-medium text-[#3D3D3D] mb-1">
                Current balance
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]">$</span>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={localLiability?.current_balance ?? ""}
                  onChange={(event) =>
                    setLocalLiability((prev) => ({
                      ...(prev ?? baseLiability),
                      current_balance: event.target.value ? Number(event.target.value) : 0,
                    }))
                  }
                  className="pl-7 border-[#E5E7EB] focus:border-[#7A9E9A] focus:ring-1 focus:ring-[#7A9E9A]"
                />
              </div>
            </div>

            {/* Interest rate field */}
            <div>
              <label className="block text-sm font-medium text-[#3D3D3D] mb-1">
                Interest rate (p.a.)
              </label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={localLiability?.interest_rate ?? ""}
                  onChange={(event) =>
                    setLocalLiability((prev) => ({
                      ...(prev ?? baseLiability),
                      interest_rate: event.target.value ? Number(event.target.value) : 0,
                    }))
                  }
                  className="pr-8 border-[#E5E7EB] focus:border-[#7A9E9A] focus:ring-1 focus:ring-[#7A9E9A]"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]">%</span>
              </div>
            </div>

            {/* Notes - collapsible */}
            <details className="text-sm">
              <summary className="text-[#5A7E7A] cursor-pointer hover:underline">
                + Add notes
              </summary>
              <textarea
                className="w-full mt-2 px-3 py-2 border border-[#E5E7EB] rounded-lg resize-none text-sm"
                placeholder="Optional notes..."
                rows={2}
                value={localLiability?.notes ?? ""}
                onChange={(event) =>
                  setLocalLiability((prev) => ({
                    ...(prev ?? baseLiability),
                    notes: event.target.value,
                  }))
                }
              />
            </details>

            <div className="flex flex-wrap justify-between gap-2 pt-2">
              <div>
                {isEdit ? (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={saving}
                  >
                    Delete
                  </Button>
                ) : null}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-[#7A9E9A] hover:bg-[#5A7E7A] text-white"
                >
                  {saving ? "Saving…" : isEdit ? "Save changes" : "Add loan"}
                </Button>
              </div>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function MobileNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 border-t bg-background/95 shadow-lg backdrop-blur md:hidden">
      <div className="flex items-center justify-around px-4 py-3 text-xs">
        <Link href="/dashboard" className="text-muted-foreground transition hover:text-primary">
          Dashboard
        </Link>
        <Link href="/envelope-summary" className="text-muted-foreground transition hover:text-primary">
          Summary
        </Link>
        <Link href="/net-worth" className="text-primary font-semibold">
          Net worth
        </Link>
        <Link href="/envelope-planning" className="text-muted-foreground transition hover:text-primary">
          Planner
        </Link>
      </div>
    </nav>
  );
}

function AccountDrawer({
  open,
  onOpenChange,
  account,
  onMutated,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  account: AccountRow | null;
  onMutated: () => void;
}) {
  const [localAccount, setLocalAccount] = useState<AccountRow | null>(account);
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(account);

  useEffect(() => {
    if (open) {
      setLocalAccount(account);
    }
  }, [account, open]);

  const baseAccount: AccountRow = {
    id: account?.id ?? "",
    name: "",
    type: "transaction",
    current_balance: 0,
    institution: null,
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setSaving(true);
      const payload = {
        name: localAccount?.name ?? "",
        type: localAccount?.type ?? "transaction",
        balance: Number(localAccount?.current_balance ?? 0),
        institution: localAccount?.institution ?? null,
      };

      const response = await fetch(
        isEdit ? `/api/accounts/${account?.id}` : "/api/accounts",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const result = await response.json().catch(() => ({ error: "Unable to save account" }));
        throw new Error(result.error ?? "Unable to save account");
      }

      toast.success(isEdit ? "Account updated" : "Account added");
      onMutated();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Unable to save account");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!account) return;
    const confirmed = window.confirm(`Delete ${account.name}?`);
    if (!confirmed) return;
    try {
      setSaving(true);
      const response = await fetch(`/api/accounts/${account.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({ error: "Unable to delete account" }));
        throw new Error(result.error ?? "Unable to delete account");
      }
      toast.success("Account deleted");
      onMutated();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Unable to delete account");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(value) => {
        onOpenChange(value);
        if (!value) {
          setLocalAccount(account);
          setSaving(false);
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-background rounded-xl p-6 shadow-xl">
          <Dialog.Title className="text-lg font-semibold text-[#3D3D3D]">
            {isEdit ? "Edit account" : "Add account"}
          </Dialog.Title>
          <form className="flex flex-col gap-5 mt-4" onSubmit={handleSubmit}>
            {/* Name field */}
            <div>
              <label className="block text-sm font-medium text-[#3D3D3D] mb-1">
                Account name <span className="text-[#6B9ECE]">*</span>
              </label>
              <Input
                placeholder="e.g., ANZ Everyday"
                value={localAccount?.name ?? ""}
                onChange={(event) =>
                  setLocalAccount((prev) => ({
                    ...(prev ?? baseAccount),
                    name: event.target.value,
                  }))
                }
                required
                className="border-[#E5E7EB] focus:border-[#7A9E9A] focus:ring-1 focus:ring-[#7A9E9A]"
              />
            </div>

            {/* Type field */}
            <div>
              <label className="block text-sm font-medium text-[#3D3D3D] mb-1">
                Account type
              </label>
              <select
                className="w-full h-10 rounded-md border border-[#E5E7EB] px-3 text-sm focus:border-[#7A9E9A] focus:outline-none"
                value={localAccount?.type ?? "transaction"}
                onChange={(event) =>
                  setLocalAccount((prev) => ({
                    ...(prev ?? baseAccount),
                    type: event.target.value,
                  }))
                }
              >
                <option value="transaction">Cheque / everyday</option>
                <option value="savings">Savings</option>
                <option value="investment">Investment</option>
                <option value="cash">Cash</option>
                <option value="debt">Credit card / Debt</option>
                <option value="liability">Other liability</option>
              </select>
            </div>

            {/* Institution field */}
            <div>
              <label className="block text-sm font-medium text-[#3D3D3D] mb-1">
                Institution
              </label>
              <Input
                placeholder="e.g., ANZ, Westpac, ASB"
                value={localAccount?.institution ?? ""}
                onChange={(event) =>
                  setLocalAccount((prev) => ({
                    ...(prev ?? baseAccount),
                    institution: event.target.value || null,
                  }))
                }
                className="border-[#E5E7EB] focus:border-[#7A9E9A] focus:ring-1 focus:ring-[#7A9E9A]"
              />
            </div>

            {/* Balance field with $ prefix */}
            <div>
              <label className="block text-sm font-medium text-[#3D3D3D] mb-1">
                Current balance
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]">$</span>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={localAccount?.current_balance ?? ""}
                  onChange={(event) =>
                    setLocalAccount((prev) => ({
                      ...(prev ?? baseAccount),
                      current_balance: event.target.value ? Number(event.target.value) : 0,
                    }))
                  }
                  className="pl-7 border-[#E5E7EB] focus:border-[#7A9E9A] focus:ring-1 focus:ring-[#7A9E9A]"
                />
              </div>
              {(localAccount?.type === "debt" || localAccount?.type === "liability") && (
                <p className="text-xs text-[#9CA3AF] mt-1">
                  Enter as a positive number – we'll track it as debt
                </p>
              )}
            </div>
            <div className="flex flex-wrap justify-between gap-2 pt-2">
              <div>
                {isEdit ? (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={saving}
                  >
                    Delete
                  </Button>
                ) : null}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-[#7A9E9A] hover:bg-[#5A7E7A] text-white"
                >
                  {saving ? "Saving…" : isEdit ? "Save changes" : "Add account"}
                </Button>
              </div>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
