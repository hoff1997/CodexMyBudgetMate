"use client";

/**
 * Waterfall Preview
 *
 * Full priority-based visualization of the income allocation flow:
 * Income → CC Holding → Essential → Important → Extras → Uncategorised → Surplus
 *
 * Shows how money flows through the budget system by priority.
 */

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  ChevronRight,
  DollarSign,
  CreditCard,
  Shield,
  Star,
  Sparkles,
  HelpCircle,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/finance";
import { cn } from "@/lib/cn";

export interface WaterfallData {
  totalIncome: number;
  creditCardHolding: number;
  essentialEnvelopes: number;
  importantEnvelopes: number;
  extrasEnvelopes: number;
  uncategorisedEnvelopes: number;
  uncategorisedCount: number; // Number of envelopes without priority
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
  showWarning?: boolean;
}

export function WaterfallPreview({ data }: WaterfallPreviewProps) {
  const steps = useMemo((): FlowStep[] => {
    const baseSteps: FlowStep[] = [
      {
        id: "income",
        label: "Income",
        amount: data.totalIncome,
        icon: DollarSign,
        colorClass: "text-[#7A9E9A]", // sage
        bgClass: "bg-[#E2EEEC]", // sage-very-light
        description: "Monthly income",
      },
      {
        id: "cc-holding",
        label: "CC Holding",
        amount: data.creditCardHolding,
        icon: CreditCard,
        colorClass: "text-[#6B9ECE]", // blue
        bgClass: "bg-[#DDEAF5]", // blue-light
        description: "Credit card payments",
      },
      {
        id: "essential",
        label: "Essential",
        amount: data.essentialEnvelopes,
        icon: Shield,
        colorClass: "text-[#5A7E7A]", // sage-dark
        bgClass: "bg-[#E2EEEC]", // sage-very-light
        description: "Must-have bills",
      },
      {
        id: "important",
        label: "Important",
        amount: data.importantEnvelopes,
        icon: Star,
        colorClass: "text-[#6B6B6B]", // text-medium
        bgClass: "bg-[#F3F4F6]", // gray-100
        description: "Should-have expenses",
      },
      {
        id: "extras",
        label: "Extras",
        amount: data.extrasEnvelopes,
        icon: Sparkles,
        colorClass: "text-[#6B9ECE]", // blue
        bgClass: "bg-[#DDEAF5]", // blue-light
        description: "Nice-to-have",
      },
    ];

    // Only show Uncategorised if there are envelopes without priority
    if (data.uncategorisedCount > 0) {
      baseSteps.push({
        id: "uncategorised",
        label: "Uncategorised",
        amount: data.uncategorisedEnvelopes,
        icon: HelpCircle,
        colorClass: "text-[#6B9ECE]", // blue
        bgClass: "bg-[#DDEAF5]", // blue-light
        description: "No priority assigned",
        showWarning: true,
      });
    }

    // Add surplus at the end
    baseSteps.push({
      id: "surplus",
      label: "Surplus",
      amount: data.remaining > 0 ? data.remaining : 0,
      icon: DollarSign,
      colorClass: data.remaining > 0 ? "text-[#7A9E9A]" : "text-[#6B9ECE]", // sage if positive, blue if zero
      bgClass: data.remaining > 0 ? "bg-[#E2EEEC]" : "bg-[#DDEAF5]",
      description: "Available to assign",
    });

    return baseSteps;
  }, [data]);

  // Calculate percentages for visual width (exclude surplus from max calculation)
  const stepsWithoutSurplus = steps.filter((s) => s.id !== "surplus");
  const maxAmount = Math.max(...stepsWithoutSurplus.map((s) => s.amount), 1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-[#3D3D3D]">
            Allocation Flow
          </CardTitle>
          <Button asChild variant="ghost" size="sm" className="text-[#6B6B6B]">
            <Link href="/allocation">
              Full View <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {/* Uncategorised warning banner */}
        {data.uncategorisedCount > 0 && (
          <div className="mb-4 p-3 rounded-lg bg-[#DDEAF5] border border-[#6B9ECE]/30 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-[#6B9ECE] flex-shrink-0" />
            <p className="text-sm text-[#4A7BA8]">
              {data.uncategorisedCount} envelope{data.uncategorisedCount !== 1 ? "s" : ""} need{data.uncategorisedCount === 1 ? "s" : ""} a priority level.{" "}
              <Link href="/allocation" className="underline font-medium">
                Set priorities
              </Link>
            </p>
          </div>
        )}

        {/* Desktop: Horizontal Flow */}
        <div className="hidden md:block overflow-x-auto">
          <div className="flex items-stretch gap-1 min-w-max">
            {steps.map((step, index) => {
              const Icon = step.icon;

              return (
                <div key={step.id} className="flex items-center">
                  <div
                    className={cn(
                      "rounded-lg p-2.5 transition-all min-w-[90px]",
                      step.bgClass,
                      step.showWarning && "ring-1 ring-[#6B9ECE]/50"
                    )}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Icon className={cn("h-3.5 w-3.5", step.colorClass)} />
                      <span className="text-[11px] font-medium text-[#6B6B6B]">
                        {step.label}
                      </span>
                      {step.showWarning && (
                        <AlertTriangle className="h-3 w-3 text-[#6B9ECE]" />
                      )}
                    </div>
                    <p className={cn("text-base font-bold", step.colorClass)}>
                      {formatCurrency(step.amount)}
                    </p>
                    <p className="text-[9px] text-[#9CA3AF]">
                      {step.description}
                    </p>
                  </div>

                  {index < steps.length - 1 && (
                    <ArrowRight className="h-4 w-4 text-[#9CA3AF] mx-0.5 flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Over-allocated indicator */}
          {data.remaining < 0 && (
            <div className="mt-3 p-2 rounded-lg text-sm flex items-center justify-between bg-[#DDEAF5] text-[#6B9ECE]">
              <span className="font-medium">Over-allocated</span>
              <span className="font-bold">{formatCurrency(Math.abs(data.remaining))}</span>
            </div>
          )}
        </div>

        {/* Mobile: Vertical Flow */}
        <div className="md:hidden space-y-2">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const widthPercent = step.id === "surplus"
              ? 100
              : Math.max(30, (step.amount / maxAmount) * 100);

            return (
              <div key={step.id}>
                <div
                  className={cn(
                    "rounded-lg p-3 relative overflow-hidden",
                    step.bgClass,
                    step.showWarning && "ring-1 ring-[#6B9ECE]/50"
                  )}
                >
                  {/* Background width indicator */}
                  <div
                    className="absolute inset-y-0 left-0 opacity-20 bg-current"
                    style={{
                      width: `${widthPercent}%`,
                      color: step.colorClass.replace("text-[", "").replace("]", "")
                    }}
                  />

                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={cn("h-4 w-4", step.colorClass)} />
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-medium text-[#3D3D3D]">
                            {step.label}
                          </span>
                          {step.showWarning && (
                            <AlertTriangle className="h-3 w-3 text-[#6B9ECE]" />
                          )}
                        </div>
                        <p className="text-[10px] text-[#9CA3AF]">
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
                    <ArrowRight className="h-4 w-4 text-[#9CA3AF] rotate-90" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Over-allocated indicator */}
          {data.remaining < 0 && (
            <div className="p-2 rounded-lg text-sm flex items-center justify-between bg-[#DDEAF5] text-[#6B9ECE]">
              <span className="font-medium">Over-allocated</span>
              <span className="font-bold">{formatCurrency(Math.abs(data.remaining))}</span>
            </div>
          )}
        </div>

        {/* Call to action */}
        <div className="mt-4 pt-3 border-t border-[#E5E7EB] text-center">
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
