"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Target, TrendingUp } from "lucide-react";
import { TeenGoalCard } from "./teen-goal-card";
import { CreateGoalDialog } from "./create-goal-dialog";
import { TransferGoalDialog } from "./transfer-goal-dialog";
import { useToast } from "@/lib/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TeenGoal {
  id: string;
  name: string;
  description?: string | null;
  target_amount?: number | null;
  current_amount: number;
  allocation_percentage: number;
  icon: string;
  color: string;
}

interface TeenGoalsWidgetProps {
  childId: string;
  childName: string;
}

export function TeenGoalsWidget({ childId, childName }: TeenGoalsWidgetProps) {
  const { toast } = useToast();
  const [goals, setGoals] = useState<TeenGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalAllocatedPercentage, setTotalAllocatedPercentage] = useState(0);
  const [savingsBalance, setSavingsBalance] = useState(0);

  const [createOpen, setCreateOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<TeenGoal | null>(null);
  const [deleteGoalId, setDeleteGoalId] = useState<string | null>(null);

  const fetchGoals = async () => {
    try {
      const response = await fetch(`/api/kids/${childId}/goals`);
      if (!response.ok) throw new Error("Failed to fetch goals");

      const data = await response.json();
      setGoals(data.goals || []);
      setTotalAllocatedPercentage(data.totalAllocatedPercentage || 0);
      setSavingsBalance(data.savingsAccountBalance || 0);
    } catch (error) {
      console.error("Error fetching goals:", error);
      toast({
        title: "Error",
        description: "Failed to load savings goals",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, [childId]);

  const handleTransfer = (goal: TeenGoal) => {
    setSelectedGoal(goal);
    setTransferOpen(true);
  };

  const handleEdit = (goal: TeenGoal) => {
    // For now, just show a toast - edit dialog can be added later
    toast({
      title: "Coming soon",
      description: "Goal editing will be available soon",
    });
  };

  const handleDelete = async () => {
    if (!deleteGoalId) return;

    try {
      const response = await fetch(
        `/api/kids/${childId}/goals/${deleteGoalId}?redistribute=true`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete goal");
      }

      toast({
        title: "Goal deleted",
        description: "The goal has been deleted and balance redistributed",
      });

      fetchGoals();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete goal",
        variant: "destructive",
      });
    } finally {
      setDeleteGoalId(null);
    }
  };

  const availablePercentage = 100 - totalAllocatedPercentage;
  const totalGoalBalance = goals.reduce((sum, g) => sum + g.current_amount, 0);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/3" />
            <div className="h-20 bg-gray-200 rounded" />
            <div className="h-20 bg-gray-200 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-sage" />
              Savings Goals
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {childName}&apos;s savings distributed across goals
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add Goal
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-lg font-bold text-text-dark">
                ${savingsBalance.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground">Bank Balance</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-sage">
                ${totalGoalBalance.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground">In Goals</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-text-dark">
                {totalAllocatedPercentage}%
              </div>
              <div className="text-xs text-muted-foreground">Allocated</div>
            </div>
          </div>

          {/* Allocation Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Interest Allocation</span>
              <span>{availablePercentage}% unallocated</span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden flex">
              {goals.map((goal, idx) => (
                <div
                  key={goal.id}
                  className={`h-full ${
                    goal.color === "sage"
                      ? "bg-sage"
                      : goal.color === "blue"
                      ? "bg-blue"
                      : goal.color === "gold"
                      ? "bg-gold"
                      : goal.color === "purple"
                      ? "bg-purple-500"
                      : goal.color === "pink"
                      ? "bg-pink-500"
                      : "bg-green-500"
                  }`}
                  style={{ width: `${goal.allocation_percentage}%` }}
                  title={`${goal.name}: ${goal.allocation_percentage}%`}
                />
              ))}
            </div>
          </div>

          {/* Goals List */}
          {goals.length === 0 ? (
            <div className="text-center py-8">
              <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <h3 className="font-medium text-text-dark">No savings goals yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create goals to help {childName} save for what matters
              </p>
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Create First Goal
              </Button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {goals.map((goal) => (
                <TeenGoalCard
                  key={goal.id}
                  goal={goal}
                  onEdit={handleEdit}
                  onDelete={(id) => setDeleteGoalId(id)}
                  onTransfer={handleTransfer}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Goal Dialog */}
      <CreateGoalDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        childId={childId}
        availablePercentage={availablePercentage}
        onSuccess={fetchGoals}
      />

      {/* Transfer Dialog */}
      {selectedGoal && (
        <TransferGoalDialog
          open={transferOpen}
          onOpenChange={setTransferOpen}
          childId={childId}
          fromGoal={selectedGoal}
          availableGoals={goals.filter((g) => g.id !== selectedGoal.id)}
          onSuccess={fetchGoals}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteGoalId} onOpenChange={() => setDeleteGoalId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Goal?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the goal and redistribute its balance to other goals
              proportionally. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
