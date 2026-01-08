"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowRightLeft, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

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

interface TeenGoalCardProps {
  goal: TeenGoal;
  onEdit?: (goal: TeenGoal) => void;
  onDelete?: (goalId: string) => void;
  onTransfer?: (goal: TeenGoal) => void;
}

const colorClasses: Record<string, { bg: string; border: string; progress: string }> = {
  sage: {
    bg: "bg-sage-very-light",
    border: "border-sage-light",
    progress: "bg-sage",
  },
  blue: {
    bg: "bg-blue-light",
    border: "border-blue/30",
    progress: "bg-blue",
  },
  gold: {
    bg: "bg-gold-light",
    border: "border-gold/30",
    progress: "bg-gold",
  },
  purple: {
    bg: "bg-purple-50",
    border: "border-purple-200",
    progress: "bg-purple-500",
  },
  pink: {
    bg: "bg-pink-50",
    border: "border-pink-200",
    progress: "bg-pink-500",
  },
  green: {
    bg: "bg-green-50",
    border: "border-green-200",
    progress: "bg-green-500",
  },
};

export function TeenGoalCard({
  goal,
  onEdit,
  onDelete,
  onTransfer,
}: TeenGoalCardProps) {
  const colors = colorClasses[goal.color] || colorClasses.sage;
  const hasTarget = goal.target_amount && goal.target_amount > 0;
  const progress = hasTarget
    ? Math.min(100, (goal.current_amount / goal.target_amount!) * 100)
    : 0;
  const isComplete = hasTarget && goal.current_amount >= goal.target_amount!;

  return (
    <Card className={cn("border-2", colors.border, colors.bg)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{goal.icon}</span>
            <div>
              <h3 className="font-semibold text-text-dark">{goal.name}</h3>
              {goal.description && (
                <p className="text-xs text-muted-foreground">{goal.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {onTransfer && goal.current_amount > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onTransfer(goal)}
                title="Transfer to another goal"
              >
                <ArrowRightLeft className="h-4 w-4" />
              </Button>
            )}
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onEdit(goal)}
                title="Edit goal"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-red-500 hover:text-red-600"
                onClick={() => onDelete(goal.id)}
                title="Delete goal"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-baseline">
            <span className="text-2xl font-bold text-text-dark">
              ${goal.current_amount.toFixed(2)}
            </span>
            {hasTarget && (
              <span className="text-sm text-muted-foreground">
                of ${goal.target_amount!.toFixed(2)}
              </span>
            )}
          </div>

          {hasTarget && (
            <div className="space-y-1">
              <Progress
                value={progress}
                className={cn("h-2", isComplete && "bg-green-100")}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{progress.toFixed(0)}% complete</span>
                {!isComplete && (
                  <span>
                    ${(goal.target_amount! - goal.current_amount).toFixed(2)} to go
                  </span>
                )}
                {isComplete && (
                  <span className="text-green-600 font-medium">🎉 Goal reached!</span>
                )}
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-gray-200">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Allocation</span>
              <span className="font-medium text-text-dark">
                {goal.allocation_percentage}%
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
