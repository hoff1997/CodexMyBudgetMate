"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { RefreshCw, ChevronDown, ChevronRight, StickyNote, Plus, ArrowUpDown, ArrowUp, ArrowDown, X, GripVertical, CheckCircle2, AlertCircle, TrendingUp, MinusCircle, DollarSign, Receipt, ArrowUpRight, Archive, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RemyHelpPanel } from "@/components/coaching/RemyHelpPanel";
import { ContextualRemyBanner } from "@/components/allocation/contextual-remy-banner";
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
import { EnvelopeFilterTabs, getStatusBucket, type StatusFilter } from "@/components/shared/envelope-filter-tabs";
import { CompactProgressBar } from "@/components/shared/envelope-progress-bar";
import { EnvelopeStatusBadge, calculateEnvelopeStatus } from "@/components/shared/envelope-status-badge";
import { MyBudgetWayWidget, type CreditCardDebtData, type SuggestedEnvelope, type MilestoneProgress } from "@/components/my-budget-way/my-budget-way-widget";
import { useSidebar } from "@/components/layout/sidebar-context";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
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

type PriorityLevel = 'essential' | 'important' | 'discretionary';
type SortColumn = 'name' | 'target' | 'current' | 'status' | 'gap' | 'perPay' | null;

const PRIORITY_CONFIG: Record<PriorityLevel, {
  label: string;
  dotColor: string;
  bgColor: string;
  borderColor: string;
}> = {
  essential: {
    label: "ESSENTIAL",
    dotColor: "bg-[#5A7E7A]", // sage-dark
    bgColor: "bg-[#E2EEEC]", // sage-very-light
    borderColor: "border-[#B8D4D0]", // sage-light
  },
  important: {
    label: "IMPORTANT",
    dotColor: "bg-[#6B9ECE]", // blue
    bgColor: "bg-[#DDEAF5]", // blue-light
    borderColor: "border-[#6B9ECE]", // blue
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
];

const FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'Weekly', abbrev: 'Wk', multiplier: 52 },
  { value: 'fortnightly', label: 'Fortnightly', abbrev: 'FN', multiplier: 26 },
  { value: 'monthly', label: 'Monthly', abbrev: 'Mth', multiplier: 12 },
  { value: 'quarterly', label: 'Quarterly', abbrev: 'Q', multiplier: 4 },
  { value: 'annually', label: 'Annually', abbrev: 'Yr', multiplier: 1 },
];

// Format frequency as abbreviation for display
function formatFrequencyAbbrev(frequency: string): string {
  const freq = FREQUENCY_OPTIONS.find(f => f.value === frequency.toLowerCase());
  return freq?.abbrev || frequency;
}

// Get envelope status icon and tooltip
function getEnvelopeStatusIcon(envelope: {
  is_tracking_only?: boolean;
  subtype?: string;
  targetAmount?: number;
  currentAmount?: number;
}): { icon: React.ReactNode; tooltip: string } {
  // Tracking envelopes
  if (envelope.is_tracking_only || envelope.subtype === 'tracking') {
    return {
      icon: <Receipt className="h-4 w-4 text-[#9CA3AF]" />,
      tooltip: "Tracking only"
    };
  }

  // Spending envelopes
  if (envelope.subtype === 'spending') {
    return {
      icon: <DollarSign className="h-4 w-4 text-[#9CA3AF]" />,
      tooltip: "Spending envelope"
    };
  }

  // No target set
  const target = Number(envelope.targetAmount ?? 0);
  if (!target || target === 0) {
    return {
      icon: <MinusCircle className="h-4 w-4 text-[#9CA3AF]" />,
      tooltip: "No target set"
    };
  }

  // Calculate funding ratio
  const current = Number(envelope.currentAmount ?? 0);
  const ratio = current / target;

  // Surplus (≥105%)
  if (ratio >= 1.05) {
    return {
      icon: <TrendingUp className="h-4 w-4 text-[#5A7E7A]" />,
      tooltip: "Surplus - over funded"
    };
  }

  // On track (≥80%)
  if (ratio >= 0.8) {
    return {
      icon: <CheckCircle2 className="h-4 w-4 text-[#7A9E9A]" />,
      tooltip: "On track - 80%+ funded"
    };
  }

  // Needs attention (<80%)
  return {
    icon: <AlertCircle className="h-4 w-4 text-[#6B9ECE]" />,
    tooltip: "Needs attention - under funded"
  };
}

/**
 * AllocationClient - Budget Allocation Page matching HTML mockup
 * Single table view with "Funded By" column instead of tabs
 */
export function AllocationClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sidebar = useSidebar();
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
  const [categories, setCategories] = useState<{
    id: string;
    name: string;
    icon?: string | null;
    is_system: boolean;
    display_order: number;
  }[]>([]);
  const [highlightedEnvelopeId, setHighlightedEnvelopeId] = useState<string | null>(null);
  const [showIncomeCoaching, setShowIncomeCoaching] = useState(false);

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

  // Auto-collapse desktop sidebar on mount for more table space
  useEffect(() => {
    sidebar.collapseDesktop();
  }, [sidebar]);

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

  // Sort state for enhanced view
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

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
  }, []);

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
    if (sortColumn === column) {
      // Same column - toggle direction or clear
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        // Third click - clear sort
        setSortColumn(null);
        setSortDirection('asc');
      }
    } else {
      // New column - set ascending
      setSortColumn(column);
      setSortDirection('asc');
    }
  }, [sortColumn, sortDirection]);

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

      if (categoriesRes.ok) {
        const { categories: cats } = await categoriesRes.json();
        setCategories(cats || []);
      }

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
          category_display_order: env.category_display_order,
          // Suggested envelope fields
          is_suggested: env.is_suggested,
          suggestion_type: env.suggestion_type,
          is_dismissed: env.is_dismissed,
          auto_calculate_target: env.auto_calculate_target,
          description: env.description,
          snoozed_until: env.snoozed_until,
          // Leveled bill fields
          is_leveled: env.is_leveled,
          leveling_data: env.leveling_data,
          seasonal_pattern: env.seasonal_pattern,
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
   * Group envelopes by priority (excluding suggested and tracking-only)
   */
  const envelopesByPriority = useMemo(() => {
    const nonTrackingNonSuggested = envelopes.filter(e => !e.is_tracking_only && !e.is_suggested);
    return {
      essential: nonTrackingNonSuggested.filter(e => e.priority === 'essential'),
      important: nonTrackingNonSuggested.filter(e => e.priority === 'important'),
      discretionary: nonTrackingNonSuggested.filter(e => e.priority === 'discretionary'),
    };
  }, [envelopes]);

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
    const regularEnvelopes = envelopes.filter(e => !e.is_suggested);
    const totalTarget = regularEnvelopes.reduce((sum, e) => sum + (e.targetAmount || 0), 0);
    const totalCurrent = regularEnvelopes.reduce((sum, e) => sum + (e.currentAmount || 0), 0);
    const overallProgress = totalTarget > 0 ? Math.min(100, (totalCurrent / totalTarget) * 100) : 100;

    // Count funded vs total
    const fundedCount = regularEnvelopes.filter(e => {
      const target = e.targetAmount || 0;
      const current = e.currentAmount || 0;
      return target === 0 || current >= target * 0.8; // 80% or more = funded
    }).length;

    // Check if essentials are underfunded
    const essentials = regularEnvelopes.filter(e => e.priority === 'essential');
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
      totalCount: regularEnvelopes.length,
      needsFunding: regularEnvelopes.length - fundedCount,
      shouldShowEnvelopeRow: regularEnvelopes.length > 0,
      essentialsUnderfunded,
    };
  }, [envelopes]);

  /**
   * Calculate status counts for filter tabs (enhanced view)
   */
  const statusCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = {
      all: envelopes.length,
      healthy: 0,
      attention: 0,
      surplus: 0,
      "no-target": 0,
      spending: 0,
      tracking: 0,
    };
    envelopes.forEach(env => {
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
   * Sort envelopes based on current sort column and direction
   */
  const sortEnvelopes = useCallback((envs: UnifiedEnvelopeData[]): UnifiedEnvelopeData[] => {
    if (!sortColumn) return envs;

    return [...envs].sort((a, b) => {
      let comparison = 0;

      switch (sortColumn) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'target':
          comparison = (a.targetAmount || 0) - (b.targetAmount || 0);
          break;
        case 'current':
          comparison = (a.currentAmount || 0) - (b.currentAmount || 0);
          break;
        case 'status': {
          // Sort by status (funded percentage)
          const aRatio = (a.targetAmount || 0) > 0 ? (a.currentAmount || 0) / (a.targetAmount || 1) : 0;
          const bRatio = (b.targetAmount || 0) > 0 ? (b.currentAmount || 0) / (b.targetAmount || 1) : 0;
          comparison = aRatio - bRatio;
          break;
        }
        case 'gap': {
          const aGap = Math.max(0, (a.targetAmount || 0) - (a.currentAmount || 0));
          const bGap = Math.max(0, (b.targetAmount || 0) - (b.currentAmount || 0));
          comparison = aGap - bGap;
          break;
        }
        case 'perPay':
          comparison = (a.targetAmount || 0) - (b.targetAmount || 0); // Proportional to target
          break;
        default:
          return 0;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [sortColumn, sortDirection]);

  /**
   * Filtered envelopes by priority for enhanced view
   */
  const filteredEnvelopesByPriority = useMemo(() => {
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
      return sortEnvelopes(filtered);
    };

    return {
      essential: filterEnvelopes(envelopesByPriority.essential),
      important: filterEnvelopes(envelopesByPriority.important),
      discretionary: filterEnvelopes(envelopesByPriority.discretionary),
    };
  }, [envelopesByPriority, activeFilter, sortEnvelopes]);

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
        <button
          type="button"
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
          </div>
        </button>

        {/* Table */}
        {isExpanded && (
          <div className={cn("border rounded-b-md overflow-hidden", config.borderColor)}>
            <table className="w-full table-fixed">
              <thead className="bg-silver-very-light border-b border-silver-light">
                <tr>
                  {/* 1. Drag Handle */}
                  <th className="px-1 py-2 w-[24px]"></th>
                  {/* 2. Quick Glance (Dashboard Monitor) */}
                  <th className="px-1 py-2 text-center w-[24px]" title="Quick Glance - Show on Dashboard">
                    <Eye className="h-3 w-3 text-text-light mx-auto" />
                  </th>
                  {/* 3. Priority */}
                  <th className="px-1 py-2 text-center text-[10px] font-semibold text-text-medium uppercase tracking-wide w-[40px]">Pri</th>
                  {/* 3. Status Icon */}
                  <th className="px-1 py-2 text-center text-[10px] font-semibold text-text-medium uppercase tracking-wide w-[36px]"></th>
                  {/* 4. Envelope Name - Sortable */}
                  <th
                    className="px-2 py-2 text-left text-[10px] font-semibold text-text-medium uppercase tracking-wide cursor-pointer hover:text-text-dark w-[160px]"
                    onClick={() => handleSort('name')}
                  >
                    <span className="flex items-center">Envelope{getSortIcon('name')}</span>
                  </th>
                  {/* 5. Type */}
                  <th className="px-2 py-2 text-left text-[10px] font-semibold text-text-medium uppercase tracking-wide w-[75px]">Type</th>
                  {/* 6. Target - Sortable */}
                  <th
                    className="px-2 py-2 text-right text-[10px] font-semibold text-text-medium uppercase tracking-wide cursor-pointer hover:text-text-dark w-[80px]"
                    onClick={() => handleSort('target')}
                  >
                    <span className="flex items-center justify-end">Target{getSortIcon('target')}</span>
                  </th>
                  {/* 7. Frequency */}
                  <th className="px-2 py-2 text-center text-[10px] font-semibold text-text-medium uppercase tracking-wide w-[50px]">Freq</th>
                  {/* 8. Due Date */}
                  <th className="px-2 py-2 text-left text-[10px] font-semibold text-text-medium uppercase tracking-wide w-[75px]">Due</th>
                  {/* 9. Funded By */}
                  <th className="px-2 py-2 text-left text-[10px] font-semibold text-text-medium uppercase tracking-wide w-[70px]">Funded</th>
                  {/* 10. Per Pay - Sortable */}
                  <th
                    className="px-2 py-2 text-right text-[10px] font-semibold text-text-medium uppercase tracking-wide cursor-pointer hover:text-text-dark w-[70px]"
                    onClick={() => handleSort('perPay')}
                  >
                    <span className="flex items-center justify-end">Per Pay{getSortIcon('perPay')}</span>
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
                        onClick={() => handleSort('current')}
                      >
                        <span className="flex items-center justify-end">Current{getSortIcon('current')}</span>
                      </th>
                      {/* 14. Due In */}
                      <th className="px-2 py-2 text-center text-[10px] font-semibold text-text-medium uppercase tracking-wide w-[60px]">Due In</th>
                    </>
                  )}
                  {/* 15. Notes Icon */}
                  <th className="px-1 py-2 text-center text-[10px] font-semibold text-text-medium uppercase tracking-wide w-[28px]"></th>
                  {/* 16. Actions */}
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-6 w-6 animate-spin text-text-medium" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto px-3 py-4">
      {/* Mobile Guidance Banner */}
      <MobileGuidanceBanner />

      {/* Compact Header - Remy widget inline with actions */}
      <div className="relative flex items-center justify-between mb-4">
        {/* Compact Remy Banner (left side) */}
        <ContextualRemyBanner
          allocationState={totalSurplus < 0 ? "over" : totalSurplus > 0.01 ? "under" : "balanced"}
          unallocatedAmount={totalSurplus > 0 ? totalSurplus : 0}
          overAllocatedAmount={totalSurplus < 0 ? Math.abs(totalSurplus) : 0}
          onTransfer={(envelopeId, amount) => {
            setTransferOpen(true);
          }}
          compact
        />

        {/* Right side actions */}
        <div className="flex items-center gap-2">
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
            />
          ))}
        </div>
        <IncomeInfoButton onClick={() => setShowIncomeCoaching(true)} />
      </div>


      {/* Filter Tabs and View Toggle (Enhanced View) */}
      {enhancedView && (
        <div className="flex items-center justify-between gap-2 mb-4">
          <EnvelopeFilterTabs
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            envelopeCounts={statusCounts}
          />

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
            <div className="flex items-center gap-0.5 bg-silver-very-light rounded-md p-0.5">
              <button
                type="button"
                onClick={() => toggleViewMode('priority')}
                className={cn(
                  "px-2 py-1 text-[11px] font-medium rounded transition-colors",
                  viewMode === 'priority'
                    ? "bg-white text-sage-dark shadow-sm"
                    : "text-text-medium hover:text-text-dark"
                )}
              >
                Priority
              </button>
              <button
                type="button"
                onClick={() => toggleViewMode('category')}
                className={cn(
                  "px-2 py-1 text-[11px] font-medium rounded transition-colors",
                  viewMode === 'category'
                    ? "bg-white text-sage-dark shadow-sm"
                    : "text-text-medium hover:text-text-dark"
                )}
              >
                Category
              </button>
              <button
                type="button"
                onClick={() => toggleViewMode('snapshot')}
                className={cn(
                  "px-2 py-1 text-[11px] font-medium rounded transition-colors",
                  viewMode === 'snapshot'
                    ? "bg-white text-sage-dark shadow-sm"
                    : "text-text-medium hover:text-text-dark"
                )}
              >
                Snapshot
              </button>
            </div>
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
      <div ref={printableAreaRef} className="overflow-x-auto -mx-6 px-6 lg:mx-0 lg:px-0 bg-white">
        <div className="min-w-[900px] lg:min-w-0">
          {viewMode === 'priority' && (
            <>
              {renderPriorityGroup('essential')}
              {renderPriorityGroup('important')}
              {renderPriorityGroup('discretionary')}
            </>
          )}
          {viewMode === 'category' && (
            <CategoryGroups
              envelopes={envelopes.filter(e => !e.is_tracking_only && !e.is_suggested)}
              categories={categories}
              incomeSources={incomeSources}
              paySchedule={paySchedule}
              enhancedView={enhancedView}
              onEnvelopeChange={handleEnvelopeChange}
              onFundedByChange={handleFundedByChange}
              calculatePerPay={calculatePerPay}
              onChangeCategoryClick={handleChangeCategoryClick}
              onArchiveClick={handleArchiveClick}
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
                  onChangeCategoryClick={options.onChangeCategoryClick}
                  onArchiveClick={options.onArchiveClick}
                  onLevelBillClick={handleLevelBillClick}
                />
              )}
            />
          )}
          {viewMode === 'snapshot' && (
            <SnapshotView
              envelopes={envelopes}
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
        onOpenChange={setCreateOpen}
        categories={categories}
        onCreated={fetchData}
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
          suggestedPattern={detectedSeasonalInfo.suggestedPattern}
          onBack={() => setLevelingStep('detection')}
          onSave={handleSaveLevelingData}
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
        />
      )}

      {/* Milestone Completion Dialog */}
      <MilestoneCompletionDialog
        milestone={currentMilestone}
        open={milestoneDialogOpen}
        onOpenChange={setMilestoneDialogOpen}
        onDismiss={handleDismissMilestone}
      />
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
  onChangeCategoryClick,
  onArchiveClick,
  onLevelBillClick,
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
  onChangeCategoryClick?: (envelope: UnifiedEnvelopeData) => void;
  onArchiveClick?: (envelope: UnifiedEnvelopeData) => void;
  onLevelBillClick?: (envelope: UnifiedEnvelopeData) => void;
}) {
  const perPay = calculatePerPay(envelope);
  const annual = calculateAnnual(envelope);
  const fundedBy = getFundedBy(envelope);
  const totalAllocated = Object.values(envelope.incomeAllocations || {}).reduce((sum, amt) => sum + amt, 0);
  const isFullyFunded = perPay > 0 && totalAllocated >= perPay - 0.01;

  const iconBg = priority === 'essential' ? 'bg-sage-very-light' :
                 priority === 'important' ? 'bg-blue-light' : 'bg-silver-very-light';

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
      ? "bg-sage-very-light hover:bg-sage-light transition-colors group"
      : "hover:bg-[#E2EEEC] transition-colors group h-[44px]",
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
    <tr ref={rowRef} className={rowClass}>
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

      {/* 3. Status Icon (with tooltip) */}
      <td className="px-1 py-1.5 text-center">
        <div className="inline-flex items-center justify-center" title={statusInfo.tooltip}>
          {statusInfo.icon}
        </div>
      </td>

      {/* 4. Envelope Name */}
      <td className={cn("px-2 py-1.5", editableCellBg)}>
        <div className="flex items-center gap-1.5">
          <div className={cn("w-5 h-5 rounded flex items-center justify-center text-xs flex-shrink-0", iconBg)}>
            {envelope.icon}
          </div>
          <input
            type="text"
            value={envelope.name}
            onChange={(e) => onEnvelopeChange(envelope.id, 'name', e.target.value)}
            className={cn(inputClass, "font-medium text-text-dark text-[12px] py-0.5")}
            readOnly={envelope.is_suggested}
          />
          {/* Show leveled indicator for seasonal bills */}
          {envelope.is_leveled && envelope.seasonal_pattern && (
            <LeveledIndicator seasonalPattern={envelope.seasonal_pattern} />
          )}
        </div>
      </td>

      {/* 5. Type */}
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

      {/* 6. Target (Amount) */}
      <td className={cn("px-2 py-1.5", editableCellBg)}>
        <div className="relative">
          <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[11px] text-text-light">$</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={envelope.targetAmount || ''}
            onChange={(e) => onEnvelopeChange(envelope.id, 'targetAmount', parseFloat(e.target.value) || 0)}
            className={cn(inputClass, "text-right pl-3 text-text-dark text-[11px] py-0.5")}
            placeholder="0"
          />
        </div>
      </td>

      {/* 7. Frequency (abbreviated display) */}
      <td className={cn("px-2 py-1.5 text-center", editableCellBg)}>
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="text-[11px] text-text-medium hover:text-text-dark px-1.5 py-0.5 rounded hover:bg-silver-very-light"
            >
              {formatFrequencyAbbrev(envelope.frequency || 'monthly')}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-32 p-1" align="center">
            <div className="space-y-0.5">
              {FREQUENCY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onEnvelopeChange(envelope.id, 'frequency', opt.value)}
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
      </td>

      {/* 8. Due Date (clickable, no calendar icon) */}
      <td className={cn("px-2 py-1.5", editableCellBg)}>
        <button
          type="button"
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'date';
            input.value = formatDueDateForInput();
            input.onchange = (e) => {
              onEnvelopeChange(envelope.id, 'dueDate', (e.target as HTMLInputElement).value || null);
            };
            input.click();
          }}
          className="text-[11px] text-text-medium hover:text-text-dark px-1.5 py-0.5 rounded hover:bg-silver-very-light"
        >
          {formatDueDateDisplay() || 'dd/mm/yy'}
        </button>
      </td>

      {/* 9. Funded By */}
      <td className={cn("px-2 py-1.5", editableCellBg)}>
        <select
          value={fundedBy || ''}
          onChange={(e) => onFundedByChange(envelope.id, e.target.value)}
          className={cn(
            "px-1.5 py-0.5 rounded text-[10px] font-medium border-0 cursor-pointer w-full",
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
        <span className="text-[11px] font-semibold" style={{ color: '#7A9E9A' }}>${perPay.toFixed(0)}</span>
      </td>

      {/* 11. Annual (Calculated - read only) */}
      <td className="px-2 py-1.5 text-right bg-white">
        <span className="text-[10px] text-text-medium">
          ${annual.toLocaleString('en-AU', { maximumFractionDigits: 0 })}
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
              ${(envelope.currentAmount || 0).toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
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
            ) : (
              <span className="text-text-light text-[10px]">—</span>
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

      {/* 16. Actions (Three-dot menu) */}
      <td className="px-1 py-1.5">
        {envelope.is_suggested ? (
          <span className="text-[8px] text-text-light">—</span>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="p-0.5 rounded text-text-light hover:bg-silver-very-light hover:text-text-medium opacity-0 group-hover:opacity-100 transition-opacity"
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
