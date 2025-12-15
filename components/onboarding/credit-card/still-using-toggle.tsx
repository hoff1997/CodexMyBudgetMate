'use client';

/**
 * Still Using Toggle
 *
 * Toggle for Options B/C to determine if the card is still being used
 * for new purchases (hybrid mode) or frozen (debt paydown only).
 */

import { CreditCard, Lock, ShoppingCart } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface StillUsingToggleProps {
  value: boolean;
  onChange: (stillUsing: boolean) => void;
  cardName: string;
}

export function StillUsingToggle({
  value,
  onChange,
  cardName,
}: StillUsingToggleProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between p-4 bg-background rounded-xl border border-border">
        <div className="flex items-center gap-3">
          {value ? (
            <ShoppingCart className="w-5 h-5 text-blue" />
          ) : (
            <Lock className="w-5 h-5 text-sage" />
          )}
          <div>
            <Label htmlFor="stillUsing" className="text-sm font-medium text-text-dark cursor-pointer">
              Still using this card?
            </Label>
            <p className="text-xs text-text-light mt-0.5">
              {value
                ? 'New purchases will be tracked separately from your debt'
                : 'Card is frozen - focusing on paying down existing debt'}
            </p>
          </div>
        </div>
        <Switch
          id="stillUsing"
          checked={value}
          onCheckedChange={onChange}
        />
      </div>

      {/* Explanation based on selection */}
      <div className={`p-3 rounded-lg text-xs ${
        value
          ? 'bg-blue-light/30 border border-blue/30'
          : 'bg-sage-light/30 border border-sage/30'
      }`}>
        {value ? (
          <div className="space-y-2">
            <p className="font-medium text-text-dark">Hybrid Mode Active</p>
            <ul className="space-y-1 text-text-medium">
              <li className="flex items-start gap-2">
                <span className="text-blue mt-0.5">•</span>
                <span>New purchases are tracked in a separate "This Statement" bucket</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue mt-0.5">•</span>
                <span>Money is automatically set aside in your CC Holding envelope</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue mt-0.5">•</span>
                <span>Your starting debt stays separate and tracks your payoff progress</span>
              </li>
            </ul>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="font-medium text-text-dark">Frozen Mode Active</p>
            <ul className="space-y-1 text-text-medium">
              <li className="flex items-start gap-2">
                <span className="text-sage mt-0.5">•</span>
                <span>No new purchases will be tracked on this card</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-sage mt-0.5">•</span>
                <span>All payments go toward reducing your debt</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-sage mt-0.5">•</span>
                <span>Focus 100% on becoming debt-free</span>
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
