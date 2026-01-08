"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Plus, Target, Wallet, ArrowRight, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  CreateGoalDialog,
  TransferGoalDialog,
} from "@/components/kids/goals";
import { RemyHelpButton } from "@/components/shared/remy-help-button";
import { toast } from "sonner";

interface SavingsGoal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  icon: string | null;
  deadline: string | null;
  notes: string | null;
  status: string;
  created_at: string;
}

interface BankAccount {
  id: string;
  envelope_type: string;
  account_name: string;
  current_balance: number;
  is_virtual: boolean;
}

interface ChildProfile {
  id: string;
  name: string;
  avatar_url: string | null;
  avatar_emoji: string | null;
  star_balance: number;
}

interface KidGoalsClientProps {
  child: ChildProfile;
  goals: SavingsGoal[];
  accounts: BankAccount[];
}

const HELP_CONTENT = {
  tips: [
    "Set a realistic deadline based on how much you can save each week",
    "Add money to your goals regularly, even small amounts help",
    "Celebrate when you reach 25%, 50%, and 75% of your goal",
  ],
  features: [
    "Create multiple savings goals for different things you want",
    "Transfer money from your Save envelope to any goal",
    "Track your progress with visual progress bars",
    "Set deadlines to stay on track",
  ],
  faqs: [
    {
      question: "Where does goal money come from?",
      answer: "Money for goals comes from your Save envelope. Ask your parent to allocate money to Save when you do chores or receive allowance.",
    },
    {
      question: "Can I have multiple goals?",
      answer: "Yes! You can create as many goals as you want and save for different things at the same time.",
    },
    {
      question: "What happens when I reach my goal?",
      answer: "Congrats! You can mark the goal as complete. Talk to your parent about using the money for your purchase.",
    },
  ],
};

export function KidGoalsClient({ child, goals, accounts }: KidGoalsClientProps) {
  const router = useRouter();
  const [localGoals, setLocalGoals] = useState(goals);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);
  const [deletingGoal, setDeletingGoal] = useState<string | null>(null);

  const saveAccount = accounts.find((a) => a.envelope_type === "save");
  const totalSaved = localGoals.reduce((sum, g) => sum + g.current_amount, 0);
  const totalTarget = localGoals.reduce((sum, g) => sum + g.target_amount, 0);
  const overallProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

  const handleGoalCreated = (newGoal: SavingsGoal) => {
    setLocalGoals((prev) => [newGoal, ...prev]);
  };

  const handleTransfer = (goalId: string) => {
    const goal = localGoals.find((g) => g.id === goalId);
    if (goal) {
      setSelectedGoal(goal);
      setShowTransferDialog(true);
    }
  };

  const handleTransferComplete = (goalId: string, newAmount: number) => {
    setLocalGoals((prev) =>
      prev.map((g) => (g.id === goalId ? { ...g, current_amount: newAmount } : g))
    );
    router.refresh();
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!confirm("Are you sure you want to delete this goal? Any saved money will return to your Save envelope.")) {
      return;
    }

    setDeletingGoal(goalId);
    try {
      const res = await fetch(`/api/kids/${child.id}/goals/${goalId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete goal");
      }

      setLocalGoals((prev) => prev.filter((g) => g.id !== goalId));
      toast.success("Goal deleted");
      router.refresh();
    } catch (error) {
      toast.error("Failed to delete goal");
    } finally {
      setDeletingGoal(null);
    }
  };

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
                child.avatar_emoji || "👤"
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-dark">
                {child.name}'s Goals
              </h1>
              <p className="text-text-medium">Saving for what matters</p>
            </div>
          </div>
          <RemyHelpButton
            title="Savings Goals"
            content={HELP_CONTENT}
          />
        </div>

        {/* Save Account Balance */}
        {saveAccount && (
          <Card className="mb-6 bg-sage-very-light border-sage-light">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-sage-light flex items-center justify-center">
                    <Wallet className="h-5 w-5 text-sage-dark" />
                  </div>
                  <div>
                    <p className="text-sm text-text-medium">Available to Save</p>
                    <p className="text-xl font-bold text-sage-dark">
                      ${saveAccount.current_balance.toFixed(2)}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => setShowCreateDialog(true)}
                  className="bg-sage hover:bg-sage-dark"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Goal
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Overall Progress */}
        {localGoals.length > 0 && (
          <Card className="mb-6">
            <CardContent className="py-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-text-dark">Overall Progress</span>
                <span className="text-sm text-text-medium">
                  ${totalSaved.toFixed(2)} / ${totalTarget.toFixed(2)}
                </span>
              </div>
              <Progress value={overallProgress} className="h-2" />
            </CardContent>
          </Card>
        )}

        {/* Goals List */}
        {localGoals.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Target className="h-16 w-16 text-sage-light mx-auto mb-4" />
              <h2 className="text-xl font-bold text-text-dark mb-2">
                No Goals Yet
              </h2>
              <p className="text-text-medium mb-6">
                Start saving for something special!
              </p>
              <Button
                onClick={() => setShowCreateDialog(true)}
                className="bg-sage hover:bg-sage-dark"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Goal
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {localGoals.map((goal) => {
              const progress = goal.target_amount > 0
                ? (goal.current_amount / goal.target_amount) * 100
                : 0;
              const isComplete = progress >= 100;
              const remaining = goal.target_amount - goal.current_amount;

              return (
                <Card
                  key={goal.id}
                  className={cn(
                    "transition-all",
                    isComplete && "border-sage bg-sage-very-light/50"
                  )}
                >
                  <CardContent className="py-4">
                    <div className="flex items-start gap-3 mb-3">
                      <span className="text-3xl">{goal.icon || "🎯"}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-text-dark truncate">
                            {goal.name}
                          </h3>
                          <div className="flex items-center gap-1">
                            {!isComplete && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleTransfer(goal.id)}
                                className="text-sage hover:text-sage-dark"
                              >
                                <ArrowRight className="h-4 w-4 mr-1" />
                                Add
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteGoal(goal.id)}
                              disabled={deletingGoal === goal.id}
                              className="text-text-light hover:text-red-500"
                            >
                              {deletingGoal === goal.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                        {goal.notes && (
                          <p className="text-sm text-text-light mt-0.5 line-clamp-1">
                            {goal.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-text-medium">
                          ${goal.current_amount.toFixed(2)} of ${goal.target_amount.toFixed(2)}
                        </span>
                        <span className={cn(
                          "font-medium",
                          isComplete ? "text-sage" : "text-text-dark"
                        )}>
                          {Math.round(progress)}%
                        </span>
                      </div>
                      <Progress
                        value={Math.min(progress, 100)}
                        className={cn("h-3", isComplete && "[&>div]:bg-sage")}
                      />
                      {!isComplete && remaining > 0 && (
                        <p className="text-xs text-text-light">
                          ${remaining.toFixed(2)} to go
                        </p>
                      )}
                      {isComplete && (
                        <p className="text-sm text-sage font-medium">
                          Goal reached! You did it!
                        </p>
                      )}
                    </div>

                    {goal.deadline && (
                      <div className="mt-3 pt-3 border-t border-silver-light">
                        <p className="text-xs text-text-light">
                          Target date: {new Date(goal.deadline).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <CreateGoalDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        childId={child.id}
        onCreated={handleGoalCreated}
      />

      {selectedGoal && saveAccount && (
        <TransferGoalDialog
          open={showTransferDialog}
          onOpenChange={setShowTransferDialog}
          childId={child.id}
          goal={selectedGoal}
          availableBalance={saveAccount.current_balance}
          onTransferred={(newAmount) => handleTransferComplete(selectedGoal.id, newAmount)}
        />
      )}
    </div>
  );
}
