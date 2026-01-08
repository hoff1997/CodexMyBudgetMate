"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, User, Calendar, Repeat } from "lucide-react";
import { toast } from "sonner";
import {
  SCHEDULE_FREQUENCY_OPTIONS,
  DAYS_OF_WEEK,
  type ChoreRoutineWithItems,
  type ScheduleFrequency,
} from "@/lib/types/chores";

interface ChildProfile {
  id: string;
  name?: string;
  first_name?: string;
  avatar_url?: string | null;
  avatar_emoji?: string | null;
}

interface AssignRoutineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  routine: ChoreRoutineWithItems;
  childProfiles: ChildProfile[];
  onAssigned: () => void;
}

export function AssignRoutineDialog({
  open,
  onOpenChange,
  routine,
  childProfiles,
  onAssigned,
}: AssignRoutineDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedChildId, setSelectedChildId] = useState<string>("");
  const [frequency, setFrequency] = useState<ScheduleFrequency>("daily");
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri default

  const toggleDay = (day: number) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day].sort());
    }
  };

  const handleSubmit = async () => {
    if (!selectedChildId) {
      toast.error("Please select a child");
      return;
    }

    if (frequency === "weekly" && selectedDays.length === 0) {
      toast.error("Please select at least one day");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/chores/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${routine.name} for ${childProfiles.find((c) => c.id === selectedChildId)?.name || childProfiles.find((c) => c.id === selectedChildId)?.first_name}`,
          routine_id: routine.id,
          child_profile_id: selectedChildId,
          frequency,
          days_of_week: frequency === "weekly" ? selectedDays : null,
          time_of_day: routine.time_of_day,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create schedule");
      }

      toast.success("Routine scheduled!");
      onAssigned();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{routine.icon}</span>
            Assign {routine.name}
          </DialogTitle>
          <DialogDescription>
            Set up a recurring schedule for this routine
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Routine Preview */}
          <div className="bg-sage-very-light rounded-lg p-3">
            <p className="text-sm font-medium text-text-dark mb-2">
              {routine.items.length} chores in this routine:
            </p>
            <div className="flex flex-wrap gap-1">
              {routine.items.map((item) => {
                const template = item.chore_template as { icon?: string; name: string } | undefined;
                return (
                  <Badge key={item.id} variant="outline" className="text-xs">
                    {template?.icon || "📋"} {template?.name}
                  </Badge>
                );
              })}
            </div>
          </div>

          {/* Child Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Assign to
            </Label>
            <Select value={selectedChildId} onValueChange={setSelectedChildId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a child" />
              </SelectTrigger>
              <SelectContent>
                {childProfiles.map((child) => (
                  <SelectItem key={child.id} value={child.id}>
                    <span className="flex items-center gap-2">
                      <span>{child.avatar_emoji || child.avatar_url || "👤"}</span>
                      {child.name || child.first_name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Frequency */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Repeat className="h-4 w-4" />
              Repeat
            </Label>
            <Select
              value={frequency}
              onValueChange={(v) => setFrequency(v as ScheduleFrequency)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCHEDULE_FREQUENCY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Days Selection (for weekly) */}
          {frequency === "weekly" && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                On these days
              </Label>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedDays.includes(day.value)
                        ? "bg-sage text-white"
                        : "bg-gray-100 text-text-medium hover:bg-gray-200"
                    }`}
                  >
                    {day.short}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedChildId}
            className="bg-sage hover:bg-sage-dark"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Schedule Routine
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
