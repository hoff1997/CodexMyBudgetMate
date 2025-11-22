"use client";

import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Trash2, CalendarIcon, Plus, AlertTriangle } from "lucide-react";
import { calculateOpeningBalance } from "@/lib/hooks/use-opening-balance-calculator";
import { ValidationWarnings } from "@/components/shared/validation-warnings";
import type {
  UnifiedEnvelopeTableProps,
  UnifiedEnvelopeData,
  ValidationWarning,
} from "@/lib/types/unified-envelope";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function UnifiedEnvelopeTable({
  envelopes,
  incomeSources,
  mode,
  payCycle = 'monthly',
  bankBalance,
  showIncomeColumns = true,
  showOpeningBalance = mode === 'onboarding',
  showCurrentBalance = mode === 'maintenance',
  showNotes = true,
  enableDragAndDrop = false,
  onEnvelopeUpdate,
  onEnvelopeDelete,
  onAllocationUpdate,
  onReorder,
}: UnifiedEnvelopeTableProps) {
  // State for inline editing (calculator mode)
  const [focusedCell, setFocusedCell] = useState<{
    envelopeId: string;
    field: string;
  } | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");

  // State for income column visibility (mobile/tablet)
  const [incomeColumnsExpanded, setIncomeColumnsExpanded] = useState(true);

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
  const totalOpeningBalanceNeeded = showOpeningBalance
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

  // Validate envelope and generate warnings
  const validateEnvelope = useCallback((envelope: UnifiedEnvelopeData): ValidationWarning[] => {
    const warnings: ValidationWarning[] = [];

    // Name required
    if (!envelope.name || envelope.name.trim() === '') {
      warnings.push({ type: 'error', message: 'Name required', field: 'name' });
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
    if (showOpeningBalance && envelope.subtype === 'bill') {
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
  }, [payCycle, showOpeningBalance]);

  return (
    <div className="space-y-4">
      {/* Budget Status Summary */}
      {showOpeningBalance && bankBalance !== undefined && (
        <Alert className={totalOpeningBalanceNeeded > bankBalance ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
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
                <div className="flex items-center gap-2 text-red-700">
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
      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full table-fixed">
          <thead className="bg-muted">
            <tr>
              <th className="px-2 py-1.5 text-left text-xs font-semibold w-12">Icon</th>
              <th className="px-2 py-1.5 text-left text-xs font-semibold w-40">Name</th>
              <th className="px-2 py-1.5 text-left text-xs font-semibold w-24">Type</th>
              <th className="px-2 py-1.5 text-left text-xs font-semibold w-28">Target Amount</th>
              <th className="px-2 py-1.5 text-left text-xs font-semibold w-24">Frequency</th>
              <th className="px-2 py-1.5 text-left text-xs font-semibold w-28">Due Date</th>
              <th className="px-2 py-1.5 text-left text-xs font-semibold w-24">Priority</th>

              {/* Income Allocation Columns */}
              {showIncomeColumns && incomeColumnsExpanded && activeIncomeSources.map((income) => (
                <th key={income.id} className="px-2 py-1.5 text-center text-xs font-semibold w-28">
                  {income.name}
                </th>
              ))}

              {/* Total Funded Column */}
              {showIncomeColumns && (
                <th className="px-2 py-1.5 text-right text-xs font-semibold w-24">Total Funded</th>
              )}

              {/* Opening Balance (Onboarding) */}
              {showOpeningBalance && (
                <th className="px-2 py-1.5 text-right text-xs font-semibold w-28">Opening Needed</th>
              )}

              {/* Current Balance (Maintenance) */}
              {showCurrentBalance && (
                <th className="px-2 py-1.5 text-right text-xs font-semibold w-24">Current</th>
              )}

              {/* Notes */}
              {showNotes && (
                <th className="px-2 py-1.5 text-left text-xs font-semibold w-32">Notes</th>
              )}

              <th className="px-2 py-1.5 text-center text-xs font-semibold w-10">Del</th>
            </tr>
          </thead>
          <tbody>
            {envelopes.map((envelope, index) => {
              const warnings = validateEnvelope(envelope);
              const totalAllocation = getTotalAllocation(envelope);
              const openingBalanceCalculation = showOpeningBalance
                ? calculateOpeningBalance({
                    targetAmount: envelope.targetAmount || 0,
                    frequency: envelope.frequency || 'monthly',
                    dueDate: envelope.dueDate,
                    totalPerCycleAllocation: totalAllocation,
                    payCycle,
                  })
                : null;

              return (
                <tr
                  key={envelope.id}
                  className={`border-t hover:bg-muted/50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                >
                  {/* Icon */}
                  <td className="px-1 py-1">
                    <button
                      type="button"
                      className="text-lg hover:bg-muted rounded px-1"
                      onClick={() => {
                        const newIcon = prompt('Enter emoji icon:', envelope.icon);
                        if (newIcon) onEnvelopeUpdate(envelope.id, { icon: newIcon });
                      }}
                    >
                      {envelope.icon}
                    </button>
                  </td>

                  {/* Name */}
                  <td className="px-1 py-1">
                    <Input
                      value={getDisplayValue(envelope.id, 'name', envelope.name)}
                      onChange={(e) => handleCellChange(envelope.id, 'name', e.target.value)}
                      onFocus={(e) => {
                        setFocusedCell({ envelopeId: envelope.id, field: 'name' });
                        setEditingValue(envelope.name);
                      }}
                      onBlur={(e) => handleCellBlur(envelope.id, 'name', e.target.value)}
                      className="h-7 text-xs font-medium border-0 focus-visible:ring-1"
                    />
                  </td>

                  {/* Type */}
                  <td className="px-1 py-1">
                    <Select
                      value={envelope.subtype}
                      onValueChange={(value) => onEnvelopeUpdate(envelope.id, { subtype: value as any })}
                    >
                      <SelectTrigger className="h-7 text-xs border-0 focus:ring-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bill">Bill</SelectItem>
                        <SelectItem value="spending">Spending</SelectItem>
                        <SelectItem value="savings">Savings</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>

                  {/* Target Amount */}
                  <td className="px-1 py-1">
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={getDisplayValue(envelope.id, 'targetAmount', (envelope.targetAmount || 0).toFixed(2))}
                      onFocus={(e) => handleCellFocus(envelope.id, 'targetAmount', envelope.targetAmount || 0)}
                      onChange={(e) => handleCellChange(envelope.id, 'targetAmount', e.target.value)}
                      onBlur={(e) => handleCellBlur(envelope.id, 'targetAmount', e.target.value)}
                      className="h-7 text-xs text-right border-0 focus-visible:ring-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="0.00"
                    />
                  </td>

                  {/* Frequency */}
                  <td className="px-1 py-1">
                    {envelope.subtype === 'bill' ? (
                      <Select
                        value={envelope.frequency || 'monthly'}
                        onValueChange={(value) => onEnvelopeUpdate(envelope.id, { frequency: value as any })}
                      >
                        <SelectTrigger className="h-7 text-xs border-0 focus:ring-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="fortnightly">Fortnight</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                          <SelectItem value="annually">Annual</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="h-7 flex items-center text-xs text-muted-foreground px-2">—</div>
                    )}
                  </td>

                  {/* Due Date */}
                  <td className="px-1 py-1">
                    {envelope.subtype === 'bill' ? (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="h-7 w-full justify-start text-xs px-2 border-0 hover:bg-muted"
                            type="button"
                          >
                            <CalendarIcon className="h-3 w-3 mr-1" />
                            {envelope.dueDate
                              ? typeof envelope.dueDate === 'number'
                                ? `${envelope.dueDate}${envelope.dueDate === 1 ? 'st' : envelope.dueDate === 2 ? 'nd' : envelope.dueDate === 3 ? 'rd' : 'th'}`
                                : new Date(envelope.dueDate).getDate()
                              : "Date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={
                              envelope.dueDate
                                ? typeof envelope.dueDate === 'number'
                                  ? new Date(2024, 0, envelope.dueDate)
                                  : new Date(envelope.dueDate)
                                : undefined
                            }
                            onSelect={(date) =>
                              onEnvelopeUpdate(envelope.id, { dueDate: date ? date.getDate() : undefined })
                            }
                          />
                        </PopoverContent>
                      </Popover>
                    ) : envelope.subtype === 'savings' ? (
                      <Input
                        type="date"
                        value={
                          envelope.dueDate
                            ? typeof envelope.dueDate === 'string'
                              ? envelope.dueDate
                              : new Date(envelope.dueDate).toISOString().split('T')[0]
                            : ''
                        }
                        onChange={(e) =>
                          onEnvelopeUpdate(envelope.id, { dueDate: e.target.value ? new Date(e.target.value) : undefined })
                        }
                        className="h-7 text-xs border-0 focus-visible:ring-1"
                      />
                    ) : (
                      <div className="h-7 flex items-center text-xs text-muted-foreground px-2">—</div>
                    )}
                  </td>

                  {/* Priority */}
                  <td className="px-1 py-1">
                    {envelope.subtype !== 'savings' ? (
                      <Select
                        value={envelope.priority || 'important'}
                        onValueChange={(value) => onEnvelopeUpdate(envelope.id, { priority: value as any })}
                      >
                        <SelectTrigger className="h-7 text-xs border-0 focus:ring-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="essential">Essential</SelectItem>
                          <SelectItem value="important">Important</SelectItem>
                          <SelectItem value="discretionary">Discretionary</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="h-7 flex items-center text-xs text-muted-foreground px-2">—</div>
                    )}
                  </td>

                  {/* Income Allocation Columns */}
                  {showIncomeColumns && incomeColumnsExpanded && activeIncomeSources.map((income) => (
                    <td key={income.id} className="px-1 py-1">
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={getDisplayValue(
                          envelope.id,
                          `allocation_${income.id}`,
                          (envelope.incomeAllocations?.[income.id] || 0).toFixed(2)
                        )}
                        onFocus={(e) =>
                          handleCellFocus(envelope.id, `allocation_${income.id}`, envelope.incomeAllocations?.[income.id] || 0)
                        }
                        onChange={(e) => handleCellChange(envelope.id, `allocation_${income.id}`, e.target.value)}
                        onBlur={(e) => handleCellBlur(envelope.id, `allocation_${income.id}`, e.target.value)}
                        className="h-7 text-xs text-center border-0 focus-visible:ring-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        placeholder="0.00"
                      />
                    </td>
                  ))}

                  {/* Total Funded */}
                  {showIncomeColumns && (
                    <td className="px-1 py-1">
                      <div
                        className={`h-7 flex items-center justify-end text-xs font-semibold px-2 ${
                          totalAllocation < (envelope.targetAmount || 0)
                            ? 'text-yellow-600'
                            : totalAllocation > (envelope.targetAmount || 0)
                            ? 'text-blue-600'
                            : 'text-green-600'
                        }`}
                      >
                        ${totalAllocation.toFixed(2)}
                      </div>
                    </td>
                  )}

                  {/* Opening Balance Needed (Onboarding) */}
                  {showOpeningBalance && (
                    <td className="px-1 py-1">
                      <div className="text-xs text-muted-foreground text-right px-2">
                        {openingBalanceCalculation?.isFullyFunded ? (
                          <span className="text-green-600">$0.00</span>
                        ) : (
                          <span className="text-orange-600">
                            ${openingBalanceCalculation?.openingBalanceNeeded.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </td>
                  )}

                  {/* Current Balance (Maintenance) */}
                  {showCurrentBalance && (
                    <td className="px-1 py-1">
                      <div className="h-7 flex items-center justify-end text-xs font-semibold px-2">
                        ${(envelope.currentAmount || 0).toFixed(2)}
                      </div>
                    </td>
                  )}

                  {/* Notes */}
                  {showNotes && (
                    <td className="px-1 py-1">
                      <Input
                        value={getDisplayValue(envelope.id, 'notes', envelope.notes || '')}
                        onChange={(e) => handleCellChange(envelope.id, 'notes', e.target.value)}
                        onFocus={(e) => {
                          setFocusedCell({ envelopeId: envelope.id, field: 'notes' });
                          setEditingValue(envelope.notes || '');
                        }}
                        onBlur={(e) => handleCellBlur(envelope.id, 'notes', e.target.value)}
                        className="h-7 text-xs border-0 focus-visible:ring-1"
                        placeholder="Add notes..."
                      />
                    </td>
                  )}

                  {/* Delete */}
                  <td className="px-1 py-1 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => {
                        if (confirm(`Delete "${envelope.name}"?`)) {
                          onEnvelopeDelete(envelope.id);
                        }
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Validation Warnings Summary */}
      {envelopes.some(env => validateEnvelope(env).length > 0) && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
          <p className="text-sm font-medium text-yellow-900 mb-2">Validation Warnings:</p>
          <div className="space-y-1">
            {envelopes.map(env => {
              const warnings = validateEnvelope(env);
              if (warnings.length === 0) return null;
              return (
                <div key={env.id} className="text-xs">
                  <span className="font-medium">{env.name}:</span>{' '}
                  {warnings.map(w => w.message).join(', ')}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
