"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreVertical,
  Calendar,
  User,
  Repeat,
  Play,
  Pause,
  Trash2,
  Clock,
} from "lucide-react";
import { DAYS_OF_WEEK } from "@/lib/types/chores";
import type { ChoreScheduleWithRelations } from "@/lib/types/chores";

interface ScheduleListProps {
  schedules: ChoreScheduleWithRelations[];
  onToggleActive: (scheduleId: string, isActive: boolean) => void;
  onDelete: (scheduleId: string) => void;
}

const FREQUENCY_LABELS: Record<string, string> = {
  daily: "Every day",
  weekly: "Weekly",
  fortnightly: "Every 2 weeks",
  monthly: "Monthly",
};

export function ScheduleList({
  schedules,
  onToggleActive,
  onDelete,
}: ScheduleListProps) {
  if (schedules.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Calendar className="h-12 w-12 text-text-light mx-auto mb-4" />
          <h3 className="text-lg font-medium text-text-dark mb-2">
            No schedules yet
          </h3>
          <p className="text-text-medium">
            Create routines and assign them to set up recurring chore schedules.
          </p>
        </CardContent>
      </Card>
    );
  }

  const formatDays = (days: number[] | null) => {
    if (!days || days.length === 0) return "";
    if (days.length === 7) return "Every day";
    if (
      days.length === 5 &&
      days.includes(1) &&
      days.includes(2) &&
      days.includes(3) &&
      days.includes(4) &&
      days.includes(5)
    )
      return "Weekdays";
    if (days.length === 2 && days.includes(0) && days.includes(6))
      return "Weekends";

    return days
      .map((d) => DAYS_OF_WEEK.find((day) => day.value === d)?.short)
      .join(", ");
  };

  return (
    <div className="space-y-3">
      {schedules.map((schedule) => {
        const isRoutine = !!schedule.routine;
        const name = isRoutine
          ? schedule.routine?.name
          : schedule.chore_template?.name;
        const icon = isRoutine
          ? schedule.routine?.icon
          : schedule.chore_template?.icon;

        return (
          <Card
            key={schedule.id}
            className={`transition-all ${!schedule.is_active ? "opacity-60" : ""}`}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{icon || "📋"}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-text-dark">{name}</h3>
                      {isRoutine && (
                        <Badge variant="secondary" className="text-xs">
                          Routine
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-text-medium">
                      {/* Assigned to */}
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {schedule.child?.name ||
                          (schedule.rotation
                            ? `${schedule.rotation.rotation_members?.length || 0} kids rotating`
                            : "Unassigned")}
                      </span>

                      {/* Frequency */}
                      <span className="flex items-center gap-1">
                        <Repeat className="h-3 w-3" />
                        {FREQUENCY_LABELS[schedule.frequency]}
                        {schedule.days_of_week &&
                          schedule.days_of_week.length > 0 &&
                          schedule.days_of_week.length < 7 && (
                            <span className="text-text-light">
                              ({formatDays(schedule.days_of_week)})
                            </span>
                          )}
                      </span>

                      {/* Next occurrence */}
                      {schedule.next_occurrence_date && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Next:{" "}
                          {new Date(schedule.next_occurrence_date).toLocaleDateString(
                            "en-NZ",
                            { weekday: "short", day: "numeric", month: "short" }
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => onToggleActive(schedule.id, !schedule.is_active)}
                    >
                      {schedule.is_active ? (
                        <>
                          <Pause className="h-4 w-4 mr-2" />
                          Pause Schedule
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Resume Schedule
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDelete(schedule.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Schedule
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
