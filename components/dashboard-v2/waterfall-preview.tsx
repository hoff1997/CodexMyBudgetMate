"use client";

/**
 * Allocation Distribution View
 *
 * Shows how money is distributed across budget categories:
 * CC Holding, Essential, Important, Extras, Uncategorised, and Surplus
 *
 * Each row shows category, amount, progress bar, and percentage.
 */

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";
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
  essentialCount: number;
  importantCount: number;
  extrasCount: number;
  uncategorisedCount: number;
  remaining: number;
}

interface WaterfallPreviewProps {
  data: WaterfallData;
}

interface AllocationRow {
  id: string;
  label: string;
  amount: number;
  subtext: string;
  barColor: string;
  barBgColor: string;
  textColor: string;
  needsAttention?: boolean;
}

export function WaterfallPreview({ data }: WaterfallPreviewProps) {
  // Calculate total allocated (excluding surplus)
  const totalAllocated = useMemo(() => {
    return (
      data.creditCardHolding +
      data.essentialEnvelopes +
      data.importantEnvelopes +
      data.extrasEnvelopes +
      data.uncategorisedEnvelopes
    );
  }, [data]);

  // Build rows for the distribution view
  const rows = useMemo((): AllocationRow[] => {
    const baseRows: AllocationRow[] = [
      {
        id: "cc-holding",
        label: "CC Holding",
        amount: data.creditCardHolding,
        subtext: "For credit card payments",
        barColor: "bg-[#6B9ECE]", // blue
        barBgColor: "bg-[#DDEAF5]",
        textColor: "text-[#3D3D3D]",
      },
      {
        id: "essential",
        label: "Essential",
        amount: data.essentialEnvelopes,
        subtext: `${data.essentialCount} envelope${data.essentialCount !== 1 ? "s" : ""}`,
        barColor: "bg-[#5A7E7A]", // sage-dark
        barBgColor: "bg-[#E2EEEC]",
        textColor: "text-[#3D3D3D]",
      },
      {
        id: "important",
        label: "Important",
        amount: data.importantEnvelopes,
        subtext: `${data.importantCount} envelope${data.importantCount !== 1 ? "s" : ""}`,
        barColor: "bg-[#9CA3AF]", // silver
        barBgColor: "bg-[#F3F4F6]",
        textColor: "text-[#3D3D3D]",
      },
      {
        id: "extras",
        label: "Extras",
        amount: data.extrasEnvelopes,
        subtext: `${data.extrasCount} envelope${data.extrasCount !== 1 ? "s" : ""}`,
        barColor: "bg-[#6B9ECE]", // blue
        barBgColor: "bg-[#DDEAF5]",
        textColor: "text-[#3D3D3D]",
      },
    ];

    // Only show Uncategorised if there are envelopes without priority
    if (data.uncategorisedCount > 0) {
      baseRows.push({
        id: "uncategorised",
        label: "Uncategorised",
        amount: data.uncategorisedEnvelopes,
        subtext: "Needs priority assigned",
        barColor: "bg-[#6B9ECE]", // blue - indicates needs attention
        barBgColor: "bg-[#DDEAF5]",
        textColor: "text-[#3D3D3D]",
        needsAttention: true,
      });
    }

    return baseRows;
  }, [data]);

  // Calculate percentage for each row
  const getPercentage = (amount: number) => {
    if (totalAllocated === 0) return 0;
    return Math.round((amount / totalAllocated) * 100);
  };

  // Get progress bar width (as percentage of total allocated)
  const getBarWidth = (amount: number) => {
    if (totalAllocated === 0) return 0;
    return (amount / totalAllocated) * 100;
  };

  // Surplus styling
  const surplusIsPositive = data.remaining > 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-[#3D3D3D]">
            How your money is allocated
          </CardTitle>
          <Link
            href="/budgetallocation"
            className="flex items-center text-sm text-[#6B6B6B] hover:text-[#3D3D3D] transition-colors"
          >
            Adjust Allocations <ChevronRight className="h-4 w-4 ml-0.5" />
          </Link>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Allocation rows */}
        {rows.map((row) => (
          <Link
            key={row.id}
            href={`/budgetallocation?filter=${row.id}`}
            className={cn(
              "block group",
              row.needsAttention && "relative"
            )}
          >
            <div className="flex items-center gap-3">
              {/* Label */}
              <div className="w-28 flex-shrink-0">
                <span className={cn(
                  "text-sm font-medium text-[#3D3D3D] group-hover:text-[#5A7E7A] transition-colors",
                  row.needsAttention && "text-[#6B9ECE]"
                )}>
                  {row.label}
                </span>
                <p className="text-[10px] text-[#9CA3AF] leading-tight">
                  {row.subtext}
                </p>
              </div>

              {/* Amount */}
              <div className="w-24 flex-shrink-0 text-right">
                <span className={cn("text-sm font-semibold", row.textColor)}>
                  {formatCurrency(row.amount)}
                </span>
              </div>

              {/* Progress bar */}
              <div className="flex-1 flex items-center gap-2">
                <div className={cn(
                  "flex-1 h-2.5 rounded-full overflow-hidden",
                  row.barBgColor
                )}>
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-300",
                      row.barColor
                    )}
                    style={{ width: `${getBarWidth(row.amount)}%` }}
                  />
                </div>

                {/* Percentage */}
                <span className="w-10 text-right text-xs text-[#9CA3AF] tabular-nums">
                  {getPercentage(row.amount)}%
                </span>
              </div>
            </div>
          </Link>
        ))}

        {/* Divider */}
        <div className="border-t border-[#E5E7EB] my-2" />

        {/* Total Allocated */}
        <div className="flex items-center gap-3">
          <div className="w-28 flex-shrink-0">
            <span className="text-sm font-semibold text-[#3D3D3D]">
              Total Allocated
            </span>
          </div>
          <div className="w-24 flex-shrink-0 text-right">
            <span className="text-sm font-bold text-[#3D3D3D]">
              {formatCurrency(totalAllocated)}
            </span>
          </div>
          <div className="flex-1" />
        </div>

        {/* Surplus row */}
        <div className="flex items-center gap-3 pt-1">
          <div className="w-28 flex-shrink-0">
            <span className={cn(
              "text-sm font-medium",
              surplusIsPositive ? "text-[#7A9E9A]" : "text-[#6B9ECE]"
            )}>
              Surplus
            </span>
            <p className="text-[10px] text-[#9CA3AF] leading-tight">
              {surplusIsPositive ? "Available to assign" : "Still to assign"}
            </p>
          </div>
          <div className="w-24 flex-shrink-0 text-right">
            <span className={cn(
              "text-sm font-semibold",
              surplusIsPositive ? "text-[#7A9E9A]" : "text-[#6B9ECE]"
            )}>
              {formatCurrency(Math.max(0, data.remaining))}
            </span>
          </div>
          <div className="flex-1 flex items-center gap-2">
            {/* Surplus progress bar - shows remaining unallocated */}
            <div className={cn(
              "flex-1 h-2.5 rounded-full overflow-hidden",
              surplusIsPositive ? "bg-[#E2EEEC]" : "bg-[#DDEAF5]"
            )}>
              {data.remaining > 0 && totalAllocated > 0 && (
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    surplusIsPositive ? "bg-[#7A9E9A]" : "bg-[#6B9ECE]"
                  )}
                  style={{
                    width: `${Math.min(100, (data.remaining / (totalAllocated + data.remaining)) * 100)}%`
                  }}
                />
              )}
            </div>
            <span className="w-10" />
          </div>
        </div>

        {/* Over-allocated warning */}
        {data.remaining < 0 && (
          <div className="mt-2 p-2.5 rounded-lg bg-[#DDEAF5] border border-[#6B9ECE]/30">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[#4A7BA8]">
                Over-allocated
              </span>
              <span className="text-sm font-bold text-[#6B9ECE]">
                {formatCurrency(Math.abs(data.remaining))}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
