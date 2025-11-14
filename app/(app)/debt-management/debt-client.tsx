"use client";

import { useEffect, useState } from "react";
import { GoalCard } from "@/components/goals/goal-card";
import { GoalCreateDialog } from "@/components/goals/goal-create-dialog";
import type { GoalEnvelope } from "@/lib/types/goals";
import { calculateGoalProgress } from "@/lib/goals";
import { Plus, CreditCard, TrendingDown, AlertCircle, CheckCircle, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/finance";

type CategoryOption = { id: string; name: string };

interface DebtClientProps {
  categories: CategoryOption[];
}

export function DebtClient({ categories }: DebtClientProps) {
  const [debts, setDebts] = useState<GoalEnvelope[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const fetchDebts = async () => {
    try {
      const response = await fetch("/api/goals");
      if (!response.ok) throw new Error("Failed to fetch debts");
      const data = await response.json();
      // Filter for debt_payoff goals only
      const debtGoals = data.filter((goal: GoalEnvelope) => goal.goal_type === 'debt_payoff');
      setDebts(debtGoals);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load debts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDebts();
  }, []);

  // Calculate summary stats
  const totalDebts = debts.length;
  const activeDebts = debts.filter((d) => {
    const progress = calculateGoalProgress(d);
    return progress.status !== "completed";
  }).length;
  const completedDebts = totalDebts - activeDebts;

  // Calculate total debt balance
  const totalDebtBalance = debts.reduce((sum, debt) => {
    const balance = Number(debt.target_amount || 0) - Number(debt.current_amount || 0);
    return sum + Math.max(0, balance);
  }, 0);

  // Calculate total monthly payments
  const totalMonthlyPayment = debts.reduce((sum, debt) => {
    if (calculateGoalProgress(debt).status === "completed") return sum;
    return sum + Number(debt.pay_cycle_amount || 0);
  }, 0);

  // Calculate highest interest debt
  const highestInterestDebt = debts
    .filter((d) => calculateGoalProgress(d).status !== "completed")
    .reduce<GoalEnvelope | null>((highest, current) => {
      const currentRate = Number(current.interest_rate || 0);
      const highestRate = Number(highest?.interest_rate || 0);
      if (!highest || currentRate > highestRate) {
        return current;
      }
      return highest;
    }, null);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-100 rounded-xl">
                <CreditCard className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Debt Management</h1>
                <p className="text-gray-500">Track and eliminate your debts</p>
              </div>
            </div>
            <button
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Add Debt
            </button>
          </div>

          {/* Summary Stats */}
          {totalDebts > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CreditCard className="h-4 w-4 text-gray-500" />
                  <p className="text-xs font-medium text-gray-500 uppercase">Total Debts</p>
                </div>
                <p className="text-2xl font-bold text-gray-900">{totalDebts}</p>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-4 w-4 text-red-600" />
                  <p className="text-xs font-medium text-red-600 uppercase">Total Balance</p>
                </div>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(totalDebtBalance)}</p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingDown className="h-4 w-4 text-blue-600" />
                  <p className="text-xs font-medium text-blue-600 uppercase">Monthly Payment</p>
                </div>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalMonthlyPayment)}</p>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="h-4 w-4 text-purple-600" />
                  <p className="text-xs font-medium text-purple-600 uppercase">Paid Off</p>
                </div>
                <p className="text-2xl font-bold text-purple-600">{completedDebts}</p>
              </div>
            </div>
          )}

          {/* Highest Interest Alert */}
          {highestInterestDebt && Number(highestInterestDebt.interest_rate || 0) > 15 && (
            <div className="flex items-start gap-2 p-4 bg-amber-50 border border-amber-200 rounded-lg mb-6">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-amber-900">High Interest Debt Detected</p>
                <p className="text-sm text-amber-700 mt-1">
                  "{highestInterestDebt.name}" has an interest rate of {Number(highestInterestDebt.interest_rate).toFixed(2)}%.
                  Consider prioritizing this debt to minimize interest charges.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Debts Grid */}
        {debts.length === 0 ? (
          <div className="bg-white border rounded-lg p-12 text-center">
            <div className="max-w-sm mx-auto">
              <div className="inline-flex p-4 bg-red-100 rounded-full mb-4">
                <CreditCard className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No debts tracked</h3>
              <p className="text-gray-500 mb-6">
                Start tracking your debts to create a payoff plan and become debt-free faster.
              </p>
              <button
                onClick={() => setCreateOpen(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm"
              >
                <Plus className="h-4 w-4" />
                Add Your First Debt
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {debts.map((debt) => (
              <GoalCard key={debt.id} goal={debt} />
            ))}
          </div>
        )}
      </div>

      {/* Create Dialog - defaults to debt_payoff type */}
      <GoalCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        categories={categories}
        onCreated={fetchDebts}
      />
    </div>
  );
}
