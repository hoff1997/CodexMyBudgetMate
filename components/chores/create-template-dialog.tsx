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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Star, Clock, DollarSign, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

interface CreateTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

const CATEGORY_OPTIONS = [
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

const CURRENCY_OPTIONS = [
  { value: "stars", label: "Stars", icon: Star, color: "text-gold" },
  { value: "screen_time", label: "Screen Time (min)", icon: Clock, color: "text-blue" },
  { value: "money", label: "Money ($)", icon: DollarSign, color: "text-sage" },
];

const EMOJI_OPTIONS = [
  "📋", "🧹", "🧺", "🧽", "🪣", "🗑️", "🧸", "📚", "🎒", "🛏️",
  "🚿", "🪥", "🧼", "🐕", "🐈", "🌱", "🍽️", "🥗", "🧹", "🚗",
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
  const [currencyType, setCurrencyType] = useState("stars");
  const [currencyAmount, setCurrencyAmount] = useState("1");
  const [estimatedMinutes, setEstimatedMinutes] = useState("");
  const [ageMin, setAgeMin] = useState("");
  const [ageMax, setAgeMax] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setName("");
    setDescription("");
    setIcon("📋");
    setCategory("custom");
    setCurrencyType("stars");
    setCurrencyAmount("1");
    setEstimatedMinutes("");
    setAgeMin("");
    setAgeMax("");
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/chores/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          icon,
          category,
          default_currency_type: currencyType,
          default_currency_amount: parseFloat(currencyAmount),
          estimated_minutes: estimatedMinutes ? parseInt(estimatedMinutes) : null,
          recommended_age_min: ageMin ? parseInt(ageMin) : null,
          recommended_age_max: ageMax ? parseInt(ageMax) : null,
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

  const SelectedCurrencyIcon =
    CURRENCY_OPTIONS.find((c) => c.value === currencyType)?.icon || Star;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Custom Chore</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
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
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reward */}
          <div className="space-y-2">
            <Label>Default Reward</Label>
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
