"use client";

import { CreditCard, Wallet, Shuffle, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import type { AllocationStrategy } from "@/lib/utils/waterfall-allocator";

interface AllocationStrategySelectorProps {
  strategy: AllocationStrategy;
  onChange: (strategy: AllocationStrategy) => void;
  bankBalance: number;
  creditCardDebt: number;
  hybridAmount: number;
  onHybridAmountChange: (amount: number) => void;
  recommendation: AllocationStrategy;
}

const STRATEGIES: {
  key: AllocationStrategy;
  title: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    key: "credit_first",
    title: "Credit Card First",
    description: "Fund your credit card holding first, then fill envelopes by priority",
    icon: CreditCard,
  },
  {
    key: "envelopes_only",
    title: "Envelopes Only",
    description: "All available funds go to envelopes by priority",
    icon: Wallet,
  },
  {
    key: "hybrid",
    title: "Hybrid",
    description: "You decide how much goes to credit card, rest fills envelopes",
    icon: Shuffle,
  },
];

export function AllocationStrategySelector({
  strategy,
  onChange,
  bankBalance,
  creditCardDebt,
  hybridAmount,
  onHybridAmountChange,
  recommendation,
}: AllocationStrategySelectorProps) {
  // Calculate impact preview for each strategy
  const getImpactPreview = (strategyKey: AllocationStrategy): string => {
    switch (strategyKey) {
      case "credit_first":
        const ccFirst = Math.min(creditCardDebt, bankBalance);
        const remainingAfterCC = Math.max(0, bankBalance - creditCardDebt);
        return `$${ccFirst.toLocaleString()} to CC, $${remainingAfterCC.toLocaleString()} to envelopes`;
      case "envelopes_only":
        return `$${bankBalance.toLocaleString()} to envelopes`;
      case "hybrid":
        const envelopesAmount = Math.max(0, bankBalance - hybridAmount);
        return `$${hybridAmount.toLocaleString()} to CC, $${envelopesAmount.toLocaleString()} to envelopes`;
      default:
        return "";
    }
  };

  // Don't show selector if no credit card debt
  if (creditCardDebt <= 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-dark">
          How would you like to allocate your funds?
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {STRATEGIES.map((s) => {
          const isSelected = strategy === s.key;
          const isRecommended = recommendation === s.key;
          const Icon = s.icon;

          return (
            <Card
              key={s.key}
              className={cn(
                "relative cursor-pointer transition-all p-4",
                "border-2 hover:border-sage-light",
                isSelected
                  ? "border-sage bg-sage-very-light"
                  : "border-silver-light bg-white",
                isRecommended && !isSelected && "ring-1 ring-sage-light"
              )}
              onClick={() => onChange(s.key)}
            >
              {/* Selection indicator */}
              <div
                className={cn(
                  "absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center",
                  isSelected
                    ? "bg-sage border-sage"
                    : "border-silver-light bg-white"
                )}
              >
                {isSelected && <Check className="h-3 w-3 text-white" />}
              </div>

              {/* Recommended badge */}
              {isRecommended && (
                <Badge
                  variant="outline"
                  className="absolute top-3 left-3 bg-sage-very-light text-sage-dark border-sage-light text-[10px] px-1.5 py-0"
                >
                  Recommended
                </Badge>
              )}

              <div className="flex flex-col gap-2 mt-4">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
                      isSelected ? "bg-sage" : "bg-silver-very-light"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4",
                        isSelected ? "text-white" : "text-silver"
                      )}
                    />
                  </div>
                  <span className="font-semibold text-sm text-text-dark">
                    {s.title}
                  </span>
                </div>

                <p className="text-xs text-text-medium leading-relaxed">
                  {s.description}
                </p>

                {/* Impact preview */}
                <div className="mt-2 pt-2 border-t border-silver-light">
                  <span className="text-[10px] text-text-light">
                    {getImpactPreview(s.key)}
                  </span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Hybrid amount input */}
      {strategy === "hybrid" && (
        <Card className="p-4 bg-silver-very-light border-silver-light">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium text-text-dark">
                Amount for Credit Card Holding
              </label>
              <p className="text-xs text-text-medium mt-0.5">
                Maximum: ${Math.min(creditCardDebt, bankBalance).toLocaleString()} (your full debt or available funds)
              </p>
            </div>
            <div className="w-40">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-medium">
                  $
                </span>
                <Input
                  type="number"
                  min={0}
                  max={Math.min(creditCardDebt, bankBalance)}
                  value={hybridAmount || ""}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    const maxValue = Math.min(creditCardDebt, bankBalance);
                    onHybridAmountChange(Math.min(Math.max(0, value), maxValue));
                  }}
                  className="pl-7 h-9 text-right"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Slider for quick selection */}
          <div className="mt-3">
            <input
              type="range"
              min={0}
              max={Math.min(creditCardDebt, bankBalance)}
              step={10}
              value={hybridAmount}
              onChange={(e) => onHybridAmountChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-silver-light rounded-lg appearance-none cursor-pointer accent-sage"
            />
            <div className="flex justify-between text-[10px] text-text-light mt-1">
              <span>$0</span>
              <span>${Math.min(creditCardDebt, bankBalance).toLocaleString()}</span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
