"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, AlertTriangle } from "lucide-react";
import { UnifiedEnvelopeTable } from "@/components/shared/unified-envelope-table";
import type { UnifiedEnvelopeData, IncomeSource } from "@/lib/types/unified-envelope";
import type { EnvelopeData } from "@/app/(app)/onboarding/unified-onboarding-client";
import { convertLegacyToUnified, convertUnifiedToLegacy, calculatePayCycleAmount } from "@/lib/utils/envelope-data-converter";

interface EnvelopeCreationStepV2Props {
  envelopes: EnvelopeData[];
  onEnvelopesChange: (envelopes: EnvelopeData[]) => void;
  persona: any;
  useTemplate: boolean | undefined;
  incomeSources: IncomeSource[];
  bankBalance?: number;
}

export function EnvelopeCreationStepV2({
  envelopes,
  onEnvelopesChange,
  persona,
  useTemplate,
  incomeSources,
  bankBalance = 0,
}: EnvelopeCreationStepV2Props) {
  const [unifiedEnvelopes, setUnifiedEnvelopes] = useState<UnifiedEnvelopeData[]>([]);

  // Get primary income for pay cycle
  const primaryIncome = incomeSources[0];
  const payCycle = primaryIncome?.frequency || 'monthly';

  // Convert legacy envelopes to unified format on mount/change
  useEffect(() => {
    const unified = envelopes.map(env => {
      const converted = convertLegacyToUnified(env);

      // Calculate income allocations based on payCycleAmount
      const allocations: { [key: string]: number } = {};
      if (incomeSources.length > 0 && converted.payCycleAmount) {
        // For now, allocate everything to first income source
        // User can adjust in allocation step
        allocations[incomeSources[0].id] = converted.payCycleAmount;
      }

      return {
        ...converted,
        incomeAllocations: allocations,
      };
    });

    setUnifiedEnvelopes(unified);
  }, [envelopes, incomeSources]);

  // Convert unified back to legacy and notify parent
  const syncToLegacy = (unified: UnifiedEnvelopeData[]) => {
    const legacy = unified.map(env => convertUnifiedToLegacy(env));
    onEnvelopesChange(legacy);
  };

  // Handle envelope updates
  const handleEnvelopeUpdate = (id: string, updates: Partial<UnifiedEnvelopeData>) => {
    setUnifiedEnvelopes(prev => {
      const updated = prev.map(env =>
        env.id === id ? { ...env, ...updates } : env
      );
      syncToLegacy(updated);
      return updated;
    });
  };

  // Handle envelope deletion
  const handleEnvelopeDelete = (id: string) => {
    setUnifiedEnvelopes(prev => {
      const updated = prev.filter(env => env.id !== id);
      syncToLegacy(updated);
      return updated;
    });
  };

  // Handle allocation updates
  const handleAllocationUpdate = (envelopeId: string, incomeSourceId: string, amount: number) => {
    setUnifiedEnvelopes(prev => {
      const updated = prev.map(env => {
        if (env.id === envelopeId) {
          return {
            ...env,
            incomeAllocations: {
              ...env.incomeAllocations,
              [incomeSourceId]: amount,
            },
            payCycleAmount: Object.values({
              ...env.incomeAllocations,
              [incomeSourceId]: amount,
            }).reduce((sum, amt) => sum + amt, 0),
          };
        }
        return env;
      });
      syncToLegacy(updated);
      return updated;
    });
  };

  // Add new envelope
  const handleAddEnvelope = () => {
    const newEnvelope: UnifiedEnvelopeData = {
      id: `envelope-${Date.now()}`,
      name: 'New Envelope',
      icon: '📊',
      subtype: 'bill',
      targetAmount: 0,
      frequency: 'monthly',
      priority: 'important',
      incomeAllocations: {},
      payCycleAmount: 0,
    };

    setUnifiedEnvelopes(prev => {
      const updated = [...prev, newEnvelope];
      syncToLegacy(updated);
      return updated;
    });
  };

  // Calculate totals
  const totalAllocated = unifiedEnvelopes.reduce((sum, env) => {
    const envTotal = Object.values(env.incomeAllocations || {}).reduce((s, amt) => s + amt, 0);
    return sum + envTotal;
  }, 0);

  const totalIncome = incomeSources.reduce((sum, inc) => sum + inc.amount, 0);
  const remaining = totalIncome - totalAllocated;
  const isOverspent = remaining < 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="text-5xl mb-2">📝</div>
        <h2 className="text-3xl font-bold">Configure Your Envelopes</h2>
        <p className="text-muted-foreground">
          Set up your budget envelopes with target amounts and income allocations
        </p>
      </div>

      {/* Budget Status Summary */}
      {incomeSources.length > 0 && (
        <Card className={`p-6 ${isOverspent ? 'bg-red-50 border-red-200' : remaining > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">Budget Status</h3>
              <p className="text-sm text-muted-foreground">
                Per {payCycle === 'fortnightly' ? 'fortnight' : payCycle}
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">
                {isOverspent ? '-' : '+'}${Math.abs(remaining).toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground">
                {isOverspent ? 'Overspent' : remaining > 0 ? 'Remaining' : 'Fully Allocated'}
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm">
            <span>Total Income: ${totalIncome.toFixed(2)}</span>
            <span>Allocated: ${totalAllocated.toFixed(2)}</span>
          </div>

          {isOverspent && (
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                You're allocating ${Math.abs(remaining).toFixed(2)} more than you earn. Reduce your envelope amounts.
              </AlertDescription>
            </Alert>
          )}
        </Card>
      )}

      {/* Unified Envelope Table */}
      <UnifiedEnvelopeTable
        envelopes={unifiedEnvelopes}
        incomeSources={incomeSources}
        mode="onboarding"
        payCycle={payCycle}
        bankBalance={bankBalance}
        showIncomeColumns={true}
        showOpeningBalance={true}
        showCurrentBalance={false}
        showNotes={true}
        enableDragAndDrop={false}
        onEnvelopeUpdate={handleEnvelopeUpdate}
        onEnvelopeDelete={handleEnvelopeDelete}
        onAllocationUpdate={handleAllocationUpdate}
      />

      {/* Add Envelope Button */}
      <Button onClick={handleAddEnvelope} variant="outline" className="w-full">
        <Plus className="mr-2 h-4 w-4" />
        Add Another Envelope
      </Button>

      {/* Help Text */}
      <Alert>
        <AlertDescription>
          <p className="font-medium mb-1">Getting Started</p>
          <ul className="text-sm space-y-1 list-disc list-inside">
            <li>Set <strong>Target Amount</strong> for each envelope (what you need per pay cycle)</li>
            <li>Allocate funding from each income source</li>
            <li>Opening balance shows cash needed from your bank to start</li>
            <li>Add notes for important dates (insurance renewal, etc.)</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}
