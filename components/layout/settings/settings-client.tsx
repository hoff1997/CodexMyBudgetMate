"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/finance";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Archive, Plus, ChevronDown, X, DollarSign, Calendar, Download, Trash2, Info, Link2, Shield, Loader2, ChevronRight } from "lucide-react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { RemyHelpPanel } from "@/components/coaching/RemyHelpPanel";
import { AchievementGallery } from "@/components/achievements/AchievementGallery";
import { SubscriptionCard } from "@/components/subscription";

// Types
type IncomeSourceRow = {
  id: string;
  name: string;
  pay_cycle: "weekly" | "fortnightly" | "monthly";
  typical_amount: number | null;
  next_pay_date: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  replaced_by_id: string | null;
  created_at: string;
};

type LabelRow = {
  id: string;
  name: string;
  colour: string | null;
  description: string | null;
  usageCount: number;
};

type BankConnectionRow = {
  id: string;
  provider: string;
  status: string;
  lastSyncedAt: string | null;
  syncFrequency: string | null;
  createdAt: string | null;
};

export type SettingsData = {
  profile: {
    fullName: string;
    preferredName: string | null;
    avatarUrl: string | null;
    email: string | null;
    payCycle: string;
    defaultPage: string;
    dateOfBirth: string | null;
  };
  incomeSources: IncomeSourceRow[];
  labels: LabelRow[];
  bankConnections: BankConnectionRow[];
  demoMode: boolean;
  userId?: string;
  username?: string;
};

type FlashMessage = {
  type: "success" | "error";
  message: string;
} | null;

type Props = {
  data: SettingsData;
  flash?: FlashMessage;
};

// Colour swatches for labels
const LABEL_COLOURS = [
  "#7A9E9A", // sage
  "#6B9ECE", // blue
  "#D4A853", // gold
  "#9CA3AF", // silver
  "#E57373", // coral
  "#81C784", // green
  "#FFB74D", // orange
  "#BA68C8", // purple
];

// Helper functions
function calculateAnnualAmount(amount: number | null, frequency: string): number {
  if (!amount) return 0;
  switch (frequency) {
    case "weekly": return amount * 52;
    case "fortnightly": return amount * 26;
    case "monthly": return amount * 12;
    default: return amount * 12;
  }
}

function formatFrequency(frequency: string): string {
  switch (frequency) {
    case "weekly": return "Weekly";
    case "fortnightly": return "Fortnightly";
    case "monthly": return "Monthly";
    default: return frequency;
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" });
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function SettingsClient({ data, flash = null }: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [profileName, setProfileName] = useState(data.profile.fullName);
  const [preferredName, setPreferredName] = useState<string>(data.profile.preferredName ?? "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(data.profile.avatarUrl);
  const [defaultPage, setDefaultPage] = useState<string>(data.profile.defaultPage);
  const [dateOfBirth, setDateOfBirth] = useState<string>(data.profile.dateOfBirth ?? "");
  const [labels, setLabels] = useState<LabelRow[]>(data.labels);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColour, setNewLabelColour] = useState("#7A9E9A");
  const [connections, setConnections] = useState<BankConnectionRow[]>(data.bankConnections);

  // Income sources state
  const [incomeSources, setIncomeSources] = useState<IncomeSourceRow[]>(data.incomeSources);
  const [showArchivedIncome, setShowArchivedIncome] = useState(false);
  const [addIncomeOpen, setAddIncomeOpen] = useState(false);
  const [editIncomeOpen, setEditIncomeOpen] = useState(false);
  const [endIncomeOpen, setEndIncomeOpen] = useState(false);
  const [selectedIncome, setSelectedIncome] = useState<IncomeSourceRow | null>(null);

  // Export state
  const [isExporting, setIsExporting] = useState(false);

  // Separate active and archived income
  const activeIncome = useMemo(() => incomeSources.filter(i => i.is_active), [incomeSources]);
  const archivedIncome = useMemo(() => incomeSources.filter(i => !i.is_active), [incomeSources]);
  const totalAnnualIncome = useMemo(
    () => activeIncome.reduce((sum, inc) => sum + calculateAnnualAmount(inc.typical_amount, inc.pay_cycle), 0),
    [activeIncome]
  );

  const connectedAccounts = useMemo(
    () => connections.filter(c => c.status.toLowerCase().includes("connected")),
    [connections]
  );

  useEffect(() => {
    if (!flash) return;
    const handler = flash.type === "success" ? toast.success : toast.error;
    handler(flash.message);
  }, [flash]);

  useEffect(() => {
    setConnections(data.bankConnections);
  }, [data.bankConnections]);

  useEffect(() => {
    setIncomeSources(data.incomeSources);
  }, [data.incomeSources]);

  function handleSelectPhoto() {
    fileInputRef.current?.click();
  }

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);
    toast.promise(simulateUpload(file), {
      loading: "Uploading photo…",
      success: "Profile photo updated",
      error: "Upload failed. Please try again.",
    });
  }

  function handleRemoveAvatar() {
    setAvatarPreview(null);
    toast.success("Profile photo cleared");
  }

  async function handleSaveProfile() {
    try {
      const response = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: profileName,
          preferred_name: preferredName || null,
          date_of_birth: dateOfBirth || null,
          default_page: defaultPage,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: "Unable to save profile" }));
        throw new Error(payload.error ?? "Unable to save profile");
      }

      toast.success("Profile details saved");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Unable to save profile");
    }
  }

  async function handleCreateLabel() {
    if (!newLabelName.trim()) {
      toast.error("Label name cannot be blank");
      return;
    }

    try {
      const response = await fetch("/api/labels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newLabelName.trim(),
          colour: newLabelColour,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: "Unable to create label" }));
        throw new Error(payload.error ?? "Unable to create label");
      }

      const { label } = (await response.json()) as { label: LabelRow };
      setLabels((prev) => [label, ...prev]);
      setNewLabelName("");
      toast.success("Label added");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Unable to create label");
    }
  }

  async function handleDeleteLabel(id: string) {
    try {
      const response = await fetch(`/api/labels/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: "Unable to delete label" }));
        throw new Error(payload.error ?? "Unable to delete label");
      }
      setLabels((prev) => prev.filter((label) => label.id !== id));
      toast.success("Label removed");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Unable to delete label");
    }
  }

  async function handleDefaultPageChange(newDefaultPage: string) {
    const previousDefaultPage = defaultPage;
    setDefaultPage(newDefaultPage);

    try {
      const response = await fetch("/api/user/default-page", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultPage: newDefaultPage }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: "Unable to update default page" }));
        throw new Error(payload.error ?? "Unable to update default page");
      }

      toast.success(`Default landing page updated`);
    } catch (error) {
      console.error(error);
      setDefaultPage(previousDefaultPage);
      toast.error(error instanceof Error ? error.message : "Unable to update default page");
    }
  }

  function handleConnectionAction(connection: BankConnectionRow, action: "refresh" | "disconnect") {
    const payload = { action };
    toast.promise(
      fetch("/api/akahu/connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then(async (response) => {
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error ?? "Unable to update connection");
        }
        const result = await response.json().catch(() => ({}));
        const nowIso = new Date().toISOString();
        setConnections((prev) => {
          if (action === "disconnect") {
            return prev.map((row) =>
              row.id === connection.id || row.provider === connection.provider
                ? { ...row, status: "disconnected", lastSyncedAt: nowIso }
                : row,
            );
          }
          const providers: string[] = Array.isArray(result.providers) ? result.providers : [connection.provider];
          const updated = prev.map((row) =>
            providers.includes(row.provider)
              ? { ...row, status: "connected", lastSyncedAt: nowIso }
              : row,
          );
          providers.forEach((provider) => {
            if (!updated.find((row) => row.provider === provider)) {
              updated.push({
                id: `${provider}-${Date.now()}`,
                provider,
                status: "connected",
                lastSyncedAt: nowIso,
                syncFrequency: connection.syncFrequency ?? null,
                createdAt: nowIso,
              });
            }
          });
          return updated;
        });
        return result;
      }),
      {
        loading: action === "refresh" ? "Refreshing connection…" : "Disconnecting…",
        success:
          action === "refresh"
            ? `Connection refreshed for ${connection.provider}`
            : `${connection.provider} disconnected`,
        error: (error) => error.message ?? "Connection update failed",
      },
    );
  }

  // Income source handlers
  async function handleAddIncome(incomeData: {
    name: string;
    amount: number;
    frequency: string;
    nextPayDate: string;
    replaceId?: string;
    endDate?: string;
  }) {
    try {
      const response = await fetch("/api/income-sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: incomeData.name,
          typical_amount: incomeData.amount,
          pay_cycle: incomeData.frequency,
          next_pay_date: incomeData.nextPayDate,
          replace_id: incomeData.replaceId,
          end_date: incomeData.endDate,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: "Unable to add income" }));
        throw new Error(payload.error ?? "Unable to add income");
      }

      const { income, archived } = (await response.json()) as { income: IncomeSourceRow; archived?: IncomeSourceRow };

      setIncomeSources((prev) => {
        let updated = [income, ...prev];
        if (archived) {
          updated = updated.map((inc) => (inc.id === archived.id ? archived : inc));
        }
        return updated;
      });

      setAddIncomeOpen(false);
      toast.success("Income source added");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Unable to add income");
    }
  }

  async function handleUpdateIncome(id: string, incomeData: {
    name: string;
    amount: number;
    frequency: string;
    nextPayDate: string;
  }) {
    try {
      const response = await fetch(`/api/income-sources/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: incomeData.name,
          typical_amount: incomeData.amount,
          pay_cycle: incomeData.frequency,
          next_pay_date: incomeData.nextPayDate,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: "Unable to update income" }));
        throw new Error(payload.error ?? "Unable to update income");
      }

      const { income } = (await response.json()) as { income: IncomeSourceRow };
      setIncomeSources((prev) => prev.map((inc) => (inc.id === income.id ? income : inc)));
      setEditIncomeOpen(false);
      setSelectedIncome(null);
      toast.success("Income source updated");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Unable to update income");
    }
  }

  async function handleArchiveIncome(id: string, endDate: string, addReplacement: boolean) {
    try {
      const response = await fetch(`/api/income-sources/${id}/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ end_date: endDate }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: "Unable to archive income" }));
        throw new Error(payload.error ?? "Unable to archive income");
      }

      const { income } = (await response.json()) as { income: IncomeSourceRow };
      setIncomeSources((prev) => prev.map((inc) => (inc.id === income.id ? income : inc)));
      setEndIncomeOpen(false);
      setSelectedIncome(null);
      toast.success("Income source archived");

      if (addReplacement) {
        setAddIncomeOpen(true);
      }
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Unable to archive income");
    }
  }

  async function handleExportData() {
    if (isExporting) return;

    try {
      setIsExporting(true);

      const response = await fetch("/api/export");

      if (!response.ok) {
        throw new Error("Export failed");
      }

      // Get the blob and trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `my-budget-mate-export-${new Date().toISOString().split("T")[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success("Your data has been exported");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export data. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }

  function handleDeleteAccount() {
    // Show info toast instead of error - feature coming soon
    toast.info("Account deletion is coming soon. Contact support@mybudgetmate.co.nz if you need to delete your account now.");
  }

  return (
    <div className="w-full px-6 lg:px-8 py-3 space-y-3">
      {/* Header */}
      <header className="pb-1">
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-[#3D3D3D]">Settings</h1>
            {data.demoMode && (
              <Badge variant="secondary" className="uppercase tracking-wide text-xs">
                Demo
              </Badge>
            )}
          </div>
          <RemyHelpPanel pageId="settings" />
        </div>
        <p className="text-sm text-[#6B6B6B]">
          Manage your profile, income sources, and bank connections.
        </p>
      </header>

      {/* Profile Section - Compact Layout */}
      <section className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
        <div className="px-3 py-2 border-b border-[#E5E7EB]">
          <h2 className="font-semibold text-[#3D3D3D]">Profile</h2>
        </div>
        <div className="p-3 space-y-3">
          {/* Avatar Row */}
          <div className="flex items-center gap-2">
            <AvatarPreview name={profileName} src={avatarPreview} />
            <button
              onClick={handleSelectPhoto}
              className="px-2.5 py-1 text-sm bg-[#7A9E9A] text-white rounded-lg hover:bg-[#5A7E7A]"
            >
              Upload
            </button>
            <button
              onClick={handleRemoveAvatar}
              className="px-2.5 py-1 text-sm border border-[#E5E7EB] rounded-lg hover:bg-[#F3F4F6] text-[#6B6B6B]"
            >
              Remove
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          {/* Profile Fields - Two Rows */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#6B6B6B] mb-0.5">Full name</label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="w-full h-8 px-2 text-sm border border-[#E5E7EB] rounded-lg focus:border-[#7A9E9A] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6B6B6B] mb-0.5">Preferred name</label>
              <input
                type="text"
                value={preferredName}
                onChange={(e) => setPreferredName(e.target.value)}
                placeholder="Optional"
                className="w-full h-8 px-2 text-sm border border-[#E5E7EB] rounded-lg focus:border-[#7A9E9A] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6B6B6B] mb-0.5">Email</label>
              <input
                type="email"
                value={data.profile.email ?? ""}
                readOnly
                className="w-full h-8 px-2 text-sm border border-[#E5E7EB] rounded-lg bg-[#F3F4F6] text-[#9CA3AF] cursor-not-allowed"
              />
            </div>
            <div>
              <label className="flex items-center gap-1 text-xs font-medium text-[#6B6B6B] mb-0.5">
                Date of birth
                <div className="relative group">
                  <Info className="w-3 h-3 text-[#9CA3AF] cursor-help" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-[#3D3D3D] text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    Used for analysis of our users only
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#3D3D3D]" />
                  </div>
                </div>
              </label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full h-8 px-2 text-sm border border-[#E5E7EB] rounded-lg focus:border-[#7A9E9A] focus:outline-none"
              />
            </div>
          </div>

          {/* Landing Page + Save */}
          <div className="flex items-end justify-between gap-3">
            <div className="w-[200px]">
              <label className="block text-xs font-medium text-[#6B6B6B] mb-0.5">Default landing page</label>
              <select
                value={defaultPage}
                onChange={(e) => handleDefaultPageChange(e.target.value)}
                className="w-full h-8 px-2 text-sm border border-[#E5E7EB] rounded-lg focus:border-[#7A9E9A] focus:outline-none"
              >
                <option value="/dashboard">Dashboard</option>
                <option value="/reconcile">Reconcile</option>
                <option value="/budgetallocation">Allocation</option>
                <option value="/transactions">Transactions</option>
                <option value="/envelope-summary">Envelope Summary</option>
                <option value="/net-worth">Net Worth</option>
              </select>
            </div>
            <button
              onClick={handleSaveProfile}
              className="px-3 py-1.5 text-sm bg-[#7A9E9A] text-white rounded-lg hover:bg-[#5A7E7A]"
            >
              Save profile
            </button>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <SecuritySection userEmail={data.profile.email} demoMode={data.demoMode} />

      {/* Subscription Section */}
      <section id="subscription" className="scroll-mt-4">
        <SubscriptionCard />
      </section>

      {/* Achievements Section */}
      <AchievementGallery />

      {/* Income Sources Section - Table Layout */}
      <section className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
        <div className="px-3 py-2 border-b border-[#E5E7EB] flex items-center justify-between">
          <h2 className="font-semibold text-[#3D3D3D]">Income Sources</h2>
          <button
            onClick={() => setAddIncomeOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 text-sm bg-[#7A9E9A] text-white rounded-lg hover:bg-[#5A7E7A]"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-4 gap-2 px-3 py-1.5 bg-[#F3F4F6] border-b border-[#E5E7EB] text-xs font-medium text-[#6B6B6B] uppercase">
          <div>Name</div>
          <div>Amount</div>
          <div>Next Pay</div>
          <div className="text-right">
            <span className="text-[#5A7E7A]">{formatCurrency(totalAnnualIncome)}/yr</span>
          </div>
        </div>

        {/* Rows */}
        {activeIncome.length === 0 ? (
          <div className="px-3 py-4 text-center text-sm text-[#9CA3AF]">
            No income sources set up yet. Add your first income to get started.
          </div>
        ) : (
          activeIncome.map((income) => (
            <div
              key={income.id}
              className="grid grid-cols-4 gap-2 px-3 py-2 items-center border-b border-[#E5E7EB] hover:bg-[#F3F4F6]"
            >
              <div className="font-medium text-[#3D3D3D] text-sm truncate">
                {income.name}
              </div>
              <div className="text-sm text-[#6B6B6B] truncate">
                {formatFrequency(income.pay_cycle)} · {formatCurrency(income.typical_amount ?? 0)}
              </div>
              <div className="text-sm text-[#6B6B6B]">
                {income.next_pay_date ? formatDate(income.next_pay_date) : "—"}
              </div>
              <div className="flex items-center justify-end gap-0.5">
                <button
                  onClick={() => {
                    setSelectedIncome(income);
                    setEditIncomeOpen(true);
                  }}
                  className="p-1 hover:bg-[#E5E7EB] rounded"
                  title="Edit"
                >
                  <Pencil className="w-3.5 h-3.5 text-[#6B6B6B]" />
                </button>
                <button
                  onClick={() => {
                    setSelectedIncome(income);
                    setEndIncomeOpen(true);
                  }}
                  className="p-1 hover:bg-[#DDEAF5] rounded"
                  title="End income"
                >
                  <Archive className="w-3.5 h-3.5 text-[#6B9ECE]" />
                </button>
              </div>
            </div>
          ))
        )}

        {/* Archived Section */}
        {archivedIncome.length > 0 && (
          <details className="border-t border-[#E5E7EB]">
            <summary
              className="px-3 py-1.5 text-sm text-[#9CA3AF] cursor-pointer hover:bg-[#F3F4F6] flex items-center gap-1.5"
              onClick={(e) => {
                e.preventDefault();
                setShowArchivedIncome(!showArchivedIncome);
              }}
            >
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${!showArchivedIncome ? "-rotate-90" : ""}`} />
              Archived ({archivedIncome.length})
            </summary>
            {showArchivedIncome && (
              <div className="opacity-60">
                {archivedIncome.map((income) => (
                  <div
                    key={income.id}
                    className="grid grid-cols-4 gap-2 px-3 py-1.5 items-center text-sm text-[#9CA3AF]"
                  >
                    <div className="truncate">{income.name}</div>
                    <div className="truncate">{formatFrequency(income.pay_cycle)} · {formatCurrency(income.typical_amount ?? 0)}</div>
                    <div>Ended {income.end_date ? formatDate(income.end_date) : ""}</div>
                    <div></div>
                  </div>
                ))}
              </div>
            )}
          </details>
        )}
      </section>

      {/* Labels Section - Simplified */}
      <section className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
        <div className="px-3 py-2 border-b border-[#E5E7EB]">
          <h2 className="font-semibold text-[#3D3D3D]">Labels</h2>
        </div>

        {/* Existing Labels */}
        <div className="px-3 py-2 border-b border-[#E5E7EB]">
          {labels.length === 0 ? (
            <p className="text-sm text-[#9CA3AF]">
              No labels yet. Create one to track spending across envelopes.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {labels.map((label) => (
                <div
                  key={label.id}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full text-sm"
                  style={{ backgroundColor: `${label.colour}20`, color: label.colour ?? "#6B6B6B" }}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: label.colour ?? "#9CA3AF" }}
                  />
                  <span>{label.name}</span>
                  {label.usageCount > 0 && (
                    <span className="text-xs opacity-70">({label.usageCount})</span>
                  )}
                  <button
                    onClick={() => handleDeleteLabel(label.id)}
                    className="ml-0.5 hover:opacity-70"
                    title="Remove label"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Label - Compact inline form */}
        <div className="px-3 py-2 flex items-center gap-2 flex-wrap">
          <input
            type="text"
            value={newLabelName}
            onChange={(e) => setNewLabelName(e.target.value)}
            placeholder="Label name..."
            className="flex-1 min-w-[120px] h-8 px-2 text-sm border border-[#E5E7EB] rounded-lg focus:border-[#7A9E9A] focus:outline-none"
          />

          {/* Colour swatches */}
          <div className="flex items-center gap-0.5">
            {LABEL_COLOURS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setNewLabelColour(c)}
                className={`w-5 h-5 rounded-full border-2 transition-all ${
                  newLabelColour === c ? "border-[#3D3D3D] scale-110" : "border-transparent"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          <button
            onClick={handleCreateLabel}
            disabled={!newLabelName.trim()}
            className="px-2.5 py-1 text-sm bg-[#7A9E9A] text-white rounded-lg hover:bg-[#5A7E7A] disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </section>

      {/* Bank Connections Section - Simplified (No Tabs) */}
      <section className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
        <div className="px-3 py-2 border-b border-[#E5E7EB] flex items-center justify-between">
          <h2 className="font-semibold text-[#3D3D3D]">Bank Connections</h2>
          <ConnectBankButton />
        </div>

        {connectedAccounts.length === 0 ? (
          <div className="px-3 py-3">
            <p className="text-sm text-[#9CA3AF]">
              No bank accounts connected. Connect via Akahu to import transactions automatically.
            </p>
          </div>
        ) : (
          <div>
            {connectedAccounts.map((connection) => (
              <div
                key={connection.id}
                className="grid grid-cols-[1fr_80px_100px_120px] gap-2 px-3 py-2 items-center border-b border-[#E5E7EB] hover:bg-[#F3F4F6]"
              >
                <div className="font-medium text-[#3D3D3D] text-sm">
                  {connection.provider}
                </div>
                <div>
                  <span className="px-1.5 py-0.5 bg-[#E2EEEC] text-[#5A7E7A] rounded-full text-xs">
                    Connected
                  </span>
                </div>
                <div className="text-xs text-[#9CA3AF]">
                  {formatRelativeTime(connection.lastSyncedAt)}
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleConnectionAction(connection, "refresh")}
                    className="text-xs text-[#5A7E7A] hover:underline"
                  >
                    Refresh
                  </button>
                  <button
                    onClick={() => handleConnectionAction(connection, "disconnect")}
                    className="text-xs text-[#6B9ECE] hover:underline"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Data & Privacy Section */}
      <section className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
        <div className="px-3 py-2 border-b border-[#E5E7EB]">
          <h2 className="font-semibold text-[#3D3D3D]">Data & Privacy</h2>
        </div>
        {/* Archived Envelopes Row */}
        <Link
          href="/settings/archived-envelopes"
          className="px-3 py-2 flex items-center justify-between border-b border-[#E5E7EB] hover:bg-[#F3F4F6] transition-colors"
        >
          <div className="flex items-center gap-2">
            <Archive className="w-4 h-4 text-[#6B9ECE]" />
            <div>
              <span className="text-sm text-[#3D3D3D]">Archived envelopes</span>
              <span className="ml-2 text-xs text-[#9CA3AF]">— View and restore archived envelopes</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#9CA3AF]" />
        </Link>
        {/* Export Row */}
        <div className="px-3 py-2 flex items-center justify-between border-b border-[#E5E7EB]">
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#3D3D3D]">Export your data</span>
            <span className="text-xs text-[#9CA3AF]">— Download all data as ZIP</span>
          </div>
          <button
            onClick={handleExportData}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#5A7E7A] bg-[#E2EEEC] hover:bg-[#D4E8E4] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                Export
              </>
            )}
          </button>
        </div>
        {/* Delete Row */}
        <div className="px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#9CA3AF]">Delete account</span>
            <span className="text-xs text-[#9CA3AF]">— Permanently remove account and data</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#9CA3AF] bg-[#F3F4F6] px-2 py-0.5 rounded">
              Coming soon
            </span>
            <button
              onClick={handleDeleteAccount}
              className="flex items-center gap-1 px-2 py-1 text-sm text-[#9CA3AF] border border-[#E5E7EB] rounded-lg cursor-not-allowed opacity-60"
              title="Account deletion is coming soon"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
        <div className="px-3 py-2 border-b border-[#E5E7EB]">
          <h2 className="font-semibold text-[#3D3D3D]">About</h2>
        </div>
        <div className="px-3 py-2 flex items-center justify-between text-sm">
          <p className="text-[#6B6B6B]">
            My Budget Mate <span className="text-[#9CA3AF]">v1.0.0-beta</span>
          </p>
          <div className="flex gap-3">
            <a href="/help" className="text-[#5A7E7A] hover:underline">Help</a>
            <a href="/privacy" className="text-[#5A7E7A] hover:underline">Privacy</a>
            <a href="/terms" className="text-[#5A7E7A] hover:underline">Terms</a>
          </div>
        </div>
      </section>

      {/* Add Income Dialog */}
      <AddIncomeDialog
        open={addIncomeOpen}
        onClose={() => setAddIncomeOpen(false)}
        existingIncomes={activeIncome}
        onSave={handleAddIncome}
      />

      {/* Edit Income Dialog */}
      <EditIncomeDialog
        open={editIncomeOpen}
        income={selectedIncome}
        onClose={() => {
          setEditIncomeOpen(false);
          setSelectedIncome(null);
        }}
        onSave={(data) => selectedIncome && handleUpdateIncome(selectedIncome.id, data)}
      />

      {/* End Income Dialog */}
      <EndIncomeDialog
        open={endIncomeOpen}
        income={selectedIncome}
        onClose={() => {
          setEndIncomeOpen(false);
          setSelectedIncome(null);
        }}
        onEnd={(endDate, addReplacement) =>
          selectedIncome && handleArchiveIncome(selectedIncome.id, endDate, addReplacement)
        }
      />
    </div>
  );
}

// Add Income Dialog
function AddIncomeDialog({
  open,
  onClose,
  existingIncomes,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  existingIncomes: IncomeSourceRow[];
  onSave: (data: {
    name: string;
    amount: number;
    frequency: string;
    nextPayDate: string;
    replaceId?: string;
    endDate?: string;
  }) => void;
}) {
  const [replaceMode, setReplaceMode] = useState<"additional" | "replace">("additional");
  const [incomeToReplace, setIncomeToReplace] = useState<string>("");
  const [endDate, setEndDate] = useState("");
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState<"weekly" | "fortnightly" | "monthly">("fortnightly");
  const [amount, setAmount] = useState("");
  const [nextPayDate, setNextPayDate] = useState("");
  const prevOpenRef = useRef(false);

  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setReplaceMode("additional");
      setIncomeToReplace("");
      setEndDate("");
      setName("");
      setFrequency("fortnightly");
      setAmount("");
      setNextPayDate("");
    }
    prevOpenRef.current = open;
  }, [open]);

  const annualPreview = amount ? calculateAnnualAmount(parseFloat(amount), frequency) : 0;
  const canSubmit = name.trim() && amount && nextPayDate &&
    (replaceMode === "additional" || (incomeToReplace && endDate));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    onSave({
      name: name.trim(),
      amount: parseFloat(amount),
      frequency,
      nextPayDate,
      replaceId: replaceMode === "replace" ? incomeToReplace : undefined,
      endDate: replaceMode === "replace" ? endDate : undefined,
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <div className="p-4 border-b border-[#E5E7EB] flex items-center justify-between">
              <Dialog.Title className="text-lg font-semibold text-[#3D3D3D]">
                Add Income Source
              </Dialog.Title>
              <Dialog.Close asChild>
                <button type="button" className="p-1 hover:bg-[#F3F4F6] rounded">
                  <X className="w-5 h-5 text-[#9CA3AF]" />
                </button>
              </Dialog.Close>
            </div>

            <div className="p-4 space-y-4">
              {existingIncomes.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-[#3D3D3D]">
                    Does this replace an existing income?
                  </label>

                  <div className="space-y-2">
                    <label className="flex items-start gap-3 p-3 border border-[#E5E7EB] rounded-lg cursor-pointer hover:bg-[#F3F4F6]">
                      <input
                        type="radio"
                        name="replaceMode"
                        checked={replaceMode === "additional"}
                        onChange={() => {
                          setReplaceMode("additional");
                          setIncomeToReplace("");
                        }}
                        className="mt-0.5"
                      />
                      <div>
                        <div className="text-sm font-medium text-[#3D3D3D]">No, this is additional income</div>
                        <div className="text-xs text-[#9CA3AF]">Side hustle, second job, etc.</div>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 p-3 border border-[#E5E7EB] rounded-lg cursor-pointer hover:bg-[#F3F4F6]">
                      <input
                        type="radio"
                        name="replaceMode"
                        checked={replaceMode === "replace"}
                        onChange={() => setReplaceMode("replace")}
                        className="mt-0.5"
                      />
                      <div>
                        <div className="text-sm font-medium text-[#3D3D3D]">Yes, I&apos;m replacing an income</div>
                        <div className="text-xs text-[#9CA3AF]">New job, changed employer</div>
                      </div>
                    </label>
                  </div>

                  {replaceMode === "replace" && (
                    <div className="pl-6 space-y-3 pt-2">
                      <div>
                        <label className="block text-sm text-[#6B6B6B] mb-1">Which income is ending?</label>
                        <select
                          value={incomeToReplace}
                          onChange={(e) => setIncomeToReplace(e.target.value)}
                          className="w-full h-9 px-3 text-sm border border-[#E5E7EB] rounded-lg focus:border-[#7A9E9A] focus:outline-none"
                        >
                          <option value="">Select income...</option>
                          {existingIncomes.map((inc) => (
                            <option key={inc.id} value={inc.id}>{inc.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm text-[#6B6B6B] mb-1">Last pay date from old income</label>
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full h-9 px-3 text-sm border border-[#E5E7EB] rounded-lg focus:border-[#7A9E9A] focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  <div className="border-t border-[#E5E7EB] pt-4 mt-4">
                    <h3 className="text-sm font-medium text-[#3D3D3D]">New Income Details</h3>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-[#3D3D3D] mb-1">
                  Income name <span className="text-[#6B9ECE]">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., My Salary, Freelance Work"
                  className="w-full h-9 px-3 text-sm border border-[#E5E7EB] rounded-lg focus:border-[#7A9E9A] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#3D3D3D] mb-1">
                  Amount per pay <span className="text-[#6B9ECE]">*</span>
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    className="w-full h-9 pl-9 pr-3 text-sm border border-[#E5E7EB] rounded-lg focus:border-[#7A9E9A] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#3D3D3D] mb-1">Pay frequency</label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as typeof frequency)}
                  className="w-full h-9 px-3 text-sm border border-[#E5E7EB] rounded-lg focus:border-[#7A9E9A] focus:outline-none"
                >
                  <option value="weekly">Weekly</option>
                  <option value="fortnightly">Fortnightly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#3D3D3D] mb-1">
                  Next pay date <span className="text-[#6B9ECE]">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
                  <input
                    type="date"
                    value={nextPayDate}
                    onChange={(e) => setNextPayDate(e.target.value)}
                    className="w-full h-9 pl-9 pr-3 text-sm border border-[#E5E7EB] rounded-lg focus:border-[#7A9E9A] focus:outline-none"
                  />
                </div>
              </div>

              {amount && (
                <div className="bg-[#E2EEEC] rounded-lg p-3">
                  <div className="text-sm text-[#5A7E7A]">
                    Annual income: <span className="font-semibold">{formatCurrency(annualPreview)}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-[#E5E7EB] flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
              <Button
                type="submit"
                disabled={!canSubmit}
                className="bg-[#7A9E9A] hover:bg-[#5A7E7A] disabled:opacity-50"
              >
                Add income
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// Edit Income Dialog
function EditIncomeDialog({
  open,
  income,
  onClose,
  onSave,
}: {
  open: boolean;
  income: IncomeSourceRow | null;
  onClose: () => void;
  onSave: (data: { name: string; amount: number; frequency: string; nextPayDate: string }) => void;
}) {
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState<"weekly" | "fortnightly" | "monthly">("fortnightly");
  const [amount, setAmount] = useState("");
  const [nextPayDate, setNextPayDate] = useState("");
  const prevIncomeIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (income && income.id !== prevIncomeIdRef.current) {
      setName(income.name);
      setFrequency(income.pay_cycle);
      setAmount(income.typical_amount?.toString() ?? "");
      setNextPayDate(income.next_pay_date ?? "");
      prevIncomeIdRef.current = income.id;
    } else if (!income) {
      prevIncomeIdRef.current = null;
    }
  }, [income]);

  const annualPreview = amount ? calculateAnnualAmount(parseFloat(amount), frequency) : 0;
  const canSubmit = name.trim() && amount && nextPayDate;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    onSave({ name: name.trim(), amount: parseFloat(amount), frequency, nextPayDate });
  }

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <div className="p-4 border-b border-[#E5E7EB] flex items-center justify-between">
              <Dialog.Title className="text-lg font-semibold text-[#3D3D3D]">Edit Income Source</Dialog.Title>
              <Dialog.Close asChild>
                <button type="button" className="p-1 hover:bg-[#F3F4F6] rounded">
                  <X className="w-5 h-5 text-[#9CA3AF]" />
                </button>
              </Dialog.Close>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#3D3D3D] mb-1">
                  Income name <span className="text-[#6B9ECE]">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-9 px-3 text-sm border border-[#E5E7EB] rounded-lg focus:border-[#7A9E9A] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#3D3D3D] mb-1">
                  Amount per pay <span className="text-[#6B9ECE]">*</span>
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    step="0.01"
                    className="w-full h-9 pl-9 pr-3 text-sm border border-[#E5E7EB] rounded-lg focus:border-[#7A9E9A] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#3D3D3D] mb-1">Pay frequency</label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as typeof frequency)}
                  className="w-full h-9 px-3 text-sm border border-[#E5E7EB] rounded-lg focus:border-[#7A9E9A] focus:outline-none"
                >
                  <option value="weekly">Weekly</option>
                  <option value="fortnightly">Fortnightly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#3D3D3D] mb-1">
                  Next pay date <span className="text-[#6B9ECE]">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
                  <input
                    type="date"
                    value={nextPayDate}
                    onChange={(e) => setNextPayDate(e.target.value)}
                    className="w-full h-9 pl-9 pr-3 text-sm border border-[#E5E7EB] rounded-lg focus:border-[#7A9E9A] focus:outline-none"
                  />
                </div>
              </div>

              {amount && (
                <div className="bg-[#E2EEEC] rounded-lg p-3">
                  <div className="text-sm text-[#5A7E7A]">
                    Annual income: <span className="font-semibold">{formatCurrency(annualPreview)}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-[#E5E7EB] flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
              <Button
                type="submit"
                disabled={!canSubmit}
                className="bg-[#7A9E9A] hover:bg-[#5A7E7A] disabled:opacity-50"
              >
                Save changes
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// End Income Dialog
function EndIncomeDialog({
  open,
  income,
  onClose,
  onEnd,
}: {
  open: boolean;
  income: IncomeSourceRow | null;
  onClose: () => void;
  onEnd: (endDate: string, addReplacement: boolean) => void;
}) {
  const [endDate, setEndDate] = useState("");
  const [addReplacement, setAddReplacement] = useState(false);
  const prevOpenRef = useRef(false);

  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setEndDate("");
      setAddReplacement(false);
    }
    prevOpenRef.current = open;
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!endDate) return;
    onEnd(endDate, addReplacement);
  }

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-xl shadow-xl w-full max-w-sm">
          <form onSubmit={handleSubmit}>
            <div className="p-4 border-b border-[#E5E7EB]">
              <Dialog.Title className="text-lg font-semibold text-[#3D3D3D]">End Income Source</Dialog.Title>
            </div>

            <div className="p-4 space-y-4">
              <p className="text-sm text-[#6B6B6B]">
                When does <span className="font-medium">&quot;{income?.name}&quot;</span> end?
              </p>

              <div>
                <label className="block text-sm font-medium text-[#3D3D3D] mb-1">Last pay date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full h-9 px-3 text-sm border border-[#E5E7EB] rounded-lg focus:border-[#7A9E9A] focus:outline-none"
                />
              </div>

              <div className="bg-[#DDEAF5] rounded-lg p-3">
                <p className="text-sm text-[#6B9ECE]">
                  This will archive the income source. Historical data will be kept for reporting.
                </p>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addReplacement}
                  onChange={(e) => setAddReplacement(e.target.checked)}
                  className="rounded border-[#E5E7EB]"
                />
                <span className="text-sm text-[#3D3D3D]">Add a replacement income</span>
              </label>
            </div>

            <div className="p-4 border-t border-[#E5E7EB] flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
              <Button
                type="submit"
                disabled={!endDate}
                className="bg-[#6B9ECE] hover:bg-[#5A8DBD] disabled:opacity-50"
              >
                End income
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// Helper Components
function AvatarPreview({ name, src }: { name: string; src: string | null }) {
  if (src) {
    return (
      <div className="relative h-10 w-10 overflow-hidden rounded-full border border-[#E5E7EB]">
        <Image src={src} alt={name || "Profile photo"} fill className="object-cover" />
      </div>
    );
  }
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-[#7A9E9A] text-sm font-semibold text-[#7A9E9A]">
      {initials || "MB"}
    </div>
  );
}

async function simulateUpload(file: File) {
  await new Promise((resolve) => setTimeout(resolve, 1200));
  return file.size;
}

// Simple Connect Bank Button
function ConnectBankButton() {
  function handleConnect() {
    const akahuAuthUrl = process.env.NEXT_PUBLIC_AKAHU_AUTH_URL;
    if (!akahuAuthUrl) {
      toast.error("Akahu configuration missing. Please check environment variables.");
      return;
    }
    window.location.href = akahuAuthUrl;
  }

  return (
    <button
      onClick={handleConnect}
      className="flex items-center gap-1 px-2.5 py-1 text-sm bg-[#7A9E9A] text-white rounded-lg hover:bg-[#5A7E7A]"
    >
      <Link2 className="w-3.5 h-3.5" />
      Connect
    </button>
  );
}

// Security Section Component
function SecuritySection({ userEmail, demoMode }: { userEmail: string | null; demoMode: boolean }) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleChangePassword() {
    if (!userEmail) {
      toast.error("No email address found");
      return;
    }

    if (demoMode) {
      toast.error("Cannot change password in demo mode");
      return;
    }

    setIsLoading(true);

    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        throw error;
      }

      toast.success("Check your email for the password reset link");
    } catch (error) {
      console.error("Password reset error:", error);
      toast.error("Failed to send reset email. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
      <div className="px-3 py-2 border-b border-[#E5E7EB]">
        <h2 className="font-semibold text-[#3D3D3D]">Security</h2>
      </div>
      <div className="px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#9CA3AF]" />
          <div>
            <span className="text-sm text-[#3D3D3D]">Password</span>
            <span className="ml-2 text-xs text-[#9CA3AF]">— Manage your login credentials</span>
          </div>
        </div>
        <button
          onClick={handleChangePassword}
          disabled={isLoading || demoMode}
          className="px-3 py-1.5 text-xs font-medium text-[#5A7E7A] bg-[#E2EEEC] hover:bg-[#D4E8E4] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Sending..." : "Change password"}
        </button>
      </div>
    </section>
  );
}
