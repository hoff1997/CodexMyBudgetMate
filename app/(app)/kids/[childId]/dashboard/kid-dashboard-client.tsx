"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import {
  CheckCircle2,
  Circle,
  Wallet,
  PiggyBank,
  TrendingUp,
  Heart,
  ChevronRight,
  Flame,
  Receipt,
  Clock,
  LogOut,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { RemyHelpButton } from "@/components/shared/remy-help-button";
import { SavingsGoalsSection } from "@/components/kids/savings-goals-section";
import { KidWalletCard } from "@/components/kids/kid-wallet-card";
import type { KidWalletSummary, KidWalletTransaction } from "@/lib/types/wallet";

interface ChildProfile {
  id: string;
  name: string;
  avatar_url: string | null;
  // Legacy fields (archived features - not displayed)
  star_balance?: number;
  screen_time_balance?: number;
  distribution_spend_pct: number;
  distribution_save_pct: number;
  distribution_invest_pct: number;
  distribution_give_pct: number;
}

interface BankAccount {
  id: string;
  envelope_type: string;
  account_name: string;
  current_balance: number;
  is_virtual: boolean;
}

interface ChoreTemplate {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  is_expected: boolean;
  currency_type: string | null;
  currency_amount: number | null;
}

interface ChoreAssignment {
  id: string;
  status: string;
  marked_done_at: string | null;
  approved_at: string | null;
  chore_template: ChoreTemplate | null;
}

interface Achievement {
  id: string;
  achieved_at: string;
  achievement: {
    key: string;
    name: string;
    description: string | null;
    bonus_stars: number;
    icon: string | null;
  } | null;
}

interface ChoreStreak {
  id: string;
  chore_template_id: string;
  current_streak: number;
  longest_streak: number;
  completed_days: boolean[];
  chore_template?: {
    id: string;
    name: string;
    icon: string | null;
  };
}

interface DraftInvoice {
  id: string;
  invoice_number: string;
  total_amount: number;
  status: string;
  item_count: number;
}

interface SavingsGoal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  icon: string | null;
  description: string | null;
  status: string;
}

interface KidDashboardClientProps {
  child: ChildProfile;
  accounts: BankAccount[];
  chores: ChoreAssignment[];
  achievements: Achievement[];
  streaks?: ChoreStreak[];
  draftInvoice?: DraftInvoice | null;
  goals?: SavingsGoal[];
}

const ENVELOPE_ICONS = {
  spend: { icon: Wallet, color: "text-blue", bg: "bg-blue-light" },
  save: { icon: PiggyBank, color: "text-sage", bg: "bg-sage-very-light" },
  invest: { icon: TrendingUp, color: "text-gold", bg: "bg-gold-light" },
  give: { icon: Heart, color: "text-pink-500", bg: "bg-pink-50" },
};

const HELP_CONTENT = {
  tips: [
    "Check your chores each morning to plan your day",
    "Build streaks by completing expected chores daily",
    "Extra chores add to your invoice - submit it to get paid!",
    "Create savings goals for things you really want!",
  ],
  features: [
    "See your money across Spend, Save, Invest, and Give",
    "Create and track savings goals from your Save balance",
    "Track expected chores with streak indicators",
    "Complete extra chores to earn more money",
    "View and submit your invoice when ready",
  ],
  faqs: [
    {
      question: "What are expected vs extra chores?",
      answer: "Expected chores are part of your pocket money - do them to keep your streaks and build habits. Extra chores earn you additional money that goes on your invoice.",
    },
    {
      question: "How do savings goals work?",
      answer: "Goals let you save for specific things you want. The money comes from your Save balance - just add funds to each goal as you save up!",
    },
    {
      question: "How do invoices work?",
      answer: "When you complete extra chores, they get added to your invoice. Submit it when you're ready and your parent will pay you!",
    },
  ],
};

export function KidDashboardClient({
  child,
  accounts,
  chores,
  achievements,
  streaks = [],
  draftInvoice,
  goals = [],
}: KidDashboardClientProps) {
  const router = useRouter();
  const [isMarkingDone, setIsMarkingDone] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Handle logout
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/kids/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      // Redirect to kids login page
      router.push("/kids/login");
    } catch (err) {
      console.error("Failed to logout:", err);
      setIsLoggingOut(false);
    }
  };

  // Split chores into expected and extra
  const expectedChores = chores.filter((c) => c.chore_template?.is_expected);
  const extraChores = chores.filter((c) => !c.chore_template?.is_expected);

  // Get save account for goals section
  const saveAccount = accounts.find((a) => a.envelope_type === "save") || null;

  // Get wallet account and create summary for KidWalletCard
  const walletAccount = accounts.find((a) => a.envelope_type === "wallet") || null;
  const walletSummary: KidWalletSummary | null = walletAccount
    ? {
        account: {
          id: walletAccount.id,
          child_profile_id: child.id,
          envelope_type: "wallet" as const,
          current_balance: walletAccount.current_balance,
        },
        balance: walletAccount.current_balance,
        recentTransactions: [], // Transactions are fetched by the card if needed
      }
    : null;

  const completedExpected = expectedChores.filter((c) => c.status === "done" || c.status === "approved").length;
  const completedExtra = extraChores.filter((c) => c.status === "done" || c.status === "approved").length;

  // Get streak info for a chore
  const getStreakForChore = (choreTemplateId: string) => {
    return streaks.find((s) => s.chore_template_id === choreTemplateId);
  };

  const handleMarkDone = async (choreId: string) => {
    setIsMarkingDone(choreId);
    try {
      const res = await fetch(`/api/chores/assignments/${choreId}/complete`, {
        method: "PATCH",
      });
      if (res.ok) {
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to mark chore as done:", err);
    } finally {
      setIsMarkingDone(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sage-very-light to-white">
      <div className="w-full max-w-4xl mx-auto px-4 py-4">
        {/* Compact Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-sage-light flex items-center justify-center text-2xl border-2 border-sage shrink-0">
              {child.avatar_url ? (
                <Image
                  src={child.avatar_url}
                  alt={child.name}
                  width={56}
                  height={56}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                "👤"
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold text-text-dark">Hi {child.name}! 👋</h1>
              <p className="text-sm text-text-medium">Your money dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <RemyHelpButton title="Dashboard" content={HELP_CONTENT} variant="compact" />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="gap-1 h-8 text-text-medium hover:text-text-dark hover:bg-silver-very-light"
            >
              {isLoggingOut ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <LogOut className="h-3 w-3" />
              )}
              <span className="hidden sm:inline text-xs">Finish</span>
            </Button>
          </div>
        </div>

        {/* Invoice Status - Only show if there's a draft */}
        {draftInvoice && draftInvoice.item_count > 0 && (
          <Link href={`/kids/${child.id}/invoices`}>
            <div className="flex items-center justify-between p-3 mb-3 bg-sage-very-light border border-sage rounded-lg hover:shadow-sm transition-shadow cursor-pointer">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-sage rounded-full">
                  <Receipt className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-dark">Invoice Ready</p>
                  <p className="text-xs text-text-medium">
                    {draftInvoice.item_count} item{draftInvoice.item_count !== 1 ? "s" : ""} • ${draftInvoice.total_amount.toFixed(2)}
                  </p>
                </div>
              </div>
              <Button size="sm" className="bg-sage hover:bg-sage-dark h-7 text-xs">
                View
              </Button>
            </div>
          </Link>
        )}

        {/* Money Envelopes - Compact Horizontal Grid */}
        <Card className="mb-3">
          <CardContent className="py-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">💰</span>
                <span className="font-semibold text-text-dark">My Money</span>
              </div>
              <Link
                href={`/kids/${child.id}/money`}
                className="text-xs text-sage hover:text-sage-dark flex items-center gap-0.5"
              >
                Details <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            {/* Top row: Spend, Invest, Give (3 columns) - excludes Save and Wallet */}
            <div className="grid grid-cols-3 gap-2 mb-2">
              {accounts
                .filter((a) => a.envelope_type !== "save" && a.envelope_type !== "wallet")
                .map((account) => {
                  const config = ENVELOPE_ICONS[account.envelope_type as keyof typeof ENVELOPE_ICONS];
                  const Icon = config?.icon || Wallet;

                  return (
                    <div
                      key={account.id}
                      className={cn("p-2 rounded-lg text-center", config?.bg || "bg-silver-very-light")}
                    >
                      <Icon className={cn("h-4 w-4 mx-auto mb-1", config?.color || "text-text-medium")} />
                      <p className={cn("text-sm font-bold", config?.color || "text-text-dark")}>
                        ${account.current_balance.toFixed(0)}
                      </p>
                      <p className="text-xs sm:text-[10px] text-text-light capitalize">{account.envelope_type}</p>
                    </div>
                  );
                })}
            </div>
            {/* Bottom row: Save (full width with allocation breakdown) */}
            {accounts
              .filter((a) => a.envelope_type === "save")
              .map((account) => {
                const config = ENVELOPE_ICONS.save;
                const Icon = config.icon;
                const totalAllocatedToGoals = goals.reduce((sum, g) => sum + g.current_amount, 0);
                const unallocated = Math.max(0, account.current_balance - totalAllocatedToGoals);

                return (
                  <div
                    key={account.id}
                    className={cn("p-3 rounded-lg", config.bg)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className={cn("h-5 w-5", config.color)} />
                        <div>
                          <p className="text-xs text-text-light capitalize">{account.envelope_type}</p>
                          <p className={cn("text-lg font-bold", config.color)}>
                            ${account.current_balance.toFixed(0)}
                          </p>
                        </div>
                      </div>
                      {/* Allocation breakdown */}
                      {goals.length > 0 && (
                        <div className="text-right text-xs text-text-light">
                          <div className="flex items-center justify-end gap-1">
                            <span>In goals:</span>
                            <span className="tabular-nums font-medium text-text-medium">${totalAllocatedToGoals.toFixed(0)}</span>
                          </div>
                          <div className="flex items-center justify-end gap-1">
                            <span>Unallocated:</span>
                            <span className="tabular-nums font-medium text-sage">${unallocated.toFixed(0)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </CardContent>
        </Card>

        {/* Savings Goals - Connected to Save envelope */}
        <SavingsGoalsSection
          childId={child.id}
          childName={child.name}
          goals={goals}
          saveAccount={saveAccount}
        />

        {/* Wallet (Cash on Hand) - Only show if wallet exists */}
        {walletSummary && (
          <div className="mb-3">
            <KidWalletCard
              childId={child.id}
              childName={child.name}
              walletSummary={walletSummary}
              onTransactionComplete={() => router.refresh()}
            />
          </div>
        )}

        {/* Expected Chores - Compact */}
        <Card className="mb-3">
          <CardContent className="py-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-gold" />
                <span className="font-semibold text-text-dark">Expected Chores</span>
                <span className="text-xs text-text-light">({completedExpected}/{expectedChores.length})</span>
              </div>
              <Link
                href={`/kids/${child.id}/chores`}
                className="text-xs text-sage hover:text-sage-dark flex items-center gap-0.5"
              >
                All <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            {expectedChores.length === 0 ? (
              <p className="text-xs text-text-medium text-center py-2">No expected chores set up yet</p>
            ) : (
              <div className="space-y-1.5">
                {expectedChores.slice(0, 4).map((chore) => {
                  const template = chore.chore_template;
                  const isDone = chore.status === "done" || chore.status === "approved";
                  const isApproved = chore.status === "approved";
                  const isPending = chore.status === "pending";
                  const streak = template ? getStreakForChore(template.id) : null;

                  return (
                    <div
                      key={chore.id}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-lg transition-colors",
                        isDone ? "bg-sage-very-light" : "bg-white border border-silver-light"
                      )}
                    >
                      <div className="shrink-0">
                        {isApproved ? (
                          <CheckCircle2 className="h-4 w-4 text-sage" />
                        ) : isDone ? (
                          <Clock className="h-4 w-4 text-gold" />
                        ) : (
                          <Circle className="h-4 w-4 text-silver-light" />
                        )}
                      </div>
                      <span className="text-sm">{template?.icon || "📌"}</span>
                      <span className={cn("flex-1 text-sm truncate", isDone && "line-through text-text-light")}>
                        {template?.name || "Chore"}
                      </span>
                      {streak && streak.current_streak > 0 && (
                        <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-gold-light rounded-full">
                          <Flame className="h-2.5 w-2.5 text-gold" />
                          <span className="text-xs sm:text-[10px] font-bold text-gold-dark">{streak.current_streak}</span>
                        </div>
                      )}
                      {isPending && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMarkDone(chore.id)}
                          disabled={isMarkingDone === chore.id}
                          className="shrink-0 h-6 text-xs px-2"
                        >
                          Done
                        </Button>
                      )}
                      {chore.status === "done" && (
                        <span className="text-xs sm:text-[10px] text-gold shrink-0">Pending</span>
                      )}
                    </div>
                  );
                })}
                {expectedChores.length > 4 && (
                  <p className="text-xs text-center text-text-light">+{expectedChores.length - 4} more</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Extra Chores - Compact */}
        <Card className="mb-3">
          <CardContent className="py-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-sage" />
                <span className="font-semibold text-text-dark">Extra Chores</span>
                <span className="text-xs text-text-light">({completedExtra}/{extraChores.length})</span>
              </div>
            </div>
            {extraChores.length === 0 ? (
              <p className="text-xs text-text-medium text-center py-2">No extra chores available right now</p>
            ) : (
              <div className="space-y-1.5">
                {extraChores.slice(0, 3).map((chore) => {
                  const template = chore.chore_template;
                  const isDone = chore.status === "done" || chore.status === "approved";
                  const isApproved = chore.status === "approved";
                  const isPending = chore.status === "pending";

                  return (
                    <div
                      key={chore.id}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-lg transition-colors",
                        isDone ? "bg-sage-very-light" : "bg-white border border-silver-light"
                      )}
                    >
                      <div className="shrink-0">
                        {isApproved ? (
                          <CheckCircle2 className="h-4 w-4 text-sage" />
                        ) : isDone ? (
                          <Clock className="h-4 w-4 text-gold" />
                        ) : (
                          <Circle className="h-4 w-4 text-silver-light" />
                        )}
                      </div>
                      <span className="text-sm">{template?.icon || "📌"}</span>
                      <span className={cn("flex-1 text-sm truncate", isDone && "line-through text-text-light")}>
                        {template?.name || "Chore"}
                      </span>
                      {template?.currency_amount && (
                        <span className="text-xs font-bold text-sage">${template.currency_amount.toFixed(0)}</span>
                      )}
                      {isPending && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMarkDone(chore.id)}
                          disabled={isMarkingDone === chore.id}
                          className="shrink-0 h-6 text-xs px-2"
                        >
                          Done
                        </Button>
                      )}
                      {chore.status === "done" && (
                        <span className="text-xs sm:text-[10px] text-gold shrink-0">Pending</span>
                      )}
                    </div>
                  );
                })}
                {extraChores.length > 3 && (
                  <p className="text-xs text-center text-text-light">+{extraChores.length - 3} more</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invoice Section */}
        <Card className="mb-3">
          <CardContent className="py-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-sage" />
                <span className="font-semibold text-text-dark">My Invoice</span>
              </div>
              <Link
                href={`/kids/${child.id}/invoices`}
                className="text-xs text-sage hover:text-sage-dark flex items-center gap-0.5"
              >
                View <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            {draftInvoice && draftInvoice.item_count > 0 ? (
              <Link href={`/kids/${child.id}/invoices`}>
                <div className="flex items-center justify-between p-3 bg-sage-very-light border border-sage rounded-lg hover:shadow-sm transition-shadow cursor-pointer">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-sage rounded-full">
                      <Receipt className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-dark">Invoice Ready</p>
                      <p className="text-xs text-text-medium">
                        {draftInvoice.item_count} item{draftInvoice.item_count !== 1 ? "s" : ""} • ${draftInvoice.total_amount.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <Button size="sm" className="bg-sage hover:bg-sage-dark h-7 text-xs">
                    Submit
                  </Button>
                </div>
              </Link>
            ) : (
              <div className="text-center py-4">
                <div className="p-2 bg-silver-very-light rounded-full w-10 h-10 mx-auto mb-2 flex items-center justify-center">
                  <Receipt className="h-5 w-5 text-silver" />
                </div>
                <p className="text-sm text-text-medium">No items on your invoice yet</p>
                <p className="text-xs text-text-light mt-1">Complete extra chores to earn money!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Note: Achievements section removed - streaks are shown inline with chores */}
      </div>
    </div>
  );
}
