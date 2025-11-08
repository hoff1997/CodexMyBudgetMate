"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SetupWizardData } from "@/lib/types/income-allocation";

interface Envelope {
  id: string;
  name: string;
  priority: "essential" | "important" | "discretionary";
  current_balance: number;
}

interface IncomeSetupWizardProps {
  onComplete: () => void;
  onCancel: () => void;
}

export function IncomeSetupWizard({ onComplete, onCancel }: IncomeSetupWizardProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [envelopes, setEnvelopes] = useState<Envelope[]>([]);

  const [wizardData, setWizardData] = useState<SetupWizardData>({
    incomeName: "",
    payCycle: "fortnightly",
    typicalAmount: 0,
    detectionPattern: "",
    allocations: [],
  });

  useEffect(() => {
    fetchEnvelopes();
  }, []);

  async function fetchEnvelopes() {
    try {
      const response = await fetch("/api/envelopes");
      if (response.ok) {
        const data = await response.json();
        setEnvelopes(data.filter((e: Envelope) => e.name !== "Surplus"));
      }
    } catch (error) {
      console.error("Failed to fetch envelopes:", error);
    }
  }

  async function handleSubmit() {
    setLoading(true);
    try {
      const response = await fetch("/api/income-sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: wizardData.incomeName,
          pay_cycle: wizardData.payCycle,
          typical_amount: wizardData.typicalAmount,
          detection_pattern: wizardData.detectionPattern,
          allocations: wizardData.allocations,
        }),
      });

      if (response.ok) {
        onComplete();
      } else {
        const error = await response.json();
        console.error("Failed to create income source:", error);
        alert("Failed to create income source. Please try again.");
      }
    } catch (error) {
      console.error("Error creating income source:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  const totalAllocated = wizardData.allocations.reduce((sum, a) => sum + a.amount, 0);
  const surplus = wizardData.typicalAmount - totalAllocated;

  const handleAllocationChange = (envelopeId: string, amount: number) => {
    const existing = wizardData.allocations.find((a) => a.envelope_id === envelopeId);
    const envelope = envelopes.find((e) => e.id === envelopeId);

    if (!envelope) return;

    if (existing) {
      setWizardData({
        ...wizardData,
        allocations: wizardData.allocations.map((a) =>
          a.envelope_id === envelopeId ? { ...a, amount } : a
        ),
      });
    } else {
      setWizardData({
        ...wizardData,
        allocations: [
          ...wizardData.allocations,
          {
            envelope_id: envelopeId,
            envelope_name: envelope.name,
            amount,
            priority: envelope.priority,
          },
        ],
      });
    }
  };

  const removeAllocation = (envelopeId: string) => {
    setWizardData({
      ...wizardData,
      allocations: wizardData.allocations.filter((a) => a.envelope_id !== envelopeId),
    });
  };

  // Step 1: Income Source Details
  if (step === 1) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Step 1 of 3: Income Source</CardTitle>
          <CardDescription>Tell us about your income</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="incomeName">Name</Label>
            <Input
              id="incomeName"
              placeholder="My Salary"
              value={wizardData.incomeName}
              onChange={(e) =>
                setWizardData({ ...wizardData, incomeName: e.target.value })
              }
            />
            <p className="text-xs text-muted-foreground">
              E.g., &quot;My Salary&quot;, &quot;Partner Salary&quot;, &quot;Freelance Income&quot;
            </p>
          </div>

          <div className="space-y-2">
            <Label>Pay Cycle</Label>
            <div className="flex gap-4">
              {["weekly", "fortnightly", "monthly"].map((cycle) => (
                <label key={cycle} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="payCycle"
                    value={cycle}
                    checked={wizardData.payCycle === cycle}
                    onChange={(e) =>
                      setWizardData({
                        ...wizardData,
                        payCycle: e.target.value as "weekly" | "fortnightly" | "monthly",
                      })
                    }
                    className="cursor-pointer"
                  />
                  <span className="capitalize">{cycle}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="typicalAmount">Typical Amount (after tax)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="typicalAmount"
                type="number"
                placeholder="2100.00"
                value={wizardData.typicalAmount || ""}
                onChange={(e) =>
                  setWizardData({
                    ...wizardData,
                    typicalAmount: parseFloat(e.target.value) || 0,
                  })
                }
                className="pl-6"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Your typical pay amount. This helps us calculate allocations.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="detectionPattern">How should we detect this income?</Label>
            <Input
              id="detectionPattern"
              placeholder="ACME CORP"
              value={wizardData.detectionPattern}
              onChange={(e) =>
                setWizardData({ ...wizardData, detectionPattern: e.target.value })
              }
            />
            <p className="text-xs text-muted-foreground">
              Enter a keyword from your bank transaction description (e.g., employer name)
            </p>
          </div>

          <div className="flex gap-4 pt-4">
            <Button variant="outline" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={() => setStep(2)}
              disabled={
                !wizardData.incomeName ||
                !wizardData.typicalAmount ||
                !wizardData.detectionPattern
              }
              className="flex-1"
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Step 2: Allocate to Envelopes
  if (step === 2) {
    const allocatedEnvelopes = wizardData.allocations.map((a) => a.envelope_id);
    const availableEnvelopes = envelopes.filter((e) => !allocatedEnvelopes.includes(e.id));

    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Step 2 of 3: Allocate {formatCurrency(wizardData.typicalAmount)} Across Envelopes</CardTitle>
          <CardDescription>Decide how much to allocate to each envelope</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Enter amounts or adjust allocations below:
          </p>

          {/* Current Allocations */}
          <div className="space-y-2">
            {wizardData.allocations
              .sort((a, b) => {
                const priorityOrder = { essential: 0, important: 1, discretionary: 2 };
                return priorityOrder[a.priority] - priorityOrder[b.priority];
              })
              .map((alloc) => (
                <div
                  key={alloc.envelope_id}
                  className="flex items-center gap-3 p-3 bg-muted rounded-lg"
                >
                  <div className="flex-1">
                    <span className="font-medium">{alloc.envelope_name}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      ({alloc.priority})
                    </span>
                  </div>
                  <div className="relative w-32">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      $
                    </span>
                    <Input
                      type="number"
                      value={alloc.amount || ""}
                      onChange={(e) =>
                        handleAllocationChange(
                          alloc.envelope_id,
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="pl-6 h-9"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAllocation(alloc.envelope_id)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
          </div>

          {/* Add More Envelopes */}
          {availableEnvelopes.length > 0 && (
            <div className="space-y-2">
              <Label>Add More Envelopes</Label>
              <div className="grid grid-cols-2 gap-2">
                {availableEnvelopes.map((envelope) => (
                  <Button
                    key={envelope.id}
                    variant="outline"
                    size="sm"
                    onClick={() => handleAllocationChange(envelope.id, 0)}
                  >
                    + {envelope.name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Total Allocated:</span>
              <span className="font-semibold">{formatCurrency(totalAllocated)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="font-medium">Surplus (to &quot;Surplus&quot;):</span>
              <span
                className={`font-semibold ${
                  surplus >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {formatCurrency(surplus)}
              </span>
            </div>
          </div>

          {surplus < 0 && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-900">
              ⚠️ You&apos;ve allocated more than your income. Please reduce some allocations.
            </div>
          )}

          {surplus > wizardData.typicalAmount * 0.5 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900">
              ⚠️ Allocating {formatCurrency(surplus)} to surplus. You can use this for one-off
              expenses or to catch up envelopes.
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
              Back
            </Button>
            <Button
              onClick={() => setStep(3)}
              disabled={surplus < 0}
              className="flex-1"
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Step 3: Review & Confirm
  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Step 3 of 3: Review Your Setup</CardTitle>
        <CardDescription>Confirm your income allocation plan</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Income Source:</span>
              <p className="font-medium">{wizardData.incomeName}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Pay Cycle:</span>
              <p className="font-medium capitalize">{wizardData.payCycle}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Expected Amount:</span>
              <p className="font-medium">{formatCurrency(wizardData.typicalAmount)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Detection Rule:</span>
              <p className="font-medium">
                <code className="bg-muted px-2 py-1 rounded text-xs">
                  &quot;{wizardData.detectionPattern}&quot;
                </code>
              </p>
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-3">Allocation Plan:</p>
            <div className="space-y-2">
              {wizardData.allocations
                .sort((a, b) => {
                  const priorityOrder = { essential: 0, important: 1, discretionary: 2 };
                  return priorityOrder[a.priority] - priorityOrder[b.priority];
                })
                .map((alloc) => (
                  <div
                    key={alloc.envelope_id}
                    className="flex justify-between text-sm p-2 bg-muted rounded"
                  >
                    <span>• {alloc.envelope_name}</span>
                    <span className="font-semibold">{formatCurrency(alloc.amount)}</span>
                  </div>
                ))}
              <div className="flex justify-between text-sm p-2 bg-green-50 rounded">
                <span>• Surplus</span>
                <span className="font-semibold text-green-600">
                  {formatCurrency(surplus)}
                </span>
              </div>
            </div>
            <div className="flex justify-between text-sm font-semibold mt-3 pt-3 border-t">
              <span>Total:</span>
              <span>{formatCurrency(wizardData.typicalAmount)}</span>
            </div>
          </div>

          <div className="space-y-2 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm">
            <p className="flex items-start gap-2">
              <span className="text-green-600 mt-0.5">✅</span>
              <span>
                We&apos;ll watch for income matching &quot;{wizardData.detectionPattern}&quot;
              </span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-green-600 mt-0.5">✅</span>
              <span>When detected, we&apos;ll auto-allocate like above</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-green-600 mt-0.5">✅</span>
              <span>You&apos;ll be able to review & approve each time</span>
            </p>
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <Button variant="outline" onClick={() => setStep(2)} disabled={loading} className="flex-1">
            Back
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="flex-1">
            {loading ? "Creating..." : "Finish Setup"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
