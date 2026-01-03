"use client";

/**
 * Reconciliation Alert Widget
 *
 * Shows count of pending transactions needing reconciliation
 * with a link to the reconcile page.
 */

import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, CheckCircle, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";

interface ReconciliationAlertWidgetProps {
  pendingCount: number;
}

export function ReconciliationAlertWidget({
  pendingCount,
}: ReconciliationAlertWidgetProps) {
  const hasPending = pendingCount > 0;

  return (
    <Link href="/reconcile">
      <Card className={cn(
        "transition-colors cursor-pointer",
        hasPending
          ? "border-[#6B9ECE]/30 bg-[#DDEAF5]/30 hover:bg-[#DDEAF5]/50"
          : "border-[#B8D4D0]/30 bg-[#E2EEEC]/30 hover:bg-[#E2EEEC]/50"
      )}>
        <CardContent className="py-3 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-full",
                hasPending ? "bg-[#6B9ECE]/20" : "bg-[#7A9E9A]/20"
              )}>
                {hasPending ? (
                  <AlertCircle className="h-4 w-4 text-[#6B9ECE]" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-[#7A9E9A]" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-[#3D3D3D]">
                  {hasPending
                    ? `${pendingCount} item${pendingCount === 1 ? "" : "s"} to reconcile`
                    : "All caught up"}
                </p>
                <p className="text-xs text-[#6B6B6B]">
                  {hasPending
                    ? "Transactions waiting for review"
                    : "No transactions need review"}
                </p>
              </div>
            </div>
            <ChevronRight className={cn(
              "h-5 w-5",
              hasPending ? "text-[#6B9ECE]" : "text-[#7A9E9A]"
            )} />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
