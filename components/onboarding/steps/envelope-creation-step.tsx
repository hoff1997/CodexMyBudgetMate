"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, DollarSign, Zap, ShoppingBag, PiggyBank, CheckCircle2 } from "lucide-react";
import type { EnvelopeData, IncomeSource } from "@/app/(app)/onboarding/unified-onboarding-client";
import type { PersonaType } from "@/lib/onboarding/personas";
import { getPersona } from "@/lib/onboarding/personas";
import { calculatePayCycleAmount } from "@/lib/onboarding/pay-cycle-utils";

interface EnvelopeCreationStepProps {
  envelopes: EnvelopeData[];
  onEnvelopesChange: (envelopes: EnvelopeData[]) => void;
  persona: PersonaType | undefined;
  useTemplate: boolean | undefined;
  incomeSources: IncomeSource[];
}

type EnvelopeType = "bill" | "spending" | "savings";

export function EnvelopeCreationStep({
  envelopes,
  onEnvelopesChange,
  persona,
  useTemplate,
  incomeSources,
}: EnvelopeCreationStepProps) {
  const [selectedEnvelopeType, setSelectedEnvelopeType] = useState<EnvelopeType>("bill");
  const [newEnvelope, setNewEnvelope] = useState<Partial<EnvelopeData>>({
    name: "",
    icon: "📊",
    type: "bill",
  });

  // Get template envelopes if using template
  const personaData = persona ? getPersona(persona) : null;
  const templateEnvelopes = personaData?.envelopeTemplates || [];
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);

  // Get primary income source for calculations
  const primaryIncome = incomeSources[0];

  const handleSelectAllTemplates = () => {
    setSelectedTemplateIds(templateEnvelopes.map((_, idx) => `template-${idx}`));
  };

  const handleToggleTemplate = (id: string) => {
    setSelectedTemplateIds((prev) =>
      prev.includes(id) ? prev.filter((tid) => tid !== id) : [...prev, id]
    );
  };

  const handleApplyTemplates = () => {
    const envelopesToAdd: EnvelopeData[] = templateEnvelopes
      .map((template, idx) => {
        if (!selectedTemplateIds.includes(`template-${idx}`)) return null;

        // Determine type based on template name keywords
        let type: EnvelopeType = "bill";
        const nameLower = template.name.toLowerCase();

        if (nameLower.includes("groceries") || nameLower.includes("takeaway") ||
            nameLower.includes("entertainment") || nameLower.includes("fun")) {
          type = "spending";
        } else if (nameLower.includes("savings") || nameLower.includes("surplus") ||
                   nameLower.includes("emergency")) {
          type = "savings";
        }

        // Calculate default amount from percentage if available and we have income
        let defaultAmount = 0;
        if (template.suggestedPercentage && primaryIncome) {
          // Convert pay cycle to monthly estimate
          const payCyclesPerYear = { weekly: 52, fortnightly: 26, twice_monthly: 24, monthly: 12 };
          const cyclesPerYear = payCyclesPerYear[primaryIncome.frequency];
          const monthlyIncome = (primaryIncome.amount * cyclesPerYear) / 12;
          defaultAmount = Math.round((monthlyIncome * template.suggestedPercentage / 100) * 100) / 100;
        }

        const envelope: EnvelopeData = {
          id: `envelope-${Date.now()}-${idx}`,
          name: template.name,
          icon: template.icon || "📊",
          type,
          // Set default monthly amount based on type
          ...(type === "bill" && {
            billAmount: defaultAmount,
            frequency: "monthly" as const,
            priority: template.priority,
          }),
          ...(type === "spending" && {
            monthlyBudget: defaultAmount,
            priority: template.priority,
          }),
          ...(type === "savings" && {
            savingsAmount: defaultAmount,
            goalType: "savings" as const,
          }),
        };

        // Calculate pay cycle amount
        if (primaryIncome) {
          envelope.payCycleAmount = calculatePayCycleAmount(
            defaultAmount,
            "monthly",
            primaryIncome.frequency
          );
        }

        return envelope;
      })
      .filter((env): env is EnvelopeData => env !== null);

    onEnvelopesChange([...envelopes, ...envelopesToAdd]);
    setSelectedTemplateIds([]);
  };

  const handleAddEnvelope = () => {
    if (!newEnvelope.name?.trim()) return;

    const envelope: EnvelopeData = {
      id: `envelope-${Date.now()}`,
      name: newEnvelope.name,
      icon: newEnvelope.icon || "📊",
      type: selectedEnvelopeType,
      ...(selectedEnvelopeType === "bill" && {
        billAmount: newEnvelope.billAmount || 0,
        frequency: (newEnvelope.frequency as any) || "monthly",
        dueDate: newEnvelope.dueDate || 1,
        priority: (newEnvelope.priority as any) || "important",
      }),
      ...(selectedEnvelopeType === "spending" && {
        monthlyBudget: newEnvelope.monthlyBudget || 0,
        priority: (newEnvelope.priority as any) || "discretionary",
      }),
      ...(selectedEnvelopeType === "savings" && {
        savingsAmount: newEnvelope.savingsAmount || 0,
        goalType: (newEnvelope.goalType as any) || "savings",
        targetDate: newEnvelope.targetDate,
      }),
    };

    // Calculate pay cycle amount
    if (primaryIncome) {
      const amount =
        selectedEnvelopeType === "bill" ? newEnvelope.billAmount :
        selectedEnvelopeType === "spending" ? newEnvelope.monthlyBudget :
        newEnvelope.savingsAmount;

      envelope.payCycleAmount = calculatePayCycleAmount(
        amount || 0,
        newEnvelope.frequency || "monthly",
        primaryIncome.frequency
      );
    }

    onEnvelopesChange([...envelopes, envelope]);

    // Reset form
    setNewEnvelope({
      name: "",
      icon: "📊",
      type: selectedEnvelopeType,
    });
  };

  const handleRemoveEnvelope = (id: string) => {
    onEnvelopesChange(envelopes.filter((env) => env.id !== id));
  };

  const typeIcons = {
    bill: <Zap className="h-5 w-5" />,
    spending: <ShoppingBag className="h-5 w-5" />,
    savings: <PiggyBank className="h-5 w-5" />,
  };

  const typeColors = {
    bill: "text-amber-600 bg-amber-100 border-amber-200",
    spending: "text-blue-600 bg-blue-100 border-blue-200",
    savings: "text-emerald-600 bg-emerald-100 border-emerald-200",
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">Create Your Envelopes</h2>
        <p className="text-muted-foreground">
          Set up your complete budget structure
        </p>
      </div>

      {/* Template Selection (if using template) */}
      {useTemplate && templateEnvelopes.length > 0 && envelopes.length === 0 && (
        <Card className="p-6 bg-emerald-50/50 border-emerald-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-lg">Select from Template</h3>
              <p className="text-sm text-muted-foreground">
                Choose which envelopes you want to include
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAllTemplates}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Select All
            </Button>
          </div>

          <div className="grid md:grid-cols-2 gap-2 mb-4">
            {templateEnvelopes.map((template, idx) => {
              const id = `template-${idx}`;
              const isSelected = selectedTemplateIds.includes(id);

              return (
                <div
                  key={id}
                  onClick={() => handleToggleTemplate(id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    isSelected ? "border-emerald-500 bg-emerald-100/50" : "border-border bg-background hover:border-emerald-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{template.icon}</span>
                      <span className="font-medium text-sm">{template.name}</span>
                    </div>
                    {isSelected && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                  </div>
                </div>
              );
            })}
          </div>

          <Button
            onClick={handleApplyTemplates}
            disabled={selectedTemplateIds.length === 0}
            className="w-full bg-emerald-500 hover:bg-emerald-600"
          >
            Add {selectedTemplateIds.length} Selected Envelope{selectedTemplateIds.length !== 1 ? "s" : ""}
          </Button>
        </Card>
      )}

      {/* Existing Envelopes List */}
      {envelopes.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base">Your Envelopes ({envelopes.length})</Label>
            <div className="text-sm text-muted-foreground">
              {primaryIncome && `Per paycheck: $${envelopes.reduce((sum, env) => sum + (env.payCycleAmount || 0), 0).toFixed(2)}`}
            </div>
          </div>
          <div className="space-y-2">
            {envelopes.map((envelope) => (
              <Card key={envelope.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{envelope.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{envelope.name}</p>
                        <Badge variant="outline" className={typeColors[envelope.type]}>
                          {envelope.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        ${envelope.payCycleAmount?.toFixed(2) || "0.00"} per paycheck
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveEnvelope(envelope.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Add Custom Envelope Form */}
      <div className="space-y-4 bg-muted/50 rounded-lg p-6">
        <h3 className="font-semibold flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Add {envelopes.length === 0 ? "Your First" : "Another"} Envelope
        </h3>

        {/* Envelope Type Selector */}
        <div className="space-y-3">
          <Label>Envelope Type</Label>
          <div className="grid grid-cols-3 gap-3">
            {(["bill", "spending", "savings"] as const).map((type) => (
              <Card
                key={type}
                className={`p-4 cursor-pointer transition-all ${
                  selectedEnvelopeType === type
                    ? `border-2 ${type === "bill" ? "border-amber-500 bg-amber-50" : type === "spending" ? "border-blue-500 bg-blue-50" : "border-emerald-500 bg-emerald-50"}`
                    : "border-border hover:border-gray-400"
                }`}
                onClick={() => {
                  setSelectedEnvelopeType(type);
                  setNewEnvelope({ ...newEnvelope, type });
                }}
              >
                <div className="text-center space-y-2">
                  <div className={`w-10 h-10 mx-auto rounded-lg flex items-center justify-center ${
                    type === "bill" ? "bg-amber-500" : type === "spending" ? "bg-blue-500" : "bg-emerald-500"
                  }`}>
                    <div className="text-white">{typeIcons[type]}</div>
                  </div>
                  <p className="font-medium capitalize">{type}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Common Fields */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="envName">Envelope Name *</Label>
            <Input
              id="envName"
              value={newEnvelope.name || ""}
              onChange={(e) => setNewEnvelope({ ...newEnvelope, name: e.target.value })}
              placeholder="e.g., Electricity"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="envIcon">Icon</Label>
            <Input
              id="envIcon"
              value={newEnvelope.icon || ""}
              onChange={(e) => setNewEnvelope({ ...newEnvelope, icon: e.target.value })}
              placeholder="📊"
              maxLength={2}
            />
          </div>
        </div>

        {/* Type-Specific Fields: BILL */}
        {selectedEnvelopeType === "bill" && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="billAmount">Monthly Bill Amount *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="billAmount"
                    type="number"
                    step="0.01"
                    value={newEnvelope.billAmount || ""}
                    onChange={(e) => setNewEnvelope({ ...newEnvelope, billAmount: parseFloat(e.target.value) })}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="frequency">Frequency</Label>
                <Select
                  value={newEnvelope.frequency || "monthly"}
                  onValueChange={(value) => setNewEnvelope({ ...newEnvelope, frequency: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date (day of month)</Label>
                <Input
                  id="dueDate"
                  type="number"
                  min="1"
                  max="31"
                  value={newEnvelope.dueDate || ""}
                  onChange={(e) => setNewEnvelope({ ...newEnvelope, dueDate: parseInt(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={newEnvelope.priority || "important"}
                  onValueChange={(value) => setNewEnvelope({ ...newEnvelope, priority: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="essential">Essential</SelectItem>
                    <SelectItem value="important">Important</SelectItem>
                    <SelectItem value="discretionary">Discretionary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </>
        )}

        {/* Type-Specific Fields: SPENDING */}
        {selectedEnvelopeType === "spending" && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="monthlyBudget">Monthly Budget *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="monthlyBudget"
                  type="number"
                  step="0.01"
                  value={newEnvelope.monthlyBudget || ""}
                  onChange={(e) => setNewEnvelope({ ...newEnvelope, monthlyBudget: parseFloat(e.target.value) })}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="spendingPriority">Priority</Label>
              <Select
                value={newEnvelope.priority || "discretionary"}
                onValueChange={(value) => setNewEnvelope({ ...newEnvelope, priority: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="essential">Essential</SelectItem>
                  <SelectItem value="important">Important</SelectItem>
                  <SelectItem value="discretionary">Discretionary</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Type-Specific Fields: SAVINGS */}
        {selectedEnvelopeType === "savings" && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="savingsAmount">Monthly Savings Amount *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="savingsAmount"
                    type="number"
                    step="0.01"
                    value={newEnvelope.savingsAmount || ""}
                    onChange={(e) => setNewEnvelope({ ...newEnvelope, savingsAmount: parseFloat(e.target.value) })}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="goalType">Goal Type</Label>
                <Select
                  value={newEnvelope.goalType || "savings"}
                  onValueChange={(value) => setNewEnvelope({ ...newEnvelope, goalType: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="savings">General Savings</SelectItem>
                    <SelectItem value="emergency_fund">Emergency Fund</SelectItem>
                    <SelectItem value="purchase">Purchase Goal</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetDate">Target Date (Optional)</Label>
              <Input
                id="targetDate"
                type="date"
                value={newEnvelope.targetDate ? new Date(newEnvelope.targetDate).toISOString().split("T")[0] : ""}
                onChange={(e) => setNewEnvelope({ ...newEnvelope, targetDate: e.target.value ? new Date(e.target.value) : undefined })}
              />
            </div>
          </>
        )}

        {/* Pay Cycle Preview */}
        {primaryIncome && newEnvelope.name && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-900">
              💡 Based on your <strong>{primaryIncome.frequency}</strong> pay cycle, you&apos;ll allocate{" "}
              <strong>
                $
                {calculatePayCycleAmount(
                  selectedEnvelopeType === "bill" ? newEnvelope.billAmount || 0 :
                  selectedEnvelopeType === "spending" ? newEnvelope.monthlyBudget || 0 :
                  newEnvelope.savingsAmount || 0,
                  newEnvelope.frequency || "monthly",
                  primaryIncome.frequency
                ).toFixed(2)}
              </strong>{" "}
              per paycheck to this envelope
            </p>
          </div>
        )}

        <Button
          onClick={handleAddEnvelope}
          disabled={!newEnvelope.name?.trim()}
          className="w-full"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Envelope
        </Button>
      </div>
    </div>
  );
}
