"use client";

import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { calculateGoalProgress } from "@/lib/goals";
import type { GoalEnvelope } from "@/lib/types/goals";
import { Target, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";

interface GoalProgressWidgetProps {
  goals: GoalEnvelope[];
}

export function GoalProgressWidget({ goals }: GoalProgressWidgetProps) {
  const router = useRouter();

  if (goals.length === 0) {
    return (
      <div className="border rounded-lg p-6 bg-white">
        <div className="flex items-center gap-2 mb-4">
          <Target className="h-5 w-5 text-gray-500" />
          <h3 className="font-semibold text-lg">Goals</h3>
        </div>
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">No goals yet</p>
          <button
            onClick={() => router.push("/goals")}
            className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors"
          >
            Create Your First Goal
          </button>
        </div>
      </div>
    );
  }

  // Calculate summary stats
  const totalGoals = goals.length;
  const completedGoals = goals.filter((g) => {
    const progress = calculateGoalProgress(g);
    return progress.status === "completed";
  }).length;
  const activeGoals = totalGoals - completedGoals;

  // Get goals by status
  const onTrackGoals = goals.filter((g) => {
    const progress = calculateGoalProgress(g);
    return progress.status === "on_track" || progress.status === "ahead";
  }).length;
  const behindGoals = goals.filter((g) => {
    const progress = calculateGoalProgress(g);
    return progress.status === "behind";
  }).length;

  // Get top 3 active goals to display
  const activeGoalsList = goals
    .filter((g) => {
      const progress = calculateGoalProgress(g);
      return progress.status !== "completed";
    })
    .sort((a, b) => {
      const progressA = calculateGoalProgress(a);
      const progressB = calculateGoalProgress(b);
      // Sort by closest to target date
      if (a.goal_target_date && b.goal_target_date) {
        return new Date(a.goal_target_date).getTime() - new Date(b.goal_target_date).getTime();
      }
      return progressB.percentComplete - progressA.percentComplete;
    })
    .slice(0, 3);

  return (
    <div className="border rounded-lg p-6 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-sky-600" />
          <h3 className="font-semibold text-lg">Goals</h3>
        </div>
        <button
          onClick={() => router.push("/goals")}
          className="text-sm text-sky-600 hover:text-sky-700 font-medium"
        >
          View All
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <p className="text-2xl font-bold text-gray-900">{activeGoals}</p>
          <p className="text-xs text-gray-500">Active</p>
        </div>
        <div className="text-center p-3 bg-emerald-50 rounded-lg">
          <div className="flex items-center justify-center gap-1">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            <p className="text-2xl font-bold text-emerald-600">{onTrackGoals}</p>
          </div>
          <p className="text-xs text-gray-500">On Track</p>
        </div>
        <div className="text-center p-3 bg-purple-50 rounded-lg">
          <div className="flex items-center justify-center gap-1">
            <CheckCircle className="h-4 w-4 text-purple-600" />
            <p className="text-2xl font-bold text-purple-600">{completedGoals}</p>
          </div>
          <p className="text-xs text-gray-500">Completed</p>
        </div>
      </div>

      {/* Behind Schedule Alert */}
      {behindGoals > 0 && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
          <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-amber-900">
              {behindGoals} {behindGoals === 1 ? "goal is" : "goals are"} behind schedule
            </p>
            <p className="text-amber-700 text-xs mt-1">Consider adjusting your contributions</p>
          </div>
        </div>
      )}

      {/* Active Goals List */}
      {activeGoalsList.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700">Active Goals</p>
          {activeGoalsList.map((goal) => {
            const progress = calculateGoalProgress(goal);
            return (
              <div
                key={goal.id}
                className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => router.push(`/goals/${goal.id}`)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{goal.icon || "🎯"}</span>
                    <span className="font-medium text-sm">{goal.name}</span>
                  </div>
                  <span className="text-sm font-semibold">{Math.round(progress.percentComplete)}%</span>
                </div>

                {/* Mini Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      progress.status === "completed"
                        ? "bg-purple-500"
                        : progress.status === "ahead"
                        ? "bg-emerald-500"
                        : progress.status === "on_track"
                        ? "bg-sky-500"
                        : "bg-amber-500"
                    }`}
                    style={{ width: `${Math.min(100, progress.percentComplete)}%` }}
                  />
                </div>

                {/* Goal Details */}
                <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                  <span>{formatCurrency(progress.currentAmount)} of {formatCurrency(progress.targetAmount)}</span>
                  {progress.daysRemaining !== null && progress.daysRemaining >= 0 && (
                    <span>{progress.daysRemaining} days left</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
