"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/lib/hooks/use-toast";
import { ArrowRight } from "lucide-react";

interface TeenGoal {
  id: string;
  name: string;
  icon: string | null;
  current_amount: number;
}

interface SavingsGoal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  icon: string | null;
  deadline?: string | null;
  notes?: string | null;
  status?: string;
}

interface TransferGoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  childId: string;
  fromGoal?: TeenGoal;
  availableGoals?: TeenGoal[];
  onSuccess?: () => void;
  // Alternative props for kid-goals-client usage
  goal?: SavingsGoal;
  availableBalance?: number;
  onTransferred?: (newAmount: number) => void;
}

export function TransferGoalDialog({
  open,
  onOpenChange,
  childId,
  fromGoal,
  availableGoals,
  onSuccess,
  goal,
  availableBalance,
  onTransferred,
}: TransferGoalDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [toGoalId, setToGoalId] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  // Support both prop patterns - kid-goals-client passes goal/availableBalance
  // teen-goals-widget passes fromGoal/availableGoals
  const isSimpleTransfer = Boolean(goal && availableBalance !== undefined);
  const targetGoal = goal || fromGoal;
  const maxAmount = isSimpleTransfer ? (availableBalance || 0) : (fromGoal?.current_amount || 0);
  const selectedGoal = availableGoals?.find((g) => g.id === toGoalId);

  const resetForm = () => {
    setToGoalId("");
    setAmount("");
    setNotes("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const transferAmount = parseFloat(amount);

    // For simple transfer mode (Save -> Goal), no toGoalId needed
    if (!isSimpleTransfer && !toGoalId) {
      toast({
        title: "Error",
        description: "Please select a destination goal",
        variant: "destructive",
      });
      return;
    }

    if (!amount || transferAmount <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    if (transferAmount > maxAmount) {
      toast({
        title: "Error",
        description: `Amount cannot exceed available balance of $${maxAmount.toFixed(2)}`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (isSimpleTransfer && goal) {
        // Simple transfer: Save account -> Goal
        const response = await fetch(`/api/kids/${childId}/goals/${goal.id}/add-funds`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: transferAmount,
            notes: notes.trim() || null,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to add funds");
        }

        const data = await response.json();
        const newAmount = goal.current_amount + transferAmount;

        toast({
          title: "Funds added",
          description: `$${transferAmount.toFixed(2)} added to ${goal.name}`,
        });

        resetForm();
        onTransferred?.(newAmount);
        onOpenChange(false);
      } else if (fromGoal) {
        // Transfer between goals
        const response = await fetch(`/api/kids/${childId}/goals/transfer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fromGoalId: fromGoal.id,
            toGoalId,
            amount: transferAmount,
            notes: notes.trim() || null,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to transfer");
        }

        const data = await response.json();

        toast({
          title: "Transfer complete",
          description: data.message,
        });

        resetForm();
        onSuccess?.();
        onOpenChange(false);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to transfer",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTransferAll = () => {
    setAmount(maxAmount.toFixed(2));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>
            {isSimpleTransfer ? "Add Funds to Goal" : "Transfer Between Goals"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSimpleTransfer && goal ? (
            // Simple mode: Save -> Goal
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex-1 text-center">
                <div className="text-2xl mb-1">💰</div>
                <div className="text-sm font-medium">Save Account</div>
                <div className="text-xs text-muted-foreground">
                  ${maxAmount.toFixed(2)} available
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1 text-center">
                <div className="text-2xl mb-1">{goal.icon || "🎯"}</div>
                <div className="text-sm font-medium">{goal.name}</div>
                <div className="text-xs text-muted-foreground">
                  ${goal.current_amount.toFixed(2)} saved
                </div>
              </div>
            </div>
          ) : fromGoal ? (
            // Transfer between goals mode
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex-1 text-center">
                <div className="text-2xl mb-1">{fromGoal.icon || "🎯"}</div>
                <div className="text-sm font-medium">{fromGoal.name}</div>
                <div className="text-xs text-muted-foreground">
                  ${fromGoal.current_amount.toFixed(2)} available
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1 text-center">
                {selectedGoal ? (
                  <>
                    <div className="text-2xl mb-1">{selectedGoal.icon || "🎯"}</div>
                    <div className="text-sm font-medium">{selectedGoal.name}</div>
                    <div className="text-xs text-muted-foreground">
                      ${selectedGoal.current_amount.toFixed(2)} current
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">Select goal</div>
                )}
              </div>
            </div>
          ) : null}

          {!isSimpleTransfer && availableGoals && (
            <div className="space-y-2">
              <Label htmlFor="toGoal">Transfer To</Label>
              <Select value={toGoalId} onValueChange={setToGoalId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select destination goal" />
              </SelectTrigger>
              <SelectContent>
                {availableGoals.map((goal) => (
                  <SelectItem key={goal.id} value={goal.id}>
                    {goal.icon} {goal.name} (${goal.current_amount.toFixed(2)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          )}

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="amount">Amount ($)</Label>
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs"
                onClick={handleTransferAll}
              >
                Transfer all (${maxAmount.toFixed(2)})
              </Button>
            </div>
            <Input
              id="amount"
              type="number"
              min="0.01"
              max={maxAmount}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Reason for transfer"
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || (!isSimpleTransfer && !toGoalId) || !amount}
            >
              {isSubmitting ? "Processing..." : isSimpleTransfer ? "Add Funds" : "Transfer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
