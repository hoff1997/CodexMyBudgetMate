"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import HelpTooltip from "@/components/ui/help-tooltip";
import {
  Plus,
  Target,
} from "lucide-react";
import { CreditCardHoldingWidget } from "@/components/layout/credit-card/credit-card-holding-widget";
import { UnifiedEnvelopeTable } from "@/components/shared/unified-envelope-table";
import type { UnifiedEnvelopeData, IncomeSource } from "@/lib/types/unified-envelope";

interface BudgetManagerClientProps {
  userId?: string;
  initialPayCycle?: string;
  demoMode?: boolean;
}

export function BudgetManagerClient({
  userId,
  initialPayCycle = "monthly",
  demoMode = false,
}: BudgetManagerClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [payCycle, setPayCycle] = useState<'weekly' | 'fortnightly' | 'monthly'>(initialPayCycle as any);
  const [unifiedEnvelopes, setUnifiedEnvelopes] = useState<UnifiedEnvelopeData[]>([]);
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);

  // Fetch envelopes
  const { data: rawEnvelopes = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/envelopes"],
    queryFn: async () => {
      const response = await fetch("/api/envelopes", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch envelopes");
      const data = await response.json();
      return Array.isArray(data) ? data : data.envelopes || [];
    },
    enabled: !demoMode, // Skip API call in demo mode
  });

  // Fetch income sources
  const { data: rawIncome = [] } = useQuery<any[]>({
    queryKey: ["/api/income-sources"],
    queryFn: async () => {
      const response = await fetch("/api/income-sources", {
        credentials: "include",
      });
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !demoMode, // Skip API call in demo mode
  });

  // Convert raw data to unified format
  useEffect(() => {
    if (!rawEnvelopes || rawEnvelopes.length === 0) {
      if (unifiedEnvelopes.length > 0) {
        setUnifiedEnvelopes([]);
      }
      return;
    }

    const unified: UnifiedEnvelopeData[] = rawEnvelopes.map(env => ({
      id: env.id,
      name: env.name,
      icon: env.icon || '📊',
      subtype: env.subtype || 'bill',
      targetAmount: Number(env.target_amount || 0),
      frequency: env.frequency || 'monthly',
      dueDate: env.due_date,
      priority: env.priority || 'important',
      notes: env.notes,
      incomeAllocations: {}, // TODO: Fetch from envelope_income_allocations
      payCycleAmount: Number(env.pay_cycle_amount || 0),
      annualAmount: Number(env.annual_amount || 0),
      currentAmount: Number(env.current_amount || 0),
      categoryId: env.category_id,
    }));

    setUnifiedEnvelopes(unified);
  }, [rawEnvelopes, unifiedEnvelopes.length]);

  // Convert income data
  useEffect(() => {
    if (!rawIncome || rawIncome.length === 0) {
      if (incomeSources.length > 0) {
        setIncomeSources([]);
      }
      return;
    }

    const sources: IncomeSource[] = rawIncome.map(inc => ({
      id: inc.id,
      name: inc.name,
      amount: Number(inc.typical_amount || 0),
      frequency: inc.pay_cycle || 'monthly',
      isActive: inc.is_active !== false,
    }));

    setIncomeSources(sources);
  }, [rawIncome, incomeSources.length]);

  // Update envelope mutation
  const updateEnvelopeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await fetch(`/api/envelopes/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update envelope");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/envelopes"] });
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
      toast.success("Envelope updated");
    } catch (error) {
      console.error("[Budget Manager] Failed to update envelope:", error);
      toast.error("Failed to update envelope");
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

      // Update local state
      setUnifiedEnvelopes(prev => prev.map(env => {
        if (env.id === envelopeId) {
          const newAllocations = {
            ...env.incomeAllocations,
            [incomeSourceId]: amount,
          };
          const total = Object.values(newAllocations).reduce((sum, amt) => sum + amt, 0);

          return {
            ...env,
            incomeAllocations: newAllocations,
            payCycleAmount: total,
          };
        }
        return env;
      }));

      toast.success("Allocation updated");
    } catch (error) {
      console.error("Failed to update allocation:", error);
      toast.error("Failed to update allocation");
    }
  };

  // Handle pay cycle change
  const handlePayCycleChange = async (value: string) => {
    // In demo mode, just update locally without API call
    if (demoMode) {
      setPayCycle(value as any);
      toast.success("Pay cycle updated (demo mode)");
      return;
    }

    try {
      const response = await fetch("/api/user/pay-cycle", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payCycle: value }),
      });

      if (response.ok) {
        setPayCycle(value as any);
        queryClient.invalidateQueries({ queryKey: ["/api/envelopes"] });
        toast.success("Pay cycle updated");
      } else {
        throw new Error("Failed to update pay cycle");
      }
    } catch (error) {
      console.error("Failed to update pay cycle:", error);
      toast.error("Failed to update pay cycle");
    }
  };

  // Calculate totals
  const totalIncome = incomeSources.reduce((sum, inc) => sum + inc.amount, 0);
  const totalAllocated = unifiedEnvelopes.reduce((sum, env) => {
    const envTotal = Object.values(env.incomeAllocations || {}).reduce((s, amt) => s + amt, 0);
    return sum + envTotal;
  }, 0);
  const difference = totalIncome - totalAllocated;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 pb-20 pt-6 md:px-6 md:pb-8">
      {/* Header */}
      <header className="space-y-1">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-secondary">Zero-Based Budget Manager</h1>
              <HelpTooltip
                title="Zero-Based Budget Manager"
                content={[
                  "Manage your complete zero-based budget where every dollar is assigned. This ensures your income minus allocations equals zero, giving you full control over your finances.",
                  "Update envelope details, adjust income allocations, and track your current balances. All changes save automatically."
                ]}
                tips={[
                  "Set target amounts for each envelope",
                  "Allocate funding from each income source",
                  "Track current balances and progress",
                  "Aim for zero difference (income = allocations) for a balanced budget"
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

      {/* Pay Cycle Configuration */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <label htmlFor="payCycle" className="text-sm font-medium">
              How often do you get paid?
            </label>
            <Select value={payCycle} onValueChange={handlePayCycleChange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="fortnightly">Fortnightly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              This determines how the budget amounts calculate from annual totals.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Budget Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4" />
              Total Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${totalIncome.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">
              per {payCycle === "fortnightly" ? "fortnight" : payCycle}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4" />
              Total Allocated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              ${totalAllocated.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">
              per {payCycle === "fortnightly" ? "fortnight" : payCycle}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4" />
              Difference
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                difference >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              ${Math.abs(difference).toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">
              {difference >= 0 ? "Surplus" : "Overspent"}
            </div>
          </CardContent>
        </Card>

        {!demoMode && <CreditCardHoldingWidget />}
      </div>

      {/* Unified Envelope Table */}
      {demoMode ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Demo mode: Sign in to view your budget data.
          </CardContent>
        </Card>
      ) : isLoading ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Loading envelopes...
          </CardContent>
        </Card>
      ) : unifiedEnvelopes.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No envelopes created yet. Create your first envelope to get started.
          </CardContent>
        </Card>
      ) : (
        <UnifiedEnvelopeTable
          envelopes={unifiedEnvelopes}
          incomeSources={incomeSources}
          mode="maintenance"
          payCycle={payCycle}
          showIncomeColumns={true}
          showOpeningBalance={false}
          showCurrentBalance={true}
          showNotes={true}
          enableDragAndDrop={false}
          onEnvelopeUpdate={handleEnvelopeUpdate}
          onEnvelopeDelete={handleEnvelopeDelete}
          onAllocationUpdate={handleAllocationUpdate}
        />
      )}

      {/* Grand Total Summary */}
      <Card className="bg-slate-100">
        <CardContent className="pt-6">
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
    </div>
  );
}
