"use client";

/**
 * Waterfall Preview
 *
 * Simplified visualization of the income allocation flow:
 * Income → Credit Card Holding → Priority Envelopes → Flexible
 *
 * Shows how money flows through the budget system.
 */

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  ChevronRight,
  DollarSign,
  CreditCard,
  Target,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/finance";
import { cn } from "@/lib/cn";

export interface WaterfallData {
  totalIncome: number;
  creditCardHolding: number;
  priorityEnvelopes: number;
  flexibleEnvelopes: number;
  remaining: number;
}

interface WaterfallPreviewProps {
  data: WaterfallData;
}

interface FlowStep {
  id: string;
  label: string;
  amount: number;
  icon: typeof DollarSign;
  colorClass: string;
  bgClass: string;
  description: string;
}

export function WaterfallPreview({ data }: WaterfallPreviewProps) {
  const steps = useMemo((): FlowStep[] => {
    return [
      {
        id: "income",
        label: "Income",
        amount: data.totalIncome,
        icon: DollarSign,
        colorClass: "text-sage",
        bgClass: "bg-sage-light/30",
        description: "Monthly income",
      },
      {
        id: "cc-holding",
        label: "CC Holding",
        amount: data.creditCardHolding,
        icon: CreditCard,
        colorClass: "text-blue",
        bgClass: "bg-blue-light/30",
        description: "Credit card payments",
      },
      {
        id: "priority",
        label: "Priority",
        amount: data.priorityEnvelopes,
        icon: Target,
        colorClass: "text-gold",
        bgClass: "bg-gold-light/30",
        description: "Essential bills",
      },
      {
        id: "flexible",
        label: "Flexible",
        amount: data.flexibleEnvelopes,
        icon: Sparkles,
        colorClass: "text-text-medium",
        bgClass: "bg-silver-light/50",
        description: "Nice-to-haves",
      },
    ];
  }, [data]);

  // Calculate percentages for visual width
  const maxAmount = Math.max(...steps.map((s) => s.amount), 1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-text-dark flex items-center justify-between">
          <span>Allocation Flow</span>
          <Button asChild variant="ghost" size="sm">
            <Link href="/allocation">
              Full View <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </CardTitle>
      </CardHeader>

      <CardContent>
        {/* Desktop: Horizontal Flow */}
        <div className="hidden md:block">
          <div className="flex items-stretch gap-2">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const widthPercent = Math.max(15, (step.amount / maxAmount) * 100);

              return (
                <div key={step.id} className="flex items-center">
                  <div
                    className={cn(
                      "rounded-lg p-3 transition-all",
                      step.bgClass
                    )}
                    style={{ minWidth: `${Math.max(100, widthPercent * 1.5)}px` }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={cn("h-4 w-4", step.colorClass)} />
                      <span className="text-xs font-medium text-text-medium">
                        {step.label}
                      </span>
                    </div>
                    <p className={cn("text-lg font-bold", step.colorClass)}>
                      {formatCurrency(step.amount)}
                    </p>
                    <p className="text-[10px] text-text-light">
                      {step.description}
                    </p>
                  </div>

                  {index < steps.length - 1 && (
                    <ArrowRight className="h-5 w-5 text-text-light mx-1 flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Remaining indicator */}
          {data.remaining !== 0 && (
            <div className={cn(
              "mt-3 p-2 rounded-lg text-sm flex items-center justify-between",
              data.remaining > 0 ? "bg-sage-light/20 text-sage" : "bg-blue-light/20 text-blue"
            )}>
              <span className="font-medium">
                {data.remaining > 0 ? "Unallocated" : "Over-allocated"}
              </span>
              <span className="font-bold">{formatCurrency(Math.abs(data.remaining))}</span>
            </div>
          )}
        </div>

        {/* Mobile: Vertical Flow */}
        <div className="md:hidden space-y-2">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const widthPercent = Math.max(30, (step.amount / maxAmount) * 100);

            return (
              <div key={step.id}>
                <div
                  className={cn(
                    "rounded-lg p-3 relative overflow-hidden",
                    step.bgClass
                  )}
                >
                  {/* Background width indicator */}
                  <div
                    className={cn(
                      "absolute inset-y-0 left-0 opacity-20",
                      step.colorClass.replace("text-", "bg-")
                    )}
                    style={{ width: `${widthPercent}%` }}
                  />

                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={cn("h-4 w-4", step.colorClass)} />
                      <div>
                        <span className="text-sm font-medium text-text-dark">
                          {step.label}
                        </span>
                        <p className="text-[10px] text-text-light">
                          {step.description}
                        </p>
                      </div>
                    </div>
                    <p className={cn("text-lg font-bold", step.colorClass)}>
                      {formatCurrency(step.amount)}
                    </p>
                  </div>
                </div>

                {index < steps.length - 1 && (
                  <div className="flex justify-center py-1">
                    <ArrowRight className="h-4 w-4 text-text-light rotate-90" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Remaining indicator */}
          {data.remaining !== 0 && (
            <div className={cn(
              "p-2 rounded-lg text-sm flex items-center justify-between",
              data.remaining > 0 ? "bg-sage-light/20 text-sage" : "bg-blue-light/20 text-blue"
            )}>
              <span className="font-medium">
                {data.remaining > 0 ? "Unallocated" : "Over-allocated"}
              </span>
              <span className="font-bold">{formatCurrency(Math.abs(data.remaining))}</span>
            </div>
          )}
        </div>

        {/* Call to action */}
        <div className="mt-4 pt-3 border-t border-border text-center">
          <Button asChild variant="outline" size="sm">
            <Link href="/allocation">
              Adjust Allocations
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
