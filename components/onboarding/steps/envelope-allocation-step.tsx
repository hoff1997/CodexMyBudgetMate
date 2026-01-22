"use client";

import { useState, useEffect, useCallback, useMemo, Fragment } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/finance";
import {
  Check,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Info,
  Pencil,
  TrendingUp,
  Calendar as CalendarIcon,
  FileText,
  Thermometer,
  Sun,
  Snowflake,
  HelpCircle,
  Plus,
  Gift,
  Trash2,
  Search,
  X,
  GripVertical,
} from "lucide-react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  type DragEndEvent,
  type DragStartEvent,
  type DraggableAttributes,
} from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import { cn } from "@/lib/cn";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RemyTip } from "@/components/onboarding/remy-tip";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  type BuiltInCategory,
} from "@/lib/onboarding/master-envelope-list";
import type { EnvelopeData, IncomeSource, LevelingData, SeasonalPatternType } from "@/app/(app)/onboarding/unified-onboarding-client";
import { detectSeasonalBill } from "@/lib/utils/seasonal-bills";
import { detectCelebration, type GiftRecipientInput } from "@/lib/types/celebrations";
import {
  createLevelingDataFromQuickEstimate,
  calculateLeveledPayCycleAmount,
} from "@/lib/utils/leveled-bills";
import { SeasonalBillDetectionDialog } from "@/components/leveled-bills/seasonal-bill-detection-dialog";
import { QuickEstimateDialog } from "@/components/leveled-bills/quick-estimate-dialog";
import { TwelveMonthEntryDialog } from "@/components/leveled-bills/twelve-month-entry-dialog";
import { GiftAllocationDialog } from "@/components/celebrations/gift-allocation-dialog";
import { AllocationTutorial } from "./allocation-tutorial";

interface EnvelopeAllocationStepProps {
  envelopes: EnvelopeData[];
  incomeSources: IncomeSource[];
  onAllocationsChange: (allocations: { [envelopeId: string]: { [incomeId: string]: number } }) => void;
  onEnvelopesChange: (envelopes: EnvelopeData[]) => void;
}

// Pay frequency cycles per year
const PAY_FREQUENCY_CYCLES: Record<string, number> = {
  weekly: 52,
  fortnightly: 26,
  twice_monthly: 24,
  monthly: 12,
};

// Bill frequency cycles per year
const BILL_FREQUENCY_CYCLES: Record<string, number> = {
  weekly: 52,
  fortnightly: 26,
  monthly: 12,
  quarterly: 4,
  annual: 1,
  annually: 1,
  custom: 12,
};

// Calculate per-pay amount for an envelope
function calculatePerPayAmount(
  targetAmount: number,
  billFrequency: string | undefined,
  payFrequency: string,
  isLeveled?: boolean,
  levelingData?: LevelingData,
  customWeeks?: number
): number {
  if (!targetAmount && !isLeveled) return 0;

  // Use leveled calculation if envelope is leveled
  if (isLeveled && levelingData) {
    return calculateLeveledPayCycleAmount(
      levelingData,
      payFrequency as 'weekly' | 'fortnightly' | 'twice_monthly' | 'monthly'
    );
  }

  // Handle custom weeks frequency (e.g., every 8 weeks = 52/8 = 6.5 times per year)
  let billCycles: number;
  if (billFrequency === 'custom_weeks' && customWeeks && customWeeks > 0) {
    billCycles = 52 / customWeeks;
  } else {
    billCycles = BILL_FREQUENCY_CYCLES[billFrequency || 'monthly'] || 12;
  }

  const payCycles = PAY_FREQUENCY_CYCLES[payFrequency] || 26;

  const annualAmount = targetAmount * billCycles;
  return annualAmount / payCycles;
}

// Calculate annual amount
function calculateAnnualAmount(
  targetAmount: number,
  billFrequency: string | undefined,
  isLeveled?: boolean,
  levelingData?: LevelingData,
  customWeeks?: number
): number {
  if (isLeveled && levelingData) {
    return levelingData.yearlyAverage * 12 * (1 + levelingData.bufferPercent / 100);
  }

  if (!targetAmount) return 0;

  // Handle custom weeks frequency
  let billCycles: number;
  if (billFrequency === 'custom_weeks' && customWeeks && customWeeks > 0) {
    billCycles = 52 / customWeeks;
  } else {
    billCycles = BILL_FREQUENCY_CYCLES[billFrequency || 'monthly'] || 12;
  }

  return targetAmount * billCycles;
}

// Priority types
type Priority = 'essential' | 'important' | 'discretionary';

// Priority configuration
const PRIORITY_CONFIG: Record<Priority, {
  label: string;
  dotColor: string;
  bgColor: string;
}> = {
  essential: {
    label: 'Essential',
    dotColor: 'bg-[#6B9ECE]', // blue
    bgColor: 'bg-[#DDEAF5]',
  },
  important: {
    label: 'Important',
    dotColor: 'bg-[#5A7E7A]', // sage-dark/green
    bgColor: 'bg-[#E2EEEC]',
  },
  discretionary: {
    label: 'Flexible',
    dotColor: 'bg-[#9CA3AF]', // silver
    bgColor: 'bg-[#F3F4F6]',
  },
};

// Type labels
const TYPE_LABELS: Record<string, string> = {
  bill: 'Bill',
  spending: 'Spending',
  savings: 'Savings',
  goal: 'Goal',
  tracking: 'Tracking',
};

// Frequency labels - used for display (maps stored values to labels)
const FREQUENCY_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  fortnightly: 'Fortnightly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annual: 'Annual',
  annually: 'Annual', // Legacy value - both map to same label
  custom: 'Custom',
  custom_weeks: 'Custom',
};

// Helper to get display label for frequency with custom weeks
function getFrequencyLabel(frequency: string | undefined, customWeeks?: number): string {
  if (frequency === 'custom_weeks' && customWeeks) {
    return `Every ${customWeeks} wks`;
  }
  return FREQUENCY_LABELS[frequency || 'monthly'] || 'Monthly';
}

// Helper to format next pay date as dd/mm/yyyy
function formatNextPayDate(date: Date | string | undefined): string {
  if (!date) return '';
  try {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '';
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return '';
  }
}

// Frequency options - used for dropdown (no duplicates)
const FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'fortnightly', label: 'Fortnightly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: '6_monthly', label: '6 Monthly' },
  { value: 'annually', label: 'Annual' },
  { value: 'custom_weeks', label: 'Custom Weeks' },
];

// Drag handle render props type
type DragHandleRenderProps = {
  attributes: DraggableAttributes;
  listeners: SyntheticListenerMap | undefined;
  disabled: boolean;
};

// Draggable table row wrapper
function DraggableRow({
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
        zIndex: isDragging ? 50 : undefined,
      }
    : undefined;

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={cn(
        "border-b last:border-0 hover:bg-muted/20 group transition-opacity",
        isDragging && "opacity-50 bg-muted/30"
      )}
    >
      {typeof children === 'function'
        ? children({ attributes, listeners, disabled: !!disabled })
        : children}
    </tr>
  );
}

// Drag handle component for table rows
function DragHandle({
  attributes,
  listeners,
  disabled,
}: {
  attributes: DraggableAttributes;
  listeners: SyntheticListenerMap | undefined;
  disabled?: boolean;
}) {
  if (disabled) {
    return <td className="w-6 px-1 py-2" />; // Placeholder for alignment
  }

  return (
    <td className="w-6 px-1 py-2">
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="p-0.5 cursor-grab hover:bg-muted rounded opacity-40 hover:opacity-100 transition-opacity"
        title="Drag to reorder"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
    </td>
  );
}

export function EnvelopeAllocationStep({
  envelopes,
  incomeSources,
  onAllocationsChange,
  onEnvelopesChange,
}: EnvelopeAllocationStepProps) {
  const [allocations, setAllocations] = useState<{ [envelopeId: string]: { [incomeId: string]: number } }>({});
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(CATEGORY_ORDER));
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Tutorial state
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [tutorialMounted, setTutorialMounted] = useState(false);

  // Mark as mounted after first render (prevents SSR issues)
  useEffect(() => {
    setTutorialMounted(true);
  }, []);

  // Auto-open tutorial on first visit
  useEffect(() => {
    if (!tutorialMounted) return;

    const seen = localStorage.getItem("allocation_tutorial_completed");
    if (!seen) {
      const timer = setTimeout(() => {
        setTutorialOpen(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [tutorialMounted]);

  // Leveled bills dialog state (for seasonal bills like power, gas, water)
  const [levelingEnvelopeId, setLevelingEnvelopeId] = useState<string | null>(null);
  const [levelingDialogStep, setLevelingDialogStep] = useState<'detection' | 'quick' | '12month' | null>(null);

  // Celebration/gift dialog state (for birthdays, Christmas, etc.)
  const [celebrationEnvelopeId, setCelebrationEnvelopeId] = useState<string | null>(null);

  // Drag and drop state
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Start drag after 8px movement
      },
    })
  );

  // Add envelope dialog state
  const [addEnvelopeOpen, setAddEnvelopeOpen] = useState(false);
  const [newEnvelope, setNewEnvelope] = useState({
    name: '',
    type: 'bill' as 'bill' | 'spending' | 'savings' | 'goal' | 'tracking',
    icon: '📁',
    billAmount: 0,
    frequency: 'monthly' as 'monthly' | 'weekly' | 'fortnightly' | 'quarterly' | 'annual' | 'custom_weeks',
    customWeeks: 8 as number, // Default to 8 weeks for custom frequency
    priority: 'important' as 'essential' | 'important' | 'discretionary',
    category: 'other',
  });

  // Get envelope being leveled (for seasonal bills)
  const levelingEnvelope = useMemo(() => {
    return envelopes.find(e => e.id === levelingEnvelopeId);
  }, [envelopes, levelingEnvelopeId]);

  // Detection info for leveling envelope
  const levelingDetection = useMemo(() => {
    if (!levelingEnvelope) return null;
    return detectSeasonalBill(levelingEnvelope.name);
  }, [levelingEnvelope]);

  // Get envelope being configured as celebration (for GiftAllocationDialog)
  const celebrationEnvelope = useMemo(() => {
    return envelopes.find(e => e.id === celebrationEnvelopeId);
  }, [envelopes, celebrationEnvelopeId]);

  // Memoized props for GiftAllocationDialog to prevent infinite loops
  const celebrationDialogEnvelope = useMemo(() => {
    if (!celebrationEnvelope) return null;
    return {
      id: celebrationEnvelope.id,
      name: celebrationEnvelope.name,
      icon: celebrationEnvelope.icon,
      is_celebration: celebrationEnvelope.isCelebration || false,
      target_amount: celebrationEnvelope.billAmount || celebrationEnvelope.monthlyBudget || celebrationEnvelope.savingsAmount || 0,
      current_amount: 0, // New envelope, no balance yet
    };
  }, [celebrationEnvelope]);

  // Memoized existing recipients for GiftAllocationDialog
  // Convert OnboardingGiftRecipient to GiftRecipient format expected by dialog
  const celebrationExistingRecipients = useMemo(() => {
    if (!celebrationEnvelope?.giftRecipients) return [];
    // Map to GiftRecipient format with required fields
    return celebrationEnvelope.giftRecipients.map((r, index) => {
      // Handle date which could be Date object or already serialized string
      let dateStr: string | null = null;
      if (r.celebration_date) {
        if (r.celebration_date instanceof Date) {
          dateStr = r.celebration_date.toISOString().split('T')[0];
        } else if (typeof r.celebration_date === 'string') {
          dateStr = r.celebration_date;
        }
      }
      return {
        id: r.id || `temp-${index}`,
        user_id: '', // Not needed for onboarding
        envelope_id: celebrationEnvelope.id,
        recipient_name: r.recipient_name,
        gift_amount: r.gift_amount,
        party_amount: r.party_amount,
        celebration_date: dateStr,
        notes: r.notes || null,
        needs_gift: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });
  }, [celebrationEnvelope?.giftRecipients, celebrationEnvelope?.id]);

  // Detection info for celebration envelope - now based on category
  const celebrationDetection = useMemo(() => {
    if (!celebrationEnvelope) return null;
    // Use category-based detection combined with keyword detection for festival type
    const isCelebrationCategory = celebrationEnvelope.category === 'celebrations';
    const keywordDetection = detectCelebration(celebrationEnvelope.name);
    return {
      isCelebration: isCelebrationCategory,
      matchedKeyword: keywordDetection.matchedKeyword,
      isFestival: keywordDetection.isFestival,
    };
  }, [celebrationEnvelope]);

  // Get primary income (first one) for calculations
  const primaryIncome = incomeSources[0];
  const payFrequency = primaryIncome?.frequency || 'fortnightly';

  // Calculate per-pay amounts for each envelope
  const envelopesWithPerPay = useMemo(() => {
    return envelopes.map((env) => ({
      ...env,
      perPayAmount: calculatePerPayAmount(
        env.billAmount || env.monthlyBudget || env.savingsAmount || 0,
        env.frequency,
        payFrequency,
        env.isLeveled,
        env.levelingData,
        env.customWeeks
      ),
      targetAmount: env.billAmount || env.monthlyBudget || env.savingsAmount || 0,
      annualAmount: calculateAnnualAmount(
        env.billAmount || env.monthlyBudget || env.savingsAmount || 0,
        env.frequency,
        env.isLeveled,
        env.levelingData,
        env.customWeeks
      ),
    }));
  }, [envelopes, payFrequency]);

  // Filter envelopes based on search query
  const filteredEnvelopes = useMemo(() => {
    if (!searchQuery.trim()) return envelopesWithPerPay;
    const query = searchQuery.toLowerCase().trim();
    return envelopesWithPerPay.filter(env =>
      env.name.toLowerCase().includes(query)
    );
  }, [envelopesWithPerPay, searchQuery]);

  // Group envelopes by category (uses filtered list if search is active)
  const envelopesByCategory = useMemo(() => {
    const grouped: Record<string, typeof envelopesWithPerPay> = {};

    // Initialize categories
    CATEGORY_ORDER.forEach((cat) => {
      grouped[cat] = [];
    });
    grouped['other'] = [];

    filteredEnvelopes.forEach((env) => {
      const category = env.category || 'other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(env);
    });

    return grouped;
  }, [filteredEnvelopes]);

  // Calculate totals per income source
  const incomeStats = useMemo(() => {
    return incomeSources.map((income) => {
      const committedAmount = envelopesWithPerPay.reduce((sum, env) => {
        // For now, all envelopes funded by primary income
        // In future, check env.fundedBy
        return sum + env.perPayAmount;
      }, 0);

      const surplus = income.amount - committedAmount;
      const percentAllocated = income.amount > 0 ? (committedAmount / income.amount) * 100 : 0;

      return {
        income,
        committedAmount,
        surplus,
        percentAllocated,
        isBalanced: surplus >= 0,
      };
    });
  }, [incomeSources, envelopesWithPerPay]);

  // Primary income stats
  const primaryStats = incomeStats[0];

  // Total stats across all income
  const totals = useMemo(() => {
    const totalPerPay = envelopesWithPerPay.reduce((sum, env) => sum + env.perPayAmount, 0);
    const totalIncome = incomeSources.reduce((sum, inc) => sum + inc.amount, 0);
    const surplus = totalIncome - totalPerPay;
    const percentAllocated = totalIncome > 0 ? (totalPerPay / totalIncome) * 100 : 0;

    return {
      totalPerPay,
      incomePerPay: totalIncome,
      surplus,
      percentAllocated,
      isBalanced: surplus >= 0,
    };
  }, [envelopesWithPerPay, incomeSources]);

  // Initialize allocations with all going to primary income
  useEffect(() => {
    if (!primaryIncome) return;

    const initialAllocations: { [envelopeId: string]: { [incomeId: string]: number } } = {};

    envelopesWithPerPay.forEach((env) => {
      initialAllocations[env.id] = {
        [primaryIncome.id]: env.perPayAmount,
      };
    });

    setAllocations(initialAllocations);
    onAllocationsChange(initialAllocations);
  }, [envelopesWithPerPay, primaryIncome, onAllocationsChange]);

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

  // Count envelopes in category
  const countInCategory = (category: string): number => {
    return envelopesByCategory[category]?.length || 0;
  };

  // Sum per-pay in category
  const sumPerPayInCategory = (category: string): number => {
    return (envelopesByCategory[category] || []).reduce((sum, env) => sum + env.perPayAmount, 0);
  };

  // Get pay frequency label
  const getPayFrequencyLabel = (freq: string): string => {
    const labels: Record<string, string> = {
      weekly: 'per week',
      fortnightly: 'per fortnight',
      twice_monthly: 'twice monthly',
      monthly: 'per month',
    };
    return labels[freq] || 'per pay';
  };

  // Handle envelope field updates
  const handleEnvelopeChange = useCallback((envelopeId: string, field: string, value: any) => {
    const updated = envelopes.map(env => {
      if (env.id !== envelopeId) return env;

      const updatedEnv = { ...env, [field]: value };

      // Sync billAmount/monthlyBudget/savingsAmount based on type
      if (field === 'targetAmount') {
        if (env.type === 'bill') {
          updatedEnv.billAmount = value;
        } else if (env.type === 'spending') {
          updatedEnv.monthlyBudget = value;
        } else {
          updatedEnv.savingsAmount = value;
        }
      }

      return updatedEnv;
    });
    onEnvelopesChange(updated);
    setEditingCell(null);
  }, [envelopes, onEnvelopesChange]);

  // Handle leveling setup
  const handleStartLeveling = (envelopeId: string) => {
    setLevelingEnvelopeId(envelopeId);
    setLevelingDialogStep('detection');
  };

  const handleLevelingMethodSelect = (method: '12-month' | 'quick-estimate') => {
    if (method === 'quick-estimate') {
      setLevelingDialogStep('quick');
    } else {
      setLevelingDialogStep('12month');
    }
  };

  const handleLevelingSave = (levelingData: LevelingData) => {
    if (!levelingEnvelopeId || !levelingDetection) return;

    const updated = envelopes.map(env => {
      if (env.id !== levelingEnvelopeId) return env;
      return {
        ...env,
        isLeveled: true,
        levelingData,
        seasonalPattern: levelingDetection.suggestedPattern as SeasonalPatternType,
      };
    });

    onEnvelopesChange(updated);
    setLevelingEnvelopeId(null);
    setLevelingDialogStep(null);
  };

  const handleCloseLevelingDialogs = () => {
    setLevelingEnvelopeId(null);
    setLevelingDialogStep(null);
  };

  // Handle celebration envelope setup (GiftAllocationDialog)
  const handleStartCelebration = (envelopeId: string) => {
    setCelebrationEnvelopeId(envelopeId);
  };

  const handleCelebrationSave = async (
    recipients: GiftRecipientInput[],
    budgetChange: number
  ) => {
    if (!celebrationEnvelopeId) return;

    // Calculate total annual budget from recipients
    const totalAnnualBudget = recipients
      .filter(r => r.recipient_name !== '__PARTY__')
      .reduce((sum, r) => sum + (r.gift_amount || 0) + (r.party_amount || 0), 0) +
      (recipients.find(r => r.recipient_name === '__PARTY__')?.gift_amount || 0);

    // Calculate monthly amount
    const monthlyAmount = totalAnnualBudget / 12;

    // Update envelope with celebration data
    const updated = envelopes.map(env => {
      if (env.id !== celebrationEnvelopeId) return env;
      return {
        ...env,
        isCelebration: true,
        giftRecipients: recipients,
        billAmount: monthlyAmount, // Monthly target
        frequency: 'monthly' as const,
      };
    });

    onEnvelopesChange(updated);
    setCelebrationEnvelopeId(null);
  };

  const handleCloseCelebrationDialog = () => {
    setCelebrationEnvelopeId(null);
  };

  // Handle adding a new envelope
  const handleAddEnvelope = () => {
    if (!newEnvelope.name.trim()) return;

    const newEnv: EnvelopeData = {
      id: `new-${Date.now()}`,
      name: newEnvelope.name.trim(),
      icon: newEnvelope.icon,
      type: newEnvelope.type,
      billAmount: newEnvelope.type === 'bill' ? newEnvelope.billAmount : undefined,
      monthlyBudget: newEnvelope.type === 'spending' ? newEnvelope.billAmount : undefined,
      savingsAmount: newEnvelope.type === 'savings' || newEnvelope.type === 'goal' ? newEnvelope.billAmount : undefined,
      frequency: newEnvelope.frequency,
      customWeeks: newEnvelope.frequency === 'custom_weeks' ? newEnvelope.customWeeks : undefined,
      priority: newEnvelope.priority,
      category: newEnvelope.category,
    };

    onEnvelopesChange([...envelopes, newEnv]);
    setAddEnvelopeOpen(false);
    setNewEnvelope({
      name: '',
      type: 'bill',
      icon: '📁',
      billAmount: 0,
      frequency: 'monthly',
      customWeeks: 8,
      priority: 'important',
      category: 'other',
    });
  };

  // Handle opening add envelope dialog with pre-selected category
  const handleAddEnvelopeToCategory = (category: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent category toggle
    setNewEnvelope(prev => ({ ...prev, category }));
    setAddEnvelopeOpen(true);
  };

  // Handle deleting an envelope
  const handleDeleteEnvelope = useCallback((envelopeId: string) => {
    // Find the envelope to check if it can be deleted
    const envelope = envelopes.find(e => e.id === envelopeId);
    if (!envelope) return;

    // Don't allow deleting always-included envelopes (Surplus, Credit Card Holding)
    if (envelope.id === 'surplus' || envelope.id === 'credit-card-holding') {
      return;
    }

    // Remove the envelope
    const updated = envelopes.filter(e => e.id !== envelopeId);
    onEnvelopesChange(updated);
  }, [envelopes, onEnvelopesChange]);

  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  }, []);

  // Handle drag end - reorder within category
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveDragId(null);

    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Find the dragged envelope and target envelope
    const draggedIndex = envelopes.findIndex(e => e.id === active.id);
    const targetIndex = envelopes.findIndex(e => e.id === over.id);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const draggedEnvelope = envelopes[draggedIndex];
    const targetEnvelope = envelopes[targetIndex];

    // Only allow reordering within the same category
    if (draggedEnvelope.category !== targetEnvelope.category) return;

    // Create new array with reordered elements
    const newEnvelopes = [...envelopes];
    newEnvelopes.splice(draggedIndex, 1);
    newEnvelopes.splice(targetIndex, 0, draggedEnvelope);

    onEnvelopesChange(newEnvelopes);
  }, [envelopes, onEnvelopesChange]);

  // Get the envelope being dragged for the overlay
  const activeDragEnvelope = useMemo(() => {
    if (!activeDragId) return null;
    return envelopesWithPerPay.find(e => e.id === activeDragId);
  }, [activeDragId, envelopesWithPerPay]);

  // Check for seasonal bills that haven't been leveled (power, gas, water)
  const unleveledSeasonalBills = useMemo(() => {
    return envelopes.filter(env => {
      if (env.isLeveled) return false;
      // Don't include celebrations - those are handled separately (based on category)
      if (env.category === 'celebrations') return false;
      const detection = detectSeasonalBill(env.name);
      return detection.isLikelySeasonal && detection.confidence !== 'low';
    });
  }, [envelopes]);

  // Check for celebration envelopes that haven't been configured
  // Celebrations are determined by being in the 'celebrations' category
  const unconfiguredCelebrations = useMemo(() => {
    return envelopes.filter(env => {
      if (env.isCelebration) return false; // Already configured
      // Check if envelope is in the celebrations category
      return env.category === 'celebrations';
    });
  }, [envelopes]);

  // Render editable cell
  const renderEditableCell = (
    env: typeof envelopesWithPerPay[0],
    field: string,
    currentValue: any,
    type: 'text' | 'number' | 'select' | 'date' = 'text',
    options?: { value: string; label: string }[]
  ) => {
    const isEditing = editingCell?.id === env.id && editingCell?.field === field;

    if (isEditing) {
      if (type === 'select' && options) {
        return (
          <Select
            value={currentValue || ''}
            onValueChange={(val) => handleEnvelopeChange(env.id, field, val)}
          >
            <SelectTrigger className="h-7 w-full text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }

      if (type === 'number') {
        return (
          <Input
            type="number"
            min="0"
            step="0.01"
            defaultValue={currentValue || ''}
            autoFocus
            className="h-7 w-20 text-xs"
            onBlur={(e) => handleEnvelopeChange(env.id, field, parseFloat(e.target.value) || 0)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleEnvelopeChange(env.id, field, parseFloat((e.target as HTMLInputElement).value) || 0);
              } else if (e.key === 'Escape') {
                setEditingCell(null);
              }
            }}
          />
        );
      }

      if (type === 'date') {
        return (
          <Input
            type="number"
            min="1"
            max="31"
            defaultValue={currentValue || ''}
            autoFocus
            className="h-7 w-14 text-xs"
            placeholder="Day"
            onBlur={(e) => handleEnvelopeChange(env.id, field, parseInt(e.target.value) || null)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleEnvelopeChange(env.id, field, parseInt((e.target as HTMLInputElement).value) || null);
              } else if (e.key === 'Escape') {
                setEditingCell(null);
              }
            }}
          />
        );
      }

      return (
        <Input
          type="text"
          defaultValue={currentValue || ''}
          autoFocus
          className="h-7 text-xs"
          onBlur={(e) => handleEnvelopeChange(env.id, field, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleEnvelopeChange(env.id, field, (e.target as HTMLInputElement).value);
            } else if (e.key === 'Escape') {
              setEditingCell(null);
            }
          }}
        />
      );
    }

    return null;
  };

  // Render envelope row
  const renderEnvelopeRow = (env: typeof envelopesWithPerPay[0], index: number) => {
    const priority = env.priority as Priority || 'discretionary';
    const config = PRIORITY_CONFIG[priority];

    // Check for celebration based on category (birthdays, Christmas, etc.)
    const isCelebrationCategory = env.category === 'celebrations';
    const showCelebrationPrompt = isCelebrationCategory && !env.isCelebration;

    // Check for seasonal bills (power, gas, water) - only if NOT a celebration
    const seasonalDetection = isCelebrationCategory ? null : detectSeasonalBill(env.name);
    const showLevelingPrompt = seasonalDetection?.isLikelySeasonal && !env.isLeveled && seasonalDetection.confidence !== 'low';

    const isFirstRow = index === 0;

    // Don't allow dragging Surplus or Credit Card Holding (they're fixed)
    const isDragDisabled = env.id === 'surplus' || env.id === 'credit-card-holding';

    return (
      <DraggableRow key={env.id} id={env.id} disabled={isDragDisabled}>
        {({ attributes, listeners, disabled }) => (
          <Fragment>
            {/* Drag Handle */}
            <DragHandle attributes={attributes} listeners={listeners} disabled={disabled} />
            {/* Priority */}
            <td className="px-1 py-2 text-center" {...(isFirstRow ? { 'data-tutorial': 'priority-cell' } : {})}>
          {editingCell?.id === env.id && editingCell?.field === 'priority' ? (
            <Select
              value={priority}
              onValueChange={(val) => handleEnvelopeChange(env.id, 'priority', val)}
            >
              <SelectTrigger className="h-7 w-24 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-1">
                      <span className={`w-2 h-2 rounded-full ${cfg.dotColor}`} />
                      {cfg.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <button
              onClick={() => setEditingCell({ id: env.id, field: 'priority' })}
              className="inline-flex items-center justify-center p-1 hover:bg-muted/50 rounded cursor-pointer"
              title={`${config.label} - Click to change`}
            >
              <span className={`w-2 h-2 rounded-full ${config.dotColor}`} />
            </button>
          )}
        </td>

        {/* Envelope Name */}
        <td className="px-2 py-2" {...(isFirstRow ? { 'data-tutorial': 'envelope-name' } : {})}>
          <div className="flex items-center gap-2">
            {/* Icon - clickable to edit */}
            {editingCell?.id === env.id && editingCell?.field === 'icon' ? (
              <Popover open={true} onOpenChange={(open) => !open && setEditingCell(null)}>
                <PopoverTrigger asChild>
                  <button className="text-base cursor-pointer hover:scale-110 transition-transform">
                    {env.icon}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2" align="start">
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Choose an icon</p>
                    <div className="grid grid-cols-8 gap-1">
                      {['💰', '🏠', '🚗', '⚡', '📱', '🎬', '🍔', '☕', '🛒', '💊', '🏥', '🎓', '✈️', '🎁', '🎄', '🎂', '👔', '💇', '🐕', '🐱', '🏋️', '📚', '🎮', '💻', '🔧', '🏦', '💳', '📦', '🎉', '❤️', '🏛️', '📝'].map((icon) => (
                        <button
                          key={icon}
                          onClick={() => handleEnvelopeChange(env.id, 'icon', icon)}
                          className="p-1.5 text-base hover:bg-muted rounded transition-colors"
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            ) : (
              <button
                onClick={() => setEditingCell({ id: env.id, field: 'icon' })}
                className="text-base cursor-pointer hover:scale-110 transition-transform"
                title="Click to change icon"
              >
                {env.icon}
              </button>
            )}
            {editingCell?.id === env.id && editingCell?.field === 'name' ? (
              <Input
                type="text"
                defaultValue={env.name}
                autoFocus
                className="h-7 text-xs flex-1"
                onBlur={(e) => handleEnvelopeChange(env.id, 'name', e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleEnvelopeChange(env.id, 'name', (e.target as HTMLInputElement).value);
                  } else if (e.key === 'Escape') {
                    setEditingCell(null);
                  }
                }}
              />
            ) : (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setEditingCell({ id: env.id, field: 'name' })}
                  className="font-medium text-text-dark hover:text-sage-dark text-left flex items-center gap-1"
                >
                  {env.name}
                  <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                </button>
                {/* Celebration indicator - shows gift icon when configured (clickable to edit) */}
                {env.isCelebration && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => handleStartCelebration(env.id)}
                          className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gold text-white hover:bg-gold/80 transition-colors"
                        >
                          🎁
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">
                          Click to edit gift recipients
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {/* Leveled indicator - shows seasonal pattern for seasonal bills - clickable to edit */}
                {env.isLeveled && !env.isCelebration && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => handleStartLeveling(env.id)}
                          className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue text-white text-[10px] hover:bg-blue/80 transition-colors"
                        >
                          {env.seasonalPattern === 'winter-peak' ? '❄️' : '☀️'}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">
                          Click to edit leveling ({env.seasonalPattern === 'winter-peak' ? 'Winter Peak' : 'Summer Peak'})
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {/* Celebration prompt - gift icon for birthdays, Christmas, etc. */}
                {showCelebrationPrompt && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => handleStartCelebration(env.id)}
                          className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gold-light text-gold hover:bg-gold hover:text-white transition-colors"
                        >
                          <Gift className="h-3 w-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">
                          Click to add gift recipients and spread the cost across the year
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {/* Leveling prompt - thermometer for seasonal bills (power, gas, water) */}
                {showLevelingPrompt && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => handleStartLeveling(env.id)}
                          className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-light text-blue hover:bg-blue hover:text-white transition-colors"
                        >
                          <Thermometer className="h-3 w-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">
                          This bill varies seasonally - click to level it
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            )}
          </div>
        </td>

        {/* Type */}
        <td className="px-1 py-2 text-center hidden md:table-cell">
          {editingCell?.id === env.id && editingCell?.field === 'type' ? (
            <Select
              value={env.type}
              onValueChange={(val) => handleEnvelopeChange(env.id, 'type', val)}
            >
              <SelectTrigger className="h-7 w-24 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TYPE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <button
              onClick={() => setEditingCell({ id: env.id, field: 'type' })}
              className="text-xs text-muted-foreground hover:text-sage-dark"
            >
              {TYPE_LABELS[env.type] || env.type}
            </button>
          )}
        </td>

        {/* Target */}
        <td className="px-1 py-2 text-right" {...(isFirstRow ? { 'data-tutorial': 'target-cell' } : {})}>
          {editingCell?.id === env.id && editingCell?.field === 'targetAmount' ? (
            renderEditableCell(env, 'targetAmount', env.targetAmount, 'number')
          ) : (
            <button
              onClick={() => setEditingCell({ id: env.id, field: 'targetAmount' })}
              className="text-text-medium hover:text-sage-dark"
            >
              {formatCurrency(env.targetAmount)}
            </button>
          )}
        </td>

        {/* Frequency */}
        <td className="px-1 py-2 text-center hidden sm:table-cell whitespace-nowrap" {...(isFirstRow ? { 'data-tutorial': 'frequency-cell' } : {})}>
          {env.frequency === 'custom_weeks' ? (
            /* Custom weeks - single popover with "Every X wks" display */
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="text-muted-foreground text-xs hover:text-sage-dark px-1.5 py-0.5 rounded hover:bg-sage-very-light whitespace-nowrap"
                >
                  Every {env.customWeeks || 8} wks
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-40 p-2" align="center" onOpenAutoFocus={(e) => e.preventDefault()}>
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 justify-center whitespace-nowrap">
                    <span className="text-xs text-text-medium">Every</span>
                    <Input
                      type="number"
                      min="1"
                      max="52"
                      value={env.customWeeks || 8}
                      onChange={(e) => handleEnvelopeChange(env.id, 'customWeeks', parseInt(e.target.value) || 8)}
                      className="h-6 w-12 text-xs text-center"
                    />
                    <span className="text-xs text-text-medium">wks</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleEnvelopeChange(env.id, 'frequency', 'monthly')}
                    className="w-full text-left px-2 py-1 text-[10px] text-muted-foreground hover:text-sage-dark hover:bg-sage-very-light rounded"
                  >
                    ← Standard frequency
                  </button>
                </div>
              </PopoverContent>
            </Popover>
          ) : (
            /* Standard frequency selector */
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="text-muted-foreground text-xs hover:text-sage-dark px-1.5 py-0.5 rounded hover:bg-sage-very-light"
                >
                  {getFrequencyLabel(env.frequency, env.customWeeks)}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-44 p-1" align="center">
                <div className="space-y-0.5">
                  {FREQUENCY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        handleEnvelopeChange(env.id, 'frequency', opt.value);
                        // Set default customWeeks if switching to custom_weeks
                        if (opt.value === 'custom_weeks' && !env.customWeeks) {
                          handleEnvelopeChange(env.id, 'customWeeks', 8);
                        }
                      }}
                      className={`w-full text-left px-2 py-1 text-xs rounded hover:bg-sage-very-light ${
                        env.frequency === opt.value ? 'bg-sage-very-light font-medium' : ''
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </td>

        {/* Due Date - bills and custom_weeks frequency */}
        <td className="px-1 py-2 text-center hidden lg:table-cell">
          {env.type === 'bill' || env.frequency === 'custom_weeks' ? (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="text-muted-foreground text-xs hover:text-sage-dark flex items-center gap-1 mx-auto"
                >
                  {env.dueDate ? (
                    <>
                      <CalendarIcon className="h-3 w-3" />
                      {typeof env.dueDate === 'number'
                        ? `${env.dueDate.toString().padStart(2, '0')}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${new Date().getFullYear()}`
                        : new Date(env.dueDate).toLocaleDateString('en-NZ', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </>
                  ) : (
                    <span className="text-muted-foreground/50">{env.frequency === 'custom_weeks' ? 'Next due' : 'Set date'}</span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start" side="bottom" sideOffset={4}>
                <Calendar
                  mode="single"
                  selected={env.dueDate ? new Date(env.dueDate) : undefined}
                  onSelect={(date) => {
                    if (date) {
                      // Format as local date to avoid timezone issues
                      const year = date.getFullYear();
                      const month = String(date.getMonth() + 1).padStart(2, '0');
                      const day = String(date.getDate()).padStart(2, '0');
                      handleEnvelopeChange(env.id, 'dueDate', `${year}-${month}-${day}`);
                    } else {
                      handleEnvelopeChange(env.id, 'dueDate', null);
                    }
                  }}
                />
              </PopoverContent>
            </Popover>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-muted-foreground/40 text-xs">—</span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Due dates for bills and custom frequency</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </td>

        {/* Funded By */}
        <td className="px-1 py-2 text-center hidden xl:table-cell">
          {editingCell?.id === env.id && editingCell?.field === 'fundedBy' ? (
            <Select
              value={env.fundedBy || primaryIncome?.id || 'split'}
              onValueChange={(val) => handleEnvelopeChange(env.id, 'fundedBy', val)}
            >
              <SelectTrigger className="h-7 w-28 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {incomeSources.map((inc) => (
                  <SelectItem key={inc.id} value={inc.id}>{inc.name}</SelectItem>
                ))}
                {incomeSources.length > 1 && (
                  <SelectItem value="split">Split evenly</SelectItem>
                )}
              </SelectContent>
            </Select>
          ) : (
            <button
              onClick={() => setEditingCell({ id: env.id, field: 'fundedBy' })}
              className="text-muted-foreground text-xs hover:text-sage-dark"
            >
              {env.fundedBy === 'split' ? 'Split' : (incomeSources.find(i => i.id === env.fundedBy)?.name || primaryIncome?.name || '—')}
            </button>
          )}
        </td>

        {/* Per Pay */}
        <td className="px-1 py-2 text-right" {...(isFirstRow ? { 'data-tutorial': 'per-pay-cell' } : {})}>
          <span className="font-semibold text-[#5A7E7A]">
            {formatCurrency(env.perPayAmount)}
          </span>
        </td>

        {/* Annual */}
        <td className="px-1 py-2 text-right hidden lg:table-cell">
          <span className="text-muted-foreground text-xs">
            {formatCurrency(env.annualAmount)}
          </span>
        </td>

        {/* Notes */}
        <td className="px-1 py-2 text-center hidden xl:table-cell">
          <Popover>
            <PopoverTrigger asChild>
              <button className="text-muted-foreground hover:text-sage-dark">
                {env.notes ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <FileText className="h-4 w-4 text-sage" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs max-w-xs">{env.notes}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <FileText className="h-4 w-4 text-muted-foreground/30 hover:text-muted-foreground" />
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3">
              <div className="space-y-2">
                <Textarea
                  id={`notes-${env.id}`}
                  placeholder="Add notes..."
                  defaultValue={env.notes || ''}
                  className="text-xs resize-none"
                  rows={3}
                />
                <Button
                  size="sm"
                  className="w-full h-7 text-xs bg-sage hover:bg-sage-dark"
                  onClick={() => {
                    const textarea = document.getElementById(`notes-${env.id}`) as HTMLTextAreaElement;
                    if (textarea) {
                      handleEnvelopeChange(env.id, 'notes', textarea.value);
                    }
                  }}
                >
                  Save
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </td>

        {/* Delete */}
        <td className="px-1 py-2 text-center">
          {/* Don't allow deleting system envelopes */}
          {env.id !== 'surplus' && env.id !== 'credit-card-holding' ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => handleDeleteEnvelope(env.id)}
                    className="text-muted-foreground/50 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Remove envelope</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <span className="w-4 h-4 inline-block" />
          )}
        </td>
          </Fragment>
        )}
      </DraggableRow>
    );
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
    <div className="w-full space-y-6">
      {/* Interactive Tutorial Overlay */}
      {tutorialMounted && (
        <AllocationTutorial
          open={tutorialOpen}
          onOpenChange={setTutorialOpen}
          onComplete={() => {}}
        />
      )}

      {/* Header */}
      <div className="text-center space-y-2 relative">
        <div className="flex items-center justify-center gap-2">
          <h2 className="text-2xl md:text-3xl font-bold text-text-dark">Your Budget Allocation</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTutorialOpen(true)}
            className="h-8 px-2 gap-1 rounded-full hover:bg-sage-very-light text-sage"
          >
            <HelpCircle className="h-4 w-4" />
            <span className="text-xs font-medium">Tutorial</span>
          </Button>
        </div>
        <p className="text-muted-foreground">
          Here's what you'll set aside each payday to cover your commitments.
        </p>
        <p className="text-muted-foreground">
          The goal is simple: make sure what goes out isn't more than what comes in.
        </p>
      </div>

      {/* Remy's Coaching - Context aware */}
      {totals.surplus < 0 ? (
        <RemyTip pose="thinking">
          You're committing more than you earn by {formatCurrency(Math.abs(totals.surplus))} per pay.
          Adjust your flexible expenses first by clicking <strong>Target</strong> (the bill amount) to reduce it.
          Focus on essentials first and we'll fine-tune after onboarding.
        </RemyTip>
      ) : unconfiguredCelebrations.length > 0 ? (
        <RemyTip pose="encouraging">
          I've spotted a celebration envelope - {unconfiguredCelebrations[0].name}! Look for the 🎁 gift icon
          next to the envelope name and click it to add who you're buying for. We'll spread the cost across
          the year so you're never caught short when the big day arrives. The tutorial above explains more about celebrations and seasonal bills.
        </RemyTip>
      ) : unleveledSeasonalBills.length > 0 ? (
        <RemyTip pose="encouraging">
          I've spotted some bills that might vary through the year - like {unleveledSeasonalBills[0].name}.
          Power bills can be heaps higher in winter! Look for the thermometer icon next to the envelope name
          and click it to level the bill so you save a steady amount each pay. The tutorial above explains how leveling works.
        </RemyTip>
      ) : (
        <RemyTip pose="encouraging">
          If you can't fully fund every envelope right now, that's completely okay - this is just the starting line, not the finish.
          We'll work together to get you on track over time. For now, focus on your essentials and do what feels realistic.
          You've already taken the biggest step just by being here.
        </RemyTip>
      )}

      {/* Income Progress Cards */}
      <div className={`grid gap-4 ${incomeSources.length > 1 ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
        {incomeStats.map((stats, idx) => (
          <div key={stats.income.id} data-tutorial={idx === 0 ? 'income-cards' : undefined}>
            <Card
              className={`p-4 ${stats.isBalanced ? 'bg-[#E2EEEC] border-[#B8D4D0]' : 'bg-[#DDEAF5] border-[#6B9ECE]'}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  {stats.isBalanced ? (
                    <Check className="h-5 w-5 text-[#7A9E9A]" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-[#6B9ECE]" />
                  )}
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-text-dark">{stats.income.name}</h3>
                      {stats.income.nextPayDate && (
                        <span className="text-xs text-muted-foreground italic">
                          next payment {formatNextPayDate(stats.income.nextPayDate)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-text-medium">
                      {formatCurrency(stats.income.amount)} {getPayFrequencyLabel(stats.income.frequency)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">
                    {stats.isBalanced ? 'Surplus' : 'Shortfall'}
                  </p>
                  <p className={`font-bold ${stats.isBalanced ? 'text-[#5A7E7A]' : 'text-[#6B9ECE]'}`}>
                    {formatCurrency(Math.abs(stats.surplus))}
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="h-2 bg-white rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${stats.percentAllocated > 100 ? 'bg-[#6B9ECE]' : 'bg-[#7A9E9A]'}`}
                    style={{ width: `${Math.min(stats.percentAllocated, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{formatCurrency(stats.committedAmount)} allocated</span>
                  <span>{Math.round(stats.percentAllocated)}%</span>
                </div>
              </div>
            </Card>
          </div>
        ))}
      </div>

      {/* Search and Add Envelope */}
      <div className="flex items-center gap-3 justify-center">
        {/* Search Box */}
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search envelopes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-8 h-9 text-sm"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-muted rounded"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
        {/* Add Envelope Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAddEnvelopeOpen(true)}
          className="gap-1 border-sage text-sage hover:bg-sage-very-light"
        >
          <Plus className="h-4 w-4" />
          Add Envelope
        </Button>
      </div>
      {/* Search Results Indicator */}
      {searchQuery && (
        <p className="text-sm text-muted-foreground text-center">
          {filteredEnvelopes.length === 0 ? (
            <>No envelopes found matching "<span className="font-medium">{searchQuery}</span>"</>
          ) : (
            <>Showing {filteredEnvelopes.length} of {envelopesWithPerPay.length} envelopes</>
          )}
        </p>
      )}

      {/* Allocation Table by Category */}
      <div className="space-y-3">
        {CATEGORY_ORDER.map((category) => {
          const categoryInfo = CATEGORY_LABELS[category as BuiltInCategory];
          if (!categoryInfo) return null;

          const categoryEnvelopes = envelopesByCategory[category] || [];
          if (categoryEnvelopes.length === 0) return null;

          const isExpanded = expandedCategories.has(category);
          const categoryTotal = sumPerPayInCategory(category);

          return (
            <div key={category} className="border rounded-lg overflow-hidden">
              {/* Category Header */}
              <div
                className="w-full flex items-center justify-between px-4 py-2.5 bg-[#F3F4F6] border-b border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer"
                onClick={() => toggleCategory(category)}
                {...(category === CATEGORY_ORDER[0] ? { 'data-tutorial': 'category-header' } : {})}
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-lg">{categoryInfo.icon}</span>
                  <span className="font-semibold text-gray-700">{categoryInfo.label}</span>
                  <span className="text-sm text-muted-foreground">
                    ({countInCategory(category)})
                  </span>
                  {/* Add Envelope Button */}
                  <button
                    type="button"
                    onClick={(e) => handleAddEnvelopeToCategory(category, e)}
                    className="flex items-center gap-1 text-xs text-sage hover:text-sage-dark hover:bg-sage-very-light px-2 py-1 rounded transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add</span>
                  </button>
                </div>
                <span className="font-semibold text-[#5A7E7A]">
                  {formatCurrency(categoryTotal)}
                </span>
              </div>

              {/* Category Content - Table */}
              {isExpanded && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="w-6 px-1 py-2"></th>{/* Drag handle column */}
                        <th className="text-center px-1 py-2 font-medium text-muted-foreground w-10">Pri</th>
                        <th className="text-left px-2 py-2 font-medium text-muted-foreground">Envelope</th>
                        <th className="text-center px-1 py-2 font-medium text-muted-foreground hidden md:table-cell w-16">Type</th>
                        <th className="text-right px-1 py-2 font-medium text-muted-foreground w-20">Target</th>
                        <th className="text-center px-1 py-2 font-medium text-muted-foreground hidden sm:table-cell w-20">Freq</th>
                        <th className="text-center px-1 py-2 font-medium text-muted-foreground hidden lg:table-cell w-24">Due</th>
                        <th className="text-center px-1 py-2 font-medium text-muted-foreground hidden xl:table-cell w-24">Funded By</th>
                        <th className="text-right px-1 py-2 font-medium text-[#5A7E7A] w-20">Per Pay</th>
                        <th className="text-right px-1 py-2 font-medium text-muted-foreground hidden lg:table-cell w-20">Annual</th>
                        <th className="text-center px-1 py-2 font-medium text-muted-foreground hidden xl:table-cell w-10">Notes</th>
                        <th className="text-center px-1 py-2 font-medium text-muted-foreground w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoryEnvelopes.map((env, idx) => renderEnvelopeRow(env, idx))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}

        {/* Other/Uncategorized */}
        {envelopesByCategory['other']?.length > 0 && (
          <div className="border rounded-lg overflow-hidden">
            <div
              onClick={() => toggleCategory('other')}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-[#F3F4F6] border-b border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                {expandedCategories.has('other') ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="text-lg">📦</span>
                <span className="font-semibold text-gray-700">Other</span>
                <span className="text-sm text-muted-foreground">
                  ({envelopesByCategory['other'].length})
                </span>
                {/* Add Envelope Button */}
                <button
                  type="button"
                  onClick={(e) => handleAddEnvelopeToCategory('other', e)}
                  className="flex items-center gap-1 text-xs text-sage hover:text-sage-dark hover:bg-sage-very-light px-2 py-1 rounded transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  <span>Add</span>
                </button>
              </div>
              <span className="font-semibold text-[#5A7E7A]">
                {formatCurrency(sumPerPayInCategory('other'))}
              </span>
            </div>

            {expandedCategories.has('other') && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="w-6 px-1 py-2"></th>{/* Drag handle column */}
                      <th className="text-center px-1 py-2 font-medium text-muted-foreground w-10">Pri</th>
                      <th className="text-left px-2 py-2 font-medium text-muted-foreground">Envelope</th>
                      <th className="text-center px-1 py-2 font-medium text-muted-foreground hidden md:table-cell w-16">Type</th>
                      <th className="text-right px-1 py-2 font-medium text-muted-foreground w-20">Target</th>
                      <th className="text-center px-1 py-2 font-medium text-muted-foreground hidden sm:table-cell w-20">Freq</th>
                      <th className="text-center px-1 py-2 font-medium text-muted-foreground hidden lg:table-cell w-24">Due</th>
                      <th className="text-center px-1 py-2 font-medium text-muted-foreground hidden xl:table-cell w-24">Funded By</th>
                      <th className="text-right px-1 py-2 font-medium text-[#5A7E7A] w-20">Per Pay</th>
                      <th className="text-right px-1 py-2 font-medium text-muted-foreground hidden lg:table-cell w-20">Annual</th>
                      <th className="text-center px-1 py-2 font-medium text-muted-foreground hidden xl:table-cell w-10">Notes</th>
                      <th className="text-center px-1 py-2 font-medium text-muted-foreground w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {envelopesByCategory['other'].map((env, idx) => renderEnvelopeRow(env, idx))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Summary Footer */}
      <Card className="p-4 bg-white border-[#B8D4D0]" data-tutorial="summary-footer">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <p className="text-sm text-muted-foreground">Total Allocation Per Pay</p>
            <p className="text-2xl font-bold text-[#5A7E7A]">{formatCurrency(totals.totalPerPay)}</p>
          </div>

          <div className="flex items-center gap-6 text-sm">
            <div className="text-center">
              <p className="text-muted-foreground">Envelopes</p>
              <p className="font-semibold">{envelopes.length}</p>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground">Income</p>
              <p className="font-semibold">{formatCurrency(totals.incomePerPay)}</p>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground">
                {totals.surplus >= 0 ? 'Surplus' : 'Shortfall'}
              </p>
              <p className={`font-semibold ${totals.surplus >= 0 ? 'text-[#5A7E7A]' : 'text-[#6B9ECE]'}`}>
                {formatCurrency(Math.abs(totals.surplus))}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Balance Status Message */}
      {totals.surplus > 0 && totals.surplus < totals.incomePerPay * 0.1 && (
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-[#E2EEEC] border border-[#B8D4D0] rounded-lg px-4 py-2">
            <Check className="h-5 w-5 text-[#7A9E9A]" />
            <span className="text-sm font-medium text-text-dark">
              Looking good! You have {formatCurrency(totals.surplus)} surplus each pay.
            </span>
          </div>
        </div>
      )}

      {/* Leveling Dialogs */}
      {levelingEnvelope && levelingDetection && (
        <>
          <SeasonalBillDetectionDialog
            open={levelingDialogStep === 'detection'}
            onOpenChange={(open) => !open && handleCloseLevelingDialogs()}
            envelopeName={levelingEnvelope.name}
            matchedKeyword={levelingDetection.matchedKeyword || ''}
            suggestedPattern={levelingDetection.suggestedPattern || 'winter-peak'}
            confidence={levelingDetection.confidence}
            onSetupLeveling={handleLevelingMethodSelect}
            onSkip={handleCloseLevelingDialogs}
          />

          <QuickEstimateDialog
            open={levelingDialogStep === 'quick'}
            onOpenChange={(open) => !open && handleCloseLevelingDialogs()}
            envelopeName={levelingEnvelope.name}
            suggestedPattern={(levelingDetection.suggestedPattern as 'winter-peak' | 'summer-peak') || 'winter-peak'}
            onBack={() => setLevelingDialogStep('detection')}
            onSave={handleLevelingSave}
          />

          <TwelveMonthEntryDialog
            open={levelingDialogStep === '12month'}
            onOpenChange={(open) => !open && handleCloseLevelingDialogs()}
            envelopeName={levelingEnvelope.name}
            onBack={() => setLevelingDialogStep('detection')}
            onSave={handleLevelingSave}
          />
        </>
      )}

      {/* Celebration/Gift Allocation Dialog - for birthdays, Christmas, etc. */}
      {celebrationDialogEnvelope && (
        <GiftAllocationDialog
          open={!!celebrationEnvelopeId}
          onOpenChange={(open) => !open && handleCloseCelebrationDialog()}
          envelope={celebrationDialogEnvelope}
          existingRecipients={celebrationExistingRecipients}
          onSave={handleCelebrationSave}
        />
      )}

      {/* Add Envelope Dialog */}
      <Dialog open={addEnvelopeOpen} onOpenChange={setAddEnvelopeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Envelope</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="envelope-name">Name</Label>
              <Input
                id="envelope-name"
                placeholder="e.g., Car Insurance, Haircuts"
                value={newEnvelope.name}
                onChange={(e) => setNewEnvelope(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label htmlFor="envelope-type">Type</Label>
              <Select
                value={newEnvelope.type}
                onValueChange={(val) => setNewEnvelope(prev => ({ ...prev, type: val as typeof prev.type }))}
              >
                <SelectTrigger id="envelope-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bill">Bill</SelectItem>
                  <SelectItem value="spending">Spending</SelectItem>
                  <SelectItem value="savings">Savings</SelectItem>
                  <SelectItem value="goal">Goal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="envelope-amount">Amount</Label>
              <Input
                id="envelope-amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={newEnvelope.billAmount || ''}
                onChange={(e) => setNewEnvelope(prev => ({ ...prev, billAmount: parseFloat(e.target.value) || 0 }))}
              />
            </div>

            {/* Frequency */}
            <div className="space-y-2">
              <Label htmlFor="envelope-frequency">Frequency</Label>
              <div className="flex gap-2">
                <Select
                  value={newEnvelope.frequency}
                  onValueChange={(val) => setNewEnvelope(prev => ({ ...prev, frequency: val as typeof prev.frequency }))}
                >
                  <SelectTrigger id="envelope-frequency" className={newEnvelope.frequency === 'custom_weeks' ? 'flex-1' : 'w-full'}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="fortnightly">Fortnightly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                    <SelectItem value="custom_weeks">Every X Weeks</SelectItem>
                  </SelectContent>
                </Select>
                {newEnvelope.frequency === 'custom_weeks' && (
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min="1"
                      max="52"
                      value={newEnvelope.customWeeks}
                      onChange={(e) => setNewEnvelope(prev => ({ ...prev, customWeeks: parseInt(e.target.value) || 8 }))}
                      className="w-16 text-center"
                    />
                    <span className="text-sm text-muted-foreground">wks</span>
                  </div>
                )}
              </div>
              {newEnvelope.frequency === 'custom_weeks' && (
                <p className="text-xs text-muted-foreground">
                  e.g., haircuts every {newEnvelope.customWeeks} weeks = {Math.round(52 / newEnvelope.customWeeks * 10) / 10} times/year
                </p>
              )}
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label htmlFor="envelope-priority">Priority</Label>
              <Select
                value={newEnvelope.priority}
                onValueChange={(val) => setNewEnvelope(prev => ({ ...prev, priority: val as typeof prev.priority }))}
              >
                <SelectTrigger id="envelope-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="essential">Essential</SelectItem>
                  <SelectItem value="important">Important</SelectItem>
                  <SelectItem value="discretionary">Flexible</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="envelope-category">Category</Label>
              <Select
                value={newEnvelope.category}
                onValueChange={(val) => setNewEnvelope(prev => ({ ...prev, category: val }))}
              >
                <SelectTrigger id="envelope-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_ORDER.map((cat) => {
                    const info = CATEGORY_LABELS[cat as BuiltInCategory];
                    if (!info) return null;
                    return (
                      <SelectItem key={cat} value={cat}>
                        {info.icon} {info.label}
                      </SelectItem>
                    );
                  })}
                  <SelectItem value="other">📦 Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddEnvelopeOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddEnvelope}
              disabled={!newEnvelope.name.trim()}
              className="bg-sage hover:bg-sage-dark"
            >
              Add Envelope
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>

      {/* Drag Overlay - shows what's being dragged */}
      <DragOverlay>
        {activeDragEnvelope ? (
          <div className="bg-white border rounded-lg shadow-lg p-2 opacity-90">
            <div className="flex items-center gap-2">
              <span className="text-base">{activeDragEnvelope.icon}</span>
              <span className="text-sm font-medium">{activeDragEnvelope.name}</span>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
