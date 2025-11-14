"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Check, Edit2, X } from "lucide-react";
import { formatCurrency } from "@/lib/finance";
import { toast } from "sonner";
import { cn } from "@/lib/cn";

type AllocationDetail = {
  envelopeId: string;
  envelopeName: string;
  envelopeIcon: string;
  amount: number;
  priority: "essential" | "important" | "discretionary";
  isRegular: boolean;
};

type AutoAllocatedTransactionRowProps = {
  transaction: {
    id: string;
    amount: number;
    date: string;
    description: string;
    allocationPlanId: string;
  };
  onReconciled?: () => void;
  onRejected?: () => void;
};

export function AutoAllocatedTransactionRow({
  transaction,
  onReconciled,
  onRejected,
}: AutoAllocatedTransactionRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [allocations, setAllocations] = useState<AllocationDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const fetchAllocations = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/allocations/plans/${transaction.allocationPlanId}`
      );
      if (response.ok) {
        const data = await response.json();
        setAllocations(data.allocations || []);
      } else {
        toast.error("Failed to load allocation details");
      }
    } catch (error) {
      console.error("Failed to fetch allocations:", error);
      toast.error("Failed to load allocation details");
    } finally {
      setLoading(false);
    }
  }, [transaction.allocationPlanId]);

  useEffect(() => {
    if (expanded && allocations.length === 0) {
      fetchAllocations();
    }
  }, [expanded, allocations.length, fetchAllocations]);

  async function handleReconcile() {
    setReconciling(true);
    try {
      const response = await fetch(
        `/api/allocations/plans/${transaction.allocationPlanId}/reconcile`,
        {
          method: "POST",
        }
      );

      if (response.ok) {
        const data = await response.json();
        toast.success(
          `✅ Allocated ${formatCurrency(transaction.amount)} across ${data.envelopesAffected || allocations.length} envelopes`
        );
        onReconciled?.();
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.error || "Failed to reconcile allocation");
      }
    } catch (error) {
      console.error("Failed to reconcile:", error);
      toast.error("Failed to reconcile allocation");
    } finally {
      setReconciling(false);
    }
  }

  async function handleReject() {
    if (
      !confirm(
        "Are you sure you want to reject this auto-allocation? The split will be deleted and you can allocate manually."
      )
    ) {
      return;
    }

    setRejecting(true);
    try {
      const response = await fetch(
        `/api/allocations/plans/${transaction.allocationPlanId}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        toast.success("Auto-allocation rejected");
        onRejected?.();
      } else {
        toast.error("Failed to reject allocation");
      }
    } catch (error) {
      console.error("Failed to reject:", error);
      toast.error("Failed to reject allocation");
    } finally {
      setRejecting(false);
    }
  }

  const regularTotal = allocations
    .filter((a) => a.isRegular)
    .reduce((sum, a) => sum + a.amount, 0);
  const surplusTotal = allocations
    .filter((a) => !a.isRegular)
    .reduce((sum, a) => sum + a.amount, 0);

  const byPriority = {
    essential: allocations.filter((a) => a.priority === "essential"),
    important: allocations.filter((a) => a.priority === "important"),
    discretionary: allocations.filter((a) => a.priority === "discretionary"),
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-background p-4 shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className="text-3xl">💰</span>
            <div>
              <p className="font-semibold text-secondary text-lg">
                {formatCurrency(transaction.amount)}
              </p>
              <p className="text-sm text-muted-foreground">
                {transaction.description}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(transaction.date).toLocaleDateString()} · Auto-allocated · Pending approval
              </p>
            </div>
          </div>

          {!expanded && allocations.length === 0 && (
            <div className="mt-3 space-y-1 text-sm">
              <p className="text-muted-foreground">
                Ready to allocate across your envelopes
              </p>
            </div>
          )}

          {!expanded && allocations.length > 0 && (
            <div className="mt-3 space-y-1 text-sm">
              <p className="text-secondary">
                Regular allocations: {formatCurrency(regularTotal)} across{" "}
                {allocations.filter((a) => a.isRegular).length} envelopes
              </p>
              {surplusTotal > 0 && (
                <p className="text-green-600 font-medium">
                  Surplus: {formatCurrency(surplusTotal)}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setExpanded(!expanded)}
            disabled={reconciling || rejecting}
          >
            {expanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Collapse
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Review Split
              </>
            )}
          </Button>
          <Button
            size="sm"
            onClick={handleReconcile}
            disabled={reconciling || rejecting}
            className="gap-2"
          >
            {reconciling && (
              <span className="h-2 w-2 animate-ping rounded-full bg-primary-foreground" />
            )}
            <Check className="h-4 w-4" />
            Reconcile All
          </Button>
        </div>
      </div>

      {/* Expanded Detail */}
      {expanded && (
        <div className="mt-4 space-y-4 border-t border-border/40 pt-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <>
              {/* Essential Envelopes */}
              {byPriority.essential.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-secondary flex items-center gap-2">
                      <span className="text-base">🔴</span>
                      Essential ({byPriority.essential.length} envelopes)
                    </h4>
                    <span className="text-sm font-medium text-secondary">
                      {formatCurrency(
                        byPriority.essential.reduce((sum, a) => sum + a.amount, 0)
                      )}
                    </span>
                  </div>
                  <div className="space-y-1 rounded-lg border border-red-200 bg-red-50 p-3">
                    {byPriority.essential.slice(0, 5).map((alloc) => (
                      <div
                        key={alloc.envelopeId}
                        className="flex items-center justify-between text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{alloc.envelopeIcon}</span>
                          <span className="text-secondary font-medium">
                            {alloc.envelopeName}
                          </span>
                        </div>
                        <span className="font-semibold text-secondary">
                          {formatCurrency(alloc.amount)}
                        </span>
                      </div>
                    ))}
                    {byPriority.essential.length > 5 && (
                      <p className="text-xs text-muted-foreground pt-1">
                        + {byPriority.essential.length - 5} more essential envelopes
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Important Envelopes */}
              {byPriority.important.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-secondary flex items-center gap-2">
                      <span className="text-base">🟡</span>
                      Important ({byPriority.important.length} envelopes)
                    </h4>
                    <span className="text-sm font-medium text-secondary">
                      {formatCurrency(
                        byPriority.important.reduce((sum, a) => sum + a.amount, 0)
                      )}
                    </span>
                  </div>
                  <div className="space-y-1 rounded-lg border border-amber-200 bg-amber-50 p-3">
                    {byPriority.important.slice(0, 5).map((alloc) => (
                      <div
                        key={alloc.envelopeId}
                        className="flex items-center justify-between text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{alloc.envelopeIcon}</span>
                          <span className="text-secondary">
                            {alloc.envelopeName}
                          </span>
                          {!alloc.isRegular && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                              +surplus
                            </span>
                          )}
                        </div>
                        <span className="font-medium text-secondary">
                          {formatCurrency(alloc.amount)}
                        </span>
                      </div>
                    ))}
                    {byPriority.important.length > 5 && (
                      <p className="text-xs text-muted-foreground pt-1">
                        + {byPriority.important.length - 5} more important envelopes
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Discretionary Envelopes */}
              {byPriority.discretionary.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-secondary flex items-center gap-2">
                      <span className="text-base">🔵</span>
                      Discretionary ({byPriority.discretionary.length} envelopes)
                    </h4>
                    <span className="text-sm font-medium text-secondary">
                      {formatCurrency(
                        byPriority.discretionary.reduce((sum, a) => sum + a.amount, 0)
                      )}
                    </span>
                  </div>
                  <div className="space-y-1 rounded-lg border border-blue-200 bg-blue-50 p-3">
                    {byPriority.discretionary.map((alloc) => (
                      <div
                        key={alloc.envelopeId}
                        className="flex items-center justify-between text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{alloc.envelopeIcon}</span>
                          <span className="text-secondary">
                            {alloc.envelopeName}
                          </span>
                        </div>
                        <span className="font-medium text-secondary">
                          {formatCurrency(alloc.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 p-3">
                <span className="font-semibold text-secondary">Total Allocated</span>
                <span className="text-lg font-bold text-primary">
                  {formatCurrency(transaction.amount)}
                </span>
              </div>

              {/* Actions */}
              <div className="flex justify-between items-center gap-2 pt-2 border-t border-border/40">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleReject}
                  disabled={reconciling || rejecting}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  {rejecting && (
                    <span className="h-2 w-2 animate-ping rounded-full bg-red-600 mr-2" />
                  )}
                  <X className="h-4 w-4 mr-1" />
                  Reject Auto-Split
                </Button>

                <Button
                  size="sm"
                  onClick={handleReconcile}
                  disabled={reconciling || rejecting}
                  className="gap-2"
                >
                  {reconciling && (
                    <span className="h-2 w-2 animate-ping rounded-full bg-primary-foreground" />
                  )}
                  <Check className="h-4 w-4" />
                  Reconcile All
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
