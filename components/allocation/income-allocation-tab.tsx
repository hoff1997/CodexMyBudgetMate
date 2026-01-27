"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Minus, CircleCheck, Circle, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/cn";
import type { UnifiedEnvelopeData, IncomeSource } from "@/lib/types/unified-envelope";
import { EnvelopeIcon } from "@/components/shared/envelope-icon";
import type { PayCycle } from "@/lib/utils/ideal-allocation-calculator";

type PriorityLevel = 'essential' | 'important' | 'discretionary';

interface IncomeAllocationTabProps {
  incomeSource: IncomeSource | null;
  envelopes: UnifiedEnvelopeData[];
  envelopesByPriority: {
    essential: UnifiedEnvelopeData[];
    important: UnifiedEnvelopeData[];
    discretionary: UnifiedEnvelopeData[];
  };
  payCycle: PayCycle;
  calculatePerPay: (envelope: UnifiedEnvelopeData) => number;
  onAllocationChange: (envelopeId: string, incomeSourceId: string, amount: number) => void;
  isUnfundedView?: boolean;
  incomeSources?: IncomeSource[];
}

const PRIORITY_CONFIG: Record<PriorityLevel, {
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  essential: {
    label: "ESSENTIAL",
    icon: "🔵",
    color: "text-[#4A7BA8]",
    bgColor: "bg-[#DDEAF5]",
    borderColor: "border-[#6B9ECE]",
  },
  important: {
    label: "IMPORTANT",
    icon: "🟢",
    color: "text-[#5A7E7A]",
    bgColor: "bg-[#E2EEEC]",
    borderColor: "border-[#B8D4D0]",
  },
  discretionary: {
    label: "FLEXIBLE",
    icon: "⚪",
    color: "text-[#6B6B6B]",
    bgColor: "bg-[#F3F4F6]",
    borderColor: "border-[#E5E7EB]",
  },
};

const SUBTYPE_LABELS: Record<string, string> = {
  bill: "Bill",
  spending: "Spend",
  savings: "Save",
  goal: "Goal",
  tracking: "Track",
  debt: "Debt",
};

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: "Weekly",
  fortnightly: "F/N",
  monthly: "Monthly",
  quarterly: "Qtrly",
  annual: "Annual",
  annually: "Annual",
};

/**
 * IncomeAllocationTab - Shows envelopes allocated to a specific income source
 * with full column set: Type, Opening Balance, Target, Frequency, Due, Per Pay, Allocation
 */
export function IncomeAllocationTab({
  incomeSource,
  envelopes,
  envelopesByPriority,
  payCycle,
  calculatePerPay,
  onAllocationChange,
  isUnfundedView = false,
  incomeSources = [],
}: IncomeAllocationTabProps) {
  const [expandedGroups, setExpandedGroups] = useState<Record<PriorityLevel, boolean>>({
    essential: true,
    important: true,
    discretionary: true,
  });

  const toggleGroup = (priority: PriorityLevel) => {
    setExpandedGroups(prev => ({ ...prev, [priority]: !prev[priority] }));
  };

  // Calculate subtotals for each priority group
  const getSubtotal = (group: UnifiedEnvelopeData[]) => {
    if (isUnfundedView) {
      // For unfunded view, show the shortfall
      return group.reduce((sum, e) => {
        const perPay = calculatePerPay(e);
        const total = Object.values(e.incomeAllocations || {}).reduce((s, a) => s + a, 0);
        return sum + Math.max(0, perPay - total);
      }, 0);
    }
    // For income tabs, show allocation from this income
    return group.reduce((sum, e) => {
      return sum + (e.incomeAllocations?.[incomeSource?.id || ''] || 0);
    }, 0);
  };

  const renderPriorityGroup = (priority: PriorityLevel) => {
    const group = envelopesByPriority[priority];
    if (group.length === 0) return null;

    const config = PRIORITY_CONFIG[priority];
    const subtotal = getSubtotal(group);
    const isExpanded = expandedGroups[priority];

    return (
      <div key={priority} className={cn("rounded-lg border", config.borderColor)}>
        {/* Header */}
        <button
          type="button"
          onClick={() => toggleGroup(priority)}
          className={cn(
            "w-full flex items-center justify-between px-3 py-2 rounded-t-lg",
            config.bgColor
          )}
        >
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <span className="text-base">{config.icon}</span>
            <span className={cn("font-semibold text-sm", config.color)}>
              {config.label}
            </span>
            <span className="text-xs text-muted-foreground">
              ({group.length} {group.length === 1 ? 'envelope' : 'envelopes'})
            </span>
          </div>
          <span className={cn("font-semibold text-sm", config.color)}>
            {isUnfundedView ? "Shortfall:" : "Subtotal:"} ${subtotal.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </button>

        {/* Table */}
        {isExpanded && (
          <div className="overflow-x-auto overflow-y-visible border rounded-lg">
            <table className="w-full table-fixed">
              <thead className="bg-muted">
                <tr className="h-10">
                  {/* Priority - Traffic light dot (matches Budget Manager) */}
                  <th className="py-0.5 text-[10px] font-semibold w-5 min-w-[20px] max-w-[20px]" title="Priority">
                    <div className="w-full flex items-center justify-center">
                      <ArrowUpDown className="h-3 w-3 opacity-40" />
                    </div>
                  </th>
                  {/* Icon column */}
                  <th className="w-6 min-w-[24px] max-w-[24px] px-0 py-0"></th>
                  {/* Name */}
                  <th className="px-0.5 py-0.5 text-[10px] font-semibold w-24 min-w-[96px] max-w-[96px] text-left">
                    <span className="inline-flex items-center pl-1">
                      Name <ArrowUpDown className="h-3 w-3 ml-0.5 opacity-40" />
                    </span>
                  </th>
                  {/* Category */}
                  <th className="px-0.5 py-0.5 text-[10px] font-semibold w-20 min-w-[80px] max-w-[80px] text-left">
                    <span className="inline-flex items-center pl-1">
                      Category
                    </span>
                  </th>
                  {/* Type */}
                  <th className="px-0.5 py-0.5 text-[10px] font-semibold w-11 min-w-[44px] max-w-[44px]">
                    <span className="w-full flex items-center justify-center">
                      Type <ArrowUpDown className="h-3 w-3 ml-0.5 opacity-40" />
                    </span>
                  </th>
                  {/* Opening Balance */}
                  <th className="px-0.5 py-0.5 text-[10px] font-semibold w-12 min-w-[48px] max-w-[48px] text-right pr-1 leading-tight">
                    <span className="block">Opening</span>
                    <span className="block">Balance</span>
                  </th>
                  {/* Target */}
                  <th className="px-0.5 py-0.5 text-[10px] font-semibold w-14 min-w-[56px] max-w-[56px]">
                    <span className="w-full flex items-center justify-end pr-1">
                      Target <ArrowUpDown className="h-3 w-3 ml-0.5 opacity-40" />
                    </span>
                  </th>
                  {/* Frequency */}
                  <th className="px-0.5 py-0.5 text-[10px] font-semibold w-20 min-w-[80px] max-w-[80px]">
                    <span className="w-full flex items-center justify-center">
                      Frequency <ArrowUpDown className="h-3 w-3 ml-0.5 opacity-40" />
                    </span>
                  </th>
                  {/* Due Date */}
                  <th className="px-0.5 py-0.5 text-[10px] font-semibold w-20 min-w-[80px] max-w-[80px]">
                    <span className="w-full flex items-center justify-center">
                      Due <ArrowUpDown className="h-3 w-3 ml-0.5 opacity-40" />
                    </span>
                  </th>
                  {/* Pays Till Due */}
                  <th className="px-0.5 py-0.5 text-[10px] font-semibold w-12 min-w-[48px] max-w-[48px] text-center leading-tight">
                    <span className="block">Pays</span>
                    <span className="block">Till</span>
                  </th>
                  {/* Per Pay */}
                  <th className="px-0.5 py-0.5 text-[10px] font-semibold w-14 min-w-[56px] max-w-[56px] text-right pr-1 leading-tight">
                    <span className="block">Per</span>
                    <span className="block">Pay</span>
                  </th>
                  {isUnfundedView ? (
                    <>
                      <th className="px-0.5 py-0.5 text-[10px] font-semibold w-14 min-w-[56px] max-w-[56px] text-right pr-1">Alloc'd</th>
                      <th className="px-0.5 py-0.5 text-[10px] font-semibold w-14 min-w-[56px] max-w-[56px] text-right pr-1">Shortfall</th>
                      <th className="px-0.5 py-0.5 text-[10px] font-semibold w-24 min-w-[96px] max-w-[96px] text-center leading-tight">
                        <span className="block">Fund From</span>
                        <span className="block text-[9px] text-muted-foreground font-normal">(click to edit)</span>
                      </th>
                    </>
                  ) : (
                    <>
                      <th className="px-0.5 py-0.5 text-[10px] font-semibold w-20 min-w-[80px] max-w-[80px] text-center">Allocation</th>
                      <th className="px-0.5 py-0.5 text-[10px] font-semibold w-12 min-w-[48px] max-w-[48px] text-center leading-tight">
                        <span className="block">On</span>
                        <span className="block">Track</span>
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y">
                {group.map((envelope) => (
                  <EnvelopeRow
                    key={envelope.id}
                    envelope={envelope}
                    incomeSource={incomeSource}
                    calculatePerPay={calculatePerPay}
                    onAllocationChange={onAllocationChange}
                    isUnfundedView={isUnfundedView}
                    incomeSources={incomeSources}
                    payCycle={payCycle}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const totalEnvelopes =
    envelopesByPriority.essential.length +
    envelopesByPriority.important.length +
    envelopesByPriority.discretionary.length;

  if (totalEnvelopes === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground">
          {isUnfundedView
            ? "All envelopes are fully funded! 🎉"
            : "No envelopes allocated to this income source yet."}
        </p>
        {!isUnfundedView && (
          <p className="text-xs text-muted-foreground mt-1">
            Use the Budget Manager or Unfunded tab to allocate envelopes.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {renderPriorityGroup('essential')}
      {renderPriorityGroup('important')}
      {renderPriorityGroup('discretionary')}
    </div>
  );
}

/**
 * EnvelopeRow - Single envelope row with all columns
 */
function EnvelopeRow({
  envelope,
  incomeSource,
  calculatePerPay,
  onAllocationChange,
  isUnfundedView,
  incomeSources,
  payCycle,
}: {
  envelope: UnifiedEnvelopeData;
  incomeSource: IncomeSource | null;
  calculatePerPay: (envelope: UnifiedEnvelopeData) => number;
  onAllocationChange: (envelopeId: string, incomeSourceId: string, amount: number) => void;
  isUnfundedView: boolean;
  incomeSources: IncomeSource[];
  payCycle: PayCycle;
}) {
  const perPay = calculatePerPay(envelope);
  const totalAllocated = Object.values(envelope.incomeAllocations || {}).reduce((sum, amt) => sum + amt, 0);
  const thisAllocation = incomeSource ? (envelope.incomeAllocations?.[incomeSource.id] || 0) : 0;
  const isFullyFunded = totalAllocated >= perPay - 0.01;
  const shortfall = Math.max(0, perPay - totalAllocated);

  // Calculate pays until next due date
  const calculatePaysTillDue = (): number | null => {
    if (!envelope.dueDate || !payCycle) return null;

    // Parse due date
    let dueDate: Date;
    if (typeof envelope.dueDate === 'string') {
      dueDate = new Date(envelope.dueDate);
    } else if (typeof envelope.dueDate === 'number') {
      // Day of month - find next occurrence
      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), envelope.dueDate);
      dueDate = thisMonth > now
        ? thisMonth
        : new Date(now.getFullYear(), now.getMonth() + 1, envelope.dueDate);
    } else if (envelope.dueDate instanceof Date) {
      dueDate = envelope.dueDate;
    } else {
      return null;
    }

    // Calculate days until due
    const now = new Date();
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntilDue < 0) return null;

    // Convert to pays based on pay cycle
    const daysPerPay: Record<string, number> = {
      weekly: 7,
      fortnightly: 14,
      monthly: 30,
    };
    const payDays = daysPerPay[payCycle] || 14;
    return Math.ceil(daysUntilDue / payDays);
  };

  const paysTillDue = calculatePaysTillDue();

  // Get priority dot color (matches Budget Manager and Style Guide)
  // Blue = Essential, Green/Sage = Important, Silver = Flexible
  const getPriorityDot = () => {
    const priority = envelope.priority || 'important';
    const dotColor = priority === 'essential' ? 'bg-[#6B9ECE]' :
                     priority === 'discretionary' ? 'bg-[#9CA3AF]' : 'bg-[#5A7E7A]';
    const label = priority === 'essential' ? 'Essential' :
                  priority === 'discretionary' ? 'Flexible' : 'Important';
    return <span className={`inline-block h-2 w-2 rounded-full ${dotColor}`} title={label} />;
  };

  return (
    <tr className={cn(
      "border-t hover:bg-muted/50",
      isFullyFunded && perPay > 0 && "bg-emerald-50/30"
    )}>
      {/* Priority - Traffic light dot (matches Budget Manager) */}
      <td className="w-5 min-w-[20px] max-w-[20px] py-0.5 text-center">
        {envelope.subtype !== 'savings' && envelope.subtype !== 'tracking' ? (
          getPriorityDot()
        ) : (
          <div className="h-4 flex items-center justify-center text-[8px] text-muted-foreground">—</div>
        )}
      </td>

      {/* Icon */}
      <td className="w-6 min-w-[24px] max-w-[24px] px-0 py-0">
        <EnvelopeIcon icon={envelope.icon || "wallet"} size={16} />
      </td>

      {/* Name */}
      <td className="w-24 min-w-[96px] max-w-[96px] pl-1 pr-0 py-0.5">
        <span className="font-medium text-[11px]">{envelope.name}</span>
      </td>

      {/* Category */}
      <td className="w-20 min-w-[80px] max-w-[80px] pl-1 pr-0 py-0.5">
        <span className="text-[11px] text-muted-foreground truncate block">
          {envelope.category_name || "-"}
        </span>
      </td>

      {/* Type */}
      <td className="w-11 min-w-[44px] max-w-[44px] px-0 py-0.5 text-center">
        <span className="text-[11px] text-muted-foreground">
          {SUBTYPE_LABELS[envelope.subtype] || envelope.subtype}
        </span>
      </td>

      {/* Opening Balance */}
      <td className="w-12 min-w-[48px] max-w-[48px] px-0.5 py-0.5">
        <div className="h-6 flex items-center justify-end text-[11px] text-muted-foreground pr-1">
          ${(envelope.openingBalance || 0).toFixed(2)}
        </div>
      </td>

      {/* Target */}
      <td className="w-14 min-w-[56px] max-w-[56px] px-0.5 py-0.5">
        <div className="h-6 flex items-center justify-end text-[11px] pr-1">
          ${(envelope.targetAmount || 0).toFixed(2)}
        </div>
      </td>

      {/* Frequency */}
      <td className="w-20 min-w-[80px] max-w-[80px] px-0.5 py-0.5 text-center">
        <div className="h-6 flex items-center justify-center text-[11px] text-muted-foreground">
          {FREQUENCY_LABELS[envelope.frequency || ''] || envelope.frequency || "—"}
        </div>
      </td>

      {/* Due Date */}
      <td className="w-20 min-w-[80px] max-w-[80px] px-0.5 py-0.5">
        {envelope.subtype === 'bill' || envelope.subtype === 'savings' ? (
          <input
            type="date"
            value={
              envelope.dueDate
                ? typeof envelope.dueDate === 'string'
                  ? envelope.dueDate
                  : typeof envelope.dueDate === 'number'
                  ? new Date(new Date().getFullYear(), new Date().getMonth(), envelope.dueDate).toISOString().split('T')[0]
                  : envelope.dueDate instanceof Date
                  ? envelope.dueDate.toISOString().split('T')[0]
                  : ''
                : ''
            }
            readOnly
            className="h-6 w-full text-[11px] px-0.5 border border-border rounded bg-muted/50 cursor-default focus:outline-none"
          />
        ) : (
          <div className="h-6 flex items-center justify-center text-[11px] text-muted-foreground">—</div>
        )}
      </td>

      {/* Pays Till Due */}
      <td className="w-12 min-w-[48px] max-w-[48px] px-0.5 py-0.5">
        <div className={cn(
          "h-6 flex items-center justify-center text-[11px] font-medium",
          paysTillDue !== null && paysTillDue <= 1 ? "text-red-600" :
          paysTillDue !== null && paysTillDue <= 2 ? "text-amber-600" :
          "text-muted-foreground"
        )}>
          {paysTillDue !== null ? paysTillDue : "—"}
        </div>
      </td>

      {/* Per Pay */}
      <td className="w-14 min-w-[56px] max-w-[56px] px-0.5 py-0.5">
        <div className="h-6 flex items-center justify-end text-[11px] font-semibold pr-1 text-muted-foreground">
          {perPay > 0 ? `$${perPay.toFixed(2)}` : '—'}
        </div>
      </td>

      {isUnfundedView ? (
        <>
          {/* Already Allocated (from all sources) */}
          <td className="w-14 min-w-[56px] max-w-[56px] px-0.5 py-0.5">
            <div className="h-6 flex items-center justify-end text-[11px] pr-1">
              ${totalAllocated.toFixed(2)}
            </div>
          </td>

          {/* Shortfall */}
          <td className="w-14 min-w-[56px] max-w-[56px] px-0.5 py-0.5">
            <div className="h-6 flex items-center justify-end text-[11px] font-semibold text-amber-600 pr-1">
              -${shortfall.toFixed(2)}
            </div>
          </td>

          {/* Fund From Selector */}
          <td className="w-24 min-w-[96px] max-w-[96px] px-0.5 py-0.5">
            <FundFromSelector
              envelope={envelope}
              incomeSources={incomeSources}
              onAllocationChange={onAllocationChange}
              shortfall={shortfall}
            />
          </td>
        </>
      ) : (
        <>
          {/* Allocation Input */}
          <td className="w-20 min-w-[80px] max-w-[80px] px-0.5 py-0.5">
            <AllocationInput
              envelopeId={envelope.id}
              incomeId={incomeSource?.id || ''}
              value={thisAllocation}
              onChange={(amount) => onAllocationChange(envelope.id, incomeSource?.id || '', amount)}
            />
          </td>

          {/* On Track Status */}
          <td className="w-12 min-w-[48px] max-w-[48px] px-0.5 py-0.5">
            <div className="h-6 flex items-center justify-center">
              {perPay === 0 ? (
                <span className="text-muted-foreground text-[10px]">—</span>
              ) : isFullyFunded ? (
                <span className="text-emerald-500 font-bold text-sm" title="Fully funded">✓</span>
              ) : (
                <span className="text-amber-500 font-semibold text-[10px]" title={`Need $${shortfall.toFixed(2)} more`}>
                  -${shortfall.toFixed(2)}
                </span>
              )}
            </div>
          </td>
        </>
      )}
    </tr>
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
    setLocalValue(parsed > 0 ? parsed.toFixed(2) : "");
  };

  const handleFocus = () => {
    setIsFocused(true);
    if (value > 0) {
      setLocalValue(value.toFixed(2));
    }
  };

  return (
    <div className="relative">
      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
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
          "w-full h-7 pl-5 pr-2 text-xs text-right rounded border",
          "bg-background hover:bg-muted focus:outline-none focus:ring-1 focus:ring-primary",
          isFocused ? "border-primary" : "border-border"
        )}
      />
    </div>
  );
}

/**
 * FundFromSelector - Simple dropdown to allocate shortfall to an income
 */
function FundFromSelector({
  envelope,
  incomeSources,
  onAllocationChange,
  shortfall,
}: {
  envelope: UnifiedEnvelopeData;
  incomeSources: IncomeSource[];
  onAllocationChange: (envelopeId: string, incomeSourceId: string, amount: number) => void;
  shortfall: number;
}) {
  const [selectedIncome, setSelectedIncome] = useState<string>("");

  const handleAllocate = () => {
    if (!selectedIncome || shortfall <= 0) return;
    const currentAllocation = envelope.incomeAllocations?.[selectedIncome] || 0;
    onAllocationChange(envelope.id, selectedIncome, currentAllocation + shortfall);
    setSelectedIncome("");
  };

  return (
    <div className="flex items-center gap-1">
      <select
        value={selectedIncome}
        onChange={(e) => setSelectedIncome(e.target.value)}
        className="h-6 text-xs border rounded px-1 bg-background"
      >
        <option value="">Select...</option>
        {incomeSources.map((income, index) => (
          <option key={income.id} value={income.id}>
            {index === 0 ? "Primary" : index === 1 ? "Secondary" : `Inc ${index + 1}`}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={handleAllocate}
        disabled={!selectedIncome}
        className={cn(
          "h-6 px-2 text-xs rounded",
          selectedIncome
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "bg-muted text-muted-foreground cursor-not-allowed"
        )}
      >
        Add
      </button>
    </div>
  );
}
