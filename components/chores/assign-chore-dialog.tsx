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
import { DollarSign, Loader2, Flame } from "lucide-react";
import { cn } from "@/lib/cn";
import Image from "next/image";

interface ChoreTemplate {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  is_expected?: boolean;
  currency_type: string | null;
  currency_amount: number | null;
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
  const [currencyType, setCurrencyType] = useState(template.currency_type || "money");
  const [currencyAmount, setCurrencyAmount] = useState(
    (template.currency_amount ?? 5).toString()
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isExpected = template.is_expected === true;

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
            // Expected chores don't have currency rewards
            currency_type: isExpected ? null : currencyType,
            currency_amount: isExpected ? null : parseFloat(currencyAmount),
          });
        } else {
          // Create assignment for each selected day
          for (const day of selectedDays) {
            assignments.push({
              child_profile_id: childId,
              chore_template_id: template.id,
              week_starting: weekStarting,
              day_of_week: parseInt(day),
              // Expected chores don't have currency rewards
              currency_type: isExpected ? null : currencyType,
              currency_amount: isExpected ? null : parseFloat(currencyAmount),
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

          {/* Reward Settings - Only for Extra chores */}
          {isExpected ? (
            <div className="flex items-start gap-2 p-3 rounded-md bg-gold-light">
              <Flame className="h-4 w-4 text-gold mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gold-dark">Expected Chore</p>
                <p className="text-xs text-gold-dark/80">
                  This chore is part of pocket money - no separate payment. Streaks will be tracked.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Label>Earnable Amount</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sage" />
                <Input
                  type="number"
                  min="0"
                  step="0.50"
                  value={currencyAmount}
                  onChange={(e) => setCurrencyAmount(e.target.value)}
                  className="pl-9"
                />
              </div>
              <p className="text-xs text-text-light">
                This amount will be added to the child's invoice when approved.
              </p>
            </div>
          )}
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
