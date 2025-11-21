"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/finance";
import { calculatePerPayAmount, PayFrequency } from "@/lib/cashflow-calculator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

type BillCalculatorProps = {
  billAmount: number;
  billFrequency: PayFrequency;
  dueDate?: Date;
  incomeFrequency: PayFrequency;
  onChange: (perPayAmount: number) => void;
  onBillDetailsChange?: (details: {
    billAmount: number;
    billFrequency: PayFrequency;
    dueDate?: Date;
  }) => void;
};

export function BillCalculator({
  billAmount,
  billFrequency,
  dueDate,
  incomeFrequency,
  onChange,
  onBillDetailsChange,
}: BillCalculatorProps) {
  const [localAmount, setLocalAmount] = useState(billAmount.toString());
  const [localFrequency, setLocalFrequency] = useState<PayFrequency>(billFrequency);
  const [localDueDate, setLocalDueDate] = useState<Date | undefined>(dueDate);

  // Calculate per-pay amount whenever inputs change
  useEffect(() => {
    const amount = parseFloat(localAmount) || 0;
    const daysUntilDue = localDueDate
      ? Math.max(0, Math.floor((localDueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
      : undefined;

    const perPay = calculatePerPayAmount(amount, localFrequency, incomeFrequency, daysUntilDue);
    onChange(perPay);

    if (onBillDetailsChange) {
      onBillDetailsChange({
        billAmount: amount,
        billFrequency: localFrequency,
        dueDate: localDueDate,
      });
    }
  }, [localAmount, localFrequency, localDueDate, incomeFrequency, onChange, onBillDetailsChange]);

  const perPayAmount = calculatePerPayAmount(
    parseFloat(localAmount) || 0,
    localFrequency,
    incomeFrequency,
    localDueDate
      ? Math.max(0, Math.floor((localDueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
      : undefined
  );

  return (
    <div className="space-y-4 p-4 rounded-lg border border-border bg-muted/30">
      <h4 className="text-sm font-semibold text-secondary">Bill Calculator</h4>

      <div className="grid grid-cols-2 gap-4">
        {/* Bill Amount */}
        <div className="space-y-2">
          <Label htmlFor="bill-amount" className="text-xs">
            Bill Amount
          </Label>
          <Input
            id="bill-amount"
            type="number"
            step="0.01"
            value={localAmount}
            onChange={(e) => setLocalAmount(e.target.value)}
            onFocus={(e) => e.target.select()}
            className="h-8 text-sm"
            placeholder="0.00"
          />
        </div>

        {/* Bill Frequency */}
        <div className="space-y-2">
          <Label htmlFor="bill-frequency" className="text-xs">
            Frequency
          </Label>
          <Select value={localFrequency} onValueChange={(v) => setLocalFrequency(v as PayFrequency)}>
            <SelectTrigger id="bill-frequency" className="h-8 text-sm">
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
        </div>
      </div>

      {/* Due Date (Optional) */}
      <div className="space-y-2">
        <Label htmlFor="due-date" className="text-xs">
          Due Date (Optional)
        </Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="due-date"
              variant="outline"
              className="w-full h-8 justify-start text-left text-sm font-normal"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {localDueDate ? format(localDueDate, "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={localDueDate}
              onSelect={setLocalDueDate}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        {localDueDate && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocalDueDate(undefined)}
            className="h-6 text-xs"
          >
            Clear due date
          </Button>
        )}
      </div>

      {/* Calculated Result */}
      <div className="pt-3 border-t border-border">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Per Pay Amount:</span>
          <span className="text-lg font-bold text-primary">{formatCurrency(perPayAmount)}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Based on {incomeFrequency} pay cycle
          {localDueDate && ` and due date`}
        </p>
      </div>
    </div>
  );
}
