"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Save, Wand2, RotateCcw, Clock, ChevronDown, ChevronRight, Trash2, StickyNote, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RemyHelpPanel } from "@/components/coaching/RemyHelpPanel";
import { RemyTip } from "@/components/onboarding/remy-tip";
import { IncomeProgressCard } from "@/components/allocation/income-progress-card";
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

type PriorityLevel = 'essential' | 'important' | 'discretionary';

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
  { value: 'weekly', label: 'Weekly', multiplier: 52 },
  { value: 'fortnightly', label: 'Fortnightly', multiplier: 26 },
  { value: 'monthly', label: 'Monthly', multiplier: 12 },
  { value: 'quarterly', label: 'Quarterly', multiplier: 4 },
  { value: 'annually', label: 'Annually', multiplier: 1 },
];

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
  const [hasChanges, setHasChanges] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Record<PriorityLevel, boolean>>({
    essential: true,
    important: true,
    discretionary: true,
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [highlightedEnvelopeId, setHighlightedEnvelopeId] = useState<string | null>(null);

  // Check for openCreateEnvelope query param
  useEffect(() => {
    if (searchParams.get("openCreateEnvelope") === "true") {
      setCreateOpen(true);
      // Clean up the URL without the query param
      router.replace("/allocation", { scroll: false });
    }
  }, [searchParams, router]);

  // Handle highlight query param for newly created envelopes
  useEffect(() => {
    const highlightId = searchParams.get("highlight");
    if (highlightId && highlightId !== "new") {
      setHighlightedEnvelopeId(highlightId);
      // Clean up the URL
      router.replace("/allocation", { scroll: false });

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
          // Suggested envelope fields
          is_suggested: env.is_suggested,
          suggestion_type: env.suggestion_type,
          is_dismissed: env.is_dismissed,
          auto_calculate_target: env.auto_calculate_target,
          description: env.description,
          snoozed_until: env.snoozed_until,
        }));
        setEnvelopes(transformed);

        const origAllocs: Record<string, Record<string, number>> = {};
        transformed.forEach(env => {
          origAllocs[env.id] = { ...(allocationsData[env.id] || {}) };
        });
        setOriginalAllocations(origAllocs);

        if (Object.keys(allocationsData).length > 0) {
          setLastUpdated(new Date());
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
    setHasChanges(true);
  }, [envelopes, incomeSources, calculatePerPay]);

  /**
   * Handle envelope field changes (inline editing)
   */
  const handleEnvelopeChange = useCallback((envelopeId: string, field: keyof UnifiedEnvelopeData, value: any) => {
    setEnvelopes(prev => prev.map(env => {
      if (env.id !== envelopeId) return env;
      return { ...env, [field]: value };
    }));
    setHasChanges(true);
  }, []);

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
   * Save all changes (envelopes + allocations)
   */
  const handleSave = async (skipValidation = false) => {
    if (!skipValidation) {
      const warnings = validateBeforeSave();
      if (warnings.length > 0) {
        setValidationWarnings(warnings);
        setShowValidationDialog(true);
        return;
      }
    }

    setIsSaving(true);
    try {
      const savePromises = envelopes.map(async (env) => {
        // Save envelope details
        await fetch(`/api/envelopes/${env.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: env.name,
            icon: env.icon,
            subtype: env.subtype,
            target_amount: env.targetAmount,
            frequency: env.frequency,
            due_date: env.dueDate,
            priority: env.priority,
            notes: env.notes,
          }),
        });

        // Save allocations
        const allocations = Object.entries(env.incomeAllocations || {}).map(([incomeId, amount]) => ({
          income_source_id: incomeId,
          allocation_amount: amount,
        }));

        await fetch(`/api/envelope-income-allocations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ envelope_id: env.id, allocations }),
        });
      });

      await Promise.all(savePromises);
      setHasChanges(false);
      setLastUpdated(new Date());

      const newOriginals: Record<string, Record<string, number>> = {};
      envelopes.forEach(env => {
        newOriginals[env.id] = { ...(env.incomeAllocations || {}) };
      });
      setOriginalAllocations(newOriginals);
    } catch (error) {
      console.error("Error saving:", error);
    } finally {
      setIsSaving(false);
    }
  };

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
    setHasChanges(true);
  }, [envelopes, incomeSources, calculatePerPay]);

  /**
   * Reset allocations to original values
   */
  const handleReset = useCallback(() => {
    setEnvelopes(prev => prev.map(env => ({
      ...env,
      incomeAllocations: { ...(originalAllocations[env.id] || {}) },
    })));
    setHasChanges(false);
  }, [originalAllocations]);

  const toggleGroup = (priority: PriorityLevel) => {
    setExpandedGroups(prev => ({ ...prev, [priority]: !prev[priority] }));
  };

  /**
   * Render priority group with table
   */
  const renderPriorityGroup = (priority: PriorityLevel) => {
    const group = envelopesByPriority[priority];
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
            <table className="w-full">
              <thead className="bg-silver-very-light border-b border-silver-light">
                <tr>
                  <th className="px-3 py-1.5 text-left text-[11px] font-semibold text-text-medium uppercase tracking-wide" style={{ width: '20%' }}>Envelope</th>
                  <th className="px-3 py-1.5 text-left text-[11px] font-semibold text-text-medium uppercase tracking-wide" style={{ width: '7%' }}>Type</th>
                  <th className="px-3 py-1.5 text-right text-[11px] font-semibold text-text-medium uppercase tracking-wide" style={{ width: '9%' }}>Amount</th>
                  <th className="px-3 py-1.5 text-left text-[11px] font-semibold text-text-medium uppercase tracking-wide" style={{ width: '9%' }}>Frequency</th>
                  <th className="px-3 py-1.5 text-left text-[11px] font-semibold text-text-medium uppercase tracking-wide" style={{ width: '9%' }}>Due Date</th>
                  <th className="px-3 py-1.5 text-center text-[11px] font-semibold text-text-medium uppercase tracking-wide" style={{ width: '7%' }}>Due In</th>
                  <th className="px-3 py-1.5 text-right text-[11px] font-semibold text-text-medium uppercase tracking-wide" style={{ width: '8%' }}>Annual</th>
                  <th className="px-3 py-1.5 text-left text-[11px] font-semibold text-text-medium uppercase tracking-wide" style={{ width: '10%' }}>Funded By</th>
                  <th className="px-3 py-1.5 text-right text-[11px] font-semibold text-text-medium uppercase tracking-wide" style={{ width: '9%' }}>Per Pay</th>
                  <th className="px-3 py-1.5 text-center text-[11px] font-semibold text-text-medium uppercase tracking-wide" style={{ width: '5%' }}>✓</th>
                  <th className="px-3 py-1.5 text-[11px] font-semibold text-text-medium uppercase tracking-wide" style={{ width: '7%' }}></th>
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
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/envelope-summary">
            <Button variant="ghost" size="sm" className="gap-1 text-text-medium">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-text-dark">Budget Allocation</h1>
            {lastUpdated && (
              <p className="text-xs text-text-light flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Last saved: {lastUpdated.toLocaleDateString()} {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <RemyHelpPanel pageId="allocation" />
          <Button
            size="sm"
            onClick={() => setCreateOpen(true)}
            className="bg-sage hover:bg-sage-dark text-white gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Add Envelope
          </Button>
          <Button variant="outline" size="sm" onClick={handleAutoCalculate} disabled={isLoading || incomeSources.length === 0}>
            <Wand2 className="h-4 w-4 mr-1" />
            Suggest
          </Button>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
          <Button size="sm" onClick={() => handleSave()} disabled={!hasChanges || isSaving}>
            <Save className="h-4 w-4 mr-1" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* Remy Welcome */}
      <RemyTip pose="welcome" className="mb-6">
        Welcome to your budget! This is where the magic happens.
      </RemyTip>

      {/* Income Buckets */}
      <div className="grid grid-cols-2 gap-4 mb-6">
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

      {/* No income sources warning */}
      {incomeSources.length === 0 && (
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

      {/* Priority Groups */}
      {renderPriorityGroup('essential')}
      {renderPriorityGroup('important')}
      {renderPriorityGroup('discretionary')}

      {/* Summary Footer */}
      <div className="flex items-center justify-between mt-6 pt-5 border-t border-silver-light">
        <div className="flex items-center gap-3 text-sm text-text-medium">
          <span className="flex items-center gap-1 text-sage">● Auto-saved</span>
          <span>Last saved: Just now</span>
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

      {/* Validation Warning Dialog */}
      <AlertDialog open={showValidationDialog} onOpenChange={setShowValidationDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-gold">
              Review Before Saving
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>The following issues were found:</p>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  {validationWarnings.map((warning, i) => (
                    <li key={i} className="text-[#8B7035]">{warning}</li>
                  ))}
                </ul>
                <p className="text-sm">Do you want to save anyway?</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go Back</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowValidationDialog(false);
                handleSave(true);
              }}
              className="bg-gold hover:bg-gold/90 text-white"
            >
              Save Anyway
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
    </div>
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

  return (
    <tr ref={rowRef} className={rowClass}>
      {/* Envelope Name */}
      <td className="px-3 py-1.5">
        <div className="flex items-center gap-2">
          <div className={cn("w-6 h-6 rounded-md flex items-center justify-center text-sm flex-shrink-0", iconBg)}>
            {envelope.icon}
          </div>
          <div className="flex flex-col">
            <input
              type="text"
              value={envelope.name}
              onChange={(e) => onEnvelopeChange(envelope.id, 'name', e.target.value)}
              className={cn(inputClass, "font-medium text-text-dark")}
              readOnly={envelope.is_suggested}
            />
            {envelope.description && (
              <span className="text-[10px] text-text-medium leading-tight ml-2 max-w-[200px]">
                {envelope.description}
              </span>
            )}
          </div>
        </div>
      </td>

      {/* Type */}
      <td className="px-3 py-1.5">
        <select
          value={envelope.subtype}
          onChange={(e) => onEnvelopeChange(envelope.id, 'subtype', e.target.value)}
          className={cn(selectClass, "text-text-medium")}
        >
          {SUBTYPE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </td>

      {/* Amount (Target) */}
      <td className="px-3 py-1.5">
        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[13px] text-text-light">$</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={envelope.targetAmount || ''}
            onChange={(e) => onEnvelopeChange(envelope.id, 'targetAmount', parseFloat(e.target.value) || 0)}
            className={cn(inputClass, "text-right pl-5 text-text-dark")}
            placeholder="0.00"
          />
        </div>
      </td>

      {/* Frequency */}
      <td className="px-3 py-1.5">
        <select
          value={envelope.frequency || 'monthly'}
          onChange={(e) => onEnvelopeChange(envelope.id, 'frequency', e.target.value)}
          className={cn(selectClass, "text-text-medium")}
        >
          {FREQUENCY_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </td>

      {/* Due Date */}
      <td className="px-3 py-1.5">
        <input
          type="date"
          value={formatDueDateForInput()}
          onChange={(e) => onEnvelopeChange(envelope.id, 'dueDate', e.target.value || null)}
          className={cn(inputClass, "text-text-medium")}
        />
      </td>

      {/* Due In - Pays until due */}
      <td className="px-3 py-1.5 text-center">
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
          <PaysUntilDuePlaceholder />
        )}
      </td>

      {/* Annual (Calculated - Read Only) */}
      <td className="px-3 py-1.5 text-right">
        <span className="text-[12px] text-text-medium font-medium">
          ${annual.toLocaleString('en-AU', { maximumFractionDigits: 0 })}
        </span>
      </td>

      {/* Funded By */}
      <td className="px-3 py-1.5">
        <select
          value={fundedBy || ''}
          onChange={(e) => onFundedByChange(envelope.id, e.target.value)}
          className={cn(
            "px-2 py-0.5 rounded text-xs font-medium border-0 cursor-pointer",
            fundedByClass || "bg-silver-very-light text-text-medium"
          )}
        >
          <option value="">Select...</option>
          <option value="primary">Primary</option>
          {incomeSources.length > 1 && <option value="secondary">Secondary</option>}
          {incomeSources.length > 1 && <option value="split">Split...</option>}
        </select>
      </td>

      {/* Per Pay (Calculated - Read Only) */}
      <td className="px-3 py-1.5 text-right">
        <span className="text-[13px] font-semibold" style={{ color: '#7A9E9A' }}>${perPay.toFixed(2)}</span>
        <span className="text-[10px] text-text-light ml-0.5">{getPerPayFreq()}</span>
      </td>

      {/* Status (Calculated - Read Only) */}
      <td className="px-3 py-1.5 text-center">
        {perPay === 0 ? (
          <span className="text-text-light">—</span>
        ) : isFullyFunded ? (
          <span className="text-sm font-bold" style={{ color: '#7A9E9A' }}>✓</span>
        ) : (
          <span className="text-gold text-sm">○</span>
        )}
      </td>

      {/* Actions */}
      <td className="px-3 py-1.5">
        {envelope.is_suggested ? (
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-[10px] text-text-light italic">
              Manage in Envelope Summary
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              className={cn(
                "p-1 rounded hover:bg-silver-very-light",
                envelope.notes ? "text-sage" : "text-text-light"
              )}
              title={envelope.notes || "Add note"}
            >
              <StickyNote className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              className="p-1 rounded text-text-light hover:bg-blue-light hover:text-blue"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}
