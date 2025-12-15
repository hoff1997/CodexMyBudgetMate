"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronDown,
  ChevronRight,
  Sparkles,
  Plus,
  Trash2,
  Copy,
  Pencil,
  Info,
} from "lucide-react";
import type { EnvelopeData } from "@/app/(app)/onboarding/unified-onboarding-client";
import type { IncomeSource } from "@/app/(app)/onboarding/unified-onboarding-client";
import {
  MASTER_ENVELOPE_LIST,
  CATEGORY_LABELS,
  type MasterEnvelope,
  type CustomCategory,
} from "@/lib/onboarding/master-envelope-list";
import { IconPicker } from "@/components/onboarding/icon-picker";

interface EnvelopeCreationStepV2Props {
  envelopes: EnvelopeData[];
  onEnvelopesChange: (envelopes: EnvelopeData[]) => void;
  customCategories?: CustomCategory[];
  onCustomCategoriesChange?: (categories: CustomCategory[]) => void;
  categoryOrder?: string[];
  onCategoryOrderChange?: (order: string[]) => void;
  persona: any;
  useTemplate: boolean | undefined;
  incomeSources: IncomeSource[];
  bankBalance?: number;
}

// Priority types
type Priority = 'essential' | 'important' | 'discretionary';

// Priority configuration with style guide colors
const PRIORITY_CONFIG: Record<Priority, {
  label: string;
  dotColor: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
}> = {
  essential: {
    label: 'Essential',
    dotColor: 'bg-[#5A7E7A]',
    bgColor: 'bg-[#E2EEEC]',
    borderColor: 'border-[#B8D4D0]',
    textColor: 'text-[#5A7E7A]',
  },
  important: {
    label: 'Important',
    dotColor: 'bg-[#9CA3AF]',
    bgColor: 'bg-[#F3F4F6]',
    borderColor: 'border-[#E5E7EB]',
    textColor: 'text-[#6B6B6B]',
  },
  discretionary: {
    label: 'Flexible',
    dotColor: 'bg-[#6B9ECE]',
    bgColor: 'bg-[#DDEAF5]',
    borderColor: 'border-[#6B9ECE]',
    textColor: 'text-[#4A7BA8]',
  },
};

// Track multiple instances of an envelope
interface EnvelopeInstance {
  instanceId: string;
  masterId: string;
  name: string;
  icon: string;
  sortOrder: number;
  category?: string;
  priority?: Priority;
}

// Track custom envelopes
interface CustomEnvelope {
  id: string;
  name: string;
  icon: string;
  category: string;
  priority: Priority;
  subtype: 'bill' | 'spending' | 'savings';
  sortOrder: number;
}

// Priority dropdown button component
function PriorityDropdown({
  priority,
  onChange,
  disabled,
}: {
  priority: Priority;
  onChange: (newPriority: Priority) => void;
  disabled?: boolean;
}) {
  const config = PRIORITY_CONFIG[priority];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <button
          type="button"
          className={`
            inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium
            ${config.bgColor} ${config.borderColor} border ${config.textColor}
            hover:opacity-80 transition-opacity
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <span className={`w-2 h-2 rounded-full ${config.dotColor}`} />
          {config.label}
          <ChevronDown className="h-3 w-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        {(Object.keys(PRIORITY_CONFIG) as Priority[]).map((p) => {
          const pConfig = PRIORITY_CONFIG[p];
          return (
            <DropdownMenuItem
              key={p}
              onClick={() => onChange(p)}
              className="flex items-center gap-2"
            >
              <span className={`w-2 h-2 rounded-full ${pConfig.dotColor}`} />
              <span>{pConfig.label}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function EnvelopeCreationStepV2({
  envelopes,
  onEnvelopesChange,
  persona,
  useTemplate,
  incomeSources,
  bankBalance = 0,
}: EnvelopeCreationStepV2Props) {
  // Track which master envelope IDs are selected (for non-multiple items)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Track multiple instances of envelopes (for allowMultiple items)
  const [multipleInstances, setMultipleInstances] = useState<Map<string, EnvelopeInstance[]>>(new Map());

  // Track custom envelopes added by user
  const [customEnvelopes, setCustomEnvelopes] = useState<CustomEnvelope[]>([]);

  // Track priority overrides for built-in envelopes
  const [priorityOverrides, setPriorityOverrides] = useState<Map<string, Priority>>(new Map());

  // Track category overrides for built-in envelopes
  const [categoryOverrides, setCategoryOverrides] = useState<Map<string, string>>(new Map());

  // Track which priority groups are expanded
  const [expandedGroups, setExpandedGroups] = useState<Set<Priority>>(
    new Set(['essential', 'important', 'discretionary'])
  );

  // Track if we've initialized
  const [initialized, setInitialized] = useState(false);

  // Dialog states
  const [addInstanceDialogOpen, setAddInstanceDialogOpen] = useState(false);
  const [addCustomDialogOpen, setAddCustomDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [currentMasterForInstance, setCurrentMasterForInstance] = useState<MasterEnvelope | null>(null);

  // Rename dialog state
  const [renameTarget, setRenameTarget] = useState<{
    type: 'builtin' | 'instance' | 'custom';
    id: string;
    masterId?: string;
  } | null>(null);
  const [renameName, setRenameName] = useState("");
  const [renameIcon, setRenameIcon] = useState("");
  const [renameCategory, setRenameCategory] = useState<string>("");
  const [renamePriority, setRenamePriority] = useState<Priority>('discretionary');

  // Track custom names for built-in envelopes
  const [customNames, setCustomNames] = useState<Map<string, { name: string; icon: string }>>(new Map());

  // Form states for dialogs
  const [newInstanceName, setNewInstanceName] = useState("");
  const [newInstanceIcon, setNewInstanceIcon] = useState("");
  const [newCustomName, setNewCustomName] = useState("");
  const [newCustomIcon, setNewCustomIcon] = useState("📦");
  const [newCustomPriority, setNewCustomPriority] = useState<Priority>('discretionary');
  const [newCustomSubtype, setNewCustomSubtype] = useState<'bill' | 'spending' | 'savings'>('spending');

  // Get effective priority for an envelope (with override support)
  const getEffectivePriority = useCallback((envelope: MasterEnvelope): Priority => {
    return priorityOverrides.get(envelope.id) || envelope.priority;
  }, [priorityOverrides]);

  // Pre-selected system envelope IDs (shown separately at top)
  const preSelectedSystemIds = useMemo(() => new Set(['surplus', 'credit-card-holding']), []);

  // Group envelopes by priority (excluding pre-selected system envelopes)
  const envelopesByPriority = useMemo(() => {
    const grouped: Record<Priority, MasterEnvelope[]> = {
      essential: [],
      important: [],
      discretionary: [],
    };

    MASTER_ENVELOPE_LIST.forEach((envelope) => {
      // Skip pre-selected system envelopes (shown in separate section)
      if (preSelectedSystemIds.has(envelope.id)) return;

      const effectivePriority = getEffectivePriority(envelope);
      grouped[effectivePriority].push(envelope);
    });

    // Sort by name within each group
    Object.values(grouped).forEach((list) => {
      list.sort((a, b) => a.name.localeCompare(b.name));
    });

    return grouped;
  }, [getEffectivePriority, preSelectedSystemIds]);

  // Initialize selections - include Surplus and Credit Card Holding by default
  useEffect(() => {
    if (initialized) return;

    const initialSelected = new Set<string>();
    const initialMultiple = new Map<string, EnvelopeInstance[]>();
    const initialCustomEnvelopes: CustomEnvelope[] = [];
    const initialPriorityOverrides = new Map<string, Priority>();

    // Always include surplus and credit card holding
    initialSelected.add("surplus");
    initialSelected.add("credit-card-holding");

    // If we have existing envelopes (e.g., from going back), restore them
    if (envelopes.length > 0) {
      envelopes.forEach((env, index) => {
        const match = MASTER_ENVELOPE_LIST.find(
          (m) => m.name.toLowerCase() === env.name.toLowerCase() || m.id === env.id
        );
        if (match) {
          if (match.allowMultiple) {
            const instances = initialMultiple.get(match.id) || [];
            instances.push({
              instanceId: env.id || `${match.id}-${instances.length + 1}`,
              masterId: match.id,
              name: env.name,
              icon: env.icon || match.icon,
              sortOrder: env.sortOrder ?? index,
            });
            initialMultiple.set(match.id, instances);
          } else {
            initialSelected.add(match.id);
          }
          // Restore priority override if different from default
          if (env.priority && env.priority !== match.priority) {
            initialPriorityOverrides.set(match.id, env.priority);
          }
        } else if (env.id?.startsWith('custom-')) {
          initialCustomEnvelopes.push({
            id: env.id,
            name: env.name,
            icon: env.icon,
            category: env.category || 'other',
            priority: env.priority || 'discretionary',
            subtype: env.type || 'spending',
            sortOrder: env.sortOrder ?? index,
          });
        }
      });
    }

    setSelectedIds(initialSelected);
    setMultipleInstances(initialMultiple);
    setCustomEnvelopes(initialCustomEnvelopes);
    setPriorityOverrides(initialPriorityOverrides);
    setInitialized(true);
  }, [envelopes, initialized]);

  // Memoized callback for updating parent
  const updateParent = useCallback((
    ids: Set<string>,
    multiple: Map<string, EnvelopeInstance[]>,
    custom: CustomEnvelope[],
    names: Map<string, { name: string; icon: string }>,
    priorityOvr: Map<string, Priority>,
    categoryOvr: Map<string, string>
  ) => {
    const selectedEnvelopes: EnvelopeData[] = [];
    let globalSortIndex = 0;

    // Process all envelopes, grouped by effective priority
    const priorities: Priority[] = ['essential', 'important', 'discretionary'];

    priorities.forEach((priority) => {
      // Add non-multiple selected envelopes with this priority
      MASTER_ENVELOPE_LIST.forEach((master) => {
        const effectivePriority = priorityOvr.get(master.id) || master.priority;
        if (effectivePriority !== priority) return;

        if (!master.allowMultiple && ids.has(master.id)) {
          const customName = names.get(master.id);
          const effectiveCategory = categoryOvr.get(master.id) || master.category;
          selectedEnvelopes.push({
            id: master.id,
            name: customName?.name || master.name,
            icon: customName?.icon || master.icon,
            type: master.subtype === "savings" ? "savings" : master.subtype === "spending" ? "spending" : "bill",
            priority: effectivePriority,
            frequency: master.subtype === "bill" ? "monthly" : undefined,
            category: effectiveCategory,
            sortOrder: globalSortIndex++,
          });
        }

        if (master.allowMultiple) {
          const instances = multiple.get(master.id);
          if (instances) {
            instances.forEach((instance) => {
              const effectiveCategory = instance.category || categoryOvr.get(master.id) || master.category;
              const instancePriority = instance.priority || effectivePriority;
              selectedEnvelopes.push({
                id: instance.instanceId,
                name: instance.name,
                icon: instance.icon,
                type: master.subtype === "savings" ? "savings" : master.subtype === "spending" ? "spending" : "bill",
                priority: instancePriority,
                frequency: master.subtype === "bill" ? "monthly" : undefined,
                category: effectiveCategory,
                sortOrder: globalSortIndex++,
              });
            });
          }
        }
      });

      // Add custom envelopes with this priority
      custom
        .filter((e) => e.priority === priority)
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach((customEnv) => {
          selectedEnvelopes.push({
            id: customEnv.id,
            name: customEnv.name,
            icon: customEnv.icon,
            type: customEnv.subtype === "savings" ? "savings" : customEnv.subtype === "spending" ? "spending" : "bill",
            priority: customEnv.priority,
            frequency: customEnv.subtype === "bill" ? "monthly" : undefined,
            category: customEnv.category,
            sortOrder: globalSortIndex++,
          });
        });
    });

    onEnvelopesChange(selectedEnvelopes);
  }, [onEnvelopesChange]);

  // When selections change, update the parent with envelope data
  useEffect(() => {
    if (!initialized) return;
    updateParent(selectedIds, multipleInstances, customEnvelopes, customNames, priorityOverrides, categoryOverrides);
  }, [selectedIds, multipleInstances, customEnvelopes, customNames, priorityOverrides, categoryOverrides, initialized, updateParent]);

  // Toggle envelope selection (for non-multiple envelopes)
  const toggleEnvelope = (id: string) => {
    const envelope = MASTER_ENVELOPE_LIST.find((e) => e.id === id);
    if (envelope?.alwaysInclude) return;

    if (envelope?.allowMultiple) {
      const instances = multipleInstances.get(id) || [];
      if (instances.length === 0) {
        addFirstInstance(envelope);
      } else {
        setMultipleInstances((prev) => {
          const next = new Map(prev);
          next.delete(id);
          return next;
        });
      }
      return;
    }

    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Add the first instance of a multiple envelope
  const addFirstInstance = (master: MasterEnvelope) => {
    const instanceId = `${master.id}-1`;
    setMultipleInstances((prev) => {
      const next = new Map(prev);
      next.set(master.id, [{
        instanceId,
        masterId: master.id,
        name: master.name,
        icon: master.icon,
        sortOrder: 0,
      }]);
      return next;
    });
  };

  // Open dialog to add another instance
  const openAddInstanceDialog = (master: MasterEnvelope) => {
    setCurrentMasterForInstance(master);
    const instances = multipleInstances.get(master.id) || [];
    setNewInstanceName(`${master.name} ${instances.length + 1}`);
    setNewInstanceIcon(master.icon);
    setAddInstanceDialogOpen(true);
  };

  // Add another instance
  const addInstance = () => {
    if (!currentMasterForInstance || !newInstanceName.trim()) return;

    const master = currentMasterForInstance;
    const instances = multipleInstances.get(master.id) || [];
    const instanceId = `${master.id}-${Date.now()}`;

    setMultipleInstances((prev) => {
      const next = new Map(prev);
      next.set(master.id, [
        ...instances,
        {
          instanceId,
          masterId: master.id,
          name: newInstanceName.trim(),
          icon: newInstanceIcon || master.icon,
          sortOrder: instances.length,
        },
      ]);
      return next;
    });

    setAddInstanceDialogOpen(false);
    setNewInstanceName("");
    setNewInstanceIcon("");
    setCurrentMasterForInstance(null);
  };

  // Remove an instance
  const removeInstance = (masterId: string, instanceId: string) => {
    setMultipleInstances((prev) => {
      const next = new Map(prev);
      const instances = next.get(masterId) || [];
      const filtered = instances.filter((i) => i.instanceId !== instanceId);
      if (filtered.length === 0) {
        next.delete(masterId);
      } else {
        next.set(masterId, filtered);
      }
      return next;
    });
  };

  // Change priority for a built-in envelope
  const changeEnvelopePriority = (envelopeId: string, newPriority: Priority) => {
    const envelope = MASTER_ENVELOPE_LIST.find((e) => e.id === envelopeId);
    if (!envelope) return;

    setPriorityOverrides((prev) => {
      const next = new Map(prev);
      if (newPriority === envelope.priority) {
        next.delete(envelopeId);
      } else {
        next.set(envelopeId, newPriority);
      }
      return next;
    });
  };

  // Open rename dialog for a built-in envelope
  const openRenameBuiltin = (envelope: MasterEnvelope) => {
    const customName = customNames.get(envelope.id);
    setRenameTarget({ type: 'builtin', id: envelope.id });
    setRenameName(customName?.name || envelope.name);
    setRenameIcon(customName?.icon || envelope.icon);
    setRenameCategory(categoryOverrides.get(envelope.id) || envelope.category);
    setRenamePriority(priorityOverrides.get(envelope.id) || envelope.priority);
    setRenameDialogOpen(true);
  };

  // Open rename dialog for an instance
  const openRenameInstance = (masterId: string, instance: EnvelopeInstance) => {
    const master = MASTER_ENVELOPE_LIST.find(m => m.id === masterId);
    setRenameTarget({ type: 'instance', id: instance.instanceId, masterId });
    setRenameName(instance.name);
    setRenameIcon(instance.icon);
    setRenameCategory(instance.category || master?.category || 'other');
    setRenamePriority(instance.priority || priorityOverrides.get(masterId) || master?.priority || 'discretionary');
    setRenameDialogOpen(true);
  };

  // Open rename dialog for a custom envelope
  const openRenameCustom = (customEnv: CustomEnvelope) => {
    setRenameTarget({ type: 'custom', id: customEnv.id });
    setRenameName(customEnv.name);
    setRenameIcon(customEnv.icon);
    setRenameCategory(customEnv.category);
    setRenamePriority(customEnv.priority);
    setRenameDialogOpen(true);
  };

  // Save the rename
  const saveRename = () => {
    if (!renameTarget || !renameName.trim()) return;

    if (renameTarget.type === 'builtin') {
      // Save name and icon
      setCustomNames((prev) => {
        const next = new Map(prev);
        next.set(renameTarget.id, { name: renameName.trim(), icon: renameIcon });
        return next;
      });
      // Save category override
      setCategoryOverrides((prev) => {
        const next = new Map(prev);
        next.set(renameTarget.id, renameCategory);
        return next;
      });
      // Save priority override
      setPriorityOverrides((prev) => {
        const next = new Map(prev);
        next.set(renameTarget.id, renamePriority);
        return next;
      });
    } else if (renameTarget.type === 'instance' && renameTarget.masterId) {
      setMultipleInstances((prev) => {
        const next = new Map(prev);
        const instances = next.get(renameTarget.masterId!) || [];
        const updated = instances.map((inst) =>
          inst.instanceId === renameTarget.id
            ? { ...inst, name: renameName.trim(), icon: renameIcon, category: renameCategory, priority: renamePriority }
            : inst
        );
        next.set(renameTarget.masterId!, updated);
        return next;
      });
    } else if (renameTarget.type === 'custom') {
      setCustomEnvelopes((prev) =>
        prev.map((env) =>
          env.id === renameTarget.id
            ? { ...env, name: renameName.trim(), icon: renameIcon, category: renameCategory, priority: renamePriority }
            : env
        )
      );
    }

    setRenameDialogOpen(false);
    setRenameTarget(null);
    setRenameName("");
    setRenameIcon("");
    setRenameCategory("");
    setRenamePriority('discretionary');
  };

  // Open dialog to add custom envelope
  const openAddCustomDialog = () => {
    setNewCustomName("");
    setNewCustomIcon("📦");
    setNewCustomPriority('discretionary');
    setNewCustomSubtype('spending');
    setAddCustomDialogOpen(true);
  };

  // Add custom envelope
  const addCustomEnvelope = () => {
    if (!newCustomName.trim()) return;

    const customId = `custom-${Date.now()}`;
    const newCustom: CustomEnvelope = {
      id: customId,
      name: newCustomName.trim(),
      icon: newCustomIcon,
      category: 'other', // Default to "Other" category
      priority: newCustomPriority,
      subtype: newCustomSubtype,
      sortOrder: customEnvelopes.length,
    };

    setCustomEnvelopes((prev) => [...prev, newCustom]);
    setAddCustomDialogOpen(false);
  };

  // Remove custom envelope
  const removeCustomEnvelope = (id: string) => {
    setCustomEnvelopes((prev) => prev.filter((e) => e.id !== id));
  };

  // Duplicate a built-in envelope as a custom envelope
  const duplicateBuiltinEnvelope = (envelope: MasterEnvelope) => {
    const customName = customNames.get(envelope.id);
    const displayName = customName?.name || envelope.name;
    const displayIcon = customName?.icon || envelope.icon;
    const effectivePriority = getEffectivePriority(envelope);
    const effectiveCategory = categoryOverrides.get(envelope.id) || envelope.category;

    const customId = `custom-${Date.now()}`;
    const newCustom: CustomEnvelope = {
      id: customId,
      name: `${displayName} (Copy)`,
      icon: displayIcon,
      category: effectiveCategory,
      priority: effectivePriority,
      subtype: envelope.subtype === 'savings' ? 'savings' : envelope.subtype === 'spending' ? 'spending' : 'bill',
      sortOrder: customEnvelopes.length,
    };

    setCustomEnvelopes((prev) => [...prev, newCustom]);
  };

  // Duplicate a custom envelope
  const duplicateCustomEnvelope = (customEnv: CustomEnvelope) => {
    const customId = `custom-${Date.now()}`;
    const newCustom: CustomEnvelope = {
      id: customId,
      name: `${customEnv.name} (Copy)`,
      icon: customEnv.icon,
      category: customEnv.category,
      priority: customEnv.priority,
      subtype: customEnv.subtype,
      sortOrder: customEnvelopes.length,
    };

    setCustomEnvelopes((prev) => [...prev, newCustom]);
  };

  // Change priority for a custom envelope
  const changeCustomPriority = (id: string, newPriority: Priority) => {
    setCustomEnvelopes((prev) =>
      prev.map((env) => (env.id === id ? { ...env, priority: newPriority } : env))
    );
  };

  // Toggle group expansion
  const toggleGroup = (priority: Priority) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(priority)) {
        next.delete(priority);
      } else {
        next.add(priority);
      }
      return next;
    });
  };

  // Count selected in priority group
  const countSelectedInGroup = (priority: Priority): number => {
    let count = 0;

    MASTER_ENVELOPE_LIST.forEach((env) => {
      const effectivePriority = getEffectivePriority(env);
      if (effectivePriority !== priority) return;

      if (!env.allowMultiple && selectedIds.has(env.id)) {
        count++;
      }
      if (env.allowMultiple) {
        const instances = multipleInstances.get(env.id);
        if (instances) {
          count += instances.length;
        }
      }
    });

    count += customEnvelopes.filter((e) => e.priority === priority).length;

    return count;
  };

  // Check if envelope is selected
  const isEnvelopeSelected = (envelope: MasterEnvelope): boolean => {
    if (envelope.allowMultiple) {
      return (multipleInstances.get(envelope.id)?.length || 0) > 0;
    }
    return selectedIds.has(envelope.id);
  };

  // Total selected count
  const totalSelected =
    selectedIds.size +
    Array.from(multipleInstances.values()).reduce((sum, arr) => sum + arr.length, 0) +
    customEnvelopes.length;

  // Render envelope row
  const renderEnvelopeRow = (envelope: MasterEnvelope) => {
    const isSelected = isEnvelopeSelected(envelope);
    const isLocked = envelope.alwaysInclude;
    const instances = multipleInstances.get(envelope.id) || [];
    const hasMultiple = envelope.allowMultiple;
    const customName = customNames.get(envelope.id);
    const displayName = customName?.name || envelope.name;
    const displayIcon = customName?.icon || envelope.icon;
    const effectivePriority = getEffectivePriority(envelope);

    return (
      <div key={envelope.id} className="space-y-1">
        <div
          className={`
            flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors
            ${isSelected ? 'bg-[#E2EEEC] border-[#B8D4D0]' : 'bg-white border-gray-200 hover:border-[#B8D4D0]'}
          `}
        >
          {/* Checkbox */}
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => toggleEnvelope(envelope.id)}
            disabled={isLocked}
            className="data-[state=checked]:bg-[#7A9E9A] data-[state=checked]:border-[#7A9E7A]"
          />

          {/* Icon + Name + Edit */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-lg flex-shrink-0">{displayIcon}</span>
            <span className="font-medium text-sm truncate">{displayName}</span>
            {!isLocked && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openRenameBuiltin(envelope);
                  }}
                  className="p-1 rounded hover:bg-[#B8D4D0] text-[#5A7E7A] flex-shrink-0"
                  title="Edit"
                >
                  <Pencil className="h-3 w-3" />
                </button>
                {hasMultiple ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openAddInstanceDialog(envelope);
                    }}
                    className="p-1 rounded hover:bg-[#B8D4D0] text-[#5A7E7A] flex-shrink-0"
                    title={`Add another ${envelope.multipleLabel || 'item'}`}
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      duplicateBuiltinEnvelope(envelope);
                    }}
                    className="p-1 rounded hover:bg-[#B8D4D0] text-[#5A7E7A] flex-shrink-0"
                    title="Duplicate"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                )}
              </>
            )}
          </div>

          {/* Description */}
          <div className="hidden sm:block flex-1 min-w-0">
            <span className="text-xs text-muted-foreground truncate">
              {envelope.description}
            </span>
          </div>

          {/* Priority Dropdown */}
          <PriorityDropdown
            priority={effectivePriority}
            onChange={(newPriority) => changeEnvelopePriority(envelope.id, newPriority)}
            disabled={!isSelected}
          />
        </div>

        {/* Show instances for multiple envelopes */}
        {hasMultiple && instances.length > 1 && (
          <div className="ml-8 space-y-1">
            {instances.map((instance, idx) => (
              <div
                key={instance.instanceId}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-[#E2EEEC]/50 rounded border border-[#B8D4D0]"
              >
                <span className="text-base">{instance.icon}</span>
                <span className="flex-1 truncate">{instance.name}</span>
                <button
                  type="button"
                  onClick={() => openRenameInstance(envelope.id, instance)}
                  className="p-1 rounded hover:bg-[#B8D4D0] text-[#5A7E7A]"
                  title="Rename"
                >
                  <Pencil className="h-3 w-3" />
                </button>
                {idx > 0 && (
                  <button
                    type="button"
                    onClick={() => removeInstance(envelope.id, instance.instanceId)}
                    className="p-1 rounded hover:bg-red-100 text-red-500"
                    title="Remove"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Render custom envelope row
  const renderCustomEnvelopeRow = (customEnv: CustomEnvelope) => {
    return (
      <div
        key={customEnv.id}
        className="flex items-center gap-3 px-3 py-2 rounded-lg border bg-[#E2EEEC] border-[#B8D4D0]"
      >
        {/* Checkbox (always checked for custom) */}
        <Checkbox checked={true} disabled className="data-[state=checked]:bg-[#7A9E9A] data-[state=checked]:border-[#7A9E9A]" />

        {/* Icon + Name + Edit */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-lg flex-shrink-0">{customEnv.icon}</span>
          <span className="font-medium text-sm truncate">{customEnv.name}</span>
          <button
            type="button"
            onClick={() => openRenameCustom(customEnv)}
            className="p-1 rounded hover:bg-[#B8D4D0] text-[#5A7E7A] flex-shrink-0"
            title="Edit"
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => duplicateCustomEnvelope(customEnv)}
            className="p-1 rounded hover:bg-[#B8D4D0] text-[#5A7E7A] flex-shrink-0"
            title="Duplicate"
          >
            <Copy className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => removeCustomEnvelope(customEnv.id)}
            className="p-1 rounded hover:bg-red-100 text-red-500 flex-shrink-0"
            title="Remove"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>

        {/* Description */}
        <div className="hidden sm:block flex-1 min-w-0">
          <span className="text-xs text-muted-foreground">Custom envelope</span>
        </div>

        {/* Priority Dropdown */}
        <PriorityDropdown
          priority={customEnv.priority}
          onChange={(newPriority) => changeCustomPriority(customEnv.id, newPriority)}
        />
      </div>
    );
  };

  return (
    <div className="w-full space-y-3 px-1">
      {/* Compact Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#E2EEEC] border border-[#B8D4D0] rounded-lg px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#7A9E9A] rounded-lg flex items-center justify-center flex-shrink-0">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Configure Your Envelopes</h2>
            <p className="text-sm text-muted-foreground">
              Select expenses for your household • Click priority badge to change • Add custom envelopes
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm">
            <strong>{totalSelected}</strong> selected
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={openAddCustomDialog}
            className="h-7 text-xs border-[#7A9E9A] text-[#5A7E7A] hover:bg-white"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Custom
          </Button>
        </div>
      </div>

      {/* Priority Legend */}
      <div className="flex items-center justify-end gap-2 text-xs px-1">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#E2EEEC] border border-[#B8D4D0] text-[#5A7E7A]">
          <span className="w-2 h-2 rounded-full bg-[#5A7E7A]" />
          Essential
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#F3F4F6] border border-[#E5E7EB] text-[#6B6B6B]">
          <span className="w-2 h-2 rounded-full bg-[#9CA3AF]" />
          Important
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#DDEAF5] border border-[#6B9ECE] text-[#4A7BA8]">
          <span className="w-2 h-2 rounded-full bg-[#6B9ECE]" />
          Flexible
        </span>
      </div>

      {/* Pre-selected System Envelopes */}
      <div className="border border-sage-light rounded-lg overflow-hidden bg-sage-very-light">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-sage-light">
          <Info className="h-4 w-4 text-sage-dark flex-shrink-0" />
          <div className="flex-1">
            <span className="font-semibold text-sage-dark text-sm">Pre-selected System Envelopes</span>
            <p className="text-xs text-text-medium mt-0.5">
              These envelopes are included by default to help manage your budget effectively.
            </p>
          </div>
        </div>
        <div className="p-3 space-y-2 bg-white">
          {/* Surplus */}
          {MASTER_ENVELOPE_LIST.filter(e => e.id === 'surplus' || e.id === 'credit-card-holding').map((envelope) => {
            const isSelected = selectedIds.has(envelope.id);
            const customName = customNames.get(envelope.id);
            const displayName = customName?.name || envelope.name;
            const displayIcon = customName?.icon || envelope.icon;
            const effectivePriority = getEffectivePriority(envelope);
            const config = PRIORITY_CONFIG[effectivePriority];

            return (
              <div
                key={envelope.id}
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors
                  ${isSelected ? 'bg-[#E2EEEC] border-[#B8D4D0]' : 'bg-white border-gray-200 hover:border-[#B8D4D0]'}
                `}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleEnvelope(envelope.id)}
                  className="data-[state=checked]:bg-[#7A9E9A] data-[state=checked]:border-[#7A9E7A]"
                />
                <span className="text-lg flex-shrink-0">{displayIcon}</span>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-sm">{displayName}</span>
                  <p className="text-xs text-text-medium">{envelope.description}</p>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${config.bgColor} ${config.borderColor} border ${config.textColor}`}>
                  <span className={`w-2 h-2 rounded-full ${config.dotColor}`} />
                  {config.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Priority Groups */}
      <div className="space-y-3">
        {(['essential', 'important', 'discretionary'] as Priority[]).map((priority) => {
          const config = PRIORITY_CONFIG[priority];
          const isExpanded = expandedGroups.has(priority);
          const selectedCount = countSelectedInGroup(priority);
          const priorityEnvelopes = envelopesByPriority[priority];
          const priorityCustomEnvelopes = customEnvelopes.filter((e) => e.priority === priority);

          return (
            <div key={priority} className="border rounded-lg overflow-hidden">
              {/* Group Header */}
              <button
                type="button"
                onClick={() => toggleGroup(priority)}
                className={`
                  w-full flex items-center justify-between px-4 py-2.5
                  ${config.bgColor} ${config.borderColor} border-b
                  hover:opacity-90 transition-opacity
                `}
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className={`w-3 h-3 rounded-full ${config.dotColor}`} />
                  <span className={`font-semibold ${config.textColor}`}>{config.label}</span>
                  <span className="text-sm text-muted-foreground">
                    ({priorityEnvelopes.length + priorityCustomEnvelopes.length} envelopes)
                  </span>
                </div>
                {selectedCount > 0 && (
                  <span className="text-xs bg-[#7A9E9A] text-white px-2 py-0.5 rounded-full">
                    {selectedCount} selected
                  </span>
                )}
              </button>

              {/* Group Content */}
              {isExpanded && (
                <div className="p-3 space-y-2 bg-white">
                  {priorityEnvelopes.map((envelope) => renderEnvelopeRow(envelope))}
                  {priorityCustomEnvelopes.map((customEnv) => renderCustomEnvelopeRow(customEnv))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Instance Dialog */}
      <Dialog open={addInstanceDialogOpen} onOpenChange={setAddInstanceDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Another {currentMasterForInstance?.multipleLabel || 'Item'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-4">
              <IconPicker
                selectedIcon={newInstanceIcon || currentMasterForInstance?.icon || "📦"}
                onIconSelect={setNewInstanceIcon}
              />
              <div className="flex-1">
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={newInstanceName}
                  onChange={(e) => setNewInstanceName(e.target.value)}
                  placeholder={`e.g., ${currentMasterForInstance?.name} 2`}
                  className="mt-1"
                />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              This creates a separate envelope for another {currentMasterForInstance?.multipleLabel || 'item'}. For
              example, if you have 2 cars, you can track expenses for each separately.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddInstanceDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={addInstance}
              className="bg-[#7A9E9A] hover:bg-[#5A7E7A]"
              disabled={!newInstanceName.trim()}
            >
              Add {currentMasterForInstance?.multipleLabel || 'Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Custom Envelope Dialog */}
      <Dialog open={addCustomDialogOpen} onOpenChange={setAddCustomDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Custom Envelope</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-4">
              <IconPicker selectedIcon={newCustomIcon} onIconSelect={setNewCustomIcon} />
              <div className="flex-1">
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={newCustomName}
                  onChange={(e) => setNewCustomName(e.target.value)}
                  placeholder="Enter envelope name"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Priority</label>
              <div className="flex gap-2 mt-2">
                {(['essential', 'important', 'discretionary'] as Priority[]).map((p) => {
                  const pConfig = PRIORITY_CONFIG[p];
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setNewCustomPriority(p)}
                      className={`
                        flex-1 px-3 py-2 text-sm rounded-lg border transition-colors flex items-center justify-center gap-1.5
                        ${newCustomPriority === p
                          ? `${pConfig.bgColor} ${pConfig.borderColor} ${pConfig.textColor}`
                          : 'hover:bg-muted'
                        }
                      `}
                    >
                      <span className={`w-2 h-2 rounded-full ${pConfig.dotColor}`} />
                      {pConfig.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Type</label>
              <div className="flex gap-2 mt-2">
                {(['bill', 'spending', 'savings'] as const).map((subtype) => (
                  <button
                    key={subtype}
                    type="button"
                    onClick={() => setNewCustomSubtype(subtype)}
                    className={`
                      flex-1 px-3 py-2 text-sm rounded-lg border transition-colors
                      ${newCustomSubtype === subtype ? 'bg-[#E2EEEC] border-[#7A9E9A] text-[#5A7E7A]' : 'hover:bg-muted'}
                    `}
                  >
                    {subtype === 'bill' ? 'Bill' : subtype === 'spending' ? 'Spending' : 'Savings'}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddCustomDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={addCustomEnvelope}
              className="bg-[#7A9E9A] hover:bg-[#5A7E7A]"
              disabled={!newCustomName.trim()}
            >
              Add Envelope
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Envelope Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Envelope</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Icon and Name row */}
            <div className="flex items-center gap-4">
              <IconPicker selectedIcon={renameIcon || "📦"} onIconSelect={setRenameIcon} />
              <div className="flex-1">
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={renameName}
                  onChange={(e) => setRenameName(e.target.value)}
                  placeholder="Enter envelope name"
                  className="mt-1"
                  autoFocus
                />
              </div>
            </div>

            {/* Category selector */}
            <div>
              <label className="text-sm font-medium">Category</label>
              <select
                value={renameCategory}
                onChange={(e) => setRenameCategory(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                {Object.entries(CATEGORY_LABELS).map(([key, info]) => (
                  <option key={key} value={key}>
                    {info.icon} {info.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority selector */}
            <div>
              <label className="text-sm font-medium">Priority</label>
              <div className="mt-1 flex gap-2">
                {(['essential', 'important', 'discretionary'] as Priority[]).map((p) => {
                  const config = PRIORITY_CONFIG[p];
                  const isSelected = renamePriority === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setRenamePriority(p)}
                      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md border text-sm font-medium transition-colors ${
                        isSelected
                          ? `${config.bgColor} ${config.borderColor} ${config.textColor}`
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${config.dotColor}`} />
                      {config.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveRename} className="bg-[#7A9E9A] hover:bg-[#5A7E7A]" disabled={!renameName.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
