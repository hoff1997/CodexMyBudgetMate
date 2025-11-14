"use client";

import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/finance";
import { calculateGoalProgress, getGoalStatusLabel, getGoalStatusColor } from "@/lib/goals";
import type { GoalEnvelope } from "@/lib/types/goals";
import { differenceInDays, format } from "date-fns";

interface GoalCardProps {
  goal: GoalEnvelope;
}

export function GoalCard({ goal }: GoalCardProps) {
  const router = useRouter();
  const progress = calculateGoalProgress(goal);

  const handleClick = () => {
    router.push(`/goals/${goal.id}`);
  };

  return (
    <div
      className="relative border rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer bg-white"
      onClick={handleClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-3xl">{goal.icon || "🎯"}</div>
          <div>
            <h3 className="font-semibold text-lg">{goal.name}</h3>
            {goal.category_name && (
              <p className="text-sm text-gray-500">{goal.category_name}</p>
            )}
          </div>
        </div>

        {/* Status Badge */}
        <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getGoalStatusColor(progress.status)}`}>
          {getGoalStatusLabel(progress.status)}
        </div>
      </div>

      {/* Progress Circle and Stats */}
      <div className="grid grid-cols-2 gap-6 mb-4">
        {/* Circular Progress */}
        <div className="flex items-center justify-center">
          <div className="relative w-32 h-32">
            <svg className="transform -rotate-90 w-32 h-32">
              {/* Background circle */}
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                className="text-gray-200"
              />
              {/* Progress circle */}
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={`${2 * Math.PI * 56}`}
                strokeDashoffset={`${2 * Math.PI * 56 * (1 - progress.percentComplete / 100)}`}
                className={
                  progress.status === "completed"
                    ? "text-purple-500"
                    : progress.status === "ahead"
                    ? "text-emerald-500"
                    : progress.status === "on_track"
                    ? "text-sky-500"
                    : "text-amber-500"
                }
                strokeLinecap="round"
              />
            </svg>
            {/* Percentage in center */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold">{Math.round(progress.percentComplete)}%</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-col justify-center space-y-2">
          <div>
            <p className="text-xs text-gray-500">Current</p>
            <p className="text-lg font-semibold">{formatCurrency(progress.currentAmount)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Target</p>
            <p className="text-lg font-semibold">{formatCurrency(progress.targetAmount)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Remaining</p>
            <p className="text-lg font-semibold text-gray-600">{formatCurrency(progress.remainingAmount)}</p>
          </div>
        </div>
      </div>

      {/* Target Date and Days Remaining */}
      {goal.goal_target_date && (
        <div className="border-t pt-4 mt-4">
          <div className="flex items-center justify-between text-sm">
            <div>
              <p className="text-gray-500">Target Date</p>
              <p className="font-medium">{format(new Date(goal.goal_target_date), "MMM d, yyyy")}</p>
            </div>
            {progress.daysRemaining !== null && (
              <div className="text-right">
                <p className="text-gray-500">Days Remaining</p>
                <p className={`font-medium ${progress.daysRemaining < 30 ? "text-amber-600" : "text-gray-900"}`}>
                  {progress.daysRemaining > 0 ? progress.daysRemaining : "Overdue"}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Suggested Contribution */}
      {progress.suggestedMonthlyContribution > 0 && progress.status !== "completed" && (
        <div className="border-t pt-4 mt-4">
          <p className="text-xs text-gray-500 mb-1">Suggested Monthly Contribution</p>
          <p className="text-lg font-semibold text-sky-600">
            {formatCurrency(progress.suggestedMonthlyContribution)}
          </p>
          {progress.status === "behind" && (
            <p className="text-xs text-amber-600 mt-1">
              Consider increasing your contributions to stay on track
            </p>
          )}
        </div>
      )}

      {/* Milestones Summary */}
      {goal.milestones && goal.milestones.length > 0 && (
        <div className="border-t pt-4 mt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Milestones</span>
            <span className="font-medium">
              {goal.milestones.filter((m) => m.achieved_at).length} / {goal.milestones.length}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
