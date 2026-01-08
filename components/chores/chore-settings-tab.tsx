"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/cn";
import {
  Plus,
  Search,
  Trash2,
  Sunrise,
  Repeat,
  DollarSign,
  Heart,
  Check,
  ChevronDown,
  LayoutList,
  Layers,
} from "lucide-react";
import { CreateTemplateDialog } from "./create-template-dialog";
import { CreateRoutineDialog } from "./create-routine-dialog";
import { RoutineCard } from "./routine-card";
import { ScheduleList } from "./schedule-list";
import { AssignRoutineDialog } from "./assign-routine-dialog";
import { toast } from "sonner";
import type { ChoreRoutineWithItems, ChoreScheduleWithRelations } from "@/lib/types/chores";

interface ChildProfile {
  id: string;
  name: string;
  avatar_url: string | null;
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
  estimated_minutes: number | null;
  recommended_age_min: number | null;
  recommended_age_max: number | null;
  is_preset: boolean;
  max_per_week: number | null;
  allowed_days: number[] | null;
  auto_approve: boolean;
}

interface ChoreSettingsTabProps {
  templates: ChoreTemplate[];
  childProfiles: ChildProfile[];
  onRefresh: () => void;
}

const DEFAULT_CATEGORY_OPTIONS = [
  { value: "bedroom", label: "Bedroom" },
  { value: "bathroom", label: "Bathroom" },
  { value: "kitchen", label: "Kitchen" },
  { value: "living_areas", label: "Living" },
  { value: "outdoor", label: "Outdoor" },
  { value: "pets", label: "Pets" },
  { value: "self_care", label: "Self Care" },
  { value: "helpful", label: "Helpful" },
  { value: "custom", label: "Custom" },
];

const EMOJI_OPTIONS = [
  "🛏️", "🧹", "🧺", "🧽", "🪣", "🗑️", "🧸", "📚", "🎒", "🚿",
  "🪥", "🧼", "🐕", "🐈", "🌱", "🍽️", "🥗", "🚗", "🌿", "📋",
];

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"]; // Sun, Mon, Tue, Wed, Thu, Fri, Sat

// Template row component for reuse
interface TemplateRowProps {
  template: ChoreTemplate;
  isSaving: boolean;
  allowedDays: number[];
  allDays: boolean;
  allCategories: { value: string; label: string }[];
  autoSave: (id: string, updates: Partial<ChoreTemplate>) => void;
  immediateSave: (id: string, updates: Partial<ChoreTemplate>) => void;
  toggleDay: (id: string, days: number[] | null, dayIdx: number) => void;
  deleteTemplate: (id: string) => void;
}

function TemplateRow({
  template,
  isSaving,
  allowedDays,
  allDays,
  allCategories,
  autoSave,
  immediateSave,
  toggleDay,
  deleteTemplate,
}: TemplateRowProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-[32px_1.5fr_80px_1fr_70px_60px_154px_28px] gap-2 px-3 py-1 items-center text-xs border-b border-silver-very-light",
        isSaving && "bg-sage-very-light",
        "hover:bg-silver-very-light"
      )}
    >
      {/* Icon */}
      <div>
        <Popover>
          <PopoverTrigger asChild>
            <button className="w-7 h-6 text-center text-base cursor-pointer hover:bg-silver-very-light rounded flex items-center justify-center">
              {template.icon || "📋"}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" align="start">
            <div className="grid grid-cols-5 gap-1">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => immediateSave(template.id, { icon: emoji })}
                  className={cn(
                    "w-8 h-8 text-lg rounded hover:bg-silver-very-light",
                    template.icon === emoji && "bg-sage-very-light"
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Name */}
      <div>
        <Input
          defaultValue={template.name || ""}
          onBlur={(e) => {
            if (e.target.value !== template.name) {
              autoSave(template.id, { name: e.target.value });
            }
          }}
          className="h-6 text-xs border-0 bg-transparent hover:bg-white focus:bg-white px-1"
        />
      </div>

      {/* Category */}
      <div className="relative">
        <select
          value={template.category || "custom"}
          onChange={(e) => immediateSave(template.id, { category: e.target.value })}
          className="w-full h-6 text-[11px] bg-transparent border-0 cursor-pointer hover:bg-white rounded pl-0.5 pr-4 appearance-none"
        >
          {allCategories.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 h-3 w-3 text-text-light pointer-events-none" />
      </div>

      {/* Description */}
      <div>
        <Input
          defaultValue={template.description || ""}
          placeholder="..."
          onBlur={(e) => {
            if (e.target.value !== (template.description || "")) {
              autoSave(template.id, { description: e.target.value || null });
            }
          }}
          className="h-6 text-xs border-0 bg-transparent hover:bg-white focus:bg-white px-1"
        />
      </div>

      {/* Type Toggle */}
      <div className="relative">
        <select
          value={template.is_expected ? "expected" : "extra"}
          onChange={(e) => immediateSave(template.id, { is_expected: e.target.value === "expected" })}
          className={cn(
            "w-full h-6 text-[10px] rounded pl-1 pr-4 appearance-none cursor-pointer border-0",
            template.is_expected
              ? "bg-pink-50 text-pink-600"
              : "bg-sage-very-light text-sage-dark"
          )}
        >
          <option value="expected">Expected</option>
          <option value="extra">Extra</option>
        </select>
        <ChevronDown className="absolute right-0.5 top-1/2 -translate-y-1/2 h-3 w-3 pointer-events-none" />
      </div>

      {/* Amount */}
      <div className="text-center">
        {template.is_expected ? (
          <span className="text-[10px] text-text-light">-</span>
        ) : (
          <div className="flex items-center justify-center">
            <span className="text-[10px] text-text-medium mr-0.5">$</span>
            <Input
              type="number"
              step="0.01"
              min="0"
              defaultValue={(template.currency_amount || 0).toFixed(2)}
              onBlur={(e) => {
                const val = Number(e.target.value);
                if (val !== template.currency_amount) {
                  autoSave(template.id, { currency_amount: val });
                }
              }}
              className="h-6 text-xs w-12 text-center border-0 bg-transparent hover:bg-white focus:bg-white px-0"
            />
          </div>
        )}
      </div>

      {/* Day Checkboxes - Consolidated */}
      <div className="grid grid-cols-7">
        {DAY_LABELS.map((_, dayIdx) => {
          const isChecked = allDays || allowedDays.includes(dayIdx);
          return (
            <div key={dayIdx} className="flex justify-center">
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => {
                  if (allDays) {
                    immediateSave(template.id, { allowed_days: [dayIdx] });
                  } else {
                    toggleDay(template.id, allowedDays, dayIdx);
                  }
                }}
                className="w-3.5 h-3.5 rounded border-silver-light text-sage focus:ring-sage cursor-pointer"
              />
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex justify-center">
        {isSaving ? (
          <Check className="h-3 w-3 text-sage animate-pulse" />
        ) : (
          <button
            onClick={() => deleteTemplate(template.id)}
            className="p-0.5 hover:bg-red-50 rounded text-text-light hover:text-red-500"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}

export function ChoreSettingsTab({
  templates,
  childProfiles,
  onRefresh,
}: ChoreSettingsTabProps) {
  const [activeSection, setActiveSection] = useState<"templates" | "routines" | "schedules">("templates");
  const [searchQuery, setSearchQuery] = useState("");
  const [groupByCategory, setGroupByCategory] = useState(false);

  // Custom categories state
  const [customCategories, setCustomCategories] = useState<{value: string; label: string}[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categoryPopoverOpen, setCategoryPopoverOpen] = useState(false);

  const allCategories = [...DEFAULT_CATEGORY_OPTIONS, ...customCategories];

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    const value = newCategoryName.trim().toLowerCase().replace(/\s+/g, "_");
    if (allCategories.some(c => c.value === value)) return;
    setCustomCategories([...customCategories, { value, label: newCategoryName.trim() }]);
    setNewCategoryName("");
    setCategoryPopoverOpen(false);
  };

  // Auto-save state
  const [savingId, setSavingId] = useState<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Dialog states
  const [isCreateTemplateOpen, setIsCreateTemplateOpen] = useState(false);
  const [isCreateRoutineOpen, setIsCreateRoutineOpen] = useState(false);
  const [editRoutine, setEditRoutine] = useState<ChoreRoutineWithItems | null>(null);
  const [assignRoutine, setAssignRoutine] = useState<ChoreRoutineWithItems | null>(null);

  // Routines & Schedules
  const [routines, setRoutines] = useState<ChoreRoutineWithItems[]>([]);
  const [schedules, setSchedules] = useState<ChoreScheduleWithRelations[]>([]);
  const [loadingRoutines, setLoadingRoutines] = useState(false);

  // Fetch routines and schedules
  useEffect(() => {
    const fetchData = async () => {
      setLoadingRoutines(true);
      try {
        const [routinesRes, schedulesRes] = await Promise.all([
          fetch("/api/chores/routines"),
          fetch("/api/chores/schedules"),
        ]);

        if (routinesRes.ok) {
          setRoutines(await routinesRes.json());
        }
        if (schedulesRes.ok) {
          setSchedules(await schedulesRes.json());
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoadingRoutines(false);
      }
    };

    fetchData();
  }, []);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    let result = templates;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = templates.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query) ||
          t.category?.toLowerCase().includes(query)
      );
    }
    // Sort by category if grouping is enabled
    if (groupByCategory) {
      result = [...result].sort((a, b) => (a.category || "custom").localeCompare(b.category || "custom"));
    }
    return result;
  }, [templates, searchQuery, groupByCategory]);

  // Group templates by category for rendering
  const groupedTemplates = useMemo(() => {
    if (!groupByCategory) return null;
    const groups: Record<string, ChoreTemplate[]> = {};
    for (const template of filteredTemplates) {
      const cat = template.category || "custom";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(template);
    }
    return groups;
  }, [filteredTemplates, groupByCategory]);

  // Auto-save a field change
  const autoSave = async (templateId: string, updates: Partial<ChoreTemplate>) => {
    // Clear any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    setSavingId(templateId);

    // Debounce for text inputs
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/chores/templates/${templateId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });

        if (res.ok) {
          onRefresh();
        } else {
          toast.error("Failed to save");
        }
      } catch {
        toast.error("Failed to save");
      } finally {
        setSavingId(null);
      }
    }, 300);
  };

  // Immediate save (for toggles/checkboxes)
  const immediateSave = async (templateId: string, updates: Partial<ChoreTemplate>) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    setSavingId(templateId);
    try {
      const res = await fetch(`/api/chores/templates/${templateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        onRefresh();
      } else {
        toast.error("Failed to save");
      }
    } catch {
      toast.error("Failed to save");
    } finally {
      setSavingId(null);
    }
  };

  // Delete template
  const deleteTemplate = async (templateId: string) => {
    if (!confirm("Delete this chore?")) return;

    try {
      const res = await fetch(`/api/chores/templates/${templateId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Chore deleted");
        onRefresh();
      } else {
        toast.error("Failed to delete");
      }
    } catch {
      toast.error("Failed to delete");
    }
  };

  // Toggle day for a template
  const toggleDay = (templateId: string, currentDays: number[] | null, dayIndex: number) => {
    const days = currentDays || [];
    const newDays = days.includes(dayIndex)
      ? days.filter((d) => d !== dayIndex)
      : [...days, dayIndex].sort((a, b) => a - b);
    immediateSave(templateId, { allowed_days: newDays.length > 0 ? newDays : null });
  };

  // Routine handlers
  const handleRoutineCreated = async () => {
    setIsCreateRoutineOpen(false);
    setEditRoutine(null);
    const res = await fetch("/api/chores/routines");
    if (res.ok) {
      setRoutines(await res.json());
    }
  };

  const handleRoutineDelete = async (routineId: string) => {
    if (!confirm("Delete this routine?")) return;

    try {
      const res = await fetch(`/api/chores/routines/${routineId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setRoutines(routines.filter((r) => r.id !== routineId));
        toast.success("Routine deleted");
      }
    } catch {
      toast.error("Failed to delete routine");
    }
  };

  const handleRoutineToggleActive = async (routineId: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/chores/routines/${routineId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: isActive }),
      });

      if (res.ok) {
        setRoutines(
          routines.map((r) =>
            r.id === routineId ? { ...r, is_active: isActive } : r
          )
        );
        toast.success(isActive ? "Routine activated" : "Routine paused");
      }
    } catch {
      toast.error("Failed to update routine");
    }
  };

  // Schedule handlers
  const handleScheduleToggleActive = async (scheduleId: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/chores/schedules/${scheduleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: isActive }),
      });

      if (res.ok) {
        setSchedules(
          schedules.map((s) =>
            s.id === scheduleId ? { ...s, is_active: isActive } : s
          )
        );
        toast.success(isActive ? "Schedule resumed" : "Schedule paused");
      }
    } catch {
      toast.error("Failed to update schedule");
    }
  };

  const handleScheduleDelete = async (scheduleId: string) => {
    if (!confirm("Delete this schedule?")) return;

    try {
      const res = await fetch(`/api/chores/schedules/${scheduleId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setSchedules(schedules.filter((s) => s.id !== scheduleId));
        toast.success("Schedule deleted");
      }
    } catch {
      toast.error("Failed to delete schedule");
    }
  };

  const handleRoutineAssigned = async () => {
    setAssignRoutine(null);
    const res = await fetch("/api/chores/schedules");
    if (res.ok) {
      setSchedules(await res.json());
    }
  };

  return (
    <div className="space-y-4">
      {/* Section Tabs */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={activeSection === "templates" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveSection("templates")}
        >
          Chore Library
        </Button>
        <Button
          variant={activeSection === "routines" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveSection("routines")}
          className="gap-2"
        >
          <Sunrise className="h-4 w-4" />
          Routines
        </Button>
        <Button
          variant={activeSection === "schedules" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveSection("schedules")}
          className="gap-2"
        >
          <Repeat className="h-4 w-4" />
          Schedules
        </Button>
      </div>

      {/* Templates Section - Compact Inline Table */}
      {activeSection === "templates" && (
        <Card>
          <CardHeader className="py-3">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-text-light" />
                <Input
                  placeholder="Search chores..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>
              <Button
                size="sm"
                variant={groupByCategory ? "default" : "outline"}
                onClick={() => setGroupByCategory(!groupByCategory)}
                className="gap-1"
                title={groupByCategory ? "Show flat list" : "Group by category"}
              >
                {groupByCategory ? <Layers className="h-4 w-4" /> : <LayoutList className="h-4 w-4" />}
              </Button>
              <Popover open={categoryPopoverOpen} onOpenChange={setCategoryPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button size="sm" variant="outline" title="Add custom category">
                    <Plus className="h-4 w-4 mr-1" />
                    Category
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-3" align="end">
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-text-dark">Add Category</p>
                    <Input
                      placeholder="Category name..."
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
                      size="sm"
                      onClick={handleAddCategory}
                      disabled={!newCategoryName.trim()}
                      className="w-full"
                    >
                      Add
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
              <Button size="sm" onClick={() => setIsCreateTemplateOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Chore
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Table Header */}
            <div className="grid grid-cols-[32px_1.5fr_80px_1fr_70px_60px_154px_28px] gap-2 px-3 py-1.5 bg-silver-very-light border-b text-[10px] font-medium text-text-medium">
              <div></div>
              <div>Name</div>
              <div>Category</div>
              <div>Description</div>
              <div>Type</div>
              <div className="text-center">Amount</div>
              <div className="grid grid-cols-7">
                {DAY_LABELS.map((day, idx) => (
                  <span key={idx} className="text-center text-[9px]">{day}</span>
                ))}
              </div>
              <div></div>
            </div>

            {/* Table Rows */}
            <div className="max-h-[500px] overflow-y-auto">
              {filteredTemplates.length === 0 ? (
                <div className="text-center py-8 text-text-medium text-sm">
                  No chores found
                </div>
              ) : groupByCategory && groupedTemplates ? (
                // Grouped view with category subheadings
                Object.entries(groupedTemplates).map(([category, categoryTemplates]) => {
                  const categoryLabel = allCategories.find(c => c.value === category)?.label || category;
                  return (
                    <div key={category}>
                      {/* Category Header */}
                      <div className="px-3 py-1.5 bg-sage-very-light border-b border-sage-light">
                        <span className="text-xs font-semibold text-sage-dark">{categoryLabel}</span>
                        <span className="text-[10px] text-text-medium ml-2">({categoryTemplates.length})</span>
                      </div>
                      {/* Templates in this category */}
                      {categoryTemplates.map((template) => {
                        const isSaving = savingId === template.id;
                        const allowedDays = template.allowed_days || [];
                        const allDays = allowedDays.length === 0;
                        return (
                          <TemplateRow
                            key={template.id}
                            template={template}
                            isSaving={isSaving}
                            allowedDays={allowedDays}
                            allDays={allDays}
                            allCategories={allCategories}
                            autoSave={autoSave}
                            immediateSave={immediateSave}
                            toggleDay={toggleDay}
                            deleteTemplate={deleteTemplate}
                          />
                        );
                      })}
                    </div>
                  );
                })
              ) : (
                // Flat list view
                filteredTemplates.map((template) => {
                  const isSaving = savingId === template.id;
                  const allowedDays = template.allowed_days || [];
                  const allDays = allowedDays.length === 0;
                  return (
                    <TemplateRow
                      key={template.id}
                      template={template}
                      isSaving={isSaving}
                      allowedDays={allowedDays}
                      allDays={allDays}
                      allCategories={allCategories}
                      autoSave={autoSave}
                      immediateSave={immediateSave}
                      toggleDay={toggleDay}
                      deleteTemplate={deleteTemplate}
                    />
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="px-3 py-2 bg-silver-very-light text-xs text-text-medium">
              {filteredTemplates.length} chores • Auto-saves on change
            </div>
          </CardContent>
        </Card>
      )}

      {/* Routines Section */}
      {activeSection === "routines" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-text-dark">Chore Routines</h2>
              <p className="text-sm text-text-medium">
                Bundle chores together for morning, evening, or other routines
              </p>
            </div>
            <Button size="sm" onClick={() => setIsCreateRoutineOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Create Routine
            </Button>
          </div>

          {loadingRoutines ? (
            <Card>
              <CardContent className="py-8 text-center text-text-medium">
                Loading routines...
              </CardContent>
            </Card>
          ) : routines.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Sunrise className="h-10 w-10 text-text-light mx-auto mb-3" />
                <h3 className="font-medium text-text-dark mb-1">No routines yet</h3>
                <p className="text-sm text-text-medium mb-3">
                  Create routines to bundle chores together.
                </p>
                <Button size="sm" onClick={() => setIsCreateRoutineOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Create Routine
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {routines.map((routine) => (
                <RoutineCard
                  key={routine.id}
                  routine={routine}
                  onEdit={(r) => {
                    setEditRoutine(r);
                    setIsCreateRoutineOpen(true);
                  }}
                  onDelete={handleRoutineDelete}
                  onToggleActive={handleRoutineToggleActive}
                  onAssign={(r) => setAssignRoutine(r)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Schedules Section */}
      {activeSection === "schedules" && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-text-dark">Recurring Schedules</h2>
            <p className="text-sm text-text-medium">
              Chores and routines that repeat automatically each week
            </p>
          </div>

          <ScheduleList
            schedules={schedules}
            onToggleActive={handleScheduleToggleActive}
            onDelete={handleScheduleDelete}
          />
        </div>
      )}

      {/* Dialogs */}
      <CreateTemplateDialog
        open={isCreateTemplateOpen && !editRoutine}
        onOpenChange={setIsCreateTemplateOpen}
        onCreated={() => {
          setIsCreateTemplateOpen(false);
          onRefresh();
        }}
      />

      <CreateRoutineDialog
        open={isCreateRoutineOpen}
        onOpenChange={(open) => {
          setIsCreateRoutineOpen(open);
          if (!open) setEditRoutine(null);
        }}
        templates={templates as any}
        onCreated={handleRoutineCreated}
        editRoutine={editRoutine as any}
      />

      {assignRoutine && (
        <AssignRoutineDialog
          open={!!assignRoutine}
          onOpenChange={(open) => !open && setAssignRoutine(null)}
          routine={assignRoutine}
          childProfiles={childProfiles}
          onAssigned={handleRoutineAssigned}
        />
      )}
    </div>
  );
}
