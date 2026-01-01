"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Check, TrendingUp, Shield, Info } from "lucide-react";
import { RemyAvatar } from "@/components/onboarding/remy-tip";
import { cn } from "@/lib/cn";
import {
  getShortMonthName,
  getNZSeason,
  SeasonalPattern,
} from "@/lib/utils/seasonal-bills";
import {
  createLevelingDataFrom12Months,
  analyzeLevelingBenefit,
  DEFAULT_BUFFER_PERCENT,
  type LevelingData,
} from "@/lib/utils/leveled-bills";

interface TwelveMonthEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  envelopeName: string;
  suggestedPattern: SeasonalPattern;
  onBack: () => void;
  onSave: (levelingData: LevelingData) => void;
}

// Get current month as starting point (most recent bills are freshest)
const getCurrentMonthIndex = () => new Date().getMonth();

/**
 * Dialog for entering 12 months of bill amounts to calculate accurate leveling.
 */
export function TwelveMonthEntryDialog({
  open,
  onOpenChange,
  envelopeName,
  suggestedPattern,
  onBack,
  onSave,
}: TwelveMonthEntryDialogProps) {
  // Initialize with empty values for each month
  const [monthlyAmounts, setMonthlyAmounts] = useState<(number | "")[]>(
    Array(12).fill("")
  );
  const [bufferPercent, setBufferPercent] = useState(DEFAULT_BUFFER_PERCENT);

  // Track which months have been filled
  const filledMonths = monthlyAmounts.filter((v) => v !== "" && v > 0).length;
  const allMonthsFilled = filledMonths === 12;

  // Calculate analysis when we have all months
  const analysis = useMemo(() => {
    if (!allMonthsFilled) return null;
    const amounts = monthlyAmounts.map((v) => (v === "" ? 0 : v));
    const levelingData = createLevelingDataFrom12Months(amounts, bufferPercent);
    return {
      levelingData,
      benefit: analyzeLevelingBenefit(levelingData),
    };
  }, [monthlyAmounts, bufferPercent, allMonthsFilled]);

  const handleMonthChange = (monthIndex: number, value: string) => {
    const numValue = value === "" ? "" : parseFloat(value) || 0;
    setMonthlyAmounts((prev) => {
      const next = [...prev];
      next[monthIndex] = numValue;
      return next;
    });
  };

  const handleSave = () => {
    if (!analysis) return;
    onSave(analysis.levelingData);
  };

  // Format currency for display
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-NZ", {
      style: "currency",
      currency: "NZD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);

  // Order months starting from current month going backwards
  const orderedMonths = useMemo(() => {
    const currentMonth = getCurrentMonthIndex();
    const months: number[] = [];
    for (let i = 0; i < 12; i++) {
      months.push((currentMonth - i + 12) % 12);
    }
    return months;
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <RemyAvatar pose="thinking" size="sm" />
            <div>
              <DialogTitle className="text-lg">
                Enter your {envelopeName} bills
              </DialogTitle>
              <DialogDescription className="text-sm mt-1">
                Enter the last 12 months of bills to calculate your leveled amount
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress indicator */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {filledMonths} of 12 months entered
            </span>
            <div className="w-32 h-2 bg-silver-very-light rounded-full overflow-hidden">
              <div
                className="h-full bg-sage transition-all duration-300"
                style={{ width: `${(filledMonths / 12) * 100}%` }}
              />
            </div>
          </div>

          {/* Month entry grid */}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {orderedMonths.map((monthIndex, arrayIndex) => {
              const seasonInfo = getNZSeason(monthIndex);
              const isHighSeason =
                (suggestedPattern === "winter-peak" && seasonInfo.isWinterPeakSeason) ||
                (suggestedPattern === "summer-peak" && seasonInfo.isSummerPeakSeason);

              return (
                <div key={monthIndex} className="space-y-1">
                  <Label
                    htmlFor={`month-${monthIndex}`}
                    className={cn(
                      "text-xs flex items-center gap-1",
                      isHighSeason ? "text-blue font-medium" : "text-muted-foreground"
                    )}
                  >
                    {getShortMonthName(monthIndex)}
                    {isHighSeason && (
                      <span className="text-[10px]" title="Peak season">
                        ⬆️
                      </span>
                    )}
                  </Label>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      $
                    </span>
                    <Input
                      id={`month-${monthIndex}`}
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder={arrayIndex === 0 ? "Latest" : "0"}
                      value={monthlyAmounts[monthIndex]}
                      onChange={(e) => handleMonthChange(monthIndex, e.target.value)}
                      className={cn(
                        "pl-6 h-9 text-sm",
                        monthlyAmounts[monthIndex] !== "" &&
                          monthlyAmounts[monthIndex] > 0 &&
                          "border-sage bg-sage-very-light/30"
                      )}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tip about finding bills */}
          <Card className="p-3 bg-blue-light border-blue">
            <div className="flex gap-2 text-xs text-blue-dark">
              <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <p>
                Can't find all 12 months? Check your online banking or provider account for
                past statements. Even approximate amounts help!
              </p>
            </div>
          </Card>

          {/* Buffer slider */}
          {allMonthsFilled && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4 text-sage" />
                  Safety buffer
                </Label>
                <span className="text-sm font-medium text-sage-dark">
                  {bufferPercent}%
                </span>
              </div>
              <Slider
                value={[bufferPercent]}
                onValueChange={(values) => setBufferPercent(values[0])}
                min={0}
                max={25}
                step={5}
                className="py-2"
              />
              <p className="text-xs text-muted-foreground">
                A buffer protects against unexpectedly high bills. We recommend 10%.
              </p>
            </div>
          )}

          {/* Analysis summary */}
          {analysis && (
            <Card className="p-4 bg-sage-very-light border-sage-light">
              <div className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-sage flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p className="font-medium text-text-dark">Your leveled amount</p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Monthly average</p>
                      <p className="font-semibold text-lg text-sage-dark">
                        {formatCurrency(analysis.benefit.monthlyAverage)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">With {bufferPercent}% buffer</p>
                      <p className="font-semibold text-lg text-sage-dark">
                        {formatCurrency(
                          analysis.benefit.monthlyAverage * (1 + bufferPercent / 100)
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground pt-2 border-t border-sage-light mt-2">
                    <p>
                      Peak month: {formatCurrency(analysis.benefit.peakMonthAmount)} |
                      Low month: {formatCurrency(analysis.benefit.lowMonthAmount)}
                    </p>
                    <p>
                      Variation: {analysis.benefit.variationPercent.toFixed(0)}% swing from
                      average
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <Button
            onClick={handleSave}
            disabled={!allMonthsFilled}
            className="bg-sage hover:bg-sage-dark"
          >
            <Check className="h-4 w-4 mr-1" />
            Save leveled amount
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
