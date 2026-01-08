"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { Check, Clock, Circle, Plus, Star, DollarSign, AlertCircle } from "lucide-react";
import Image from "next/image";
import { InlineApprovalCard } from "./inline-approval-card";

interface ChildProfile {
  id: string;
  name: string;
  avatar_url: string | null;
  avatar_emoji?: string | null;
}

interface ChoreAssignment {
  id: string;
  child_profile_id: string;
  day_of_week: number | null;
  status: string;
  currency_type: string;
  currency_amount: number;
  marked_done_at?: string | null;
  proof_photo_url?: string | null;
  completion_notes?: string | null;
  chore_template: {
    id: string;
    name: string;
    icon: string | null;
    is_expected?: boolean;
  } | null;
  child: {
    id: string;
    name: string;
    avatar_url?: string | null;
  } | null;
}

interface WeeklyChoreGridProps {
  childProfiles: ChildProfile[];
  assignments: ChoreAssignment[];
  weekStarting: string;
  onAssignChore: (childId: string, dayOfWeek: number | null) => void;
  onApprove?: (assignmentId: string) => Promise<void>;
  onReject?: (assignmentId: string, reason?: string) => Promise<void>;
}

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const STATUS_STYLES = {
  pending: {
    bg: "bg-silver-very-light",
    border: "border-silver-light",
    icon: Circle,
    iconColor: "text-silver-light",
  },
  done: {
    bg: "bg-gold-light",
    border: "border-gold",
    icon: Clock,
    iconColor: "text-gold",
  },
  pending_approval: {
    bg: "bg-gold-light",
    border: "border-gold",
    icon: Clock,
    iconColor: "text-gold",
  },
  approved: {
    bg: "bg-sage-very-light",
    border: "border-sage",
    icon: Check,
    iconColor: "text-sage",
  },
  rejected: {
    bg: "bg-silver-very-light",
    border: "border-silver",
    icon: AlertCircle,
    iconColor: "text-silver",
  },
};

const CURRENCY_ICONS = {
  stars: { icon: Star, color: "text-gold" },
  screen_time: { icon: Clock, color: "text-blue" },
  money: { icon: DollarSign, color: "text-sage" },
};

export function WeeklyChoreGrid({
  childProfiles,
  assignments,
  weekStarting,
  onAssignChore,
  onApprove,
  onReject,
}: WeeklyChoreGridProps) {
  const [selectedAssignment, setSelectedAssignment] = useState<string | null>(null);

  // Group assignments by child and day
  const getAssignmentsForCell = (childId: string, dayIndex: number | null) => {
    return assignments.filter(
      (a) =>
        a.child_profile_id === childId &&
        (a.day_of_week === dayIndex || (dayIndex === null && a.day_of_week === null))
    );
  };

  // Get unscheduled assignments (no specific day)
  const getUnscheduledAssignments = (childId: string) => {
    return assignments.filter(
      (a) => a.child_profile_id === childId && a.day_of_week === null
    );
  };

  // Calculate stats for a child
  const getChildStats = (childId: string) => {
    const childAssignments = assignments.filter(
      (a) => a.child_profile_id === childId
    );
    const total = childAssignments.length;
    const completed = childAssignments.filter(
      (a) => a.status === "done" || a.status === "approved" || a.status === "pending_approval"
    ).length;
    return { total, completed };
  };

  // Check if assignment needs approval
  const needsApproval = (status: string) => {
    return status === "done" || status === "pending_approval";
  };

  // Handle chore chip click
  const handleChoreClick = (assignment: ChoreAssignment) => {
    if (needsApproval(assignment.status) && onApprove && onReject) {
      setSelectedAssignment(selectedAssignment === assignment.id ? null : assignment.id);
    }
  };

  // Handle approval
  const handleApprove = async (assignmentId: string) => {
    if (onApprove) {
      await onApprove(assignmentId);
      setSelectedAssignment(null);
    }
  };

  // Handle rejection
  const handleReject = async (assignmentId: string, reason?: string) => {
    if (onReject) {
      await onReject(assignmentId, reason);
      setSelectedAssignment(null);
    }
  };

  // Render a single chore chip
  const renderChoreChip = (assignment: ChoreAssignment) => {
    const style = STATUS_STYLES[assignment.status as keyof typeof STATUS_STYLES] || STATUS_STYLES.pending;
    const StatusIcon = style.icon;
    const currency = CURRENCY_ICONS[assignment.currency_type as keyof typeof CURRENCY_ICONS];
    const CurrencyIcon = currency?.icon || Star;
    const isAwaitingApproval = needsApproval(assignment.status);
    const isSelected = selectedAssignment === assignment.id;

    return (
      <div key={assignment.id} className="relative">
        <button
          onClick={() => handleChoreClick(assignment)}
          className={cn(
            "w-full p-1.5 rounded border text-xs text-left transition-all",
            style.bg,
            style.border,
            isAwaitingApproval && "cursor-pointer hover:shadow-md",
            isAwaitingApproval && "ring-2 ring-gold ring-offset-1 animate-pulse",
            isSelected && "ring-2 ring-sage ring-offset-1"
          )}
        >
          <div className="flex items-center gap-1">
            <span>{assignment.chore_template?.icon || "📋"}</span>
            <span className="flex-1 truncate font-medium">
              {assignment.chore_template?.name}
            </span>
            <StatusIcon className={cn("h-3 w-3 shrink-0", style.iconColor)} />
          </div>
          {assignment.currency_amount > 0 && !assignment.chore_template?.is_expected && (
            <div className={cn("flex items-center gap-0.5 mt-0.5", currency?.color)}>
              <CurrencyIcon className="h-2.5 w-2.5" />
              <span>
                {assignment.currency_type === "money" && "$"}
                {assignment.currency_amount}
              </span>
            </div>
          )}
        </button>

        {/* Inline Approval Card */}
        {isSelected && onApprove && onReject && (
          <InlineApprovalCard
            assignment={assignment}
            onApprove={handleApprove}
            onReject={handleReject}
            onClose={() => setSelectedAssignment(null)}
            className="top-full left-0 mt-1"
          />
        )}
      </div>
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-silver-light">
            <th className="p-2 text-left text-sm font-medium text-text-medium w-32">
              Child
            </th>
            {DAYS_OF_WEEK.map((day) => (
              <th
                key={day}
                className="p-2 text-center text-sm font-medium text-text-medium"
              >
                {day}
              </th>
            ))}
            <th className="p-2 text-center text-sm font-medium text-text-medium">
              Anytime
            </th>
          </tr>
        </thead>
        <tbody>
          {childProfiles.map((child) => {
            const stats = getChildStats(child.id);
            const progressPercent = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;

            return (
              <tr key={child.id} className="border-b border-silver-light">
                {/* Child Info */}
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-sage-light flex items-center justify-center text-lg shrink-0">
                      {child.avatar_url ? (
                        <Image
                          src={child.avatar_url}
                          alt={child.name}
                          width={32}
                          height={32}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : child.avatar_emoji ? (
                        child.avatar_emoji
                      ) : (
                        "👤"
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-text-dark text-sm">
                        {child.name}
                      </p>
                      {/* Progress Dots */}
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: Math.min(stats.total, 5) }).map((_, i) => (
                          <div
                            key={i}
                            className={cn(
                              "w-2 h-2 rounded-full",
                              i < stats.completed ? "bg-sage" : "bg-silver-light"
                            )}
                          />
                        ))}
                        {stats.total > 5 && (
                          <span className="text-xs text-text-light ml-1">
                            +{stats.total - 5}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-text-light">
                        {stats.completed}/{stats.total}
                      </p>
                    </div>
                  </div>
                </td>

                {/* Day Columns */}
                {DAYS_OF_WEEK.map((_, dayIndex) => {
                  const cellAssignments = getAssignmentsForCell(child.id, dayIndex);

                  return (
                    <td key={dayIndex} className="p-1 align-top">
                      <div className="min-h-[60px] space-y-1">
                        {cellAssignments.map((assignment) => renderChoreChip(assignment))}
                        {cellAssignments.length === 0 && (
                          <button
                            onClick={() => onAssignChore(child.id, dayIndex)}
                            className="w-full h-[60px] border-2 border-dashed border-silver-light rounded flex items-center justify-center text-silver-light hover:border-sage-light hover:text-sage-light transition-colors"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  );
                })}

                {/* Anytime Column */}
                <td className="p-1 align-top">
                  <div className="min-h-[60px] space-y-1">
                    {getUnscheduledAssignments(child.id).map((assignment) =>
                      renderChoreChip(assignment)
                    )}
                    <button
                      onClick={() => onAssignChore(child.id, null)}
                      className="w-full h-8 border-2 border-dashed border-silver-light rounded flex items-center justify-center text-silver-light hover:border-sage-light hover:text-sage-light transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
