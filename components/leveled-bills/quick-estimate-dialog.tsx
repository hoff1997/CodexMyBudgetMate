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
import {
  ArrowLeft,
  Check,
  TrendingUp,
  Shield,
  Thermometer,
  Sun,
} from "lucide-react";
import { RemyAvatar } from "@/components/onboarding/remy-tip";
import { cn } from "@/lib/cn";
import { SeasonalPattern } from "@/lib/utils/seasonal-bills";
import {
  createLevelingDataFromQuickEstimate,
  analyzeLevelingBenefit,
  DEFAULT_BUFFER_PERCENT,
  type LevelingData,
} from "@/lib/utils/leveled-bills";

interface QuickEstimateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  envelopeName: string;
  suggestedPattern: "winter-peak" | "summer-peak";
  onBack: () => void;
  onSave: (levelingData: LevelingData) => void;
}

/**
 * Dialog for quick estimation of seasonal bills using high/low season amounts.
 */
export function QuickEstimateDialog({
  open,
  onOpenChange,
  envelopeName,
  suggestedPattern,
  onBack,
  onSave,
}: QuickEstimateDialogProps) {
  const [highSeasonAmount, setHighSeasonAmount] = useState<number | "">("");
  const [lowSeasonAmount, setLowSeasonAmount] = useState<number | "">("");
  const [bufferPercent, setBufferPercent] = useState(DEFAULT_BUFFER_PERCENT);

  const isWinterPeak = suggestedPattern === "winter-peak";

  // Check if we have valid inputs
  const hasValidInputs =
    highSeasonAmount !== "" &&
    lowSeasonAmount !== "" &&
    highSeasonAmount > 0 &&
    lowSeasonAmount > 0;

  // Calculate analysis when we have valid inputs
  const analysis = useMemo(() => {
    if (!hasValidInputs) return null;

    const levelingData = createLevelingDataFromQuickEstimate(
      highSeasonAmount as number,
      lowSeasonAmount as number,
      suggestedPattern,
      bufferPercent
    );

    return {
      levelingData,
      benefit: analyzeLevelingBenefit(levelingData),
    };
  }, [highSeasonAmount, lowSeasonAmount, suggestedPattern, bufferPercent, hasValidInputs]);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <RemyAvatar pose="encouraging" size="sm" />
            <div>
              <DialogTitle className="text-lg">Quick estimate</DialogTitle>
              <DialogDescription className="text-sm mt-1">
                Enter your typical high and low season {envelopeName} bills
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Season inputs */}
          <div className="grid grid-cols-2 gap-4">
            {/* High season */}
            <div className="space-y-2">
              <Label
                htmlFor="high-season"
                className="text-sm font-medium flex items-center gap-2"
              >
                {isWinterPeak ? (
                  <>
                    <Thermometer className="h-4 w-4 text-blue" />
                    Winter bill
                  </>
                ) : (
                  <>
                    <Sun className="h-4 w-4 text-gold" />
                    Summer bill
                  </>
                )}
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="high-season"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 350"
                  value={highSeasonAmount}
                  onChange={(e) =>
                    setHighSeasonAmount(e.target.value === "" ? "" : parseFloat(e.target.value) || 0)
                  }
                  className="pl-7"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {isWinterPeak
                  ? "Typical June-August bill"
                  : "Typical December-February bill"}
              </p>
            </div>

            {/* Low season */}
            <div className="space-y-2">
              <Label
                htmlFor="low-season"
                className="text-sm font-medium flex items-center gap-2"
              >
                {isWinterPeak ? (
                  <>
                    <Sun className="h-4 w-4 text-gold" />
                    Summer bill
                  </>
                ) : (
                  <>
                    <Thermometer className="h-4 w-4 text-blue" />
                    Winter bill
                  </>
                )}
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="low-season"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 150"
                  value={lowSeasonAmount}
                  onChange={(e) =>
                    setLowSeasonAmount(e.target.value === "" ? "" : parseFloat(e.target.value) || 0)
                  }
                  className="pl-7"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {isWinterPeak
                  ? "Typical December-February bill"
                  : "Typical June-August bill"}
              </p>
            </div>
          </div>

          {/* Buffer slider */}
          {hasValidInputs && (
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
                  <p className="text-xs text-muted-foreground pt-2 border-t border-sage-light mt-2">
                    Yearly total: {formatCurrency(analysis.benefit.yearlyTotal)}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Note about accuracy */}
          <p className="text-xs text-muted-foreground text-center">
            For more accurate leveling, you can enter 12 months of bills later from
            envelope settings.
          </p>
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasValidInputs}
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
