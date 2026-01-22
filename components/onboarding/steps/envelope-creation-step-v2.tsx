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
  Plus,
  Trash2,
  Copy,
  Pencil,
  Lock,
  FolderPlus,
  GripVertical,
} from "lucide-react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
  type DraggableAttributes,
} from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import { cn } from "@/lib/cn";
import type { EnvelopeData, IncomeSource, BankAccount } from "@/app/(app)/onboarding/unified-onboarding-client";
import {
  MASTER_ENVELOPE_LIST,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  type MasterEnvelope,
  type CustomCategory,
  type BuiltInCategory,
} from "@/lib/onboarding/master-envelope-list";
import { IconPicker } from "@/components/onboarding/icon-picker";
import { RemyAvatar } from "@/components/onboarding/remy-tip";

interface EnvelopeCreationStepV2Props {
  envelopes: EnvelopeData[];
  onEnvelopesChange: (envelopes: EnvelopeData[]) => void;
  customCategories?: CustomCategory[];
  onCustomCategoriesChange?: (categories: CustomCategory[]) => void;
  categoryOrder?: string[];
  onCategoryOrderChange?: (order: string[]) => void;
  useTemplate: boolean | undefined;
  incomeSources: IncomeSource[];
  bankBalance?: number;
  // New props for bank-first onboarding flow
  hasCreditCardDebt?: boolean; // Auto-include CC Legacy Debt envelope
  bankAccounts?: BankAccount[]; // For Starter Stash funding suggestion
}

// Priority types
type Priority = 'essential' | 'important' | 'discretionary';

// Priority configuration with style guide colors
// Color progression: Blue (essential) → Sage (important) → Silver (flexible)
// This creates a calming hierarchy without anxiety-inducing red/amber colors
const PRIORITY_CONFIG: Record<Priority, {
  label: string;
  dotColor: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
}> = {
  essential: {
    label: 'Essential',
    dotColor: 'bg-[#6B9ECE]',      // Blue - draws attention calmly
    bgColor: 'bg-[#DDEAF5]',        // Blue light
    borderColor: 'border-[#6B9ECE]',
    textColor: 'text-[#4A7BA8]',
  },
  important: {
    label: 'Important',
    dotColor: 'bg-[#5A7E7A]',      // Sage-dark - middle ground
    bgColor: 'bg-[#E2EEEC]',        // Sage very light
    borderColor: 'border-[#B8D4D0]',
    textColor: 'text-[#5A7E7A]',
  },
  discretionary: {
    label: 'Flexible',
    dotColor: 'bg-[#9CA3AF]',      // Silver - fades into background
    bgColor: 'bg-[#F3F4F6]',        // Silver very light
    borderColor: 'border-[#E5E7EB]',
    textColor: 'text-[#6B6B6B]',
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
  subtype: 'bill' | 'spending' | 'savings' | 'goal' | 'tracking' | 'debt';
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
            inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded text-xs font-medium min-w-[85px]
            ${config.bgColor} ${config.borderColor} border ${config.textColor}
            hover:opacity-80 transition-opacity
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <span className={`w-2 h-2 rounded-full ${config.dotColor}`} />
          {config.label}
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

// Type for drag handle render prop
type DragHandleRenderProps = {
  attributes: DraggableAttributes;
  listeners: SyntheticListenerMap | undefined;
  disabled: boolean;
};

// Draggable envelope wrapper
function DraggableEnvelope({
  id,
  disabled,
  children,
}: {
  id: string;
  disabled?: boolean;
  children: React.ReactNode | ((props: DragHandleRenderProps) => React.ReactNode);
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    disabled,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  // Pass drag handle props to children via render prop pattern
  // The drag handle is now rendered inline with the row content
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "transition-opacity",
        isDragging && "opacity-50"
      )}
    >
      {/* Render children with drag handle props available */}
      {typeof children === 'function'
        ? children({ attributes, listeners, disabled: !!disabled })
        : children}
    </div>
  );
}

// Drag handle component to be used inside rows
function DragHandle({
  attributes,
  listeners,
  disabled
}: {
  attributes: DraggableAttributes;
  listeners: SyntheticListenerMap | undefined;
  disabled?: boolean;
}) {
  if (disabled) {
    return <div className="w-5 flex-shrink-0" />; // Placeholder for alignment
  }

  return (
    <button
      type="button"
      {...attributes}
      {...listeners}
      className="p-0.5 cursor-grab hover:bg-muted rounded opacity-40 hover:opacity-100 transition-opacity flex-shrink-0"
      title="Drag to move to another category"
    >
      <GripVertical className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}

// Droppable category wrapper
function DroppableCategory({
  id,
  children,
  isOver,
}: {
  id: string;
  children: React.ReactNode;
  isOver?: boolean;
}) {
  const { setNodeRef, isOver: isOverCategory } = useDroppable({
    id,
  });

  const showHighlight = isOver || isOverCategory;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "transition-all duration-200",
        showHighlight && "ring-2 ring-[#7A9E9A] ring-offset-2 rounded-lg"
      )}
    >
      {children}
    </div>
  );
}

export function EnvelopeCreationStepV2({
  envelopes,
  onEnvelopesChange,
  customCategories = [],
  onCustomCategoriesChange,
  categoryOrder = [],
  onCategoryOrderChange,
  useTemplate,
  incomeSources,
  bankBalance = 0,
  hasCreditCardDebt = false,
  bankAccounts = [],
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

  // Track which category groups are expanded
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(CATEGORY_ORDER) // Start with all categories expanded
  );

  // Track if we've initialized
  const [initialized, setInitialized] = useState(false);

  // Dialog states
  const [addInstanceDialogOpen, setAddInstanceDialogOpen] = useState(false);
  const [addCustomDialogOpen, setAddCustomDialogOpen] = useState(false);
  const [addCategoryDialogOpen, setAddCategoryDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [currentMasterForInstance, setCurrentMasterForInstance] = useState<MasterEnvelope | null>(null);

  // Add category dialog state
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState("📁");

  // Track which category to add envelope to (for per-category add button)
  const [addEnvelopeToCategory, setAddEnvelopeToCategory] = useState<string | null>(null);

  // Collapsible state for My Budget Way Essentials section
  const [isEssentialsExpanded, setIsEssentialsExpanded] = useState(true);

  // Drag and drop state
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  // DnD sensors - require a minimum drag distance to prevent accidental drags
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

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
    return priorityOverrides.get(envelope.id) || envelope.priority || 'discretionary';
  }, [priorityOverrides]);

  // Pre-selected system envelope IDs (shown separately at top)
  // Always includes: Surplus, CC Holding, Starter Stash, Debt Destroyer, Safety Net, My Budget Mate
  // Conditionally includes: CC Legacy Debt (if user has credit card debt)
  const preSelectedSystemIds = useMemo(() => {
    const ids = new Set(['surplus', 'credit-card-holding', 'starter-stash', 'debt-destroyer', 'safety-net', 'my-budget-mate']);
    if (hasCreditCardDebt) {
      ids.add('credit-card-historic-debt');
    }
    return ids;
  }, [hasCreditCardDebt]);

  // Group envelopes by category (excluding pre-selected system envelopes)
  const envelopesByCategory = useMemo(() => {
    const grouped: Record<string, MasterEnvelope[]> = {};

    // Initialize all categories
    CATEGORY_ORDER.forEach((cat) => {
      grouped[cat] = [];
    });

    MASTER_ENVELOPE_LIST.forEach((envelope) => {
      // Skip pre-selected system envelopes (shown in separate section)
      if (preSelectedSystemIds.has(envelope.id)) return;

      const effectiveCategory = categoryOverrides.get(envelope.id) || envelope.category;
      if (!grouped[effectiveCategory]) {
        grouped[effectiveCategory] = [];
      }
      grouped[effectiveCategory].push(envelope);
    });

    // Sort by name within each category
    Object.values(grouped).forEach((list) => {
      list.sort((a, b) => a.name.localeCompare(b.name));
    });

    return grouped;
  }, [categoryOverrides, preSelectedSystemIds]);

  // Initialize selections - include My Budget Way essentials by default
  useEffect(() => {
    if (initialized) return;

    const initialSelected = new Set<string>();
    const initialMultiple = new Map<string, EnvelopeInstance[]>();
    const initialCustomEnvelopes: CustomEnvelope[] = [];
    const initialPriorityOverrides = new Map<string, Priority>();

    // Always include My Budget Way essentials (non-negotiable)
    initialSelected.add("surplus");
    initialSelected.add("credit-card-holding");
    initialSelected.add("starter-stash");
    initialSelected.add("debt-destroyer");
    initialSelected.add("safety-net");

    // Include CC Legacy Debt if user has credit card debt
    if (hasCreditCardDebt) {
      initialSelected.add("credit-card-historic-debt");
    }

    // Include all defaultSelected envelopes when starting fresh
    if (envelopes.length === 0) {
      MASTER_ENVELOPE_LIST.forEach((env) => {
        if (env.defaultSelected || env.alwaysInclude) {
          initialSelected.add(env.id);
        }
      });
    }

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
  }, [envelopes, initialized, hasCreditCardDebt]);

  // Auto-include CC Legacy Debt when user has credit card debt
  useEffect(() => {
    if (!initialized) return;
    if (hasCreditCardDebt && !selectedIds.has('credit-card-historic-debt')) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.add('credit-card-historic-debt');
        return next;
      });
    }
  }, [hasCreditCardDebt, initialized, selectedIds]);

  // Calculate available cash from bank accounts (non-credit card accounts)
  const availableCash = useMemo(() => {
    return bankAccounts
      .filter(acc => acc.type !== 'credit_card')
      .reduce((sum, acc) => sum + acc.balance, 0);
  }, [bankAccounts]);

  // Check if user can fund Starter Stash now
  const canFundStarterStash = availableCash >= 1000;

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
            type: master.subtype === "savings" ? "savings" : master.subtype === "spending" ? "spending" : master.subtype === "debt" ? "debt" : master.subtype === "tracking" ? "tracking" : master.subtype === "goal" ? "goal" : "bill",
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
                type: master.subtype === "savings" ? "savings" : master.subtype === "spending" ? "spending" : master.subtype === "debt" ? "debt" : master.subtype === "tracking" ? "tracking" : master.subtype === "goal" ? "goal" : "bill",
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
    setRenamePriority(priorityOverrides.get(envelope.id) || envelope.priority || 'discretionary');
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
      category: addEnvelopeToCategory || 'other', // Use selected category or default to "Other"
      priority: newCustomPriority,
      subtype: newCustomSubtype,
      sortOrder: customEnvelopes.length,
    };

    setCustomEnvelopes((prev) => [...prev, newCustom]);
    setAddCustomDialogOpen(false);
    setAddEnvelopeToCategory(null); // Reset category selection
  };

  // Add custom category
  const addCustomCategory = () => {
    if (!newCategoryName.trim()) return;

    const categoryId = `custom-cat-${Date.now()}`;
    const newCategory: CustomCategory = {
      id: categoryId,
      label: newCategoryName.trim(),
      icon: newCategoryIcon,
    };

    // Add to custom categories
    if (onCustomCategoriesChange) {
      onCustomCategoriesChange([...customCategories, newCategory]);
    }

    // Add to category order (at the end, before 'other')
    if (onCategoryOrderChange) {
      const currentOrder = categoryOrder.length > 0 ? categoryOrder : [...CATEGORY_ORDER];
      const otherIndex = currentOrder.indexOf('other');
      if (otherIndex !== -1) {
        const newOrder = [...currentOrder];
        newOrder.splice(otherIndex, 0, categoryId);
        onCategoryOrderChange(newOrder);
      } else {
        onCategoryOrderChange([...currentOrder, categoryId]);
      }
    }

    // Expand the new category
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      next.add(categoryId);
      return next;
    });

    // Reset and close dialog
    setNewCategoryName("");
    setNewCategoryIcon("📁");
    setAddCategoryDialogOpen(false);
  };

  // Open add custom envelope dialog with optional pre-selected category
  const openAddCustomDialogForCategory = (category: string) => {
    setAddEnvelopeToCategory(category);
    setNewCustomName("");
    setNewCustomIcon("📦");
    setNewCustomPriority('discretionary');
    setNewCustomSubtype('spending');
    setAddCustomDialogOpen(true);
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

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    setOverId(over?.id as string | null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setOverId(null);

    if (!over) return;

    const activeIdStr = active.id as string;
    const overIdStr = over.id as string;

    // Check if dropping on a category (category IDs start with "category-")
    if (overIdStr.startsWith('category-')) {
      const targetCategory = overIdStr.replace('category-', '');

      // Check if it's a built-in envelope being moved
      if (activeIdStr.startsWith('builtin-')) {
        const envelopeId = activeIdStr.replace('builtin-', '');
        const envelope = MASTER_ENVELOPE_LIST.find(e => e.id === envelopeId);
        if (envelope && envelope.category !== targetCategory) {
          // Don't allow moving locked envelopes
          if (envelope.isLocked) return;

          setCategoryOverrides((prev) => {
            const next = new Map(prev);
            next.set(envelopeId, targetCategory);
            return next;
          });
        }
      }

      // Check if it's a custom envelope being moved
      if (activeIdStr.startsWith('custom-')) {
        const customId = activeIdStr;
        setCustomEnvelopes((prev) =>
          prev.map((env) => (env.id === customId ? { ...env, category: targetCategory } : env))
        );
      }
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setOverId(null);
  };

  // Get the active item for drag overlay
  const getActiveItem = () => {
    if (!activeId) return null;

    if (activeId.startsWith('builtin-')) {
      const envelopeId = activeId.replace('builtin-', '');
      const envelope = MASTER_ENVELOPE_LIST.find(e => e.id === envelopeId);
      if (envelope) {
        const customName = customNames.get(envelope.id);
        return {
          icon: customName?.icon || envelope.icon,
          name: customName?.name || envelope.name,
        };
      }
    }

    if (activeId.startsWith('custom-')) {
      const customEnv = customEnvelopes.find(e => e.id === activeId);
      if (customEnv) {
        return {
          icon: customEnv.icon,
          name: customEnv.name,
        };
      }
    }

    return null;
  };

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  // Count selected in category group
  const countSelectedInCategory = (category: string): number => {
    let count = 0;

    MASTER_ENVELOPE_LIST.forEach((env) => {
      const effectiveCategory = categoryOverrides.get(env.id) || env.category;
      if (effectiveCategory !== category) return;
      if (preSelectedSystemIds.has(env.id)) return;

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

    count += customEnvelopes.filter((e) => e.category === category).length;

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
    const isAlwaysInclude = envelope.alwaysInclude;
    const isEnvelopeLocked = envelope.isLocked; // My Budget Way locked state
    const instances = multipleInstances.get(envelope.id) || [];
    const hasMultiple = envelope.allowMultiple;
    const customName = customNames.get(envelope.id);
    const displayName = customName?.name || envelope.name;
    const displayIcon = customName?.icon || envelope.icon;
    const effectivePriority = getEffectivePriority(envelope);

    // Check if this is Starter Stash and user can fund it
    const showStarterStashHint = envelope.id === 'starter-stash' && canFundStarterStash && isSelected;

    // Determine if dragging is allowed for this envelope
    const isDragDisabled = isAlwaysInclude || isEnvelopeLocked;

    return (
      <DraggableEnvelope key={envelope.id} id={`builtin-${envelope.id}`} disabled={isDragDisabled}>
        {({ attributes, listeners, disabled: dragDisabled }) => (
        <div className="space-y-0.5">
          <div
            className={`
              flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-colors
              ${isEnvelopeLocked ? 'bg-gray-50 border-gray-200 opacity-70' : ''}
              ${!isEnvelopeLocked && isSelected ? 'bg-[#E2EEEC] border-[#B8D4D0]' : ''}
              ${!isEnvelopeLocked && !isSelected ? 'bg-white border-gray-200 hover:border-[#B8D4D0]' : ''}
            `}
          >
          {/* Drag Handle */}
          <DragHandle attributes={attributes} listeners={listeners} disabled={dragDisabled} />

          {/* Checkbox */}
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => toggleEnvelope(envelope.id)}
            disabled={isAlwaysInclude || isEnvelopeLocked}
            className="data-[state=checked]:bg-[#7A9E9A] data-[state=checked]:border-[#7A9E7A]"
          />

          {/* Icon + Name + Edit + Lock indicator */}
          <div className="flex items-center gap-2 min-w-0 max-w-[200px]">
            <span className="text-lg flex-shrink-0">{displayIcon}</span>
            <span className={`font-medium text-sm truncate ${isEnvelopeLocked ? 'text-muted-foreground' : ''}`}>
              {displayName}
            </span>
            {/* Lock icon for My Budget Way locked envelopes */}
            {isEnvelopeLocked && (
              <span className="flex items-center gap-1 text-muted-foreground" title={envelope.lockedReason}>
                <Lock className="h-3.5 w-3.5" />
              </span>
            )}
            {/* Starter Stash funding hint */}
            {showStarterStashHint && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-[#E2EEEC] border border-[#B8D4D0] text-[#5A7E7A] font-medium">
                You can fund this now!
              </span>
            )}
            {!isAlwaysInclude && !isEnvelopeLocked && (
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

          {/* Description or Locked Reason */}
          <div className="hidden sm:block flex-[2] min-w-0">
            {isEnvelopeLocked ? (
              <span className="text-xs text-muted-foreground italic truncate block">
                <Lock className="h-3 w-3 inline mr-1" />
                {envelope.lockedReason}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground italic truncate block">
                {envelope.description}
              </span>
            )}
          </div>

          {/* Priority Dropdown */}
          <div className="flex-shrink-0">
            <PriorityDropdown
              priority={effectivePriority}
              onChange={(newPriority) => changeEnvelopePriority(envelope.id, newPriority)}
              disabled={!isSelected || isEnvelopeLocked}
            />
          </div>
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
        )}
      </DraggableEnvelope>
    );
  };

  // Render custom envelope row
  const renderCustomEnvelopeRow = (customEnv: CustomEnvelope) => {
    return (
      <DraggableEnvelope key={customEnv.id} id={customEnv.id}>
        {({ attributes, listeners, disabled: dragDisabled }) => (
        <div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border bg-[#E2EEEC] border-[#B8D4D0]">
            {/* Drag Handle */}
            <DragHandle attributes={attributes} listeners={listeners} disabled={dragDisabled} />

            {/* Checkbox (always checked for custom) */}
            <Checkbox checked={true} disabled className="data-[state=checked]:bg-[#7A9E9A] data-[state=checked]:border-[#7A9E9A]" />

            {/* Icon + Name + Edit */}
            <div className="flex items-center gap-2 min-w-0 max-w-[200px]">
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
            <div className="hidden sm:block flex-[2] min-w-0">
              <span className="text-xs text-muted-foreground italic truncate block">Custom envelope</span>
            </div>

            {/* Priority Dropdown */}
            <div className="flex-shrink-0">
              <PriorityDropdown
                priority={customEnv.priority}
                onChange={(newPriority) => changeCustomPriority(customEnv.id, newPriority)}
              />
            </div>
          </div>
        </div>
        )}
      </DraggableEnvelope>
    );
  };

  return (
    <div className="w-full space-y-3 px-1">
      {/* Static Header */}
      <div className="bg-sage-very-light border border-sage-light rounded-lg overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <RemyAvatar pose="small" size="md" className="border-2 border-white shadow-sm" />
            <div className="text-left">
              <h2 className="text-xl font-bold text-text-dark">Configure Your Envelopes</h2>
              <p className="text-sm text-muted-foreground">
                <strong>{totalSelected}</strong> envelopes selected
              </p>
            </div>
          </div>
        </div>
        <div className="px-4 pb-3 border-t border-sage-light">
          <p className="text-sm text-muted-foreground py-2">
            This is just a starting point - everything's fully customisable once you're in the app. Drag envelopes to reorganise, click priorities to adjust, and make it yours!
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openAddCustomDialog()}
              className="h-7 text-xs border-[#7A9E9A] text-[#5A7E7A] hover:bg-white"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Envelope
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddCategoryDialogOpen(true)}
              className="h-7 text-xs border-[#7A9E9A] text-[#5A7E7A] hover:bg-white"
            >
              <FolderPlus className="h-3 w-3 mr-1" />
              Add Category
            </Button>
          </div>
        </div>
      </div>

      {/* Priority Legend */}
      <div className="flex items-center justify-end gap-2 text-xs px-1">
        <span className="inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded min-w-[85px] bg-[#DDEAF5] border border-[#6B9ECE] text-[#4A7BA8]">
          <span className="w-2 h-2 rounded-full bg-[#6B9ECE]" />
          Essential
        </span>
        <span className="inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded min-w-[85px] bg-[#E2EEEC] border border-[#B8D4D0] text-[#5A7E7A]">
          <span className="w-2 h-2 rounded-full bg-[#7A9E9A]" />
          Important
        </span>
        <span className="inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded min-w-[85px] bg-[#F3F4F6] border border-[#E5E7EB] text-[#6B6B6B]">
          <span className="w-2 h-2 rounded-full bg-[#9CA3AF]" />
          Flexible
        </span>
      </div>

      {/* Collapsible My Budget Way Essentials */}
      <div className="border border-sage-light rounded-lg overflow-hidden bg-sage-very-light">
        <button
          type="button"
          onClick={() => setIsEssentialsExpanded(!isEssentialsExpanded)}
          className="w-full flex items-center gap-3 px-4 py-3 border-b border-sage-light hover:bg-[#d8e8e5] transition-colors"
        >
          {isEssentialsExpanded ? (
            <ChevronDown className="h-4 w-4 text-sage-dark flex-shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-sage-dark flex-shrink-0" />
          )}
          <div className="flex-1 text-left">
            <span className="font-semibold text-sage-dark text-sm">My Budget Way Essentials</span>
            <p className="text-xs text-text-medium mt-0.5">
              These non-negotiable envelopes are the foundation of your budget - they help you build financial security step by step.
            </p>
          </div>
        </button>
        {isEssentialsExpanded && (
        <div className="p-2 space-y-1 bg-white">
          {/* System envelopes - always included, in specific order */}
          {/* Order: Surplus, CC Holding, Starter Stash, Debt Destroyer, Safety Net, CC Legacy Debt, My Budget Mate */}
          {['surplus', 'credit-card-holding', 'starter-stash', 'debt-destroyer', 'safety-net', 'credit-card-historic-debt', 'my-budget-mate']
            .filter(id => preSelectedSystemIds.has(id))
            .map(id => MASTER_ENVELOPE_LIST.find(e => e.id === id))
            .filter((envelope): envelope is NonNullable<typeof envelope> => envelope !== undefined)
            .map((envelope) => {
            const isSelected = selectedIds.has(envelope.id);
            const customName = customNames.get(envelope.id);
            const displayName = customName?.name || envelope.name;
            const displayIcon = customName?.icon || envelope.icon;
            const effectivePriority = getEffectivePriority(envelope);
            const config = PRIORITY_CONFIG[effectivePriority];
            const isNonNegotiable = envelope.id === 'surplus' || envelope.id === 'credit-card-holding' || envelope.id === 'starter-stash' || envelope.id === 'debt-destroyer' || envelope.id === 'safety-net' || envelope.id === 'credit-card-historic-debt' || envelope.id === 'my-budget-mate';
            const isLocked = envelope.isLocked;

            return (
              <div
                key={envelope.id}
                className={`
                  flex items-center gap-2 px-2 py-1 rounded-lg border transition-colors
                  ${isLocked ? 'bg-gray-50 border-gray-200 opacity-60' : ''}
                  ${!isLocked && isSelected ? 'bg-[#E2EEEC] border-[#B8D4D0]' : ''}
                  ${!isLocked && !isSelected ? 'bg-white border-gray-200 hover:border-[#B8D4D0]' : ''}
                `}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => !isNonNegotiable && toggleEnvelope(envelope.id)}
                  disabled={isNonNegotiable}
                  className="data-[state=checked]:bg-[#7A9E9A] data-[state=checked]:border-[#7A9E7A]"
                />
                <span className="text-lg flex-shrink-0">{displayIcon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium text-sm ${isLocked ? 'text-muted-foreground' : ''}`}>{displayName}</span>
                    {isLocked && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 border border-gray-200 text-muted-foreground">
                        <Lock className="h-2.5 w-2.5" />
                        Locked
                      </span>
                    )}
                    {!isLocked && isNonNegotiable && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-sage-very-light border border-sage-light text-sage-dark">
                        <Lock className="h-2.5 w-2.5" />
                        Required
                      </span>
                    )}
                  </div>
                  <p className={`text-xs italic ${isLocked ? 'text-muted-foreground' : 'text-text-medium'}`}>
                    {isLocked && envelope.lockedReason ? envelope.lockedReason : envelope.description}
                  </p>
                </div>
                <span className={`inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded text-xs font-medium min-w-[85px] ${config.bgColor} ${config.borderColor} border ${config.textColor}`}>
                  <span className={`w-2 h-2 rounded-full ${config.dotColor}`} />
                  {config.label}
                </span>
              </div>
            );
          })}
        </div>
        )}
      </div>

      {/* Category Groups - Wrapped with DnD Context */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="space-y-3">
          {/* Render built-in categories */}
          {CATEGORY_ORDER.map((category) => {
            const categoryInfo = CATEGORY_LABELS[category as BuiltInCategory];
            if (!categoryInfo) return null;

            const isExpanded = expandedCategories.has(category);
            const selectedCount = countSelectedInCategory(category);
            const categoryEnvelopes = envelopesByCategory[category] || [];
            const categoryCustomEnvelopes = customEnvelopes.filter((e) => e.category === category);

            // Skip empty categories
            if (categoryEnvelopes.length === 0 && categoryCustomEnvelopes.length === 0) return null;

            return (
              <DroppableCategory key={category} id={`category-${category}`} isOver={overId === `category-${category}`}>
                <div className="border rounded-lg overflow-hidden">
              {/* Category Header */}
              <div className="flex items-center justify-between px-3 py-1.5 bg-[#F3F4F6] border-b border-gray-200">
                <button
                  type="button"
                  onClick={() => toggleCategory(category)}
                  className="flex items-center gap-3 hover:opacity-70 transition-opacity flex-1"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-lg">{categoryInfo.icon}</span>
                  <span className="font-semibold text-gray-700">{categoryInfo.label}</span>
                  <span className="text-sm text-muted-foreground">
                    ({categoryEnvelopes.length + categoryCustomEnvelopes.length} envelopes)
                  </span>
                </button>
                <div className="flex items-center gap-2">
                  {selectedCount > 0 && (
                    <span className="text-xs bg-[#7A9E9A] text-white px-2 py-0.5 rounded-full">
                      {selectedCount} selected
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openAddCustomDialogForCategory(category);
                    }}
                    className="p-1.5 rounded hover:bg-[#E2EEEC] text-[#5A7E7A] transition-colors"
                    title={`Add envelope to ${categoryInfo.label}`}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Category Content */}
              {isExpanded && (
                <div className="p-2 space-y-1 bg-white">
                  {categoryEnvelopes.map((envelope) => renderEnvelopeRow(envelope))}
                  {categoryCustomEnvelopes.map((customEnv) => renderCustomEnvelopeRow(customEnv))}
                </div>
              )}
                </div>
              </DroppableCategory>
            );
          })}

          {/* Render custom categories */}
          {customCategories.map((category) => {
            const isExpanded = expandedCategories.has(category.id);
            const categoryCustomEnvelopes = customEnvelopes.filter((e) => e.category === category.id);

            return (
              <DroppableCategory key={category.id} id={`category-${category.id}`} isOver={overId === `category-${category.id}`}>
                <div className="border rounded-lg overflow-hidden border-[#B8D4D0]">
              {/* Custom Category Header */}
              <div className="flex items-center justify-between px-3 py-1.5 bg-[#E2EEEC] border-b border-[#B8D4D0]">
                <button
                  type="button"
                  onClick={() => toggleCategory(category.id)}
                  className="flex items-center gap-3 hover:opacity-70 transition-opacity flex-1"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-[#5A7E7A]" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-[#5A7E7A]" />
                  )}
                  <span className="text-lg">{category.icon}</span>
                  <span className="font-semibold text-[#5A7E7A]">{category.label}</span>
                  <span className="text-sm text-[#5A7E7A]/70">
                    ({categoryCustomEnvelopes.length} envelopes)
                  </span>
                  <span className="text-xs bg-[#7A9E9A] text-white px-2 py-0.5 rounded">Custom</span>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openAddCustomDialogForCategory(category.id);
                    }}
                    className="p-1.5 rounded hover:bg-white text-[#5A7E7A] transition-colors"
                    title={`Add envelope to ${category.label}`}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Custom Category Content */}
              {isExpanded && (
                <div className="p-2 space-y-1 bg-white">
                  {categoryCustomEnvelopes.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-3">
                      No envelopes yet. Click the + button to add one.
                    </p>
                  ) : (
                    categoryCustomEnvelopes.map((customEnv) => renderCustomEnvelopeRow(customEnv))
                  )}
                </div>
              )}
                </div>
              </DroppableCategory>
            );
          })}
        </div>

        {/* Drag Overlay - Shows the dragged item */}
        <DragOverlay>
          {activeId && getActiveItem() && (
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg border bg-white border-[#7A9E9A] shadow-lg opacity-90">
              <span className="text-lg">{getActiveItem()!.icon}</span>
              <span className="font-medium text-sm">{getActiveItem()!.name}</span>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Add Instance Dialog */}
      <Dialog open={addInstanceDialogOpen} onOpenChange={setAddInstanceDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
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
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
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
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
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

      {/* Add Category Dialog */}
      <Dialog open={addCategoryDialogOpen} onOpenChange={setAddCategoryDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-4">
              <IconPicker selectedIcon={newCategoryIcon} onIconSelect={setNewCategoryIcon} />
              <div className="flex-1">
                <label className="text-sm font-medium">Category Name</label>
                <Input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Enter category name"
                  className="mt-1"
                  autoFocus
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Create a custom category to organize your envelopes. You can add envelopes to this category later.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddCategoryDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={addCustomCategory}
              className="bg-[#7A9E9A] hover:bg-[#5A7E7A]"
              disabled={!newCategoryName.trim()}
            >
              Add Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
