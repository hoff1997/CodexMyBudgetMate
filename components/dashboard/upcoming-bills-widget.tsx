"use client";

import { useMemo } from "react";
import { formatCurrency } from "@/lib/finance";
import { EnvelopeIcon } from "@/components/shared/envelope-icon";
import {
  calculateEnvelopePrediction,
  type Envelope,
  type RecurringIncome,
  type EnvelopePrediction,
} from "@/lib/cashflow-calculator";
import { format, addDays, differenceInDays } from "date-fns";
import { EnvelopeProgressBar } from "@/components/envelope-planning/envelope-progress-bar";
import { Button } from "@/components/ui/button";
import { AlertCircle, Calendar, ChevronRight } from "lucide-react";
import Link from "next/link";

type UpcomingBillsWidgetProps = {
  envelopes: Envelope[];
  recurringIncomes: RecurringIncome[];
  envelopeBalances: Map<string, number>;
};

type UpcomingBill = {
  envelope: Envelope;
  prediction: EnvelopePrediction;
  daysUntil: number;
};

export function UpcomingBillsWidget({
  envelopes,
  recurringIncomes,
  envelopeBalances,
}: UpcomingBillsWidgetProps) {
  // Calculate predictions and filter for upcoming bills
  const upcomingBills = useMemo(() => {
    const bills: UpcomingBill[] = [];

    for (const envelope of envelopes) {
      // Only process envelopes with due dates
      if (!envelope.due_date) continue;

      const daysUntil = differenceInDays(new Date(envelope.due_date), new Date());

      // Only show bills within next 30 days
      if (daysUntil < 0 || daysUntil > 30) continue;

      const currentBalance = envelopeBalances.get(envelope.id) || 0;
      const prediction = calculateEnvelopePrediction(
        envelope,
        recurringIncomes,
        currentBalance,
        addDays(new Date(), 30)
      );

      bills.push({
        envelope,
        prediction,
        daysUntil,
      });
    }

    // Sort by days until due (soonest first)
    return bills.sort((a, b) => a.daysUntil - b.daysUntil);
  }, [envelopes, recurringIncomes, envelopeBalances]);

  // Separate into next 7 days and next 30 days
  const next7Days = upcomingBills.filter((b) => b.daysUntil <= 7);
  const next30Days = upcomingBills.filter((b) => b.daysUntil > 7 && b.daysUntil <= 30);

  // Count critical/behind bills
  const criticalCount = upcomingBills.filter((b) => b.prediction.status === "critical").length;
  const behindCount = upcomingBills.filter((b) => b.prediction.status === "behind").length;

  if (upcomingBills.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-secondary">Upcoming Bills</h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/timeline">
              View Timeline <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
        <div className="text-center py-8 text-muted-foreground">
          <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No bills due in the next 30 days</p>
          <p className="text-sm mt-1">Add bills with due dates in your envelope planning</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-secondary">Upcoming Bills</h2>
          <p className="text-sm text-muted-foreground">
            {upcomingBills.length} bill{upcomingBills.length !== 1 ? "s" : ""} in next 30 days
          </p>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/timeline">
            View Timeline <ChevronRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      </div>

      {/* Warning Banner */}
      {(criticalCount > 0 || behindCount > 0) && (
        <div
          className={`rounded-lg border p-3 mb-4 ${
            criticalCount > 0
              ? "border-red-200 bg-red-50"
              : "border-yellow-200 bg-yellow-50"
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertCircle
              className={`h-5 w-5 ${criticalCount > 0 ? "text-red-600" : "text-yellow-600"}`}
            />
            <div className="flex-1">
              <p
                className={`text-sm font-semibold ${
                  criticalCount > 0 ? "text-red-900" : "text-yellow-900"
                }`}
              >
                {criticalCount > 0
                  ? `${criticalCount} bill${criticalCount !== 1 ? "s" : ""} critically underfunded`
                  : `${behindCount} bill${behindCount !== 1 ? "s" : ""} behind schedule`}
              </p>
              <p
                className={`text-xs ${
                  criticalCount > 0 ? "text-red-700" : "text-yellow-700"
                }`}
              >
                Review your envelope plan to avoid shortfalls
              </p>
            </div>
            <Button asChild size="sm" variant={criticalCount > 0 ? "destructive" : "default"}>
              <Link href="/envelope-planning">Adjust Plan</Link>
            </Button>
          </div>
        </div>
      )}

      {/* Next 7 Days */}
      {next7Days.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-secondary mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Next 7 Days
          </h3>
          <div className="space-y-3">
            {next7Days.map((bill) => (
              <BillItem key={bill.envelope.id} bill={bill} />
            ))}
          </div>
        </div>
      )}

      {/* Next 30 Days */}
      {next30Days.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-secondary mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Next 8-30 Days
          </h3>
          <div className="space-y-3">
            {next30Days.slice(0, 5).map((bill) => (
              <BillItem key={bill.envelope.id} bill={bill} />
            ))}
            {next30Days.length > 5 && (
              <div className="text-center pt-2">
                <Button asChild variant="ghost" size="sm">
                  <Link href="/timeline">
                    View {next30Days.length - 5} more bills <ChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BillItem({ bill }: { bill: UpcomingBill }) {
  const { envelope, prediction, daysUntil } = bill;

  // Format days until message
  const daysMessage =
    daysUntil === 0
      ? "Due today!"
      : daysUntil === 1
      ? "Due tomorrow"
      : `Due in ${daysUntil} days`;

  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <EnvelopeIcon icon={envelope.icon || "wallet"} size={28} />
          <div>
            <h4 className="font-medium text-secondary">{envelope.name}</h4>
            <p className="text-xs text-muted-foreground">
              {envelope.due_date && format(new Date(envelope.due_date), "MMM d, yyyy")} ·{" "}
              {daysMessage}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-secondary">
            {formatCurrency(envelope.bill_amount || envelope.target_amount || 0)}
          </p>
        </div>
      </div>

      <EnvelopeProgressBar prediction={prediction} compact showDetails={false} />

      {/* Quick status message */}
      <div className="mt-2 text-xs">
        {prediction.status === "critical" && (
          <p className="text-red-600 font-medium">
            ⚠️ SHORT {formatCurrency(Math.abs(prediction.gap))} - Even with future income
          </p>
        )}
        {prediction.status === "behind" && prediction.gap > 0 && (
          <p className="text-yellow-600 font-medium">
            Need {formatCurrency(Math.abs(prediction.gap))} more by due date
          </p>
        )}
        {prediction.status === "on_track" && (
          <p className="text-green-600 font-medium">✓ Will be fully funded on time</p>
        )}
      </div>
    </div>
  );
}
