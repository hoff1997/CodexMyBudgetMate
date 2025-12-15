"use client";

/**
 * Envelope Transfer Dialog
 *
 * Compact two-tab interface for transferring funds between envelopes:
 * - Smart Fill: Auto-distribute surplus to shortfalls by priority (batch)
 * - Manual Transfer: Single source dropdown with per-row Transfer buttons
 *
 * Redesigned for space efficiency:
 * - Each envelope = ONE row (~40px height)
 * - 10-15 envelopes visible without scrolling
 * - Priority grouping within tables
 */

import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useState } from "react";
import type { SummaryEnvelope } from "@/components/layout/envelopes/envelope-summary-card";
import type { TransferHistoryItem } from "@/lib/types/envelopes";
import { CompactSmartFill } from "@/components/transfers/compact-smart-fill";
import { CompactManualTransfer } from "@/components/transfers/compact-manual-transfer";
import { cn } from "@/lib/cn";
import { toast } from "sonner";
import { X, Sparkles, ArrowRightLeft } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  envelopes: SummaryEnvelope[];
  defaultFromId?: string;
  defaultToId?: string;
  defaultAmount?: number;
  history?: TransferHistoryItem[];
  onTransferComplete?: () => void;
}

type TabType = "smart-fill" | "manual";

export function EnvelopeTransferDialog({
  open,
  onOpenChange,
  envelopes,
  defaultFromId,
  defaultToId,
  defaultAmount,
  history,
  onTransferComplete,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabType>("smart-fill");
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    if (!open) return;
    // Reset to smart-fill tab when dialog opens
    setActiveTab("smart-fill");
  }, [open]);

  // Handle Smart Fill batch transfers
  async function handleSmartFillApply(
    transfers: Array<{ fromId: string; toId: string; amount: number }>
  ) {
    setIsApplying(true);
    try {
      const response = await fetch("/api/envelopes/transfer/batch", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transfers,
          note: "Smart Fill transfer",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error ?? "Transfer failed");
        return;
      }

      if (data.summary.failed > 0) {
        toast.warning(
          `${data.summary.successful} transfers completed, ${data.summary.failed} failed`
        );
      } else {
        toast.success(`Successfully transferred funds to ${data.summary.successful} envelopes`);
      }

      onTransferComplete?.();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to apply transfers");
    } finally {
      setIsApplying(false);
    }
  }

  // Handle single Manual transfer
  async function handleManualTransfer(fromId: string, toId: string, amount: number) {
    const response = await fetch("/api/envelopes/transfer", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fromId,
        toId,
        amount: Number(amount.toFixed(2)),
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({ error: "Transfer failed" }));
      throw new Error(data.error ?? "Transfer failed");
    }

    onTransferComplete?.();
  }

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(value) => {
        onOpenChange(value);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Dialog.Content className="fixed inset-0 z-50 flex items-start justify-center px-4 py-6 overflow-y-auto">
          <div className="w-full max-w-3xl rounded-2xl border border-silver-light bg-background shadow-xl my-4">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-silver-light">
              <Dialog.Title className="text-lg font-semibold text-text-dark">
                Transfer Funds
              </Dialog.Title>
              <Dialog.Close asChild>
                <button
                  className="rounded-full p-1.5 text-text-medium hover:bg-silver-very-light transition"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </Dialog.Close>
            </div>

            {/* Tab Bar */}
            <div className="px-6 pt-3">
              <div className="flex gap-1 border-b border-silver-light">
                <TabButton
                  active={activeTab === "smart-fill"}
                  onClick={() => setActiveTab("smart-fill")}
                  icon={<Sparkles className="h-4 w-4" />}
                >
                  Smart Fill
                </TabButton>
                <TabButton
                  active={activeTab === "manual"}
                  onClick={() => setActiveTab("manual")}
                  icon={<ArrowRightLeft className="h-4 w-4" />}
                >
                  Manual Transfer
                </TabButton>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-4">
              {activeTab === "smart-fill" ? (
                <CompactSmartFill
                  envelopes={envelopes}
                  onApplyTransfers={handleSmartFillApply}
                  onSwitchToManual={() => setActiveTab("manual")}
                  isApplying={isApplying}
                  onClose={handleClose}
                />
              ) : (
                <CompactManualTransfer
                  envelopes={envelopes}
                  onTransfer={handleManualTransfer}
                  onSwitchToSmartFill={() => setActiveTab("smart-fill")}
                  onClose={handleClose}
                />
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 text-sm font-medium transition border-b-2 -mb-px",
        active
          ? "border-sage text-sage-dark"
          : "border-transparent text-text-medium hover:text-text-dark hover:border-silver"
      )}
    >
      {icon}
      {children}
    </button>
  );
}
