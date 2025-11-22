"use client";

import { useState } from "react";
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
import { EnvelopeCreateDialog } from "@/components/layout/envelopes/envelope-create-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ZeroBudgetSection } from "@/components/layout/budget/zero-budget-section";
import { AutoAllocateDialog } from "@/components/layout/budget/auto-allocate-dialog";
import { toast } from "sonner";
import HelpTooltip from "@/components/ui/help-tooltip";
import {
  Plus,
  Target,
  ArrowUpCircle,
  ArrowDownCircle,
} from "lucide-react";
import { CreditCardHoldingWidget } from "@/components/layout/credit-card/credit-card-holding-widget";

interface Envelope {
  id: string;
  name: string;
  icon?: string | null;
  envelope_type?: string;
  target_amount?: string | number;
  annual_amount?: string | number;
  pay_cycle_amount?: string | number;
  opening_balance?: string | number;
  current_amount?: string | number;
  frequency?: string;
  next_payment_due?: string;
  notes?: string | null;
}

interface ZeroBudgetSetupClientProps {
  userId?: string;
  initialPayCycle?: string;
}

export function ZeroBudgetSetupClient({
  userId,
  initialPayCycle = "monthly",
}: ZeroBudgetSetupClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [payCycle, setPayCycle] = useState(initialPayCycle);
  const [createOpen, setCreateOpen] = useState(false);
  const [collapseAll, setCollapseAll] = useState(false);
  const [allocateOpen, setAllocateOpen] = useState(false);

  // Get envelopes data
  const { data: envelopes = [] } = useQuery<Envelope[]>({
    queryKey: ["/api/envelopes"],
    queryFn: async () => {
      const response = await fetch("/api/envelopes");
      if (!response.ok) throw new Error("Failed to fetch envelopes");
      const data = await response.json();
      return Array.isArray(data) ? data : data.envelopes || [];
    },
  });

  // Mutations
  const updateEnvelopeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await fetch(`/api/envelopes/${id}`, {
        method: "PATCH",
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

  const deleteEnvelopeMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/envelopes/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete envelope");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/envelopes"] });
      toast.success("Envelope deleted successfully");
    },
  });

  // Handle envelope updates
  const handleEnvelopeUpdate = async (id: string, data: any) => {
    try {
      await updateEnvelopeMutation.mutateAsync({ id, data });
    } catch (error) {
      console.error("Failed to update envelope:", error);
      toast.error("Failed to update envelope. Please try again.");
    }
  };

  // Handle envelope deletion
  const handleEnvelopeDelete = async (id: string) => {
    try {
      await deleteEnvelopeMutation.mutateAsync(id);
    } catch (error) {
      console.error("Failed to delete envelope:", error);
      toast.error("Failed to delete envelope. Please try again.");
    }
  };

  // Handle auto-allocate surplus
  const handleAutoAllocate = async (allocations: any[]) => {
    try {
      // Update each envelope's current_amount
      await Promise.all(
        allocations.map((allocation) =>
          updateEnvelopeMutation.mutateAsync({
            id: allocation.envelopeId,
            data: {
              current_amount: (
                allocation.currentAmount + allocation.proposedAllocation
              ).toFixed(2),
            },
          })
        )
      );
      toast.success("Surplus allocated successfully!");
    } catch (error) {
      console.error("Failed to allocate surplus:", error);
      toast.error("Failed to allocate surplus. Please try again.");
    }
  };

  // Handle pay cycle update
  const handlePayCycleChange = async (value: string) => {
    try {
      const response = await fetch("/api/user/pay-cycle", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payCycle: value }),
      });

      if (response.ok) {
        setPayCycle(value);
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

  // Separate income and expense envelopes
  const incomeEnvelopes = envelopes.filter(
    (env) => env.envelope_type === "income"
  );
  const expenseEnvelopes = envelopes.filter(
    (env) => env.envelope_type === "expense"
  );

  // Calculate totals (including opening balances for startup allocation)
  const totalIncome = incomeEnvelopes.reduce(
    (sum, env) =>
      sum +
      parseFloat(String(env.pay_cycle_amount || "0")) +
      parseFloat(String(env.opening_balance || "0")),
    0
  );
  const totalExpenses = expenseEnvelopes.reduce(
    (sum, env) =>
      sum +
      parseFloat(String(env.pay_cycle_amount || "0")) +
      parseFloat(String(env.opening_balance || "0")),
    0
  );
  const difference = totalIncome - totalExpenses;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 pb-20 pt-6 md:px-6 md:pb-8">
      {/* Header */}
      <header className="space-y-1">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-secondary">Zero-Based Budget Setup</h1>
              <HelpTooltip
                title="Zero-Based Budget Setup"
                content={[
                  "Build a complete zero-based budget where every dollar is assigned to either income or expense envelopes. This ensures your income minus expenses equals zero, giving you full control over your finances.",
                  "Create income envelopes to track paychecks and other earnings. Create expense envelopes for bills, savings goals, and discretionary spending. The dashboard shows whether you have unallocated funds or are over budget."
                ]}
                tips={[
                  "Start with income envelopes: add all expected income sources",
                  "Create expense envelopes for fixed bills, then variable expenses",
                  "Use 'Add Envelope' to quickly create new budget categories",
                  "Aim for zero difference (income = expenses) for a balanced budget"
                ]}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Plan and organize your complete budget system with editable cards
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/envelope-summary">View Envelope Summary</Link>
            </Button>
            <Button onClick={() => setCreateOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Envelope
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
              <ArrowUpCircle className="h-4 w-4 text-green-600" />
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
              <ArrowDownCircle className="h-4 w-4 text-red-600" />
              Total Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ${totalExpenses.toFixed(2)}
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
          <CardContent className="space-y-3">
            <div>
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
            </div>
            {difference > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => setAllocateOpen(true)}
              >
                Auto-Allocate Surplus
              </Button>
            )}
          </CardContent>
        </Card>

        <CreditCardHoldingWidget />
      </div>

      {/* Collapse/Expand Controls */}
      {envelopes.length > 0 && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setCollapseAll(false)}>
            Expand all
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCollapseAll(true)}>
            Collapse all
          </Button>
        </div>
      )}

      {/* Envelopes Sections */}
      {envelopes.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No envelopes created yet. Click "Add Envelope" to start building your budget.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Income Section */}
          {incomeEnvelopes.length > 0 && (
            <ZeroBudgetSection
              title="Income Envelopes"
              type="income"
              envelopes={incomeEnvelopes}
              payCycle={payCycle}
              collapsedAll={collapseAll}
              onUpdate={handleEnvelopeUpdate}
              onDelete={handleEnvelopeDelete}
            />
          )}

          {/* Expense Section */}
          {expenseEnvelopes.length > 0 && (
            <ZeroBudgetSection
              title="Expense Envelopes"
              type="expense"
              envelopes={expenseEnvelopes}
              payCycle={payCycle}
              collapsedAll={collapseAll}
              onUpdate={handleEnvelopeUpdate}
              onDelete={handleEnvelopeDelete}
            />
          )}

          {/* Grand Total Summary */}
          <Card className="bg-slate-100">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold">
                  Net Difference (Income - Expenses)
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
      )}

      <EnvelopeCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        categories={[]}
        onCreated={() => {
          queryClient.invalidateQueries({ queryKey: ["/api/envelopes"] });
        }}
      />

      <AutoAllocateDialog
        open={allocateOpen}
        onOpenChange={setAllocateOpen}
        surplus={difference}
        envelopes={envelopes}
        onConfirm={handleAutoAllocate}
      />
    </div>
  );
}
