"use client";

import { useEffect, useState } from "react";
import { GoalCard } from "@/components/goals/goal-card";
import { GoalCreateDialog } from "@/components/goals/goal-create-dialog";
import type { GoalEnvelope } from "@/lib/types/goals";
import { calculateGoalProgress } from "@/lib/goals";
import { Plus, Target, Filter, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";

type CategoryOption = { id: string; name: string };
type FilterStatus = "all" | "active" | "completed" | "ahead" | "on_track" | "behind";

interface GoalsClientProps {
  categories: CategoryOption[];
}

export function GoalsClient({ categories }: GoalsClientProps) {
  const [goals, setGoals] = useState<GoalEnvelope[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");

  const fetchGoals = async () => {
    try {
      const response = await fetch("/api/goals");
      if (!response.ok) throw new Error("Failed to fetch goals");
      const data = await response.json();
      setGoals(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load goals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  // Filter goals based on status
  const filteredGoals = goals.filter((goal) => {
    if (filterStatus === "all") return true;

    const progress = calculateGoalProgress(goal);

    if (filterStatus === "active") return progress.status !== "completed";
    if (filterStatus === "completed") return progress.status === "completed";
    if (filterStatus === "ahead") return progress.status === "ahead";
    if (filterStatus === "on_track") return progress.status === "on_track";
    if (filterStatus === "behind") return progress.status === "behind";

    return true;
  });

  // Calculate summary stats
  const totalGoals = goals.length;
  const activeGoals = goals.filter((g) => {
    const progress = calculateGoalProgress(g);
    return progress.status !== "completed";
  }).length;
  const completedGoals = totalGoals - activeGoals;
  const aheadGoals = goals.filter((g) => calculateGoalProgress(g).status === "ahead").length;
  const onTrackGoals = goals.filter((g) => calculateGoalProgress(g).status === "on_track").length;
  const behindGoals = goals.filter((g) => calculateGoalProgress(g).status === "behind").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-sky-100 rounded-xl">
                <Target className="h-6 w-6 text-sky-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Goals</h1>
                <p className="text-gray-500">Track your savings goals and milestones</p>
              </div>
            </div>
            <button
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4" />
              New Goal
            </button>
          </div>

          {/* Summary Stats */}
          {totalGoals > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="bg-white border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="h-4 w-4 text-gray-500" />
                  <p className="text-xs font-medium text-gray-500 uppercase">Total</p>
                </div>
                <p className="text-2xl font-bold text-gray-900">{totalGoals}</p>
              </div>

              <div className="bg-white border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-gray-500" />
                  <p className="text-xs font-medium text-gray-500 uppercase">Active</p>
                </div>
                <p className="text-2xl font-bold text-gray-900">{activeGoals}</p>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                  <p className="text-xs font-medium text-emerald-600 uppercase">Ahead</p>
                </div>
                <p className="text-2xl font-bold text-emerald-600">{aheadGoals}</p>
              </div>

              <div className="bg-sky-50 border border-sky-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="h-4 w-4 text-sky-600" />
                  <p className="text-xs font-medium text-sky-600 uppercase">On Track</p>
                </div>
                <p className="text-2xl font-bold text-sky-600">{onTrackGoals}</p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <p className="text-xs font-medium text-amber-600 uppercase">Behind</p>
                </div>
                <p className="text-2xl font-bold text-amber-600">{behindGoals}</p>
              </div>
            </div>
          )}

          {/* Filters */}
          {totalGoals > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="h-4 w-4 text-gray-500" />
              <button
                onClick={() => setFilterStatus("all")}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filterStatus === "all"
                    ? "bg-gray-900 text-white"
                    : "bg-white border text-gray-600 hover:bg-gray-50"
                }`}
              >
                All ({totalGoals})
              </button>
              <button
                onClick={() => setFilterStatus("active")}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filterStatus === "active"
                    ? "bg-gray-900 text-white"
                    : "bg-white border text-gray-600 hover:bg-gray-50"
                }`}
              >
                Active ({activeGoals})
              </button>
              <button
                onClick={() => setFilterStatus("ahead")}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filterStatus === "ahead"
                    ? "bg-emerald-600 text-white"
                    : "bg-white border text-gray-600 hover:bg-gray-50"
                }`}
              >
                Ahead ({aheadGoals})
              </button>
              <button
                onClick={() => setFilterStatus("on_track")}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filterStatus === "on_track"
                    ? "bg-sky-600 text-white"
                    : "bg-white border text-gray-600 hover:bg-gray-50"
                }`}
              >
                On Track ({onTrackGoals})
              </button>
              <button
                onClick={() => setFilterStatus("behind")}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filterStatus === "behind"
                    ? "bg-amber-600 text-white"
                    : "bg-white border text-gray-600 hover:bg-gray-50"
                }`}
              >
                Behind ({behindGoals})
              </button>
              <button
                onClick={() => setFilterStatus("completed")}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filterStatus === "completed"
                    ? "bg-purple-600 text-white"
                    : "bg-white border text-gray-600 hover:bg-gray-50"
                }`}
              >
                Completed ({completedGoals})
              </button>
            </div>
          )}
        </div>

        {/* Goals Grid */}
        {filteredGoals.length === 0 ? (
          <div className="bg-white border rounded-lg p-12 text-center">
            <div className="max-w-sm mx-auto">
              <div className="inline-flex p-4 bg-sky-100 rounded-full mb-4">
                <Target className="h-8 w-8 text-sky-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {filterStatus !== "all" ? "No goals match this filter" : "No goals yet"}
              </h3>
              <p className="text-gray-500 mb-6">
                {filterStatus !== "all"
                  ? "Try selecting a different filter to see your goals."
                  : "Create your first savings goal to start tracking your progress and stay motivated."}
              </p>
              {filterStatus === "all" && (
                <button
                  onClick={() => setCreateOpen(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  Create Your First Goal
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGoals.map((goal) => (
              <GoalCard key={goal.id} goal={goal} />
            ))}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <GoalCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        categories={categories}
        onCreated={fetchGoals}
      />
    </div>
  );
}
