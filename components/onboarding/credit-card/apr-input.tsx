'use client';

/**
 * APR Input
 *
 * Input field for Annual Percentage Rate with help text.
 * Important for interest calculations and payoff projections.
 */

import { Percent, HelpCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface APRInputProps {
  value: number | null;
  onChange: (apr: number | null) => void;
  error?: string;
  showHelp?: boolean;
}

export function APRInput({ value, onChange, error, showHelp = true }: APRInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
      onChange(null);
    } else {
      const num = parseFloat(val);
      if (!isNaN(num) && num >= 0 && num <= 100) {
        onChange(num);
      }
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label htmlFor="apr" className="text-sm text-text-medium">
          APR (Interest Rate)
        </Label>
        {showHelp && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="text-text-light hover:text-text-medium">
                  <HelpCircle className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="text-sm">
                  Your APR (Annual Percentage Rate) can be found on your credit card statement or
                  card agreement. It's usually between 15% and 30%.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      <div className="relative">
        <Input
          id="apr"
          type="number"
          step="0.01"
          min="0"
          max="100"
          placeholder="e.g., 19.99"
          value={value ?? ''}
          onChange={handleChange}
          className={`pr-8 ${error ? 'border-red-500' : ''}`}
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <Percent className="w-4 h-4 text-text-light" />
        </div>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <p className="text-xs text-text-light">
        This helps us calculate your interest charges and project when you'll be debt-free.
      </p>

      {/* Common APR reference */}
      {showHelp && (
        <div className="mt-2 text-xs text-text-light">
          <span className="font-medium">Common APRs:</span>
          <span className="ml-2">Store cards: 25-30%</span>
          <span className="mx-1">•</span>
          <span>Bank cards: 15-25%</span>
          <span className="mx-1">•</span>
          <span>Low-rate: 10-15%</span>
        </div>
      )}
    </div>
  );
}
