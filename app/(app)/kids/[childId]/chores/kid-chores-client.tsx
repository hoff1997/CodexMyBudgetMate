"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/cn";
import {
  CheckCircle2,
  Circle,
  AlertCircle,
  DollarSign,
  Loader2,
  ArrowLeft,
  Clock,
  Flame,
} from "lucide-react";
import Link from "next/link";
import { ChoreCompletionDialog } from "@/components/kids/chores";
import { RemyHelpButton } from "@/components/shared/remy-help-button";

interface ChildProfile {
  id: string;
  name: string;
  avatar_url: string | null;
  // Legacy fields - kept for backwards compatibility but not used
  star_balance?: number;
  screen_time_balance?: number;
}

interface ChoreTemplate {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  estimated_minutes: number | null;
  is_expected: boolean | null;
  requires_photo: boolean | null;
  currency_type: string | null;
  currency_amount: number | null;
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

const HELP_CONTENT = {
  tips: [
    "Check your chores each morning to plan your day",
    "Complete expected chores daily to build your streak",
    "Extra chores add to your invoice - submit it to get paid!",
  ],
  features: [
    "Expected chores build streaks and are part of your pocket money",
    "Extra chores can be invoiced for real money",
    "Track your weekly progress at a glance",
    "Submit your invoice when ready to get paid",
  ],
  faqs: [
    {
      question: "What's the difference between Expected and Extra chores?",
      answer: "Expected chores are part of your regular pocket money - do them to build your streak! Extra chores earn you additional money that you add to your invoice.",
    },
    {
      question: "How do I get paid for Extra chores?",
      answer: "Complete the chore, add photo proof if needed, then add it to your invoice. When you submit your invoice, your parent will pay you!",
    },
    {
      question: "What are streaks?",
      answer: "Streaks track how many days in a row you've completed your expected chores. Keep your streak going to build great habits!",
    },
  ],
};

interface KidChoresClientProps {
  child: ChildProfile;
  chores: ChoreAssignment[];
  weekStarting: string;
}

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function KidChoresClient({
  child,
  chores,
  weekStarting,
}: KidChoresClientProps) {
  const router = useRouter();
  const [markingDone, setMarkingDone] = useState<string | null>(null);
  const [completionDialogOpen, setCompletionDialogOpen] = useState(false);
  const [selectedChore, setSelectedChore] = useState<ChoreAssignment | null>(null);

  // Calculate stats
  const stats = useMemo(() => {
    const total = chores.length;
    const pending = chores.filter((c) => c.status === "pending").length;
    // Include both "done" (old flow) and "pending_approval" (kid flow) as waiting for approval
    const done = chores.filter((c) => c.status === "done" || c.status === "pending_approval").length;
    const approved = chores.filter((c) => c.status === "approved").length;
    const completed = done + approved;

    // Calculate potential money from Extra chores (only money currency now)
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

  const handleOpenCompletionDialog = (chore: ChoreAssignment) => {
    setSelectedChore(chore);
    setCompletionDialogOpen(true);
  };

  const handleChoreCompleted = () => {
    router.refresh();
  };

  const handleQuickComplete = async (choreId: string) => {
    setMarkingDone(choreId);
    try {
      // Use the kid-specific endpoint which sets status to "pending_approval"
      // This ensures proper approval workflow
      const res = await fetch(`/api/kids/${child.id}/chores/${choreId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
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
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
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
          <RemyHelpButton title="Chores" content={HELP_CONTENT} />
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

            {/* Potential Earnings from Extra Chores */}
            {stats.potentialMoney > 0 && (
              <div className="flex items-center gap-2 text-sm text-sage">
                <DollarSign className="h-4 w-4" />
                <span className="font-medium">${stats.potentialMoney.toFixed(2)} to earn from Extra chores</span>
              </div>
            )}
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
                        onMarkDone={(c) => handleOpenCompletionDialog(c)}
                        onQuickComplete={handleQuickComplete}
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
                        onMarkDone={(c) => handleOpenCompletionDialog(c)}
                        onQuickComplete={handleQuickComplete}
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
                          onMarkDone={(c) => handleOpenCompletionDialog(c)}
                          onQuickComplete={handleQuickComplete}
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

      {/* Chore Completion Dialog */}
      {selectedChore && (
        <ChoreCompletionDialog
          open={completionDialogOpen}
          onOpenChange={setCompletionDialogOpen}
          childId={child.id}
          assignmentId={selectedChore.id}
          choreName={selectedChore.chore_template?.name || "Chore"}
          choreIcon={selectedChore.chore_template?.icon || "📋"}
          requiresPhoto={selectedChore.chore_template?.requires_photo || false}
          onCompleted={handleChoreCompleted}
        />
      )}
    </div>
  );
}

function ChoreItem({
  chore,
  onMarkDone,
  onQuickComplete,
  isMarking,
}: {
  chore: ChoreAssignment;
  onMarkDone: (chore: ChoreAssignment) => void;
  onQuickComplete: (id: string) => void;
  isMarking: boolean;
}) {
  const template = chore.chore_template;
  // Use is_expected from template as authoritative source
  const isExpectedChore = template?.is_expected === true;
  const isExtraChore = !isExpectedChore && chore.currency_type === "money" && chore.currency_amount > 0;

  const isPending = chore.status === "pending";
  // "done" is from old parent flow, "pending_approval" is from kid flow - treat both as waiting for approval
  const isDone = chore.status === "done" || chore.status === "pending_approval";
  const isApproved = chore.status === "approved";
  const hasRejection = !!chore.rejection_reason;
  // Get requires_photo from the template (that's where it's stored in the database)
  const needsPhoto = template?.requires_photo || false;

  const handleComplete = () => {
    if (needsPhoto) {
      // Open dialog for photo upload
      onMarkDone(chore);
    } else {
      // Quick complete without dialog
      onQuickComplete(chore.id);
    }
  };

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
          {/* Chore type badge */}
          {isExpectedChore && (
            <span className="text-xs bg-sage-very-light text-sage-dark px-1.5 py-0.5 rounded">
              Expected
            </span>
          )}
          {isExtraChore && (
            <span className="text-xs bg-gold-light text-gold-dark px-1.5 py-0.5 rounded">
              Extra
            </span>
          )}
          {needsPhoto && isPending && (
            <span className="text-xs bg-blue-light text-blue px-1.5 py-0.5 rounded">
              📷 Photo
            </span>
          )}
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

      {/* Reward - only show for Extra chores with money */}
      {isExtraChore && (
        <div className="shrink-0 flex items-center gap-1 text-sage">
          <DollarSign className="h-4 w-4" />
          <span className="font-bold">${chore.currency_amount.toFixed(2)}</span>
        </div>
      )}

      {/* Streak indicator for Expected chores */}
      {isExpectedChore && !isApproved && (
        <div className="shrink-0 flex items-center gap-1 text-gold">
          <Flame className="h-4 w-4" />
        </div>
      )}

      {/* Action */}
      {isPending && (
        <Button
          size="sm"
          onClick={handleComplete}
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
