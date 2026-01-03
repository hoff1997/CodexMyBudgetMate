"use client";

import { useState, useMemo } from "react";
import { formatCurrency } from "@/lib/finance";
import {
  calculateEnvelopePrediction,
  calculatePayDates,
  type Envelope,
  type RecurringIncome,
  type EnvelopePrediction,
  type FutureIncome,
} from "@/lib/cashflow-calculator";
import { format, startOfDay, addDays, differenceInDays, isSameDay } from "date-fns";
import { EnvelopeProgressBar } from "@/components/envelope-planning/envelope-progress-bar";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, TrendingUp, TrendingDown, Calendar, DollarSign } from "lucide-react";
import Link from "next/link";

type TimelineClientProps = {
  envelopes: Envelope[];
  recurringIncomes: RecurringIncome[];
  envelopeBalances: Map<string, number>;
};

type TimelineEvent = {
  date: Date;
  type: "income" | "bill";
  id: string;
  name: string;
  amount: number;
  icon?: string;
  prediction?: EnvelopePrediction;
  incomeSource?: string;
};

export function TimelineClient({
  envelopes,
  recurringIncomes,
  envelopeBalances,
}: TimelineClientProps) {
  const [timelineRange, setTimelineRange] = useState<30 | 60>(60);

  // Calculate predictions for all envelopes
  const predictions = useMemo(() => {
    const predictionMap = new Map<string, EnvelopePrediction>();

    for (const envelope of envelopes) {
      const currentBalance = envelopeBalances.get(envelope.id) || 0;
      const prediction = calculateEnvelopePrediction(
        envelope,
        recurringIncomes,
        currentBalance,
        addDays(new Date(), timelineRange)
      );
      predictionMap.set(envelope.id, prediction);
    }

    return predictionMap;
  }, [envelopes, recurringIncomes, envelopeBalances, timelineRange]);

  // Generate timeline events
  const timelineEvents = useMemo(() => {
    const events: TimelineEvent[] = [];
    const endDate = addDays(startOfDay(new Date()), timelineRange);

    // Add income events
    for (const income of recurringIncomes) {
      const payDates = calculatePayDates(income.frequency, income.next_date, endDate);

      for (const date of payDates) {
        events.push({
          date,
          type: "income",
          id: `income-${income.id}-${date.getTime()}`,
          name: income.name,
          amount: income.amount,
          incomeSource: income.name,
        });
      }
    }

    // Add bill events (envelopes with due dates)
    for (const envelope of envelopes) {
      if (envelope.due_date) {
        const dueDate = startOfDay(new Date(envelope.due_date));
        const prediction = predictions.get(envelope.id);

        // Only show bills within timeline range
        if (differenceInDays(dueDate, new Date()) <= timelineRange) {
          events.push({
            date: dueDate,
            type: "bill",
            id: `bill-${envelope.id}`,
            name: envelope.name,
            amount: envelope.bill_amount || envelope.target_amount || 0,
            icon: envelope.icon || "💰",
            prediction,
          });
        }
      }
    }

    // Sort by date
    return events.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [envelopes, recurringIncomes, predictions, timelineRange]);

  // Group events by week
  const eventsByWeek = useMemo(() => {
    const weeks = new Map<string, TimelineEvent[]>();

    for (const event of timelineEvents) {
      const weekStart = startOfDay(event.date);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
      const weekKey = format(weekStart, "yyyy-MM-dd");

      if (!weeks.has(weekKey)) {
        weeks.set(weekKey, []);
      }
      weeks.get(weekKey)!.push(event);
    }

    return weeks;
  }, [timelineEvents]);

  // Calculate summary stats
  const summary = useMemo(() => {
    const criticalCount = Array.from(predictions.values()).filter((p) => p.status === "critical").length;
    const behindCount = Array.from(predictions.values()).filter((p) => p.status === "behind").length;
    const onTrackCount = Array.from(predictions.values()).filter((p) => p.status === "on_track").length;

    const totalIncome = timelineEvents.filter((e) => e.type === "income").reduce((sum, e) => sum + e.amount, 0);
    const totalBills = timelineEvents.filter((e) => e.type === "bill").reduce((sum, e) => sum + e.amount, 0);

    const projectedPosition = totalIncome - totalBills;

    return {
      criticalCount,
      behindCount,
      onTrackCount,
      totalIncome,
      totalBills,
      projectedPosition,
    };
  }, [predictions, timelineEvents]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-secondary">Timeline</h1>
          <p className="text-muted-foreground mt-1">
            See your upcoming bills and income, and identify funding gaps before they happen
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={timelineRange === 30 ? "default" : "outline"}
            onClick={() => setTimelineRange(30)}
            size="sm"
          >
            30 Days
          </Button>
          <Button
            variant={timelineRange === 60 ? "default" : "outline"}
            onClick={() => setTimelineRange(60)}
            size="sm"
          >
            60 Days
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Critical Bills */}
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <h3 className="font-semibold text-red-900">Critical</h3>
          </div>
          <p className="text-3xl font-bold text-red-900">{summary.criticalCount}</p>
          <p className="text-sm text-red-700">Bills at risk</p>
        </div>

        {/* Behind Schedule */}
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="h-5 w-5 text-yellow-600" />
            <h3 className="font-semibold text-yellow-900">Behind</h3>
          </div>
          <p className="text-3xl font-bold text-yellow-900">{summary.behindCount}</p>
          <p className="text-sm text-yellow-700">Need attention</p>
        </div>

        {/* On Track */}
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <h3 className="font-semibold text-green-900">On Track</h3>
          </div>
          <p className="text-3xl font-bold text-green-900">{summary.onTrackCount}</p>
          <p className="text-sm text-green-700">Fully funded</p>
        </div>

        {/* Projected Position */}
        <div
          className={`rounded-lg border p-4 ${
            summary.projectedPosition >= 0
              ? "border-green-200 bg-green-50"
              : "border-red-200 bg-red-50"
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <DollarSign
              className={`h-5 w-5 ${summary.projectedPosition >= 0 ? "text-green-600" : "text-red-600"}`}
            />
            <h3
              className={`font-semibold ${summary.projectedPosition >= 0 ? "text-green-900" : "text-red-900"}`}
            >
              Net Position
            </h3>
          </div>
          <p
            className={`text-3xl font-bold ${summary.projectedPosition >= 0 ? "text-green-900" : "text-red-900"}`}
          >
            {formatCurrency(summary.projectedPosition)}
          </p>
          <p className={`text-sm ${summary.projectedPosition >= 0 ? "text-green-700" : "text-red-700"}`}>
            {timelineRange}-day outlook
          </p>
        </div>
      </div>

      {/* Critical Warnings */}
      {summary.criticalCount > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You have {summary.criticalCount} bill(s) that won't be fully funded by their due date, even with
            future income. Review your envelope plan to adjust allocations, find additional income, or reduce
            expenses.{" "}
            <Link href="/envelope-planning" className="underline font-semibold">
              Adjust Plan
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* Timeline by Week */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-secondary">Upcoming Events</h2>

        {Array.from(eventsByWeek.entries()).map(([weekKey, events]) => {
          const weekStart = new Date(weekKey);
          const weekEnd = addDays(weekStart, 6);

          // Calculate week totals
          const weekIncome = events.filter((e) => e.type === "income").reduce((sum, e) => sum + e.amount, 0);
          const weekBills = events.filter((e) => e.type === "bill").reduce((sum, e) => sum + e.amount, 0);
          const weekNet = weekIncome - weekBills;

          return (
            <div key={weekKey} className="rounded-lg border border-border bg-card p-6">
              {/* Week Header */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <h3 className="font-semibold text-secondary">
                      {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {events.filter((e) => e.type === "income").length} income ·{" "}
                      {events.filter((e) => e.type === "bill").length} bills
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Week Net</p>
                  <p
                    className={`text-lg font-bold ${
                      weekNet >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {formatCurrency(weekNet)}
                  </p>
                </div>
              </div>

              {/* Events */}
              <div className="space-y-3">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className={`flex items-start gap-4 p-4 rounded-lg ${
                      event.type === "income"
                        ? "bg-green-50 border border-green-200"
                        : event.prediction?.status === "critical"
                        ? "bg-red-50 border border-red-200"
                        : event.prediction?.status === "behind"
                        ? "bg-yellow-50 border border-yellow-200"
                        : "bg-blue-50 border border-blue-200"
                    }`}
                  >
                    {/* Icon/Date */}
                    <div className="text-center min-w-[60px]">
                      {event.type === "income" ? (
                        <TrendingUp className="h-6 w-6 text-green-600 mx-auto mb-1" />
                      ) : (
                        <span className="text-3xl block mb-1">{event.icon}</span>
                      )}
                      <p className="text-xs font-medium text-muted-foreground">
                        {format(event.date, "MMM d")}
                      </p>
                    </div>

                    {/* Details */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-secondary">{event.name}</h4>
                          {event.type === "income" && (
                            <p className="text-sm text-muted-foreground">
                              From: {event.incomeSource}
                            </p>
                          )}
                        </div>
                        <p
                          className={`text-lg font-bold ${
                            event.type === "income" ? "text-green-600" : "text-secondary"
                          }`}
                        >
                          {event.type === "income" ? "+" : ""}
                          {formatCurrency(event.amount)}
                        </p>
                      </div>

                      {/* Bill Prediction */}
                      {event.type === "bill" && event.prediction && (
                        <div className="mt-3">
                          <EnvelopeProgressBar prediction={event.prediction} showDetails />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Footer */}
      <div className="rounded-lg border border-border bg-muted/30 p-6">
        <h3 className="text-lg font-semibold text-secondary mb-4">
          {timelineRange}-Day Summary
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Total Income</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalIncome)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Total Bills</p>
            <p className="text-2xl font-bold text-secondary">{formatCurrency(summary.totalBills)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Projected Balance</p>
            <p
              className={`text-2xl font-bold ${
                summary.projectedPosition >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatCurrency(summary.projectedPosition)}
            </p>
          </div>
        </div>

        {summary.projectedPosition < 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-sm text-red-600 font-medium">
              ⚠️ Your projected balance is negative. Consider adjusting your envelope plan or finding
              additional income to avoid shortfalls.
            </p>
            <div className="flex gap-2 mt-3">
              <Button asChild size="sm">
                <Link href="/envelope-planning">Adjust Envelope Plan</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
