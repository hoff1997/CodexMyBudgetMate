"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calculator, Sparkles, X, Plus, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BudgetManagerClient } from "@/app/(app)/budget-manager/budget-manager-client";
import { AddEnvelopeDialog } from "@/components/onboarding/add-envelope-dialog";
import type { EnvelopeData, IncomeSource as OnboardingIncomeSource } from "@/app/(app)/onboarding/unified-onboarding-client";
import type { UnifiedEnvelopeData, FrequencyType, IncomeSource as UnifiedIncomeSource } from "@/lib/types/unified-envelope";
import { normalizeToUserPayCycle } from "@/lib/utils/ideal-allocation-calculator";

/**
 * Map onboarding frequency to UnifiedEnvelopeData frequency
 */
function mapFrequency(freq: EnvelopeData["frequency"]): FrequencyType {
  if (!freq) return "monthly";
  if (freq === "custom") return "monthly"; // Default custom to monthly
  if (freq === "annual") return "annually"; // Map annual to annually
  return freq;
}

interface BudgetManagerStepProps {
  envelopes: EnvelopeData[];
  onEnvelopesChange: (envelopes: EnvelopeData[]) => void;
  incomeSources: OnboardingIncomeSource[];
  envelopeAllocations?: { [envelopeId: string]: { [incomeId: string]: number } };
  onEnvelopeAllocationsChange?: (allocations: { [envelopeId: string]: { [incomeId: string]: number } }) => void;
}

/**
 * Convert onboarding EnvelopeData to UnifiedEnvelopeData for the Budget Manager
 */
function convertToUnifiedEnvelopes(
  envelopes: EnvelopeData[],
  incomeSources: Array<{ id: string; amount: number }>,
  existingAllocations?: { [envelopeId: string]: { [incomeId: string]: number } }
): UnifiedEnvelopeData[] {
  return envelopes.map((env) => {
    // Use existing allocations if available
    let incomeAllocations: { [incomeSourceId: string]: number } = {};

    if (existingAllocations && existingAllocations[env.id]) {
      // Use saved allocations
      incomeAllocations = { ...existingAllocations[env.id] };
    } else if (incomeSources.length >= 1) {
      // Default to primary (first) income source
      // Initialize all sources to 0, then set primary source to the envelope's pay cycle amount
      incomeSources.forEach((inc, index) => {
        if (index === 0) {
          // Primary income source gets the allocation
          incomeAllocations[inc.id] = env.payCycleAmount || 0;
        } else {
          incomeAllocations[inc.id] = 0;
        }
      });
    }

    // Check if this is the Credit Card Holding envelope - lock it during onboarding
    const isCreditCardHolding = env.id === 'credit-card-holding';

    return {
      id: env.id,
      name: env.name,
      icon: env.icon || "📊",
      subtype: env.type === "bill" ? "bill" : env.type === "savings" ? "savings" : "spending",
      targetAmount: env.billAmount || env.monthlyBudget || env.savingsAmount || 0,
      frequency: mapFrequency(env.frequency),
      dueDate: env.dueDate,
      priority: env.priority || "important",
      incomeAllocations,
      payCycleAmount: env.payCycleAmount || 0,
      categoryId: env.category,
      // Lock Credit Card Holding - handled in Opening Balances step
      isLocked: isCreditCardHolding,
      lockedReason: isCreditCardHolding ? "We will handle credit card payments at a later step" : undefined,
    };
  });
}

/**
 * Convert UnifiedEnvelopeData back to onboarding EnvelopeData format
 */
function convertFromUnifiedEnvelopes(
  unifiedEnvelopes: UnifiedEnvelopeData[]
): EnvelopeData[] {
  return unifiedEnvelopes.map((env) => {
    const payCycleAmount = Object.values(env.incomeAllocations || {}).reduce(
      (sum, amt) => sum + (amt || 0),
      0
    );

    // Handle dueDate - can be number (day of month), string (ISO date), or Date object
    let dueDate: number | string | undefined;
    if (typeof env.dueDate === "number") {
      dueDate = env.dueDate;
    } else if (typeof env.dueDate === "string" && env.dueDate) {
      // Keep as string for full dates (e.g., "2025-01-15")
      dueDate = env.dueDate;
    } else if (env.dueDate instanceof Date) {
      dueDate = env.dueDate.toISOString().split('T')[0];
    }

    return {
      id: env.id,
      name: env.name,
      icon: env.icon,
      type: env.subtype === "bill" ? "bill" : env.subtype === "savings" ? "savings" : "spending",
      billAmount: env.subtype === "bill" ? env.targetAmount : undefined,
      monthlyBudget: env.subtype === "spending" ? env.targetAmount : undefined,
      savingsAmount: env.subtype === "savings" ? env.targetAmount : undefined,
      frequency: env.frequency as EnvelopeData["frequency"],
      dueDate: dueDate as any,
      priority: env.priority as EnvelopeData["priority"],
      payCycleAmount,
      category: env.categoryId,
    };
  });
}

/**
 * Convert onboarding income sources to unified format
 */
function convertToUnifiedIncomeSources(
  sources: OnboardingIncomeSource[],
  payCycle: "weekly" | "fortnightly" | "twice_monthly" | "monthly" = "fortnightly"
): UnifiedIncomeSource[] {
  if (!sources || sources.length === 0) {
    return [];
  }

  return sources.map((source) => {
    // Normalize amount to user's pay cycle
    const normalizedAmount = normalizeToUserPayCycle(source.amount, source.frequency, payCycle);

    // Handle nextPayDate - can be Date object or string
    let nextPayDateStr: string | undefined;
    if (source.nextPayDate instanceof Date) {
      nextPayDateStr = source.nextPayDate.toISOString();
    } else if (typeof source.nextPayDate === 'string') {
      nextPayDateStr = source.nextPayDate;
    }

    return {
      id: source.id,
      name: source.name,
      amount: normalizedAmount,
      rawAmount: source.amount,
      frequency: source.frequency,
      nextPayDate: nextPayDateStr,
      isActive: true,
    };
  });
}

export function BudgetManagerStep({
  envelopes,
  onEnvelopesChange,
  incomeSources,
  envelopeAllocations,
  onEnvelopeAllocationsChange,
}: BudgetManagerStepProps) {
  const [showIntro, setShowIntro] = useState(true);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [showAddEnvelopeDialog, setShowAddEnvelopeDialog] = useState(false);

  // Determine user's pay cycle from income sources
  const userPayCycle = useMemo(() => {
    if (incomeSources.length === 0) return "fortnightly" as const;
    // Use the most common frequency, or the first one
    const frequencies = incomeSources.map((s) => s.frequency);
    return frequencies[0] || "fortnightly";
  }, [incomeSources]);

  // Convert income sources to unified format
  const unifiedIncomeSources = useMemo(
    () => convertToUnifiedIncomeSources(incomeSources, userPayCycle),
    [incomeSources, userPayCycle]
  );

  // Convert envelopes to unified format
  const unifiedEnvelopes = useMemo(
    () => convertToUnifiedEnvelopes(envelopes, unifiedIncomeSources, envelopeAllocations),
    [envelopes, unifiedIncomeSources, envelopeAllocations]
  );

  // Handle envelope changes from Budget Manager
  const handleEnvelopesChange = useCallback(
    (updatedUnified: UnifiedEnvelopeData[]) => {
      setHasInteracted(true);
      const converted = convertFromUnifiedEnvelopes(updatedUnified);
      onEnvelopesChange(converted);

      // Extract and pass income allocations separately for waterfall allocation
      if (onEnvelopeAllocationsChange) {
        const allocations: { [envelopeId: string]: { [incomeId: string]: number } } = {};
        updatedUnified.forEach((env) => {
          if (env.incomeAllocations && Object.keys(env.incomeAllocations).length > 0) {
            allocations[env.id] = { ...env.incomeAllocations };
          }
        });
        onEnvelopeAllocationsChange(allocations);
      }
    },
    [onEnvelopesChange, onEnvelopeAllocationsChange]
  );

  // Handle adding new envelopes from the dialog
  const handleAddEnvelopes = useCallback(
    (newEnvelopes: EnvelopeData[]) => {
      setHasInteracted(true);
      onEnvelopesChange([...envelopes, ...newEnvelopes]);
    },
    [envelopes, onEnvelopesChange]
  );

  // Get existing envelope IDs for the dialog filter
  const existingEnvelopeIds = useMemo(
    () => envelopes.map((env) => env.id),
    [envelopes]
  );

  // Dismiss intro after 5 seconds or on interaction
  useEffect(() => {
    if (hasInteracted) {
      setShowIntro(false);
    }
  }, [hasInteracted]);

  return (
    <div className="w-full space-y-4">
      {/* Intro Overlay */}
      {showIntro && (
        <Card className="relative p-6 bg-gradient-to-br from-[#E2EEEC] to-[#DDEAF5] border-2 border-[#B8D4D0]">
          <button
            type="button"
            onClick={() => setShowIntro(false)}
            className="absolute top-3 right-3 p-1 rounded-full hover:bg-white/50 transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-[#7A9E9A] rounded-lg flex items-center justify-center flex-shrink-0">
              <Calculator className="h-6 w-6 text-white" />
            </div>
            <div className="space-y-3">
              <div>
                <h3 className="text-lg font-bold text-[#5A7E7A]">
                  Welcome to Your Budget Manager!
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  This is where you'll manage your budget going forward. Let's set up your first budget:
                </p>
              </div>

              <div className="grid gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#7A9E9A] text-white text-xs font-bold flex items-center justify-center">
                    1
                  </span>
                  <span>Set target amounts for your bills and expenses</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#7A9E9A] text-white text-xs font-bold flex items-center justify-center">
                    2
                  </span>
                  <span>Choose payment frequencies (monthly, annual, etc.)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#7A9E9A] text-white text-xs font-bold flex items-center justify-center">
                    3
                  </span>
                  <span>Allocate income to each envelope</span>
                </div>
              </div>

              <Button
                onClick={() => setShowIntro(false)}
                className="bg-[#7A9E9A] hover:bg-[#5A7E7A] mt-2"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Got it, let's start!
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Warning if no income sources configured */}
      {incomeSources.length === 0 && (
        <Alert className="border-amber-300 bg-amber-50">
          <Info className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-700 text-sm">No Income Sources</AlertTitle>
          <AlertDescription className="text-xs text-amber-600">
            You haven't added any income sources yet. Go back to the Income step to add your income sources, then return here to allocate your budget.
          </AlertDescription>
        </Alert>
      )}

      {/* Surplus Envelope Info */}
      {envelopes.some(e => e.id === 'surplus') && (
        <Alert className="border-sage-light bg-sage-very-light">
          <Info className="h-4 w-4 text-sage-dark" />
          <AlertTitle className="text-sage-dark text-sm">Surplus Envelope</AlertTitle>
          <AlertDescription className="text-xs text-text-medium">
            <strong>Surplus</strong> is included by default as a catch-all for any unallocated/surplus funds.
          </AlertDescription>
        </Alert>
      )}

      {/* Add Envelope Button */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAddEnvelopeDialog(true)}
          className="border-[#7A9E9A] text-[#5A7E7A] hover:bg-[#E2EEEC]"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Envelope
        </Button>
      </div>

      {/* Budget Manager Component */}
      <BudgetManagerClient
        isOnboarding={true}
        initialEnvelopes={unifiedEnvelopes}
        initialIncomeSources={unifiedIncomeSources}
        onEnvelopesChange={handleEnvelopesChange}
        initialPayCycle={userPayCycle}
      />

      {/* Add Envelope Dialog */}
      <AddEnvelopeDialog
        open={showAddEnvelopeDialog}
        onOpenChange={setShowAddEnvelopeDialog}
        existingEnvelopeIds={existingEnvelopeIds}
        onAdd={handleAddEnvelopes}
      />
    </div>
  );
}
