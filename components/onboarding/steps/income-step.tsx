"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, DollarSign, Calendar, Info } from "lucide-react";
import type { IncomeSource } from "@/app/(app)/onboarding/unified-onboarding-client";

interface IncomeStepProps {
  incomeSources: IncomeSource[];
  onIncomeSourcesChange: (sources: IncomeSource[]) => void;
}

const FREQUENCY_LABELS = {
  weekly: "Weekly (52 pay cycles/year)",
  fortnightly: "Fortnightly (26 pay cycles/year)",
  twice_monthly: "Twice Monthly (24 pay cycles/year)",
  monthly: "Monthly (12 pay cycles/year)",
};

const FREQUENCY_CYCLES = {
  weekly: 52,
  fortnightly: 26,
  twice_monthly: 24,
  monthly: 12,
};

export function IncomeStep({ incomeSources, onIncomeSourcesChange }: IncomeStepProps) {
  const [newIncome, setNewIncome] = useState({
    name: "",
    amount: 0,
    frequency: "fortnightly" as "weekly" | "fortnightly" | "twice_monthly" | "monthly",
    nextPayDate: "",
    irregularIncome: false,
  });

  const handleAddIncome = () => {
    if (!newIncome.name.trim() || newIncome.amount <= 0) {
      return;
    }

    const income: IncomeSource = {
      id: Math.random().toString(36).substring(7),
      name: newIncome.name,
      amount: newIncome.amount,
      frequency: newIncome.irregularIncome ? "monthly" : newIncome.frequency,
      nextPayDate: newIncome.nextPayDate ? new Date(newIncome.nextPayDate) : new Date(),
      irregularIncome: newIncome.irregularIncome,
    };

    onIncomeSourcesChange([...incomeSources, income]);

    // Reset form
    setNewIncome({
      name: "",
      amount: 0,
      frequency: "fortnightly",
      nextPayDate: "",
      irregularIncome: false,
    });
  };

  const handleRemoveIncome = (id: string) => {
    onIncomeSourcesChange(incomeSources.filter((inc) => inc.id !== id));
  };

  // Calculate total annual income
  const totalAnnualIncome = incomeSources.reduce((total, source) => {
    const cycles = FREQUENCY_CYCLES[source.frequency];
    return total + source.amount * cycles;
  }, 0);

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="text-5xl mb-2">💵</div>
        <h2 className="text-3xl font-bold">Set Up Your Income</h2>
        <p className="text-muted-foreground">
          Tell us about your pay cycle so we can calculate your budget
        </p>
      </div>

      {/* Info Box */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-emerald-900">
          <p className="font-medium mb-1">Why this matters</p>
          <p>
            We&apos;ll use your pay frequency to calculate how much to allocate to each envelope per paycheck.
            This ensures your budget aligns with your actual pay cycle.
          </p>
        </div>
      </div>

      {/* Existing Income Sources */}
      {incomeSources.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base">Your Income Sources ({incomeSources.length})</Label>
            <div className="text-sm text-muted-foreground">
              Annual: ${totalAnnualIncome.toFixed(2)}
            </div>
          </div>
          <div className="space-y-2">
            {incomeSources.map((income) => (
              <Card key={income.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{income.name}</p>
                    <p className="text-sm text-muted-foreground">
                      ${income.amount.toFixed(2)} • {FREQUENCY_LABELS[income.frequency]}
                      {income.irregularIncome && " (Irregular)"}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveIncome(income.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Add New Income Form */}
      <div className="space-y-4 bg-muted/50 rounded-lg p-6">
        <h3 className="font-semibold flex items-center gap-2">
          <Plus className="h-5 w-5" />
          {incomeSources.length === 0 ? "Add Your First Income Source" : "Add Another Income Source"}
        </h3>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="incomeName">Income Source Name *</Label>
            <Input
              id="incomeName"
              type="text"
              placeholder="e.g., Salary - Acme Corp, Freelance Work"
              value={newIncome.name}
              onChange={(e) => setNewIncome({ ...newIncome, name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="incomeAmount">Amount Per Pay (After Tax) *</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="incomeAmount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={newIncome.amount || ""}
                onChange={(e) =>
                  setNewIncome({ ...newIncome, amount: parseFloat(e.target.value) || 0 })
                }
                className="pl-9"
              />
            </div>
            <p className="text-xs text-muted-foreground">Enter your net pay (take-home) amount</p>
          </div>

          {/* Irregular Income Checkbox */}
          <div className="flex items-center space-x-2 p-3 bg-background border rounded-lg">
            <Checkbox
              id="irregularIncome"
              checked={newIncome.irregularIncome}
              onCheckedChange={(checked) =>
                setNewIncome({ ...newIncome, irregularIncome: checked as boolean })
              }
            />
            <div className="flex-1">
              <Label htmlFor="irregularIncome" className="cursor-pointer font-medium">
                I don&apos;t get paid regularly
              </Label>
              <p className="text-xs text-muted-foreground">
                Check this if your income varies or is irregular (defaults to monthly budgeting)
              </p>
            </div>
          </div>

          {/* Pay Frequency (only show if NOT irregular) */}
          {!newIncome.irregularIncome && (
            <div className="space-y-2">
              <Label htmlFor="frequency">Pay Frequency *</Label>
              <Select
                value={newIncome.frequency}
                onValueChange={(value: any) => setNewIncome({ ...newIncome, frequency: value })}
              >
                <SelectTrigger id="frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">{FREQUENCY_LABELS.weekly}</SelectItem>
                  <SelectItem value="fortnightly">{FREQUENCY_LABELS.fortnightly}</SelectItem>
                  <SelectItem value="twice_monthly">{FREQUENCY_LABELS.twice_monthly}</SelectItem>
                  <SelectItem value="monthly">{FREQUENCY_LABELS.monthly}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="nextPayDate">Next Pay Date</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="nextPayDate"
                type="date"
                value={newIncome.nextPayDate}
                onChange={(e) => setNewIncome({ ...newIncome, nextPayDate: e.target.value })}
                className="pl-9"
              />
            </div>
          </div>

          <Button
            onClick={handleAddIncome}
            disabled={!newIncome.name.trim() || newIncome.amount <= 0}
            className="w-full"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Income Source
          </Button>
        </div>
      </div>
    </div>
  );
}
