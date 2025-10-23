"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AssetRow, LiabilityRow, NetWorthSnapshotRow } from "@/lib/types/net-worth";
import { formatCurrency } from "@/lib/finance";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/cn";

type MonthlySnapshot = {
  month_date: string;
  source_snapshot_date: string;
  total_assets: number;
  total_liabilities: number;
  net_worth: number;
};

interface Props {
  assets: AssetRow[];
  liabilities: LiabilityRow[];
  snapshots: NetWorthSnapshotRow[];
  monthlySnapshots: MonthlySnapshot[];
  canEdit: boolean;
}

export function NetWorthClient({ assets, liabilities, snapshots, monthlySnapshots, canEdit }: Props) {
  const router = useRouter();
  const [assetDrawerOpen, setAssetDrawerOpen] = useState(false);
  const [liabilityDrawerOpen, setLiabilityDrawerOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AssetRow | null>(null);
  const [selectedLiability, setSelectedLiability] = useState<LiabilityRow | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);

  const assetTotals = useMemo(() => assets.reduce((sum, asset) => sum + Number(asset.current_value ?? 0), 0), [assets]);
  const liabilityTotals = useMemo(
    () => liabilities.reduce((sum, liability) => sum + Number(liability.current_balance ?? 0), 0),
    [liabilities],
  );
  const netWorth = assetTotals - liabilityTotals;

  const allocation = useMemo(() => {
    const buckets: Record<string, { total: number; label: string; colour: string }> = {
      cash: { total: 0, label: "Cash & Savings", colour: "#0ea5e9" },
      investment: { total: 0, label: "Investments", colour: "#6366f1" },
      property: { total: 0, label: "Property", colour: "#22c55e" },
      vehicle: { total: 0, label: "Vehicles", colour: "#f97316" },
      other: { total: 0, label: "Other", colour: "#94a3b8" },
    };

    assets.forEach((asset) => {
      const bucket = buckets[asset.asset_type] ?? buckets.other;
      bucket.total += Number(asset.current_value ?? 0);
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
  }, [assets, assetTotals]);

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
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 pb-24 pt-12 md:px-10 md:pb-12">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-secondary">Net worth</h1>
          <p className="text-base text-muted-foreground">
            Track how assets and liabilities shift over time to measure financial momentum.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/envelope-planning">Planner</Link>
          </Button>
          <Button onClick={createSnapshot} disabled={!canEdit || snapshotLoading}>
            {snapshotLoading ? "Saving…" : "Take snapshot"}
          </Button>
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

      <div className="grid gap-6 lg:grid-cols-[1.6fr,1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Net worth trend</CardTitle>
          </CardHeader>
          <CardContent>
            <Sparkline data={timeline} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Asset allocation</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <PieChart data={allocation} />
            <AllocationLegend data={allocation} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AssetList
          assets={assets}
          canEdit={canEdit}
          onAdd={() => {
            setSelectedAsset(null);
            setAssetDrawerOpen(true);
          }}
          onEdit={(asset) => {
            setSelectedAsset(asset);
            setAssetDrawerOpen(true);
          }}
        />
        <LiabilityList
          liabilities={liabilities}
          canEdit={canEdit}
          onAdd={() => {
            setSelectedLiability(null);
            setLiabilityDrawerOpen(true);
          }}
          onEdit={(liability) => {
            setSelectedLiability(liability);
            setLiabilityDrawerOpen(true);
          }}
        />
      </div>

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
          const tone =
            item.tone === "positive"
              ? "text-emerald-600"
              : item.tone === "negative"
              ? "text-rose-600"
              : "text-secondary";
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
  const colour =
    tone === "positive" ? "text-emerald-600" : tone === "negative" ? "text-rose-600" : "text-secondary";
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-semibold ${colour}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function Sparkline({ data }: { data: Array<{ id: string; date: Date; net: number }> }) {
  const width = 400;
  const height = 120;
  const min = Math.min(...data.map((item) => item.net));
  const max = Math.max(...data.map((item) => item.net));
  const range = max - min || 1;
  const points = data.map((item, index) => {
    const x = (index / Math.max(data.length - 1, 1)) * (width - 20) + 10;
    const y = height - ((item.net - min) / range) * (height - 20) - 10;
    return `${x},${y}`;
  });

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-32 w-full text-primary">
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        points={points.join(" ")}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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

function AssetList({
  assets,
  canEdit,
  onAdd,
  onEdit,
}: {
  assets: AssetRow[];
  canEdit: boolean;
  onAdd: () => void;
  onEdit: (asset: AssetRow) => void;
}) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Assets</CardTitle>
        <Button size="sm" onClick={onAdd} disabled={!canEdit}>
          Add asset
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {assets.length ? (
          assets.map((asset) => (
            <div key={asset.id} className="flex items-center justify-between rounded border bg-muted/30 px-3 py-2 text-sm">
              <div>
                <div className="font-medium text-secondary">{asset.name}</div>
                <div className="text-xs text-muted-foreground capitalize">{asset.asset_type}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold">{formatCurrency(Number(asset.current_value ?? 0))}</div>
                <Button variant="ghost" size="sm" onClick={() => onEdit(asset)} disabled={!canEdit}>
                  Edit
                </Button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-xs text-muted-foreground text-center">No assets yet.</p>
        )}
      </CardContent>
    </Card>
  );
}

function LiabilityList({
  liabilities,
  canEdit,
  onAdd,
  onEdit,
}: {
  liabilities: LiabilityRow[];
  canEdit: boolean;
  onAdd: () => void;
  onEdit: (liability: LiabilityRow) => void;
}) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Liabilities</CardTitle>
        <Button size="sm" onClick={onAdd} disabled={!canEdit}>
          Add liability
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {liabilities.length ? (
          liabilities.map((liability) => (
            <div key={liability.id} className="flex items-center justify-between rounded border bg-muted/30 px-3 py-2 text-sm">
              <div>
                <div className="font-medium text-secondary">{liability.name}</div>
                <div className="text-xs text-muted-foreground capitalize">{liability.liability_type}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold">{formatCurrency(Number(liability.current_balance ?? 0))}</div>
                <Button variant="ghost" size="sm" onClick={() => onEdit(liability)} disabled={!canEdit}>
                  Edit
                </Button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-xs text-muted-foreground text-center">No liabilities yet.</p>
        )}
      </CardContent>
    </Card>
  );
}

function HistoryList({ data }: { data: Array<{ id: string; date: Date; net: number }> }) {
  if (!data.length) {
    return null;
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Snapshot history</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        {data.map((item) => (
          <div key={item.id} className="flex items-center justify-between">
            <span>{item.date.toLocaleDateString("en-NZ", { dateStyle: "medium" })}</span>
            <span>{formatCurrency(item.net)}</span>
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
        <Dialog.Content className="fixed inset-y-0 right-0 flex w-full max-w-lg flex-col gap-4 bg-background p-6 shadow-xl">
          <Dialog.Title className="text-lg font-semibold text-secondary">
            {isEdit ? "Edit asset" : "Add asset"}
          </Dialog.Title>
          <form className="flex flex-1 flex-col gap-4" onSubmit={handleSubmit}>
            <Input
              placeholder="Name"
              value={localAsset?.name ?? ""}
              onChange={(event) =>
                setLocalAsset((prev) => ({
                  ...(prev ?? baseAsset),
                  name: event.target.value,
                }))
              }
              required
            />
            <select
              className="h-10 rounded-md border px-3 text-sm"
              value={localAsset?.asset_type ?? "other"}
              onChange={(event) =>
                setLocalAsset((prev) => ({
                  ...(prev ?? baseAsset),
                  asset_type: event.target.value,
                }))
              }
            >
              <option value="cash">Cash & Savings</option>
              <option value="investment">Investments</option>
              <option value="property">Property</option>
              <option value="vehicle">Vehicles</option>
              <option value="other">Other</option>
            </select>
            <Input
              placeholder="Current value"
              type="number"
              step="0.01"
              value={localAsset?.current_value ?? 0}
              onChange={(event) =>
                setLocalAsset((prev) => ({
                  ...(prev ?? baseAsset),
                  current_value: Number(event.target.value),
                }))
              }
            />
            <textarea
              className="min-h-[120px] rounded-md border px-3 py-2 text-sm"
              placeholder="Notes"
              value={localAsset?.notes ?? ""}
              onChange={(event) =>
                setLocalAsset((prev) => ({
                  ...(prev ?? baseAsset),
                  notes: event.target.value,
                }))
              }
            />
            <div className="mt-auto flex flex-wrap justify-between gap-2">
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
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Save asset"}
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
        <Dialog.Content className="fixed inset-y-0 right-0 flex w-full max-w-lg flex-col gap-4 bg-background p-6 shadow-xl">
          <Dialog.Title className="text-lg font-semibold text-secondary">
            {isEdit ? "Edit liability" : "Add liability"}
          </Dialog.Title>
          <form className="flex flex-1 flex-col gap-4" onSubmit={handleSubmit}>
            <Input
              placeholder="Name"
              value={localLiability?.name ?? ""}
              onChange={(event) =>
                setLocalLiability((prev) => ({
                  ...(prev ?? baseLiability),
                  name: event.target.value,
                }))
              }
              required
            />
            <select
              className="h-10 rounded-md border px-3 text-sm"
              value={localLiability?.liability_type ?? "liability"}
              onChange={(event) =>
                setLocalLiability((prev) => ({
                  ...(prev ?? baseLiability),
                  liability_type: event.target.value,
                }))
              }
            >
              <option value="mortgage">Mortgage</option>
              <option value="loan">Loan</option>
              <option value="credit">Credit card</option>
              <option value="liability">Other</option>
            </select>
            <Input
              placeholder="Current balance"
              type="number"
              step="0.01"
              value={localLiability?.current_balance ?? 0}
              onChange={(event) =>
                setLocalLiability((prev) => ({
                  ...(prev ?? baseLiability),
                  current_balance: Number(event.target.value),
                }))
              }
            />
            <Input
              placeholder="Interest rate %"
              type="number"
              step="0.01"
              value={localLiability?.interest_rate ?? 0}
              onChange={(event) =>
                setLocalLiability((prev) => ({
                  ...(prev ?? baseLiability),
                  interest_rate: Number(event.target.value),
                }))
              }
            />
            <textarea
              className="min-h-[120px] rounded-md border px-3 py-2 text-sm"
              placeholder="Notes"
              value={localLiability?.notes ?? ""}
              onChange={(event) =>
                setLocalLiability((prev) => ({
                  ...(prev ?? baseLiability),
                  notes: event.target.value,
                }))
              }
            />
            <div className="mt-auto flex flex-wrap justify-between gap-2">
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
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Save liability"}
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
