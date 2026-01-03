"use client";

/**
 * Quick Glance Widget
 *
 * Shows watched/monitored envelopes for quick spending decisions.
 * Features:
 * - Compact one-line-per-envelope layout
 * - Settings gear to select which envelopes to watch
 * - Empty state with call to action
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/finance";
import { format } from "date-fns";

interface QuickGlanceEnvelope {
  id: string;
  name: string;
  icon?: string;
  current_amount: number;
  target_amount?: number;
  due_date?: string | null;
  is_monitored?: boolean;
}

interface QuickGlanceWidgetProps {
  envelopes: QuickGlanceEnvelope[];
  needsReconciliation?: boolean;
  onToggleMonitored: (envelopeId: string, isMonitored: boolean) => void;
  surplusAmount?: number;
  ccHoldingAmount?: number;
}

export function QuickGlanceWidget({
  envelopes,
  needsReconciliation = false,
  onToggleMonitored,
  surplusAmount = 0,
  ccHoldingAmount = 0,
}: QuickGlanceWidgetProps) {
  const [selectorOpen, setSelectorOpen] = useState(false);

  const watchedEnvelopes = envelopes.filter((env) => env.is_monitored);

  // Empty state
  if (watchedEnvelopes.length === 0) {
    return (
      <Card className="border-[#E5E7EB]">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-[#3D3D3D]">
              Quick Glance
            </CardTitle>
            <button
              onClick={() => setSelectorOpen(true)}
              className="p-1.5 rounded-md hover:bg-[#F3F4F6] text-[#6B6B6B] transition-colors"
              title="Choose envelopes to watch"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="text-center py-6">
            <p className="text-sm text-[#6B6B6B] mb-3">
              Select envelopes to watch for quick spending decisions.
            </p>
            <Button
              size="sm"
              onClick={() => setSelectorOpen(true)}
              className="bg-[#7A9E9A] hover:bg-[#5A7E7A] text-white"
            >
              Choose Envelopes
            </Button>
          </div>
        </CardContent>

        <EnvelopeSelectorDialog
          open={selectorOpen}
          onOpenChange={setSelectorOpen}
          envelopes={envelopes}
          onToggle={onToggleMonitored}
        />
      </Card>
    );
  }

  return (
    <Card className="border-[#E5E7EB]">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-semibold text-[#3D3D3D]">
              Quick Glance
            </CardTitle>
            {needsReconciliation && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-[#6B9ECE]" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs max-w-[200px]">
                      Your accounts may need reconciling. Balances might not
                      reflect your actual bank balance.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <button
            onClick={() => setSelectorOpen(true)}
            className="p-1.5 rounded-md hover:bg-[#F3F4F6] text-[#6B6B6B] transition-colors"
            title="Choose envelopes to watch"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </CardHeader>
      <CardContent className="pt-0 px-3">
        {/* Table Header */}
        <div className="grid items-center py-1.5 text-[10px] font-semibold uppercase tracking-wide text-text-light border-b border-[#E5E7EB]"
          style={{ gridTemplateColumns: "1fr 60px 60px 50px" }}
        >
          <div>Envelope</div>
          <div className="text-right">Target</div>
          <div className="text-right">Actual</div>
          <div className="text-right">Due</div>
        </div>

        <div className="divide-y divide-[#E5E7EB]">
          {watchedEnvelopes.map((envelope) => {
            const dueDate = envelope.due_date ? new Date(envelope.due_date) : null;
            const isFunded = envelope.target_amount
              ? envelope.current_amount >= envelope.target_amount
              : envelope.current_amount > 0;

            return (
              <div
                key={envelope.id}
                className="grid items-center py-2"
                style={{ gridTemplateColumns: "1fr 60px 60px 50px" }}
              >
                <span className="text-xs text-[#3D3D3D] truncate pr-2">{envelope.name}</span>
                <span className="text-xs text-[#6B6B6B] text-right">
                  {envelope.target_amount ? formatCurrency(envelope.target_amount) : "—"}
                </span>
                <span
                  className={cn(
                    "text-xs font-semibold text-right",
                    isFunded ? "text-[#7A9E9A]" : "text-[#6B9ECE]"
                  )}
                >
                  {formatCurrency(envelope.current_amount)}
                </span>
                <span className="text-[10px] text-[#6B6B6B] text-right">
                  {dueDate ? format(dueDate, "MMM d") : "—"}
                </span>
              </div>
            );
          })}

          {/* Surplus and CC Holding at the bottom */}
          <div className="grid items-center py-2"
            style={{ gridTemplateColumns: "1fr 60px 60px 50px" }}
          >
            <span className="text-xs text-[#6B6B6B]">Surplus</span>
            <span className="text-xs text-[#6B6B6B] text-right">—</span>
            <span className={cn(
              "text-xs font-semibold text-right",
              surplusAmount > 0 ? "text-[#7A9E9A]" : "text-[#9CA3AF]"
            )}>
              {formatCurrency(surplusAmount)}
            </span>
            <span className="text-[10px] text-[#6B6B6B] text-right">—</span>
          </div>
          <div className="grid items-center py-2"
            style={{ gridTemplateColumns: "1fr 60px 60px 50px" }}
          >
            <span className="text-xs text-[#6B6B6B]">CC Holding</span>
            <span className="text-xs text-[#6B6B6B] text-right">—</span>
            <span className={cn(
              "text-xs font-semibold text-right",
              ccHoldingAmount > 0 ? "text-[#7A9E9A]" : "text-[#9CA3AF]"
            )}>
              {formatCurrency(ccHoldingAmount)}
            </span>
            <span className="text-[10px] text-[#6B6B6B] text-right">—</span>
          </div>
        </div>
      </CardContent>

      <EnvelopeSelectorDialog
        open={selectorOpen}
        onOpenChange={setSelectorOpen}
        envelopes={envelopes}
        onToggle={onToggleMonitored}
      />
    </Card>
  );
}

/**
 * Envelope Selector Dialog
 *
 * Modal for selecting which envelopes to watch.
 * Tap-to-toggle design with immediate save.
 */
interface EnvelopeSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  envelopes: QuickGlanceEnvelope[];
  onToggle: (envelopeId: string, isMonitored: boolean) => void;
}

function EnvelopeSelectorDialog({
  open,
  onOpenChange,
  envelopes,
  onToggle,
}: EnvelopeSelectorDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#3D3D3D]">
            Choose envelopes to watch
          </DialogTitle>
          <DialogDescription className="text-[#6B6B6B]">
            Tap to toggle. Changes save automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto py-2">
          {envelopes.map((envelope) => {
            const isSelected = envelope.is_monitored;

            return (
              <button
                key={envelope.id}
                onClick={() => onToggle(envelope.id, !isSelected)}
                className={cn(
                  "flex items-center gap-2 p-3 rounded-lg border text-left transition-colors",
                  isSelected
                    ? "bg-[#E2EEEC] border-[#B8D4D0]"
                    : "bg-[#F9FAFB] border-[#E5E7EB] hover:bg-[#F3F4F6]"
                )}
              >
                {isSelected && (
                  <span className="text-[#7A9E9A] text-sm">&#10003;</span>
                )}
                <span
                  className={cn(
                    "text-sm truncate",
                    isSelected ? "text-[#5A7E7A] font-medium" : "text-[#3D3D3D]"
                  )}
                >
                  {envelope.name}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex justify-end pt-2">
          <Button
            onClick={() => onOpenChange(false)}
            className="bg-[#7A9E9A] hover:bg-[#5A7E7A] text-white"
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
