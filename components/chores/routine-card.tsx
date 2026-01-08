"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, MoreVertical, Play, Pause, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ChoreRoutineWithItems, TimeOfDay } from "@/lib/types/chores";

const TIME_OF_DAY_COLORS: Record<TimeOfDay, string> = {
  morning: "bg-amber-100 text-amber-700",
  afternoon: "bg-orange-100 text-orange-700",
  evening: "bg-indigo-100 text-indigo-700",
  anytime: "bg-gray-100 text-gray-700",
};

const TIME_OF_DAY_ICONS: Record<TimeOfDay, string> = {
  morning: "🌅",
  afternoon: "☀️",
  evening: "🌙",
  anytime: "📋",
};

interface RoutineCardProps {
  routine: ChoreRoutineWithItems;
  onEdit: (routine: ChoreRoutineWithItems) => void;
  onDelete: (routineId: string) => void;
  onToggleActive: (routineId: string, isActive: boolean) => void;
  onAssign: (routine: ChoreRoutineWithItems) => void;
}

export function RoutineCard({
  routine,
  onEdit,
  onDelete,
  onToggleActive,
  onAssign,
}: RoutineCardProps) {
  const timeOfDay = routine.time_of_day as TimeOfDay;
  const totalMinutes = routine.items.reduce((sum, item) => {
    const templateMinutes = (item.chore_template as { estimated_minutes?: number })?.estimated_minutes || 0;
    return sum + templateMinutes;
  }, 0);

  return (
    <Card className={`transition-all ${!routine.is_active ? "opacity-60" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="text-3xl">{routine.icon}</div>
            <div>
              <h3 className="font-semibold text-text-dark">{routine.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={TIME_OF_DAY_COLORS[timeOfDay]}>
                  {TIME_OF_DAY_ICONS[timeOfDay]} {timeOfDay.charAt(0).toUpperCase() + timeOfDay.slice(1)}
                </Badge>
                {totalMinutes > 0 && (
                  <span className="text-xs text-text-light flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    ~{totalMinutes} min
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
              <DropdownMenuItem onClick={() => onEdit(routine)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit Routine
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onToggleActive(routine.id, !routine.is_active)}>
                {routine.is_active ? (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    Pause Routine
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Activate Routine
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(routine.id)}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Routine
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {routine.description && (
          <p className="text-sm text-text-medium mb-3">{routine.description}</p>
        )}

        {/* Chores in routine */}
        <div className="space-y-1">
          <p className="text-xs font-medium text-text-light uppercase tracking-wide mb-2">
            {routine.items.length} chore{routine.items.length !== 1 ? "s" : ""}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {routine.items.slice(0, 5).map((item, index) => {
              const template = item.chore_template as { icon?: string; name: string } | undefined;
              return (
                <Badge key={item.id} variant="outline" className="text-xs">
                  {template?.icon || "📋"} {template?.name}
                </Badge>
              );
            })}
            {routine.items.length > 5 && (
              <Badge variant="outline" className="text-xs">
                +{routine.items.length - 5} more
              </Badge>
            )}
          </div>
        </div>

        {/* Assign button */}
        <Button
          className="w-full mt-4 bg-sage hover:bg-sage-dark"
          onClick={() => onAssign(routine)}
        >
          Assign Routine
        </Button>
      </CardContent>
    </Card>
  );
}
