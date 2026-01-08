"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FolderOpen,
  MoreVertical,
  Trash2,
  Play,
  Pencil,
  Loader2,
  Calendar,
  Plus,
  RotateCw,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { TemplatePreviewDialog } from "./template-preview-dialog";

interface TemplateItem {
  day_offset: number;
  meal_type: string;
  recipe_id?: string;
  meal_name?: string;
}

interface MealTemplate {
  id: string;
  name: string;
  cycle_type: "weekly" | "fortnightly" | "monthly";
  template_data: TemplateItem[];
  created_at: string;
}

interface Recipe {
  id: string;
  title: string;
  image_url?: string;
}

interface TemplateManagerProps {
  templates: MealTemplate[];
  recipes?: Recipe[];
  onTemplateApplied: () => void;
  onTemplatesChanged: () => void;
}

const MEAL_TYPE_EMOJI: Record<string, string> = {
  breakfast: "🌅",
  lunch: "☀️",
  dinner: "🌙",
  snack: "🍎",
};

const CYCLE_LABELS: Record<string, string> = {
  weekly: "Weekly",
  fortnightly: "Fortnightly",
  monthly: "Monthly",
};

export function TemplateManager({
  templates,
  recipes = [],
  onTemplateApplied,
  onTemplatesChanged,
}: TemplateManagerProps) {
  const [previewTemplate, setPreviewTemplate] = useState<MealTemplate | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<MealTemplate | null>(null);
  const [newName, setNewName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Group templates by cycle type or name pattern (Week 1, Week 2, etc.)
  const weekRotationTemplates = templates.filter((t) =>
    /^week\s*\d+$/i.test(t.name)
  );
  const otherTemplates = templates.filter(
    (t) => !/^week\s*\d+$/i.test(t.name)
  );

  const handleDelete = async (templateId: string, templateName: string) => {
    if (!confirm(`Delete "${templateName}"? This cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/meal-plan/templates/${templateId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success(`Deleted "${templateName}"`);
        onTemplatesChanged();
      } else {
        toast.error("Failed to delete template");
      }
    } catch (error) {
      toast.error("Failed to delete template");
    }
  };

  const handleRename = async () => {
    if (!editingTemplate || !newName.trim()) return;

    setIsSaving(true);
    try {
      const res = await fetch(`/api/meal-plan/templates/${editingTemplate.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });

      if (res.ok) {
        toast.success("Template renamed");
        setEditingTemplate(null);
        setNewName("");
        onTemplatesChanged();
      } else {
        toast.error("Failed to rename template");
      }
    } catch (error) {
      toast.error("Failed to rename template");
    } finally {
      setIsSaving(false);
    }
  };

  const countMealsByType = (templateData: TemplateItem[]) => {
    const counts: Record<string, number> = {};
    for (const item of templateData || []) {
      counts[item.meal_type] = (counts[item.meal_type] || 0) + 1;
    }
    return counts;
  };

  const renderTemplateCard = (template: MealTemplate) => {
    const mealCounts = countMealsByType(template.template_data);
    const totalMeals = (template.template_data || []).length;

    return (
      <Card key={template.id} className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-text-dark truncate">{template.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {CYCLE_LABELS[template.cycle_type]}
                </Badge>
                <span className="text-xs text-text-light">
                  {totalMeals} meals
                </span>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setPreviewTemplate(template)}>
                  <Play className="h-4 w-4 mr-2" />
                  Apply to Week
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setEditingTemplate(template);
                    setNewName(template.name);
                  }}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleDelete(template.id, template.name)}
                  className="text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Meal type breakdown */}
          <div className="flex flex-wrap gap-1 mt-3">
            {Object.entries(mealCounts).map(([type, count]) => (
              <Badge key={type} variant="outline" className="text-xs">
                {MEAL_TYPE_EMOJI[type] || "🍽️"} {count}
              </Badge>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            className="w-full mt-3"
            onClick={() => setPreviewTemplate(template)}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Preview & Apply
          </Button>
        </CardContent>
      </Card>
    );
  };

  if (templates.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FolderOpen className="h-12 w-12 text-text-light mx-auto mb-4" />
          <h3 className="text-lg font-medium text-text-dark mb-2">
            No meal templates yet
          </h3>
          <p className="text-text-medium max-w-md mx-auto">
            Save your weekly meal plans as templates to reuse them. Great for meal rotations
            like Week 1, Week 2, Week 3, or special occasions.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Week Rotation Templates */}
      {weekRotationTemplates.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <RotateCw className="h-5 w-5 text-sage" />
            <h3 className="font-semibold text-text-dark">Week Rotation</h3>
            <Badge variant="secondary" className="text-xs">
              {weekRotationTemplates.length} weeks
            </Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {weekRotationTemplates
              .sort((a, b) => {
                const numA = parseInt(a.name.match(/\d+/)?.[0] || "0");
                const numB = parseInt(b.name.match(/\d+/)?.[0] || "0");
                return numA - numB;
              })
              .map(renderTemplateCard)}
          </div>
        </div>
      )}

      {/* Other Templates */}
      {otherTemplates.length > 0 && (
        <div className="space-y-3">
          {weekRotationTemplates.length > 0 && (
            <h3 className="font-semibold text-text-dark">Other Templates</h3>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {otherTemplates.map(renderTemplateCard)}
          </div>
        </div>
      )}

      {/* Preview & Apply Dialog */}
      {previewTemplate && (
        <TemplatePreviewDialog
          open={!!previewTemplate}
          onOpenChange={(open) => !open && setPreviewTemplate(null)}
          template={previewTemplate}
          recipes={recipes}
          onApplied={onTemplateApplied}
        />
      )}

      {/* Rename Dialog */}
      <Dialog
        open={!!editingTemplate}
        onOpenChange={(open) => {
          if (!open) {
            setEditingTemplate(null);
            setNewName("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rename Template</DialogTitle>
            <DialogDescription>
              Give this template a new name
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., Week 1, Birthday Week..."
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newName.trim()) {
                    handleRename();
                  }
                }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEditingTemplate(null);
                  setNewName("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleRename}
                disabled={!newName.trim() || isSaving}
                className="bg-sage hover:bg-sage-dark"
              >
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
