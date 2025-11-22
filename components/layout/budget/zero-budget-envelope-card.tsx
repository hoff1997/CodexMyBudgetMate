"use client";

import { useState, useRef, useEffect } from "react";
import { GripVertical, Trash2, ArrowUpCircle, ArrowDownCircle, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface ZeroBudgetEnvelope {
  id: string;
  name: string;
  icon?: string | null;
  envelope_type?: string;
  target_amount?: number | string;
  pay_cycle_amount?: number | string;
  annual_amount?: number | string;
  current_amount?: number | string;
  opening_balance?: number | string;
  frequency?: string;
  next_payment_due?: string;
  notes?: string | null;
}

interface Props {
  envelope: ZeroBudgetEnvelope;
  payCycle: string;
  onUpdate: (id: string, data: any) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  isDragging?: boolean;
}

export function ZeroBudgetEnvelopeCard({
  envelope,
  payCycle,
  onUpdate,
  onDelete,
  isDragging = false,
}: Props) {
  const isIncome = envelope.envelope_type === "income";
  const current = Number(envelope.current_amount ?? 0);
  const target = Number(envelope.target_amount ?? 0);
  const perPay = Number(envelope.pay_cycle_amount ?? 0);
  const annual = Number(envelope.annual_amount ?? 0);
  const opening = Number(envelope.opening_balance ?? 0);
  const percentage = target ? Math.min(100, Math.max(0, Math.round((current / target) * 100))) : 0;

  // Calculate expected balance (simplified - using opening + perPay for now)
  const expected = opening + perPay;
  const balanceDifference = current - expected;

  // Editing state with focus/blur behavior
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");

  // Status indicator color
  let indicatorClass = "bg-emerald-500";
  if (isIncome) {
    indicatorClass = "bg-blue-500";
  } else if (!target) {
    indicatorClass = "bg-gray-400";
  } else if (current < target) {
    indicatorClass = "bg-rose-500";
  } else if (current > target * 1.05) {
    indicatorClass = "bg-sky-500";
  }

  const payCycleMultiplier = payCycle === "weekly" ? 52 : payCycle === "fortnightly" ? 26 : 12;

  const handleFieldFocus = (field: string) => {
    setFocusedField(field);
    setEditingValue(""); // Clear on focus like calculator mode
  };

  const handleFieldBlur = async (field: string, value: string) => {
    if (value === "") {
      setFocusedField(null);
      return;
    }

    const data: any = {};

    // Handle special synchronization
    if (field === "pay_cycle_amount") {
      data.pay_cycle_amount = value;
      data.annual_amount = (parseFloat(value || "0") * payCycleMultiplier).toFixed(2);
    } else if (field === "annual_amount") {
      data.annual_amount = value;
      data.pay_cycle_amount = (parseFloat(value || "0") / payCycleMultiplier).toFixed(2);
    } else {
      data[field] = value;
    }

    await onUpdate(envelope.id, data);
    setFocusedField(null);
    setEditingValue("");
  };

  const handleFieldChange = (field: string, value: string) => {
    setEditingValue(value);
    // Real-time update on keystroke
    handleFieldBlur(field, value);
  };

  const getDisplayValue = (field: string, defaultValue: number) => {
    if (focusedField === field) {
      return editingValue;
    }
    return defaultValue.toFixed(2);
  };

  return (
    <div
      className={cn(
        "w-full rounded-lg border border-border bg-card p-3 shadow-sm transition",
        isDragging && "opacity-50",
        !isDragging && "hover:border-primary/40 hover:shadow"
      )}
    >
      <div className="flex flex-col gap-3">
        {/* ROW 1: Drag Handle + Icon + Name + Type Toggle + Delete */}
        <div className="flex items-center gap-2">
          <div className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
            <GripVertical className="h-5 w-5" />
          </div>

          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm">
            {envelope.icon ?? (isIncome ? "💰" : "💼")}
          </div>

          <div className="flex-1 min-w-0">
            <Input
              value={focusedField === "name" ? editingValue : envelope.name}
              onChange={(e) => handleFieldChange("name", e.target.value)}
              onFocus={() => {
                setFocusedField("name");
                setEditingValue(envelope.name);
              }}
              onBlur={(e) => handleFieldBlur("name", e.target.value)}
              className="h-7 text-sm font-semibold border-0 bg-transparent focus:bg-background focus:border-primary px-2"
            />
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => {
              const newType = isIncome ? "expense" : "income";
              onUpdate(envelope.id, { envelope_type: newType });
            }}
            title={`Toggle to ${isIncome ? "expense" : "income"}`}
          >
            {isIncome ? (
              <ArrowUpCircle className="h-4 w-4 text-green-600" />
            ) : (
              <ArrowDownCircle className="h-4 w-4 text-red-600" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => {
              if (confirm(`Delete "${envelope.name}"?`)) {
                onDelete(envelope.id);
              }
            }}
          >
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>

        {/* ROW 2: Notes */}
        <div className="pl-12">
          <Input
            value={focusedField === "notes" ? editingValue : (envelope.notes || "")}
            onChange={(e) => handleFieldChange("notes", e.target.value)}
            onFocus={() => {
              setFocusedField("notes");
              setEditingValue(envelope.notes || "");
            }}
            onBlur={(e) => handleFieldBlur("notes", e.target.value)}
            placeholder="Add notes..."
            className="h-6 text-xs italic text-muted-foreground border-0 bg-transparent focus:bg-background focus:border-border px-2"
          />
        </div>

        {/* ROW 3: Frequency + Due Date + Target (for expenses with schedule) */}
        <div className="flex flex-wrap items-center gap-3 pl-12">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Schedule:</span>
            <Select
              value={envelope.frequency || "monthly"}
              onValueChange={(value) => onUpdate(envelope.id, { frequency: value })}
            >
              <SelectTrigger className="h-7 w-32 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="fortnightly">Fortnight</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="annually">Annual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {envelope.frequency && envelope.frequency !== "none" && (
            <>
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-auto text-xs justify-start font-normal"
                    >
                      <CalendarIcon className="mr-1 h-3 w-3" />
                      {envelope.next_payment_due
                        ? new Date(envelope.next_payment_due).toLocaleDateString("en-NZ", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })
                        : "Set due date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={
                        envelope.next_payment_due
                          ? new Date(envelope.next_payment_due)
                          : undefined
                      }
                      onSelect={(date) => {
                        if (date) {
                          onUpdate(envelope.id, { next_payment_due: date.toISOString() });
                        }
                      }}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {!isIncome && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Bill amount:</span>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={getDisplayValue("target_amount", target)}
                    onChange={(e) => handleFieldChange("target_amount", e.target.value)}
                    onFocus={() => handleFieldFocus("target_amount")}
                    onBlur={(e) => handleFieldBlur("target_amount", e.target.value)}
                    className="h-7 w-20 text-xs text-right bg-transparent focus:bg-background border-0 focus:border-primary"
                    placeholder="0.00"
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* ROW 4: Budget Amounts + Progress Bar */}
        <div className="flex flex-wrap items-center gap-3 pl-12">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Per {payCycle}:</span>
            <Input
              type="text"
              inputMode="decimal"
              value={getDisplayValue("pay_cycle_amount", perPay)}
              onChange={(e) => handleFieldChange("pay_cycle_amount", e.target.value)}
              onFocus={() => handleFieldFocus("pay_cycle_amount")}
              onBlur={(e) => handleFieldBlur("pay_cycle_amount", e.target.value)}
              className="h-7 w-24 text-xs text-right bg-transparent focus:bg-background border-0 focus:border-primary text-blue-600 font-semibold"
              placeholder="0.00"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Annual:</span>
            <Input
              type="text"
              inputMode="decimal"
              value={getDisplayValue("annual_amount", annual)}
              onChange={(e) => handleFieldChange("annual_amount", e.target.value)}
              onFocus={() => handleFieldFocus("annual_amount")}
              onBlur={(e) => handleFieldBlur("annual_amount", e.target.value)}
              className="h-7 w-24 text-xs text-right bg-transparent focus:bg-background border-0 focus:border-primary text-blue-600 font-semibold"
              placeholder="0.00"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Opening:</span>
            <Input
              type="text"
              inputMode="decimal"
              value={getDisplayValue("opening_balance", opening)}
              onChange={(e) => handleFieldChange("opening_balance", e.target.value)}
              onFocus={() => handleFieldFocus("opening_balance")}
              onBlur={(e) => handleFieldBlur("opening_balance", e.target.value)}
              className="h-7 w-24 text-xs text-right bg-transparent focus:bg-background border-0 focus:border-primary"
              placeholder="0.00"
            />
          </div>
        </div>

        {/* ROW 5: Status + Balances */}
        <div className="flex flex-wrap items-center justify-between gap-3 pl-12">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className={cn("h-2 w-2 rounded-full", indicatorClass)} />
              <span className="text-xs font-medium text-muted-foreground">
                {isIncome ? "Income" : current >= target ? "On track" : "Needs funds"}
              </span>
            </div>

            <div className="text-xs text-muted-foreground">
              Current: <span className="font-semibold text-secondary">${current.toFixed(2)}</span>
            </div>

            <div className="text-xs text-muted-foreground">
              Expected: <span className="font-semibold text-secondary">${expected.toFixed(2)}</span>
            </div>

            {Math.abs(balanceDifference) >= 1 && (
              <div
                className={cn(
                  "text-xs font-medium",
                  balanceDifference > 0 ? "text-blue-600" : "text-rose-600"
                )}
              >
                {balanceDifference > 0 ? "+" : ""}${balanceDifference.toFixed(0)}
              </div>
            )}
          </div>

          {!isIncome && target > 0 && (
            <div className="flex items-center gap-2 flex-1 max-w-xs">
              <Progress value={percentage} indicatorClassName={indicatorClass} className="h-2" />
              <span className="text-xs text-muted-foreground whitespace-nowrap">{percentage}%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
