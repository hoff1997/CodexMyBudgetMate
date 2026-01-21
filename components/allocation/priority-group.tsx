"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import type { UnifiedEnvelopeData, IncomeSource } from "@/lib/types/unified-envelope";

type PriorityLevel = 'essential' | 'important' | 'discretionary' | 'unfunded';

interface PriorityGroupProps {
  priority: PriorityLevel;
  envelopes: UnifiedEnvelopeData[];
  incomeSources: IncomeSource[];
  subtotal: number;
  payCycle: string;
  onAllocationChange: (envelopeId: string, incomeSourceId: string, amount: number) => void;
  calculatePerPay: (envelope: UnifiedEnvelopeData) => number;
}

// Priority configuration with style guide colors
// Color progression: Blue (essential) → Sage (important) → Silver (flexible)
// This creates a calming hierarchy without anxiety-inducing red/amber colors
const PRIORITY_CONFIG: Record<PriorityLevel, {
  label: string;
  icon: string;
  dotColor: string;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  essential: {
    label: "ESSENTIAL",
    icon: "🔵",
    dotColor: "bg-[#6B9ECE]", // blue - draws attention calmly
    color: "text-text-dark",
    bgColor: "bg-[#DDEAF5]", // blue-light
    borderColor: "border-[#6B9ECE]", // blue
  },
  important: {
    label: "IMPORTANT",
    icon: "🟢",
    dotColor: "bg-[#7A9E9A]", // sage - middle ground
    color: "text-text-dark",
    bgColor: "bg-[#E2EEEC]", // sage-very-light
    borderColor: "border-[#B8D4D0]", // sage-light
  },
  discretionary: {
    label: "FLEXIBLE",
    icon: "⚪",
    dotColor: "bg-[#9CA3AF]", // silver - fades into background
    color: "text-text-dark",
    bgColor: "bg-[#F3F4F6]", // silver-very-light
    borderColor: "border-[#E5E7EB]", // silver-light
  },
  unfunded: {
    label: "UNFUNDED",
    icon: "⚠️",
    dotColor: "bg-[#D4A853]", // gold
    color: "text-[#8B7035]",
    bgColor: "bg-[#F5E6C4]", // gold-light
    borderColor: "border-[#D4A853]", // gold
  },
};

/**
 * PriorityGroup - Collapsible section for a priority level
 * Contains a table of envelopes with allocation inputs
 */
export function PriorityGroup({
  priority,
  envelopes,
  incomeSources,
  subtotal,
  payCycle,
  onAllocationChange,
  calculatePerPay,
}: PriorityGroupProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const config = PRIORITY_CONFIG[priority];

  if (envelopes.length === 0) return null;

  return (
    <div className={cn("rounded-lg border", config.borderColor)}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "w-full flex items-center justify-between px-4 py-2.5 rounded-t-lg",
          config.bgColor
        )}
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-text-medium" />
          ) : (
            <ChevronRight className="h-4 w-4 text-text-medium" />
          )}
          <span className={cn("w-2 h-2 rounded-full", config.dotColor)} />
          <span className={cn("font-semibold text-xs uppercase tracking-wide", config.color)}>
            {config.label}
          </span>
          <span className="text-xs text-text-medium font-normal">
            ({envelopes.length} {envelopes.length === 1 ? 'envelope' : 'envelopes'})
          </span>
        </div>
        <span className={cn("font-semibold text-sm", config.color)}>
          Subtotal: ${subtotal.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </button>

      {/* Table */}
      {isExpanded && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-silver-very-light border-b border-silver-light">
              <tr>
                <th className="px-3 py-2 text-left font-medium w-8"></th>
                <th className="px-3 py-2 text-left font-medium text-[11px] uppercase tracking-wide text-text-medium min-w-[140px]">Envelope</th>
                <th className="px-3 py-2 text-left font-medium text-[11px] uppercase tracking-wide text-text-medium w-[100px]">Category</th>
                <th className="px-3 py-2 text-right font-medium text-[11px] uppercase tracking-wide text-text-medium w-24">Per Pay</th>
                {incomeSources.map((income, index) => (
                  <th key={income.id} className="px-3 py-2 text-center font-medium text-[11px] uppercase tracking-wide text-text-medium w-28">
                    {index === 0 ? 'Primary' : 'Secondary'}
                  </th>
                ))}
                <th className="px-3 py-2 text-right font-medium text-[11px] uppercase tracking-wide text-text-medium w-24">Total</th>
                <th className="px-3 py-2 text-center font-medium text-[11px] uppercase tracking-wide text-text-medium w-20">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-silver-very-light bg-white">
              {envelopes.map((envelope) => {
                const perPay = calculatePerPay(envelope);
                const allocations = envelope.incomeAllocations || {};
                const total = Object.values(allocations).reduce((sum, amt) => sum + amt, 0);
                const isFullyFunded = total >= perPay - 0.01;
                const shortfall = perPay - total;

                return (
                  <tr key={envelope.id} className="hover:bg-[#E2EEEC] transition-colors">
                    {/* Icon */}
                    <td className="px-3 py-2 text-center">
                      <span className="text-base">{envelope.icon}</span>
                    </td>

                    {/* Name */}
                    <td className="px-3 py-2">
                      <span className="font-medium text-text-dark">{envelope.name}</span>
                    </td>

                    {/* Category */}
                    <td className="px-3 py-2">
                      <span className="text-[11px] text-text-medium truncate block">
                        {envelope.category_name || "-"}
                      </span>
                    </td>

                    {/* Per Pay */}
                    <td className="px-3 py-2 text-right">
                      <span className="font-semibold" style={{ color: '#7A9E9A', fontWeight: 600 }}>
                        ${perPay.toFixed(2)}
                      </span>
                    </td>

                    {/* Income allocation inputs */}
                    {incomeSources.map((income) => (
                      <td key={income.id} className="px-3 py-2">
                        <AllocationInput
                          envelopeId={envelope.id}
                          incomeId={income.id}
                          value={allocations[income.id] || 0}
                          onChange={(amount) => onAllocationChange(envelope.id, income.id, amount)}
                        />
                      </td>
                    ))}

                    {/* Total */}
                    <td className="px-3 py-2 text-right">
                      <span className={cn(
                        "font-semibold",
                        isFullyFunded ? "text-text-dark" : "text-blue"
                      )}>
                        ${total.toFixed(2)}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-3 py-2 text-center">
                      {perPay === 0 ? (
                        <span className="text-text-light text-xs">—</span>
                      ) : isFullyFunded ? (
                        <span className="font-bold" style={{ color: '#7A9E9A' }} title="Fully funded">✓</span>
                      ) : (
                        <span className="text-blue font-semibold text-xs" title={`Need $${shortfall.toFixed(2)} more`}>
                          -${shortfall.toFixed(2)}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/**
 * AllocationInput - Editable input for allocation amount
 */
function AllocationInput({
  envelopeId,
  incomeId,
  value,
  onChange,
}: {
  envelopeId: string;
  incomeId: string;
  value: number;
  onChange: (amount: number) => void;
}) {
  const [localValue, setLocalValue] = useState(value > 0 ? value.toFixed(2) : "");
  const [isFocused, setIsFocused] = useState(false);

  const handleBlur = () => {
    setIsFocused(false);
    const parsed = parseFloat(localValue) || 0;
    if (parsed !== value) {
      onChange(parsed);
    }
    // Update local display
    setLocalValue(parsed > 0 ? parsed.toFixed(2) : "");
  };

  const handleFocus = () => {
    setIsFocused(true);
    // Show current value when focusing
    if (value > 0) {
      setLocalValue(value.toFixed(2));
    }
  };

  return (
    <div className="relative">
      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-text-light">$</span>
      <input
        type="text"
        inputMode="decimal"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.currentTarget.blur();
          }
        }}
        placeholder="0.00"
        className={cn(
          "w-full h-8 pl-5 pr-2 text-xs text-right rounded border",
          "bg-white hover:bg-silver-very-light focus:outline-none focus:ring-1 focus:ring-sage",
          isFocused ? "border-sage" : "border-silver-light"
        )}
      />
    </div>
  );
}
