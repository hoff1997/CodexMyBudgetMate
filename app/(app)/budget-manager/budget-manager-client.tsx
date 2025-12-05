"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import HelpTooltip from "@/components/ui/help-tooltip";
import {
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Settings,
  Pencil,
  Trash2,
  Plus,
} from "lucide-react";
import { CreditCardHoldingWidget } from "@/components/layout/credit-card/credit-card-holding-widget";
import { BudgetCategoryGroup } from "@/components/budget-manager/budget-category-group";
import { BudgetTableStickyHeader } from "@/components/budget-manager/budget-table-sticky-header";
import { AllocateSurplusDialog } from "@/components/dialogs/allocate-surplus-dialog";
import { PayCycleChangeDialog } from "@/components/dialogs/pay-cycle-change-dialog";
import { IncomeSourceDialog } from "@/components/dialogs/income-source-dialog";
import { useBudgetValidation, calculateUnallocatedBySource } from "@/lib/hooks/use-budget-validation";
import { trackSurplusAllocation, trackPayCycleChange } from "@/lib/analytics/events";
import { normalizeToUserPayCycle, getFrequencyShortLabel } from "@/lib/utils/ideal-allocation-calculator";
import { cn } from "@/lib/cn";
import type { UnifiedEnvelopeData, IncomeSource, GapAnalysisData, CategoryOption } from "@/lib/types/unified-envelope";

// Filter button definitions - same as envelope summary
const FILTERS = [
  { key: "all", label: "All" },
  { key: "healthy", label: "On track" },
  { key: "attention", label: "Needs attention" },
  { key: "surplus", label: "Surplus" },
  { key: "no-target", label: "No target" },
  { key: "spending", label: "Spending" },
  { key: "tracking", label: "Tracking" },
] as const;

type StatusFilter = (typeof FILTERS)[number]["key"];

// Helper function to determine envelope status bucket
function getStatusBucket(envelope: UnifiedEnvelopeData, gapData?: GapAnalysisData): StatusFilter {
  // Tracking envelopes
  if (envelope.subtype === 'tracking') return "tracking";
  // Spending envelopes
  if (envelope.subtype === 'spending') return "spending";

  const target = envelope.targetAmount ?? 0;
  if (!target) return "no-target";

  // Use gap analysis if available
  if (gapData) {
    if (gapData.status === "on_track") return gapData.gap >= 0 ? "healthy" : "healthy";
    if (gapData.status === "slight_deviation") return gapData.gap > 0 ? "surplus" : "attention";
    if (gapData.status === "needs_attention") return "attention";
  }

  // Fallback to simple ratio calculation
  const current = envelope.currentAmount ?? 0;
  const ratio = current / target;
  if (ratio >= 1.05) return "surplus";
  if (ratio >= 0.8) return "healthy";
  return "attention";
}

// Module-level stable empty references to prevent infinite re-renders
const EMPTY_ARRAY: any[] = [];
const EMPTY_ALLOCATIONS: Record<string, Record<string, number>> = {};
const EMPTY_INCOME_ALLOCATIONS: Record<string, number> = {};
const EMPTY_GAPS: GapAnalysisData[] = [];

interface BudgetManagerClientProps {
  userId?: string;
  initialPayCycle?: string;
  demoMode?: boolean;
}

export function BudgetManagerClient({
  initialPayCycle = "monthly",
  demoMode = false,
}: BudgetManagerClientProps) {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const tableRef = useRef<HTMLDivElement>(null);
  const hasScrolledToEnvelopeRef = useRef(false);

  const [payCycle, setPayCycle] = useState<'weekly' | 'fortnightly' | 'monthly'>(initialPayCycle as 'weekly' | 'fortnightly' | 'monthly');
  const [showSurplusDialog, setShowSurplusDialog] = useState(false);
  const [showPayCycleDialog, setShowPayCycleDialog] = useState(false);
  const [pendingPayCycle, setPendingPayCycle] = useState<'weekly' | 'fortnightly' | 'monthly' | null>(null);
  const [collapseAll, setCollapseAll] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Income source dialog state
  const [showIncomeDialog, setShowIncomeDialog] = useState(false);
  const [incomeDialogMode, setIncomeDialogMode] = useState<'add' | 'edit'>('add');
  const [selectedIncomeSource, setSelectedIncomeSource] = useState<IncomeSource | undefined>(undefined);

  // Sort state for the shared sticky header
  type SortColumn = 'name' | 'category' | 'priority' | 'subtype' | 'targetAmount' | 'frequency' | 'dueDate' | 'currentAmount' | 'totalFunded' | null;
  type SortDirection = 'asc' | 'desc';
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortColumn(null);
        setSortDirection('asc');
      }
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Drag and drop state - only enabled when no filter and no sort active
  const [activeId, setActiveId] = useState<string | null>(null);

  // Configure dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Fetch envelopes
  const { data: rawEnvelopes, isLoading } = useQuery<any[]>({
    queryKey: ["/api/envelopes"],
    queryFn: async () => {
      const response = await fetch("/api/envelopes", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch envelopes");
      const data = await response.json();
      return Array.isArray(data) ? data : data.envelopes || [];
    },
    enabled: !demoMode,
  });

  // Fetch income sources
  const { data: rawIncome } = useQuery<any[]>({
    queryKey: ["/api/income-sources"],
    queryFn: async () => {
      const response = await fetch("/api/income-sources", {
        credentials: "include",
      });
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !demoMode,
  });

  // Fetch envelope income allocations
  const { data: allocationsData } = useQuery<Record<string, Record<string, number>>>({
    queryKey: ["/api/envelope-income-allocations"],
    queryFn: async () => {
      const response = await fetch("/api/envelope-income-allocations", {
        credentials: "include",
      });
      if (!response.ok) return EMPTY_ALLOCATIONS;
      const data = await response.json();
      return data || EMPTY_ALLOCATIONS;
    },
    enabled: !demoMode,
  });

  // Fetch gap analysis data
  const { data: gapAnalysisData } = useQuery<{
    user_pay_cycle: string;
    current_date: string;
    gaps: GapAnalysisData[];
  }>({
    queryKey: ["/api/envelope-allocations/gap-analysis"],
    queryFn: async () => {
      const response = await fetch("/api/envelope-allocations/gap-analysis", {
        credentials: "include",
      });
      if (!response.ok) return { user_pay_cycle: payCycle, current_date: '', gaps: [] };
      return response.json();
    },
    enabled: !demoMode,
    staleTime: 60000, // 1 minute
  });

  // Fetch envelope categories
  const { data: rawCategories } = useQuery<CategoryOption[]>({
    queryKey: ["/api/envelope-categories"],
    queryFn: async () => {
      const response = await fetch("/api/envelope-categories", {
        credentials: "include",
      });
      if (!response.ok) return [];
      const data = await response.json();
      // API returns { categories: [...] }
      const categories = data.categories || data;
      return Array.isArray(categories) ? categories : [];
    },
    enabled: !demoMode,
  });

  // Use stable references - NEVER create new objects/arrays inline
  const safeRawEnvelopes = rawEnvelopes ?? EMPTY_ARRAY;
  const safeRawIncome = rawIncome ?? EMPTY_ARRAY;
  const safeAllocationsData = allocationsData ?? EMPTY_ALLOCATIONS;
  const safeGapData = gapAnalysisData?.gaps ?? EMPTY_GAPS;
  const safeCategories = rawCategories ?? EMPTY_ARRAY as CategoryOption[];

  // Convert raw data to unified format using useMemo (NOT useEffect + setState)
  const unifiedEnvelopes = useMemo<UnifiedEnvelopeData[]>(() => {
    if (safeRawEnvelopes.length === 0) return EMPTY_ARRAY as UnifiedEnvelopeData[];

    return safeRawEnvelopes.map(env => ({
      id: env.id,
      name: env.name,
      icon: env.icon || '📊',
      subtype: env.subtype || 'bill',
      targetAmount: Number(env.target_amount || 0),
      frequency: env.frequency || 'monthly',
      dueDate: env.due_date,
      priority: env.priority || 'important',
      notes: env.notes,
      incomeAllocations: safeAllocationsData[env.id] || EMPTY_INCOME_ALLOCATIONS,
      payCycleAmount: Number(env.pay_cycle_amount || 0),
      annualAmount: Number(env.annual_amount || 0),
      currentAmount: Number(env.current_amount || 0),
      categoryId: env.category_id,
    }));
  }, [safeRawEnvelopes, safeAllocationsData]);

  // Drag enabled only when no filter and no sort active
  const isDragEnabled = statusFilter === "all" && sortColumn === null && !demoMode;

  // Ref for accessing current envelopes in drag handler (avoids stale closure)
  const envelopesRef = useRef<UnifiedEnvelopeData[]>([]);
  envelopesRef.current = unifiedEnvelopes;

  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  // Handle drag end - same category reorder or cross-category move
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const currentEnvelopes = envelopesRef.current;

    // Find the envelopes
    const activeEnvelope = currentEnvelopes.find(e => e.id === active.id);
    const overEnvelope = currentEnvelopes.find(e => e.id === over.id);

    if (!activeEnvelope) return;

    // Handle dropping on a category (for cross-category moves)
    const overId = over.id as string;
    if (overId.startsWith('category-')) {
      const newCategoryId = overId.replace('category-', '');
      // Move to a different category (at the end of that category)
      if (activeEnvelope.categoryId !== newCategoryId) {
        try {
          await fetch(`/api/envelopes/${activeEnvelope.id}`, {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              category_id: newCategoryId === 'uncategorised' ? null : newCategoryId,
            }),
          });
          queryClient.invalidateQueries({ queryKey: ["/api/envelopes"] });
          toast.success("Envelope moved to new category");
        } catch (error) {
          console.error("Failed to move envelope:", error);
          toast.error("Failed to move envelope");
        }
      }
      return;
    }

    // Handle envelope-to-envelope drops
    if (!overEnvelope) return;

    if (activeEnvelope.categoryId === overEnvelope.categoryId) {
      // Same category - reorder within category
      const categoryEnvelopes = currentEnvelopes.filter(
        e => e.categoryId === activeEnvelope.categoryId
      );
      const oldIndex = categoryEnvelopes.findIndex(e => e.id === active.id);
      const newIndex = categoryEnvelopes.findIndex(e => e.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(categoryEnvelopes, oldIndex, newIndex);

        // Persist new sort orders
        try {
          await Promise.all(
            reordered.map((envelope, index) =>
              fetch(`/api/envelopes/${envelope.id}`, {
                method: "PATCH",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sort_order: index }),
              })
            )
          );
          queryClient.invalidateQueries({ queryKey: ["/api/envelopes"] });
          toast.success("Envelope order saved");
        } catch (error) {
          console.error("Failed to save envelope order:", error);
          toast.error("Failed to save envelope order");
        }
      }
    } else {
      // Cross-category move - change category and reorder
      try {
        // Get target category's envelopes to calculate new sort_order
        const targetCategoryEnvelopes = currentEnvelopes.filter(
          e => e.categoryId === overEnvelope.categoryId
        );
        const targetIndex = targetCategoryEnvelopes.findIndex(e => e.id === over.id);
        const newSortOrder = targetIndex >= 0 ? targetIndex : targetCategoryEnvelopes.length;

        await fetch(`/api/envelopes/${activeEnvelope.id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category_id: overEnvelope.categoryId === 'uncategorised' ? null : overEnvelope.categoryId,
            sort_order: newSortOrder,
          }),
        });
        queryClient.invalidateQueries({ queryKey: ["/api/envelopes"] });
        toast.success("Envelope moved to new category");
      } catch (error) {
        console.error("Failed to move envelope:", error);
        toast.error("Failed to move envelope");
      }
    }
  }, [queryClient]);

  // Calculate status counts for filter buttons
  const statusCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = {
      all: unifiedEnvelopes.length,
      healthy: 0,
      attention: 0,
      surplus: 0,
      "no-target": 0,
      spending: 0,
      tracking: 0,
    };
    unifiedEnvelopes.forEach((envelope) => {
      const gapData = safeGapData.find(g => g.envelope_id === envelope.id);
      const bucket = getStatusBucket(envelope, gapData);
      counts[bucket] += 1;
    });
    return counts;
  }, [unifiedEnvelopes, safeGapData]);

  // Filter envelopes based on status filter
  const filteredEnvelopes = useMemo(() => {
    if (statusFilter === "all") return unifiedEnvelopes;
    return unifiedEnvelopes.filter((envelope) => {
      const gapData = safeGapData.find(g => g.envelope_id === envelope.id);
      return getStatusBucket(envelope, gapData) === statusFilter;
    });
  }, [unifiedEnvelopes, statusFilter, safeGapData]);

  // Convert income data using useMemo with pay cycle normalization
  // NOTE: The 'amount' field is normalized to user's pay cycle for accurate totals
  const incomeSources = useMemo<IncomeSource[]>(() => {
    if (safeRawIncome.length === 0) return EMPTY_ARRAY as IncomeSource[];

    return safeRawIncome.map(inc => {
      const rawAmount = Number(inc.typical_amount || 0);
      const sourceFrequency = inc.pay_cycle || 'monthly';
      // Normalize to user's pay cycle for accurate income totals
      const normalizedAmount = normalizeToUserPayCycle(rawAmount, sourceFrequency, payCycle);

      return {
        id: inc.id,
        name: inc.name,
        amount: normalizedAmount,       // Normalized to user's pay cycle
        rawAmount: rawAmount,           // Original amount per source's frequency
        frequency: sourceFrequency,
        nextPayDate: inc.next_pay_date || undefined,
        startDate: inc.start_date || undefined,
        endDate: inc.end_date || undefined,
        replacedById: inc.replaced_by_id || undefined,
        isActive: inc.is_active !== false,
      };
    });
  }, [safeRawIncome, payCycle]); // Added payCycle as dependency for re-normalization

  // Group envelopes by category for collapsible sections (uses filtered envelopes)
  const groupedCategories = useMemo(() => {
    const map = new Map<string, { id: string; name: string; envelopes: UnifiedEnvelopeData[] }>();

    filteredEnvelopes.forEach((envelope) => {
      const id = envelope.categoryId || "uncategorised";
      const category = safeCategories.find(c => c.id === id);
      const name = category?.name ?? "Uncategorised";
      if (!map.has(id)) {
        map.set(id, { id, name, envelopes: [] });
      }
      map.get(id)!.envelopes.push(envelope);
    });

    return Array.from(map.values()).sort((a, b) => {
      // Put "Uncategorised" at the end
      if (a.id === "uncategorised") return 1;
      if (b.id === "uncategorised") return -1;
      return a.name.localeCompare(b.name);
    });
  }, [filteredEnvelopes, safeCategories]);

  // Handle URL parameter for deep linking to specific envelope
  useEffect(() => {
    const envelopeId = searchParams?.get('envelope');
    if (envelopeId && !hasScrolledToEnvelopeRef.current && tableRef.current) {
      setTimeout(() => {
        const envelopeRow = document.querySelector(`[data-envelope-id="${envelopeId}"]`);
        if (envelopeRow) {
          envelopeRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
          envelopeRow.classList.add('bg-blue-100');
          setTimeout(() => {
            envelopeRow.classList.remove('bg-blue-100');
          }, 2000);
          hasScrolledToEnvelopeRef.current = true;
        }
      }, 100);
    }
  }, [searchParams]);

  // Update envelope mutation
  const updateEnvelopeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      console.log('[MUTATION] Starting fetch to:', `/api/envelopes/${id}`, 'with data:', data);
      const response = await fetch(`/api/envelopes/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
        },
        body: JSON.stringify(data),
        cache: "no-store",
      });
      console.log('[MUTATION] Response status:', response.status, response.statusText);
      console.log('[MUTATION] Response headers:', Object.fromEntries(response.headers.entries()));
      if (!response.ok) {
        const errorData = await response.json();
        console.error('[MUTATION] Error response:', errorData);
        throw new Error(errorData.error || "Failed to update envelope");
      }
      const result = await response.json();
      console.log('[MUTATION] Success response:', result);
      return result;
    },
    onSuccess: () => {
      console.log('[MUTATION] onSuccess - invalidating queries');
      queryClient.invalidateQueries({ queryKey: ["/api/envelopes"] });
      toast.success("Envelope updated successfully");
    },
    onError: (error) => {
      console.error('[MUTATION] onError:', error);
      toast.error(`Failed to update: ${error.message}`);
    },
  });

  // Delete envelope mutation
  const deleteEnvelopeMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/envelopes/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete envelope");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/envelopes"] });
      toast.success("Envelope deleted successfully");
    },
  });

  // Handle envelope update
  const handleEnvelopeUpdate = async (id: string, updates: Partial<UnifiedEnvelopeData>) => {
    try {
      // Convert unified format to API format
      const apiData: any = {};

      if (updates.name !== undefined) apiData.name = updates.name;
      if (updates.icon !== undefined) apiData.icon = updates.icon;
      if (updates.subtype !== undefined) apiData.subtype = updates.subtype;
      if (updates.targetAmount !== undefined) apiData.target_amount = updates.targetAmount;
      if (updates.frequency !== undefined) apiData.frequency = updates.frequency;
      if (updates.dueDate !== undefined) {
        // Handle date conversion: support both number (day) and Date object
        if (updates.dueDate instanceof Date) {
          // If it's a Date object, convert to ISO string
          apiData.due_date = updates.dueDate.toISOString();
          console.log('[Budget Manager] Date conversion - Date object to ISO:', updates.dueDate, '→', apiData.due_date);
        } else if (typeof updates.dueDate === 'number') {
          // If it's just a day number, keep it as is
          apiData.due_date = updates.dueDate;
          console.log('[Budget Manager] Date conversion - keeping day number:', updates.dueDate);
        } else if (typeof updates.dueDate === 'string') {
          // If it's already a string, use it as is
          apiData.due_date = updates.dueDate;
          console.log('[Budget Manager] Date conversion - keeping string:', updates.dueDate);
        } else {
          apiData.due_date = updates.dueDate;
          console.log('[Budget Manager] Date conversion - unknown type:', typeof updates.dueDate, updates.dueDate);
        }
      }
      if (updates.priority !== undefined) apiData.priority = updates.priority;
      if (updates.notes !== undefined) apiData.notes = updates.notes;
      if (updates.payCycleAmount !== undefined) apiData.pay_cycle_amount = updates.payCycleAmount;

      console.log('[Budget Manager] Updating envelope:', id, 'with data:', apiData);
      await updateEnvelopeMutation.mutateAsync({ id, data: apiData });
      console.log('[Budget Manager] Mutation completed successfully');
    } catch (error) {
      console.error("[Budget Manager] Failed to update envelope:", error);
      // Don't show toast here - mutation handles it
    }
  };

  // Handle envelope delete
  const handleEnvelopeDelete = async (id: string) => {
    try {
      await deleteEnvelopeMutation.mutateAsync(id);
    } catch (error) {
      console.error("Failed to delete envelope:", error);
      toast.error("Failed to delete envelope");
    }
  };

  // Handle allocation update
  const handleAllocationUpdate = async (envelopeId: string, incomeSourceId: string, amount: number) => {
    try {
      const response = await fetch(`/api/envelopes/${envelopeId}/allocations`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ income_source_id: incomeSourceId, amount }),
      });

      if (!response.ok) throw new Error("Failed to update allocation");

      // Invalidate queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ["/api/envelope-income-allocations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/envelopes"] });

      toast.success("Allocation updated");
    } catch (error) {
      console.error("Failed to update allocation:", error);
      toast.error("Failed to update allocation");
    }
  };

  // Handle pay cycle change - show confirmation dialog first
  const handlePayCycleChange = (value: string) => {
    // In demo mode, just update locally without API call
    if (demoMode) {
      setPayCycle(value as any);
      toast.success("Pay cycle updated (demo mode)");
      return;
    }

    // Show confirmation dialog
    setPendingPayCycle(value as any);
    setShowPayCycleDialog(true);
  };

  // Actually perform the pay cycle change after confirmation
  const confirmPayCycleChange = async () => {
    if (!pendingPayCycle) return;

    try {
      const response = await fetch("/api/user/pay-cycle", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payCycle: pendingPayCycle }),
      });

      if (response.ok) {
        // Track analytics event
        trackPayCycleChange({
          from: payCycle,
          to: pendingPayCycle,
          envelopeCount: unifiedEnvelopes.length,
          totalAllocated,
        });

        setPayCycle(pendingPayCycle);
        queryClient.invalidateQueries({ queryKey: ["/api/envelopes"] });
        toast.success("Pay cycle updated and envelopes recalculated");
      } else {
        throw new Error("Failed to update pay cycle");
      }
    } catch (error) {
      console.error("Failed to update pay cycle:", error);
      toast.error("Failed to update pay cycle");
      throw error; // Re-throw so dialog can handle loading state
    }
  };

  // Calculate totals
  const totalIncome = incomeSources.reduce((sum, inc) => sum + inc.amount, 0);
  const totalAllocated = unifiedEnvelopes.reduce((sum, env) => {
    const envTotal = Object.values(env.incomeAllocations || {}).reduce((s, amt) => s + amt, 0);
    return sum + envTotal;
  }, 0);
  const difference = totalIncome - totalAllocated;

  // Use budget validation hook
  const budgetValidation = useBudgetValidation(totalIncome, totalAllocated);

  // Calculate unallocated amounts by income source
  const unallocatedBySource = calculateUnallocatedBySource(
    incomeSources.map(source => {
      const allocated = unifiedEnvelopes.reduce((sum, env) => {
        return sum + (env.incomeAllocations?.[source.id] || 0);
      }, 0);
      return {
        id: source.id,
        name: source.name,
        amount: source.amount,
        totalAllocated: allocated,
      };
    })
  );

  // Handle income source delete
  const handleDeleteIncomeSource = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This will also remove all allocations from this income source.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/income-sources/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to delete income source");
      }

      toast.success(`Income source "${name}" deleted`);
      queryClient.invalidateQueries({ queryKey: ["/api/income-sources"] });
      queryClient.invalidateQueries({ queryKey: ["/api/envelope-income-allocations"] });
    } catch (error) {
      console.error("Failed to delete income source:", error);
      toast.error("Failed to delete income source");
    }
  };

  // Handle income source dialog success
  const handleIncomeSourceSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/income-sources"] });
    queryClient.invalidateQueries({ queryKey: ["/api/envelope-income-allocations"] });
  };

  // Handle surplus allocation
  const handleAllocateSurplus = async () => {
    try {
      const response = await fetch("/api/budget/allocate-surplus", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          surplusAmount: budgetValidation.difference,
          incomeSources: unallocatedBySource,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to allocate surplus");
      }

      // Track analytics event
      trackSurplusAllocation({
        amount: budgetValidation.difference,
        incomeSourceCount: unallocatedBySource.length,
        context: 'budget_manager',
      });

      // Refresh envelopes to show updated allocations
      queryClient.invalidateQueries({ queryKey: ["/api/envelopes"] });
      toast.success("Surplus allocated successfully!");
    } catch (error) {
      console.error("Failed to allocate surplus:", error);
      toast.error("Failed to allocate surplus");
    }
  };

  return (
    <div className="flex w-full flex-col gap-3 px-3 pb-8 pt-4 md:px-4 md:pb-6 md:gap-4">
      {/* Header */}
      <header className="space-y-1">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-secondary">Zero-Based Budget Manager</h1>
              <HelpTooltip
                title="Zero-Based Budget Manager"
                content={[
                  "Configure your budget allocations and manage income distribution across envelopes. Adjust target amounts, set frequencies, and allocate funding from each income source."
                ]}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Manage your budget with real-time balance tracking
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/envelope-summary">View Envelope Summary</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Consolidated Budget Summary */}
      <Card>
        <CardContent className="py-2 px-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            {/* Left: Status + Stats */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Budget Status */}
              {budgetValidation.isBalanced && (
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs py-0">
                    Balanced
                  </Badge>
                </div>
              )}
              {budgetValidation.hasSurplus && (
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs py-0">
                    Surplus: ${budgetValidation.difference.toFixed(2)}
                  </Badge>
                </div>
              )}
              {budgetValidation.isOverspent && (
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs py-0">
                    Overspent: ${Math.abs(budgetValidation.difference).toFixed(2)}
                  </Badge>
                </div>
              )}

              {/* Divider */}
              <span className="text-muted-foreground/30">|</span>

              {/* Quick Stats */}
              <span className="text-xs text-muted-foreground">{unifiedEnvelopes.length} envelopes</span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Link href="/settings" className="text-primary hover:underline inline-flex items-center gap-0.5">
                  {payCycle}
                  <Settings className="h-3 w-3" />
                </Link>
              </span>
            </div>

            {/* Right: Allocate Surplus Button */}
            {budgetValidation.hasSurplus && !demoMode && (
              <Button
                size="sm"
                onClick={() => setShowSurplusDialog(true)}
                className="bg-emerald-600 hover:bg-emerald-700 h-7 text-xs"
              >
                <TrendingUp className="h-3.5 w-3.5 mr-1" />
                Allocate Surplus
              </Button>
            )}
          </div>

          {/* Per-Income-Source Breakdown */}
          {incomeSources.length > 0 && (
            <div className="flex flex-wrap gap-4 mt-2 pt-2 border-t border-border/50">
              {incomeSources.map((source) => {
                // Calculate allocated for this specific source
                const allocated = unifiedEnvelopes.reduce((sum, env) => {
                  return sum + (env.incomeAllocations?.[source.id] || 0);
                }, 0);
                const remaining = source.amount - allocated;
                const freqLabel = getFrequencyShortLabel(source.frequency);
                // Format next pay date if available
                const nextPayFormatted = source.nextPayDate
                  ? new Date(source.nextPayDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
                  : null;
                return (
                  <div key={source.id} className="group flex items-center gap-2 text-xs">
                    <span className="font-medium text-muted-foreground">
                      {source.name} ({freqLabel}):
                    </span>
                    <span className="text-green-600">${source.amount.toFixed(0)}</span>
                    <span className="text-muted-foreground">−</span>
                    <span className="text-blue-600">${allocated.toFixed(0)}</span>
                    <span className="text-muted-foreground">=</span>
                    <span className={`font-semibold ${remaining >= 0 ? "text-green-600" : "text-red-600"}`}>
                      ${remaining.toFixed(0)}
                    </span>
                    {nextPayFormatted && (
                      <>
                        <span className="text-muted-foreground/50">|</span>
                        <span className="text-muted-foreground">Next: {nextPayFormatted}</span>
                      </>
                    )}
                    {/* Inline edit/delete icons - visible on hover */}
                    {!demoMode && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedIncomeSource(source);
                            setIncomeDialogMode('edit');
                            setShowIncomeDialog(true);
                          }}
                          className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                          title="Edit income source"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteIncomeSource(source.id, source.name)}
                          className="p-0.5 rounded hover:bg-red-100 text-muted-foreground hover:text-red-600"
                          title="Delete income source"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              {/* Add Income Source button */}
              {!demoMode && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedIncomeSource(undefined);
                    setIncomeDialogMode('add');
                    setShowIncomeDialog(true);
                  }}
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Income
                </button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Full-width Credit Card Widget */}
      {!demoMode && <CreditCardHoldingWidget horizontal />}

      {/* Ideal Allocation Suggestions Banner - Temporarily disabled for debugging */}
      {/* <IdealAllocationBanner userId={userId} demoMode={demoMode} /> */}

      {/* Filter Buttons + Category Controls */}
      {!demoMode && !isLoading && unifiedEnvelopes.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 md:gap-3">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={() => setStatusFilter(filter.key)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition",
                  statusFilter === filter.key
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-muted text-muted-foreground hover:border-primary/40",
                )}
              >
                {filter.label}
                <span className="ml-1 text-[10px] opacity-80">({statusCounts[filter.key]})</span>
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setCollapseAll(false)}>
              Expand All
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCollapseAll(true)}>
              Collapse All
            </Button>
          </div>
        </div>
      )}

      {/* Envelope Categories */}
      {demoMode ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Demo mode: Sign in to view your budget data.
          </CardContent>
        </Card>
      ) : isLoading ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Loading envelopes...
          </CardContent>
        </Card>
      ) : unifiedEnvelopes.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No envelopes created yet. Create your first envelope to get started.
          </CardContent>
        </Card>
      ) : filteredEnvelopes.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No envelopes match the "{FILTERS.find(f => f.key === statusFilter)?.label}" filter.
            Try widening your filter or select "All".
          </CardContent>
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="space-y-3">
            {/* Single sticky header for all category tables */}
            <BudgetTableStickyHeader
              showCategories={false}
              showIncomeColumns={true}
              showOpeningBalance={true}
              showCurrentBalance={true}
              showNotes={true}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
              enableDragAndDrop={isDragEnabled}
            />
            {groupedCategories.map((category) => (
              <BudgetCategoryGroup
                key={category.id}
                category={category}
                allCategories={safeCategories}
                incomeSources={incomeSources}
                payCycle={payCycle}
                gapAnalysisData={safeGapData}
                collapsedAll={collapseAll}
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                enableDragAndDrop={isDragEnabled}
                isDragDisabled={!isDragEnabled}
                onEnvelopeUpdate={handleEnvelopeUpdate}
                onEnvelopeDelete={handleEnvelopeDelete}
                onAllocationUpdate={handleAllocationUpdate}
              />
            ))}
          </div>
        </DndContext>
      )}

      {/* Grand Total Summary */}
      <Card className="bg-slate-100">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold">
              Net Difference (Income - Allocations)
            </div>
            <div className="flex items-center gap-4">
              <div
                className={`text-2xl font-bold ${
                  difference >= 0 ? "text-green-700" : "text-red-700"
                }`}
              >
                ${difference.toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground">
                per {payCycle === "fortnightly" ? "fortnight" : payCycle}
              </div>
              <div
                className={`text-sm ${
                  difference >= 0 ? "text-green-700" : "text-red-700"
                }`}
              >
                $
                {(
                  difference *
                  (payCycle === "weekly"
                    ? 52
                    : payCycle === "fortnightly"
                    ? 26
                    : 12)
                ).toFixed(2)}{" "}
                annual
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Allocate Surplus Dialog */}
      <AllocateSurplusDialog
        open={showSurplusDialog}
        onOpenChange={setShowSurplusDialog}
        surplusAmount={budgetValidation.difference}
        incomeSources={unallocatedBySource}
        onConfirm={handleAllocateSurplus}
      />

      {/* Pay Cycle Change Dialog */}
      {pendingPayCycle && (
        <PayCycleChangeDialog
          open={showPayCycleDialog}
          onOpenChange={setShowPayCycleDialog}
          currentPayCycle={payCycle}
          newPayCycle={pendingPayCycle}
          envelopeCount={unifiedEnvelopes.length}
          totalAllocated={totalAllocated}
          onConfirm={confirmPayCycleChange}
        />
      )}

      {/* Income Source Dialog */}
      <IncomeSourceDialog
        open={showIncomeDialog}
        onOpenChange={setShowIncomeDialog}
        mode={incomeDialogMode}
        incomeSource={selectedIncomeSource}
        onSuccess={handleIncomeSourceSuccess}
      />
    </div>
  );
}
