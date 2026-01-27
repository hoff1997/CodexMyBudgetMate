"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { RefreshCw, ChevronDown, ChevronRight, StickyNote, Plus, ArrowUpDown, ArrowUp, ArrowDown, X, GripVertical, CheckCircle2, AlertCircle, TrendingUp, MinusCircle, DollarSign, Receipt, ArrowUpRight, Archive, Printer, Target, Sparkles, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RemyHelpPanel } from "@/components/coaching/RemyHelpPanel";
import { CoachingWidget } from "@/components/coaching/coaching-widget";
import { getTopSuggestions, type SmartSuggestion } from "@/lib/utils/smart-suggestion-generator";
import { IncomeProgressCard } from "@/components/allocation/income-progress-card";
import { IncomeCoachingBanner, IncomeInfoButton } from "@/components/allocation/income-coaching-banner";
import { calculateIdealAllocation, type PayCycle } from "@/lib/utils/ideal-allocation-calculator";
import type { UnifiedEnvelopeData, IncomeSource, PaySchedule } from "@/lib/types/unified-envelope";
import { cn } from "@/lib/cn";
import { getPrimaryPaySchedule, calculatePaysUntilDue, getNextDueDate } from "@/lib/utils/pays-until-due";
import { PaysUntilDueBadge, PaysUntilDuePlaceholder } from "@/components/shared/pays-until-due-badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EnvelopeCreateDialog } from "@/components/layout/envelopes/envelope-create-dialog";
import { EnvelopeTransferDialog } from "@/components/layout/envelopes/envelope-transfer-dialog";
import { EnvelopeFilterTabs, getStatusBucket, FILTER_OPTIONS, type StatusFilter } from "@/components/shared/envelope-filter-tabs";
import { CompactProgressBar } from "@/components/shared/envelope-progress-bar";
import { EnvelopeStatusBadge, calculateEnvelopeStatus } from "@/components/shared/envelope-status-badge";
import { MyBudgetWayWidget, type CreditCardDebtData, type SuggestedEnvelope, type MilestoneProgress } from "@/components/my-budget-way/my-budget-way-widget";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { MobileGuidanceBanner } from "@/components/allocation/mobile-guidance-banner";
import { ChangeCategoryDialog } from "@/components/allocation/change-category-dialog";
import { CategoryGroups } from "@/components/allocation/category-groups";
import { ArchiveEnvelopeDialog } from "@/components/allocation/archive-envelope-dialog";
import { SnapshotView } from "@/components/allocation/snapshot-view";
import { LeveledIndicator, SeasonalBillDetectionDialog, TwelveMonthEntryDialog, QuickEstimateDialog } from "@/components/leveled-bills";
import { detectSeasonalBill } from "@/lib/utils/seasonal-bills";
import { Thermometer } from "lucide-react";
import type { LevelingData, SeasonalPatternType } from "@/lib/types/unified-envelope";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, FolderInput, History, Eye } from "lucide-react";
import { MilestoneCompletionDialog } from "@/components/milestones/milestone-completion-dialog";
import type { DetectedMilestone } from "@/lib/utils/milestone-detector";
import { SortButton, type SortColumn, type SortDirection } from "@/components/allocation/sort-banner";
import { GiftAllocationDialog } from "@/components/celebrations/gift-allocation-dialog";
import { DebtAllocationDialog } from "@/components/debt/debt-allocation-dialog";
import { Gift, CreditCard } from "lucide-react";
import type { GiftRecipient, GiftRecipientInput } from "@/lib/types/celebrations";
import { IconPicker } from "@/components/onboarding/icon-picker";
import { EnvelopeIcon } from "@/components/shared/envelope-icon";
import type { DebtItem, DebtItemInput, LinkedCreditCard } from "@/lib/types/debt";
import { useCelebrationReadiness, getEnvelopeReadiness, type CelebrationReadinessData } from "@/lib/hooks/use-celebration-readiness";
import { CelebrationReadinessBadge, CelebrationReadinessPlaceholder } from "@/components/shared/celebration-readiness-badge";

type PriorityLevel = 'essential' | 'important' | 'discretionary';

const PRIORITY_CONFIG: Record<PriorityLevel, {
  label: string;
  dotColor: string;
  bgColor: string;
  borderColor: string;
}> = {
  essential: {
    label: "ESSENTIAL",
    dotColor: "bg-[#6B9ECE]", // blue
    bgColor: "bg-[#DDEAF5]", // blue-light
    borderColor: "border-[#6B9ECE]", // blue
  },
  important: {
    label: "IMPORTANT",
    dotColor: "bg-[#5A7E7A]", // sage-dark
    bgColor: "bg-[#E2EEEC]", // sage-very-light
    borderColor: "border-[#B8D4D0]", // sage-light
  },
  discretionary: {
    label: "FLEXIBLE",
    dotColor: "bg-[#9CA3AF]", // silver
    bgColor: "bg-[#F3F4F6]", // silver-very-light
    borderColor: "border-[#E5E7EB]", // silver-light
  },
};

const SUBTYPE_OPTIONS = [
  { value: 'bill', label: 'Bill' },
  { value: 'spending', label: 'Spending' },
  { value: 'savings', label: 'Savings' },
  { value: 'goal', label: 'Goal' },
  { value: 'tracking', label: 'Tracking' },
  { value: 'debt', label: 'Debt' },
];

const FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'Weekly', abbrev: 'Wk', multiplier: 52 },
  { value: 'fortnightly', label: 'Fortnightly', abbrev: 'FN', multiplier: 26 },
  { value: 'monthly', label: 'Monthly', abbrev: 'Mth', multiplier: 12 },
  { value: 'quarterly', label: 'Quarterly', abbrev: 'Q', multiplier: 4 },
  { value: '6_monthly', label: '6 Monthly', abbrev: '6M', multiplier: 2 },
  { value: 'annually', label: 'Annually', abbrev: 'Yr', multiplier: 1 },
  { value: 'custom_weeks', label: 'Every X Weeks', abbrev: 'Custom', multiplier: 0 }, // multiplier calculated dynamically
];

// Format frequency as abbreviation for display
function formatFrequencyAbbrev(frequency: string, customWeeks?: number): string {
  if (frequency === 'custom_weeks' && customWeeks) {
    return `${customWeeks}wk`;
  }
  const freq = FREQUENCY_OPTIONS.find(f => f.value === frequency.toLowerCase());
  return freq?.abbrev || frequency;
}

// Get envelope status info including icon, tooltip, and shortfall amount
function getEnvelopeStatusIcon(envelope: {
  is_tracking_only?: boolean;
  subtype?: string;
  targetAmount?: number;
  currentAmount?: number;
}): { icon: React.ReactNode; tooltip: string; status: 'tracking' | 'spending' | 'no-target' | 'surplus' | 'on-track' | 'underfunded'; shortfall: number; surplus: number } {
  // Tracking envelopes
  if (envelope.is_tracking_only || envelope.subtype === 'tracking') {
    return {
      icon: <Receipt className="h-4 w-4 text-[#9CA3AF]" />,
      tooltip: "Tracking only",
      status: 'tracking',
      shortfall: 0,
      surplus: 0
    };
  }

  // Spending envelopes
  if (envelope.subtype === 'spending') {
    return {
      icon: <DollarSign className="h-4 w-4 text-[#9CA3AF]" />,
      tooltip: "Spending envelope",
      status: 'spending',
      shortfall: 0,
      surplus: 0
    };
  }

  // No target set
  const target = Number(envelope.targetAmount ?? 0);
  if (!target || target === 0) {
    return {
      icon: <MinusCircle className="h-4 w-4 text-[#9CA3AF]" />,
      tooltip: "No target set",
      status: 'no-target',
      shortfall: 0,
      surplus: 0
    };
  }

  // Calculate funding ratio
  const current = Number(envelope.currentAmount ?? 0);
  const ratio = current / target;
  const difference = current - target;

  // Surplus (≥105%)
  if (ratio >= 1.05) {
    return {
      icon: <Sparkles className="h-4 w-4 text-[#7A9E9A]" />,
      tooltip: `Surplus - $${difference.toFixed(2)} over target`,
      status: 'surplus',
      shortfall: 0,
      surplus: difference
    };
  }

  // On track (≥80%)
  if (ratio >= 0.8) {
    return {
      icon: <CheckCircle2 className="h-4 w-4 text-[#7A9E9A]" />,
      tooltip: "On track - 80%+ funded",
      status: 'on-track',
      shortfall: Math.max(0, target - current),
      surplus: 0
    };
  }

  // Needs attention (<80%)
  return {
    icon: <AlertCircle className="h-4 w-4 text-[#6B9ECE]" />,
    tooltip: `Needs $${(target - current).toFixed(2)} more`,
    status: 'underfunded',
    shortfall: target - current,
    surplus: 0
  };
}

/**
 * AllocationClient - Budget Allocation Page matching HTML mockup
 * Single table view with "Funded By" column instead of tabs
 */
export function AllocationClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [envelopes, setEnvelopes] = useState<UnifiedEnvelopeData[]>([]);
  const [originalAllocations, setOriginalAllocations] = useState<Record<string, Record<string, number>>>({});
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [payCycle, setPayCycle] = useState<PayCycle>("fortnightly");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'pending' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingChangesRef = useRef<Set<string>>(new Set()); // Track which envelopes have pending changes
  const [expandedGroups, setExpandedGroups] = useState<Record<PriorityLevel, boolean>>({
    essential: true,
    important: true,
    discretionary: true,
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [createDefaultPriority, setCreateDefaultPriority] = useState<"essential" | "important" | "discretionary" | undefined>(undefined);
  const [categories, setCategories] = useState<{
    id: string;
    name: string;
    icon?: string | null;
    color?: string | null;
    is_system: boolean;
    display_order: number;
  }[]>([]);
  const [highlightedEnvelopeId, setHighlightedEnvelopeId] = useState<string | null>(null);
  const [showIncomeCoaching, setShowIncomeCoaching] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // View mode: priority (default), category, or snapshot
  const [viewMode, setViewMode] = useState<'priority' | 'category' | 'snapshot'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('allocation-view-mode');
      if (stored === 'category' || stored === 'snapshot') {
        return stored;
      }
    }
    return 'priority';
  });

  // Sort state with URL persistence
  // No pre-selected sort for any view - user must choose
  const [sortColumn, setSortColumn] = useState<SortColumn>(() => {
    const urlSort = searchParams.get('sort');
    const validSorts = ['name', 'category', 'priority', 'status', 'subtype', 'targetAmount', 'frequency', 'dueDate', 'currentAmount', 'totalFunded'];
    if (urlSort && validSorts.includes(urlSort)) {
      return urlSort as SortColumn;
    }
    // No default sort - return null for all views
    return null;
  });
  const [sortDirection, setSortDirection] = useState<SortDirection>(() => {
    const urlDir = searchParams.get('dir');
    return urlDir === 'desc' ? 'desc' : 'asc';
  });

  // Handle sort change with URL persistence
  const handleSortChange = useCallback((column: SortColumn, direction: SortDirection) => {
    setSortColumn(column);
    setSortDirection(direction);

    // Update URL params
    const params = new URLSearchParams(searchParams.toString());
    if (column) {
      params.set('sort', column);
      params.set('dir', direction);
    } else {
      params.delete('sort');
      params.delete('dir');
    }
    router.replace(`/budgetallocation?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  // Change category dialog state
  const [changeCategoryDialogOpen, setChangeCategoryDialogOpen] = useState(false);
  const [selectedEnvelopeForCategory, setSelectedEnvelopeForCategory] = useState<UnifiedEnvelopeData | null>(null);
  const [creditCardDebt, setCreditCardDebt] = useState<CreditCardDebtData | null>(null);
  const [myBudgetWayExpanded, setMyBudgetWayExpanded] = useState(true);

  // Transfer funds dialog state
  const [transferOpen, setTransferOpen] = useState(false);

  // Archive envelope dialog state
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [envelopeToArchive, setEnvelopeToArchive] = useState<UnifiedEnvelopeData | null>(null);

  // Leveled bill dialog state
  const [levelingDialogOpen, setLevelingDialogOpen] = useState(false);
  const [levelingStep, setLevelingStep] = useState<'detection' | '12-month' | 'quick-estimate'>('detection');
  const [envelopeToLevel, setEnvelopeToLevel] = useState<UnifiedEnvelopeData | null>(null);
  const [detectedSeasonalInfo, setDetectedSeasonalInfo] = useState<{
    matchedKeyword: string;
    suggestedPattern: SeasonalPatternType;
    confidence: 'high' | 'medium' | 'low';
  } | null>(null);

  // Printable area ref for print styling
  const printableAreaRef = useRef<HTMLDivElement>(null);

  // Milestone celebration state
  const [currentMilestone, setCurrentMilestone] = useState<DetectedMilestone | null>(null);
  const [milestoneDialogOpen, setMilestoneDialogOpen] = useState(false);

  // Gift allocation dialog state (for celebration envelopes)
  const [giftDialogOpen, setGiftDialogOpen] = useState(false);
  const [giftEnvelope, setGiftEnvelope] = useState<UnifiedEnvelopeData | null>(null);
  const [giftRecipients, setGiftRecipients] = useState<GiftRecipient[]>([]);

  // Debt allocation dialog state (for debt envelopes)
  const [debtDialogOpen, setDebtDialogOpen] = useState(false);
  const [debtEnvelope, setDebtEnvelope] = useState<UnifiedEnvelopeData | null>(null);
  const [debtItems, setDebtItems] = useState<DebtItem[]>([]);
  const [availableCreditCards, setAvailableCreditCards] = useState<LinkedCreditCard[]>([]);

  // Celebration readiness data for celebration envelopes
  const { data: celebrationReadinessMap } = useCelebrationReadiness();

  // ========================
  // ENHANCED VIEW FEATURE FLAG
  // ========================
  // This flag controls whether the enhanced view features are shown:
  // - Budget summary cards
  // - Filter tabs
  // - Additional columns (progress, current, status, gap)
  // Toggle this to revert to the original allocation view
  const [enhancedView, setEnhancedView] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('allocation-enhanced-view');
      return stored !== 'false'; // Default to true
    }
    return true;
  });

  // Filter state for enhanced view
  const [activeFilter, setActiveFilter] = useState<StatusFilter>("all");

  // Toggle enhanced view and persist to localStorage
  const toggleEnhancedView = useCallback(() => {
    setEnhancedView(prev => {
      const newValue = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('allocation-enhanced-view', String(newValue));
      }
      return newValue;
    });
  }, []);

  // Toggle view mode (priority/category/snapshot) and persist to localStorage
  const toggleViewMode = useCallback((mode: 'priority' | 'category' | 'snapshot') => {
    setViewMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('allocation-view-mode', mode);
    }
    // When switching to snapshot view and no sort is active, default to dueDate
    if (mode === 'snapshot' && !sortColumn) {
      handleSortChange('dueDate', 'asc');
    }
  }, [sortColumn, handleSortChange]);

  // Handle opening change category dialog
  const handleChangeCategoryClick = useCallback((envelope: UnifiedEnvelopeData) => {
    setSelectedEnvelopeForCategory(envelope);
    setChangeCategoryDialogOpen(true);
  }, []);

  // Handle opening archive dialog
  const handleArchiveClick = useCallback((envelope: UnifiedEnvelopeData) => {
    setEnvelopeToArchive(envelope);
    setArchiveDialogOpen(true);
  }, []);

  // Handle editing a category (name, icon, color)
  const handleEditCategory = useCallback(async (
    categoryId: string,
    updates: { name?: string; icon?: string; color?: string }
  ) => {
    try {
      const res = await fetch(`/api/envelope-categories/${categoryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        // Update local categories state
        setCategories(prev => prev.map(cat =>
          cat.id === categoryId
            ? { ...cat, ...updates }
            : cat
        ));
      } else {
        throw new Error('Failed to update category');
      }
    } catch (error) {
      console.error('Failed to update category:', error);
    }
  }, []);

  // Handle archiving an envelope
  const handleArchive = useCallback(async (envelopeId: string, reason?: string) => {
    try {
      const res = await fetch(`/api/envelopes/${envelopeId}/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });

      if (res.ok) {
        // Remove from local state
        setEnvelopes(prev => prev.filter(env => env.id !== envelopeId));
      } else {
        throw new Error('Failed to archive');
      }
    } catch (error) {
      console.error('Failed to archive envelope:', error);
      throw error;
    }
  }, []);

  // Handle opening gift allocation dialog for celebration envelopes
  const handleGiftAllocationClick = useCallback(async (envelope: UnifiedEnvelopeData) => {
    // Set envelope and open dialog immediately
    setGiftEnvelope(envelope);
    setGiftRecipients([]);
    setGiftDialogOpen(true);

    // Fetch existing gift recipients in background
    try {
      const res = await fetch(`/api/envelopes/${envelope.id}/gift-recipients`);
      if (res.ok) {
        const data = await res.json();
        setGiftRecipients(data.recipients || []);
      }
    } catch (error) {
      console.error('Failed to fetch gift recipients:', error);
    }
  }, []);

  // Handle saving gift recipients
  const handleSaveGiftRecipients = useCallback(async (
    recipients: GiftRecipientInput[],
    budgetChange: number,
    envelopeUpdates?: { name?: string; icon?: string; category_id?: string; priority?: string; notes?: string }
  ) => {
    if (!giftEnvelope) return;

    // Save recipients
    const res = await fetch(`/api/envelopes/${giftEnvelope.id}/gift-recipients`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipients }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      console.error('Gift recipients save failed:', res.status, errorData);
      throw new Error(errorData.error || 'Failed to save gift recipients');
    }

    const data = await res.json();

    // If there are envelope updates, save them too
    if (envelopeUpdates && Object.keys(envelopeUpdates).length > 0) {
      const envelopeRes = await fetch(`/api/envelopes/${giftEnvelope.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envelopeUpdates),
      });

      if (!envelopeRes.ok) {
        console.error('Failed to update envelope settings');
        // Non-fatal - recipients were saved
      }
    }

    // Update local envelope state with new target amount, recipient count, and any updates
    setEnvelopes(prev => prev.map(env => {
      if (env.id !== giftEnvelope.id) return env;

      const updated: UnifiedEnvelopeData = {
        ...env,
        targetAmount: data.total_budget,
        is_celebration: true,
        gift_recipient_count: data.recipients?.length || 0,
      };

      // Apply envelope updates to local state with proper typing
      if (envelopeUpdates?.name) updated.name = envelopeUpdates.name;
      if (envelopeUpdates?.icon) updated.icon = envelopeUpdates.icon;
      if (envelopeUpdates?.category_id !== undefined) {
        updated.category_id = envelopeUpdates.category_id || null;
      }
      if (envelopeUpdates?.priority) {
        updated.priority = envelopeUpdates.priority as 'essential' | 'important' | 'discretionary';
      }
      if (envelopeUpdates?.notes !== undefined) updated.notes = envelopeUpdates.notes || '';

      return updated;
    }));

    // Refresh data
    // Could also do: queryClient.invalidateQueries(['envelopes']);
  }, [giftEnvelope]);

  // Handle opening debt allocation dialog for debt envelopes
  const handleDebtAllocationClick = useCallback(async (envelope: UnifiedEnvelopeData) => {
    // Set envelope and open dialog immediately
    setDebtEnvelope(envelope);
    setDebtItems([]);
    setAvailableCreditCards([]);
    setDebtDialogOpen(true);

    // Fetch existing debt items and available credit cards in parallel
    try {
      const [debtRes, accountsRes] = await Promise.all([
        fetch(`/api/envelopes/${envelope.id}/debt-items`),
        fetch('/api/accounts?type=debt'),
      ]);

      if (debtRes.ok) {
        const data = await debtRes.json();
        setDebtItems(data.items || []);
      }

      if (accountsRes.ok) {
        const accountsData = await accountsRes.json();
        // Map accounts to LinkedCreditCard format
        const linkedAccountIds = (debtItems || []).map(d => d.linked_account_id).filter(Boolean);
        const creditCards: LinkedCreditCard[] = (accountsData.accounts || [])
          .filter((acc: any) => acc.type === 'debt' || acc.is_credit_card)
          .map((acc: any) => ({
            id: acc.id,
            name: acc.name,
            current_balance: Math.abs(acc.current_balance || 0),
            is_already_linked: linkedAccountIds.includes(acc.id),
          }));
        setAvailableCreditCards(creditCards);
      }
    } catch (error) {
      console.error('Failed to fetch debt data:', error);
    }
  }, [debtItems]);

  // Handle saving debt items
  const handleSaveDebtItems = useCallback(async (
    items: DebtItemInput[],
    budgetChange: number
  ) => {
    if (!debtEnvelope) return;

    // Save debt items
    const res = await fetch(`/api/envelopes/${debtEnvelope.id}/debt-items`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      console.error('Debt items save failed:', res.status, errorData);
      throw new Error(errorData.error || 'Failed to save debt items');
    }

    const data = await res.json();

    // Update local envelope state with new target amount (sum of minimum payments)
    setEnvelopes(prev => prev.map(env => {
      if (env.id !== debtEnvelope.id) return env;

      const totalMinPayments = (data.items || []).reduce(
        (sum: number, item: DebtItem) => sum + Number(item.minimum_payment || 0), 0
      );

      return {
        ...env,
        targetAmount: totalMinPayments,
        is_debt: true,
        debt_item_count: data.items?.length || 0,
        total_debt_amount: data.summary?.total_debt || 0,
      };
    }));
  }, [debtEnvelope]);

  // Handle opening leveling dialog
  const handleLevelBillClick = useCallback((envelope: UnifiedEnvelopeData) => {
    // Detect if this is a seasonal bill
    const detection = detectSeasonalBill(envelope.name);

    if (detection.isLikelySeasonal && detection.suggestedPattern) {
      setDetectedSeasonalInfo({
        matchedKeyword: detection.matchedKeyword || envelope.name,
        suggestedPattern: detection.suggestedPattern,
        confidence: detection.confidence,
      });
    } else {
      // Default to winter-peak for bills we can't detect
      setDetectedSeasonalInfo({
        matchedKeyword: envelope.name,
        suggestedPattern: 'winter-peak',
        confidence: 'low',
      });
    }

    setEnvelopeToLevel(envelope);
    setLevelingStep('detection');
    setLevelingDialogOpen(true);
  }, []);

  // Handle saving leveling data
  const handleSaveLevelingData = useCallback(async (levelingData: LevelingData) => {
    if (!envelopeToLevel || !detectedSeasonalInfo) return;

    try {
      const res = await fetch(`/api/envelopes/${envelopeToLevel.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_leveled: true,
          leveling_data: levelingData,
          seasonal_pattern: detectedSeasonalInfo.suggestedPattern,
        }),
      });

      if (res.ok) {
        // Update local state
        setEnvelopes(prev => prev.map(env =>
          env.id === envelopeToLevel.id
            ? {
                ...env,
                is_leveled: true,
                leveling_data: levelingData,
                seasonal_pattern: detectedSeasonalInfo.suggestedPattern,
              }
            : env
        ));
        // Close dialogs
        setLevelingDialogOpen(false);
        setEnvelopeToLevel(null);
        setDetectedSeasonalInfo(null);
      }
    } catch (error) {
      console.error('Failed to save leveling data:', error);
    }
  }, [envelopeToLevel, detectedSeasonalInfo]);

  // Handle category change for an envelope
  const handleCategoryChange = useCallback(async (envelopeId: string, categoryId: string | null) => {
    try {
      const res = await fetch(`/api/envelopes/${envelopeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category_id: categoryId }),
      });

      if (res.ok) {
        // Update local state
        setEnvelopes(prev => prev.map(env =>
          env.id === envelopeId ? { ...env, category_id: categoryId } : env
        ));
      }
    } catch (error) {
      console.error('Failed to change category:', error);
    }
  }, []);

  // Handle creating a new category
  const handleCreateCategory = useCallback(async (name: string, icon?: string) => {
    const res = await fetch('/api/envelope-categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, icon }),
    });

    if (!res.ok) {
      throw new Error('Failed to create category');
    }

    const { category } = await res.json();

    // Add to local state
    setCategories(prev => [...prev, category]);

    return category;
  }, []);

  // Handle column header click for sorting
  const handleSort = useCallback((column: SortColumn) => {
    let newColumn: SortColumn = column;
    let newDirection: SortDirection = 'asc';

    if (sortColumn === column) {
      // Same column - toggle direction or clear
      if (sortDirection === 'asc') {
        newDirection = 'desc';
      } else {
        // Third click - clear sort
        newColumn = null;
        newDirection = 'asc';
      }
    }

    // Use handleSortChange to update both state and URL
    handleSortChange(newColumn, newDirection);
  }, [sortColumn, sortDirection, handleSortChange]);

  // Get sort icon for column header
  const getSortIcon = useCallback((column: SortColumn) => {
    if (sortColumn !== column) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDirection === 'asc'
      ? <ArrowUp className="h-3 w-3 ml-1" />
      : <ArrowDown className="h-3 w-3 ml-1" />;
  }, [sortColumn, sortDirection]);

  // Check for openCreateEnvelope query param
  useEffect(() => {
    if (searchParams.get("openCreateEnvelope") === "true") {
      setCreateOpen(true);
      // Clean up the URL without the query param
      router.replace("/budgetallocation", { scroll: false });
    }
  }, [searchParams, router]);

  // Handle highlight query param for newly created envelopes
  useEffect(() => {
    const highlightId = searchParams.get("highlight");
    if (highlightId && highlightId !== "new") {
      setHighlightedEnvelopeId(highlightId);
      // Clean up the URL
      router.replace("/budgetallocation", { scroll: false });

      // Remove highlight after 3 seconds
      const timer = setTimeout(() => {
        setHighlightedEnvelopeId(null);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [searchParams, router]);

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, []);

  // Check for milestones after data loads
  useEffect(() => {
    if (!isLoading && envelopes.length > 0) {
      checkForMilestones();
    }
  }, [isLoading, envelopes.length]);

  // Milestone detection function
  const checkForMilestones = async () => {
    try {
      const response = await fetch("/api/milestones/detect");
      if (response.ok) {
        const data = await response.json();
        if (data.topMilestone) {
          setCurrentMilestone(data.topMilestone);
          setMilestoneDialogOpen(true);
        }
      }
    } catch (error) {
      console.error("Failed to check milestones:", error);
    }
  };

  // Handle dismissing a milestone
  const handleDismissMilestone = async () => {
    if (!currentMilestone) return;
    try {
      await fetch("/api/milestones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ milestoneKey: currentMilestone.key }),
      });
    } catch (error) {
      console.error("Failed to dismiss milestone:", error);
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [envelopesRes, incomeRes, userRes, allocationsRes, categoriesRes] = await Promise.all([
        fetch("/api/envelopes"),
        fetch("/api/income-sources"),
        fetch("/api/user-preferences"),
        fetch("/api/envelope-income-allocations"),
        fetch("/api/envelope-categories"),
      ]);

      let categoriesData: Array<{ id: string; name: string; icon?: string | null; is_system: boolean; display_order: number }> = [];
      if (categoriesRes.ok) {
        const { categories: cats } = await categoriesRes.json();
        categoriesData = cats || [];
        setCategories(categoriesData);
      }

      // Build category lookup map
      const categoryLookup = new Map<string, string>();
      categoriesData.forEach((cat) => {
        categoryLookup.set(cat.id, cat.name);
      });

      let allocationsData: Record<string, Record<string, number>> = {};
      if (allocationsRes.ok) {
        allocationsData = await allocationsRes.json();
      }

      if (envelopesRes.ok) {
        const data = await envelopesRes.json();
        const transformed: UnifiedEnvelopeData[] = data.map((env: any) => ({
          id: env.id,
          icon: env.icon || "📁",
          name: env.name,
          subtype: env.subtype || "bill",
          targetAmount: env.target_amount || 0,
          frequency: env.frequency || "monthly",
          dueDate: env.due_date,
          priority: env.priority || "discretionary",
          notes: env.notes,
          currentAmount: env.current_amount || 0,
          openingBalance: env.opening_balance || 0,
          incomeAllocations: allocationsData[env.id] || {},
          is_tracking_only: env.is_tracking_only,
          is_monitored: env.is_monitored ?? false,
          // Category fields
          category_id: env.category_id,
          category_name: env.category_id ? categoryLookup.get(env.category_id) || null : null,
          category_display_order: env.category_display_order,
          // Suggested envelope fields
          is_suggested: env.is_suggested,
          suggestion_type: env.suggestion_type,
          is_dismissed: env.is_dismissed,
          auto_calculate_target: env.auto_calculate_target,
          description: env.description,
          snoozed_until: env.snoozed_until,
          // Leveled bill fields - infer is_leveled from leveling_data if flag is missing
          is_leveled: env.is_leveled || (env.leveling_data && Object.keys(env.leveling_data).length > 0),
          leveling_data: env.leveling_data,
          seasonal_pattern: env.seasonal_pattern,
          // Celebration envelope fields
          is_celebration: env.is_celebration,
          gift_recipient_count: env.gift_recipient_count,
        }));
        setEnvelopes(transformed);

        const origAllocs: Record<string, Record<string, number>> = {};
        transformed.forEach(env => {
          origAllocs[env.id] = { ...(allocationsData[env.id] || {}) };
        });
        setOriginalAllocations(origAllocs);

        if (Object.keys(allocationsData).length > 0) {
          setLastSavedAt(new Date());
        }
      }

      if (incomeRes.ok) {
        const data = await incomeRes.json();
        const sources: IncomeSource[] = data.map((src: any) => ({
          id: src.id,
          name: src.name,
          amount: src.typical_amount || 0,
          frequency: src.pay_cycle || "fortnightly",
          nextPayDate: src.next_pay_date || undefined,
          isActive: src.is_active !== false,
        }));
        setIncomeSources(sources.filter(s => s.isActive));
      }

      if (userRes.ok) {
        const data = await userRes.json();
        if (data.pay_cycle) {
          setPayCycle(data.pay_cycle as PayCycle);
        }
      }

      // Fetch credit card debt data for My Budget Way widget
      try {
        const ccDebtRes = await fetch("/api/credit-card-debt");
        if (ccDebtRes.ok) {
          const ccData = await ccDebtRes.json();
          setCreditCardDebt(ccData);
        }
      } catch {
        // Credit card debt is optional, continue without it
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Calculate per-pay amount
   */
  const calculatePerPay = useCallback((envelope: UnifiedEnvelopeData): number => {
    if (!envelope.targetAmount || envelope.subtype === 'tracking') {
      return 0;
    }
    return calculateIdealAllocation(
      { target_amount: envelope.targetAmount, frequency: (envelope.frequency as any) || "monthly" },
      payCycle
    );
  }, [payCycle]);

  /**
   * Calculate annual amount
   */
  const calculateAnnual = useCallback((envelope: UnifiedEnvelopeData): number => {
    if (!envelope.targetAmount) return 0;
    // Handle custom weeks frequency (e.g., every 8 weeks = 52/8 = 6.5 times per year)
    if (envelope.frequency === 'custom_weeks' && envelope.custom_weeks && envelope.custom_weeks > 0) {
      return envelope.targetAmount * (52 / envelope.custom_weeks);
    }
    const freq = FREQUENCY_OPTIONS.find(f => f.value === envelope.frequency);
    return envelope.targetAmount * (freq?.multiplier || 12);
  }, []);

  /**
   * Calculate income allocations for progress bars
   */
  const incomeAllocations = useMemo(() => {
    return incomeSources.map(income => {
      const totalAllocated = envelopes.reduce((sum, env) => {
        return sum + (env.incomeAllocations?.[income.id] || 0);
      }, 0);
      return {
        ...income,
        allocated: totalAllocated,
        remaining: income.amount - totalAllocated,
        percentUsed: income.amount > 0 ? (totalAllocated / income.amount) * 100 : 0,
      };
    });
  }, [incomeSources, envelopes]);

  /**
   * Calculate primary pay schedule for "Due In" column
   */
  const paySchedule = useMemo<PaySchedule | null>(() => {
    return getPrimaryPaySchedule(incomeSources, payCycle as 'weekly' | 'fortnightly' | 'monthly');
  }, [incomeSources, payCycle]);

  /**
   * Sort function for envelopes
   */
  const sortEnvelopes = useCallback((envList: UnifiedEnvelopeData[], column: SortColumn, direction: SortDirection): UnifiedEnvelopeData[] => {
    if (!column) return envList;

    const sorted = [...envList];
    const priorityOrder = { essential: 1, important: 2, discretionary: 3 };
    const frequencyOrder: Record<string, number> = {
      weekly: 1, fortnightly: 2, twice_monthly: 3,
      monthly: 4, quarterly: 5, annual: 6
    };

    sorted.sort((a, b) => {
      let comparison = 0;

      switch (column) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;

        case 'category':
          const catA = a.category_name || '';
          const catB = b.category_name || '';
          comparison = catA.localeCompare(catB);
          break;

        case 'priority':
          const orderA = priorityOrder[a.priority as keyof typeof priorityOrder] || 999;
          const orderB = priorityOrder[b.priority as keyof typeof priorityOrder] || 999;
          comparison = orderA - orderB;
          break;

        case 'status':
          // Status is based on funding ratio: needs attention < on track < surplus
          const getStatusOrder = (env: UnifiedEnvelopeData): number => {
            if (env.is_tracking_only || env.subtype === 'tracking' || env.subtype === 'spending') return 4; // No status
            const target = Number(env.targetAmount ?? 0);
            if (!target || target === 0) return 4; // No target
            const current = Number(env.currentAmount ?? 0);
            const ratio = current / target;
            if (ratio >= 1.05) return 3; // Surplus
            if (ratio >= 0.8) return 2; // On track
            return 1; // Needs attention
          };
          comparison = getStatusOrder(a) - getStatusOrder(b);
          break;

        case 'subtype':
          comparison = (a.subtype || '').localeCompare(b.subtype || '');
          break;

        case 'targetAmount':
          comparison = (Number(a.targetAmount) || 0) - (Number(b.targetAmount) || 0);
          break;

        case 'frequency':
          const freqA = a.frequency ? (frequencyOrder[a.frequency] || 999) : 999;
          const freqB = b.frequency ? (frequencyOrder[b.frequency] || 999) : 999;
          comparison = freqA - freqB;
          break;

        case 'dueDate':
          const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          comparison = dateA - dateB;
          break;

        case 'currentAmount':
          comparison = (Number(a.currentAmount) || 0) - (Number(b.currentAmount) || 0);
          break;

        case 'totalFunded':
          // Sum all income allocations for each envelope
          const totalA = Object.values(a.incomeAllocations || {}).reduce(
            (sum: number, amt) => sum + (Number(amt) || 0), 0
          );
          const totalB = Object.values(b.incomeAllocations || {}).reduce(
            (sum: number, amt) => sum + (Number(amt) || 0), 0
          );
          comparison = totalA - totalB;
          break;
      }

      return direction === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, []);

  /**
   * Search-filtered envelopes
   * Filters by name when search query is active
   */
  const searchFilteredEnvelopes = useMemo(() => {
    if (!searchQuery.trim()) return envelopes;
    const query = searchQuery.toLowerCase().trim();
    return envelopes.filter(env => env.name.toLowerCase().includes(query));
  }, [envelopes, searchQuery]);

  /**
   * Group envelopes by priority (excluding suggested and tracking-only)
   * Applies sorting within each priority group
   */
  const envelopesByPriority = useMemo(() => {
    const nonTrackingNonSuggested = searchFilteredEnvelopes.filter(e => !e.is_tracking_only && !e.is_suggested);
    return {
      essential: sortEnvelopes(nonTrackingNonSuggested.filter(e => e.priority === 'essential'), sortColumn, sortDirection),
      important: sortEnvelopes(nonTrackingNonSuggested.filter(e => e.priority === 'important'), sortColumn, sortDirection),
      discretionary: sortEnvelopes(nonTrackingNonSuggested.filter(e => e.priority === 'discretionary'), sortColumn, sortDirection),
    };
  }, [searchFilteredEnvelopes, sortColumn, sortDirection, sortEnvelopes]);

  /**
   * Get suggested envelopes for My Budget Way widget
   */
  const suggestedEnvelopes = useMemo<SuggestedEnvelope[]>(() => {
    return envelopes
      .filter(e => e.is_suggested && !e.is_dismissed)
      .map(e => ({
        id: e.id,
        name: e.name,
        icon: e.icon,
        target_amount: e.targetAmount,
        current_amount: e.currentAmount,
        suggestion_type: e.suggestion_type,
        is_suggested: e.is_suggested,
        is_dismissed: e.is_dismissed,
        snoozed_until: e.snoozed_until,
        description: e.description,
      }));
  }, [envelopes]);

  /**
   * Calculate milestone progress for My Budget Way widget
   */
  const milestoneProgress = useMemo<MilestoneProgress>(() => {
    // Filter to regular envelopes (exclude suggested and tracking-only)
    // Include spending envelopes as they still have budget allocations
    const regularEnvelopes = envelopes.filter(e =>
      !e.is_suggested &&
      !e.is_tracking_only &&
      e.subtype !== 'tracking'
    );

    // Only count envelopes with actual targets for totals
    const envelopesWithTargets = regularEnvelopes.filter(e => (e.targetAmount || 0) > 0);
    const totalTarget = envelopesWithTargets.reduce((sum, e) => sum + (e.targetAmount || 0), 0);
    const totalCurrent = envelopesWithTargets.reduce((sum, e) => sum + (e.currentAmount || 0), 0);
    const overallProgress = totalTarget > 0 ? Math.min(100, (totalCurrent / totalTarget) * 100) : 100;

    // Count funded vs total (for envelopes with targets)
    const fundedCount = envelopesWithTargets.filter(e => {
      const target = e.targetAmount || 0;
      const current = e.currentAmount || 0;
      return current >= target * 0.8; // 80% or more = funded
    }).length;

    // Check if essentials are underfunded
    const essentials = envelopesWithTargets.filter(e => e.priority === 'essential');
    const essentialsUnderfunded = essentials.some(e => {
      const target = e.targetAmount || 0;
      const current = e.currentAmount || 0;
      return target > 0 && current < target * 0.8;
    });

    return {
      overallProgress,
      totalTarget,
      totalCurrent,
      fundingGap: Math.max(0, totalTarget - totalCurrent),
      fundedCount,
      totalCount: envelopesWithTargets.length,
      needsFunding: envelopesWithTargets.length - fundedCount,
      shouldShowEnvelopeRow: envelopesWithTargets.length > 0,
      essentialsUnderfunded,
    };
  }, [envelopes]);

  /**
   * Calculate status counts for filter tabs (enhanced view)
   */
  const statusCounts = useMemo(() => {
    // Only count non-suggested envelopes to match filtering behavior
    const nonSuggestedEnvelopes = envelopes.filter(e => !e.is_suggested);
    const counts: Record<StatusFilter, number> = {
      all: nonSuggestedEnvelopes.length,
      healthy: 0,
      attention: 0,
      surplus: 0,
      "no-target": 0,
      spending: 0,
      tracking: 0,
    };
    nonSuggestedEnvelopes.forEach(env => {
      const bucket = getStatusBucket({
        is_tracking_only: env.is_tracking_only,
        is_spending: env.subtype === 'spending',
        target_amount: env.targetAmount,
        current_amount: env.currentAmount,
      });
      counts[bucket] += 1;
    });
    return counts;
  }, [envelopes]);

  /**
   * Sort envelopes helper - uses the sortColumn and sortDirection state
   * This is a wrapper around the main sortEnvelopes function for convenience
   */
  const sortEnvelopesWithCurrentState = useCallback((envs: UnifiedEnvelopeData[]): UnifiedEnvelopeData[] => {
    return sortEnvelopes(envs, sortColumn, sortDirection);
  }, [sortEnvelopes, sortColumn, sortDirection]);

  /**
   * Filtered envelopes by priority for enhanced view
   *
   * For "tracking" and "spending" filters, we need to work with the full envelope list
   * since those are excluded from envelopesByPriority. For other filters, we filter
   * within each priority group.
   */
  const filteredEnvelopesByPriority = useMemo(() => {
    // For tracking/spending filters, we need to look at ALL envelopes (but filtered by search)
    if (activeFilter === "tracking") {
      const trackingEnvelopes = searchFilteredEnvelopes.filter(env => env.is_tracking_only && !env.is_suggested);
      return {
        essential: sortEnvelopes(trackingEnvelopes.filter(e => e.priority === 'essential'), sortColumn, sortDirection),
        important: sortEnvelopes(trackingEnvelopes.filter(e => e.priority === 'important'), sortColumn, sortDirection),
        discretionary: sortEnvelopes(trackingEnvelopes.filter(e => e.priority === 'discretionary' || !e.priority), sortColumn, sortDirection),
      };
    }

    if (activeFilter === "spending") {
      const spendingEnvelopes = searchFilteredEnvelopes.filter(env => env.subtype === 'spending' && !env.is_tracking_only && !env.is_suggested);
      return {
        essential: sortEnvelopes(spendingEnvelopes.filter(e => e.priority === 'essential'), sortColumn, sortDirection),
        important: sortEnvelopes(spendingEnvelopes.filter(e => e.priority === 'important'), sortColumn, sortDirection),
        discretionary: sortEnvelopes(spendingEnvelopes.filter(e => e.priority === 'discretionary' || !e.priority), sortColumn, sortDirection),
      };
    }

    // For other filters, filter within each priority group
    const filterEnvelopes = (envs: UnifiedEnvelopeData[]) => {
      let filtered = envs;

      // Apply status filter
      if (activeFilter !== "all") {
        filtered = envs.filter(env => {
          const bucket = getStatusBucket({
            is_tracking_only: env.is_tracking_only,
            is_spending: env.subtype === 'spending',
            target_amount: env.targetAmount,
            current_amount: env.currentAmount,
          });
          return bucket === activeFilter;
        });
      }

      // Apply sorting
      return sortEnvelopes(filtered, sortColumn, sortDirection);
    };

    return {
      essential: filterEnvelopes(envelopesByPriority.essential),
      important: filterEnvelopes(envelopesByPriority.important),
      discretionary: filterEnvelopes(envelopesByPriority.discretionary),
    };
  }, [searchFilteredEnvelopes, envelopesByPriority, activeFilter, sortEnvelopes, sortColumn, sortDirection]);

  /**
   * Filtered envelopes for category and snapshot views
   * Applies the same filter logic as priority view, plus sorting
   * Now also respects search query filter
   */
  const filteredEnvelopes = useMemo(() => {
    let result: UnifiedEnvelopeData[];

    if (activeFilter === "all") {
      result = searchFilteredEnvelopes.filter(e => !e.is_suggested);
    } else {
      result = searchFilteredEnvelopes.filter(env => {
        if (env.is_suggested) return false;

        const bucket = getStatusBucket({
          is_tracking_only: env.is_tracking_only,
          is_spending: env.subtype === 'spending',
          target_amount: env.targetAmount,
          current_amount: env.currentAmount,
        });
        return bucket === activeFilter;
      });
    }

    // Apply sorting
    return sortEnvelopes(result, sortColumn, sortDirection);
  }, [searchFilteredEnvelopes, activeFilter, sortEnvelopes, sortColumn, sortDirection]);

  /**
   * Check if any envelopes match the current filter (for empty state)
   */
  const hasFilteredEnvelopes = useMemo(() => {
    if (viewMode === 'priority') {
      return (
        filteredEnvelopesByPriority.essential.length > 0 ||
        filteredEnvelopesByPriority.important.length > 0 ||
        filteredEnvelopesByPriority.discretionary.length > 0
      );
    }
    return filteredEnvelopes.length > 0;
  }, [viewMode, filteredEnvelopesByPriority, filteredEnvelopes]);

  /**
   * Get "Funded By" value for an envelope
   */
  const getFundedBy = useCallback((envelope: UnifiedEnvelopeData): 'primary' | 'secondary' | 'split' | null => {
    const allocs = envelope.incomeAllocations || {};
    const allocatedSources = Object.entries(allocs).filter(([_, amt]) => amt > 0);

    if (allocatedSources.length === 0) return null;
    if (allocatedSources.length > 1) return 'split';

    const sourceId = allocatedSources[0][0];
    const sourceIndex = incomeSources.findIndex(s => s.id === sourceId);
    return sourceIndex === 0 ? 'primary' : 'secondary';
  }, [incomeSources]);

  /**
   * Validate allocations before saving
   */
  const validateBeforeSave = useCallback((): string[] => {
    const warnings: string[] = [];

    const unfundedEssentials = envelopes.filter(e => {
      if (e.is_tracking_only || e.priority !== 'essential') return false;
      const perPay = calculatePerPay(e);
      if (perPay === 0) return false;
      const total = Object.values(e.incomeAllocations || {}).reduce((sum, amt) => sum + amt, 0);
      return total < perPay - 0.01;
    });

    if (unfundedEssentials.length > 0) {
      warnings.push(`${unfundedEssentials.length} essential envelope(s) are not fully funded`);
    }

    incomeAllocations.forEach((income, index) => {
      if (income.allocated > income.amount) {
        const label = index === 0 ? 'Primary' : 'Secondary';
        warnings.push(`${label} income is over-allocated by $${(income.allocated - income.amount).toFixed(2)}`);
      }
    });

    return warnings;
  }, [envelopes, incomeAllocations, calculatePerPay]);

  /**
   * Save a single envelope's changes (auto-save)
   */
  const saveEnvelope = useCallback(async (envelope: UnifiedEnvelopeData) => {
    try {
      // Save envelope details
      await fetch(`/api/envelopes/${envelope.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: envelope.name,
          icon: envelope.icon,
          subtype: envelope.subtype,
          target_amount: envelope.targetAmount,
          frequency: envelope.frequency,
          custom_weeks: envelope.custom_weeks,
          due_date: envelope.dueDate,
          priority: envelope.priority,
          notes: envelope.notes,
        }),
      });

      // Save allocations
      const allocations = Object.entries(envelope.incomeAllocations || {}).map(([incomeId, amount]) => ({
        income_source_id: incomeId,
        allocation_amount: amount,
      }));

      await fetch(`/api/envelope-income-allocations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ envelope_id: envelope.id, allocations }),
      });

      return true;
    } catch (error) {
      console.error("Error saving envelope:", envelope.id, error);
      return false;
    }
  }, []);

  /**
   * Auto-save: Save all pending changes
   */
  const performAutoSave = useCallback(async () => {
    const pendingIds = Array.from(pendingChangesRef.current);
    if (pendingIds.length === 0) return;

    setSaveStatus('saving');
    setIsSaving(true);

    try {
      const envelopesToSave = envelopes.filter(e => pendingIds.includes(e.id));
      const results = await Promise.all(envelopesToSave.map(saveEnvelope));

      if (results.every(r => r)) {
        // All saves succeeded
        pendingChangesRef.current.clear();
        setSaveStatus('saved');
        setLastSavedAt(new Date());

        // Update original allocations
        const newOriginals: Record<string, Record<string, number>> = { ...originalAllocations };
        envelopesToSave.forEach(env => {
          newOriginals[env.id] = { ...(env.incomeAllocations || {}) };
        });
        setOriginalAllocations(newOriginals);

        // Reset to idle after 2 seconds
        setTimeout(() => {
          setSaveStatus(prev => prev === 'saved' ? 'idle' : prev);
        }, 2000);
      } else {
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    } catch (error) {
      console.error("Auto-save error:", error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  }, [envelopes, saveEnvelope, originalAllocations]);

  /**
   * Trigger auto-save with debounce
   */
  const triggerAutoSave = useCallback((envelopeId: string) => {
    pendingChangesRef.current.add(envelopeId);
    setSaveStatus('pending');

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set new timeout for 1.5 seconds
    autoSaveTimeoutRef.current = setTimeout(() => {
      performAutoSave();
    }, 1500);
  }, [performAutoSave]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Handle "Funded By" change
   */
  const handleFundedByChange = useCallback((envelopeId: string, value: string) => {
    const envelope = envelopes.find(e => e.id === envelopeId);
    if (!envelope) return;

    const perPay = calculatePerPay(envelope);
    const newAllocations: Record<string, number> = {};

    if (value === 'primary' && incomeSources[0]) {
      newAllocations[incomeSources[0].id] = perPay;
    } else if (value === 'secondary' && incomeSources[1]) {
      newAllocations[incomeSources[1].id] = perPay;
    } else if (value === 'split' && incomeSources.length >= 2) {
      // Split evenly
      const half = perPay / 2;
      newAllocations[incomeSources[0].id] = half;
      newAllocations[incomeSources[1].id] = half;
    }

    setEnvelopes(prev => prev.map(env => {
      if (env.id !== envelopeId) return env;
      return { ...env, incomeAllocations: newAllocations };
    }));
    triggerAutoSave(envelopeId);
  }, [envelopes, incomeSources, calculatePerPay, triggerAutoSave]);

  /**
   * Handle envelope field changes (inline editing)
   */
  const handleEnvelopeChange = useCallback((envelopeId: string, field: keyof UnifiedEnvelopeData, value: any) => {
    setEnvelopes(prev => prev.map(env => {
      if (env.id !== envelopeId) return env;
      return { ...env, [field]: value };
    }));
    triggerAutoSave(envelopeId);
  }, [triggerAutoSave]);

  /**
   * Auto-calculate waterfall allocations
   */
  const handleAutoCalculate = useCallback(() => {
    const priorityOrder = ['essential', 'important', 'discretionary'];
    const sortedEnvelopes = [...envelopes]
      .filter(e => !e.is_tracking_only)
      .sort((a, b) => {
        const aPriority = priorityOrder.indexOf(a.priority || 'discretionary');
        const bPriority = priorityOrder.indexOf(b.priority || 'discretionary');
        return aPriority - bPriority;
      });

    const remainingBudget = incomeSources.map(s => s.amount);
    const newAllocations: Record<string, Record<string, number>> = {};

    sortedEnvelopes.forEach(env => {
      const perPay = calculatePerPay(env);
      if (perPay <= 0) {
        newAllocations[env.id] = {};
        return;
      }

      let remaining = perPay;
      const envAllocations: Record<string, number> = {};

      for (let i = 0; i < incomeSources.length && remaining > 0.01; i++) {
        const canAllocate = Math.min(remaining, remainingBudget[i]);
        if (canAllocate > 0.01) {
          envAllocations[incomeSources[i].id] = canAllocate;
          remainingBudget[i] -= canAllocate;
          remaining -= canAllocate;
        }
      }

      newAllocations[env.id] = envAllocations;
    });

    setEnvelopes(prev => prev.map(env => ({
      ...env,
      incomeAllocations: newAllocations[env.id] || env.incomeAllocations || {},
    })));
    // Trigger auto-save for all affected envelopes
    Object.keys(newAllocations).forEach(id => triggerAutoSave(id));
  }, [envelopes, incomeSources, calculatePerPay, triggerAutoSave]);

  /**
   * Open print preview for PDF/print - uses browser's native print dialog
   * which allows preview, landscape orientation, and save as PDF
   */
  const handleExportPDF = useCallback(() => {
    // Open browser print dialog which shows preview and allows save as PDF
    window.print();
  }, []);

  /**
   * Reset allocations to original values
   */
  const handleReset = useCallback(() => {
    setEnvelopes(prev => prev.map(env => ({
      ...env,
      incomeAllocations: { ...(originalAllocations[env.id] || {}) },
    })));
    // Clear pending changes since we're resetting
    pendingChangesRef.current.clear();
    setSaveStatus('idle');
  }, [originalAllocations]);

  const toggleGroup = (priority: PriorityLevel) => {
    setExpandedGroups(prev => ({ ...prev, [priority]: !prev[priority] }));
  };

  /**
   * Render priority group with table
   */
  const renderPriorityGroup = (priority: PriorityLevel) => {
    // Always use filteredEnvelopesByPriority since it includes both filtering and sorting
    const group = filteredEnvelopesByPriority[priority];
    if (group.length === 0) return null;

    const config = PRIORITY_CONFIG[priority];
    const isExpanded = expandedGroups[priority];

    return (
      <div key={priority} className="mb-5">
        {/* Group Header */}
        <div
          onClick={() => toggleGroup(priority)}
          className={cn(
            "w-full flex items-center justify-between px-4 py-2.5 rounded-t-md cursor-pointer",
            config.bgColor,
            "border border-b-0",
            config.borderColor
          )}
        >
          <div className="flex items-center gap-2">
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <span className={cn("w-2 h-2 rounded-full", config.dotColor)} />
            <span className="font-semibold text-xs uppercase tracking-wide text-text-dark">
              {config.label}
            </span>
            <span className="text-xs text-text-medium font-normal">
              ({group.length} {group.length === 1 ? 'envelope' : 'envelopes'})
            </span>
            {/* Add Envelope Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCreateDefaultPriority(priority);
                setCreateOpen(true);
              }}
              className="flex items-center gap-1 text-xs text-sage hover:text-sage-dark hover:bg-white/50 px-2 py-1 rounded transition-colors"
            >
              <Plus className="h-3 w-3" />
              <span>Add</span>
            </button>
          </div>
        </div>

        {/* Table */}
        {isExpanded && (
          <div className={cn("border rounded-b-md overflow-x-auto", config.borderColor)}>
            <table className="w-full table-fixed min-w-[900px]">
              <thead className="bg-silver-very-light border-b border-silver-light">
                <tr>
                  {/* 1. Drag Handle */}
                  <th className="px-1 py-2 w-[24px]"></th>
                  {/* 2. Quick Glance (Dashboard Monitor) */}
                  <th className="px-1 py-2 text-center w-[24px]" title="Quick Glance - Show on Dashboard">
                    <Eye className="h-3 w-3 text-text-light mx-auto" />
                  </th>
                  {/* 3. Priority */}
                  <th className="px-1 py-2 text-center text-[10px] font-semibold text-text-medium uppercase tracking-wide w-[50px]">Priority</th>
                  {/* 4. Envelope Name - Sortable */}
                  <th
                    className="px-2 py-2 text-left text-[10px] font-semibold text-text-medium uppercase tracking-wide cursor-pointer hover:text-text-dark w-[160px]"
                    onClick={() => handleSort('name')}
                  >
                    <span className="flex items-center">Envelope{getSortIcon('name')}</span>
                  </th>
                  {/* 5. Category */}
                  <th className="px-2 py-2 text-left text-[10px] font-semibold text-text-medium uppercase tracking-wide w-[100px]">Category</th>
                  {/* 6. Type */}
                  <th className="px-2 py-2 text-left text-[10px] font-semibold text-text-medium uppercase tracking-wide w-[75px]">Type</th>
                  {/* 6. Target - Sortable */}
                  <th
                    className="px-2 py-2 text-right text-[10px] font-semibold text-text-medium uppercase tracking-wide cursor-pointer hover:text-text-dark w-[80px]"
                    onClick={() => handleSort('targetAmount')}
                  >
                    <span className="flex items-center justify-end">Target{getSortIcon('targetAmount')}</span>
                  </th>
                  {/* 7. Frequency */}
                  <th className="px-2 py-2 text-center text-[10px] font-semibold text-text-medium uppercase tracking-wide w-[50px]">Freq</th>
                  {/* 8. Due Date */}
                  <th className="px-2 py-2 text-left text-[10px] font-semibold text-text-medium uppercase tracking-wide w-[75px]">Due</th>
                  {/* 9. Funded By */}
                  <th className="px-2 py-2 text-left text-[10px] font-semibold text-text-medium uppercase tracking-wide w-[70px]">Funded</th>
                  {/* 10. Per Pay (calculated, no sorting) */}
                  <th className="px-2 py-2 text-right text-[10px] font-semibold text-text-medium uppercase tracking-wide w-[70px]">
                    Per Pay
                  </th>
                  {/* 11. Annual */}
                  <th className="px-2 py-2 text-right text-[10px] font-semibold text-text-medium uppercase tracking-wide w-[65px]">Annual</th>
                  {/* Enhanced View Columns */}
                  {enhancedView && (
                    <>
                      {/* 12. Progress Bar */}
                      <th className="px-2 py-2 text-center text-[10px] font-semibold text-text-medium uppercase tracking-wide w-[90px]">Progress</th>
                      {/* 13. Current Balance - Sortable */}
                      <th
                        className="px-2 py-2 text-right text-[10px] font-semibold text-text-medium uppercase tracking-wide cursor-pointer hover:text-text-dark w-[70px]"
                        onClick={() => handleSort('currentAmount')}
                      >
                        <span className="flex items-center justify-end">Current{getSortIcon('currentAmount')}</span>
                      </th>
                      {/* 14. Due In */}
                      <th className="px-2 py-2 text-center text-[10px] font-semibold text-text-medium uppercase tracking-wide w-[60px]">Due In</th>
                    </>
                  )}
                  {/* 15. Notes */}
                  <th className="px-1 py-2 text-center text-[10px] font-semibold text-text-medium uppercase tracking-wide w-[28px]">Notes</th>
                  {/* 16. Status */}
                  <th className="px-1 py-2 text-center text-[10px] font-semibold text-text-medium uppercase tracking-wide w-[45px]">Status</th>
                  {/* 17. Actions - last column, always visible */}
                  <th className="px-1 py-2 text-[10px] font-semibold text-text-medium uppercase tracking-wide w-[32px]"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-silver-very-light">
                {group.map((envelope) => (
                  <EnvelopeRow
                    key={envelope.id}
                    envelope={envelope}
                    incomeSources={incomeSources}
                    priority={priority}
                    paySchedule={paySchedule}
                    calculatePerPay={calculatePerPay}
                    calculateAnnual={calculateAnnual}
                    getFundedBy={getFundedBy}
                    onFundedByChange={handleFundedByChange}
                    onEnvelopeChange={handleEnvelopeChange}
                    isHighlighted={highlightedEnvelopeId === envelope.id}
                    enhancedView={enhancedView}
                    onChangeCategoryClick={handleChangeCategoryClick}
                    onArchiveClick={handleArchiveClick}
                    onLevelBillClick={handleLevelBillClick}
                    onGiftAllocationClick={handleGiftAllocationClick}
                    onDebtAllocationClick={handleDebtAllocationClick}
                    celebrationReadiness={getEnvelopeReadiness(celebrationReadinessMap, envelope.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  // Calculate summary stats
  const totalIncome = incomeSources.reduce((sum, s) => sum + s.amount, 0);
  const totalAllocated = incomeAllocations.reduce((sum, s) => sum + s.allocated, 0);
  const totalSurplus = totalIncome - totalAllocated;

  // Generate smart suggestions for the banner
  const bannerSuggestions = useMemo(() => {
    if (totalSurplus <= 0 || envelopes.length === 0) {
      return [];
    }

    // Convert envelopes to the format expected by suggestion generator
    const dbEnvelopes = envelopes.map(env => ({
      id: env.id,
      name: env.name,
      subtype: env.subtype,
      priority: env.priority,
      target_amount: env.targetAmount,
      current_amount: env.currentAmount,
      monthly_amount: env.payCycleAmount,
    }));

    const context = {
      envelopes: dbEnvelopes,
      surplusAmount: totalSurplus,
      monthlyIncome: totalIncome,
      unallocatedIncome: totalSurplus,
    };

    // Get top 3 suggestions and transform to banner format
    const suggestions = getTopSuggestions(context, 3);

    return suggestions.map(s => ({
      envelopeId: s.targetEnvelopeId || s.id,
      envelopeIcon: s.icon,
      title: s.title,
      description: s.description,
      suggestedAmount: s.amount || 0,
      currentAmount: 0, // Would need envelope lookup
      targetAmount: 0, // Would need envelope lookup
      percentComplete: 0,
      priority: s.priority === 'high' ? 1 : s.priority === 'medium' ? 2 : 3,
      type: s.type === 'starter_stash' ? 'starter_stash' as const :
            s.type === 'debt_payoff' ? 'debt' as const :
            s.type === 'emergency_fund' ? 'safety_net' as const :
            'general' as const,
      reasoning: s.remyTip,
      iconName: s.type === 'starter_stash' ? 'Shield' as const :
                s.type === 'debt_payoff' ? 'CreditCard' as const :
                s.type === 'emergency_fund' ? 'Target' as const :
                'TrendingUp' as const,
      color: s.priority === 'high' ? 'sage' as const :
             s.priority === 'medium' ? 'blue' as const :
             'gold' as const,
    }));
  }, [envelopes, totalSurplus, totalIncome]);

  // Determine banner mode based on allocation state
  const bannerMode = useMemo(() => {
    if (totalAllocated > totalIncome) return 'over_allocated' as const;
    if (totalSurplus > 0.01) return 'unallocated' as const;
    return 'balanced' as const;
  }, [totalAllocated, totalIncome, totalSurplus]);

  // Calculate amounts for banner
  const bannerAmount = useMemo(() => {
    if (bannerMode === 'over_allocated') return totalAllocated - totalIncome;
    if (bannerMode === 'unallocated') return totalSurplus;
    return 0;
  }, [bannerMode, totalAllocated, totalIncome, totalSurplus]);

  // Handler for allocate button in suggestions
  const handleSuggestionAllocate = useCallback((envelopeId: string, amount: number) => {
    setHighlightedEnvelopeId(envelopeId);

    // Scroll to the envelope
    setTimeout(() => {
      const envelopeRow = document.querySelector(`[data-envelope-id="${envelopeId}"]`);
      if (envelopeRow) {
        envelopeRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);

    // Remove highlight after 3 seconds
    setTimeout(() => {
      setHighlightedEnvelopeId(null);
    }, 3000);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-6 w-6 animate-spin text-text-medium" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto px-3 py-4">
      {/* Header actions - at the top of the page */}
      <div className="relative flex items-start justify-between gap-4 mb-4">
        {/* Coaching Widget - fills available space */}
        <div className="flex-1 min-w-0">
          <CoachingWidget
            envelopes={envelopes}
            incomeSources={incomeSources}
            currentPage="allocation"
            onOpenTransferDialog={() => setTransferOpen(true)}
            totalAllocated={totalAllocated}
            totalIncome={totalIncome}
          />
        </div>
        {/* Right side actions */}
        <div className="flex items-start gap-2 flex-shrink-0">
          <RemyHelpPanel pageId="allocation" />
          <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={isLoading}>
            <Printer className="h-4 w-4 mr-1" />
            Print
          </Button>
          {/* Auto-save status indicator */}
          <div className="flex items-center gap-1.5 text-xs text-text-medium px-2">
            {saveStatus === 'pending' && (
              <span className="flex items-center gap-1 text-gold">
                <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
                Unsaved
              </span>
            )}
            {saveStatus === 'saving' && (
              <span className="flex items-center gap-1 text-blue">
                <RefreshCw className="h-3 w-3 animate-spin" />
                Saving...
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="flex items-center gap-1 text-sage">
                <CheckCircle2 className="h-3 w-3" />
                Saved
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="flex items-center gap-1 text-red-500">
                <AlertCircle className="h-3 w-3" />
                Error
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Guidance Banner */}
      <MobileGuidanceBanner />

      {/* The My Budget Way Widget (Enhanced View) - Uses status mode to match envelope-summary */}
      {enhancedView && (
        <MyBudgetWayWidget
          mode="status"
          suggestedEnvelopes={suggestedEnvelopes}
          creditCardDebt={creditCardDebt}
          milestoneProgress={milestoneProgress}
          defaultExpanded={myBudgetWayExpanded}
          onEnvelopeClick={(envelope) => router.push(`/envelopes/${envelope.id}`)}
          className="mb-3"
        />
      )}

      {/* Income Coaching Banner (controlled) */}
      <IncomeCoachingBanner isOpen={showIncomeCoaching} onClose={() => setShowIncomeCoaching(false)} />

      {/* Income Buckets with info button on right */}
      <div className="flex items-start gap-2 mb-4">
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-3">
          {incomeAllocations.map((income, index) => (
            <IncomeProgressCard
              key={income.id}
              name={income.name}
              amount={income.amount}
              allocated={income.allocated}
              frequency={income.frequency}
              isPrimary={index === 0}
              nextPayDate={income.nextPayDate}
            />
          ))}
        </div>
        <IncomeInfoButton onClick={() => setShowIncomeCoaching(true)} />
      </div>


      {/* Filter Tabs and View Toggle (Enhanced View) */}
      {enhancedView && (
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-4">
            <EnvelopeFilterTabs
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
              envelopeCounts={statusCounts}
            />

            {/* Search Box */}
            <div className="relative w-56">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search envelopes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-8 h-8 text-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-0.5 rounded hover:bg-gray-100"
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}
            </div>
            {searchQuery && (
              <span className="text-xs text-muted-foreground">
                {searchFilteredEnvelopes.length} of {envelopes.length} envelopes
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Add Envelope Button */}
            <Button
              size="sm"
              onClick={() => setCreateOpen(true)}
              className="bg-sage hover:bg-sage-dark text-white h-7 text-xs px-3 gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Envelope
            </Button>
            {/* Transfer Funds Button - Same sage styling */}
            <Button
              size="sm"
              onClick={() => setTransferOpen(true)}
              className="bg-sage hover:bg-sage-dark text-white h-7 text-xs px-3 gap-1"
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
              Transfer
            </Button>

            {/* View Toggle: Priority / Category / Snapshot */}
            <div className="flex items-center bg-white rounded-md border border-sage-dark overflow-hidden">
              <span className="bg-sage text-white text-[11px] font-medium px-2 py-1.5">Page view</span>
              <button
                type="button"
                onClick={() => toggleViewMode('priority')}
                className={cn(
                  "px-2 py-1.5 text-[11px] font-medium transition-colors",
                  viewMode === 'priority'
                    ? "bg-silver-very-light text-sage-dark"
                    : "bg-white text-text-medium hover:text-text-dark hover:bg-silver-very-light/50"
                )}
              >
                Priority
              </button>
              <button
                type="button"
                onClick={() => toggleViewMode('category')}
                className={cn(
                  "px-2 py-1.5 text-[11px] font-medium transition-colors",
                  viewMode === 'category'
                    ? "bg-silver-very-light text-sage-dark"
                    : "bg-white text-text-medium hover:text-text-dark hover:bg-silver-very-light/50"
                )}
              >
                Category
              </button>
              <button
                type="button"
                onClick={() => toggleViewMode('snapshot')}
                className={cn(
                  "px-2 py-1.5 text-[11px] font-medium transition-colors",
                  viewMode === 'snapshot'
                    ? "bg-silver-very-light text-sage-dark"
                    : "bg-white text-text-medium hover:text-text-dark hover:bg-silver-very-light/50"
                )}
              >
                Snapshot
              </button>
            </div>

            {/* Sort Button - Standalone */}
            <SortButton
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSortChange={handleSortChange}
              viewMode={viewMode}
            />
          </div>
        </div>
      )}

      {/* No income sources warning - only show after loading completes */}
      {!isLoading && incomeSources.length === 0 && (
        <div className="rounded-lg border border-gold bg-gold-light p-4 text-center mb-6">
          <p className="text-sm text-[#8B7035]">
            No income sources configured.{" "}
            <Link href="/recurring-income" className="underline font-medium">
              Add income sources
            </Link>{" "}
            to start allocating your budget.
          </p>
        </div>
      )}

      {/* Envelope Groups - Horizontal scroll on mobile */}
      <div ref={printableAreaRef} className="overflow-x-auto -mx-6 px-6 lg:mx-0 lg:px-0 bg-white min-h-[300px]">
        <div className="min-w-[900px] lg:min-w-0">
          {/* Empty state when search returns no results */}
          {searchQuery && searchFilteredEnvelopes.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-silver-very-light flex items-center justify-center mb-4">
                <Search className="h-8 w-8 text-silver" />
              </div>
              <h3 className="text-lg font-semibold text-text-dark mb-2">
                No envelopes found
              </h3>
              <p className="text-sm text-text-medium max-w-md">
                No envelopes match &ldquo;{searchQuery}&rdquo;.
                Try a different search term.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchQuery('')}
                className="mt-4"
              >
                Clear Search
              </Button>
            </div>
          )}

          {/* Empty state when no envelopes match the current filter */}
          {!hasFilteredEnvelopes && activeFilter !== "all" && !searchQuery && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-silver-very-light flex items-center justify-center mb-4">
                <Target className="h-8 w-8 text-silver" />
              </div>
              <h3 className="text-lg font-semibold text-text-dark mb-2">
                No envelopes match this filter
              </h3>
              <p className="text-sm text-text-medium max-w-md">
                No envelopes are currently in the &ldquo;{FILTER_OPTIONS.find(f => f.key === activeFilter)?.label || activeFilter}&rdquo; category.
                Try selecting a different filter or &ldquo;All&rdquo; to see all your envelopes.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveFilter("all")}
                className="mt-4"
              >
                Show All Envelopes
              </Button>
            </div>
          )}

          {viewMode === 'priority' && hasFilteredEnvelopes && (
            <>
              {renderPriorityGroup('essential')}
              {renderPriorityGroup('important')}
              {renderPriorityGroup('discretionary')}
            </>
          )}
          {viewMode === 'category' && hasFilteredEnvelopes && (
            <CategoryGroups
              envelopes={activeFilter === 'tracking' ? filteredEnvelopes : filteredEnvelopes.filter(e => !e.is_tracking_only)}
              categories={categories}
              incomeSources={incomeSources}
              paySchedule={paySchedule}
              enhancedView={enhancedView}
              onEnvelopeChange={handleEnvelopeChange}
              onFundedByChange={handleFundedByChange}
              calculatePerPay={calculatePerPay}
              onChangeCategoryClick={handleChangeCategoryClick}
              onArchiveClick={handleArchiveClick}
              onEditCategory={handleEditCategory}
              preserveOrder={!!sortColumn}
              renderEnvelopeRow={(envelope, options) => (
                <EnvelopeRow
                  key={envelope.id}
                  envelope={envelope}
                  incomeSources={incomeSources}
                  priority={(envelope.priority || 'discretionary') as PriorityLevel}
                  paySchedule={paySchedule}
                  calculatePerPay={calculatePerPay}
                  calculateAnnual={calculateAnnual}
                  getFundedBy={getFundedBy}
                  onFundedByChange={handleFundedByChange}
                  onEnvelopeChange={handleEnvelopeChange}
                  isHighlighted={highlightedEnvelopeId === envelope.id}
                  enhancedView={enhancedView}
                  showCategoryColumn={options.showCategoryColumn}
                  onChangeCategoryClick={options.onChangeCategoryClick}
                  onArchiveClick={options.onArchiveClick}
                  onLevelBillClick={handleLevelBillClick}
                  onGiftAllocationClick={handleGiftAllocationClick}
                  onDebtAllocationClick={handleDebtAllocationClick}
                  celebrationReadiness={getEnvelopeReadiness(celebrationReadinessMap, envelope.id)}
                />
              )}
            />
          )}
          {viewMode === 'snapshot' && hasFilteredEnvelopes && (
            <SnapshotView
              envelopes={filteredEnvelopes}
              incomeSources={incomeSources}
              onEnvelopeChange={handleEnvelopeChange}
              onChangeCategoryClick={handleChangeCategoryClick}
              onArchiveClick={handleArchiveClick}
              onLevelBillClick={handleLevelBillClick}
            />
          )}
        </div>
      </div>

      {/* Summary Footer */}
      <div className="flex items-center justify-between mt-6 pt-5 border-t border-silver-light">
        <div className="flex items-center gap-3 text-sm text-text-medium">
          {saveStatus === 'pending' && (
            <>
              <span className="flex items-center gap-1 text-gold">
                <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
                Pending changes...
              </span>
            </>
          )}
          {saveStatus === 'saving' && (
            <>
              <span className="flex items-center gap-1 text-blue">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                Auto-saving...
              </span>
            </>
          )}
          {(saveStatus === 'saved' || saveStatus === 'idle') && (
            <>
              <span className="flex items-center gap-1 text-sage">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Auto-saved
              </span>
              {lastSavedAt && (
                <span>
                  Last saved: {lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </>
          )}
          {saveStatus === 'error' && (
            <>
              <span className="flex items-center gap-1 text-red-500">
                <AlertCircle className="h-3.5 w-3.5" />
                Save failed
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div>
            <span className="text-text-medium">Total Income:</span>{" "}
            <span className="font-semibold text-text-dark">${totalIncome.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-text-medium">Allocated:</span>{" "}
            <span className="font-semibold text-sage">${totalAllocated.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-text-medium">Remaining:</span>{" "}
            <span className={cn("font-semibold", totalSurplus < 0 ? "text-blue" : "text-text-dark")}>
              ${totalSurplus.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Validation Warning Dialog - shown for allocation issues */}
      <AlertDialog open={showValidationDialog} onOpenChange={setShowValidationDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-gold">
              Budget Allocation Issues
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>The following issues were found in your budget:</p>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  {validationWarnings.map((warning, i) => (
                    <li key={i} className="text-[#8B7035]">{warning}</li>
                  ))}
                </ul>
                <p className="text-sm text-text-medium">
                  Changes are auto-saved. Review and adjust your allocations to fix these issues.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => setShowValidationDialog(false)}
              className="bg-sage hover:bg-sage-dark text-white"
            >
              Got it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Envelope Dialog */}
      <EnvelopeCreateDialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) {
            setCreateDefaultPriority(undefined);
          }
        }}
        categories={categories}
        onCreated={fetchData}
        defaultPriority={createDefaultPriority}
      />

      {/* Change Category Dialog */}
      <ChangeCategoryDialog
        open={changeCategoryDialogOpen}
        onOpenChange={setChangeCategoryDialogOpen}
        envelope={selectedEnvelopeForCategory}
        categories={categories}
        onCategoryChange={handleCategoryChange}
        onCreateCategory={handleCreateCategory}
      />

      {/* Transfer Funds Dialog */}
      <EnvelopeTransferDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
        envelopes={envelopes.map(e => ({
          id: e.id,
          name: e.name,
          icon: e.icon,
          current_amount: e.currentAmount ?? 0,
          target_amount: e.targetAmount ?? 0,
          due_date: e.dueDate instanceof Date
            ? e.dueDate.toISOString()
            : typeof e.dueDate === 'string'
              ? e.dueDate
              : null,
          frequency: e.frequency ?? null,
        }))}
        history={[]}
        onTransferComplete={fetchData}
      />

      {/* Archive Envelope Dialog */}
      <ArchiveEnvelopeDialog
        open={archiveDialogOpen}
        onOpenChange={setArchiveDialogOpen}
        envelope={envelopeToArchive ? {
          id: envelopeToArchive.id,
          name: envelopeToArchive.name,
          icon: envelopeToArchive.icon,
        } : null}
        onArchive={handleArchive}
      />

      {/* Leveling Dialogs - Step 1: Detection */}
      {envelopeToLevel && detectedSeasonalInfo && levelingStep === 'detection' && (
        <SeasonalBillDetectionDialog
          open={levelingDialogOpen}
          onOpenChange={(open) => {
            setLevelingDialogOpen(open);
            if (!open) {
              setEnvelopeToLevel(null);
              setDetectedSeasonalInfo(null);
            }
          }}
          envelopeName={envelopeToLevel.name}
          matchedKeyword={detectedSeasonalInfo.matchedKeyword}
          suggestedPattern={detectedSeasonalInfo.suggestedPattern}
          confidence={detectedSeasonalInfo.confidence}
          onSetupLeveling={(method) => {
            setLevelingStep(method);
          }}
          onSkip={() => {
            setLevelingDialogOpen(false);
            setEnvelopeToLevel(null);
            setDetectedSeasonalInfo(null);
          }}
        />
      )}

      {/* Leveling Dialogs - Step 2a: 12-Month Entry */}
      {envelopeToLevel && detectedSeasonalInfo && levelingStep === '12-month' && (
        <TwelveMonthEntryDialog
          open={levelingDialogOpen}
          onOpenChange={(open) => {
            setLevelingDialogOpen(open);
            if (!open) {
              setEnvelopeToLevel(null);
              setDetectedSeasonalInfo(null);
            }
          }}
          envelopeName={envelopeToLevel.name}
          onBack={() => setLevelingStep('detection')}
          onSave={handleSaveLevelingData}
          existingLevelingData={envelopeToLevel.leveling_data}
        />
      )}

      {/* Leveling Dialogs - Step 2b: Quick Estimate */}
      {envelopeToLevel && detectedSeasonalInfo && levelingStep === 'quick-estimate' && (
        <QuickEstimateDialog
          open={levelingDialogOpen}
          onOpenChange={(open) => {
            setLevelingDialogOpen(open);
            if (!open) {
              setEnvelopeToLevel(null);
              setDetectedSeasonalInfo(null);
            }
          }}
          envelopeName={envelopeToLevel.name}
          suggestedPattern={detectedSeasonalInfo.suggestedPattern === 'custom' ? 'winter-peak' : detectedSeasonalInfo.suggestedPattern}
          onBack={() => setLevelingStep('detection')}
          onSave={handleSaveLevelingData}
          existingLevelingData={envelopeToLevel.leveling_data}
        />
      )}

      {/* Milestone Completion Dialog */}
      <MilestoneCompletionDialog
        milestone={currentMilestone}
        open={milestoneDialogOpen}
        onOpenChange={setMilestoneDialogOpen}
        onDismiss={handleDismissMilestone}
      />

      {/* Gift Allocation Dialog for Celebration Envelopes */}
      {giftEnvelope && (
        <GiftAllocationDialog
          open={giftDialogOpen}
          onOpenChange={(open) => {
            setGiftDialogOpen(open);
            if (!open) {
              setGiftEnvelope(null);
              setGiftRecipients([]);
            }
          }}
          envelope={{
            id: giftEnvelope.id,
            name: giftEnvelope.name,
            icon: giftEnvelope.icon,
            is_celebration: true,
            target_amount: giftEnvelope.targetAmount || 0,
            current_amount: giftEnvelope.currentAmount || 0,
            category_id: giftEnvelope.category_id ?? undefined,
            category_name: giftEnvelope.category_name ?? undefined,
            priority: giftEnvelope.priority,
            notes: giftEnvelope.notes,
          }}
          existingRecipients={giftRecipients}
          onSave={handleSaveGiftRecipients}
          categories={categories}
        />
      )}

      {/* Debt Allocation Dialog for Debt Envelopes */}
      {debtEnvelope && (
        <DebtAllocationDialog
          open={debtDialogOpen}
          onOpenChange={(open) => {
            setDebtDialogOpen(open);
            if (!open) {
              setDebtEnvelope(null);
              setDebtItems([]);
              setAvailableCreditCards([]);
            }
          }}
          envelope={{
            id: debtEnvelope.id,
            name: debtEnvelope.name,
            icon: debtEnvelope.icon,
            is_debt: true,
            target_amount: debtEnvelope.targetAmount || 0,
            current_amount: debtEnvelope.currentAmount || 0,
          }}
          existingDebtItems={debtItems}
          availableCreditCards={availableCreditCards}
          onSave={handleSaveDebtItems}
        />
      )}
    </div>
  );
}

/**
 * NotesPopover - Editable notes popover for envelope notes
 */
function NotesPopover({
  notes,
  onSave,
}: {
  notes: string;
  onSave: (notes: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [editValue, setEditValue] = useState(notes);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reset edit value when popover opens
  useEffect(() => {
    if (isOpen) {
      setEditValue(notes);
      // Focus textarea after a small delay
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [isOpen, notes]);

  const handleSave = () => {
    onSave(editValue.trim());
    setIsOpen(false);
  };

  const handleClear = () => {
    setEditValue('');
    onSave('');
    setIsOpen(false);
  };

  const hasNotes = notes && notes.trim().length > 0;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "p-0.5 rounded transition-colors",
            hasNotes
              ? "text-sage hover:text-sage-dark hover:bg-sage-very-light"
              : "text-silver-light hover:text-text-medium hover:bg-silver-very-light"
          )}
          title={hasNotes ? notes : "Add note"}
        >
          <StickyNote className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="end">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-dark">Notes</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-0.5 rounded hover:bg-silver-very-light text-text-light"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          <textarea
            ref={textareaRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            placeholder="Add a note..."
            className="w-full h-20 px-2 py-1.5 text-[12px] text-text-dark bg-silver-very-light border border-silver-light rounded resize-none focus:outline-none focus:border-sage"
          />
          <div className="flex items-center justify-between gap-2">
            {hasNotes && (
              <button
                type="button"
                onClick={handleClear}
                className="text-[10px] text-text-light hover:text-blue"
              >
                Clear
              </button>
            )}
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-2 py-1 text-[10px] text-text-medium hover:bg-silver-very-light rounded"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-2 py-1 text-[10px] bg-sage hover:bg-sage-dark text-white rounded"
            >
              Save
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * EnvelopeRow - Single row in the allocation table with inline editing
 */
function EnvelopeRow({
  envelope,
  incomeSources,
  priority,
  paySchedule,
  calculatePerPay,
  calculateAnnual,
  getFundedBy,
  onFundedByChange,
  onEnvelopeChange,
  isHighlighted,
  enhancedView = false,
  showCategoryColumn = true,
  onChangeCategoryClick,
  onArchiveClick,
  onLevelBillClick,
  onGiftAllocationClick,
  onDebtAllocationClick,
  celebrationReadiness,
}: {
  envelope: UnifiedEnvelopeData;
  incomeSources: IncomeSource[];
  priority: PriorityLevel;
  paySchedule: PaySchedule | null;
  calculatePerPay: (e: UnifiedEnvelopeData) => number;
  calculateAnnual: (e: UnifiedEnvelopeData) => number;
  getFundedBy: (e: UnifiedEnvelopeData) => 'primary' | 'secondary' | 'split' | null;
  onFundedByChange: (envelopeId: string, value: string) => void;
  onEnvelopeChange: (envelopeId: string, field: keyof UnifiedEnvelopeData, value: any) => void;
  isHighlighted?: boolean;
  enhancedView?: boolean;
  showCategoryColumn?: boolean;
  onChangeCategoryClick?: (envelope: UnifiedEnvelopeData) => void;
  onArchiveClick?: (envelope: UnifiedEnvelopeData) => void;
  onLevelBillClick?: (envelope: UnifiedEnvelopeData) => void;
  onGiftAllocationClick?: (envelope: UnifiedEnvelopeData) => void;
  onDebtAllocationClick?: (envelope: UnifiedEnvelopeData) => void;
  celebrationReadiness?: CelebrationReadinessData | null;
}) {
  const perPay = calculatePerPay(envelope);
  const annual = calculateAnnual(envelope);
  const fundedBy = getFundedBy(envelope);
  const totalAllocated = Object.values(envelope.incomeAllocations || {}).reduce((sum, amt) => sum + amt, 0);
  const isFullyFunded = perPay > 0 && totalAllocated >= perPay - 0.01;

  // No background color for icons - keep transparent to match page
  const iconBg = '';

  const fundedByClass = fundedBy === 'primary' ? 'bg-sage-very-light text-sage-dark' :
                        fundedBy === 'secondary' ? 'bg-sage-light text-sage-dark' :
                        fundedBy === 'split' ? 'bg-blue-light text-[#4A7BA8]' : '';

  // Format due date for input
  const formatDueDateForInput = () => {
    if (!envelope.dueDate) return '';
    // Handle Date object
    if (envelope.dueDate instanceof Date) {
      return envelope.dueDate.toISOString().split('T')[0];
    }
    // Handle number (day of month) - can't convert to full date without month/year
    if (typeof envelope.dueDate === 'number') {
      return '';
    }
    // Handle string (from API response)
    if (typeof envelope.dueDate === 'string') {
      return (envelope.dueDate as string).split('T')[0];
    }
    return '';
  };

  // Get per pay frequency label based on funded source
  const getPerPayFreq = () => {
    if (fundedBy === 'secondary' && incomeSources[1]) {
      return `/${incomeSources[1].frequency === 'weekly' ? 'week' : incomeSources[1].frequency === 'fortnightly' ? 'fortnight' : 'month'}`;
    }
    if (incomeSources[0]) {
      return `/${incomeSources[0].frequency === 'weekly' ? 'week' : incomeSources[0].frequency === 'fortnightly' ? 'fortnight' : 'month'}`;
    }
    return '/pay';
  };

  // Common input styles
  const inputClass = "w-full px-2 py-1 text-[13px] bg-transparent border border-transparent hover:border-silver-light focus:border-sage focus:outline-none rounded transition-colors";
  const selectClass = "px-2 py-1 text-[13px] bg-transparent border border-transparent hover:border-silver-light focus:border-sage focus:outline-none rounded cursor-pointer transition-colors";

  // Special styling for suggested envelopes with $0 balance
  const isSuggestedUnfunded = envelope.is_suggested && (envelope.currentAmount || 0) === 0;

  // Highlight animation for newly created envelopes
  const highlightClass = isHighlighted
    ? "ring-2 ring-sage ring-offset-1 bg-sage-very-light animate-pulse"
    : "";

  const rowClass = cn(
    isSuggestedUnfunded
      ? "bg-sage-very-light transition-colors group"
      : "transition-colors group h-[44px]",
    highlightClass
  );

  // Scroll into view when highlighted
  const rowRef = useRef<HTMLTableRowElement>(null);
  useEffect(() => {
    if (isHighlighted && rowRef.current) {
      rowRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [isHighlighted]);

  // Format due date as DD/MM/YY
  const formatDueDateDisplay = (): string => {
    if (!envelope.dueDate) return '';
    let date: Date | null = null;
    if (envelope.dueDate instanceof Date) {
      date = envelope.dueDate;
    } else if (typeof envelope.dueDate === 'string') {
      date = new Date(envelope.dueDate);
    }
    if (!date || isNaN(date.getTime())) return '';
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    return `${day}/${month}/${year}`;
  };

  // Priority dot color mapping
  const priorityDotColors: Record<string, string> = {
    essential: 'bg-[#5A7E7A]',    // sage-dark (dark green)
    important: 'bg-[#6B9ECE]',    // blue
    discretionary: 'bg-[#9CA3AF]' // silver/gray
  };

  // Get status icon info
  const statusInfo = getEnvelopeStatusIcon(envelope);

  // Editable cell background
  const editableCellBg = "bg-sage-very-light/50 hover:bg-sage-light/30";

  return (
    <tr ref={rowRef} data-envelope-id={envelope.id} className={rowClass}>
      {/* 1. Drag Handle */}
      <td className="px-1 py-1.5 text-center">
        <GripVertical className="h-3.5 w-3.5 text-text-light cursor-grab" />
      </td>

      {/* 2. Quick Glance (Dashboard Monitor) */}
      <td className="px-1 py-1.5 text-center">
        <button
          type="button"
          onClick={() => onEnvelopeChange(envelope.id, 'is_monitored', !envelope.is_monitored)}
          className={cn(
            "p-0.5 rounded transition-colors",
            envelope.is_monitored
              ? "text-sage hover:text-sage-dark"
              : "text-silver-light hover:text-text-light opacity-0 group-hover:opacity-100"
          )}
          title={envelope.is_monitored ? "Remove from Quick Glance" : "Add to Quick Glance"}
        >
          <Eye className="h-3 w-3" />
        </button>
      </td>

      {/* 3. Priority (editable dot) */}
      <td className={cn("px-1 py-1.5 text-center", editableCellBg)}>
        <span
          className={cn(
            "inline-block w-3 h-3 rounded-full cursor-pointer hover:ring-2 hover:ring-offset-1",
            priorityDotColors[envelope.priority || 'discretionary']
          )}
          title={envelope.priority === 'essential' ? 'Essential' : envelope.priority === 'important' ? 'Important' : 'Flexible'}
        />
      </td>

      {/* 4. Envelope Name */}
      <td className={cn("px-2 py-1.5", editableCellBg)}>
        {(() => {
          // Determine if icon should move to Target column
          const isSavingsOrGoal = envelope.subtype === 'savings' || envelope.subtype === 'goal';
          const hasTargetAmount = (envelope.targetAmount || 0) > 0;
          // Check both is_leveled flag AND presence of leveling_data (handles data sync issues)
          const hasLevelingData = envelope.leveling_data && typeof envelope.leveling_data === 'object' && Object.keys(envelope.leveling_data).length > 0;
          const isLeveled = envelope.is_leveled || hasLevelingData;
          const hasCelebrationGifts = (envelope.is_celebration || envelope.category_name?.toLowerCase() === 'celebrations') && (envelope.gift_recipient_count ?? 0) > 0;
          const isDebt = envelope.subtype === 'debt' || envelope.is_debt;

          // Icon moves to Target column for: savings/goal with target, leveled bills, celebration with gifts, debt envelopes
          const showIconHere = !((isSavingsOrGoal && hasTargetAmount) || isLeveled || hasCelebrationGifts || isDebt);

          return (
            <div className="flex items-center gap-1.5">
              {/* Envelope icon - clickable to edit (hidden when icon moves to Target) */}
              {showIconHere ? (
                <IconPicker
                  selectedIcon={envelope.icon || "wallet"}
                  onIconSelect={(icon) => onEnvelopeChange(envelope.id, 'icon', icon)}
                  size="sm"
                />
              ) : (
                <span className="text-muted-foreground text-[10px] w-5 text-center">—</span>
              )}
              <input
                type="text"
                value={envelope.name}
                onChange={(e) => onEnvelopeChange(envelope.id, 'name', e.target.value)}
                className={cn(inputClass, "font-medium text-text-dark text-[12px] py-0.5")}
              />
              {/* Show snowflake icon for bills that CAN be leveled (but aren't yet) */}
              {!isLeveled && envelope.subtype === 'bill' && onLevelBillClick && (
                <button
                  type="button"
                  onClick={() => onLevelBillClick(envelope)}
                  className="flex-shrink-0 w-4 h-4 rounded-full bg-blue-light text-blue flex items-center justify-center text-[10px] hover:bg-blue hover:text-white transition-colors"
                  title="Level this bill for seasonal variation"
                >
                  ❄
                </button>
              )}
            </div>
          );
        })()}
      </td>

      {/* 5. Category (only in priority view) */}
      {showCategoryColumn && (
        <td className="px-2 py-1.5">
          <span className="text-[11px] text-text-medium truncate block">
            {envelope.category_name || "-"}
          </span>
        </td>
      )}

      {/* 6. Type */}
      <td className={cn("px-2 py-1.5", editableCellBg)}>
        <select
          value={envelope.subtype}
          onChange={(e) => onEnvelopeChange(envelope.id, 'subtype', e.target.value)}
          className={cn(selectClass, "text-text-medium text-[11px] py-0.5")}
        >
          {SUBTYPE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </td>

      {/* 6. Target (Amount) - Show special icons here for leveled/celebration/debt/savings/goal */}
      <td className={cn("px-2 py-1.5", editableCellBg)}>
        {(() => {
          const isSavingsOrGoal = envelope.subtype === 'savings' || envelope.subtype === 'goal';
          const hasTargetAmount = (envelope.targetAmount || 0) > 0;
          // Check both is_leveled flag AND presence of leveling_data (handles data sync issues)
          const hasLevelingData = envelope.leveling_data && typeof envelope.leveling_data === 'object' && Object.keys(envelope.leveling_data).length > 0;
          const isLeveled = envelope.is_leveled || hasLevelingData;
          const hasCelebrationGifts = (envelope.is_celebration || envelope.category_name?.toLowerCase() === 'celebrations') && (envelope.gift_recipient_count ?? 0) > 0;
          const isDebt = envelope.subtype === 'debt' || envelope.is_debt;

          // Savings/Goal with target amount - show envelope icon + checkmark
          if (isSavingsOrGoal && hasTargetAmount) {
            return (
              <div className="flex items-center justify-center gap-1">
                <IconPicker
                  selectedIcon={envelope.icon || "wallet"}
                  onIconSelect={(icon) => onEnvelopeChange(envelope.id, 'icon', icon)}
                  size="sm"
                />
                <span className="text-[10px] text-sage-dark font-medium" title={`Target: $${(envelope.targetAmount || 0).toFixed(2)}`}>
                  ✓
                </span>
              </div>
            );
          }

          // Leveled bills - show envelope icon + seasonal indicator (clickable to edit leveling)
          if (isLeveled && onLevelBillClick) {
            return (
              <div className="flex items-center justify-center gap-1 w-full">
                <IconPicker
                  selectedIcon={envelope.icon || "wallet"}
                  onIconSelect={(icon) => onEnvelopeChange(envelope.id, 'icon', icon)}
                  size="sm"
                />
                <button
                  type="button"
                  onClick={() => onLevelBillClick(envelope)}
                  className="text-base hover:scale-110 transition-transform"
                  title="Click to edit leveling settings"
                >
                  {envelope.seasonal_pattern === 'winter-peak' ? '❄️' : '☀️'}
                </button>
              </div>
            );
          }

          // Celebration with gifts - show envelope icon + gift icon (clickable to edit gifts)
          if (hasCelebrationGifts && onGiftAllocationClick) {
            return (
              <div className="flex items-center justify-center gap-1 w-full">
                <IconPicker
                  selectedIcon={envelope.icon || "wallet"}
                  onIconSelect={(icon) => onEnvelopeChange(envelope.id, 'icon', icon)}
                  size="sm"
                />
                <button
                  type="button"
                  onClick={() => onGiftAllocationClick(envelope)}
                  className="text-base hover:scale-110 transition-transform"
                  title={`${envelope.gift_recipient_count} gift recipient${(envelope.gift_recipient_count ?? 0) > 1 ? 's' : ''} - click to edit`}
                >
                  🎁
                </button>
              </div>
            );
          }

          // Debt envelope - show envelope icon + credit card icon (clickable to edit debt items)
          if (isDebt && onDebtAllocationClick) {
            return (
              <div className="flex items-center justify-center gap-1 w-full">
                <IconPicker
                  selectedIcon={envelope.icon || "wallet"}
                  onIconSelect={(icon) => onEnvelopeChange(envelope.id, 'icon', icon)}
                  size="sm"
                />
                <button
                  type="button"
                  onClick={() => onDebtAllocationClick(envelope)}
                  className="text-base hover:scale-110 transition-transform"
                  title="Click to edit debt items"
                >
                  💳
                </button>
              </div>
            );
          }

          // Default - show target amount input
          return (
            <div className="relative">
              <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[11px] text-text-light">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={envelope.targetAmount ? Number(envelope.targetAmount).toFixed(2) : ''}
                onChange={(e) => onEnvelopeChange(envelope.id, 'targetAmount', parseFloat(e.target.value) || 0)}
                className={cn(inputClass, "text-right pl-3 text-text-dark text-[11px] py-0.5")}
                placeholder="0.00"
              />
            </div>
          );
        })()}
      </td>

      {/* 7. Frequency (abbreviated display) */}
      <td className={cn("px-2 py-1.5 text-center whitespace-nowrap", editableCellBg)}>
        {envelope.frequency === 'custom_weeks' ? (
          /* Custom weeks - single popover with "Every X wks" display */
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="text-[11px] text-text-medium hover:text-text-dark px-1.5 py-0.5 rounded hover:bg-silver-very-light whitespace-nowrap"
              >
                Every {envelope.custom_weeks || 8} wks
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-40 p-2" align="center" onOpenAutoFocus={(e) => e.preventDefault()}>
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 justify-center whitespace-nowrap">
                  <span className="text-[11px] text-text-medium">Every</span>
                  <input
                    type="number"
                    min="1"
                    max="52"
                    value={envelope.custom_weeks || 8}
                    onChange={(e) => onEnvelopeChange(envelope.id, 'custom_weeks', parseInt(e.target.value) || 8)}
                    className="w-12 h-6 text-[11px] text-center border rounded px-1"
                  />
                  <span className="text-[11px] text-text-medium">wks</span>
                </div>
                <button
                  type="button"
                  onClick={() => onEnvelopeChange(envelope.id, 'frequency', 'monthly')}
                  className="w-full text-left px-2 py-1 text-[10px] text-muted-foreground hover:text-text-dark hover:bg-sage-very-light rounded"
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
                type="button"
                className="text-[11px] text-text-medium hover:text-text-dark px-1.5 py-0.5 rounded hover:bg-silver-very-light"
              >
                {formatFrequencyAbbrev(envelope.frequency || 'monthly', envelope.custom_weeks)}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-44 p-1" align="center">
              <div className="space-y-0.5">
                {FREQUENCY_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onEnvelopeChange(envelope.id, 'frequency', opt.value);
                      // Set default custom_weeks if switching to custom_weeks
                      if (opt.value === 'custom_weeks' && !envelope.custom_weeks) {
                        onEnvelopeChange(envelope.id, 'custom_weeks', 8);
                      }
                    }}
                    className={cn(
                      "w-full text-left px-2 py-1 text-[11px] rounded hover:bg-sage-very-light",
                      envelope.frequency === opt.value && "bg-sage-very-light font-medium"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </td>

      {/* 8. Due Date (clickable with calendar popover) */}
      <td className={cn("px-2 py-1.5", editableCellBg)}>
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="text-[11px] text-text-medium hover:text-text-dark px-1.5 py-0.5 rounded hover:bg-silver-very-light"
            >
              {formatDueDateDisplay() || (envelope.frequency === 'custom_weeks' ? 'Next due' : 'Set date')}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={envelope.dueDate ? new Date(envelope.dueDate) : undefined}
              onSelect={(date) => {
                onEnvelopeChange(envelope.id, 'dueDate', date ? date.toISOString().split('T')[0] : null);
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </td>

      {/* 9. Funded By */}
      <td className={cn("px-2 py-1.5", editableCellBg)}>
        <select
          value={fundedBy || ''}
          onChange={(e) => onFundedByChange(envelope.id, e.target.value)}
          className={cn(
            "px-1.5 py-0.5 rounded text-[11px] font-medium border-0 cursor-pointer w-full",
            fundedByClass || "bg-silver-very-light text-text-medium"
          )}
        >
          <option value="">—</option>
          <option value="primary">1st</option>
          {incomeSources.length > 1 && <option value="secondary">2nd</option>}
          {incomeSources.length > 1 && <option value="split">Split</option>}
        </select>
      </td>

      {/* 10. Per Pay (Calculated - read only) */}
      <td className="px-2 py-1.5 text-right bg-white">
        <span className="text-[11px] font-semibold" style={{ color: '#7A9E9A' }}>${perPay.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      </td>

      {/* 11. Annual (Calculated - read only) */}
      <td className="px-2 py-1.5 text-right bg-white">
        <span className="text-[11px] text-text-medium">
          ${annual.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </td>

      {/* Enhanced View Columns */}
      {enhancedView && (
        <>
          {/* 12. Progress Bar */}
          <td className="px-2 py-1.5">
            <CompactProgressBar
              current={envelope.currentAmount || 0}
              target={envelope.targetAmount || 0}
              className="w-full"
            />
          </td>

          {/* 13. Current Balance (read only) */}
          <td className="px-2 py-1.5 text-right bg-white">
            <span className="text-[11px] font-semibold text-sage">
              ${(envelope.currentAmount || 0).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </td>

          {/* 14. Due In */}
          <td className="px-2 py-1.5 text-center">
            {envelope.subtype === 'bill' && envelope.dueDate && paySchedule ? (
              (() => {
                const nextDue = getNextDueDate(envelope.dueDate);
                if (!nextDue) return <PaysUntilDuePlaceholder />;
                const result = calculatePaysUntilDue(nextDue, paySchedule, isFullyFunded);
                return (
                  <PaysUntilDueBadge
                    urgency={result.urgency}
                    displayText={result.displayText}
                    isFunded={isFullyFunded}
                  />
                );
              })()
            ) : (envelope.is_celebration || envelope.category_name?.toLowerCase() === 'celebrations') && celebrationReadiness ? (
              <CelebrationReadinessBadge
                status={celebrationReadiness.status}
                shortfall={celebrationReadiness.shortfall}
                nextEventName={celebrationReadiness.nextEventName ?? undefined}
                daysUntil={celebrationReadiness.daysUntil ?? undefined}
                paysUntil={celebrationReadiness.paysUntil ?? undefined}
              />
            ) : (envelope.is_celebration || envelope.category_name?.toLowerCase() === 'celebrations') ? (
              <CelebrationReadinessPlaceholder />
            ) : (
              <span className="text-text-light text-[11px]">—</span>
            )}
          </td>
        </>
      )}

      {/* 15. Notes Icon */}
      <td className="pl-3 pr-1 py-1.5 text-center">
        {!envelope.is_suggested && (
          <NotesPopover
            notes={envelope.notes || ''}
            onSave={(notes) => onEnvelopeChange(envelope.id, 'notes', notes || null)}
          />
        )}
      </td>

      {/* 16. Status Icon (with tooltip) */}
      <td className="px-1 py-1.5 text-center">
        <div className="inline-flex items-center justify-center" title={statusInfo.tooltip}>
          {statusInfo.status === 'underfunded' ? (
            <span className="text-[11px] font-semibold text-[#6B9ECE]">
              -${statusInfo.shortfall.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          ) : statusInfo.status === 'surplus' ? (
            <span className="text-[11px] font-semibold text-[#7A9E9A]">
              +${statusInfo.surplus.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          ) : statusInfo.status === 'on-track' ? (
            <CheckCircle2 className="h-4 w-4 text-[#7A9E9A]" />
          ) : (
            statusInfo.icon
          )}
        </div>
      </td>

      {/* 17. Actions (Three-dot menu) - last column, always visible */}
      <td className="px-1 py-1.5">
        {envelope.is_suggested ? (
          <span className="text-[8px] text-text-light">—</span>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="p-0.5 rounded text-text-medium hover:bg-silver-very-light hover:text-text-dark"
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {onChangeCategoryClick && (
                <DropdownMenuItem
                  onClick={() => onChangeCategoryClick(envelope)}
                  className="text-xs gap-2"
                >
                  <FolderInput className="h-3.5 w-3.5" />
                  Change Category
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => {
                  // View history functionality - navigate to envelope detail
                  window.location.href = `/envelopes/${envelope.id}?tab=history`;
                }}
                className="text-xs gap-2"
              >
                <History className="h-3.5 w-3.5" />
                View History
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onEnvelopeChange(envelope.id, 'is_monitored', !envelope.is_monitored)}
                className="text-xs gap-2"
              >
                <Eye className="h-3.5 w-3.5" />
                {envelope.is_monitored ? "Remove from Quick Glance" : "Add to Quick Glance"}
              </DropdownMenuItem>
              {/* Gift Recipients - only show for celebration envelopes (by flag or category) */}
              {(envelope.is_celebration || envelope.category_name?.toLowerCase() === 'celebrations') && onGiftAllocationClick && (
                <DropdownMenuItem
                  onClick={() => onGiftAllocationClick(envelope)}
                  className="text-xs gap-2"
                >
                  <Gift className="h-3.5 w-3.5" />
                  Gift Recipients
                </DropdownMenuItem>
              )}
              {/* Manage Debts - only show for debt envelopes (by flag or subtype) */}
              {(envelope.is_debt || envelope.subtype === 'debt') && onDebtAllocationClick && (
                <DropdownMenuItem
                  onClick={() => onDebtAllocationClick(envelope)}
                  className="text-xs gap-2"
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  Manage Debts
                </DropdownMenuItem>
              )}
              {/* Level this bill - only show for bill envelopes that aren't already leveled */}
              {envelope.subtype === 'bill' && !envelope.is_leveled && onLevelBillClick && (
                <DropdownMenuItem
                  onClick={() => onLevelBillClick(envelope)}
                  className="text-xs gap-2"
                >
                  <Thermometer className="h-3.5 w-3.5" />
                  Level this bill
                </DropdownMenuItem>
              )}
              {/* Remove leveling option - show when already leveled */}
              {envelope.is_leveled && (
                <DropdownMenuItem
                  onClick={() => {
                    onEnvelopeChange(envelope.id, 'is_leveled', false);
                  }}
                  className="text-xs gap-2 text-text-medium"
                >
                  <Thermometer className="h-3.5 w-3.5" />
                  Remove leveling
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onArchiveClick?.(envelope)}
                className="text-xs gap-2 text-blue focus:text-blue"
              >
                <Archive className="h-3.5 w-3.5" />
                Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </td>
    </tr>
  );
}
