'use client';

/**
 * Billing Cycle Inputs
 *
 * Input fields for statement close day and payment due day.
 * Required for all credit card usage types.
 */

import { Calendar, CalendarCheck } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface BillingCycleInputsProps {
  statementCloseDay: number | null;
  paymentDueDay: number | null;
  onStatementCloseDayChange: (day: number) => void;
  onPaymentDueDayChange: (day: number) => void;
  errors?: {
    statementCloseDay?: string;
    paymentDueDay?: string;
  };
}

// Generate day options 1-31
const dayOptions = Array.from({ length: 31 }, (_, i) => i + 1);

export function BillingCycleInputs({
  statementCloseDay,
  paymentDueDay,
  onStatementCloseDayChange,
  onPaymentDueDayChange,
  errors,
}: BillingCycleInputsProps) {
  return (
    <div className="space-y-4 p-4 bg-silver-very-light rounded-xl">
      <div className="flex items-center gap-2 text-text-medium">
        <Calendar className="w-4 h-4" />
        <span className="text-sm font-medium">Billing Cycle</span>
      </div>

      <p className="text-xs text-text-medium">
        This helps us track your spending by statement period so you always know what you owe.
      </p>

      <div className="grid grid-cols-2 gap-4">
        {/* Statement Close Day */}
        <div className="space-y-2">
          <Label htmlFor="statementCloseDay" className="text-sm text-text-medium">
            Statement closes on
          </Label>
          <Select
            value={statementCloseDay?.toString() || ''}
            onValueChange={(val) => onStatementCloseDayChange(parseInt(val, 10))}
          >
            <SelectTrigger
              id="statementCloseDay"
              className={errors?.statementCloseDay ? 'border-red-500' : ''}
            >
              <SelectValue placeholder="Day of month" />
            </SelectTrigger>
            <SelectContent>
              {dayOptions.map((day) => (
                <SelectItem key={day} value={day.toString()}>
                  {getOrdinal(day)} of the month
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors?.statementCloseDay && (
            <p className="text-xs text-red-500">{errors.statementCloseDay}</p>
          )}
          <p className="text-xs text-text-light">
            When your monthly statement is generated
          </p>
        </div>

        {/* Payment Due Day */}
        <div className="space-y-2">
          <Label htmlFor="paymentDueDay" className="text-sm text-text-medium">
            Payment due on
          </Label>
          <Select
            value={paymentDueDay?.toString() || ''}
            onValueChange={(val) => onPaymentDueDayChange(parseInt(val, 10))}
          >
            <SelectTrigger
              id="paymentDueDay"
              className={errors?.paymentDueDay ? 'border-red-500' : ''}
            >
              <SelectValue placeholder="Day of month" />
            </SelectTrigger>
            <SelectContent>
              {dayOptions.map((day) => (
                <SelectItem key={day} value={day.toString()}>
                  {getOrdinal(day)} of the month
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors?.paymentDueDay && (
            <p className="text-xs text-red-500">{errors.paymentDueDay}</p>
          )}
          <p className="text-xs text-text-light">
            When your payment is due each month
          </p>
        </div>
      </div>

      {/* Helper text */}
      {statementCloseDay && paymentDueDay && (
        <div className="mt-3 p-3 bg-white rounded-lg border border-silver-light">
          <p className="text-xs text-text-medium">
            <CalendarCheck className="w-3 h-3 inline mr-1" />
            Your statement closes on the <strong>{getOrdinal(statementCloseDay)}</strong> and payment
            is due on the <strong>{getOrdinal(paymentDueDay)}</strong> of the following month.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Get ordinal suffix for a number (1st, 2nd, 3rd, etc.)
 */
function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
