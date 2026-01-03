"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/finance";
import { calculateGoalProgress, getGoalStatusLabel, getGoalStatusColor } from "@/lib/goals";
import { GOAL_TYPE_LABELS } from "@/lib/types/goals";
import { MilestoneManager } from "@/components/goals/milestone-manager";
import type { GoalEnvelope } from "@/lib/types/goals";
import { format, differenceInDays } from "date-fns";
import { ArrowLeft, Edit2, Trash2, Calendar, TrendingUp, Target, DollarSign } from "lucide-react";
import { toast } from "sonner";

interface GoalDetailClientProps {
  goal: GoalEnvelope;
}

export function GoalDetailClient({ goal: initialGoal }: GoalDetailClientProps) {
  const router = useRouter();
  const [goal, setGoal] = useState(initialGoal);
  const progress = calculateGoalProgress(goal);

  const handleRefresh = async () => {
    try {
      const response = await fetch(`/api/goals/${goal.id}`);
      if (!response.ok) throw new Error("Failed to refresh goal");
      const data = await response.json();
      setGoal(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to refresh goal");
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${goal.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/goals/${goal.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete goal");
      toast.success("Goal deleted");
      router.push("/goals");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete goal");
    }
  };

  const handleMarkComplete = async () => {
    try {
      const response = await fetch(`/api/goals/${goal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: true }),
      });

      if (!response.ok) throw new Error("Failed to mark goal as complete");
      toast.success("🎉 Goal completed!");
      handleRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to mark goal as complete");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push("/goals")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Goals
          </button>

          <div className="bg-white border rounded-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="text-5xl">{goal.icon || "🎯"}</div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">{goal.name}</h1>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getGoalStatusColor(progress.status)}`}>
                      {getGoalStatusLabel(progress.status)}
                    </span>
                    <span className="text-sm text-gray-500">
                      {GOAL_TYPE_LABELS[goal.goal_type]}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                {progress.status !== "completed" && (
                  <button
                    onClick={handleMarkComplete}
                    className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                    title="Mark as Complete"
                  >
                    <Target className="h-5 w-5" />
                  </button>
                )}
                <button
                  onClick={() => router.push(`/goals/${goal.id}/edit`)}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Edit Goal"
                >
                  <Edit2 className="h-5 w-5" />
                </button>
                <button
                  onClick={handleDelete}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete Goal"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>

            {goal.notes && (
              <p className="text-gray-600 mb-4 p-4 bg-gray-50 rounded-lg border">{goal.notes}</p>
            )}
          </div>
        </div>

        {/* Progress Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Progress Circle */}
          <div className="bg-white border rounded-lg p-6">
            <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-sky-600" />
              Progress
            </h2>
            <div className="flex flex-col items-center">
              {/* Large Circular Progress */}
              <div className="relative w-48 h-48 mb-6">
                <svg className="transform -rotate-90 w-48 h-48">
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="transparent"
                    className="text-gray-200"
                  />
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="transparent"
                    strokeDasharray={`${2 * Math.PI * 88}`}
                    strokeDashoffset={`${2 * Math.PI * 88 * (1 - progress.percentComplete / 100)}`}
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
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-bold">{Math.round(progress.percentComplete)}%</span>
                  <span className="text-sm text-gray-500">Complete</span>
                </div>
              </div>

              {/* Stats */}
              <div className="w-full space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Current</span>
                  <span className="font-semibold">{formatCurrency(progress.currentAmount)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Target</span>
                  <span className="font-semibold">{formatCurrency(progress.targetAmount)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Remaining</span>
                  <span className="font-semibold text-gray-600">{formatCurrency(progress.remainingAmount)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Target Date & Contributions */}
          <div className="space-y-6">
            {/* Target Date Info */}
            {goal.goal_target_date && (
              <div className="bg-white border rounded-lg p-6">
                <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-sky-600" />
                  Target Date
                </h2>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Target</p>
                    <p className="text-xl font-semibold">{format(new Date(goal.goal_target_date), "MMMM d, yyyy")}</p>
                  </div>
                  {progress.daysRemaining !== null && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Days Remaining</p>
                      <p className={`text-xl font-semibold ${progress.daysRemaining < 30 ? "text-amber-600" : "text-gray-900"}`}>
                        {progress.daysRemaining > 0 ? `${progress.daysRemaining} days` : "Overdue"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Contributions */}
            <div className="bg-white border rounded-lg p-6">
              <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-sky-600" />
                Contributions
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Current Contribution</p>
                  <p className="text-xl font-semibold">
                    {formatCurrency(Number(goal.pay_cycle_amount || 0))}
                    <span className="text-sm text-gray-500 font-normal ml-2">per pay cycle</span>
                  </p>
                </div>
                {progress.suggestedMonthlyContribution > 0 && progress.status !== "completed" && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Suggested Monthly</p>
                    <p className="text-xl font-semibold text-sky-600">
                      {formatCurrency(progress.suggestedMonthlyContribution)}
                    </p>
                    {progress.status === "behind" && (
                      <p className="text-xs text-amber-600 mt-2">
                        Consider increasing your contributions to stay on track
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Milestones */}
        <div className="bg-white border rounded-lg p-6">
          <MilestoneManager
            goalId={goal.id}
            currentAmount={progress.currentAmount}
            milestones={goal.milestones || []}
            onUpdate={handleRefresh}
          />
        </div>
      </div>
    </div>
  );
}
