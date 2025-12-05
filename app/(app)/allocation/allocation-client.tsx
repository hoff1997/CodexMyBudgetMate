"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Save, Wand2, Printer, AlertTriangle, RotateCcw, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IncomeProgressCard } from "@/components/allocation/income-progress-card";
import { IncomeAllocationTab } from "@/components/allocation/income-allocation-tab";
import { calculateIdealAllocation, type PayCycle } from "@/lib/utils/ideal-allocation-calculator";
import type { UnifiedEnvelopeData, IncomeSource } from "@/lib/types/unified-envelope";
import { cn } from "@/lib/cn";
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

/**
 * AllocationClient - Waterfall Budget Allocation Page
 *
 * Each income source gets its own tab showing what it funds:
 * - Income 1 (Primary): Pays essentials first, then whatever else it can afford
 * - Income 2 (Secondary): Picks up remaining items
 * - Income 3+: Additional income sources fill remaining gaps
 *
 * Envelopes are still grouped by priority (Essential → Important → Discretionary)
 */
export function AllocationClient() {
  const [envelopes, setEnvelopes] = useState<UnifiedEnvelopeData[]>([]);
  const [originalAllocations, setOriginalAllocations] = useState<Record<string, Record<string, number>>>({});
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [payCycle, setPayCycle] = useState<PayCycle>("fortnightly");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const printRef = useRef<HTMLDivElement>(null);

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, []);

  // Set active tab to first income source when loaded
  useEffect(() => {
    if (incomeSources.length > 0 && !activeTab) {
      setActiveTab(incomeSources[0].id);
    }
  }, [incomeSources, activeTab]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [envelopesRes, incomeRes, userRes, allocationsRes] = await Promise.all([
        fetch("/api/envelopes"),
        fetch("/api/income-sources"),
        fetch("/api/user-preferences"),
        fetch("/api/envelope-income-allocations"),
      ]);

      // Fetch allocations data first
      let allocationsData: Record<string, Record<string, number>> = {};
      if (allocationsRes.ok) {
        allocationsData = await allocationsRes.json();
      }

      if (envelopesRes.ok) {
        const data = await envelopesRes.json();
        // Transform API data to UnifiedEnvelopeData format
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
        }));
        setEnvelopes(transformed);

        // Store original allocations for change tracking
        const origAllocs: Record<string, Record<string, number>> = {};
        transformed.forEach(env => {
          origAllocs[env.id] = { ...(allocationsData[env.id] || {}) };
        });
        setOriginalAllocations(origAllocs);

        // Set last updated if we have any allocations
        if (Object.keys(allocationsData).length > 0) {
          setLastUpdated(new Date()); // Will be replaced with actual timestamp from DB later
        }
      }

      if (incomeRes.ok) {
        const data = await incomeRes.json();
        // Transform to IncomeSource format - no limit, show all active sources
        const sources: IncomeSource[] = data.map((src: any) => ({
          id: src.id,
          name: src.name,
          amount: src.typical_amount || 0,
          frequency: src.pay_cycle || "fortnightly",
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
   * Calculate per-pay amount using the existing ideal allocation calculator
   */
  const calculatePerPay = useCallback((envelope: UnifiedEnvelopeData): number => {
    // Only calculate for bills with target amounts
    if (!envelope.targetAmount || envelope.subtype === 'tracking') {
      return 0;
    }

    return calculateIdealAllocation(
      {
        target_amount: envelope.targetAmount,
        frequency: (envelope.frequency as any) || "monthly",
      },
      payCycle
    );
  }, [payCycle]);

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
   * Get ALL envelopes (not just allocated ones) grouped by priority
   * Any income can fund any envelope - users decide which income funds what
   * Sorted by priority: Essential → Important → Discretionary
   */
  const getEnvelopesForIncome = useCallback((incomeId: string) => {
    const priorityOrder = { essential: 0, important: 1, discretionary: 2 };

    // Include ALL non-tracking envelopes (user can allocate any envelope from any income)
    const eligibleEnvelopes = envelopes.filter(e => !e.is_tracking_only);

    // Sort by priority
    const sorted = [...eligibleEnvelopes].sort((a, b) => {
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 3;
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 3;
      return aPriority - bPriority;
    });

    // Group by priority
    return {
      essential: sorted.filter(e => e.priority === 'essential'),
      important: sorted.filter(e => e.priority === 'important'),
      discretionary: sorted.filter(e => e.priority === 'discretionary'),
    };
  }, [envelopes]);

  /**
   * Get unfunded envelopes (across all incomes)
   */
  const unfundedEnvelopes = useMemo(() => {
    const priorityOrder = { essential: 0, important: 1, discretionary: 2 };

    const unfunded = envelopes.filter(e => {
      if (e.is_tracking_only) return false;
      const perPay = calculatePerPay(e);
      if (perPay === 0) return false;
      const total = Object.values(e.incomeAllocations || {}).reduce((sum, amt) => sum + amt, 0);
      return total < perPay - 0.01;
    });

    // Sort by priority (essential first)
    return [...unfunded].sort((a, b) => {
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 3;
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 3;
      return aPriority - bPriority;
    });
  }, [envelopes, calculatePerPay]);

  /**
   * Handle allocation change
   */
  const handleAllocationChange = useCallback((envelopeId: string, incomeSourceId: string, amount: number) => {
    setEnvelopes(prev => prev.map(env => {
      if (env.id !== envelopeId) return env;
      return {
        ...env,
        incomeAllocations: {
          ...env.incomeAllocations,
          [incomeSourceId]: amount,
        },
      };
    }));
    setHasChanges(true);
  }, []);

  /**
   * Validate allocations before saving
   */
  const validateBeforeSave = useCallback((): string[] => {
    const warnings: string[] = [];

    // Check for unfunded essential envelopes
    const unfundedEssentials = envelopes.filter(e => {
      if (e.is_tracking_only || e.priority !== 'essential') return false;
      const perPay = calculatePerPay(e);
      if (perPay === 0) return false;
      const total = Object.values(e.incomeAllocations || {}).reduce((sum, amt) => sum + amt, 0);
      return total < perPay - 0.01;
    });

    if (unfundedEssentials.length > 0) {
      warnings.push(`${unfundedEssentials.length} essential envelope(s) are not fully funded: ${unfundedEssentials.map(e => e.name).join(', ')}`);
    }

    // Check for over-allocated income sources
    incomeAllocations.forEach((income, index) => {
      if (income.allocated > income.amount) {
        const label = index === 0 ? 'Primary' : index === 1 ? 'Secondary' : `Income ${index + 1}`;
        warnings.push(`${label} income is over-allocated by $${(income.allocated - income.amount).toFixed(2)}`);
      }
    });

    // Check for surplus income that could fund unfunded envelopes
    const totalSurplus = incomeSources.reduce((sum, s) => sum + s.amount, 0) -
                         incomeAllocations.reduce((sum, s) => sum + s.allocated, 0);
    const totalUnfundedAmount = unfundedEnvelopes.reduce((sum, e) => {
      const perPay = calculatePerPay(e);
      const allocated = Object.values(e.incomeAllocations || {}).reduce((s, a) => s + a, 0);
      return sum + (perPay - allocated);
    }, 0);

    if (totalSurplus > 10 && totalUnfundedAmount > 0) {
      warnings.push(`You have $${totalSurplus.toFixed(2)} surplus that could fund unfunded envelopes`);
    }

    return warnings;
  }, [envelopes, incomeSources, incomeAllocations, unfundedEnvelopes, calculatePerPay]);

  /**
   * Save all changes (with optional validation bypass)
   */
  const handleSave = async (skipValidation = false) => {
    // Run validation first
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
      // Save each envelope's allocations
      const savePromises = envelopes.map(async (env) => {
        const allocations = Object.entries(env.incomeAllocations || {}).map(([incomeId, amount]) => ({
          income_source_id: incomeId,
          allocation_amount: amount,
        }));

        // Save even if empty (to clear allocations)
        await fetch(`/api/envelope-income-allocations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            envelope_id: env.id,
            allocations,
          }),
        });
      });

      await Promise.all(savePromises);
      setHasChanges(false);
      setLastUpdated(new Date());

      // Update original allocations to match current
      const newOriginals: Record<string, Record<string, number>> = {};
      envelopes.forEach(env => {
        newOriginals[env.id] = { ...(env.incomeAllocations || {}) };
      });
      setOriginalAllocations(newOriginals);
    } catch (error) {
      console.error("Error saving allocations:", error);
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Auto-calculate waterfall allocations
   * Fills income sources in order: Primary fills essentials first, then important, then discretionary
   * Secondary picks up remaining, then tertiary, etc.
   */
  const handleAutoCalculate = useCallback(() => {
    const priorityOrder = ['essential', 'important', 'discretionary'];

    // Sort envelopes by priority
    const sortedEnvelopes = [...envelopes]
      .filter(e => !e.is_tracking_only)
      .sort((a, b) => {
        const aPriority = priorityOrder.indexOf(a.priority || 'discretionary');
        const bPriority = priorityOrder.indexOf(b.priority || 'discretionary');
        return aPriority - bPriority;
      });

    // Track remaining budget per income source
    const remainingBudget = incomeSources.map(s => s.amount);

    // New allocations for each envelope
    const newAllocations: Record<string, Record<string, number>> = {};

    sortedEnvelopes.forEach(env => {
      const perPay = calculatePerPay(env);
      if (perPay <= 0) {
        newAllocations[env.id] = {};
        return;
      }

      let remaining = perPay;
      const envAllocations: Record<string, number> = {};

      // Try to allocate from each income source in order
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

    // Update envelopes with new allocations
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

  /**
   * Print/Export functionality
   */
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  /**
   * Calculate changes from original
   */
  const changedEnvelopes = useMemo(() => {
    return envelopes.filter(env => {
      const original = originalAllocations[env.id] || {};
      const current = env.incomeAllocations || {};

      // Check if any allocation changed
      const allIncomeIds = new Set([...Object.keys(original), ...Object.keys(current)]);
      for (const incomeId of allIncomeIds) {
        const origAmt = original[incomeId] || 0;
        const currAmt = current[incomeId] || 0;
        if (Math.abs(origAmt - currAmt) > 0.01) return true;
      }
      return false;
    });
  }, [envelopes, originalAllocations]);

  // Calculate summary stats
  const totalIncome = incomeSources.reduce((sum, s) => sum + s.amount, 0);
  const totalAllocated = incomeAllocations.reduce((sum, s) => sum + s.allocated, 0);
  const totalSurplus = totalIncome - totalAllocated;
  const totalUnfunded = unfundedEnvelopes.reduce((sum, e) => {
    const perPay = calculatePerPay(e);
    const allocated = Object.values(e.incomeAllocations || {}).reduce((s, a) => s + a, 0);
    return sum + (perPay - allocated);
  }, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/envelope-summary">
            <Button variant="ghost" size="sm" className="gap-1">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">Budget Allocation</h1>
            {lastUpdated && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Last saved: {lastUpdated.toLocaleDateString()} {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAutoCalculate}
            disabled={isLoading || incomeSources.length === 0}
            title="Auto-fill allocations using waterfall method"
          >
            <Wand2 className="h-4 w-4 mr-1" />
            Suggest
          </Button>
          {hasChanges && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              title="Reset to last saved"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            title="Print allocation summary"
          >
            <Printer className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            size="sm"
            onClick={() => handleSave()}
            disabled={!hasChanges || isSaving}
          >
            <Save className="h-4 w-4 mr-1" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* Print Header (only visible when printing) */}
      <div className="hidden print:block mb-4">
        <h1 className="text-2xl font-bold">Budget Allocation Summary</h1>
        <p className="text-sm text-muted-foreground">
          Generated: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
        </p>
      </div>

      {/* Changes Summary Banner */}
      {hasChanges && changedEnvelopes.length > 0 && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 print:hidden">
          <div className="flex items-center gap-2 text-blue-800">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">
              {changedEnvelopes.length} envelope{changedEnvelopes.length !== 1 ? 's' : ''} modified since last save
            </span>
          </div>
          <p className="text-xs text-blue-600 mt-1">
            Changed: {changedEnvelopes.slice(0, 5).map(e => e.name).join(', ')}
            {changedEnvelopes.length > 5 && ` and ${changedEnvelopes.length - 5} more...`}
          </p>
        </div>
      )}

      {/* Income Progress Cards - All in a row */}
      <div className={cn(
        "grid gap-3",
        incomeSources.length === 1 && "grid-cols-1",
        incomeSources.length === 2 && "md:grid-cols-2",
        incomeSources.length >= 3 && "md:grid-cols-3",
      )}>
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
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-center">
          <p className="text-sm text-amber-800">
            No income sources configured.{" "}
            <Link href="/recurring-income" className="underline font-medium">
              Add income sources
            </Link>{" "}
            to start allocating your budget.
          </p>
        </div>
      )}

      {/* Income Tabs */}
      {incomeSources.length > 0 && (
        <div className="space-y-3">
          {/* Tab Headers */}
          <div className="flex border-b">
            {incomeSources.map((income, index) => {
              const isActive = activeTab === income.id;
              const incomeData = incomeAllocations.find(i => i.id === income.id);
              const label = index === 0 ? "Primary" : index === 1 ? "Secondary" : `Income ${index + 1}`;

              return (
                <button
                  key={income.id}
                  onClick={() => setActiveTab(income.id)}
                  className={cn(
                    "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                    isActive
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                  )}
                >
                  <span className="block">{label}: {income.name}</span>
                  <span className="block text-xs">
                    ${incomeData?.allocated.toFixed(0) || 0} / ${income.amount.toFixed(0)}
                  </span>
                </button>
              );
            })}
            {/* Unfunded Tab */}
            <button
              onClick={() => setActiveTab("unfunded")}
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                activeTab === "unfunded"
                  ? "border-orange-500 text-orange-600"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              <span className="block">⚠️ Unfunded</span>
              <span className="block text-xs">
                {unfundedEnvelopes.length} items (-${totalUnfunded.toFixed(0)})
              </span>
            </button>
          </div>

          {/* Tab Content */}
          {activeTab && activeTab !== "unfunded" && (
            <IncomeAllocationTab
              incomeSource={incomeSources.find(i => i.id === activeTab)!}
              envelopes={envelopes}
              envelopesByPriority={getEnvelopesForIncome(activeTab)}
              payCycle={payCycle}
              calculatePerPay={calculatePerPay}
              onAllocationChange={handleAllocationChange}
            />
          )}

          {/* Unfunded Tab Content */}
          {activeTab === "unfunded" && (
            <IncomeAllocationTab
              incomeSource={null}
              envelopes={envelopes}
              envelopesByPriority={{
                essential: unfundedEnvelopes.filter(e => e.priority === 'essential'),
                important: unfundedEnvelopes.filter(e => e.priority === 'important'),
                discretionary: unfundedEnvelopes.filter(e => e.priority === 'discretionary'),
              }}
              payCycle={payCycle}
              calculatePerPay={calculatePerPay}
              onAllocationChange={handleAllocationChange}
              isUnfundedView
              incomeSources={incomeSources}
            />
          )}
        </div>
      )}

      {/* Summary Card */}
      <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
        <h3 className="font-semibold text-sm">SUMMARY</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Total Income:</span>
            <p className="font-semibold">
              ${totalIncome.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="text-xs text-muted-foreground font-normal">/{payCycle}</span>
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Total Allocated:</span>
            <p className="font-semibold">
              ${totalAllocated.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Total Surplus:</span>
            <p className={`font-semibold ${totalSurplus < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              ${totalSurplus.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Unfunded:</span>
            <p className={`font-semibold ${totalUnfunded > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
              ${totalUnfunded.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* Validation Warning Dialog */}
      <AlertDialog open={showValidationDialog} onOpenChange={setShowValidationDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Review Before Saving
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>The following issues were found with your allocations:</p>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  {validationWarnings.map((warning, i) => (
                    <li key={i} className="text-amber-700">{warning}</li>
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
              className="bg-amber-600 hover:bg-amber-700"
            >
              Save Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
