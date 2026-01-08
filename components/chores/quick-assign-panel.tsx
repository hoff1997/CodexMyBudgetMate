"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/cn";
import {
  Search,
  Plus,
  ChevronLeft,
  DollarSign,
  Flame,
  Users,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

interface ChildProfile {
  id: string;
  name: string;
  avatar_url: string | null;
  avatar_emoji?: string | null;
}

interface ChoreTemplate {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  category: string;
  is_expected: boolean;
  currency_type: string | null;
  currency_amount: number | null;
}

interface QuickAssignPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: ChoreTemplate[];
  childProfiles: ChildProfile[];
  weekStarting: string;
  preselectedChildId?: string;
  preselectedDayOfWeek?: number | null;
  onCreated: () => void;
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Mon", short: "M" },
  { value: 1, label: "Tue", short: "T" },
  { value: 2, label: "Wed", short: "W" },
  { value: 3, label: "Thu", short: "T" },
  { value: 4, label: "Fri", short: "F" },
  { value: 5, label: "Sat", short: "S" },
  { value: 6, label: "Sun", short: "S" },
];

const RECENT_CHORES_KEY = "mybudgetmate_recent_chores";

export function QuickAssignPanel({
  open,
  onOpenChange,
  templates,
  childProfiles,
  weekStarting,
  preselectedChildId,
  preselectedDayOfWeek,
  onCreated,
}: QuickAssignPanelProps) {
  // Step management
  const [step, setStep] = useState<"pick" | "configure">("pick");
  const [selectedTemplate, setSelectedTemplate] = useState<ChoreTemplate | null>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState("");

  // Configuration
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [assignmentType, setAssignmentType] = useState<"single" | "both" | "rotate">("single");
  const [selectedChildId, setSelectedChildId] = useState<string>("");
  const [rotationStyle, setRotationStyle] = useState<"weekly" | "per_occurrence">("weekly");

  // Loading
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Recent chores from localStorage
  const [recentChoreIds, setRecentChoreIds] = useState<string[]>([]);

  // Load recent chores on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(RECENT_CHORES_KEY);
      if (stored) {
        try {
          setRecentChoreIds(JSON.parse(stored));
        } catch {
          setRecentChoreIds([]);
        }
      }
    }
  }, []);

  // Reset state when panel opens
  useEffect(() => {
    if (open) {
      setStep("pick");
      setSelectedTemplate(null);
      setSearchQuery("");
      setSelectedDays(preselectedDayOfWeek !== undefined && preselectedDayOfWeek !== null
        ? [preselectedDayOfWeek]
        : []);
      setAssignmentType(preselectedChildId ? "single" : "single");
      setSelectedChildId(preselectedChildId || (childProfiles.length === 1 ? childProfiles[0].id : ""));
      setRotationStyle("weekly");
    }
  }, [open, preselectedChildId, preselectedDayOfWeek, childProfiles]);

  // Get recent chores
  const recentChores = useMemo(() => {
    return recentChoreIds
      .map((id) => templates.find((t) => t.id === id))
      .filter(Boolean)
      .slice(0, 5) as ChoreTemplate[];
  }, [recentChoreIds, templates]);

  // Filter templates by search
  const filteredTemplates = useMemo(() => {
    if (!searchQuery) return templates;
    const query = searchQuery.toLowerCase();
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query)
    );
  }, [templates, searchQuery]);

  // Save to recent chores
  const saveToRecent = (templateId: string) => {
    const updated = [templateId, ...recentChoreIds.filter((id) => id !== templateId)].slice(0, 10);
    setRecentChoreIds(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem(RECENT_CHORES_KEY, JSON.stringify(updated));
    }
  };

  // Handle template selection
  const handleSelectTemplate = (template: ChoreTemplate) => {
    setSelectedTemplate(template);
    setStep("configure");
  };

  // Toggle day selection
  const toggleDay = (dayValue: number) => {
    setSelectedDays((prev) =>
      prev.includes(dayValue)
        ? prev.filter((d) => d !== dayValue)
        : [...prev, dayValue]
    );
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!selectedTemplate) return;
    if (selectedDays.length === 0) {
      toast.error("Please select at least one day");
      return;
    }
    if (assignmentType === "single" && !selectedChildId) {
      toast.error("Please select a child");
      return;
    }

    setIsSubmitting(true);

    try {
      // Determine which children to assign to
      let childIds: string[] = [];
      if (assignmentType === "single") {
        childIds = [selectedChildId];
      } else if (assignmentType === "both") {
        childIds = childProfiles.map((c) => c.id);
      } else if (assignmentType === "rotate") {
        // For rotation, we create a schedule, not direct assignments
        const scheduleRes = await fetch("/api/chores/schedules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: `${selectedTemplate.name} rotation`,
            chore_template_id: selectedTemplate.id,
            frequency: rotationStyle === "weekly" ? "weekly" : "daily",
            days_of_week: selectedDays,
            start_date: weekStarting,
            rotation_children: childProfiles.map((c) => c.id),
            rotation_style: rotationStyle,
          }),
        });

        if (!scheduleRes.ok) {
          throw new Error("Failed to create rotation schedule");
        }

        // Also create immediate assignments for this week
        for (const day of selectedDays) {
          // First child gets first assignment (rotation will handle future weeks)
          await fetch("/api/chores/assignments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chore_template_id: selectedTemplate.id,
              child_profile_id: childProfiles[0].id,
              week_starting: weekStarting,
              day_of_week: day,
              currency_type: selectedTemplate.currency_type || "money",
              currency_amount: selectedTemplate.currency_amount || 0,
            }),
          });
        }

        saveToRecent(selectedTemplate.id);
        toast.success("Rotation schedule created!");
        onCreated();
        return;
      }

      // Create assignments for each child and day combination
      const assignmentPromises = [];
      for (const childId of childIds) {
        for (const day of selectedDays) {
          assignmentPromises.push(
            fetch("/api/chores/assignments", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chore_template_id: selectedTemplate.id,
                child_profile_id: childId,
                week_starting: weekStarting,
                day_of_week: day,
                currency_type: selectedTemplate.currency_type || "money",
                currency_amount: selectedTemplate.currency_amount || 0,
              }),
            })
          );
        }
      }

      await Promise.all(assignmentPromises);

      // Create schedules for weekly repeat
      if (assignmentType === "single") {
        // Single child - create one schedule
        await fetch("/api/chores/schedules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: `${selectedTemplate.name} weekly`,
            chore_template_id: selectedTemplate.id,
            child_profile_id: selectedChildId,
            frequency: "weekly",
            days_of_week: selectedDays,
            start_date: weekStarting,
          }),
        });
      } else if (assignmentType === "both") {
        // Both kids - create a schedule for each child
        await Promise.all(
          childProfiles.map((child) =>
            fetch("/api/chores/schedules", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: `${selectedTemplate.name} weekly - ${child.name}`,
                chore_template_id: selectedTemplate.id,
                child_profile_id: child.id,
                frequency: "weekly",
                days_of_week: selectedDays,
                start_date: weekStarting,
              }),
            })
          )
        );
      }

      saveToRecent(selectedTemplate.id);
      toast.success("Chore assigned and schedule created!");
      onCreated();
    } catch (error) {
      console.error("Error creating assignment:", error);
      toast.error("Failed to create assignment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {step === "configure" && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setStep("pick")}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            {step === "pick" ? "Add Chore" : selectedTemplate?.name}
          </SheetTitle>
        </SheetHeader>

        {/* Step 1: Pick a Chore */}
        {step === "pick" && (
          <div className="mt-6 space-y-6">
            {/* Recent Chores */}
            {recentChores.length > 0 && (
              <div>
                <Label className="text-sm text-text-medium mb-2 block">
                  Recent
                </Label>
                <div className="space-y-2">
                  {recentChores.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleSelectTemplate(template)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg border border-silver-light hover:border-sage hover:bg-sage-very-light transition-colors text-left"
                    >
                      <span className="text-2xl">{template.icon || "📋"}</span>
                      <div className="flex-1">
                        <p className="font-medium text-text-dark">{template.name}</p>
                        <p className="text-xs text-text-medium flex items-center gap-1">
                          {template.is_expected ? (
                            <>
                              <Flame className="h-3 w-3 text-gold" />
                              Expected
                            </>
                          ) : (
                            <>
                              <DollarSign className="h-3 w-3 text-sage" />
                              ${template.currency_amount || 0}
                            </>
                          )}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-light" />
              <Input
                placeholder="Search chores..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* All Chores */}
            <div>
              <Label className="text-sm text-text-medium mb-2 block">
                All Chores
              </Label>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {filteredTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleSelectTemplate(template)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-silver-light hover:border-sage hover:bg-sage-very-light transition-colors text-left"
                  >
                    <span className="text-2xl">{template.icon || "📋"}</span>
                    <div className="flex-1">
                      <p className="font-medium text-text-dark">{template.name}</p>
                      <p className="text-xs text-text-medium flex items-center gap-1">
                        {template.is_expected ? (
                          <>
                            <Flame className="h-3 w-3 text-gold" />
                            Expected
                          </>
                        ) : (
                          <>
                            <DollarSign className="h-3 w-3 text-sage" />
                            ${template.currency_amount || 0}
                          </>
                        )}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Create New */}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                // TODO: Open create template dialog
                toast.info("Create new chore coming soon!");
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create New Chore
            </Button>
          </div>
        )}

        {/* Step 2: Configure Schedule */}
        {step === "configure" && selectedTemplate && (
          <div className="mt-6 space-y-6">
            {/* Selected Chore Display */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-sage-very-light border border-sage-light">
              <span className="text-3xl">{selectedTemplate.icon || "📋"}</span>
              <div>
                <p className="font-semibold text-text-dark">{selectedTemplate.name}</p>
                <p className="text-sm text-text-medium">
                  {selectedTemplate.is_expected ? (
                    <span className="flex items-center gap-1">
                      <Flame className="h-3 w-3 text-gold" />
                      Expected chore
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3 text-sage" />
                      ${selectedTemplate.currency_amount || 0} per completion
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Which Days */}
            <div>
              <Label className="text-sm font-medium text-text-dark mb-3 block">
                Which days?
              </Label>
              <div className="flex gap-2">
                {DAYS_OF_WEEK.map((day) => (
                  <button
                    key={day.value}
                    onClick={() => toggleDay(day.value)}
                    className={cn(
                      "flex-1 py-2 px-1 rounded-lg border text-sm font-medium transition-colors",
                      selectedDays.includes(day.value)
                        ? "bg-sage text-white border-sage"
                        : "bg-white text-text-medium border-silver-light hover:border-sage"
                    )}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDays([0, 1, 2, 3, 4])}
                >
                  Weekdays
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDays([0, 1, 2, 3, 4, 5, 6])}
                >
                  Every day
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDays([5, 6])}
                >
                  Weekend
                </Button>
              </div>
            </div>

            {/* Who Does It */}
            <div>
              <Label className="text-sm font-medium text-text-dark mb-3 block">
                Who does it?
              </Label>
              <RadioGroup
                value={assignmentType}
                onValueChange={(v) => setAssignmentType(v as typeof assignmentType)}
                className="space-y-2"
              >
                {childProfiles.map((child) => (
                  <div
                    key={child.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer",
                      assignmentType === "single" && selectedChildId === child.id
                        ? "border-sage bg-sage-very-light"
                        : "border-silver-light hover:border-sage"
                    )}
                    onClick={() => {
                      setAssignmentType("single");
                      setSelectedChildId(child.id);
                    }}
                  >
                    <RadioGroupItem value={`single-${child.id}`} id={`child-${child.id}`} className="sr-only" />
                    <div className="w-8 h-8 rounded-full bg-sage-light flex items-center justify-center">
                      {child.avatar_emoji || "👤"}
                    </div>
                    <span className="font-medium text-text-dark">{child.name} only</span>
                  </div>
                ))}

                {childProfiles.length > 1 && (
                  <>
                    <div
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer",
                        assignmentType === "both"
                          ? "border-sage bg-sage-very-light"
                          : "border-silver-light hover:border-sage"
                      )}
                      onClick={() => setAssignmentType("both")}
                    >
                      <RadioGroupItem value="both" id="both" className="sr-only" />
                      <div className="w-8 h-8 rounded-full bg-sage-light flex items-center justify-center">
                        <Users className="h-4 w-4 text-sage-dark" />
                      </div>
                      <div>
                        <span className="font-medium text-text-dark">Both kids</span>
                        <p className="text-xs text-text-medium">Each does their own</p>
                      </div>
                    </div>

                    <div
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer",
                        assignmentType === "rotate"
                          ? "border-sage bg-sage-very-light"
                          : "border-silver-light hover:border-sage"
                      )}
                      onClick={() => setAssignmentType("rotate")}
                    >
                      <RadioGroupItem value="rotate" id="rotate" className="sr-only" />
                      <div className="w-8 h-8 rounded-full bg-sage-light flex items-center justify-center">
                        <RotateCcw className="h-4 w-4 text-sage-dark" />
                      </div>
                      <div>
                        <span className="font-medium text-text-dark">Rotate between kids</span>
                        <p className="text-xs text-text-medium">Takes turns fairly</p>
                      </div>
                    </div>
                  </>
                )}
              </RadioGroup>
            </div>

            {/* Rotation Style (only if rotate selected) */}
            {assignmentType === "rotate" && (
              <div className="p-4 rounded-lg bg-silver-very-light border border-silver-light">
                <Label className="text-sm font-medium text-text-dark mb-3 block">
                  Rotation style
                </Label>
                <RadioGroup
                  value={rotationStyle}
                  onValueChange={(v) => setRotationStyle(v as typeof rotationStyle)}
                  className="space-y-2"
                >
                  <div
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border bg-white cursor-pointer",
                      rotationStyle === "weekly"
                        ? "border-sage"
                        : "border-silver-light"
                    )}
                    onClick={() => setRotationStyle("weekly")}
                  >
                    <RadioGroupItem value="weekly" id="weekly" />
                    <div>
                      <Label htmlFor="weekly" className="font-medium cursor-pointer">
                        Weekly
                      </Label>
                      <p className="text-xs text-text-medium">
                        One kid owns the whole week, then it switches
                      </p>
                    </div>
                  </div>
                  <div
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border bg-white cursor-pointer",
                      rotationStyle === "per_occurrence"
                        ? "border-sage"
                        : "border-silver-light"
                    )}
                    onClick={() => setRotationStyle("per_occurrence")}
                  >
                    <RadioGroupItem value="per_occurrence" id="per_occurrence" />
                    <div>
                      <Label htmlFor="per_occurrence" className="font-medium cursor-pointer">
                        Per-occurrence
                      </Label>
                      <p className="text-xs text-text-medium">
                        Each time the chore is due, it goes to the next kid
                      </p>
                    </div>
                  </div>
                </RadioGroup>
              </div>
            )}

            {/* Submit */}
            <div className="pt-4 border-t">
              <Button
                className="w-full bg-sage hover:bg-sage-dark"
                onClick={handleSubmit}
                disabled={isSubmitting || selectedDays.length === 0}
              >
                {isSubmitting ? "Saving..." : "Save Schedule"}
              </Button>
              <p className="text-xs text-text-medium text-center mt-2">
                This will repeat every week automatically
              </p>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
