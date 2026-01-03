"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Star, Clock, DollarSign, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import Image from "next/image";

interface ChoreTemplate {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  default_currency_type: string;
  default_currency_amount: number;
}

interface ChildProfile {
  id: string;
  name: string;
  avatar_url: string | null;
}

interface AssignChoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: ChoreTemplate;
  childProfiles: ChildProfile[];
  weekStarting: string;
  onCreated: () => void;
}

const DAYS_OF_WEEK = [
  { value: "0", label: "Monday" },
  { value: "1", label: "Tuesday" },
  { value: "2", label: "Wednesday" },
  { value: "3", label: "Thursday" },
  { value: "4", label: "Friday" },
  { value: "5", label: "Saturday" },
  { value: "6", label: "Sunday" },
];

const CURRENCY_OPTIONS = [
  { value: "stars", label: "Stars", icon: Star, color: "text-gold" },
  { value: "screen_time", label: "Screen Time (min)", icon: Clock, color: "text-blue" },
  { value: "money", label: "Money ($)", icon: DollarSign, color: "text-sage" },
];

export function AssignChoreDialog({
  open,
  onOpenChange,
  template,
  childProfiles,
  weekStarting,
  onCreated,
}: AssignChoreDialogProps) {
  const [selectedChildren, setSelectedChildren] = useState<string[]>([]);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [currencyType, setCurrencyType] = useState(template.default_currency_type);
  const [currencyAmount, setCurrencyAmount] = useState(
    template.default_currency_amount.toString()
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleChild = (childId: string) => {
    setSelectedChildren((prev) =>
      prev.includes(childId)
        ? prev.filter((id) => id !== childId)
        : [...prev, childId]
    );
  };

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = async () => {
    if (selectedChildren.length === 0) return;

    setIsSubmitting(true);

    try {
      // Create assignments for each child and day combination
      const assignments = [];

      for (const childId of selectedChildren) {
        if (selectedDays.length === 0) {
          // Create one assignment without specific day
          assignments.push({
            child_profile_id: childId,
            chore_template_id: template.id,
            week_starting: weekStarting,
            day_of_week: null,
            currency_type: currencyType,
            currency_amount: parseFloat(currencyAmount),
          });
        } else {
          // Create assignment for each selected day
          for (const day of selectedDays) {
            assignments.push({
              child_profile_id: childId,
              chore_template_id: template.id,
              week_starting: weekStarting,
              day_of_week: parseInt(day),
              currency_type: currencyType,
              currency_amount: parseFloat(currencyAmount),
            });
          }
        }
      }

      // Create all assignments
      for (const assignment of assignments) {
        await fetch("/api/chores/assignments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(assignment),
        });
      }

      onCreated();
    } catch (err) {
      console.error("Failed to create assignments:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const SelectedCurrencyIcon =
    CURRENCY_OPTIONS.find((c) => c.value === currencyType)?.icon || Star;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{template.icon || "📋"}</span>
            Assign {template.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Select Children */}
          <div className="space-y-2">
            <Label>Assign to</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {childProfiles.map((child) => (
                <button
                  key={child.id}
                  type="button"
                  onClick={() => toggleChild(child.id)}
                  className={cn(
                    "flex items-center gap-2 p-3 rounded-lg border-2 transition-all",
                    selectedChildren.includes(child.id)
                      ? "border-sage bg-sage-very-light"
                      : "border-silver-light hover:border-sage-light"
                  )}
                >
                  <div className="w-8 h-8 rounded-full bg-sage-light flex items-center justify-center text-lg">
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
                  <span className="font-medium text-text-dark">{child.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Select Days */}
          <div className="space-y-2">
            <Label>Days (optional)</Label>
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map((day) => (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleDay(day.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-all",
                    selectedDays.includes(day.value)
                      ? "border-sage bg-sage text-white"
                      : "border-silver-light hover:border-sage-light"
                  )}
                >
                  {day.label.slice(0, 3)}
                </button>
              ))}
            </div>
            <p className="text-xs text-text-light">
              Leave empty for a weekly chore without specific days
            </p>
          </div>

          {/* Reward Settings */}
          <div className="space-y-4">
            <Label>Reward</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select value={currencyType} onValueChange={setCurrencyType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCY_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    return (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <Icon className={cn("h-4 w-4", option.color)} />
                          {option.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <div className="relative">
                <SelectedCurrencyIcon
                  className={cn(
                    "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4",
                    CURRENCY_OPTIONS.find((c) => c.value === currencyType)?.color
                  )}
                />
                <Input
                  type="number"
                  min="0"
                  step={currencyType === "money" ? "0.50" : "1"}
                  value={currencyAmount}
                  onChange={(e) => setCurrencyAmount(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={selectedChildren.length === 0 || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Assigning...
              </>
            ) : (
              <>Assign Chore</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
