"use client";

import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Plus, X } from "lucide-react";
import type { EnvelopeData } from "@/app/(app)/onboarding/unified-onboarding-client";
import {
  MASTER_ENVELOPE_LIST,
  CATEGORY_LABELS,
  type MasterEnvelope,
  type BuiltInCategory,
} from "@/lib/onboarding/master-envelope-list";
import { IconPicker } from "@/components/onboarding/icon-picker";

interface AddEnvelopeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingEnvelopeIds: string[];
  onAdd: (envelopes: EnvelopeData[]) => void;
}

// Generate a unique ID for new envelopes
function generateId(): string {
  return `env-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function AddEnvelopeDialog({
  open,
  onOpenChange,
  existingEnvelopeIds,
  onAdd,
}: AddEnvelopeDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMasterIds, setSelectedMasterIds] = useState<Set<string>>(new Set());
  const [showCustomForm, setShowCustomForm] = useState(false);

  // Custom envelope form state
  const [customName, setCustomName] = useState("");
  const [customIcon, setCustomIcon] = useState("📦");
  const [customType, setCustomType] = useState<"bill" | "spending" | "savings">("spending");
  const [customCategory, setCustomCategory] = useState<string>("other");

  // Filter master list to exclude already selected envelopes
  const availableEnvelopes = useMemo(() => {
    return MASTER_ENVELOPE_LIST.filter(
      (env) => !existingEnvelopeIds.includes(env.id)
    );
  }, [existingEnvelopeIds]);

  // Filter by search query
  const filteredEnvelopes = useMemo(() => {
    if (!searchQuery.trim()) return availableEnvelopes;
    const query = searchQuery.toLowerCase();
    return availableEnvelopes.filter(
      (env) =>
        env.name.toLowerCase().includes(query) ||
        CATEGORY_LABELS[env.category as BuiltInCategory]?.label.toLowerCase().includes(query)
    );
  }, [availableEnvelopes, searchQuery]);

  // Group envelopes by category
  const groupedEnvelopes = useMemo(() => {
    const groups = new Map<string, MasterEnvelope[]>();
    filteredEnvelopes.forEach((env) => {
      const category = env.category;
      if (!groups.has(category)) {
        groups.set(category, []);
      }
      groups.get(category)!.push(env);
    });
    return groups;
  }, [filteredEnvelopes]);

  const handleToggleMaster = useCallback((id: string) => {
    setSelectedMasterIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleAddSelected = useCallback(() => {
    const newEnvelopes: EnvelopeData[] = [];

    // Add selected master envelopes
    selectedMasterIds.forEach((masterId) => {
      const master = MASTER_ENVELOPE_LIST.find((m) => m.id === masterId);
      if (master) {
        newEnvelopes.push({
          id: masterId,
          name: master.name,
          icon: master.icon,
          type: master.subtype,
          priority: master.priority,
          category: master.category,
          frequency: "monthly",
        });
      }
    });

    if (newEnvelopes.length > 0) {
      onAdd(newEnvelopes);
      // Reset state
      setSelectedMasterIds(new Set());
      setSearchQuery("");
      onOpenChange(false);
    }
  }, [selectedMasterIds, onAdd, onOpenChange]);

  const handleAddCustom = useCallback(() => {
    if (!customName.trim()) return;

    const customEnvelope: EnvelopeData = {
      id: generateId(),
      name: customName.trim(),
      icon: customIcon,
      type: customType,
      priority: "important",
      category: customCategory,
      frequency: "monthly",
    };

    onAdd([customEnvelope]);

    // Reset custom form
    setCustomName("");
    setCustomIcon("📦");
    setCustomType("spending");
    setCustomCategory("other");
    setShowCustomForm(false);
    onOpenChange(false);
  }, [customName, customIcon, customType, customCategory, onAdd, onOpenChange]);

  const handleClose = useCallback(() => {
    setSelectedMasterIds(new Set());
    setSearchQuery("");
    setShowCustomForm(false);
    setCustomName("");
    setCustomIcon("📦");
    setCustomType("spending");
    setCustomCategory("other");
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Envelope</DialogTitle>
        </DialogHeader>

        {!showCustomForm ? (
          <>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search envelopes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Envelope list */}
            <div className="flex-1 overflow-y-auto min-h-[200px] max-h-[300px] border rounded-md">
              {filteredEnvelopes.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  {searchQuery
                    ? "No matching envelopes found"
                    : "All envelopes have been added"}
                </div>
              ) : (
                <div className="divide-y">
                  {Array.from(groupedEnvelopes.entries()).map(([category, envelopes]) => (
                    <div key={category}>
                      <div className="px-3 py-2 bg-muted/50 text-xs font-semibold text-muted-foreground sticky top-0">
                        {CATEGORY_LABELS[category as BuiltInCategory]?.icon}{" "}
                        {CATEGORY_LABELS[category as BuiltInCategory]?.label || category}
                      </div>
                      {envelopes.map((env) => (
                        <label
                          key={env.id}
                          className="flex items-center gap-3 px-3 py-2 hover:bg-muted/30 cursor-pointer"
                        >
                          <Checkbox
                            checked={selectedMasterIds.has(env.id)}
                            onCheckedChange={() => handleToggleMaster(env.id)}
                          />
                          <span className="text-lg">{env.icon}</span>
                          <span className="text-sm flex-1">{env.name}</span>
                          <span className="text-xs text-muted-foreground capitalize">
                            {env.subtype}
                          </span>
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Create custom button */}
            <button
              type="button"
              onClick={() => setShowCustomForm(true)}
              className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium py-2"
            >
              <Plus className="h-4 w-4" />
              Create Custom Envelope
            </button>

            {/* Footer */}
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleAddSelected}
                disabled={selectedMasterIds.size === 0}
                className="bg-[#7A9E9A] hover:bg-[#5A7E7A]"
              >
                Add Selected ({selectedMasterIds.size})
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            {/* Custom envelope form */}
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setShowCustomForm(false)}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
                Back to list
              </button>

              <div className="flex gap-4 items-start">
                <div>
                  <Label className="text-xs mb-2 block">Icon</Label>
                  <IconPicker
                    selectedIcon={customIcon}
                    onIconSelect={setCustomIcon}
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="custom-name" className="text-xs mb-2 block">
                    Name
                  </Label>
                  <Input
                    id="custom-name"
                    placeholder="e.g., Gym Membership"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs mb-2 block">Type</Label>
                  <Select value={customType} onValueChange={(v) => setCustomType(v as typeof customType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bill">Bill (recurring payment)</SelectItem>
                      <SelectItem value="spending">Spending (variable)</SelectItem>
                      <SelectItem value="savings">Savings (goal)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs mb-2 block">Category</Label>
                  <Select value={customCategory} onValueChange={setCustomCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORY_LABELS).map(([key, { label, icon }]) => (
                        <SelectItem key={key} value={key}>
                          {icon} {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Footer */}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCustomForm(false)}>
                Back
              </Button>
              <Button
                onClick={handleAddCustom}
                disabled={!customName.trim()}
                className="bg-[#7A9E9A] hover:bg-[#5A7E7A]"
              >
                Add Custom Envelope
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
