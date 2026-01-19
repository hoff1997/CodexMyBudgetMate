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
import { Plus, Trash2, DollarSign, Calendar, Pencil, X, Check } from "lucide-react";
import { RemyTip } from "@/components/onboarding/remy-tip";
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

  // Editing state for existing income sources
  const [editingIncomeId, setEditingIncomeId] = useState<string | null>(null);
  const [editingIncome, setEditingIncome] = useState<{
    name: string;
    amount: number;
    frequency: "weekly" | "fortnightly" | "twice_monthly" | "monthly";
    nextPayDate: string;
    irregularIncome: boolean;
  } | null>(null);

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

  const handleStartEditIncome = (income: IncomeSource) => {
    setEditingIncomeId(income.id);
    setEditingIncome({
      name: income.name,
      amount: income.amount,
      frequency: income.frequency,
      nextPayDate: income.nextPayDate
        ? (income.nextPayDate instanceof Date
            ? income.nextPayDate.toISOString().split('T')[0]
            : new Date(income.nextPayDate).toISOString().split('T')[0])
        : "",
      irregularIncome: income.irregularIncome || false,
    });
  };

  const handleCancelEditIncome = () => {
    setEditingIncomeId(null);
    setEditingIncome(null);
  };

  const handleSaveEditIncome = () => {
    if (!editingIncomeId || !editingIncome || !editingIncome.name.trim() || editingIncome.amount <= 0) {
      return;
    }

    const updatedSources = incomeSources.map((inc) => {
      if (inc.id !== editingIncomeId) return inc;
      return {
        ...inc,
        name: editingIncome.name,
        amount: editingIncome.amount,
        frequency: editingIncome.irregularIncome ? "monthly" as const : editingIncome.frequency,
        nextPayDate: editingIncome.nextPayDate ? new Date(editingIncome.nextPayDate) : new Date(),
        irregularIncome: editingIncome.irregularIncome,
      };
    });

    onIncomeSourcesChange(updatedSources);
    setEditingIncomeId(null);
    setEditingIncome(null);
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
        <h2 className="text-2xl md:text-3xl font-bold text-text-dark">Let's talk about your pay</h2>
        <p className="text-muted-foreground">
          This helps me work out how to spread your money between pay days
        </p>
      </div>

      {/* Remy's Tip */}
      <RemyTip pose="thinking">
        Let's start with what's coming in. How much money flows into your
        life each pay cycle? Be as accurate as you can - we'll build your
        budget around what you've actually got.
      </RemyTip>

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
                {editingIncomeId === income.id && editingIncome ? (
                  /* Edit Mode */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sage">Editing Income</span>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCancelEditIncome}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleSaveEditIncome}
                          disabled={!editingIncome.name.trim() || editingIncome.amount <= 0}
                          className="h-8 w-8 p-0"
                        >
                          <Check className="h-4 w-4 text-sage" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid gap-3">
                      <div className="space-y-1">
                        <Label htmlFor={`edit-name-${income.id}`} className="text-xs">Name</Label>
                        <Input
                          id={`edit-name-${income.id}`}
                          type="text"
                          value={editingIncome.name}
                          onChange={(e) => setEditingIncome({ ...editingIncome, name: e.target.value })}
                          className="h-9"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor={`edit-amount-${income.id}`} className="text-xs">Amount (after tax)</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id={`edit-amount-${income.id}`}
                            type="number"
                            step="0.01"
                            value={editingIncome.amount || ""}
                            onChange={(e) =>
                              setEditingIncome({ ...editingIncome, amount: parseFloat(e.target.value) || 0 })
                            }
                            className="h-9 pl-9"
                          />
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 p-2 bg-muted/50 rounded">
                        <Checkbox
                          id={`edit-irregular-${income.id}`}
                          checked={editingIncome.irregularIncome}
                          onCheckedChange={(checked) =>
                            setEditingIncome({ ...editingIncome, irregularIncome: checked as boolean })
                          }
                        />
                        <Label htmlFor={`edit-irregular-${income.id}`} className="text-xs cursor-pointer">
                          Irregular income
                        </Label>
                      </div>

                      {!editingIncome.irregularIncome && (
                        <div className="space-y-1">
                          <Label htmlFor={`edit-frequency-${income.id}`} className="text-xs">Pay Frequency</Label>
                          <Select
                            value={editingIncome.frequency}
                            onValueChange={(value: any) => setEditingIncome({ ...editingIncome, frequency: value })}
                          >
                            <SelectTrigger id={`edit-frequency-${income.id}`} className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="fortnightly">Fortnightly</SelectItem>
                              <SelectItem value="twice_monthly">Twice Monthly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div className="space-y-1">
                        <Label htmlFor={`edit-date-${income.id}`} className="text-xs">Next Pay Date</Label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id={`edit-date-${income.id}`}
                            type="date"
                            value={editingIncome.nextPayDate}
                            onChange={(e) => setEditingIncome({ ...editingIncome, nextPayDate: e.target.value })}
                            className="h-9 pl-9"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* View Mode */
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{income.name}</p>
                      <p className="text-sm text-muted-foreground">
                        ${income.amount.toFixed(2)} • {FREQUENCY_LABELS[income.frequency]}
                        {income.irregularIncome && " (Irregular)"}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleStartEditIncome(income)}
                        className="h-8 w-8 p-0"
                      >
                        <Pencil className="h-4 w-4 text-muted-foreground hover:text-sage" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveIncome(income.id)}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                )}
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
            <Label htmlFor="incomeName">What's this income called? *</Label>
            <Input
              id="incomeName"
              type="text"
              placeholder="e.g., My job, Freelance, Side hustle"
              value={newIncome.name}
              onChange={(e) => setNewIncome({ ...newIncome, name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="incomeAmount">How much do you get paid? (after tax) *</Label>
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
            <p className="text-xs text-muted-foreground">Enter your take-home pay</p>
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
                I don't get paid regularly
              </Label>
              <p className="text-xs text-muted-foreground">
                Check this if your income varies or is irregular (defaults to monthly budgeting)
              </p>
            </div>
          </div>

          {/* Pay Frequency (only show if NOT irregular) */}
          {!newIncome.irregularIncome && (
            <div className="space-y-2">
              <Label htmlFor="frequency">How often do you get paid? *</Label>
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
            <Label htmlFor="nextPayDate">When's your next pay day?</Label>
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
            className="w-full bg-sage hover:bg-sage-dark"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Income Source
          </Button>
        </div>
      </div>
    </div>
  );
}
