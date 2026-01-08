"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  Plus,
  X,
  GripVertical,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import {
  TIME_OF_DAY_OPTIONS,
  type ChoreTemplate,
  type TimeOfDay,
} from "@/lib/types/chores";

interface CreateRoutineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: ChoreTemplate[];
  onCreated: () => void;
  editRoutine?: {
    id: string;
    name: string;
    description: string | null;
    icon: string;
    time_of_day: TimeOfDay;
    target_time: string | null;
    items: Array<{
      id: string;
      chore_template_id: string;
      sort_order: number;
      is_required: boolean;
      chore_template?: ChoreTemplate;
    }>;
  } | null;
}

const ROUTINE_ICONS = ["📋", "🌅", "🌙", "🏠", "🧹", "📚", "🎯", "⭐", "🎒", "🛁"];

export function CreateRoutineDialog({
  open,
  onOpenChange,
  templates,
  onCreated,
  editRoutine,
}: CreateRoutineDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("📋");
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>("anytime");
  const [targetTime, setTargetTime] = useState("");
  const [selectedChores, setSelectedChores] = useState<
    Array<{
      chore_template_id: string;
      is_required: boolean;
      template?: ChoreTemplate;
    }>
  >([]);
  const [searchQuery, setSearchQuery] = useState("");

  const isEditing = !!editRoutine;

  // Initialize form when editing
  useEffect(() => {
    if (editRoutine) {
      setName(editRoutine.name);
      setDescription(editRoutine.description || "");
      setIcon(editRoutine.icon);
      setTimeOfDay(editRoutine.time_of_day);
      setTargetTime(editRoutine.target_time || "");
      setSelectedChores(
        editRoutine.items.map((item) => ({
          chore_template_id: item.chore_template_id,
          is_required: item.is_required,
          template: item.chore_template,
        }))
      );
    } else {
      resetForm();
    }
  }, [editRoutine, open]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setIcon("📋");
    setTimeOfDay("anytime");
    setTargetTime("");
    setSelectedChores([]);
    setSearchQuery("");
  };

  const filteredTemplates = templates.filter((t) => {
    if (!searchQuery) return true;
    return (
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const addChore = (template: ChoreTemplate) => {
    if (selectedChores.some((c) => c.chore_template_id === template.id)) {
      return; // Already added
    }
    setSelectedChores([
      ...selectedChores,
      {
        chore_template_id: template.id,
        is_required: true,
        template,
      },
    ]);
  };

  const removeChore = (templateId: string) => {
    setSelectedChores(selectedChores.filter((c) => c.chore_template_id !== templateId));
  };

  const toggleRequired = (templateId: string) => {
    setSelectedChores(
      selectedChores.map((c) =>
        c.chore_template_id === templateId
          ? { ...c, is_required: !c.is_required }
          : c
      )
    );
  };

  const moveChore = (index: number, direction: "up" | "down") => {
    const newChores = [...selectedChores];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newChores.length) return;

    [newChores[index], newChores[targetIndex]] = [
      newChores[targetIndex],
      newChores[index],
    ];
    setSelectedChores(newChores);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Please enter a routine name");
      return;
    }

    if (selectedChores.length === 0) {
      toast.error("Please add at least one chore to the routine");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing) {
        // Update routine
        await fetch(`/api/chores/routines/${editRoutine.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            description: description || null,
            icon,
            time_of_day: timeOfDay,
            target_time: targetTime || null,
          }),
        });

        // Update items
        await fetch(`/api/chores/routines/${editRoutine.id}/items`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: selectedChores.map((c, index) => ({
              chore_template_id: c.chore_template_id,
              sort_order: index,
              is_required: c.is_required,
            })),
          }),
        });

        toast.success("Routine updated!");
      } else {
        // Create routine
        const res = await fetch("/api/chores/routines", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            description: description || null,
            icon,
            time_of_day: timeOfDay,
            target_time: targetTime || null,
            items: selectedChores.map((c, index) => ({
              chore_template_id: c.chore_template_id,
              sort_order: index,
              is_required: c.is_required,
            })),
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to create routine");
        }

        toast.success("Routine created!");
      }

      onCreated();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Routine" : "Create Routine"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update your routine settings and chores"
              : "Bundle chores together for morning, evening, or other routines"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 md:col-span-1 space-y-2">
              <Label htmlFor="name">Routine Name</Label>
              <Input
                id="name"
                placeholder="e.g., Morning Routine"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Icon</Label>
              <div className="flex flex-wrap gap-2">
                {ROUTINE_ICONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setIcon(emoji)}
                    className={`p-2 text-xl rounded-md border-2 transition-all ${
                      icon === emoji
                        ? "border-sage bg-sage-very-light"
                        : "border-transparent hover:bg-gray-100"
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Time of Day</Label>
              <Select value={timeOfDay} onValueChange={(v) => setTimeOfDay(v as TimeOfDay)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OF_DAY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.icon} {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="target-time">Target Time (optional)</Label>
              <Input
                id="target-time"
                type="time"
                value={targetTime}
                onChange={(e) => setTargetTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="Describe this routine..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* Selected Chores */}
          <div className="space-y-3">
            <Label>Chores in Routine ({selectedChores.length})</Label>
            {selectedChores.length === 0 ? (
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center text-text-light">
                Add chores from the library below
              </div>
            ) : (
              <div className="space-y-2">
                {selectedChores.map((chore, index) => (
                  <div
                    key={chore.chore_template_id}
                    className="flex items-center gap-2 p-2 bg-sage-very-light rounded-lg"
                  >
                    <div className="flex flex-col">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() => moveChore(index, "up")}
                        disabled={index === 0}
                      >
                        <GripVertical className="h-3 w-3 rotate-90" />
                      </Button>
                    </div>
                    <span className="text-lg">{chore.template?.icon || "📋"}</span>
                    <span className="flex-1 font-medium">{chore.template?.name}</span>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1 text-xs text-text-medium">
                        <Checkbox
                          checked={chore.is_required}
                          onCheckedChange={() => toggleRequired(chore.chore_template_id)}
                        />
                        Required
                      </label>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-red-500 hover:text-red-600"
                        onClick={() => removeChore(chore.chore_template_id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Chores */}
          <div className="space-y-3">
            <Label>Add Chores</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-light" />
              <Input
                placeholder="Search chores..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <ScrollArea className="h-48 border rounded-lg p-2">
              <div className="space-y-1">
                {filteredTemplates.map((template) => {
                  const isAdded = selectedChores.some(
                    (c) => c.chore_template_id === template.id
                  );
                  return (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => addChore(template)}
                      disabled={isAdded}
                      className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-all ${
                        isAdded
                          ? "bg-sage-very-light text-text-light cursor-not-allowed"
                          : "hover:bg-gray-100"
                      }`}
                    >
                      <span className="text-lg">{template.icon || "📋"}</span>
                      <span className="flex-1">{template.name}</span>
                      {isAdded ? (
                        <Badge variant="secondary">Added</Badge>
                      ) : (
                        <Plus className="h-4 w-4 text-sage" />
                      )}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !name || selectedChores.length === 0}
            className="bg-sage hover:bg-sage-dark"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? "Save Changes" : "Create Routine"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
