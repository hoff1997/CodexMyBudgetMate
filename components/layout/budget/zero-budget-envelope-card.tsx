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
        "w-full rounded-lg border border-border bg-card p-2 shadow-sm transition",
        isDragging && "opacity-50",
        !isDragging && "hover:border-primary/40 hover:shadow"
      )}
    >
      <div className="flex flex-col gap-1">
        {/* ROW 1: Drag Handle + Icon + Name + Budget Amounts + Type Toggle + Delete */}
        <div className="flex items-center gap-2">
          <div className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
            <GripVertical className="h-4 w-4" />
          </div>

          <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs">
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
              className="h-6 text-xs font-semibold border-0 bg-transparent focus:bg-background focus:border-primary px-1"
            />
          </div>

          {/* Budget Amounts - Inline */}
          <div className="flex items-center gap-1">
            <Input
              type="text"
              inputMode="decimal"
              value={getDisplayValue("pay_cycle_amount", perPay)}
              onChange={(e) => handleFieldChange("pay_cycle_amount", e.target.value)}
              onFocus={() => handleFieldFocus("pay_cycle_amount")}
              onBlur={(e) => handleFieldBlur("pay_cycle_amount", e.target.value)}
              className="h-6 w-16 text-xs text-right bg-transparent focus:bg-background border-0 focus:border-primary text-blue-600 font-semibold"
              placeholder="0.00"
            />
            <span className="text-xs text-muted-foreground">/</span>
            <Input
              type="text"
              inputMode="decimal"
              value={getDisplayValue("annual_amount", annual)}
              onChange={(e) => handleFieldChange("annual_amount", e.target.value)}
              onFocus={() => handleFieldFocus("annual_amount")}
              onBlur={(e) => handleFieldBlur("annual_amount", e.target.value)}
              className="h-6 w-16 text-xs text-right bg-transparent focus:bg-background border-0 focus:border-primary text-blue-600 font-semibold"
              placeholder="0.00"
            />
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => {
              const newType = isIncome ? "expense" : "income";
              onUpdate(envelope.id, { envelope_type: newType });
            }}
            title={`Toggle to ${isIncome ? "expense" : "income"}`}
          >
            {isIncome ? (
              <ArrowUpCircle className="h-3.5 w-3.5 text-green-600" />
            ) : (
              <ArrowDownCircle className="h-3.5 w-3.5 text-red-600" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => {
              if (confirm(`Delete "${envelope.name}"?`)) {
                onDelete(envelope.id);
              }
            }}
          >
            <Trash2 className="h-3 w-3 text-destructive" />
          </Button>
        </div>

        {/* ROW 2: Schedule + Amounts + Status + Progress */}
        <div className="flex items-center gap-2 pl-8">
          {/* Schedule Dropdown */}
          <Select
            value={envelope.frequency || "monthly"}
            onValueChange={(value) => onUpdate(envelope.id, { frequency: value })}
          >
            <SelectTrigger className="h-6 w-20 text-[10px] border-0">
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

          {/* Opening Balance */}
          <Input
            type="text"
            inputMode="decimal"
            value={getDisplayValue("opening_balance", opening)}
            onChange={(e) => handleFieldChange("opening_balance", e.target.value)}
            onFocus={() => handleFieldFocus("opening_balance")}
            onBlur={(e) => handleFieldBlur("opening_balance", e.target.value)}
            className="h-6 w-14 text-xs text-right bg-transparent focus:bg-background border-0 focus:border-primary"
            placeholder="Open"
            title="Opening Balance"
          />

          {/* Current Balance */}
          <span className="text-xs text-muted-foreground" title="Current Balance">
            ${current.toFixed(0)}
          </span>

          {/* Status Indicator */}
          <div className="flex items-center gap-1">
            <div className={cn("h-1.5 w-1.5 rounded-full", indicatorClass)} />
          </div>

          {/* Progress Bar (for expenses with targets) */}
          {!isIncome && target > 0 && (
            <div className="flex items-center gap-1 flex-1 min-w-[80px]">
              <Progress value={percentage} indicatorClassName={indicatorClass} className="h-1.5" />
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">{percentage}%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
