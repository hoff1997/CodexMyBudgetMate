"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PRIORITY_DEFINITIONS } from "@/lib/planner/types";
import type { PaydayAllocation } from "@/lib/planner/payday";

export default function PaydayAllocatorPage() {
  const [payAmount, setPayAmount] = useState<string>("");
  const [allocation, setAllocation] = useState<PaydayAllocation | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<number | null>(null);

  async function handleCalculate() {
    if (!payAmount || parseFloat(payAmount) <= 0) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/planner/payday?amount=${payAmount}`);
      if (response.ok) {
        const data = await response.json();
        setAllocation(data);
        setSelectedSuggestion(null);
      }
    } catch (error) {
      console.error("Failed to calculate payday allocation:", error);
    } finally {
      setLoading(false);
    }
  }

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payday Allocator</h1>
        <p className="text-muted-foreground mt-2">
          See how your paycheck gets distributed across all envelopes
        </p>
      </div>

      {/* Pay Amount Input */}
      <Card>
        <CardHeader>
          <CardTitle>Enter Your Pay Amount</CardTitle>
          <CardDescription>How much are you receiving this pay cycle?</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1 max-w-xs">
              <Label htmlFor="payAmount">Pay Amount</Label>
              <Input
                id="payAmount"
                type="number"
                placeholder="4200.00"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCalculate();
                  }
                }}
                className="mt-2"
              />
            </div>
            <Button onClick={handleCalculate} disabled={loading || !payAmount}>
              {loading ? "Calculating..." : "Calculate Allocation"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {allocation && (
        <>
          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle>Allocation Summary</CardTitle>
              <CardDescription>How your {formatCurrency(allocation.payAmount)} gets distributed</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Your Pay</p>
                  <p className="text-2xl font-bold">{formatCurrency(allocation.payAmount)}</p>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-700">Regular Allocations</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {formatCurrency(allocation.totalRegular)}
                  </p>
                </div>

                <div
                  className={`p-4 rounded-lg border ${
                    allocation.surplusStatus === "available"
                      ? "bg-green-50 border-green-200"
                      : allocation.surplusStatus === "shortfall"
                        ? "bg-red-50 border-red-200"
                        : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <p
                    className={`text-sm ${
                      allocation.surplusStatus === "available"
                        ? "text-green-700"
                        : allocation.surplusStatus === "shortfall"
                          ? "text-red-700"
                          : "text-gray-700"
                    }`}
                  >
                    {allocation.surplusStatus === "available"
                      ? "Surplus"
                      : allocation.surplusStatus === "shortfall"
                        ? "Shortfall"
                        : "Exact Match"}
                  </p>
                  <p
                    className={`text-2xl font-bold ${
                      allocation.surplusStatus === "available"
                        ? "text-green-900"
                        : allocation.surplusStatus === "shortfall"
                          ? "text-red-900"
                          : "text-gray-900"
                    }`}
                  >
                    {formatCurrency(Math.abs(allocation.surplus))}
                  </p>
                </div>

                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-700">Envelopes Behind</p>
                  <p className="text-2xl font-bold text-amber-900">{allocation.summary.behindCount}</p>
                  <p className="text-xs text-amber-600 mt-1">
                    {formatCurrency(allocation.summary.totalGap)} gap
                  </p>
                </div>
              </div>

              {/* Status Message */}
              {allocation.surplusStatus === "available" && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-medium text-green-900">
                    Great! You have {formatCurrency(allocation.surplus)} left after regular allocations
                  </p>
                  <p className="text-xs text-green-700 mt-1">
                    Check out the suggestions below for what to do with this surplus
                  </p>
                </div>
              )}

              {allocation.surplusStatus === "shortfall" && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm font-medium text-red-900">
                    You're {formatCurrency(Math.abs(allocation.surplus))} short this pay cycle
                  </p>
                  <p className="text-xs text-red-700 mt-1">
                    Consider pausing some discretionary spending or explore scenarios to free up funds
                  </p>
                </div>
              )}

              {allocation.surplusStatus === "exact" && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-medium text-blue-900">
                    Perfect match! Your pay exactly covers all regular allocations
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Regular Allocations Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Regular Allocations</CardTitle>
              <CardDescription>What goes to each envelope this pay cycle</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Essential */}
              {allocation.regularAllocations.filter((a) => a.priority === "essential").length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <span>{PRIORITY_DEFINITIONS.essential.icon}</span>
                      Essential
                    </h3>
                    <p className="text-sm font-medium">
                      {formatCurrency(allocation.summary.essentialTotal)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    {allocation.regularAllocations
                      .filter((a) => a.priority === "essential")
                      .map((alloc) => (
                        <div
                          key={alloc.envelopeId}
                          className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg"
                        >
                          <span className="font-medium">{alloc.name}</span>
                          <span className="font-semibold">{formatCurrency(alloc.amount)}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Important */}
              {allocation.regularAllocations.filter((a) => a.priority === "important").length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <span>{PRIORITY_DEFINITIONS.important.icon}</span>
                      Important
                    </h3>
                    <p className="text-sm font-medium">
                      {formatCurrency(allocation.summary.importantTotal)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    {allocation.regularAllocations
                      .filter((a) => a.priority === "important")
                      .map((alloc) => (
                        <div
                          key={alloc.envelopeId}
                          className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg"
                        >
                          <span className="font-medium">{alloc.name}</span>
                          <span className="font-semibold">{formatCurrency(alloc.amount)}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Discretionary */}
              {allocation.regularAllocations.filter((a) => a.priority === "discretionary").length >
                0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <span>{PRIORITY_DEFINITIONS.discretionary.icon}</span>
                      Discretionary
                    </h3>
                    <p className="text-sm font-medium">
                      {formatCurrency(allocation.summary.discretionaryTotal)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    {allocation.regularAllocations
                      .filter((a) => a.priority === "discretionary")
                      .map((alloc) => (
                        <div
                          key={alloc.envelopeId}
                          className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg"
                        >
                          <span className="font-medium">{alloc.name}</span>
                          <span className="font-semibold">{formatCurrency(alloc.amount)}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Surplus Suggestions */}
          {allocation.suggestions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Smart Suggestions for Your Surplus</CardTitle>
                <CardDescription>
                  What to do with your {formatCurrency(allocation.surplus)} surplus
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {allocation.suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      selectedSuggestion === index
                        ? "border-primary ring-2 ring-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => setSelectedSuggestion(index)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold">
                          {suggestion.type === "top-up"
                            ? `Top Up ${suggestion.envelopeName || "Multiple Envelopes"}`
                            : suggestion.type === "new-goal"
                              ? "Start a Savings Goal"
                              : "Keep as Buffer"}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">{suggestion.reason}</p>
                      </div>
                      <p className="text-lg font-bold text-green-600">
                        {formatCurrency(suggestion.suggestedAmount)}
                      </p>
                    </div>

                    <p className="text-sm text-muted-foreground">{suggestion.impact}</p>

                    {selectedSuggestion === index && (
                      <Button className="w-full mt-3" size="sm">
                        Apply This Suggestion
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Envelope Health Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Envelope Health Check</CardTitle>
              <CardDescription>See which envelopes are on track or behind</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {allocation.envelopeHealth.map((health) => {
                  const statusColor =
                    health.gapStatus === "ahead"
                      ? "bg-green-50 border-green-200 text-green-900"
                      : health.gapStatus === "behind"
                        ? "bg-red-50 border-red-200 text-red-900"
                        : "bg-blue-50 border-blue-200 text-blue-900";

                  return (
                    <div key={health.envelopeId} className={`p-3 rounded-lg border ${statusColor}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{health.name}</p>
                          <p className="text-xs opacity-75 mt-1">
                            {health.gapStatus === "ahead" && `$${Math.abs(health.gap).toFixed(2)} ahead`}
                            {health.gapStatus === "on-track" && "On track"}
                            {health.gapStatus === "behind" && `$${health.gap.toFixed(2)} behind`}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">
                            {formatCurrency(health.currentBalance)}
                          </p>
                          <p className="text-xs opacity-75">
                            of {formatCurrency(health.shouldHaveSaved)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
