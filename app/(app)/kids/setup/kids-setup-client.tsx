"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AddChildDialog } from "@/components/kids/add-child-dialog";
import { EditChildDialog } from "@/components/kids/edit-child-dialog";
import { ParentOnboardingTutorial } from "@/components/kids/parent-onboarding-tutorial";
import {
  Plus,
  Copy,
  Check,
  ExternalLink,
  Settings,
  Wallet,
  PiggyBank,
  TrendingUp,
  Heart,
  Receipt,
  Flame,
  ChevronRight,
  Pencil,
  HelpCircle,
} from "lucide-react";
import { RemyTip } from "@/components/onboarding/remy-tip";
import { RemyHelpButton } from "@/components/shared/remy-help-button";
import { kidsParentDashboardHelp } from "@/lib/coaching/content/kids";
import { cn } from "@/lib/cn";
import Link from "next/link";

interface BankAccount {
  envelope_type: string;
  current_balance: number;
}

interface ChildProfile {
  id: string;
  name: string;
  date_of_birth: string | null;
  avatar_url: string | null;
  family_access_code: string;
  created_at: string;
}

interface ChildWithData extends ChildProfile {
  accounts?: BankAccount[];
  pendingInvoiceTotal?: number;
  pendingInvoiceCount?: number;
  choreStreakMax?: number;
}

interface KidsSetupClientProps {
  initialChildren: ChildProfile[];
}

const ENVELOPE_ICONS = {
  spend: { icon: Wallet, color: "text-blue", label: "Spend" },
  save: { icon: PiggyBank, color: "text-sage", label: "Save" },
  invest: { icon: TrendingUp, color: "text-gold", label: "Invest" },
  give: { icon: Heart, color: "text-pink-500", label: "Give" },
};

export function KidsSetupClient({ initialChildren }: KidsSetupClientProps) {
  const router = useRouter();
  const [children, setChildren] = useState<ChildWithData[]>(initialChildren);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedChild, setSelectedChild] = useState<ChildProfile | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTutorial, setShowTutorial] = useState(false);

  // Fetch additional data for each child
  useEffect(() => {
    async function fetchChildData() {
      const enrichedChildren = await Promise.all(
        initialChildren.map(async (child) => {
          try {
            // Fetch accounts - now returns { accounts, totalBalance, isLinked }
            const accountsRes = await fetch(`/api/kids/${child.id}/bank-accounts`);
            const accountsData = accountsRes.ok ? await accountsRes.json() : { accounts: [], totalBalance: 0 };

            // Fetch pending invoice - returns { invoices: [...] }
            const invoiceRes = await fetch(`/api/kids/${child.id}/invoices?status=draft`);
            const invoiceData = invoiceRes.ok ? await invoiceRes.json() : { invoices: [] };

            // Calculate pending invoice stats from draft invoices
            const draftInvoices = invoiceData.invoices || [];
            const pendingTotal = draftInvoices.reduce((sum: number, inv: { total_amount: number }) => sum + (inv.total_amount || 0), 0);
            const pendingCount = draftInvoices.reduce((sum: number, inv: { items?: unknown[] }) => sum + (inv.items?.length || 0), 0);

            // Fetch streaks - returns { streaks: [...], stats: { longestCurrentStreak, ... } }
            const streaksRes = await fetch(`/api/kids/${child.id}/streaks`);
            const streaksData = streaksRes.ok ? await streaksRes.json() : { stats: { longestCurrentStreak: 0 } };

            const maxStreak = streaksData.stats?.longestCurrentStreak || 0;

            return {
              ...child,
              accounts: accountsData.accounts || [],
              pendingInvoiceTotal: pendingTotal,
              pendingInvoiceCount: pendingCount,
              choreStreakMax: maxStreak,
            };
          } catch {
            return { ...child, accounts: [], pendingInvoiceTotal: 0, pendingInvoiceCount: 0, choreStreakMax: 0 };
          }
        })
      );
      setChildren(enrichedChildren);
      setLoading(false);
    }

    if (initialChildren.length > 0) {
      fetchChildData();
    } else {
      setLoading(false);
    }
  }, [initialChildren]);

  const handleAddSuccess = () => {
    router.refresh();
  };

  const copyFamilyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const formatAge = (dob: string | null) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const getTotalBalance = (accounts: BankAccount[]) => {
    return accounts.reduce((sum, acc) => sum + (acc.current_balance || 0), 0);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-4">
      {/* Compact Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-text-dark">Parent&apos;s Dashboard</h1>
          <p className="text-sm text-text-medium">Manage your children&apos;s financial learning</p>
        </div>
        <div className="flex gap-2 items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              localStorage.removeItem("kids_parent_tutorial_completed");
              setShowTutorial(true);
            }}
          >
            <HelpCircle className="h-4 w-4 mr-1" />
            Tutorial
          </Button>
          <Link href="/kids/settings">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-1" />
              Settings
            </Button>
          </Link>
          <Button
            onClick={() => setAddDialogOpen(true)}
            className="bg-sage hover:bg-sage-dark"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Child
          </Button>
          <RemyHelpButton title="Parent Dashboard" content={kidsParentDashboardHelp} variant="compact" />
        </div>
      </div>

      {/* Empty State */}
      {children.length === 0 && (
        <Card className="mb-4">
          <CardContent className="py-8 text-center">
            <div className="text-5xl mb-3">👨‍👩‍👧‍👦</div>
            <h2 className="text-lg font-semibold text-text-dark mb-2">
              No children added yet
            </h2>
            <p className="text-sm text-text-medium mb-4 max-w-md mx-auto">
              Add your teen to help them learn real money management with chores and invoices.
            </p>
            <Button
              onClick={() => setAddDialogOpen(true)}
              className="bg-sage hover:bg-sage-dark"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Your First Child
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Children Grid - Compact Cards */}
      {children.length > 0 && (
        <div className={cn(
          "grid gap-3 mb-4",
          children.length === 1 ? "grid-cols-1" :
          children.length === 2 ? "grid-cols-1 md:grid-cols-2" :
          "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
        )}>
          {children.map((child) => (
            <Card key={child.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                {/* Header Row */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-sage-light flex items-center justify-center text-2xl shrink-0 border-2 border-sage">
                    {child.avatar_url ? (
                      <Image
                        src={child.avatar_url}
                        alt={child.name}
                        width={48}
                        height={48}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      "👤"
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <h3 className="font-semibold text-text-dark truncate">{child.name}</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 text-text-light hover:text-sage"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedChild(child);
                          setEditDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-xs text-text-medium">
                      {formatAge(child.date_of_birth) !== null
                        ? `${formatAge(child.date_of_birth)} years old`
                        : "Age not set"}
                    </p>
                  </div>
                  {/* Streak Badge */}
                  {child.choreStreakMax && child.choreStreakMax > 0 && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-gold-light rounded-full shrink-0">
                      <Flame className="h-3 w-3 text-gold" />
                      <span className="text-xs font-bold text-gold-dark">{child.choreStreakMax}</span>
                    </div>
                  )}
                </div>

                {/* Balance Grid - Compact */}
                {loading ? (
                  <div className="grid grid-cols-4 gap-1 mb-3 p-2 bg-silver-very-light rounded-lg animate-pulse">
                    {["spend", "save", "invest", "give"].map((type) => {
                      const config = ENVELOPE_ICONS[type as keyof typeof ENVELOPE_ICONS];
                      const Icon = config.icon;
                      return (
                        <div key={type} className="text-center">
                          <Icon className={cn("h-3 w-3 mx-auto mb-0.5", config.color, "opacity-50")} />
                          <div className="h-3 bg-gray-200 rounded w-6 mx-auto" />
                        </div>
                      );
                    })}
                  </div>
                ) : child.accounts && child.accounts.length > 0 ? (
                  <div className="grid grid-cols-4 gap-1 mb-3 p-2 bg-silver-very-light rounded-lg">
                    {["spend", "save", "invest", "give"].map((type) => {
                      const account = child.accounts?.find((a) => a.envelope_type === type);
                      const config = ENVELOPE_ICONS[type as keyof typeof ENVELOPE_ICONS];
                      const Icon = config.icon;
                      return (
                        <div key={type} className="text-center">
                          <Icon className={cn("h-3 w-3 mx-auto mb-0.5", config.color)} />
                          <p className="text-xs font-bold text-text-dark">
                            ${(account?.current_balance || 0).toFixed(0)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                {/* Total Balance */}
                {loading ? (
                  <div className="flex items-center justify-between mb-3 px-2 animate-pulse">
                    <span className="text-xs text-text-medium">Total Balance</span>
                    <div className="h-4 bg-gray-200 rounded w-12" />
                  </div>
                ) : child.accounts && child.accounts.length > 0 ? (
                  <div className="flex items-center justify-between mb-3 px-2">
                    <span className="text-xs text-text-medium">Total Balance</span>
                    <span className="font-bold text-sage">
                      ${getTotalBalance(child.accounts).toFixed(2)}
                    </span>
                  </div>
                ) : null}

                {/* Invoice Status */}
                {loading ? (
                  <div className="flex items-center gap-2 p-2 bg-silver-very-light rounded-lg mb-3 animate-pulse">
                    <Receipt className="h-4 w-4 text-text-light opacity-50" />
                    <div className="h-3 bg-gray-200 rounded w-24" />
                  </div>
                ) : child.pendingInvoiceCount && child.pendingInvoiceCount > 0 ? (
                  <div className="flex items-center gap-2 p-2 bg-sage-very-light rounded-lg mb-3">
                    <Receipt className="h-4 w-4 text-sage" />
                    <span className="text-xs text-sage-dark flex-1">
                      Invoice: {child.pendingInvoiceCount} items
                    </span>
                    <span className="text-xs font-bold text-sage">
                      ${(child.pendingInvoiceTotal || 0).toFixed(2)}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-2 bg-silver-very-light rounded-lg mb-3">
                    <Receipt className="h-4 w-4 text-text-light" />
                    <span className="text-xs text-text-medium">No pending invoice</span>
                  </div>
                )}

                {/* Family Code - Inline */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-light">Code:</span>
                    <code className="font-mono text-xs font-bold text-text-dark bg-white px-1.5 py-0.5 rounded">
                      {child.family_access_code}
                    </code>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => copyFamilyCode(child.family_access_code)}
                  >
                    {copiedCode === child.family_access_code ? (
                      <Check className="h-3 w-3 text-sage" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>

                {/* Actions */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => router.push(`/kids/${child.id}/dashboard`)}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  View Dashboard
                  <ChevronRight className="h-3 w-3 ml-auto" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Compact Remy Tip */}
      {children.length > 0 && (
        <RemyTip pose="small">
          Kids log in at{" "}
          <code className="px-1 py-0.5 bg-white rounded text-sage-dark font-mono text-xs">
            /kids/login
          </code>{" "}
          with their family code and PIN. They complete chores, submit invoices, and learn real money management!
        </RemyTip>
      )}

      {/* Add Child Dialog */}
      <AddChildDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={handleAddSuccess}
      />

      {/* Edit Child Dialog */}
      <EditChildDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        child={selectedChild}
        onSuccess={handleAddSuccess}
      />

      {/* Parent Onboarding Tutorial */}
      <ParentOnboardingTutorial
        onComplete={() => setShowTutorial(false)}
        forceOpen={showTutorial}
      />
    </div>
  );
}
