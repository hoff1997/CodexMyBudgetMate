"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/cn";
import {
  Star,
  Clock,
  CheckCircle2,
  Circle,
  Trophy,
  Wallet,
  PiggyBank,
  TrendingUp,
  Heart,
  ShoppingBag,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

interface ChildProfile {
  id: string;
  name: string;
  avatar_url: string | null;
  star_balance: number;
  screen_time_balance: number;
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
  currency_type: string;
  currency_amount: number;
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

interface KidDashboardClientProps {
  child: ChildProfile;
  accounts: BankAccount[];
  chores: ChoreAssignment[];
  achievements: Achievement[];
}

const ENVELOPE_ICONS = {
  spend: { icon: Wallet, color: "text-blue", bg: "bg-blue-light" },
  save: { icon: PiggyBank, color: "text-sage", bg: "bg-sage-very-light" },
  invest: { icon: TrendingUp, color: "text-gold", bg: "bg-gold-light" },
  give: { icon: Heart, color: "text-pink-500", bg: "bg-pink-50" },
};

export function KidDashboardClient({
  child,
  accounts,
  chores,
  achievements,
}: KidDashboardClientProps) {
  const router = useRouter();
  const [isMarkingDone, setIsMarkingDone] = useState<string | null>(null);

  const completedChores = chores.filter((c) => c.status === "done" || c.status === "approved").length;
  const totalChores = chores.length;
  const progressPercent = totalChores > 0 ? (completedChores / totalChores) * 100 : 0;

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
      <div className="w-full max-w-4xl mx-auto px-4 py-6">
        {/* Header with Avatar and Stats */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-20 h-20 rounded-full bg-sage-light flex items-center justify-center text-4xl border-4 border-sage">
            {child.avatar_url ? (
              <img
                src={child.avatar_url}
                alt={child.name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              "👤"
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-text-dark">Hi {child.name}! 👋</h1>
            <p className="text-text-medium">Ready to earn some stars today?</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Link href={`/kids/${child.id}/shop`}>
            <Card className="bg-gold-light border-gold hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="py-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Star className="h-5 w-5 text-gold" />
                  <span className="text-sm font-medium text-gold-dark">Stars</span>
                </div>
                <p className="text-3xl font-bold text-gold-dark">{child.star_balance}</p>
                <p className="text-xs text-gold-dark mt-1 flex items-center justify-center gap-1">
                  <ShoppingBag className="h-3 w-3" /> Shop
                </p>
              </CardContent>
            </Card>
          </Link>
          <Card className="bg-blue-light border-blue">
            <CardContent className="py-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Clock className="h-5 w-5 text-blue" />
                <span className="text-sm font-medium text-blue">Screen Time</span>
              </div>
              <p className="text-3xl font-bold text-blue">{child.screen_time_balance}m</p>
            </CardContent>
          </Card>
        </div>

        {/* Money Envelopes */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="text-2xl">💰</span>
                My Money
              </CardTitle>
              <Link
                href={`/kids/${child.id}/money`}
                className="text-sm text-sage hover:text-sage-dark flex items-center gap-1"
              >
                View All <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {accounts.map((account) => {
                const config = ENVELOPE_ICONS[account.envelope_type as keyof typeof ENVELOPE_ICONS];
                const Icon = config?.icon || Wallet;
                return (
                  <div
                    key={account.id}
                    className={cn("p-3 rounded-lg", config?.bg || "bg-silver-very-light")}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={cn("h-4 w-4", config?.color || "text-text-medium")} />
                      <span className="text-xs font-medium text-text-medium capitalize">
                        {account.envelope_type}
                      </span>
                    </div>
                    <p className={cn("text-xl font-bold", config?.color || "text-text-dark")}>
                      ${account.current_balance.toFixed(2)}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* This Week's Chores */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="text-2xl">📋</span>
                This Week's Chores
              </CardTitle>
              <div className="flex items-center gap-3">
                <span className="text-sm text-text-medium">
                  {completedChores}/{totalChores} done
                </span>
                <Link
                  href={`/kids/${child.id}/chores`}
                  className="text-sm text-sage hover:text-sage-dark flex items-center gap-1"
                >
                  All <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
            <Progress value={progressPercent} className="mt-2 h-2" />
          </CardHeader>
          <CardContent>
            {chores.length === 0 ? (
              <div className="text-center py-6 text-text-medium">
                <span className="text-4xl mb-2 block">🎉</span>
                No chores this week! Enjoy your free time.
              </div>
            ) : (
              <div className="space-y-2">
                {chores.map((chore) => {
                  const template = chore.chore_template;
                  const isDone = chore.status === "done" || chore.status === "approved";
                  const isApproved = chore.status === "approved";
                  const isPending = chore.status === "pending";

                  return (
                    <div
                      key={chore.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg transition-colors",
                        isDone ? "bg-sage-very-light" : "bg-white border border-silver-light"
                      )}
                    >
                      {/* Status Icon */}
                      <div className="shrink-0">
                        {isApproved ? (
                          <CheckCircle2 className="h-6 w-6 text-sage" />
                        ) : isDone ? (
                          <Clock className="h-6 w-6 text-gold" />
                        ) : (
                          <Circle className="h-6 w-6 text-silver-light" />
                        )}
                      </div>

                      {/* Chore Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{template?.icon || "📌"}</span>
                          <span
                            className={cn(
                              "font-medium",
                              isDone ? "text-text-medium line-through" : "text-text-dark"
                            )}
                          >
                            {template?.name || "Unknown Chore"}
                          </span>
                        </div>
                        {template?.description && (
                          <p className="text-xs text-text-light truncate">
                            {template.description}
                          </p>
                        )}
                      </div>

                      {/* Reward */}
                      <div className="shrink-0 text-right">
                        {template?.currency_type === "stars" && (
                          <div className="flex items-center gap-1 text-gold">
                            <Star className="h-4 w-4" />
                            <span className="font-bold">{template.currency_amount}</span>
                          </div>
                        )}
                        {template?.currency_type === "screen_time" && (
                          <div className="flex items-center gap-1 text-blue">
                            <Clock className="h-4 w-4" />
                            <span className="font-bold">{template.currency_amount}m</span>
                          </div>
                        )}
                        {template?.currency_type === "money" && (
                          <div className="text-sage font-bold">
                            ${template.currency_amount}
                          </div>
                        )}
                      </div>

                      {/* Action Button */}
                      {isPending && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMarkDone(chore.id)}
                          disabled={isMarkingDone === chore.id}
                          className="shrink-0"
                        >
                          {isMarkingDone === chore.id ? "..." : "Done!"}
                        </Button>
                      )}
                      {chore.status === "done" && (
                        <span className="text-xs text-gold shrink-0">Waiting approval</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Achievements */}
        {achievements.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="h-5 w-5 text-gold" />
                Recent Achievements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {achievements.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-3 p-2 bg-gold-light rounded-lg"
                  >
                    <span className="text-2xl">{a.achievement?.icon || "🏆"}</span>
                    <div className="flex-1">
                      <p className="font-medium text-text-dark">{a.achievement?.name}</p>
                      <p className="text-xs text-text-medium">{a.achievement?.description}</p>
                    </div>
                    <div className="flex items-center gap-1 text-gold">
                      <Star className="h-4 w-4" />
                      <span className="font-bold">+{a.achievement?.bonus_stars}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
