"use client";

import { useState, useCallback, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, AlertTriangle, ArrowUp, ArrowDown, ArrowUpDown, GripVertical, Check, Info } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { calculateOpeningBalance } from "@/lib/hooks/use-opening-balance-calculator";
import { EnvelopeIcon } from "@/components/shared/envelope-icon";
import { IconPicker } from "@/components/onboarding/icon-picker";
import type {
  UnifiedEnvelopeTableProps,
  UnifiedEnvelopeData,
  ValidationWarning,
  CategoryOption,
  PaySchedule,
} from "@/lib/types/unified-envelope";
import {
  calculatePaysUntilDue,
  getNextDueDate,
} from "@/lib/utils/pays-until-due";
import { PaysUntilDueBadge, PaysUntilDuePlaceholder } from "@/components/shared/pays-until-due-badge";
import { MessageSquare } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

/**
 * Calculate how much needs to be allocated per pay cycle based on bill frequency
 * @param targetAmount - The target amount for the envelope
 * @param billFrequency - How often the bill is due (weekly, monthly, etc.)
 * @param payCycle - How often the user gets paid (weekly, fortnightly, monthly)
 */
function calculatePerPayAmount(
  targetAmount: number,
  billFrequency: string | undefined,
  payCycle: string
): number {
  if (!targetAmount || targetAmount <= 0) return 0;

  // Convert bill frequency to "times per year"
  const billTimesPerYear: Record<string, number> = {
    weekly: 52,
    fortnightly: 26,
    monthly: 12,
    quarterly: 4,
    annually: 1,
  };

  // Convert pay cycle to "times per year"
  const payTimesPerYear: Record<string, number> = {
    weekly: 52,
    fortnightly: 26,
    twice_monthly: 24,
    monthly: 12,
  };

  const billFreq = billTimesPerYear[billFrequency || 'monthly'] || 12;
  const payFreq = payTimesPerYear[payCycle] || 12;

  // Annual cost / number of pay periods = per pay amount
  const annualCost = targetAmount * billFreq;
  return annualCost / payFreq;
}

// Stable empty array reference to prevent infinite re-renders
const EMPTY_GAP_ARRAY: Array<{
  envelope_id: string;
  envelope_name: string;
  ideal_per_pay: number;
  expected_balance: number;
  actual_balance: number;
  gap: number;
  payCyclesElapsed: number;
  status: "on_track" | "slight_deviation" | "needs_attention";
  is_locked: boolean;
}> = [];

export function UnifiedEnvelopeTable({
  envelopes,
  incomeSources,
  mode,
  payCycle = 'monthly',
  paySchedule,
  bankBalance,
  categories = [],
  showIncomeColumns = true,
  showOpeningBalance,
  showCurrentBalance,
  showDueIn,
  showNotes = true,
  showCategories,
  enableDragAndDrop = false,
  isDragDisabled = false,
  hideHeader = false,
  gapAnalysisData,
  onEnvelopeUpdate,
  onEnvelopeDelete,
  onAllocationUpdate,
  onReorder,
}: UnifiedEnvelopeTableProps) {
  // Compute defaults inside the component to avoid inline default expressions
  const effectiveShowOpeningBalance = showOpeningBalance ?? (mode === 'onboarding');
  const effectiveShowCurrentBalance = showCurrentBalance ?? (mode === 'maintenance');
  const effectiveShowCategories = showCategories ?? (mode === 'maintenance' && categories.length > 0);
  // Show "Due In" column in maintenance mode when pay schedule is available
  const effectiveShowDueIn = showDueIn ?? (mode === 'maintenance' && paySchedule !== null && paySchedule !== undefined);
  const effectiveGapData = gapAnalysisData ?? EMPTY_GAP_ARRAY;
  // State for inline editing (calculator mode)
  const [focusedCell, setFocusedCell] = useState<{
    envelopeId: string;
    field: string;
  } | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");

  // State for date picker popover
  const [openDatePicker, setOpenDatePicker] = useState<string | null>(null);

  // State for income column visibility (mobile/tablet)
  const [incomeColumnsExpanded, setIncomeColumnsExpanded] = useState(true);

  // Sort state
  type SortColumn = 'name' | 'category' | 'priority' | 'subtype' | 'targetAmount' | 'frequency' | 'dueDate' | 'dueIn' | 'currentAmount' | 'totalFunded' | null;
  type SortDirection = 'asc' | 'desc';
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortColumn(null);
        setSortDirection('asc');
      }
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-3 w-3 ml-0.5 opacity-40" />;
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="h-3 w-3 ml-0.5 text-primary" />
      : <ArrowDown className="h-3 w-3 ml-0.5 text-primary" />;
  };

  // Active income sources only
  const activeIncomeSources = incomeSources.filter(inc => inc.isActive !== false);

  // Calculate totals
  const totalAllocations = envelopes.reduce((sum, env) => {
    const envTotal = Object.values(env.incomeAllocations || {}).reduce((s, amt) => s + amt, 0);
    return sum + envTotal;
  }, 0);

  const totalIncome = activeIncomeSources.reduce((sum, inc) => sum + inc.amount, 0);
  const difference = totalIncome - totalAllocations;

  // Calculate total opening balance needed (onboarding mode only)
  const totalOpeningBalanceNeeded = effectiveShowOpeningBalance
    ? envelopes.reduce((total, env) => {
        const totalPerCycleAllocation = Object.values(env.incomeAllocations || {}).reduce((s, amt) => s + amt, 0);
        const result = calculateOpeningBalance({
          targetAmount: env.targetAmount || 0,
          frequency: env.frequency || 'monthly',
          dueDate: env.dueDate,
          totalPerCycleAllocation,
          payCycle,
        });
        return total + result.openingBalanceNeeded;
      }, 0)
    : 0;

  // Handlers
  const handleCellFocus = (envelopeId: string, field: string, currentValue: string | number) => {
    setFocusedCell({ envelopeId, field });
    setEditingValue(""); // Clear on focus (calculator mode)
  };

  const handleCellBlur = async (envelopeId: string, field: string, value: string) => {
    if (value === "") {
      setFocusedCell(null);
      return;
    }

    const updates: Partial<UnifiedEnvelopeData> = {};

    // Parse numeric fields
    if (field === 'targetAmount') {
      updates.targetAmount = parseFloat(value) || 0;
    } else if (field === 'openingBalance') {
      updates.openingBalance = parseFloat(value) || 0;
    } else if (field.startsWith('allocation_')) {
      const incomeId = field.replace('allocation_', '');
      const amount = parseFloat(value) || 0;

      if (onAllocationUpdate) {
        await onAllocationUpdate(envelopeId, incomeId, amount);
      }
    } else {
      (updates as any)[field] = value;
    }

    if (Object.keys(updates).length > 0) {
      await onEnvelopeUpdate(envelopeId, updates);
    }

    setFocusedCell(null);
    setEditingValue("");
  };

  const handleCellChange = (envelopeId: string, field: string, value: string) => {
    setEditingValue(value);
  };

  const getDisplayValue = (envelopeId: string, field: string, defaultValue: string | number): string => {
    if (focusedCell?.envelopeId === envelopeId && focusedCell?.field === field) {
      return editingValue;
    }
    return String(defaultValue);
  };

  // Get total allocation for an envelope
  const getTotalAllocation = (envelope: UnifiedEnvelopeData): number => {
    return Object.values(envelope.incomeAllocations || {}).reduce((sum, amt) => sum + amt, 0);
  };

  // Sorted envelopes
  const sortedEnvelopes = useMemo(() => {
    if (!sortColumn) return envelopes;

    const priorityOrder: Record<string, number> = { essential: 0, important: 1, discretionary: 2 };
    const frequencyOrder: Record<string, number> = { weekly: 0, fortnightly: 1, monthly: 2, quarterly: 3, annually: 4 };

    return [...envelopes].sort((a, b) => {
      let comparison = 0;

      switch (sortColumn) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'category':
          const catNameA = categories.find(c => c.id === a.categoryId)?.name || 'Uncategorised';
          const catNameB = categories.find(c => c.id === b.categoryId)?.name || 'Uncategorised';
          comparison = catNameA.localeCompare(catNameB);
          break;
        case 'priority':
          const priorityA = priorityOrder[a.priority || 'important'] ?? 1;
          const priorityB = priorityOrder[b.priority || 'important'] ?? 1;
          comparison = priorityA - priorityB;
          break;
        case 'subtype':
          comparison = (a.subtype || '').localeCompare(b.subtype || '');
          break;
        case 'targetAmount':
          comparison = (a.targetAmount || 0) - (b.targetAmount || 0);
          break;
        case 'frequency':
          const freqA = frequencyOrder[a.frequency || 'monthly'] ?? 2;
          const freqB = frequencyOrder[b.frequency || 'monthly'] ?? 2;
          comparison = freqA - freqB;
          break;
        case 'dueDate':
          const dateA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
          const dateB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
          comparison = dateA - dateB;
          break;
        case 'dueIn':
          // Sort by "pays until due" - bills without due dates go to the end
          const getPaysUntilDue = (env: UnifiedEnvelopeData): number => {
            if (env.subtype !== 'bill' || !env.dueDate || !paySchedule) return 999;
            const nextDue = getNextDueDate(env.dueDate);
            if (!nextDue) return 999;
            const isFunded = (env.currentAmount ?? 0) >= (env.targetAmount ?? 0);
            const result = calculatePaysUntilDue(nextDue, paySchedule, isFunded);
            return result.pays;
          };
          comparison = getPaysUntilDue(a) - getPaysUntilDue(b);
          break;
        case 'currentAmount':
          comparison = (a.currentAmount || 0) - (b.currentAmount || 0);
          break;
        case 'totalFunded':
          const totalA = getTotalAllocation(a);
          const totalB = getTotalAllocation(b);
          comparison = totalA - totalB;
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [envelopes, sortColumn, sortDirection, categories, paySchedule]);

  // Validate envelope and generate warnings
  const validateEnvelope = useCallback((envelope: UnifiedEnvelopeData): ValidationWarning[] => {
    const warnings: ValidationWarning[] = [];

    // Name required
    if (!envelope.name || envelope.name.trim() === '') {
      warnings.push({ type: 'error', message: 'Name required', field: 'name' });
    }

    // Tracking envelopes don't need target, frequency, or allocation validation
    if (envelope.subtype === 'tracking') {
      return warnings;
    }

    // Target amount validation
    if (envelope.subtype === 'bill' && (!envelope.targetAmount || envelope.targetAmount <= 0)) {
      warnings.push({ type: 'error', message: 'Target amount required for bills', field: 'targetAmount' });
    }

    // Frequency required for bills
    if (envelope.subtype === 'bill' && (!envelope.frequency || envelope.frequency === 'none')) {
      warnings.push({ type: 'error', message: 'Frequency required for bills', field: 'frequency' });
    }

    // Allocation warnings
    const totalAllocation = getTotalAllocation(envelope);
    const target = envelope.targetAmount || 0;

    if (target > 0 && totalAllocation < target) {
      const shortfall = target - totalAllocation;
      warnings.push({
        type: 'warning',
        message: `Under-allocated by $${shortfall.toFixed(2)}`,
        field: 'allocation',
      });
    } else if (totalAllocation > target && target > 0) {
      const excess = totalAllocation - target;
      warnings.push({
        type: 'info',
        message: `Over-allocated by $${excess.toFixed(2)}`,
        field: 'allocation',
      });
    }

    // Opening balance warning (onboarding mode)
    if (effectiveShowOpeningBalance && envelope.subtype === 'bill') {
      const result = calculateOpeningBalance({
        targetAmount: envelope.targetAmount || 0,
        frequency: envelope.frequency || 'monthly',
        dueDate: envelope.dueDate,
        totalPerCycleAllocation: totalAllocation,
        payCycle,
      });

      if (result.warning) {
        warnings.push({
          type: 'info',
          message: result.warning,
          field: 'openingBalance',
        });
      }
    }

    return warnings;
  }, [payCycle, effectiveShowOpeningBalance]);

  return (
    <div className="space-y-4">
      {/* Budget Status Summary */}
      {effectiveShowOpeningBalance && bankBalance !== undefined && (
        <Alert className={totalOpeningBalanceNeeded > bankBalance ? 'border-rose-200 bg-rose-50' : 'border-emerald-200 bg-emerald-50'}>
          <AlertDescription>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">
                  Opening Balance: ${totalOpeningBalanceNeeded.toFixed(2)} needed
                </p>
                <p className="text-xs text-muted-foreground">
                  Bank Balance: ${bankBalance.toFixed(2)}
                </p>
              </div>
              {totalOpeningBalanceNeeded > bankBalance && (
                <div className="flex items-center gap-2 text-blue">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Shortfall: ${(totalOpeningBalanceNeeded - bankBalance).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Income Column Toggle (Mobile/Tablet) */}
      {showIncomeColumns && activeIncomeSources.length > 0 && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIncomeColumnsExpanded(!incomeColumnsExpanded)}
            className="md:hidden"
          >
            {incomeColumnsExpanded ? 'Hide' : 'Show'} Income Allocation
          </Button>
        </div>
      )}

      {/* Spreadsheet Table */}
      <div className={`overflow-x-auto overflow-y-visible ${hideHeader ? '' : 'border rounded-lg'}`}>
        <table className={`w-full ${mode === 'onboarding' ? 'onboarding-envelope-table' : ''}`}>
          {!hideHeader && (
          <thead className={mode === 'onboarding' ? 'bg-silver-very-light border-b border-silver-light' : 'bg-muted'}>
            <tr className="h-10">
              {/* Drag Handle Column */}
              {enableDragAndDrop && (
                <th className="px-0 py-0" style={{ width: mode === 'onboarding' ? '2%' : '20px' }}></th>
              )}
              {/* Priority - show only in maintenance mode as separate column */}
              {mode !== 'onboarding' && (
                <th className="py-0.5 text-[10px] font-semibold" style={{ width: '20px' }} title="Priority">
                  <button type="button" onClick={() => handleSort('priority')} className="w-full flex items-center justify-center hover:text-primary">
                    <SortIcon column="priority" />
                  </button>
                </th>
              )}
              {/* Envelope column (Icon + Name combined for onboarding) */}
              {mode === 'onboarding' ? (
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-text-medium uppercase tracking-wide" style={{ width: '14%' }}>
                  <button type="button" onClick={() => handleSort('name')} className="inline-flex items-center hover:text-primary">
                    Envelope<SortIcon column="name" />
                  </button>
                </th>
              ) : (
                <>
                  <th className="px-0 py-0" style={{ width: '24px' }}></th>
                  <th className="px-2 py-0.5 text-[10px] font-semibold text-left" style={{ width: '96px' }}>
                    <button type="button" onClick={() => handleSort('name')} className="inline-flex items-center hover:text-primary">
                      Name<SortIcon column="name" />
                    </button>
                  </th>
                </>
              )}
              {/* Category Column */}
              {effectiveShowCategories && (
                <th className="px-2 py-0.5 text-[10px] font-semibold" style={{ width: mode === 'onboarding' ? '8%' : '80px' }}>
                  <button type="button" onClick={() => handleSort('category')} className="w-full flex items-center justify-center hover:text-primary">
                    Cat<SortIcon column="category" />
                  </button>
                </th>
              )}
              {/* Type */}
              <th className={mode === 'onboarding'
                ? "px-3 py-2.5 text-left text-[11px] font-semibold text-text-medium uppercase tracking-wide"
                : "px-2 py-0.5 text-[10px] font-semibold"
              } style={{ width: mode === 'onboarding' ? '7%' : '44px' }}>
                <button type="button" onClick={() => handleSort('subtype')} className={mode === 'onboarding' ? "inline-flex items-center hover:text-primary" : "w-full flex items-center justify-center hover:text-primary"}>
                  Type<SortIcon column="subtype" />
                </button>
              </th>
              {/* Opening Balance - only show in maintenance or when explicitly enabled */}
              {effectiveShowOpeningBalance && (
                <th className="px-2 py-0.5 text-[10px] font-semibold text-right pr-2 leading-tight" style={{ width: mode === 'onboarding' ? '8%' : '48px' }}>
                  <span className="block">Opening</span>
                  <span className="block">Balance</span>
                </th>
              )}
              {/* Amount */}
              <th className={mode === 'onboarding'
                ? "px-3 py-2.5 text-right text-[11px] font-semibold text-text-medium uppercase tracking-wide"
                : "px-2 py-0.5 text-[10px] font-semibold text-center leading-tight"
              } style={{ width: mode === 'onboarding' ? '8%' : '56px' }}>
                <button type="button" onClick={() => handleSort('targetAmount')} className={mode === 'onboarding' ? "inline-flex items-center justify-end w-full hover:text-primary" : "w-full h-full flex items-center justify-center hover:text-primary"}>
                  <span className={mode === 'onboarding' ? "" : "flex flex-col items-center mr-0.5"}>
                    <span>Amount</span>
                  </span>
                  <SortIcon column="targetAmount" />
                </button>
              </th>
              {/* Frequency */}
              <th className={mode === 'onboarding'
                ? "px-3 py-2.5 text-left text-[11px] font-semibold text-text-medium uppercase tracking-wide"
                : "px-2 py-0.5 text-[10px] font-semibold"
              } style={{ width: mode === 'onboarding' ? '13%' : '80px' }}>
                <button type="button" onClick={() => handleSort('frequency')} className={mode === 'onboarding' ? "inline-flex items-center hover:text-primary" : "w-full flex items-center justify-center hover:text-primary"}>
                  Frequency<SortIcon column="frequency" />
                </button>
              </th>
              {/* Due Date */}
              <th className={mode === 'onboarding'
                ? "px-3 py-2.5 text-left text-[11px] font-semibold text-text-medium uppercase tracking-wide"
                : "px-2 py-0.5 text-[10px] font-semibold"
              } style={{ width: mode === 'onboarding' ? '10%' : '80px' }}>
                <button type="button" onClick={() => handleSort('dueDate')} className={mode === 'onboarding' ? "inline-flex items-center hover:text-primary" : "w-full flex items-center justify-center hover:text-primary"}>
                  Due Date<SortIcon column="dueDate" />
                </button>
              </th>

              {/* Funded By / Fund From */}
              {showIncomeColumns && (
                <th className={mode === 'onboarding'
                  ? "px-3 py-2.5 text-left text-[11px] font-semibold text-text-medium uppercase tracking-wide"
                  : "px-2 py-0.5 text-[10px] font-semibold text-center leading-tight"
                } style={{ width: mode === 'onboarding' ? '17%' : '96px' }}>
                  <span className="block">{mode === 'onboarding' ? 'Funded By' : 'Fund From'}</span>
                  {mode !== 'onboarding' && <span className="block text-[9px] text-muted-foreground font-normal">(click to edit)</span>}
                </th>
              )}

              {/* Per Pay - Calculated amount needed each pay cycle */}
              {showIncomeColumns && (
                <th className={mode === 'onboarding'
                  ? "px-3 py-2.5 text-right text-[11px] font-semibold text-text-medium uppercase tracking-wide"
                  : "px-2 py-0.5 text-[10px] font-semibold text-right pr-2 leading-tight"
                } style={{ width: mode === 'onboarding' ? '8%' : '56px' }}>
                  <span className="block">Per Pay</span>
                </th>
              )}

              {/* On Track Status - checkmark column */}
              {showIncomeColumns && (
                <th className={mode === 'onboarding'
                  ? "px-2 py-2.5 text-center text-[11px] font-semibold text-text-medium uppercase tracking-wide"
                  : "px-2 py-0.5 text-[10px] font-semibold text-center leading-tight"
                } style={{ width: mode === 'onboarding' ? '3%' : '48px' }}>
                  {mode === 'onboarding' ? '✓' : <><span className="block">On</span><span className="block">Track</span></>}
                </th>
              )}

              {/* Current Balance (Maintenance) */}
              {effectiveShowCurrentBalance && (
                <th className="px-2 py-0.5 text-[10px] font-semibold" style={{ width: '48px' }}>
                  <button type="button" onClick={() => handleSort('currentAmount')} className="w-full flex items-center justify-end hover:text-primary pr-1">
                    Curr<SortIcon column="currentAmount" />
                  </button>
                </th>
              )}

              {/* Due In - Pays until due (Maintenance mode with pay schedule) */}
              {effectiveShowDueIn && (
                <th className="px-2 py-0.5 text-[10px] font-semibold text-center leading-tight" style={{ width: '56px' }}>
                  <button type="button" onClick={() => handleSort('dueIn')} className="w-full flex items-center justify-center hover:text-primary">
                    <span className="flex flex-col items-center mr-0.5">
                      <span>Due</span>
                      <span>In</span>
                    </span>
                    <SortIcon column="dueIn" />
                  </button>
                </th>
              )}

              {/* Balance Tracking Columns - Show in maintenance mode */}
              {mode === 'maintenance' && (
                <>
                  <th className="px-2 py-0.5 text-[10px] font-semibold text-right pr-2 leading-tight" style={{ width: '48px' }}>
                    <span className="block">Should</span>
                    <span className="block">Have</span>
                  </th>
                  <th className="px-2 py-0.5 text-[10px] font-semibold text-right pr-2 leading-tight" style={{ width: '56px' }}>
                    <span className="block">Balance</span>
                    <span className="block">Gap</span>
                  </th>
                  <th className="px-2 py-0.5 text-[10px] font-semibold text-center" style={{ width: '48px' }}>Track</th>
                </>
              )}

              {/* Notes - show in both modes */}
              {showNotes && (
                <th className={mode === 'onboarding'
                  ? "px-2 py-2.5 text-center text-[11px] font-semibold text-text-medium uppercase tracking-wide"
                  : "py-0.5 text-[10px] font-semibold text-center"
                } style={{ width: mode === 'onboarding' ? '4%' : '24px' }} title="Notes">
                  <MessageSquare className={mode === 'onboarding' ? "h-4 w-4 mx-auto text-text-medium" : "h-3 w-3 mx-auto text-muted-foreground"} />
                </th>
              )}

              {/* Actions column */}
              <th className={mode === 'onboarding'
                ? "px-2 py-2.5 text-[11px] font-semibold text-text-medium uppercase tracking-wide"
                : "py-0.5 text-[10px] font-semibold"
              } style={{ width: mode === 'onboarding' ? '4%' : '32px' }}></th>
            </tr>
          </thead>
          )}
          <tbody>
            {sortedEnvelopes.map((envelope, index) => (
              <SortableTableRow
                key={envelope.id}
                envelope={envelope}
                index={index}
                enableDragAndDrop={enableDragAndDrop}
                isDragDisabled={isDragDisabled}
                effectiveShowCategories={effectiveShowCategories}
                effectiveShowOpeningBalance={effectiveShowOpeningBalance}
                effectiveShowCurrentBalance={effectiveShowCurrentBalance}
                effectiveShowDueIn={effectiveShowDueIn}
                paySchedule={paySchedule}
                showIncomeColumns={showIncomeColumns}
                incomeColumnsExpanded={incomeColumnsExpanded}
                activeIncomeSources={activeIncomeSources}
                showNotes={showNotes}
                mode={mode}
                effectiveGapData={effectiveGapData}
                categories={categories}
                payCycle={payCycle}
                focusedCell={focusedCell}
                editingValue={editingValue}
                validateEnvelope={validateEnvelope}
                getTotalAllocation={getTotalAllocation}
                getDisplayValue={getDisplayValue}
                handleCellFocus={handleCellFocus}
                handleCellChange={handleCellChange}
                handleCellBlur={handleCellBlur}
                onEnvelopeUpdate={onEnvelopeUpdate}
                onEnvelopeDelete={onEnvelopeDelete}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// SortableTableRow component - handles individual row with drag handle
function SortableTableRow({
  envelope,
  index,
  enableDragAndDrop,
  isDragDisabled,
  effectiveShowCategories,
  effectiveShowOpeningBalance,
  effectiveShowCurrentBalance,
  effectiveShowDueIn,
  paySchedule,
  showIncomeColumns,
  incomeColumnsExpanded,
  activeIncomeSources,
  showNotes,
  mode,
  effectiveGapData,
  categories,
  payCycle,
  focusedCell,
  editingValue,
  validateEnvelope,
  getTotalAllocation,
  getDisplayValue,
  handleCellFocus,
  handleCellChange,
  handleCellBlur,
  onEnvelopeUpdate,
  onEnvelopeDelete,
}: {
  envelope: UnifiedEnvelopeData;
  index: number;
  enableDragAndDrop: boolean;
  isDragDisabled: boolean;
  effectiveShowCategories: boolean;
  effectiveShowOpeningBalance: boolean;
  effectiveShowCurrentBalance: boolean;
  effectiveShowDueIn: boolean;
  paySchedule?: PaySchedule | null;
  showIncomeColumns: boolean;
  incomeColumnsExpanded: boolean;
  activeIncomeSources: any[];
  showNotes: boolean;
  mode: 'onboarding' | 'maintenance';
  effectiveGapData: any[];
  categories: CategoryOption[];
  payCycle: string;
  focusedCell: { envelopeId: string; field: string } | null;
  editingValue: string;
  validateEnvelope: (envelope: UnifiedEnvelopeData) => any[];
  getTotalAllocation: (envelope: UnifiedEnvelopeData) => number;
  getDisplayValue: (envelopeId: string, field: string, defaultValue: string | number) => string;
  handleCellFocus: (envelopeId: string, field: string, currentValue: string | number) => void;
  handleCellChange: (envelopeId: string, field: string, value: string) => void;
  handleCellBlur: (envelopeId: string, field: string, value: string) => void;
  onEnvelopeUpdate: (id: string, updates: Partial<UnifiedEnvelopeData>) => void | Promise<void>;
  onEnvelopeDelete: (id: string) => void | Promise<void>;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: envelope.id,
    disabled: isDragDisabled || !enableDragAndDrop,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const warnings = validateEnvelope(envelope);
  const totalAllocation = getTotalAllocation(envelope);
  const openingBalanceCalculation = effectiveShowOpeningBalance
    ? calculateOpeningBalance({
        targetAmount: envelope.targetAmount || 0,
        frequency: envelope.frequency || 'monthly',
        dueDate: envelope.dueDate,
        totalPerCycleAllocation: totalAllocation,
        payCycle: payCycle as any,
      })
    : null;

  // Check if envelope is locked (e.g., CC Holding during onboarding)
  const isLocked = envelope.isLocked === true;

  return (
    <tr
      ref={setNodeRef}
      style={style}
      data-envelope-id={envelope.id}
      className={`border-t hover:bg-muted/50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} ${isDragging ? 'opacity-50' : ''} ${isLocked ? 'opacity-70' : ''}`}
    >
      {/* Drag Handle */}
      {enableDragAndDrop && (
        <td className="w-5 min-w-[20px] max-w-[20px] px-0 py-0">
          {!isDragDisabled ? (
            <button
              type="button"
              aria-label={`Reorder ${envelope.name}`}
              className="flex-shrink-0 p-0 text-muted-foreground hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-grab active:cursor-grabbing"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-3 w-3" />
            </button>
          ) : (
            <div className="w-3" />
          )}
        </td>
      )}

      {/* Priority - Traffic Light Dots (only show in maintenance mode) */}
      {mode !== 'onboarding' && (
        <td className="w-5 min-w-[20px] max-w-[20px] py-0.5 text-center">
          {envelope.subtype !== 'savings' && envelope.subtype !== 'tracking' ? (
            <Select
              value={envelope.priority || 'important'}
              onValueChange={(value) => onEnvelopeUpdate(envelope.id, { priority: value as any })}
              disabled={isLocked}
            >
              <SelectTrigger className="h-4 w-4 border-0 focus:ring-0 p-0 justify-center [&>svg]:hidden" title={
                envelope.priority === 'essential' ? 'Essential' :
                envelope.priority === 'discretionary' ? 'Flexible' : 'Important'
              }>
                {/* Priority colors: Blue (essential) → Sage (important) → Silver (flexible) */}
                <span className={`inline-block h-2 w-2 rounded-full ${
                  envelope.priority === 'essential' ? 'bg-blue' :
                  envelope.priority === 'discretionary' ? 'bg-silver' : 'bg-sage'
                }`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="essential"><span className="inline-block h-2 w-2 rounded-full bg-blue mr-2" />Essential</SelectItem>
                <SelectItem value="important"><span className="inline-block h-2 w-2 rounded-full bg-sage mr-2" />Important</SelectItem>
                <SelectItem value="discretionary"><span className="inline-block h-2 w-2 rounded-full bg-silver mr-2" />Flexible</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <div className="h-4 flex items-center justify-center text-[8px] text-muted-foreground">—</div>
          )}
        </td>
      )}

      {/* Envelope (Icon + Name) for onboarding, or separate columns for maintenance */}
      {/* For savings/goal envelopes with target amount, icon moves to Amount column */}
      {(() => {
        const isSavingsOrGoal = envelope.subtype === 'savings' || envelope.subtype === 'goal';
        const hasTargetAmount = (envelope.targetAmount || 0) > 0;
        const showIconInAmountColumn = isSavingsOrGoal && hasTargetAmount;

        return mode === 'onboarding' ? (
          <td className="px-3 py-2.5">
            <div className="flex items-center gap-2">
              <IconPicker
                selectedIcon={envelope.icon || "wallet"}
                onIconSelect={(newIcon) => onEnvelopeUpdate(envelope.id, { icon: newIcon })}
                size="md"
                disabled={isLocked}
              />
              <Input
                value={getDisplayValue(envelope.id, 'name', envelope.name)}
                onChange={(e) => handleCellChange(envelope.id, 'name', e.target.value)}
                onFocus={() => handleCellFocus(envelope.id, 'name', envelope.name)}
                onBlur={(e) => handleCellBlur(envelope.id, 'name', e.target.value)}
                className="h-7 text-sm font-medium border-0 focus-visible:ring-0 focus:outline-none px-1 flex-1"
                disabled={isLocked}
              />
            </div>
          </td>
        ) : (
          <>
            {/* Icon - hidden for savings/goal with target (icon moves to Amount column) */}
            <td className="w-6 min-w-[24px] max-w-[24px] px-0 py-0">
              {!showIconInAmountColumn ? (
                <IconPicker
                  selectedIcon={envelope.icon || "wallet"}
                  onIconSelect={(newIcon) => onEnvelopeUpdate(envelope.id, { icon: newIcon })}
                  size="sm"
                  disabled={isLocked}
                />
              ) : (
                <span className="text-muted-foreground text-[10px]">—</span>
              )}
            </td>

            {/* Name */}
            {/* Name */}
            <td className="w-24 min-w-[96px] max-w-[96px] pl-1 pr-0 py-0.5">
              <Input
                value={getDisplayValue(envelope.id, 'name', envelope.name)}
                onChange={(e) => handleCellChange(envelope.id, 'name', e.target.value)}
                onFocus={() => handleCellFocus(envelope.id, 'name', envelope.name)}
                onBlur={(e) => handleCellBlur(envelope.id, 'name', e.target.value)}
                className="h-6 text-[11px] font-medium border-0 focus-visible:ring-0 focus:outline-none px-0.5"
                disabled={isLocked}
              />
            </td>
          </>
        );
      })()}

      {/* Category */}
      {effectiveShowCategories && (
        <td className="w-20 min-w-[80px] max-w-[80px] px-0.5 py-0.5">
          <Select
            value={envelope.categoryId || '__none__'}
            onValueChange={(value) => onEnvelopeUpdate(envelope.id, { categoryId: value === '__none__' ? undefined : value })}
            disabled={isLocked}
          >
            <SelectTrigger className="h-6 text-[11px] border-0 focus:ring-0 focus:outline-none px-0.5">
              <SelectValue placeholder="None">
                {categories.find(c => c.id === envelope.categoryId)?.name || 'None'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </td>
      )}

      {/* Type */}
      <td className={mode === 'onboarding' ? "px-3 py-2.5" : "w-11 min-w-[44px] max-w-[44px] px-0 py-0.5"}>
        <Select
          value={envelope.subtype}
          onValueChange={(value) => onEnvelopeUpdate(envelope.id, { subtype: value as any })}
          disabled={isLocked}
        >
          <SelectTrigger className={mode === 'onboarding'
            ? "h-7 text-sm border border-border rounded px-2 focus:ring-1"
            : "h-6 w-auto text-[11px] border-0 focus:ring-0 focus:outline-none px-0.5 justify-start gap-0 [&>svg]:hidden [&>span]:flex-none"
          }>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="bill">Bill</SelectItem>
            <SelectItem value="spending">Spending</SelectItem>
            <SelectItem value="savings">Savings</SelectItem>
            <SelectItem value="tracking">Tracking</SelectItem>
          </SelectContent>
        </Select>
      </td>

      {/* Opening Balance Needed - only in maintenance or when explicitly enabled */}
      {effectiveShowOpeningBalance && (
        <td className="w-12 min-w-[48px] max-w-[48px] px-0.5 py-0.5">
          <div className="h-6 flex items-center justify-end text-[11px] text-muted-foreground pr-1">
            {openingBalanceCalculation?.isFullyFunded ? (
              <span className="text-sage">$0.00</span>
            ) : (
              <span className="text-blue">
                ${openingBalanceCalculation?.openingBalanceNeeded.toFixed(2)}
              </span>
            )}
          </div>
        </td>
      )}

      {/* Payment Amount - For savings/goal with target, show icon here */}
      <td className={mode === 'onboarding' ? "px-3 py-2.5 text-right" : "w-14 min-w-[56px] max-w-[56px] px-0.5 py-0.5 text-center"}>
        {(() => {
          const isSavingsOrGoal = envelope.subtype === 'savings' || envelope.subtype === 'goal';
          const hasTargetAmount = (envelope.targetAmount || 0) > 0;
          const showIconHere = mode !== 'onboarding' && isSavingsOrGoal && hasTargetAmount;

          if (showIconHere) {
            // For savings/goal with target: show icon + amount in a compact layout
            return (
              <div className="flex items-center justify-center gap-0.5">
                <IconPicker
                  selectedIcon={envelope.icon || "wallet"}
                  onIconSelect={(newIcon) => onEnvelopeUpdate(envelope.id, { icon: newIcon })}
                  size="sm"
                  disabled={isLocked}
                />
                <span className="text-[10px] text-sage-dark font-medium" title={`Target: $${(envelope.targetAmount || 0).toFixed(2)}`}>
                  ✓
                </span>
              </div>
            );
          }

          // Default: show editable input
          return (
            <Input
              type="text"
              inputMode="decimal"
              value={getDisplayValue(envelope.id, 'targetAmount', (envelope.targetAmount || 0).toFixed(2))}
              onFocus={() => handleCellFocus(envelope.id, 'targetAmount', envelope.targetAmount || 0)}
              onChange={(e) => handleCellChange(envelope.id, 'targetAmount', e.target.value)}
              onBlur={(e) => handleCellBlur(envelope.id, 'targetAmount', e.target.value)}
              className={mode === 'onboarding'
                ? "h-7 text-sm text-right border border-border rounded px-2 focus:ring-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                : "h-6 text-[11px] text-center border-0 focus-visible:ring-0 focus:outline-none px-0.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              }
              placeholder="0.00"
              disabled={isLocked}
            />
          );
        })()}
      </td>

      {/* Frequency - Available for bills, spending, and savings */}
      <td className={mode === 'onboarding' ? "px-3 py-2.5" : "w-20 min-w-[80px] max-w-[80px] px-0.5 py-0.5 text-center"}>
        {envelope.subtype === 'bill' || envelope.subtype === 'spending' || envelope.subtype === 'savings' ? (
          <Select
            value={envelope.frequency || 'monthly'}
            onValueChange={(value) => onEnvelopeUpdate(envelope.id, { frequency: value as any })}
            disabled={isLocked}
          >
            <SelectTrigger className={mode === 'onboarding'
              ? "h-7 text-sm border border-border rounded px-2 focus:ring-1"
              : "h-6 w-full text-[11px] border-0 focus:ring-0 focus:outline-none px-0.5 justify-center gap-0 [&>svg]:hidden"
            }>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="fortnightly">Fortnightly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="annually">Annually</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <div className={mode === 'onboarding' ? "h-7 flex items-center text-sm text-muted-foreground" : "h-6 flex items-center justify-center text-[11px] text-muted-foreground"}>—</div>
        )}
      </td>

      {/* Due Date - Available for bills, spending, savings, and goals */}
      <td className={mode === 'onboarding' ? "px-3 py-2.5" : "w-20 min-w-[80px] max-w-[80px] px-0.5 py-0.5"}>
        {envelope.subtype === 'bill' || envelope.subtype === 'spending' || envelope.subtype === 'savings' || envelope.subtype === 'goal' ? (
          <div className="relative flex items-center">
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
              onChange={(e) => {
                const dateStr = e.target.value;
                // Allow setting or clearing the date
                onEnvelopeUpdate(envelope.id, { dueDate: dateStr || null as any });
              }}
              className={mode === 'onboarding'
                ? "h-7 w-full text-sm px-2 pr-6 border border-border rounded bg-background hover:bg-muted focus:outline-none focus:ring-1"
                : "h-6 w-full text-[11px] px-0.5 pr-4 border border-border rounded bg-background hover:bg-muted focus:outline-none focus:ring-0"
              }
              disabled={isLocked}
            />
            {/* Clear button - only show when date is set */}
            {envelope.dueDate && !isLocked && (
              <button
                type="button"
                onClick={() => onEnvelopeUpdate(envelope.id, { dueDate: null as any })}
                className={mode === 'onboarding'
                  ? "absolute right-1 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded"
                  : "absolute right-0.5 top-1/2 -translate-y-1/2 h-4 w-4 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded text-[10px]"
                }
                title="Clear due date"
              >
                ×
              </button>
            )}
          </div>
        ) : (
          <div className={mode === 'onboarding' ? "h-7 flex items-center text-sm text-muted-foreground" : "h-6 flex items-center justify-center text-[11px] text-muted-foreground"}>—</div>
        )}
      </td>

      {/* Fund From / Funded By - Simple dropdown matching allocation page (Primary/Secondary/Split) */}
      {showIncomeColumns && (
        <td className={mode === 'onboarding' ? "px-3 py-2.5" : "w-24 min-w-[96px] max-w-[96px] px-0.5 py-0.5"}>
          <FundFromSelector
            envelope={envelope}
            incomeSources={activeIncomeSources}
            onAllocationChange={(incomeId, amount) => {
              handleCellBlur(envelope.id, `allocation_${incomeId}`, String(amount));
            }}
            isOnboarding={mode === 'onboarding'}
            payCycle={payCycle}
          />
        </td>
      )}

      {/* Per Pay - Calculated amount needed each pay cycle */}
      {showIncomeColumns && (() => {
        const perPayAmount = calculatePerPayAmount(
          envelope.targetAmount || 0,
          envelope.frequency,
          payCycle
        );
        return (
          <td className={mode === 'onboarding' ? "px-3 py-2.5 text-right" : "w-14 min-w-[56px] max-w-[56px] px-0.5 py-0.5"}>
            <div className={mode === 'onboarding'
              ? "h-7 flex items-center justify-end text-sm font-semibold text-muted-foreground"
              : "h-6 flex items-center justify-end text-[11px] font-semibold pr-1 text-muted-foreground"
            }>
              {perPayAmount > 0 ? `$${perPayAmount.toFixed(2)}` : '—'}
            </div>
          </td>
        );
      })()}

      {/* On Track Status - Simple indicator if fully allocated */}
      {showIncomeColumns && (() => {
        const target = envelope.targetAmount || 0;
        const perPayNeeded = calculatePerPayAmount(target, envelope.frequency, payCycle);
        const isFullyAllocated = totalAllocation >= perPayNeeded - 0.01;
        const isOverAllocated = totalAllocation > perPayNeeded + 0.01;

        return (
          <td className={mode === 'onboarding' ? "px-3 py-2.5 text-center" : "w-12 min-w-[48px] max-w-[48px] px-0.5 py-0.5"}>
            <div className={mode === 'onboarding' ? "h-7 flex items-center justify-center" : "h-6 flex items-center justify-center"}>
              {target === 0 || perPayNeeded === 0 ? (
                <span className="text-muted-foreground text-[10px]">—</span>
              ) : isFullyAllocated ? (
                <span className="text-sage font-bold text-sm" title={isOverAllocated ? `Over by $${(totalAllocation - perPayNeeded).toFixed(2)}` : 'Fully funded'}>✓</span>
              ) : (
                <span className={mode === 'onboarding' ? "text-blue font-semibold text-xs" : "text-blue font-semibold text-[10px]"} title={`Need $${(perPayNeeded - totalAllocation).toFixed(2)} more`}>
                  -${(perPayNeeded - totalAllocation).toFixed(2)}
                </span>
              )}
            </div>
          </td>
        );
      })()}

      {/* Current Balance (Maintenance) */}
      {effectiveShowCurrentBalance && (
        <td className="w-12 min-w-[48px] max-w-[48px] px-0.5 py-0.5">
          <div className="h-6 flex items-center justify-end text-[11px] font-semibold pr-1">
            ${(envelope.currentAmount || 0).toFixed(2)}
          </div>
        </td>
      )}

      {/* Due In - Pays until due (Maintenance mode with pay schedule) */}
      {effectiveShowDueIn && (() => {
        // Only show for bills with due dates
        if (envelope.subtype !== 'bill' || !envelope.dueDate || !paySchedule) {
          return (
            <td className="w-14 min-w-[56px] max-w-[56px] px-0.5 py-0.5">
              <div className="h-6 flex items-center justify-center">
                <PaysUntilDuePlaceholder />
              </div>
            </td>
          );
        }

        const nextDue = getNextDueDate(envelope.dueDate);
        if (!nextDue) {
          return (
            <td className="w-14 min-w-[56px] max-w-[56px] px-0.5 py-0.5">
              <div className="h-6 flex items-center justify-center">
                <PaysUntilDuePlaceholder />
              </div>
            </td>
          );
        }

        const isFunded = (envelope.currentAmount ?? 0) >= (envelope.targetAmount ?? 0);
        const paysResult = calculatePaysUntilDue(nextDue, paySchedule, isFunded);

        return (
          <td className="w-14 min-w-[56px] max-w-[56px] px-0.5 py-0.5">
            <div className="h-6 flex items-center justify-center">
              <PaysUntilDueBadge
                urgency={paysResult.urgency}
                displayText={paysResult.displayText}
                isFunded={isFunded}
              />
            </div>
          </td>
        );
      })()}

      {/* Gap Analysis Columns - Show in maintenance mode */}
      {mode === 'maintenance' && (() => {
        const gap = effectiveGapData.find((g: any) => g.envelope_id === envelope.id);
        if (!gap) {
          return (
            <>
              <td className="w-12 min-w-[48px] max-w-[48px] px-0.5 py-0.5"><div className="h-6 flex items-center justify-end text-[11px] text-muted-foreground pr-1">-</div></td>
              <td className="w-14 min-w-[56px] max-w-[56px] px-0.5 py-0.5"><div className="h-6 flex items-center justify-end text-[11px] text-muted-foreground pr-1">-</div></td>
              <td className="w-12 min-w-[48px] max-w-[48px] px-0.5 py-0.5"><div className="h-6 flex items-center justify-center text-[11px] text-muted-foreground">-</div></td>
            </>
          );
        }

        const getStatusBadge = (status: typeof gap.status) => {
          switch (status) {
            case "on_track":
              return (
                <Badge variant="outline" className="bg-sage-very-light text-sage-dark border-sage-light text-[9px] px-0.5 py-0">
                  OK
                </Badge>
              );
            case "slight_deviation":
              return (
                <Badge variant="outline" className="bg-gold-light text-[#8B7035] border-gold text-[9px] px-0.5 py-0">
                  Gap
                </Badge>
              );
            case "needs_attention":
              return (
                <Badge variant="outline" className="bg-blue-light text-[#4A7BA8] border-blue text-[9px] px-0.5 py-0">
                  !
                </Badge>
              );
          }
        };

        return (
          <>
            {/* Expected Balance */}
            <td className="w-12 min-w-[48px] max-w-[48px] px-0.5 py-0.5">
              <div className="h-6 flex items-center justify-end text-[11px] text-muted-foreground pr-1">
                ${gap.expected_balance.toFixed(2)}
              </div>
            </td>

            {/* Gap */}
            <td className="w-14 min-w-[56px] max-w-[56px] px-0.5 py-0.5">
              <div className={`h-6 flex items-center justify-end text-[11px] font-semibold pr-1 ${
                gap.gap >= 0
                  ? "text-sage"
                  : gap.gap > -50
                  ? "text-gold"
                  : "text-blue"
              }`}>
                {gap.gap >= 0 ? "+" : ""}{gap.gap.toFixed(2)}
              </div>
            </td>

            {/* Status */}
            <td className="w-12 min-w-[48px] max-w-[48px] px-0.5 py-0.5">
              <div className="h-6 flex items-center justify-center">
                {getStatusBadge(gap.status)}
              </div>
            </td>
          </>
        );
      })()}

      {/* Notes - Icon with hover tooltip (show in both modes) */}
      {showNotes && (
        <td className={mode === 'onboarding' ? "px-3 py-2.5 text-center" : "w-6 min-w-[24px] max-w-[24px] py-0.5 text-center"}>
          <div className="relative group flex items-center justify-center">
            <button
              type="button"
              className={mode === 'onboarding'
                ? `h-7 w-7 flex items-center justify-center rounded hover:bg-muted ${
                    envelope.notes ? 'text-sage-dark' : 'text-muted-foreground/40'
                  }`
                : `h-4 w-4 flex items-center justify-center rounded hover:bg-muted ${
                    envelope.notes ? 'text-primary' : 'text-muted-foreground/40'
                  }`
              }
              onClick={() => {
                const newNote = prompt('Enter note:', envelope.notes || '');
                if (newNote !== null) {
                  onEnvelopeUpdate(envelope.id, { notes: newNote || undefined });
                }
              }}
              title={envelope.notes || 'Add note'}
            >
              <MessageSquare className={mode === 'onboarding' ? "h-4 w-4" : "h-3 w-3"} />
            </button>
            {/* Hover tooltip for full note */}
            {envelope.notes && (
              <div className="absolute right-0 bottom-full mb-1 hidden group-hover:block z-50">
                <div className="bg-popover border border-border rounded-md shadow-lg p-2 min-w-[150px] max-w-[250px]">
                  <p className="text-xs font-semibold text-foreground mb-1">Note:</p>
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap">{envelope.notes}</p>
                </div>
              </div>
            )}
          </div>
        </td>
      )}

      {/* Actions: Warning/Info + Delete */}
      <td className={mode === 'onboarding' ? "px-3 py-2.5" : "w-8 min-w-[32px] max-w-[32px] py-0.5 text-center"}>
        <div className="flex items-center justify-center gap-1">
          {/* Locked Info Icon with Hover Tooltip */}
          {isLocked && envelope.lockedReason && (
            <div className="relative group">
              <Info className="h-4 w-4 cursor-help text-blue" />
              <div className="absolute right-0 bottom-full mb-1 hidden group-hover:block z-50 opacity-100">
                <div className="bg-white border border-gray-300 rounded-md shadow-xl p-2 min-w-[200px] max-w-[280px]" style={{ backgroundColor: '#ffffff' }}>
                  <p className="text-xs text-gray-800">{envelope.lockedReason}</p>
                </div>
              </div>
            </div>
          )}
          {/* Warning Icon with Hover Tooltip (only show if not locked) */}
          {!isLocked && warnings.length > 0 && (
            <div className="relative group">
              <AlertTriangle className={`h-3 w-3 cursor-help ${
                warnings.some((w: any) => w.type === 'error') ? 'text-blue' :
                warnings.some((w: any) => w.type === 'warning') ? 'text-gold' : 'text-blue'
              }`} />
              <div className="absolute right-0 bottom-full mb-1 hidden group-hover:block z-50 opacity-100">
                <div className="bg-white border border-gray-300 rounded-md shadow-xl p-2 min-w-[180px] max-w-[250px]" style={{ backgroundColor: '#ffffff' }}>
                  <p className="text-xs font-semibold text-gray-900 mb-1">Warnings:</p>
                  <ul className="text-xs space-y-0.5">
                    {warnings.map((warning: any, wIndex: number) => (
                      <li key={wIndex} className={`flex items-start gap-1 ${
                        warning.type === 'error' ? 'text-red-600' :
                        warning.type === 'warning' ? 'text-amber-600' : 'text-blue-600'
                      }`}>
                        <span className="mt-0.5">•</span>
                        <span>{warning.message}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
          {/* Delete Button (hidden when locked) */}
          {!isLocked && (
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 text-silver hover:text-blue hover:bg-blue-light"
              onClick={() => {
                if (confirm(`Delete "${envelope.name}"?`)) {
                  onEnvelopeDelete(envelope.id);
                }
              }}
            >
              <Trash2 className="h-2.5 w-2.5" />
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}

/**
 * FundFromSelector - Simple dropdown for selecting which income source funds an envelope
 * Matches the allocation page design: Primary / Secondary / Split options
 * Auto-fills with calculated per-pay amount when selecting an option
 */
function FundFromSelector({
  envelope,
  incomeSources,
  onAllocationChange,
  isOnboarding = false,
  payCycle = 'fortnightly',
}: {
  envelope: UnifiedEnvelopeData;
  incomeSources: Array<{ id: string; name: string; amount: number }>;
  onAllocationChange: (incomeId: string, amount: number) => void;
  isOnboarding?: boolean;
  payCycle?: string;
}) {
  // Get current allocations
  const allocations = envelope.incomeAllocations || {};
  const activeAllocations = Object.entries(allocations).filter(([_, amount]) => amount > 0);

  // Calculate per-pay amount for this envelope
  const perPayAmount = calculatePerPayAmount(
    envelope.targetAmount || 0,
    envelope.frequency,
    payCycle
  );

  // Determine current "funded by" state (like allocation page)
  const getFundedBy = (): 'primary' | 'secondary' | 'split' | '' => {
    if (activeAllocations.length === 0) return '';
    if (activeAllocations.length > 1) return 'split';

    const sourceId = activeAllocations[0][0];
    const sourceIndex = incomeSources.findIndex(s => s.id === sourceId);
    return sourceIndex === 0 ? 'primary' : 'secondary';
  };

  const fundedBy = getFundedBy();

  // Handle dropdown change - set allocations based on selection
  const handleFundedByChange = (value: string) => {
    // Clear existing allocations first
    incomeSources.forEach(source => {
      if (allocations[source.id] && allocations[source.id] > 0) {
        onAllocationChange(source.id, 0);
      }
    });

    // Set new allocation based on selection
    if (value === 'primary' && incomeSources[0]) {
      onAllocationChange(incomeSources[0].id, perPayAmount);
    } else if (value === 'secondary' && incomeSources[1]) {
      onAllocationChange(incomeSources[1].id, perPayAmount);
    } else if (value === 'split' && incomeSources.length >= 2) {
      // Split evenly between first two sources
      const half = perPayAmount / 2;
      onAllocationChange(incomeSources[0].id, half);
      // Small delay to avoid race condition with state updates
      setTimeout(() => {
        onAllocationChange(incomeSources[1].id, half);
      }, 10);
    }
    // If value is empty string, all allocations are cleared (unfunded)
  };

  // Style classes based on funded state (matching allocation page)
  const getSelectClass = () => {
    const baseClass = isOnboarding
      ? "h-7 w-full px-2 text-xs border rounded cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
      : "h-6 w-full px-1 text-[10px] border rounded cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary";

    if (fundedBy === 'primary') {
      return `${baseClass} bg-sage-very-light text-sage-dark border-sage-light font-medium`;
    } else if (fundedBy === 'secondary') {
      return `${baseClass} bg-sage-light text-sage-dark border-sage font-medium`;
    } else if (fundedBy === 'split') {
      return `${baseClass} bg-blue-light text-[#4A7BA8] border-blue font-medium`;
    }
    return `${baseClass} bg-background text-muted-foreground border-border`;
  };

  // Get display label for select
  const getDisplayValue = () => {
    if (fundedBy === 'primary') return 'primary';
    if (fundedBy === 'secondary') return 'secondary';
    if (fundedBy === 'split') return 'split';
    return '';
  };

  // Generate option label with income source name (full name, no truncation)
  const getPrimaryLabel = () => {
    if (incomeSources[0]) {
      return incomeSources[0].name;
    }
    return 'Primary';
  };

  const getSecondaryLabel = () => {
    if (incomeSources[1]) {
      return incomeSources[1].name;
    }
    return 'Secondary';
  };

  return (
    <select
      value={getDisplayValue()}
      onChange={(e) => handleFundedByChange(e.target.value)}
      className={getSelectClass()}
      disabled={incomeSources.length === 0}
    >
      <option value="">Select...</option>
      {incomeSources.length >= 1 && (
        <option value="primary">{getPrimaryLabel()}</option>
      )}
      {incomeSources.length >= 2 && (
        <option value="secondary">{getSecondaryLabel()}</option>
      )}
      {incomeSources.length >= 2 && (
        <option value="split">Split 50/50</option>
      )}
    </select>
  );
}
