"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/cn";
import {
  Star,
  Clock,
  CheckCircle2,
  Circle,
  AlertCircle,
  DollarSign,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

interface ChildProfile {
  id: string;
  name: string;
  avatar_url: string | null;
  star_balance: number;
  screen_time_balance: number;
}

interface ChoreTemplate {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  estimated_minutes: number | null;
}

interface ChoreAssignment {
  id: string;
  status: string;
  day_of_week: number | null;
  currency_type: string;
  currency_amount: number;
  marked_done_at: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  chore_template: ChoreTemplate | null;
}

interface KidChoresClientProps {
  child: ChildProfile;
  chores: ChoreAssignment[];
  weekStarting: string;
}

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const CURRENCY_ICONS = {
  stars: { icon: Star, color: "text-gold", label: "stars" },
  screen_time: { icon: Clock, color: "text-blue", label: "min" },
  money: { icon: DollarSign, color: "text-sage", label: "" },
};

export function KidChoresClient({
  child,
  chores,
  weekStarting,
}: KidChoresClientProps) {
  const router = useRouter();
  const [markingDone, setMarkingDone] = useState<string | null>(null);

  // Calculate stats
  const stats = useMemo(() => {
    const total = chores.length;
    const pending = chores.filter((c) => c.status === "pending").length;
    const done = chores.filter((c) => c.status === "done").length;
    const approved = chores.filter((c) => c.status === "approved").length;
    const completed = done + approved;

    // Calculate potential rewards
    const potentialStars = chores
      .filter((c) => c.currency_type === "stars" && c.status !== "approved")
      .reduce((sum, c) => sum + c.currency_amount, 0);
    const potentialScreenTime = chores
      .filter((c) => c.currency_type === "screen_time" && c.status !== "approved")
      .reduce((sum, c) => sum + c.currency_amount, 0);
    const potentialMoney = chores
      .filter((c) => c.currency_type === "money" && c.status !== "approved")
      .reduce((sum, c) => sum + c.currency_amount, 0);

    return {
      total,
      pending,
      done,
      approved,
      completed,
      progressPercent: total > 0 ? (completed / total) * 100 : 0,
      potentialStars,
      potentialScreenTime,
      potentialMoney,
    };
  }, [chores]);

  // Group chores by day
  const choresByDay = useMemo(() => {
    const grouped: Record<string, ChoreAssignment[]> = {
      anytime: [],
    };

    for (let i = 0; i < 7; i++) {
      grouped[i.toString()] = [];
    }

    for (const chore of chores) {
      if (chore.day_of_week === null) {
        grouped.anytime.push(chore);
      } else {
        grouped[chore.day_of_week.toString()].push(chore);
      }
    }

    return grouped;
  }, [chores]);

  const handleMarkDone = async (choreId: string) => {
    setMarkingDone(choreId);
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
      setMarkingDone(null);
    }
  };

  // Get current day index (0 = Monday, 6 = Sunday)
  const today = new Date();
  const currentDayIndex = today.getDay() === 0 ? 6 : today.getDay() - 1;

  return (
    <div className="min-h-screen bg-gradient-to-b from-sage-very-light to-white">
      <div className="w-full max-w-2xl mx-auto px-4 py-6">
        {/* Back Navigation */}
        <Link
          href={`/kids/${child.id}/dashboard`}
          className="inline-flex items-center gap-2 text-text-medium hover:text-text-dark mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-sage-light flex items-center justify-center text-3xl border-4 border-sage">
            {child.avatar_url ? (
              <Image
                src={child.avatar_url}
                alt={child.name}
                width={64}
                height={64}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              "👤"
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-dark">
              {child.name}'s Chores
            </h1>
            <p className="text-text-medium">This week's tasks</p>
          </div>
        </div>

        {/* Progress Card */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-text-dark">Weekly Progress</span>
              <span className="text-sm text-text-medium">
                {stats.completed}/{stats.total} completed
              </span>
            </div>
            <Progress value={stats.progressPercent} className="h-3 mb-4" />

            {/* Potential Rewards */}
            <div className="flex flex-wrap gap-4 text-sm">
              {stats.potentialStars > 0 && (
                <div className="flex items-center gap-1 text-gold">
                  <Star className="h-4 w-4" />
                  <span>{stats.potentialStars} stars to earn</span>
                </div>
              )}
              {stats.potentialScreenTime > 0 && (
                <div className="flex items-center gap-1 text-blue">
                  <Clock className="h-4 w-4" />
                  <span>{stats.potentialScreenTime}m screen time to earn</span>
                </div>
              )}
              {stats.potentialMoney > 0 && (
                <div className="flex items-center gap-1 text-sage">
                  <DollarSign className="h-4 w-4" />
                  <span>${stats.potentialMoney.toFixed(2)} to earn</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Chores by Day */}
        {chores.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-xl font-bold text-text-dark mb-2">
                No chores this week!
              </h2>
              <p className="text-text-medium">Enjoy your free time!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Today's Chores First */}
            {choresByDay[currentDayIndex.toString()].length > 0 && (
              <Card className="border-sage">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className="text-xl">📅</span>
                    Today ({DAYS_OF_WEEK[currentDayIndex]})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {choresByDay[currentDayIndex.toString()].map((chore) => (
                      <ChoreItem
                        key={chore.id}
                        chore={chore}
                        onMarkDone={handleMarkDone}
                        isMarking={markingDone === chore.id}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Anytime Chores */}
            {choresByDay.anytime.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className="text-xl">⭐</span>
                    Anytime This Week
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {choresByDay.anytime.map((chore) => (
                      <ChoreItem
                        key={chore.id}
                        chore={chore}
                        onMarkDone={handleMarkDone}
                        isMarking={markingDone === chore.id}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Other Days */}
            {DAYS_OF_WEEK.map((dayName, index) => {
              if (index === currentDayIndex) return null; // Skip today
              const dayChores = choresByDay[index.toString()];
              if (dayChores.length === 0) return null;

              const isPast = index < currentDayIndex;

              return (
                <Card key={index} className={isPast ? "opacity-75" : ""}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {isPast ? "✓" : "📆"} {dayName}
                      {isPast && (
                        <span className="text-xs text-text-light font-normal">
                          (Past)
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {dayChores.map((chore) => (
                        <ChoreItem
                          key={chore.id}
                          chore={chore}
                          onMarkDone={handleMarkDone}
                          isMarking={markingDone === chore.id}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ChoreItem({
  chore,
  onMarkDone,
  isMarking,
}: {
  chore: ChoreAssignment;
  onMarkDone: (id: string) => void;
  isMarking: boolean;
}) {
  const template = chore.chore_template;
  const currency = CURRENCY_ICONS[chore.currency_type as keyof typeof CURRENCY_ICONS];
  const CurrencyIcon = currency?.icon || Star;

  const isPending = chore.status === "pending";
  const isDone = chore.status === "done";
  const isApproved = chore.status === "approved";
  const hasRejection = !!chore.rejection_reason;

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg transition-colors",
        isApproved
          ? "bg-sage-very-light"
          : isDone
          ? "bg-gold-light"
          : hasRejection
          ? "bg-red-50 border border-red-200"
          : "bg-white border border-silver-light"
      )}
    >
      {/* Status Icon */}
      <div className="shrink-0">
        {isApproved ? (
          <CheckCircle2 className="h-6 w-6 text-sage" />
        ) : isDone ? (
          <Clock className="h-6 w-6 text-gold" />
        ) : hasRejection ? (
          <AlertCircle className="h-6 w-6 text-red-500" />
        ) : (
          <Circle className="h-6 w-6 text-silver-light" />
        )}
      </div>

      {/* Chore Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xl">{template?.icon || "📋"}</span>
          <span
            className={cn(
              "font-medium",
              isApproved ? "text-text-medium line-through" : "text-text-dark"
            )}
          >
            {template?.name || "Unknown Chore"}
          </span>
        </div>
        {template?.description && (
          <p className="text-xs text-text-light mt-0.5">{template.description}</p>
        )}
        {hasRejection && (
          <p className="text-xs text-red-600 mt-1">
            Needs redo: {chore.rejection_reason}
          </p>
        )}
      </div>

      {/* Reward */}
      <div className={cn("shrink-0 flex items-center gap-1", currency?.color)}>
        <CurrencyIcon className="h-4 w-4" />
        <span className="font-bold">
          {chore.currency_type === "money" && "$"}
          {chore.currency_amount}
          {currency?.label && chore.currency_type !== "money" && (
            <span className="text-xs font-normal ml-0.5">{currency.label}</span>
          )}
        </span>
      </div>

      {/* Action */}
      {isPending && (
        <Button
          size="sm"
          onClick={() => onMarkDone(chore.id)}
          disabled={isMarking}
          className="shrink-0"
        >
          {isMarking ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Done!"
          )}
        </Button>
      )}
      {isDone && (
        <span className="text-xs text-gold shrink-0 font-medium">
          Waiting approval
        </span>
      )}
      {isApproved && (
        <span className="text-xs text-sage shrink-0 font-medium">Approved!</span>
      )}
    </div>
  );
}
