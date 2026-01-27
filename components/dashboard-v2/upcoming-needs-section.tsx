"use client";

/**
 * Upcoming Needs Section (Dashboard V2)
 *
 * Table-based layout matching Envelope Summary page styling.
 * 8 columns: Pri | Bill + Amount | Progress | Current | Due Date | Due In | Status | Gap
 *
 * Uses "Pays Until Due" calculation to show urgency.
 */

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronRight, CheckCircle } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/finance";
import { EnvelopeIcon } from "@/components/shared/envelope-icon";
import { format, differenceInDays } from "date-fns";
import { cn } from "@/lib/cn";
import { getProgressColor } from "@/lib/utils/progress-colors";
import {
  getPrimaryPaySchedule,
  calculatePaysUntilDue,
  type PaySchedule,
} from "@/lib/utils/pays-until-due";

export interface UpcomingBill {
  id: string;
  name: string;
  icon?: string;
  dueDate: Date;
  targetAmount: number;
  currentAmount: number;
  frequency?: string;
  priority?: string;
}

export interface IncomeSource {
  id: string;
  name: string;
  nextPayDate?: string | null;
  frequency?: string | null;
  isActive?: boolean;
}

interface UpcomingNeedsSectionProps {
  bills: UpcomingBill[];
  incomeSources?: IncomeSource[];
}

type PriorityLevel = "essential" | "important" | "discretionary";

interface ProcessedBill extends UpcomingBill {
  daysUntil: number;
  fundingPercent: number;
  gap: number;
  status: "funded" | "on_track" | "attention";
  paysUntilDue: number | null;
}

const PRIORITY_CONFIG: Record<PriorityLevel, { dotColor: string; label: string }> = {
  essential: { dotColor: "bg-[#5A7E7A]", label: "Essential" },      // sage-dark
  important: { dotColor: "bg-[#9CA3AF]", label: "Important" },      // silver
  discretionary: { dotColor: "bg-[#6B9ECE]", label: "Flexible" },   // blue
};

export function UpcomingNeedsSection({ bills, incomeSources }: UpcomingNeedsSectionProps) {
  // Get pay schedule for "Pays Until Due" calculation
  const paySchedule = useMemo(() => {
    // Filter and transform income sources to match expected type
    const validSources = (incomeSources ?? [])
      .filter((s) => s.nextPayDate != null)
      .map((s) => ({
        nextPayDate: s.nextPayDate!,
        frequency: s.frequency ?? undefined,
        isActive: s.isActive,
      }));
    return getPrimaryPaySchedule(validSources);
  }, [incomeSources]);

  const processedBills = useMemo(() => {
    const today = new Date();

    return bills
      .map((bill): ProcessedBill => {
        const daysUntil = differenceInDays(bill.dueDate, today);
        const fundingPercent =
          bill.targetAmount > 0
            ? Math.min(100, (bill.currentAmount / bill.targetAmount) * 100)
            : 100;
        const gap = Math.max(0, bill.targetAmount - bill.currentAmount);

        // Determine status
        let status: "funded" | "on_track" | "attention" = "attention";
        if (fundingPercent >= 100) {
          status = "funded";
        } else if (fundingPercent >= 80) {
          status = "on_track";
        }

        // Calculate pays until due
        const isFunded = fundingPercent >= 100;
        const paysUntilDueResult = paySchedule
          ? calculatePaysUntilDue(bill.dueDate, paySchedule, isFunded)
          : null;
        const paysUntilDue = paysUntilDueResult?.pays ?? null;

        return {
          ...bill,
          daysUntil,
          fundingPercent,
          gap,
          status,
          paysUntilDue,
        };
      })
      .filter((bill) => bill.daysUntil >= 0 && bill.daysUntil <= 30)
      .sort((a, b) => a.daysUntil - b.daysUntil);
  }, [bills, paySchedule]);

  // Count attention items
  const attentionCount = processedBills.filter((b) => b.status === "attention").length;

  if (processedBills.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-text-dark flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-text-medium" />
              <span>Upcoming Bills</span>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/envelope-planning">
                View Planner <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-text-medium">
            <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>No upcoming bills in the next 30 days</p>
            <p className="text-xs mt-1 text-text-light">
              Add due dates to your envelopes to see them here
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-text-dark flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-text-medium" />
            <span>Upcoming Bills</span>
            {attentionCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-light/30 text-blue">
                {attentionCount} need{attentionCount === 1 ? "s" : ""} attention
              </span>
            )}
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/envelope-planning">
              View Planner <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0 overflow-x-auto">
        {/* Table Header */}
        <div
          className="grid items-center px-3 py-2 bg-silver-very-light/70 border-b border-silver-light text-[10px] font-semibold uppercase tracking-wide text-text-light min-w-0"
          style={{
            gridTemplateColumns: "28px 1fr 70px 65px 50px 50px 70px 55px",
          }}
        >
          <div className="text-center">Pri</div>
          <div>Bill</div>
          <div className="text-center">Progress</div>
          <div className="text-right">Current</div>
          <div className="text-right">Due</div>
          <div className="text-center">In</div>
          <div className="text-center">Status</div>
          <div className="text-right">Gap</div>
        </div>

        {/* Table Rows */}
        <div className="divide-y divide-silver-light/40">
          {processedBills.map((bill) => (
            <BillRow key={bill.id} bill={bill} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function BillRow({ bill }: { bill: ProcessedBill }) {
  const priority = (bill.priority as PriorityLevel) || "discretionary";
  const priorityConfig = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.discretionary;

  // Days label
  const daysLabel =
    bill.daysUntil === 0
      ? "Today"
      : bill.daysUntil === 1
      ? "Tomorrow"
      : `${bill.daysUntil}d`;

  // Due In badge color based on urgency
  const getDueInBadgeColor = () => {
    if (bill.paysUntilDue === null) {
      return "bg-silver-light text-text-medium";
    }
    if (bill.paysUntilDue <= 1) {
      return "bg-blue-light/30 text-blue font-semibold";
    }
    if (bill.paysUntilDue <= 2) {
      return "bg-sage-light/50 text-sage-dark";
    }
    return "bg-silver-light text-text-medium";
  };

  // Status display
  const getStatusDisplay = () => {
    if (bill.status === "funded") {
      return (
        <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-sage">
          <CheckCircle className="h-3 w-3" />
          Funded
        </span>
      );
    }
    if (bill.status === "on_track") {
      return (
        <span className="text-[10px] font-medium text-sage-dark">On Track</span>
      );
    }
    return (
      <span className="text-[10px] font-medium text-blue">Needs Funds</span>
    );
  };

  return (
    <div
      className="grid items-center px-3 py-2 hover:bg-sage-very-light/30 transition-colors min-w-0"
      style={{
        gridTemplateColumns: "28px 1fr 70px 65px 50px 50px 70px 55px",
        minHeight: "40px",
      }}
    >
      {/* Priority Dot */}
      <div className="flex items-center justify-center">
        <span
          className={cn("w-2.5 h-2.5 rounded-full", priorityConfig.dotColor)}
          title={priorityConfig.label}
        />
      </div>

      {/* Bill Name + Icon + Target */}
      <div className="flex items-center gap-1.5 min-w-0 pr-1">
        <EnvelopeIcon icon={bill.icon || "wallet"} size={18} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-text-dark truncate">{bill.name}</p>
          <p className="text-[10px] text-text-light">{formatCurrency(bill.targetAmount)}</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="flex items-center justify-center gap-1">
        <div className="w-10 h-1.5 bg-silver-very-light rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${Math.min(bill.fundingPercent, 100)}%`,
              backgroundColor: getProgressColor(bill.fundingPercent),
            }}
          />
        </div>
        <span className="text-[10px] text-text-medium w-6 text-right">
          {bill.fundingPercent.toFixed(0)}%
        </span>
      </div>

      {/* Current Amount */}
      <div className="text-right text-xs text-text-dark">
        {formatCurrency(bill.currentAmount)}
      </div>

      {/* Due Date */}
      <div className="text-right">
        <p className="text-[10px] text-text-dark">{format(bill.dueDate, "MMM d")}</p>
      </div>

      {/* Due In (Pays Until Due) */}
      <div className="flex items-center justify-center">
        <span
          className={cn(
            "px-1 py-0.5 rounded-full text-[10px]",
            getDueInBadgeColor()
          )}
        >
          {bill.paysUntilDue !== null ? (
            bill.paysUntilDue <= 0 ? (
              "Now"
            ) : (
              `${bill.paysUntilDue}pay`
            )
          ) : (
            daysLabel
          )}
        </span>
      </div>

      {/* Status */}
      <div className="flex items-center justify-center">
        {getStatusDisplay()}
      </div>

      {/* Gap */}
      <div className="text-right">
        {bill.gap > 0 ? (
          <span className="text-xs font-medium text-blue">
            -{formatCurrency(bill.gap)}
          </span>
        ) : (
          <span className="text-[10px] text-text-light">—</span>
        )}
      </div>
    </div>
  );
}
