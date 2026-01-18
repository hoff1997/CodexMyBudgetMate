"use client";

import { useState, useEffect, useMemo } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Plus,
  X,
  AlertCircle,
  CreditCard,
  Link2,
  TrendingDown,
  Trophy,
  Calculator,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/finance";
import { RemyAvatar } from "@/components/onboarding/remy-tip";
import type {
  DebtItem,
  DebtItemInput,
  DebtType,
  LinkedCreditCard,
} from "@/lib/types/debt";
import {
  DEBT_TYPE_OPTIONS,
  getDebtTypeIcon,
  getDebtTypeLabel,
  calculateDebtSummary,
  calculatePayoffProjection,
  comparePayments,
  sortBySnowball,
} from "@/lib/types/debt";

interface DebtAllocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  envelope: {
    id: string;
    name: string;
    icon: string;
    is_debt?: boolean;
    target_amount: number;
    current_amount: number;
  };
  existingDebtItems?: DebtItem[];
  availableCreditCards?: LinkedCreditCard[];
  onSave: (items: DebtItemInput[], budgetChange: number) => Promise<void>;
}

interface LocalDebtItem {
  id?: string;
  tempId: string;
  name: string;
  debt_type: DebtType;
  linked_account_id: string | null;
  starting_balance: number;
  current_balance: number;
  interest_rate: number | null;
  minimum_payment: number | null;
  paid_off_at: string | null;
}

export function DebtAllocationDialog({
  open,
  onOpenChange,
  envelope,
  existingDebtItems = [],
  availableCreditCards = [],
  onSave,
}: DebtAllocationDialogProps) {
  const [debtItems, setDebtItems] = useState<LocalDebtItem[]>([]);
  const [showBudgetWarning, setShowBudgetWarning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPayMoreCalculator, setShowPayMoreCalculator] = useState<string | null>(null);
  const [customPayment, setCustomPayment] = useState<number>(0);

  // Initialize debt items from existing data
  useEffect(() => {
    if (open && existingDebtItems.length > 0) {
      setDebtItems(
        existingDebtItems.map((item) => ({
          id: item.id,
          tempId: item.id,
          name: item.name,
          debt_type: item.debt_type,
          linked_account_id: item.linked_account_id,
          starting_balance: Number(item.starting_balance) || 0,
          current_balance: Number(item.current_balance) || 0,
          interest_rate: item.interest_rate != null ? Number(item.interest_rate) : null,
          minimum_payment: item.minimum_payment != null ? Number(item.minimum_payment) : null,
          paid_off_at: item.paid_off_at,
        }))
      );
    } else if (open && existingDebtItems.length === 0) {
      // Start with empty list
      setDebtItems([]);
    }
  }, [open, existingDebtItems]);

  // Calculate totals
  const originalTotalMinPayments = useMemo(
    () => existingDebtItems.reduce((sum, item) => sum + Number(item.minimum_payment || 0), 0),
    [existingDebtItems]
  );

  const newTotalMinPayments = useMemo(
    () => debtItems.reduce((sum, item) => sum + Number(item.minimum_payment || 0), 0),
    [debtItems]
  );

  const summary = useMemo(() => {
    // Calculate summary from local items (which have the same structure for summary calculation)
    const itemsForSummary = debtItems.map(item => ({
      ...item,
      id: item.id || item.tempId,
      user_id: '',
      envelope_id: '',
      display_order: 0,
      created_at: '',
      updated_at: '',
    }));
    return calculateDebtSummary(itemsForSummary);
  }, [debtItems]);

  const budgetChange = newTotalMinPayments - originalTotalMinPayments;

  // Sort by snowball (smallest balance first) - keep as LocalDebtItem
  const sortedDebtItems = useMemo(() => {
    return [...debtItems].sort((a, b) => {
      // Paid off items go to the end
      if (a.paid_off_at && !b.paid_off_at) return 1;
      if (!a.paid_off_at && b.paid_off_at) return -1;
      // Otherwise sort by balance (smallest first)
      return a.current_balance - b.current_balance;
    });
  }, [debtItems]);

  // Available CCs not already linked
  const unlinkedCreditCards = useMemo(
    () => availableCreditCards.filter((cc) => !cc.is_already_linked),
    [availableCreditCards]
  );

  const addDebtItem = (type: DebtType = "other") => {
    setDebtItems([
      ...debtItems,
      {
        tempId: crypto.randomUUID(),
        name: "",
        debt_type: type,
        linked_account_id: null,
        starting_balance: 0,
        current_balance: 0,
        interest_rate: null,
        minimum_payment: null,
        paid_off_at: null,
      },
    ]);
  };

  const linkCreditCard = (cc: LinkedCreditCard) => {
    setDebtItems([
      ...debtItems,
      {
        tempId: crypto.randomUUID(),
        name: cc.name,
        debt_type: "credit_card",
        linked_account_id: cc.id,
        starting_balance: Math.abs(cc.current_balance),
        current_balance: Math.abs(cc.current_balance),
        interest_rate: null,
        minimum_payment: null,
        paid_off_at: null,
      },
    ]);
  };

  const updateDebtItem = (
    tempId: string,
    field: keyof LocalDebtItem,
    value: string | number | null
  ) => {
    setDebtItems(
      debtItems.map((item) =>
        item.tempId === tempId ? { ...item, [field]: value } : item
      )
    );
  };

  const removeDebtItem = (tempId: string) => {
    setDebtItems(debtItems.filter((item) => item.tempId !== tempId));
  };

  const isValid = debtItems.every(
    (item) => item.name.trim() && item.current_balance >= 0
  );

  const handleSave = () => {
    if (!isValid && debtItems.length > 0) {
      toast.error("Please fill in all debt names and balances");
      return;
    }

    if (Math.abs(budgetChange) > 0.01 && debtItems.length > 0) {
      setShowBudgetWarning(true);
    } else {
      handleConfirmSave();
    }
  };

  const handleConfirmSave = async () => {
    setIsSaving(true);
    try {
      const itemsToSave: DebtItemInput[] = debtItems
        .filter((item) => item.name.trim())
        .map((item) => ({
          id: item.id,
          name: item.name.trim(),
          debt_type: item.debt_type,
          linked_account_id: item.linked_account_id,
          starting_balance: item.starting_balance,
          current_balance: item.current_balance,
          interest_rate: item.interest_rate,
          minimum_payment: item.minimum_payment,
        }));

      await onSave(itemsToSave, budgetChange);
      toast.success(`Debt items saved for ${envelope.name}`);
      onOpenChange(false);
      setShowBudgetWarning(false);
    } catch (error) {
      console.error("Failed to save debt items:", error);
      toast.error("Failed to save debt items");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setShowBudgetWarning(false);
    setShowPayMoreCalculator(null);
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-xl z-50 p-6">
          <Dialog.Title className="text-xl font-bold text-text-dark flex items-center gap-2">
            <span className="text-2xl">{envelope.icon}</span>
            {envelope.name} - Manage Debts
          </Dialog.Title>

          <Dialog.Description className="text-sm text-text-medium mt-1 mb-4">
            Track your debts here. We'll order them smallest to largest (debt snowball) so you can knock them out one by one.
          </Dialog.Description>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="absolute top-4 right-4"
          >
            <X className="h-4 w-4" />
          </Button>

          {!showBudgetWarning ? (
            <div className="space-y-4">
              {/* Remy guidance */}
              <div className="flex items-start gap-3 p-3 bg-sage-very-light rounded-lg border border-sage-light">
                <RemyAvatar pose="small" size="sm" />
                <div>
                  <p className="text-sm text-text-dark">
                    The debt snowball method is simple but powerful - pay off the smallest debt first, then roll that payment into the next one. Each win builds momentum. You've got this!
                  </p>
                </div>
              </div>

              {/* Link Credit Card Section */}
              {unlinkedCreditCards.length > 0 && (
                <div className="bg-blue-light/30 border border-blue rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Link2 className="h-4 w-4 text-blue" />
                    <span className="text-sm font-medium text-text-dark">
                      Link Credit Card from Bank
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {unlinkedCreditCards.map((cc) => (
                      <Button
                        key={cc.id}
                        variant="outline"
                        size="sm"
                        onClick={() => linkCreditCard(cc)}
                        className="border-blue hover:bg-blue-light"
                      >
                        <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                        {cc.name} ({formatCurrency(Math.abs(cc.current_balance))})
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-text-medium mt-2">
                    Linked cards auto-sync their balance from your bank
                  </p>
                </div>
              )}

              {/* Debt items list */}
              <div className="space-y-3">
                {/* Header */}
                {debtItems.length > 0 && (
                  <div className="grid grid-cols-[1fr_100px_100px_100px_80px_32px] gap-2 px-2 text-xs font-medium text-text-medium">
                    <span>Debt Name</span>
                    <span className="text-center">Balance</span>
                    <span className="text-center">APR %</span>
                    <span className="text-center">Min Payment</span>
                    <span className="text-center">Type</span>
                    <span></span>
                  </div>
                )}

                {/* Sorted debt items (smallest first) */}
                {sortedDebtItems.map((item) => (
                  <div key={item.tempId} className="space-y-2">
                    <div
                      className={cn(
                        "grid grid-cols-[1fr_100px_100px_100px_80px_32px] gap-2 items-center p-3 rounded-lg border",
                        item.paid_off_at
                          ? "bg-sage-very-light/50 border-sage-light"
                          : "bg-sage-very-light border-sage-light"
                      )}
                    >
                      {/* Name */}
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getDebtTypeIcon(item.debt_type)}</span>
                        <Input
                          placeholder="Debt name"
                          value={item.name}
                          onChange={(e) => updateDebtItem(item.tempId, "name", e.target.value)}
                          className="bg-white h-8 text-sm"
                          disabled={!!item.linked_account_id}
                        />
                        {item.linked_account_id && (
                          <span title="Linked to bank account">
                            <Link2 className="h-3.5 w-3.5 text-blue flex-shrink-0" />
                          </span>
                        )}
                        {item.paid_off_at && (
                          <span title="Paid off!">
                            <Trophy className="h-4 w-4 text-gold flex-shrink-0" />
                          </span>
                        )}
                      </div>

                      {/* Balance */}
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-text-medium text-xs">$</span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0"
                          value={item.current_balance || ""}
                          onChange={(e) =>
                            updateDebtItem(item.tempId, "current_balance", parseFloat(e.target.value) || 0)
                          }
                          className="pl-5 bg-white h-8 text-sm text-center"
                          disabled={!!item.linked_account_id}
                        />
                      </div>

                      {/* APR */}
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          placeholder="-"
                          value={item.interest_rate ?? ""}
                          onChange={(e) =>
                            updateDebtItem(
                              item.tempId,
                              "interest_rate",
                              e.target.value ? parseFloat(e.target.value) : null
                            )
                          }
                          className="bg-white h-8 text-sm text-center pr-6"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-text-medium text-xs">%</span>
                      </div>

                      {/* Min Payment */}
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-text-medium text-xs">$</span>
                        <Input
                          type="number"
                          step="1"
                          min="0"
                          placeholder="0"
                          value={item.minimum_payment ?? ""}
                          onChange={(e) =>
                            updateDebtItem(
                              item.tempId,
                              "minimum_payment",
                              e.target.value ? parseFloat(e.target.value) : null
                            )
                          }
                          className="pl-5 bg-white h-8 text-sm text-center"
                        />
                      </div>

                      {/* Type selector */}
                      <select
                        value={item.debt_type}
                        onChange={(e) => updateDebtItem(item.tempId, "debt_type", e.target.value as DebtType)}
                        className="h-8 rounded-lg border border-border bg-white px-2 text-xs"
                      >
                        {DEBT_TYPE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>

                      {/* Remove button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeDebtItem(item.tempId)}
                        className="h-7 w-7 p-0 text-text-medium hover:text-red-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {/* Pay More Calculator - expandable */}
                    {item.minimum_payment && item.current_balance > 0 && !item.paid_off_at && (
                      <div className="ml-4">
                        <button
                          type="button"
                          onClick={() =>
                            setShowPayMoreCalculator(
                              showPayMoreCalculator === item.tempId ? null : item.tempId
                            )
                          }
                          className="flex items-center gap-2 text-xs text-blue hover:text-blue-dark"
                        >
                          <Calculator className="h-3.5 w-3.5" />
                          {showPayMoreCalculator === item.tempId ? "Hide" : "Show"} payoff calculator
                          {showPayMoreCalculator === item.tempId ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )}
                        </button>

                        {showPayMoreCalculator === item.tempId && (
                          <PayoffCalculator
                            currentBalance={item.current_balance}
                            interestRate={item.interest_rate}
                            minimumPayment={item.minimum_payment}
                            onPaymentChange={(payment) => {
                              updateDebtItem(item.tempId, "minimum_payment", payment);
                              setShowPayMoreCalculator(null);
                            }}
                          />
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {/* Empty state */}
                {debtItems.length === 0 && (
                  <div className="text-center py-8 text-text-medium">
                    <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No debts added yet</p>
                    <p className="text-xs mt-1">Link a credit card or add a debt manually below</p>
                  </div>
                )}

                {/* Add debt buttons */}
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    onClick={() => addDebtItem("credit_card")}
                    size="sm"
                    className="border-dashed border-sage hover:border-sage-dark hover:bg-sage-very-light"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Add Credit Card
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => addDebtItem("personal_loan")}
                    size="sm"
                    className="border-dashed border-sage hover:border-sage-dark hover:bg-sage-very-light"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Add Loan
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => addDebtItem("afterpay")}
                    size="sm"
                    className="border-dashed border-sage hover:border-sage-dark hover:bg-sage-very-light"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Add Afterpay/BNPL
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => addDebtItem("other")}
                    size="sm"
                    className="border-dashed border-sage hover:border-sage-dark hover:bg-sage-very-light"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Add Other Debt
                  </Button>
                </div>
              </div>

              {/* Summary */}
              {debtItems.length > 0 && (
                <div className="bg-blue-light/30 border border-blue-light rounded-lg p-4 space-y-3">
                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-text-medium">Debt Payoff Progress</span>
                      <span className="font-medium text-text-dark">
                        {Math.round(summary.progress_percent)}%
                      </span>
                    </div>
                    <Progress value={summary.progress_percent} className="h-2" />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <span className="text-text-medium block">Total Debt</span>
                      <span className="font-semibold text-text-dark">
                        {formatCurrency(summary.total_debt)}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-medium block">Paid Off</span>
                      <span className="font-semibold text-sage">
                        {formatCurrency(summary.total_paid_off)}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-medium block">Monthly Budget</span>
                      <span className="font-semibold text-text-dark">
                        {formatCurrency(newTotalMinPayments)}/month
                      </span>
                    </div>
                    <div>
                      <span className="text-text-medium block">Debts</span>
                      <span className="font-semibold text-text-dark">
                        {summary.debt_count - summary.paid_off_count} active, {summary.paid_off_count} paid
                      </span>
                    </div>
                  </div>

                  {/* Next to pay off */}
                  {summary.next_to_payoff && (
                    <div className="flex items-center gap-2 pt-2 border-t border-blue-light">
                      <TrendingDown className="h-4 w-4 text-sage" />
                      <span className="text-sm text-text-dark">
                        Focus on: <strong>{summary.next_to_payoff.name}</strong> ({formatCurrency(summary.next_to_payoff.current_balance)})
                      </span>
                    </div>
                  )}

                  {/* Budget change indicator */}
                  {Math.abs(budgetChange) > 0.01 && (
                    <p className="text-sm text-text-medium pt-2">
                      {budgetChange > 0 ? "Increase" : "Decrease"} of{" "}
                      {formatCurrency(Math.abs(budgetChange))}/month from current budget
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-3 justify-end pt-2">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={(!isValid && debtItems.length > 0) || isSaving}
                  className="bg-sage hover:bg-sage-dark"
                >
                  {isSaving ? "Saving..." : "Save Debts"}
                </Button>
              </div>
            </div>
          ) : (
            // Budget change warning
            <div className="space-y-4">
              <div className="bg-gold-light/30 border border-gold rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-gold flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-text-dark">Budget Change Detected</h4>
                    <p className="text-sm text-text-dark mt-1">
                      Your total debt budget{" "}
                      {budgetChange > 0 ? "increased" : "decreased"} by{" "}
                      <strong>{formatCurrency(Math.abs(budgetChange))}/month</strong>.
                    </p>
                    <p className="text-sm text-text-dark mt-2">
                      {budgetChange > 0 ? (
                        <>
                          You'll need to allocate an extra{" "}
                          {formatCurrency(budgetChange)} from your monthly income to cover minimum payments.
                        </>
                      ) : (
                        <>
                          You've freed up {formatCurrency(Math.abs(budgetChange))}/month.
                          Consider rolling this into your next debt or your Safety Net!
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Remy encouragement */}
              <div className="flex items-start gap-3 p-3 bg-sage-very-light rounded-lg border border-sage-light">
                <RemyAvatar pose="small" size="sm" />
                <p className="text-sm text-text-dark">
                  The minimum keeps you afloat, but paying more gets you to shore faster. Even an extra $20 can shave months off your payoff.
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setShowBudgetWarning(false)}>
                  Back
                </Button>
                <Button
                  onClick={handleConfirmSave}
                  disabled={isSaving}
                  className="bg-sage hover:bg-sage-dark"
                >
                  {isSaving ? "Saving..." : "Save & Update Budget"}
                </Button>
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/**
 * Payoff Calculator Component
 * Shows comparison between minimum and increased payments
 */
function PayoffCalculator({
  currentBalance,
  interestRate,
  minimumPayment,
  onPaymentChange,
}: {
  currentBalance: number;
  interestRate: number | null;
  minimumPayment: number;
  onPaymentChange: (payment: number) => void;
}) {
  const [increasedPayment, setIncreasedPayment] = useState(
    Math.ceil(minimumPayment * 2)
  );

  const comparison = useMemo(
    () => comparePayments(currentBalance, interestRate, minimumPayment, increasedPayment),
    [currentBalance, interestRate, minimumPayment, increasedPayment]
  );

  const suggestedPayments = [
    { label: "Minimum", amount: minimumPayment },
    { label: "2x", amount: Math.ceil(minimumPayment * 2) },
    { label: "3x", amount: Math.ceil(minimumPayment * 3) },
  ];

  return (
    <div className="mt-2 p-3 bg-gold-light/20 border border-gold rounded-lg space-y-3">
      <div className="flex items-center gap-2">
        <Calculator className="h-4 w-4 text-gold" />
        <span className="text-sm font-medium text-text-dark">Payoff Calculator</span>
      </div>

      {/* Current projection */}
      {comparison.minimum && (
        <div className="text-sm">
          <p className="text-text-medium">
            At {formatCurrency(minimumPayment)}/month:
          </p>
          <p className="text-text-dark">
            {comparison.minimum.months_to_payoff} months to payoff
            {interestRate && interestRate > 0 && (
              <>, {formatCurrency(comparison.minimum.total_interest)} total interest</>
            )}
          </p>
        </div>
      )}

      {/* Increased payment slider */}
      <div className="space-y-2">
        <Label className="text-xs text-text-medium">What if you paid more?</Label>
        <div className="flex gap-2">
          {suggestedPayments.map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => setIncreasedPayment(opt.amount)}
              className={cn(
                "px-3 py-1 rounded text-xs font-medium transition-colors",
                increasedPayment === opt.amount
                  ? "bg-sage text-white"
                  : "bg-muted/50 text-text-medium hover:bg-muted"
              )}
            >
              {opt.label} ({formatCurrency(opt.amount)})
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-medium">Custom:</span>
          <div className="relative w-24">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-text-medium text-xs">$</span>
            <Input
              type="number"
              step="10"
              min={minimumPayment}
              value={increasedPayment}
              onChange={(e) => setIncreasedPayment(parseFloat(e.target.value) || minimumPayment)}
              className="pl-5 h-7 text-xs text-center"
            />
          </div>
        </div>
      </div>

      {/* Comparison result */}
      {comparison.increased && comparison.minimum && (
        <div className="bg-sage-very-light rounded-lg p-3 space-y-1">
          <p className="text-sm text-text-dark">
            At {formatCurrency(increasedPayment)}/month:
          </p>
          <p className="text-sm font-medium text-sage-dark">
            {comparison.increased.months_to_payoff} months ({comparison.months_saved} months faster!)
          </p>
          {interestRate && interestRate > 0 && comparison.interest_saved > 0 && (
            <p className="text-sm text-sage-dark">
              Save {formatCurrency(comparison.interest_saved)} in interest!
            </p>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPaymentChange(minimumPayment)}
        >
          Use Minimum
        </Button>
        <Button
          size="sm"
          className="bg-sage hover:bg-sage-dark"
          onClick={() => onPaymentChange(increasedPayment)}
        >
          Use {formatCurrency(increasedPayment)}
        </Button>
      </div>
    </div>
  );
}
