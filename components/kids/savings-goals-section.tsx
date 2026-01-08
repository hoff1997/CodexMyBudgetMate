"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Plus,
  Target,
  PiggyBank,
  ArrowRight,
  ArrowDown,
  Loader2,
  Trash2,
  Pencil,
  ExternalLink,
  FileText,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/cn";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface SavingsGoal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  icon: string | null;
  description: string | null;
  status: string;
}

interface BankAccount {
  id: string;
  envelope_type: string;
  account_name: string;
  current_balance: number;
}

interface SavingsGoalsSectionProps {
  childId: string;
  childName: string;
  goals: SavingsGoal[];
  saveAccount: BankAccount | null;
}

const ICONS = ["🎯", "💰", "🎮", "📱", "✈️", "🚗", "🎸", "📚", "👟", "🎁"];

export function SavingsGoalsSection({
  childId,
  childName,
  goals: initialGoals,
  saveAccount,
}: SavingsGoalsSectionProps) {
  const router = useRouter();
  const [goals, setGoals] = useState(initialGoals);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAddFundsDialog, setShowAddFundsDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingGoalId, setDeletingGoalId] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(true); // Default collapsed on mobile

  // Create form state
  const [newGoalName, setNewGoalName] = useState("");
  const [newGoalTarget, setNewGoalTarget] = useState("");
  const [newGoalIcon, setNewGoalIcon] = useState("🎯");
  const [newGoalDescription, setNewGoalDescription] = useState("");

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editTarget, setEditTarget] = useState("");
  const [editIcon, setEditIcon] = useState("🎯");
  const [editDescription, setEditDescription] = useState("");

  // Add funds form state
  const [addAmount, setAddAmount] = useState("");

  const totalSaved = goals.reduce((sum, g) => sum + g.current_amount, 0);
  const totalTarget = goals.reduce((sum, g) => sum + g.target_amount, 0);
  const saveBalance = saveAccount?.current_balance || 0;

  // Available = Save balance minus what's already allocated to goals
  const availableToAllocate = Math.max(0, saveBalance - totalSaved);

  const resetCreateForm = () => {
    setNewGoalName("");
    setNewGoalTarget("");
    setNewGoalIcon("🎯");
    setNewGoalDescription("");
  };

  const openEditDialog = (goal: SavingsGoal) => {
    setSelectedGoal(goal);
    setEditName(goal.name);
    setEditTarget(goal.target_amount?.toString() || "");
    setEditIcon(goal.icon || "🎯");
    setEditDescription(goal.description || "");
    setShowEditDialog(true);
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalName.trim()) {
      toast.error("Please enter a goal name");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/kids/${childId}/goals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newGoalName.trim(),
          target_amount: newGoalTarget ? parseFloat(newGoalTarget) : 0,
          icon: newGoalIcon,
          description: newGoalDescription.trim() || null,
          allocation_percentage: 0,
          color: "sage",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create goal");
      }

      const data = await res.json();
      setGoals((prev) => [...prev, data.goal]);
      toast.success(`Goal "${newGoalName}" created!`);
      resetCreateForm();
      setShowCreateDialog(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create goal");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddFunds = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal || !addAmount) return;

    const amount = parseFloat(addAmount);
    if (amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (amount > availableToAllocate) {
      toast.error("Not enough funds available");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/kids/${childId}/goals/${selectedGoal.id}/add-funds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add funds");
      }

      const data = await res.json();
      setGoals((prev) =>
        prev.map((g) =>
          g.id === selectedGoal.id ? { ...g, current_amount: data.newAmount } : g
        )
      );
      toast.success(`Added $${amount.toFixed(2)} to ${selectedGoal.name}`);
      setAddAmount("");
      setShowAddFundsDialog(false);
      setSelectedGoal(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add funds");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    const goal = goals.find((g) => g.id === goalId);
    if (!goal) return;

    if (!confirm(`Delete "${goal.name}"? Any saved money will return to your Save balance.`)) {
      return;
    }

    setDeletingGoalId(goalId);
    try {
      const res = await fetch(`/api/kids/${childId}/goals/${goalId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete goal");

      setGoals((prev) => prev.filter((g) => g.id !== goalId));
      toast.success("Goal deleted");
      router.refresh();
    } catch {
      toast.error("Failed to delete goal");
    } finally {
      setDeletingGoalId(null);
    }
  };

  const openAddFunds = (goal: SavingsGoal) => {
    setSelectedGoal(goal);
    setAddAmount("");
    setShowAddFundsDialog(true);
  };

  const handleEditGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal || !editName.trim()) {
      toast.error("Please enter a goal name");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/kids/${childId}/goals/${selectedGoal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          target_amount: editTarget ? parseFloat(editTarget) : null,
          icon: editIcon,
          description: editDescription.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update goal");
      }

      const data = await res.json();
      setGoals((prev) =>
        prev.map((g) =>
          g.id === selectedGoal.id
            ? {
                ...g,
                name: editName.trim(),
                target_amount: editTarget ? parseFloat(editTarget) : 0,
                icon: editIcon,
                description: editDescription.trim() || null,
              }
            : g
        )
      );
      toast.success(`Updated "${editName}"`);
      setShowEditDialog(false);
      setSelectedGoal(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update goal");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to detect if description contains a URL
  const extractUrl = (text: string | null): string | null => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    const matches = text.match(urlRegex);
    return matches ? matches[0] : null;
  };

  return (
    <>
      <Card className="mb-3">
        <CardContent className="py-0">
          {/* Collapsible Header - always visible */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-full flex items-center justify-between py-3"
          >
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-sage" />
              <span className="font-semibold text-text-dark">Savings Goals</span>
              {goals.length > 0 && (
                <span className="text-xs text-text-light">({goals.length})</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Show summary when collapsed */}
              {isCollapsed && goals.length > 0 && (
                <span className="text-xs text-sage">${totalSaved.toFixed(0)} applied</span>
              )}
              {/* Add button (stop propagation to prevent toggle) */}
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCreateDialog(true);
                }}
                className="h-7 px-2 text-xs text-sage hover:text-sage-dark"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-text-light transition-transform",
                  !isCollapsed && "rotate-180"
                )}
              />
            </div>
          </button>

          {/* Collapsible Content */}
          {!isCollapsed && (
            <div className="pb-3">
              {/* Save Account Connection Banner */}
              {saveAccount && (
                <div className="p-2.5 mb-3 bg-sage-very-light rounded-lg border border-sage-light">
              {/* Total Save Balance */}
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-sage-light flex items-center justify-center">
                  <PiggyBank className="h-3.5 w-3.5 text-sage-dark" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-medium">Save Balance</span>
                    <span className="text-sm font-bold text-sage-dark">
                      ${saveBalance.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Balance breakdown - always show when there are goals */}
              {goals.length > 0 && (
                <div className="mt-2 pt-2 border-t border-sage-light/50 space-y-1">
                  {/* Allocated to goals */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-light">Allocated to goals</span>
                    <span className="font-medium text-text-dark">${totalSaved.toFixed(2)}</span>
                  </div>

                  {/* Goal breakdown - show each goal's allocation */}
                  <div className="pl-3 space-y-0.5">
                    {goals.slice(0, 3).map((goal) => (
                      <div key={goal.id} className="flex items-center justify-between text-xs sm:text-[10px]">
                        <span className="text-text-light truncate flex items-center gap-1">
                          <span>{goal.icon || "🎯"}</span>
                          <span className="truncate">{goal.name}</span>
                        </span>
                        <span className="text-text-medium shrink-0 ml-2">${goal.current_amount.toFixed(2)}</span>
                      </div>
                    ))}
                    {goals.length > 3 && (
                      <p className="text-xs sm:text-[10px] text-text-light">+{goals.length - 3} more</p>
                    )}
                  </div>

                  {/* Unallocated / Available */}
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-sage-light/30">
                    <span className="text-text-light">Unallocated</span>
                    <span className="font-medium text-sage">${availableToAllocate.toFixed(2)}</span>
                  </div>

                  {/* Visual bar showing allocation */}
                  <div className="mt-1.5 h-2 bg-silver-very-light rounded-full overflow-hidden flex">
                    {/* Allocated portion */}
                    <div
                      className="h-full bg-sage transition-all"
                      style={{ width: `${saveBalance > 0 ? (totalSaved / saveBalance) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] sm:text-[9px] text-text-light">
                    <span>Allocated ({saveBalance > 0 ? Math.round((totalSaved / saveBalance) * 100) : 0}%)</span>
                    <span>Free ({saveBalance > 0 ? Math.round((availableToAllocate / saveBalance) * 100) : 0}%)</span>
                  </div>
                </div>
              )}

              {/* Show hint when no goals exist */}
              {goals.length === 0 && saveBalance > 0 && (
                <p className="text-xs sm:text-[10px] text-text-light mt-1.5 text-center">
                  Create a goal to start allocating your savings!
                </p>
              )}
            </div>
          )}

          {/* Goals List */}
          {goals.length === 0 ? (
            <div className="text-center py-4">
              <div className="w-10 h-10 rounded-full bg-sage-very-light mx-auto mb-2 flex items-center justify-center">
                <Target className="h-5 w-5 text-sage-light" />
              </div>
              <p className="text-sm text-text-medium">No goals yet</p>
              <p className="text-xs text-text-light mt-0.5">Save for something special!</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowCreateDialog(true)}
                className="mt-3 h-7 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Create First Goal
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {goals.slice(0, 3).map((goal) => {
                const progress = goal.target_amount > 0
                  ? (goal.current_amount / goal.target_amount) * 100
                  : 0;
                const isComplete = progress >= 100;
                const remaining = Math.max(0, goal.target_amount - goal.current_amount);

                const goalUrl = extractUrl(goal.description);

                return (
                  <div
                    key={goal.id}
                    className={cn(
                      "p-2.5 rounded-lg border transition-all",
                      isComplete
                        ? "bg-sage-very-light border-sage"
                        : "bg-white border-silver-light"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-lg">{goal.icon || "🎯"}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-sm font-medium text-text-dark truncate">
                              {goal.name}
                            </span>
                            {goal.description && (
                              <span title="Has notes">
                                <FileText className="h-3 w-3 text-text-light shrink-0" />
                              </span>
                            )}
                            {goalUrl && (
                              <a
                                href={goalUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-blue hover:text-blue-dark shrink-0"
                              >
                                <span title="View link">
                                  <ExternalLink className="h-3 w-3" />
                                </span>
                              </a>
                            )}
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0 ml-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEditDialog(goal)}
                              className="h-6 w-6 p-0 text-text-light hover:text-sage"
                              title="Edit goal"
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            {!isComplete && availableToAllocate > 0 && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openAddFunds(goal)}
                                className="h-6 w-6 sm:w-auto sm:px-1.5 p-0 text-xs text-sage hover:text-sage-dark"
                                title="Add funds"
                              >
                                <ArrowRight className="h-3 w-3 sm:mr-0.5" />
                                <span className="hidden sm:inline">Add</span>
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteGoal(goal.id)}
                              disabled={deletingGoalId === goal.id}
                              className="h-6 w-6 p-0 text-text-light hover:text-red-500"
                            >
                              {deletingGoalId === goal.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Trash2 className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs mt-0.5">
                          <span className={cn(
                            "font-medium",
                            isComplete ? "text-sage" : "text-text-dark"
                          )}>
                            ${goal.current_amount.toFixed(2)}
                            {goal.target_amount > 0 && (
                              <span className="text-text-light font-normal">
                                {" "}/ ${goal.target_amount.toFixed(2)}
                              </span>
                            )}
                          </span>
                          {goal.target_amount > 0 && (
                            <span className={cn(
                              "text-xs",
                              isComplete ? "text-sage font-medium" : "text-text-light"
                            )}>
                              {isComplete ? "Done!" : `${Math.round(progress)}%`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {goal.target_amount > 0 && (
                      <div className="space-y-0.5">
                        <Progress
                          value={Math.min(progress, 100)}
                          className={cn("h-1.5", isComplete && "[&>div]:bg-sage")}
                        />
                        {!isComplete && remaining > 0 && (
                          <p className="text-xs sm:text-[10px] text-text-light">
                            ${remaining.toFixed(2)} to go
                          </p>
                        )}
                        {isComplete && (
                          <p className="text-xs sm:text-[10px] text-sage font-medium">
                            Goal reached!
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {goals.length > 3 && (
                <p className="text-xs text-center text-text-light">
                  +{goals.length - 3} more goal{goals.length - 3 > 1 ? "s" : ""}
                </p>
              )}
            </div>
          )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Goal Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-sage" />
              New Savings Goal
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateGoal} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="goalName">What are you saving for?</Label>
              <Input
                id="goalName"
                value={newGoalName}
                onChange={(e) => setNewGoalName(e.target.value)}
                placeholder="e.g., New bike, Video game"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="goalTarget">Target amount ($)</Label>
              <Input
                id="goalTarget"
                type="number"
                min="0"
                step="0.01"
                value={newGoalTarget}
                onChange={(e) => setNewGoalTarget(e.target.value)}
                placeholder="How much do you need?"
              />
            </div>

            <div className="space-y-2">
              <Label>Pick an icon</Label>
              <div className="flex flex-wrap gap-2">
                {ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setNewGoalIcon(icon)}
                    className={cn(
                      "w-9 h-9 text-lg rounded-lg border-2 transition-all",
                      newGoalIcon === icon
                        ? "border-sage bg-sage-very-light"
                        : "border-silver-light hover:border-sage-light"
                    )}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="goalDescription">Notes (optional)</Label>
              <Textarea
                id="goalDescription"
                value={newGoalDescription}
                onChange={(e) => setNewGoalDescription(e.target.value)}
                placeholder="Add a link or details about what you want..."
                className="h-16 resize-none text-sm"
              />
              <p className="text-xs sm:text-[10px] text-text-light">
                Paste a link to the item you want!
              </p>
            </div>

            {saveAccount && (
              <div className="p-3 bg-sage-very-light rounded-lg border border-sage-light">
                <div className="flex items-center gap-2">
                  <PiggyBank className="h-4 w-4 text-sage" />
                  <p className="text-xs text-text-medium">
                    Money for this goal comes from your <strong className="text-sage-dark">Save</strong> balance.
                    You have <strong className="text-sage-dark">${availableToAllocate.toFixed(2)}</strong> available to add.
                  </p>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !newGoalName.trim()}
                className="bg-sage hover:bg-sage-dark"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Goal"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Funds Dialog */}
      <Dialog open={showAddFundsDialog} onOpenChange={setShowAddFundsDialog}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-xl">{selectedGoal?.icon || "🎯"}</span>
              Add to {selectedGoal?.name}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddFunds} className="space-y-4">
            {/* Visual flow - vertical on mobile, horizontal on tablet+ */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 py-3">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-sage-very-light flex items-center justify-center mb-1 mx-auto">
                  <PiggyBank className="h-6 w-6 text-sage" />
                </div>
                <p className="text-xs text-text-medium">Save</p>
                <p className="text-sm font-bold text-sage-dark">${availableToAllocate.toFixed(2)}</p>
              </div>
              <ArrowDown className="h-5 w-5 text-sage sm:hidden" />
              <ArrowRight className="h-6 w-6 text-sage hidden sm:block" />
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-sage-very-light flex items-center justify-center mb-1 mx-auto">
                  <span className="text-2xl">{selectedGoal?.icon || "🎯"}</span>
                </div>
                <p className="text-xs text-text-medium">Goal</p>
                <p className="text-sm font-bold text-text-dark">${selectedGoal?.current_amount.toFixed(2)}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="addAmount">Amount to add ($)</Label>
              <Input
                id="addAmount"
                type="number"
                min="0.01"
                step="0.01"
                max={availableToAllocate}
                value={addAmount}
                onChange={(e) => setAddAmount(e.target.value)}
                placeholder="0.00"
                autoFocus
              />
              <div className="flex justify-between text-xs text-text-light">
                <span>Available: ${availableToAllocate.toFixed(2)}</span>
                {selectedGoal && selectedGoal.target_amount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const remaining = selectedGoal.target_amount - selectedGoal.current_amount;
                      setAddAmount(Math.min(remaining, availableToAllocate).toFixed(2));
                    }}
                    className="text-sage hover:text-sage-dark underline"
                  >
                    Fill goal
                  </button>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddFundsDialog(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !addAmount || parseFloat(addAmount) <= 0}
                className="bg-sage hover:bg-sage-dark"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <ArrowRight className="h-4 w-4 mr-1" />
                    Add Funds
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Goal Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-sage" />
              Edit Goal
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleEditGoal} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editName">Goal name</Label>
              <Input
                id="editName"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="e.g., New bike, Video game"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editTarget">Target amount ($)</Label>
              <Input
                id="editTarget"
                type="number"
                min="0"
                step="0.01"
                value={editTarget}
                onChange={(e) => setEditTarget(e.target.value)}
                placeholder="How much do you need?"
              />
              <p className="text-xs sm:text-[10px] text-text-light">
                Change this if the price changes
              </p>
            </div>

            <div className="space-y-2">
              <Label>Icon</Label>
              <div className="flex flex-wrap gap-2">
                {ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setEditIcon(icon)}
                    className={cn(
                      "w-9 h-9 text-lg rounded-lg border-2 transition-all",
                      editIcon === icon
                        ? "border-sage bg-sage-very-light"
                        : "border-silver-light hover:border-sage-light"
                    )}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="editDescription">Notes</Label>
              <Textarea
                id="editDescription"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Add a link or details about what you want..."
                className="h-20 resize-none text-sm"
              />
              <p className="text-xs sm:text-[10px] text-text-light">
                Paste a link to the item you want!
              </p>
            </div>

            {/* Show current progress */}
            {selectedGoal && (
              <div className="p-3 bg-silver-very-light rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-medium">Current savings:</span>
                  <span className="font-bold text-sage-dark">
                    ${selectedGoal.current_amount.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditDialog(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !editName.trim()}
                className="bg-sage hover:bg-sage-dark"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
