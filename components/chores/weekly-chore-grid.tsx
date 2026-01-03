"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { Check, Clock, Circle, Plus, Star, DollarSign } from "lucide-react";
import Image from "next/image";

interface ChildProfile {
  id: string;
  name: string;
  avatar_url: string | null;
}

interface ChoreAssignment {
  id: string;
  child_profile_id: string;
  day_of_week: number | null;
  status: string;
  currency_type: string;
  currency_amount: number;
  chore_template: {
    id: string;
    name: string;
    icon: string | null;
  } | null;
  child: {
    id: string;
    name: string;
  } | null;
}

interface WeeklyChoreGridProps {
  children: ChildProfile[];
  assignments: ChoreAssignment[];
  weekStarting: string;
  onAssignChore: (childId: string, dayOfWeek: number | null) => void;
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
  approved: {
    bg: "bg-sage-very-light",
    border: "border-sage",
    icon: Check,
    iconColor: "text-sage",
  },
};

const CURRENCY_ICONS = {
  stars: { icon: Star, color: "text-gold" },
  screen_time: { icon: Clock, color: "text-blue" },
  money: { icon: DollarSign, color: "text-sage" },
};

export function WeeklyChoreGrid({
  children,
  assignments,
  weekStarting,
  onAssignChore,
}: WeeklyChoreGridProps) {
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
      (a) => a.status === "done" || a.status === "approved"
    ).length;
    return { total, completed };
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
          {children.map((child) => {
            const stats = getChildStats(child.id);
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
                      ) : (
                        "👤"
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-text-dark text-sm">
                        {child.name}
                      </p>
                      <p className="text-xs text-text-light">
                        {stats.completed}/{stats.total} done
                      </p>
                    </div>
                  </div>
                </td>

                {/* Day Columns */}
                {DAYS_OF_WEEK.map((_, dayIndex) => {
                  const cellAssignments = getAssignmentsForCell(child.id, dayIndex);

                  return (
                    <td key={dayIndex} className="p-1">
                      <div className="min-h-[60px] space-y-1">
                        {cellAssignments.map((assignment) => {
                          const style = STATUS_STYLES[assignment.status as keyof typeof STATUS_STYLES] || STATUS_STYLES.pending;
                          const StatusIcon = style.icon;
                          const currency = CURRENCY_ICONS[assignment.currency_type as keyof typeof CURRENCY_ICONS];
                          const CurrencyIcon = currency?.icon || Star;

                          return (
                            <div
                              key={assignment.id}
                              className={cn(
                                "p-1.5 rounded border text-xs",
                                style.bg,
                                style.border
                              )}
                            >
                              <div className="flex items-center gap-1">
                                <span>{assignment.chore_template?.icon || "📋"}</span>
                                <span className="flex-1 truncate font-medium">
                                  {assignment.chore_template?.name}
                                </span>
                                <StatusIcon className={cn("h-3 w-3 shrink-0", style.iconColor)} />
                              </div>
                              <div className={cn("flex items-center gap-0.5 mt-0.5", currency?.color)}>
                                <CurrencyIcon className="h-2.5 w-2.5" />
                                <span>
                                  {assignment.currency_type === "money" && "$"}
                                  {assignment.currency_amount}
                                </span>
                              </div>
                            </div>
                          );
                        })}
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
                <td className="p-1">
                  <div className="min-h-[60px] space-y-1">
                    {getUnscheduledAssignments(child.id).map((assignment) => {
                      const style = STATUS_STYLES[assignment.status as keyof typeof STATUS_STYLES] || STATUS_STYLES.pending;
                      const StatusIcon = style.icon;

                      return (
                        <div
                          key={assignment.id}
                          className={cn(
                            "p-1.5 rounded border text-xs",
                            style.bg,
                            style.border
                          )}
                        >
                          <div className="flex items-center gap-1">
                            <span>{assignment.chore_template?.icon || "📋"}</span>
                            <span className="flex-1 truncate font-medium">
                              {assignment.chore_template?.name}
                            </span>
                            <StatusIcon className={cn("h-3 w-3 shrink-0", style.iconColor)} />
                          </div>
                        </div>
                      );
                    })}
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
