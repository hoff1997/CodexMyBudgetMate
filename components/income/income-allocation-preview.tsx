"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AllocationItem {
  envelope_id: string;
  envelope_name: string;
  envelope_priority: string;
  current_balance: number;
  allocation_amount: number;
  is_overspent: boolean;
  overspent_amount: number | null;
}

interface AllocationPreview {
  matched: boolean;
  income_source?: {
    id: string;
    name: string;
    pay_cycle: string;
    typical_amount: number | null;
  };
  actual_amount: number;
  expected_amount: number;
  variance: number;
  allocations: AllocationItem[];
  surplus: {
    amount: number;
    envelope_id: string | null;
    envelope_name: string;
  };
  total_allocated: number;
}

interface IncomeAllocationPreviewProps {
  transactionId: string;
  transactionDescription: string;
  transactionAmount: number;
  onApprove: () => void;
  onSkip: () => void;
}

export function IncomeAllocationPreview({
  transactionId,
  transactionDescription,
  transactionAmount,
  onApprove,
  onSkip,
}: IncomeAllocationPreviewProps) {
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<AllocationPreview | null>(null);
  const [editedAllocations, setEditedAllocations] = useState<Array<{ envelope_id: string; amount: number }>>([]);
  const [saveChanges, setSaveChanges] = useState(false);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    detectIncome();
  }, [transactionId]);

  async function detectIncome() {
    setLoading(true);
    try {
      const response = await fetch("/api/income-detection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transaction_id: transactionId,
          transaction_description: transactionDescription,
          transaction_amount: transactionAmount,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setPreview(data);

        if (data.matched) {
          // Initialize edited allocations with current values
          setEditedAllocations(
            data.allocations.map((a: AllocationItem) => ({
              envelope_id: a.envelope_id,
              amount: a.allocation_amount,
            }))
          );
        }
      }
    } catch (error) {
      console.error("Failed to detect income:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove() {
    if (!preview?.matched || !preview.income_source) return;

    setApproving(true);
    try {
      const totalAllocated = editedAllocations.reduce((sum, a) => sum + a.amount, 0);
      const surplusAmount = transactionAmount - totalAllocated;

      const response = await fetch("/api/income-allocation/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          income_source_id: preview.income_source.id,
          transaction_id: transactionId,
          transaction_amount: transactionAmount,
          allocations: editedAllocations,
          surplus_amount: surplusAmount,
          surplus_envelope_id: preview.surplus.envelope_id,
          save_changes_to_plan: saveChanges,
        }),
      });

      if (response.ok) {
        onApprove();
      } else {
        const error = await response.json();
        alert(`Failed to approve allocation: ${error.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error approving allocation:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setApproving(false);
    }
  }

  function handleAmountChange(envelopeId: string, newAmount: number) {
    setEditedAllocations((prev) =>
      prev.map((a) =>
        a.envelope_id === envelopeId ? { ...a, amount: newAmount } : a
      )
    );
  }

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">Detecting income source...</p>
        </CardContent>
      </Card>
    );
  }

  if (!preview?.matched) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Unmatched Income Transaction</CardTitle>
          <CardDescription>
            This transaction doesn&apos;t match any existing income sources
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <p className="text-sm">
              <span className="font-medium">Amount:</span> {formatCurrency(transactionAmount)}
            </p>
            <p className="text-sm">
              <span className="font-medium">Description:</span> {transactionDescription}
            </p>
          </div>

          <p className="text-sm text-muted-foreground">
            You can set up an income source in the Income & Allocation page to automatically
            allocate future income.
          </p>

          <div className="flex gap-4">
            <Button variant="outline" onClick={onSkip} className="flex-1">
              Skip Auto-Allocation
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalEdited = editedAllocations.reduce((sum, a) => sum + a.amount, 0);
  const surplusEdited = transactionAmount - totalEdited;
  const hasChanges = editedAllocations.some((edited, index) => {
    const original = preview.allocations[index];
    return edited.amount !== original?.allocation_amount;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Income Allocated: {formatCurrency(transactionAmount)} from {preview.income_source?.name}</CardTitle>
        <CardDescription>
          Expected: {formatCurrency(preview.expected_amount)} | Actual: {formatCurrency(preview.actual_amount)} |
          Δ {preview.variance >= 0 ? "+" : ""}{formatCurrency(preview.variance)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium">Proposed Allocation:</h3>
            {hasChanges && (
              <span className="text-xs text-amber-600 font-medium">Modified</span>
            )}
          </div>

          <div className="space-y-2">
            {preview.allocations.map((alloc, index) => {
              const editedAmount = editedAllocations.find(
                (e) => e.envelope_id === alloc.envelope_id
              )?.amount || 0;

              return (
                <div
                  key={alloc.envelope_id}
                  className="flex items-center gap-3 p-3 bg-muted rounded-lg"
                >
                  <div className="flex-1">
                    <span className="font-medium text-sm">{alloc.envelope_name}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      ({alloc.envelope_priority})
                    </span>
                  </div>
                  <div className="relative w-28">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      $
                    </span>
                    <Input
                      type="number"
                      value={editedAmount || ""}
                      onChange={(e) =>
                        handleAmountChange(
                          alloc.envelope_id,
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="pl-6 h-9 text-sm"
                    />
                  </div>
                  <span className="text-green-600 text-lg">✓</span>
                </div>
              );
            })}

            {/* Surplus */}
            <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex-1">
                <span className="font-medium text-sm">{preview.surplus.envelope_name}</span>
                {surplusEdited !== preview.surplus.amount && (
                  <span className="text-xs text-amber-600 ml-2">
                    (was {formatCurrency(preview.surplus.amount)})
                  </span>
                )}
              </div>
              <div className="w-28 text-right">
                <span className="font-semibold text-green-600">
                  {formatCurrency(surplusEdited)}
                </span>
              </div>
              <span className="text-green-600 text-lg">✓</span>
            </div>
          </div>

          <div className="flex justify-between text-sm font-semibold mt-3 pt-3 border-t">
            <span>Total:</span>
            <span>{formatCurrency(transactionAmount)}</span>
          </div>
        </div>

        {/* Warnings */}
        {surplusEdited < 0 && (
          <Alert variant="destructive">
            <AlertDescription>
              Total allocations exceed income by {formatCurrency(Math.abs(surplusEdited))}.
              Please reduce some allocations.
            </AlertDescription>
          </Alert>
        )}

        {hasChanges && (
          <Alert>
            <AlertDescription className="flex items-center gap-2">
              <Checkbox
                id="saveChanges"
                checked={saveChanges}
                onCheckedChange={(checked) => setSaveChanges(checked === true)}
              />
              <label htmlFor="saveChanges" className="text-sm cursor-pointer">
                Save these changes to your allocation plan for {preview.income_source?.name}
              </label>
            </AlertDescription>
          </Alert>
        )}

        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm space-y-1">
          <p>💡 Tip: You can adjust amounts now. The total must equal {formatCurrency(transactionAmount)}.</p>
          {hasChanges && saveChanges && (
            <p className="text-blue-700">
              ✅ Your changes will be saved and used for future {preview.income_source?.name} allocations.
            </p>
          )}
        </div>

        <div className="flex gap-4">
          <Button variant="outline" onClick={onSkip} disabled={approving}>
            Skip
          </Button>
          <Button
            onClick={handleApprove}
            disabled={approving || surplusEdited < 0}
            className="flex-1"
          >
            {approving ? "Approving..." : "Approve & Allocate"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
