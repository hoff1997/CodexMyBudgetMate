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
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, AlertTriangle, Trash2, Plus } from "lucide-react";
import type { EnvelopeData, IncomeSource } from "@/app/(app)/onboarding/unified-onboarding-client";
import type { PersonaType } from "@/lib/onboarding/personas";
import { PERSONAS } from "@/lib/onboarding/personas";
import { EmojiPicker } from "@/components/ui/emoji-picker";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { CalendarIcon } from "lucide-react";

interface EnvelopeCreationStepProps {
  envelopes: EnvelopeData[];
  onEnvelopesChange: (envelopes: EnvelopeData[]) => void;
  persona: PersonaType | undefined;
  useTemplate: boolean | undefined;
  incomeSources: IncomeSource[];
}

type EnvelopeType = "bill" | "spending" | "savings";

interface MasterEnvelope {
  name: string;
  icon: string;
  priority: 'essential' | 'important' | 'discretionary';
  category: 'beginner' | 'optimiser' | 'wealth_builder';
}

export function EnvelopeCreationStep({
  envelopes,
  onEnvelopesChange,
  persona,
  useTemplate,
  incomeSources,
}: EnvelopeCreationStepProps) {
  // Two-step process: select then configure
  const [step, setStep] = useState<'select' | 'configure'>('select');
  const [selectedEnvelopes, setSelectedEnvelopes] = useState<string[]>([]);

  // Get primary income source for calculations
  const primaryIncome = incomeSources[0];

  // Create master list of ALL envelopes from all personas
  const getAllEnvelopes = (): MasterEnvelope[] => {
    const seen = new Set<string>();
    const allEnvelopes: MasterEnvelope[] = [];

    Object.values(PERSONAS).forEach(personaData => {
      personaData.envelopeTemplates.forEach(template => {
        if (!seen.has(template.name)) {
          seen.add(template.name);
          allEnvelopes.push({
            name: template.name,
            icon: template.icon,
            priority: template.priority,
            category: personaData.key,
          });
        }
      });
    });

    return allEnvelopes.sort((a, b) => a.name.localeCompare(b.name));
  };

  const masterEnvelopes = getAllEnvelopes();

  // Pre-select Surplus and Emergency Fund
  useState(() => {
    const defaultSelections = masterEnvelopes
      .filter(env =>
        env.name.toLowerCase().includes('surplus') ||
        env.name.toLowerCase().includes('emergency')
      )
      .map(env => env.name);

    setSelectedEnvelopes(defaultSelections);
  });

  const handleSelectAll = () => {
    setSelectedEnvelopes(masterEnvelopes.map(env => env.name));
  };

  const handleDeselectAll = () => {
    setSelectedEnvelopes([]);
  };

  const handleToggleEnvelope = (name: string) => {
    setSelectedEnvelopes(prev =>
      prev.includes(name)
        ? prev.filter(n => n !== name)
        : [...prev, name]
    );
  };

  const handleProceedToConfigure = () => {
    // Create envelope data objects with empty amounts
    const newEnvelopes: EnvelopeData[] = selectedEnvelopes.map(name => {
      const masterEnv = masterEnvelopes.find(e => e.name === name)!;

      // Determine type based on name keywords
      let type: EnvelopeType = "bill";
      const nameLower = name.toLowerCase();

      if (nameLower.includes("groceries") || nameLower.includes("takeaway") ||
          nameLower.includes("entertainment") || nameLower.includes("fun") ||
          nameLower.includes("dining") || nameLower.includes("miscellaneous") ||
          nameLower.includes("lifestyle")) {
        type = "spending";
      } else if (nameLower.includes("savings") || nameLower.includes("surplus") ||
                 nameLower.includes("emergency") || nameLower.includes("investment") ||
                 nameLower.includes("property") || nameLower.includes("giving")) {
        type = "savings";
      }

      return {
        id: `envelope-${Date.now()}-${Math.random()}`,
        name: masterEnv.name,
        icon: masterEnv.icon,
        type,
        payCycleAmount: 0,
        // Type-specific fields with empty values
        ...(type === "bill" && {
          billAmount: 0,
          frequency: "monthly" as const,
          priority: masterEnv.priority,
        }),
        ...(type === "spending" && {
          monthlyBudget: 0,
          priority: masterEnv.priority,
        }),
        ...(type === "savings" && {
          savingsAmount: 0,
          goalType: "savings" as const,
        }),
      };
    });

    onEnvelopesChange(newEnvelopes);
    setStep('configure');
  };

  const handleBackToSelect = () => {
    setStep('select');
  };

  const handleUpdateEnvelope = (id: string, field: string, value: any) => {
    const updatedEnvelopes = envelopes.map(env => {
      if (env.id === id) {
        return { ...env, [field]: value };
      }
      return env;
    });
    onEnvelopesChange(updatedEnvelopes);
  };

  const handleRemoveEnvelope = (id: string) => {
    onEnvelopesChange(envelopes.filter(env => env.id !== id));
  };

  const handleAddNewEnvelope = () => {
    const newEnvelope: EnvelopeData = {
      id: `envelope-${Date.now()}`,
      name: 'New Envelope',
      icon: '📊',
      type: 'bill',
      billAmount: 0,
      frequency: 'monthly',
      priority: 'important',
      payCycleAmount: 0,
    };
    onEnvelopesChange([...envelopes, newEnvelope]);
  };

  // Calculate budget totals
  const totalAllocated = envelopes.reduce((sum, env) => sum + (env.payCycleAmount || 0), 0);
  const totalIncome = primaryIncome?.amount || 0;
  const remaining = totalIncome - totalAllocated;
  const isOverspent = remaining < 0;
  const allocationPercentage = totalIncome > 0 ? Math.min((totalAllocated / totalIncome) * 100, 100) : 0;

  const handleAddSurplus = () => {
    if (remaining <= 0) return;

    const surplusEnvelope: EnvelopeData = {
      id: `envelope-surplus-${Date.now()}`,
      name: 'Surplus',
      icon: '💵',
      type: 'savings',
      savingsAmount: remaining,
      payCycleAmount: remaining,
      goalType: 'savings',
    };
    onEnvelopesChange([...envelopes, surplusEnvelope]);
  };

  // SCREEN 1: Selection
  if (step === 'select') {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold">Select Your Envelopes</h2>
          <p className="text-muted-foreground">
            Choose which envelopes you want to include in your budget
          </p>
        </div>

        {/* Selection Controls */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {selectedEnvelopes.length} of {masterEnvelopes.length} selected
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
            >
              Select All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeselectAll}
            >
              Deselect All
            </Button>
          </div>
        </div>

        {/* Envelope Selection Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {masterEnvelopes.map((envelope) => {
            const isSelected = selectedEnvelopes.includes(envelope.name);

            return (
              <div
                key={envelope.name}
                onClick={() => handleToggleEnvelope(envelope.name)}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  isSelected
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-border bg-background hover:border-emerald-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleToggleEnvelope(envelope.name)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className="text-2xl">{envelope.icon}</span>
                    <div>
                      <p className="font-medium">{envelope.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {envelope.priority}
                      </p>
                    </div>
                  </div>
                  {isSelected && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
                </div>
              </div>
            );
          })}
        </div>

        {/* Proceed Button */}
        <Button
          onClick={handleProceedToConfigure}
          disabled={selectedEnvelopes.length === 0}
          className="w-full bg-emerald-500 hover:bg-emerald-600 h-12 text-lg"
          size="lg"
        >
          Continue with {selectedEnvelopes.length} Envelope{selectedEnvelopes.length !== 1 ? 's' : ''}
        </Button>
      </div>
    );
  }

  // SCREEN 2: Configure (Spreadsheet-style table)
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Configure Your Envelopes</h2>
          <p className="text-muted-foreground">
            Enter amounts and details for each envelope
          </p>
        </div>
        <Button variant="outline" onClick={handleBackToSelect}>
          ← Back to Selection
        </Button>
      </div>

      {/* Budget Tracker */}
      {primaryIncome && envelopes.length > 0 && (
        <Card className={`p-6 ${isOverspent ? 'bg-red-50 border-red-200' : remaining > 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-blue-50 border-blue-200'}`}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">Budget Status</h3>
                <p className="text-sm text-muted-foreground">
                  Per {primaryIncome.frequency} paycheck
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">
                  {isOverspent ? '-' : '+'}${Math.abs(remaining).toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isOverspent ? 'Overspent' : remaining > 0 ? 'Remaining' : 'Fully Allocated'}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Total Income: ${totalIncome.toFixed(2)}</span>
                <span>Allocated: ${totalAllocated.toFixed(2)}</span>
              </div>
              <Progress
                value={allocationPercentage}
                className={`h-3 ${isOverspent ? '[&>div]:bg-red-500' : '[&>div]:bg-emerald-500'}`}
              />
            </div>

            {isOverspent && (
              <div className="flex items-start gap-2 p-3 bg-red-100 border border-red-300 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-900">
                  You're allocating ${Math.abs(remaining).toFixed(2)} more than you earn per paycheck. Reduce your envelope amounts.
                </p>
              </div>
            )}

            {remaining > 0 && (
              <div className="flex items-center justify-between p-3 bg-white border rounded-lg">
                <div>
                  <p className="font-medium">Unallocated Funds</p>
                  <p className="text-sm text-muted-foreground">
                    ${remaining.toFixed(2)} available per paycheck
                  </p>
                </div>
                <Button
                  onClick={handleAddSurplus}
                  variant="outline"
                  size="sm"
                  className="border-emerald-500 text-emerald-700 hover:bg-emerald-50"
                >
                  Add Surplus Envelope
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Spreadsheet-style Table */}
      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="p-3 text-left text-sm font-semibold w-8">Icon</th>
              <th className="p-3 text-left text-sm font-semibold">Name</th>
              <th className="p-3 text-left text-sm font-semibold w-24">Type</th>
              <th className="p-3 text-left text-sm font-semibold w-32">Amount</th>
              <th className="p-3 text-left text-sm font-semibold w-28">Frequency</th>
              <th className="p-3 text-left text-sm font-semibold w-32">Due Date</th>
              <th className="p-3 text-left text-sm font-semibold w-28">Priority</th>
              <th className="p-3 text-left text-sm font-semibold w-32">
                Per {primaryIncome?.frequency || 'Paycheck'}
              </th>
              <th className="p-3 text-center text-sm font-semibold w-12">Del</th>
            </tr>
          </thead>
          <tbody>
            {envelopes.map((envelope, index) => (
              <tr key={envelope.id} className={`border-t hover:bg-muted/50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                {/* Icon */}
                <td className="p-2">
                  <EmojiPicker
                    value={envelope.icon}
                    onChange={(emoji) => handleUpdateEnvelope(envelope.id, 'icon', emoji)}
                  />
                </td>

                {/* Name */}
                <td className="p-2">
                  <Input
                    value={envelope.name}
                    onChange={(e) => handleUpdateEnvelope(envelope.id, 'name', e.target.value)}
                    className="h-9 text-sm font-medium"
                  />
                </td>

                {/* Type */}
                <td className="p-2">
                  <Select
                    value={envelope.type}
                    onValueChange={(value) => handleUpdateEnvelope(envelope.id, 'type', value)}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bill">Bill</SelectItem>
                      <SelectItem value="spending">Spending</SelectItem>
                      <SelectItem value="savings">Savings</SelectItem>
                    </SelectContent>
                  </Select>
                </td>

                {/* Amount */}
                <td className="p-2">
                  <Input
                    type="number"
                    step="0.01"
                    value={
                      envelope.type === 'bill' ? envelope.billAmount || 0 :
                      envelope.type === 'spending' ? envelope.monthlyBudget || 0 :
                      envelope.savingsAmount || 0
                    }
                    onChange={(e) => {
                      const amount = parseFloat(e.target.value) || 0;
                      if (envelope.type === 'bill') {
                        handleUpdateEnvelope(envelope.id, 'billAmount', amount);
                        handleUpdateEnvelope(envelope.id, 'payCycleAmount', amount);
                      } else if (envelope.type === 'spending') {
                        handleUpdateEnvelope(envelope.id, 'monthlyBudget', amount);
                        handleUpdateEnvelope(envelope.id, 'payCycleAmount', amount);
                      } else {
                        handleUpdateEnvelope(envelope.id, 'savingsAmount', amount);
                        handleUpdateEnvelope(envelope.id, 'payCycleAmount', amount);
                      }
                    }}
                    className="h-9 text-sm text-right"
                    placeholder="0.00"
                  />
                </td>

                {/* Frequency */}
                <td className="p-2">
                  {envelope.type === 'bill' ? (
                    <Select
                      value={envelope.frequency || 'monthly'}
                      onValueChange={(value) => handleUpdateEnvelope(envelope.id, 'frequency', value)}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="annual">Annual</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="h-9 flex items-center text-sm text-muted-foreground px-3">
                      N/A
                    </div>
                  )}
                </td>

                {/* Due Date */}
                <td className="p-2">
                  {envelope.type === 'bill' ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="h-9 w-full justify-start text-sm" type="button">
                          <CalendarIcon className="h-3 w-3 mr-2" />
                          {envelope.dueDate
                            ? `${envelope.dueDate}${envelope.dueDate === 1 ? 'st' : envelope.dueDate === 2 ? 'nd' : envelope.dueDate === 3 ? 'rd' : 'th'}`
                            : "Select"
                          }
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={envelope.dueDate ? new Date(2024, 0, envelope.dueDate) : undefined}
                          onSelect={(date) => handleUpdateEnvelope(envelope.id, 'dueDate', date ? date.getDate() : undefined)}
                        />
                      </PopoverContent>
                    </Popover>
                  ) : envelope.type === 'savings' ? (
                    <Input
                      type="date"
                      value={envelope.targetDate ? new Date(envelope.targetDate).toISOString().split('T')[0] : ''}
                      onChange={(e) => handleUpdateEnvelope(envelope.id, 'targetDate', e.target.value ? new Date(e.target.value) : undefined)}
                      className="h-9 text-sm"
                    />
                  ) : (
                    <div className="h-9 flex items-center text-sm text-muted-foreground px-3">
                      N/A
                    </div>
                  )}
                </td>

                {/* Priority */}
                <td className="p-2">
                  {envelope.type !== 'savings' ? (
                    <Select
                      value={envelope.priority || 'important'}
                      onValueChange={(value) => handleUpdateEnvelope(envelope.id, 'priority', value)}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="essential">Essential</SelectItem>
                        <SelectItem value="important">Important</SelectItem>
                        <SelectItem value="discretionary">Discretionary</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="h-9 flex items-center text-sm text-muted-foreground px-3">
                      N/A
                    </div>
                  )}
                </td>

                {/* Per Paycheck */}
                <td className="p-2">
                  <div className="h-9 flex items-center text-sm font-semibold text-blue-600 px-3">
                    ${(envelope.payCycleAmount || 0).toFixed(2)}
                  </div>
                </td>

                {/* Delete */}
                <td className="p-2 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                    onClick={() => handleRemoveEnvelope(envelope.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add New Envelope Button */}
      <Button onClick={handleAddNewEnvelope} variant="outline" className="w-full">
        <Plus className="mr-2 h-4 w-4" />
        Add Another Envelope
      </Button>
    </div>
  );
}
