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
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/lib/hooks/use-toast";

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

interface CreateGoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  childId: string;
  availablePercentage?: number;
  onSuccess?: () => void;
  onCreated?: (goal: SavingsGoal) => void;
}

const ICONS = ["🎯", "💰", "🎮", "📱", "✈️", "🚗", "🎸", "📚", "👟", "🎁", "🏠", "💎"];
const COLORS = ["sage", "blue", "gold", "purple", "pink", "green"];

export function CreateGoalDialog({
  open,
  onOpenChange,
  childId,
  availablePercentage = 100,
  onSuccess,
  onCreated,
}: CreateGoalDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [allocationPercentage, setAllocationPercentage] = useState(
    Math.min(25, availablePercentage)
  );
  const [icon, setIcon] = useState("🎯");
  const [color, setColor] = useState("sage");
  const [initialAmount, setInitialAmount] = useState("");

  const resetForm = () => {
    setName("");
    setDescription("");
    setTargetAmount("");
    setAllocationPercentage(Math.min(25, availablePercentage));
    setIcon("🎯");
    setColor("sage");
    setInitialAmount("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a goal name",
        variant: "destructive",
      });
      return;
    }

    if (allocationPercentage > availablePercentage) {
      toast({
        title: "Error",
        description: `Allocation cannot exceed ${availablePercentage}%`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/kids/${childId}/goals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          target_amount: targetAmount ? parseFloat(targetAmount) : null,
          allocation_percentage: allocationPercentage,
          icon,
          color,
          initial_amount: initialAmount ? parseFloat(initialAmount) : 0,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create goal");
      }

      const data = await response.json();

      toast({
        title: "Goal created",
        description: `"${name}" has been created successfully`,
      });

      resetForm();
      onSuccess?.();
      onCreated?.(data.goal);
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create goal",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Savings Goal</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Goal Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., New Phone, Summer Trip"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What are you saving for?"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="target">Target Amount ($)</Label>
              <Input
                id="target"
                type="number"
                min="0"
                step="0.01"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="initial">Starting Balance ($)</Label>
              <Input
                id="initial"
                type="number"
                min="0"
                step="0.01"
                value={initialAmount}
                onChange={(e) => setInitialAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Allocation Percentage</Label>
              <span className="text-sm font-medium">{allocationPercentage}%</span>
            </div>
            <Slider
              value={[allocationPercentage]}
              onValueChange={([value]) => setAllocationPercentage(value)}
              max={availablePercentage}
              min={0}
              step={1}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              {availablePercentage}% available to allocate
            </p>
          </div>

          <div className="space-y-2">
            <Label>Icon</Label>
            <div className="flex flex-wrap gap-2">
              {ICONS.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIcon(i)}
                  className={`w-10 h-10 text-xl rounded-lg border-2 transition-all ${
                    icon === i
                      ? "border-sage bg-sage-very-light"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    color === c ? "ring-2 ring-offset-2 ring-sage" : ""
                  } ${
                    c === "sage"
                      ? "bg-sage"
                      : c === "blue"
                      ? "bg-blue"
                      : c === "gold"
                      ? "bg-gold"
                      : c === "purple"
                      ? "bg-purple-500"
                      : c === "pink"
                      ? "bg-pink-500"
                      : "bg-green-500"
                  }`}
                />
              ))}
            </div>
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Goal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
