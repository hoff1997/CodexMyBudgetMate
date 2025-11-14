"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { isMilestoneAchieved } from "@/lib/goals";
import type { GoalMilestone } from "@/lib/auth/types";
import { format } from "date-fns";
import { Plus, Check, X, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface MilestoneManagerProps {
  goalId: string;
  currentAmount: number;
  milestones: GoalMilestone[];
  onUpdate: () => void;
}

export function MilestoneManager({ goalId, currentAmount, milestones, onUpdate }: MilestoneManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    amount: "",
    date: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      if (editingId) {
        // Update existing milestone
        const response = await fetch(`/api/goals/${goalId}/milestones`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            milestoneId: editingId,
            name: formData.name,
            amount,
            date: formData.date || null,
            notes: formData.notes || null,
          }),
        });

        if (!response.ok) throw new Error("Failed to update milestone");
        toast.success("Milestone updated");
      } else {
        // Create new milestone
        const response = await fetch(`/api/goals/${goalId}/milestones`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name,
            amount,
            date: formData.date || null,
            notes: formData.notes || null,
          }),
        });

        if (!response.ok) throw new Error("Failed to create milestone");
        toast.success("Milestone added");
      }

      setFormData({ name: "", amount: "", date: "", notes: "" });
      setIsAdding(false);
      setEditingId(null);
      onUpdate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save milestone");
    }
  };

  const handleEdit = (milestone: GoalMilestone) => {
    setEditingId(milestone.id);
    setFormData({
      name: milestone.milestone_name,
      amount: milestone.milestone_amount.toString(),
      date: milestone.milestone_date ? milestone.milestone_date : "",
      notes: milestone.notes || "",
    });
    setIsAdding(true);
  };

  const handleDelete = async (milestoneId: string) => {
    if (!confirm("Are you sure you want to delete this milestone?")) return;

    try {
      const response = await fetch(`/api/goals/${goalId}/milestones`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ milestoneId }),
      });

      if (!response.ok) throw new Error("Failed to delete milestone");
      toast.success("Milestone deleted");
      onUpdate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete milestone");
    }
  };

  const handleToggleAchieved = async (milestone: GoalMilestone) => {
    try {
      const response = await fetch(`/api/goals/${goalId}/milestones`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          milestoneId: milestone.id,
          isAchieved: !milestone.achieved_at,
        }),
      });

      if (!response.ok) throw new Error("Failed to update milestone");
      toast.success(milestone.achieved_at ? "Milestone unmarked" : "Milestone achieved!");
      onUpdate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update milestone");
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ name: "", amount: "", date: "", notes: "" });
  };

  // Sort milestones by amount
  const sortedMilestones = [...milestones].sort((a, b) => a.milestone_amount - b.milestone_amount);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Milestones</h3>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1 text-sm text-sky-600 hover:text-sky-700 font-medium"
          >
            <Plus className="h-4 w-4" />
            Add Milestone
          </button>
        )}
      </div>

      {/* Add/Edit Form */}
      {isAdding && (
        <form onSubmit={handleSubmit} className="border rounded-lg p-4 bg-gray-50 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Milestone Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              placeholder="e.g., 25% Complete"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              required
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target Date (Optional)</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              rows={2}
              placeholder="Any additional details..."
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors"
            >
              {editingId ? "Update" : "Add"} Milestone
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 border rounded-lg hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Milestones List */}
      {sortedMilestones.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">
          No milestones yet. Add one to track your progress!
        </div>
      ) : (
        <div className="space-y-2">
          {sortedMilestones.map((milestone, index) => {
            const isAchieved = milestone.achieved_at || isMilestoneAchieved(milestone.milestone_amount, currentAmount);
            const isAutoAchieved = !milestone.achieved_at && isAchieved;

            return (
              <div
                key={milestone.id}
                className={`border rounded-lg p-4 transition-all ${
                  isAchieved ? "bg-emerald-50 border-emerald-200" : "bg-white"
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Achievement Checkbox */}
                  <button
                    onClick={() => handleToggleAchieved(milestone)}
                    className={`mt-1 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      isAchieved
                        ? "bg-emerald-500 border-emerald-500"
                        : "border-gray-300 hover:border-emerald-500"
                    }`}
                    disabled={isAutoAchieved}
                  >
                    {isAchieved && <Check className="h-3 w-3 text-white" />}
                  </button>

                  {/* Milestone Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className={`font-medium ${isAchieved ? "text-emerald-900" : "text-gray-900"}`}>
                          {milestone.milestone_name}
                        </p>
                        <p className={`text-sm ${isAchieved ? "text-emerald-700" : "text-gray-600"}`}>
                          {formatCurrency(milestone.milestone_amount)}
                        </p>
                        {milestone.milestone_date && (
                          <p className="text-xs text-gray-500 mt-1">
                            Target: {format(new Date(milestone.milestone_date), "MMM d, yyyy")}
                          </p>
                        )}
                        {milestone.notes && (
                          <p className="text-xs text-gray-500 mt-1">{milestone.notes}</p>
                        )}
                        {isAutoAchieved && (
                          <p className="text-xs text-emerald-600 mt-1">Automatically achieved!</p>
                        )}
                      </div>

                      {/* Actions */}
                      {!isAchieved && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEdit(milestone)}
                            className="p-1 text-gray-400 hover:text-sky-600 transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(milestone.id)}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
