"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/finance";

interface Envelope {
  id: string;
  name: string;
  envelope_type?: string;
  target_amount?: number | string;
  current_amount?: number | string;
  pay_cycle_amount?: number | string;
}

interface AllocationProposal {
  envelopeId: string;
  envelopeName: string;
  currentAmount: number;
  targetAmount: number;
  shortfall: number;
  proposedAllocation: number;
}

interface Props {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  surplus: number;
  envelopes: Envelope[];
  onConfirm: (allocations: AllocationProposal[]) => Promise<void>;
}

export function AutoAllocateDialog({
  open,
  onOpenChange,
  surplus,
  envelopes,
  onConfirm,
}: Props) {
  const [allocating, setAllocating] = useState(false);

  // Calculate proposed allocations
  const proposals: AllocationProposal[] = [];
  let remainingSurplus = surplus;

  // First, find all envelopes with shortfalls
  const expenseEnvelopes = envelopes
    .filter((env) => env.envelope_type === "expense")
    .map((env) => {
      const current = Number(env.current_amount ?? 0);
      const target = Number(env.target_amount ?? 0);
      const shortfall = Math.max(0, target - current);
      return { ...env, current, target, shortfall };
    })
    .filter((env) => env.shortfall > 0)
    .sort((a, b) => b.shortfall - a.shortfall); // Prioritize largest shortfalls

  // Allocate surplus to envelopes with shortfalls
  for (const envelope of expenseEnvelopes) {
    if (remainingSurplus <= 0) break;

    const allocation = Math.min(envelope.shortfall, remainingSurplus);
    if (allocation > 0) {
      proposals.push({
        envelopeId: envelope.id,
        envelopeName: envelope.name,
        currentAmount: envelope.current,
        targetAmount: envelope.target,
        shortfall: envelope.shortfall,
        proposedAllocation: allocation,
      });
      remainingSurplus -= allocation;
    }
  }

  const handleConfirm = async () => {
    setAllocating(true);
    try {
      await onConfirm(proposals);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to allocate surplus:", error);
    } finally {
      setAllocating(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40" />
        <Dialog.Content className="fixed inset-0 flex items-center justify-center px-4 py-10">
          <div className="w-full max-w-2xl space-y-5 rounded-3xl border bg-background p-6 shadow-xl">
            <Dialog.Title className="text-lg font-semibold text-secondary">
              Auto-Allocate Surplus
            </Dialog.Title>
            <Dialog.Description className="text-sm text-muted-foreground">
              You have a surplus of {formatCurrency(surplus)}. Here's how it can be automatically
              distributed to envelopes with shortfalls:
            </Dialog.Description>

            {proposals.length === 0 ? (
              <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                No envelopes have shortfalls. Your budget is fully funded!
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-sm font-medium text-secondary">
                  Proposed Allocations:
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {proposals.map((proposal) => (
                    <div
                      key={proposal.envelopeId}
                      className="flex items-center justify-between rounded-lg border bg-card p-3 text-sm"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-secondary truncate">
                          {proposal.envelopeName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Current: {formatCurrency(proposal.currentAmount)} → Target:{" "}
                          {formatCurrency(proposal.targetAmount)}
                        </div>
                        <div className="text-xs text-rose-600">
                          Shortfall: {formatCurrency(proposal.shortfall)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <div className="text-sm font-semibold text-emerald-600">
                            +{formatCurrency(proposal.proposedAllocation)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            New: {formatCurrency(proposal.currentAmount + proposal.proposedAllocation)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between rounded-lg border-2 border-primary/20 bg-primary/5 p-3">
                  <span className="text-sm font-medium">Total Allocated:</span>
                  <span className="text-lg font-bold text-primary">
                    {formatCurrency(surplus - remainingSurplus)}
                  </span>
                </div>

                {remainingSurplus > 0 && (
                  <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-700">
                    Remaining surplus: {formatCurrency(remainingSurplus)} (all shortfalls have been
                    covered)
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              {proposals.length > 0 && (
                <Button type="button" onClick={handleConfirm} disabled={allocating}>
                  {allocating ? "Allocating…" : "Confirm Allocation"}
                </Button>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
