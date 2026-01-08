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
import { Textarea } from "@/components/ui/textarea";
import { DollarSign, Loader2, Flame, Receipt, Info, Plus } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/cn";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface CreateTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

// Chore type - Expected (part of pocket money, streak tracking) vs Extra (invoiceable)
type ChoreType = "expected" | "extra";

const DEFAULT_CATEGORY_OPTIONS = [
  { value: "bedroom", label: "Bedroom" },
  { value: "bathroom", label: "Bathroom" },
  { value: "kitchen", label: "Kitchen" },
  { value: "living_areas", label: "Living Areas" },
  { value: "outdoor", label: "Outdoor" },
  { value: "pets", label: "Pets" },
  { value: "self_care", label: "Self Care" },
  { value: "helpful", label: "Helpful Tasks" },
  { value: "custom", label: "Custom" },
];

const EMOJI_OPTIONS = [
  "📋", "🧹", "🧺", "🧽", "🪣", "🗑️", "🧸", "📚", "🎒", "🛏️",
  "🚿", "🪥", "🧼", "🐕", "🐈", "🌱", "🍽️", "🥗", "🧹", "🚗",
];

const DAYS_OF_WEEK = [
  { value: 0, label: "M" },
  { value: 1, label: "T" },
  { value: 2, label: "W" },
  { value: 3, label: "T" },
  { value: 4, label: "F" },
  { value: 5, label: "S" },
  { value: 6, label: "S" },
];

export function CreateTemplateDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateTemplateDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("📋");
  const [category, setCategory] = useState("custom");
  const [choreType, setChoreType] = useState<ChoreType>("extra");
  const [earnableAmount, setEarnableAmount] = useState("0.00");
  const [estimatedMinutes, setEstimatedMinutes] = useState("");
  const [ageMin, setAgeMin] = useState("");
  const [ageMax, setAgeMax] = useState("");
  const [maxPerWeek, setMaxPerWeek] = useState("");
  const [allowedDays, setAllowedDays] = useState<number[]>([]);
  const [autoApprove, setAutoApprove] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Custom categories
  const [customCategories, setCustomCategories] = useState<{value: string; label: string}[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categoryPopoverOpen, setCategoryPopoverOpen] = useState(false);

  const allCategories = [...DEFAULT_CATEGORY_OPTIONS, ...customCategories];

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    const value = newCategoryName.trim().toLowerCase().replace(/\s+/g, "_");
    if (allCategories.some(c => c.value === value)) return;
    setCustomCategories([...customCategories, { value, label: newCategoryName.trim() }]);
    setCategory(value);
    setNewCategoryName("");
    setCategoryPopoverOpen(false);
  };

  const toggleDay = (day: number) => {
    setAllowedDays((prev) =>
      prev.includes(day)
        ? prev.filter((d) => d !== day)
        : [...prev, day].sort((a, b) => a - b)
    );
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setIcon("📋");
    setCategory("custom");
    setChoreType("extra");
    setEarnableAmount("0.00");
    setEstimatedMinutes("");
    setAgeMin("");
    setAgeMax("");
    setMaxPerWeek("");
    setAllowedDays([]);
    setAutoApprove(false);
    setNewCategoryName("");
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;

    setIsSubmitting(true);

    try {
      // Expected chores don't have monetary rewards - they're part of pocket money
      const isExpected = choreType === "expected";

      const res = await fetch("/api/chores/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          icon,
          category,
          is_expected: isExpected,
          // Only include earnable amount for extra chores (always money)
          currency_type: isExpected ? null : "money",
          currency_amount: isExpected ? null : parseFloat(earnableAmount),
          estimated_minutes: estimatedMinutes ? parseInt(estimatedMinutes) : null,
          recommended_age_min: ageMin ? parseInt(ageMin) : null,
          recommended_age_max: ageMax ? parseInt(ageMax) : null,
          max_per_week: maxPerWeek ? parseInt(maxPerWeek) : null,
          allowed_days: allowedDays.length > 0 ? allowedDays : null,
          auto_approve: autoApprove,
        }),
      });

      if (res.ok) {
        resetForm();
        onCreated();
      }
    } catch (err) {
      console.error("Failed to create template:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Custom Chore</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
          {/* Chore Type Toggle */}
          <div className="space-y-2">
            <Label>Chore Type *</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setChoreType("expected")}
                className={cn(
                  "p-3 rounded-lg border-2 text-left transition-all",
                  choreType === "expected"
                    ? "border-sage bg-sage-very-light"
                    : "border-silver-light hover:border-sage-light"
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Flame className="h-4 w-4 text-gold" />
                  <span className="font-medium text-text-dark">Expected</span>
                </div>
                <p className="text-xs text-text-medium">
                  Part of pocket money. Builds streaks & habits.
                </p>
              </button>
              <button
                type="button"
                onClick={() => setChoreType("extra")}
                className={cn(
                  "p-3 rounded-lg border-2 text-left transition-all",
                  choreType === "extra"
                    ? "border-sage bg-sage-very-light"
                    : "border-silver-light hover:border-sage-light"
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Receipt className="h-4 w-4 text-sage" />
                  <span className="font-medium text-text-dark">Extra</span>
                </div>
                <p className="text-xs text-text-medium">
                  Earns money via invoice. One-off jobs.
                </p>
              </button>
            </div>
            {choreType === "expected" && (
              <div className="flex items-start gap-2 p-2 rounded-md bg-blue-light mt-2">
                <Info className="h-4 w-4 text-blue mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue">
                  Expected chores are included in pocket money - no separate payment.
                  They track streaks to build habits.
                </p>
              </div>
            )}
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Chore Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Feed the fish"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Icon */}
          <div className="space-y-2">
            <Label>Icon</Label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  className={cn(
                    "w-10 h-10 rounded-lg text-xl flex items-center justify-center border-2 transition-all",
                    icon === emoji
                      ? "border-sage bg-sage-very-light"
                      : "border-silver-light hover:border-sage-light"
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Optional details about the chore..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Category</Label>
            <Popover open={categoryPopoverOpen} onOpenChange={setCategoryPopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="w-full h-10 px-3 text-left border border-silver-light rounded-md flex items-center justify-between text-sm hover:border-sage-light transition-colors"
                >
                  <span>{allCategories.find(c => c.value === category)?.label || "Select category"}</span>
                  <svg className="h-4 w-4 text-text-medium" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-2" align="start">
                <div className="space-y-1 max-h-[200px] overflow-y-auto">
                  {allCategories.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setCategory(option.value);
                        setCategoryPopoverOpen(false);
                      }}
                      className={cn(
                        "w-full text-left px-2 py-1.5 text-sm rounded hover:bg-silver-very-light transition-colors",
                        category === option.value && "bg-sage-very-light text-sage-dark font-medium"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <div className="border-t border-silver-light mt-2 pt-2">
                  <div className="flex gap-1">
                    <Input
                      placeholder="New category..."
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddCategory();
                        }
                      }}
                      className="h-8 text-sm"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleAddCategory}
                      disabled={!newCategoryName.trim()}
                      className="h-8 px-2"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Reward - Only for Extra chores */}
          {choreType === "extra" && (
            <div className="space-y-2">
              <Label>Earnable Amount ($) *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sage" />
                <Input
                  type="number"
                  min="0.50"
                  step="0.50"
                  placeholder="e.g., 5.00"
                  value={earnableAmount}
                  onChange={(e) => setEarnableAmount(e.target.value)}
                  className="pl-9"
                />
              </div>
              <p className="text-xs text-text-medium">
                This amount can be invoiced when the chore is completed.
              </p>
            </div>
          )}

          {/* Estimated Time */}
          <div className="space-y-2">
            <Label htmlFor="minutes">Estimated Time (minutes)</Label>
            <Input
              id="minutes"
              type="number"
              min="1"
              placeholder="e.g., 15"
              value={estimatedMinutes}
              onChange={(e) => setEstimatedMinutes(e.target.value)}
            />
          </div>

          {/* Age Range */}
          <div className="space-y-2">
            <Label>Recommended Age Range</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="2"
                max="18"
                placeholder="Min"
                value={ageMin}
                onChange={(e) => setAgeMin(e.target.value)}
                className="w-20"
              />
              <span className="text-text-medium">to</span>
              <Input
                type="number"
                min="2"
                max="18"
                placeholder="Max"
                value={ageMax}
                onChange={(e) => setAgeMax(e.target.value)}
                className="w-20"
              />
              <span className="text-text-medium">years</span>
            </div>
          </div>

          {/* Max Per Week */}
          <div className="space-y-2">
            <Label htmlFor="maxPerWeek">Max Times Per Week</Label>
            <Input
              id="maxPerWeek"
              type="number"
              min="1"
              max="7"
              placeholder="Leave empty for unlimited"
              value={maxPerWeek}
              onChange={(e) => setMaxPerWeek(e.target.value)}
            />
            <p className="text-xs text-text-medium">
              Limit how often this chore can be done per week.
            </p>
          </div>

          {/* Allowed Days */}
          <div className="space-y-2">
            <Label>Available Days (optional)</Label>
            <div className="flex gap-2">
              {DAYS_OF_WEEK.map((day) => (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleDay(day.value)}
                  className={cn(
                    "w-9 h-9 rounded-full text-sm font-medium transition-all",
                    allowedDays.includes(day.value)
                      ? "bg-sage text-white"
                      : "bg-silver-very-light text-text-medium hover:bg-silver-light"
                  )}
                >
                  {day.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-text-medium">
              Select which days this chore is available. Leave empty for all days.
            </p>
          </div>

          {/* Auto Approve */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-silver-very-light">
            <div className="space-y-0.5">
              <Label htmlFor="autoApprove" className="cursor-pointer">
                Auto-approve when done
              </Label>
              <p className="text-xs text-text-medium">
                Skip parent approval for simple chores like &quot;make bed&quot;.
              </p>
            </div>
            <Switch
              id="autoApprove"
              checked={autoApprove}
              onCheckedChange={setAutoApprove}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>Create Chore</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
