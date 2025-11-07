"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PRIORITY_DEFINITIONS } from "@/lib/planner/types";
import type { EnvelopeHealth, ScenarioResult } from "@/lib/planner/types";

type ScenarioData = {
  payCycle: string;
  envelopeHealth: EnvelopeHealth[];
  scenarios: ScenarioResult[];
};

export default function ScenarioPlannerPage() {
  const [data, setData] = useState<ScenarioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedScenario, setSelectedScenario] = useState<number | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("/api/planner/scenarios");
        if (response.ok) {
          const json = await response.json();
          setData(json);
        }
      } catch (error) {
        console.error("Failed to fetch scenario data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-muted-foreground">Loading scenario planner...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-destructive">Failed to load scenario data</p>
      </div>
    );
  }

  const { envelopeHealth, scenarios, payCycle } = data;

  // Group envelopes by priority
  const essential = envelopeHealth.filter((e) => e.priority === "essential");
  const important = envelopeHealth.filter((e) => e.priority === "important");
  const discretionary = envelopeHealth.filter((e) => e.priority === "discretionary");

  // Calculate overall stats
  const totalGap = envelopeHealth.reduce((sum, e) => sum + Math.max(0, e.gap), 0);
  const behindCount = envelopeHealth.filter((e) => e.gapStatus === "behind").length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">What-If Scenario Planner</h1>
        <p className="text-muted-foreground mt-2">
          See how small changes can transform your budget and help you get ahead
        </p>
      </div>

      {/* Current Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Current Budget Health</CardTitle>
          <CardDescription>Where you stand across all your envelopes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{PRIORITY_DEFINITIONS.essential.icon}</span>
                <div>
                  <p className="text-sm font-medium">Essential</p>
                  <p className="text-xs text-muted-foreground">{essential.length} envelopes</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{PRIORITY_DEFINITIONS.important.icon}</span>
                <div>
                  <p className="text-sm font-medium">Important</p>
                  <p className="text-xs text-muted-foreground">{important.length} envelopes</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{PRIORITY_DEFINITIONS.discretionary.icon}</span>
                <div>
                  <p className="text-sm font-medium">Discretionary</p>
                  <p className="text-xs text-muted-foreground">{discretionary.length} envelopes</p>
                </div>
              </div>
            </div>
          </div>

          {totalGap > 0 && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm font-medium text-amber-900">
                You&apos;re ${totalGap.toFixed(2)} behind schedule across {behindCount} envelope
                {behindCount !== 1 ? "s" : ""}
              </p>
              <p className="text-xs text-amber-700 mt-1">
                The scenarios below show how adjusting your spending can help close this gap
              </p>
            </div>
          )}

          {totalGap <= 0 && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-medium text-green-900">
                Great job! All your envelopes are on track or ahead of schedule
              </p>
              <p className="text-xs text-green-700 mt-1">
                Use these scenarios to build extra buffer or accelerate your savings goals
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scenarios Grid */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Explore Scenarios</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {scenarios.map((result, index) => (
            <Card
              key={result.scenario.id}
              className={`cursor-pointer transition-all hover:shadow-lg ${
                selectedScenario === index ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => setSelectedScenario(index)}
            >
              <CardHeader>
                <CardTitle className="text-lg">{result.scenario.name}</CardTitle>
                <CardDescription>{result.scenario.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Savings per pay</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${result.savingsPerPay.toFixed(2)}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total over period</p>
                  <p className="text-xl font-semibold">
                    ${result.totalSavingsOverPeriod.toFixed(2)}
                  </p>
                </div>

                {result.projection.timeToCloseGap > 0 ? (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground">Time to close gap</p>
                    <p className="text-sm font-medium">
                      {result.projection.timeToCloseGap} pay cycles
                    </p>
                  </div>
                ) : (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-green-600 font-medium">
                      ✓ All gaps closed immediately
                    </p>
                  </div>
                )}

                <Button
                  className="w-full mt-2"
                  variant={selectedScenario === index ? "default" : "outline"}
                >
                  {selectedScenario === index ? "Selected" : "View Details"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Selected Scenario Details */}
      {selectedScenario !== null && (
        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle>{scenarios[selectedScenario].scenario.name} - Full Breakdown</CardTitle>
            <CardDescription>
              See exactly what gets paused and where your money goes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Impacted Envelopes */}
            <div>
              <h3 className="font-semibold mb-3">What Gets Reduced</h3>
              <div className="space-y-2">
                {scenarios[selectedScenario].impactedEnvelopes.map((env) => (
                  <div
                    key={env.envelopeId}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <span>{PRIORITY_DEFINITIONS[env.priority].icon}</span>
                      <span className="font-medium">{env.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm line-through text-muted-foreground">
                        ${env.currentPerPay.toFixed(2)}/pay
                      </p>
                      <p className="text-sm font-semibold">
                        ${env.newPerPay.toFixed(2)}/pay
                      </p>
                      <p className="text-xs text-green-600">
                        Save ${env.savedPerPay.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Results */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-700">Savings per {payCycle} pay</p>
                <p className="text-3xl font-bold text-green-900">
                  ${scenarios[selectedScenario].savingsPerPay.toFixed(2)}
                </p>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">Total saved over period</p>
                <p className="text-3xl font-bold text-blue-900">
                  ${scenarios[selectedScenario].totalSavingsOverPeriod.toFixed(2)}
                </p>
              </div>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-700">Current gap</p>
                <p className="text-3xl font-bold text-amber-900">
                  ${scenarios[selectedScenario].projection.currentGap.toFixed(2)}
                </p>
              </div>

              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-sm text-purple-700">Buffer after closing gaps</p>
                <p className="text-3xl font-bold text-purple-900">
                  ${scenarios[selectedScenario].projection.bufferAfterGap.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Impact Statement */}
            <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-lg mb-2">What This Means</h3>
              <ul className="space-y-2 text-sm">
                {scenarios[selectedScenario].projection.currentGap > 0 && (
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span>
                      Close your ${scenarios[selectedScenario].projection.currentGap.toFixed(2)} gap
                      in{" "}
                      <strong>
                        {scenarios[selectedScenario].projection.timeToCloseGap} pay cycles
                      </strong>
                    </span>
                  </li>
                )}
                {scenarios[selectedScenario].projection.bufferAfterGap > 0 && (
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span>
                      Build a <strong>${scenarios[selectedScenario].projection.bufferAfterGap.toFixed(2)} buffer</strong> for emergencies
                    </span>
                  </li>
                )}
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>
                    <strong>Stop living paycheck-to-paycheck</strong> and gain financial breathing
                    room
                  </span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Envelope Health Details */}
      <Card>
        <CardHeader>
          <CardTitle>Envelope Details by Priority</CardTitle>
          <CardDescription>See where each envelope stands</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Essential */}
          {essential.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <span>{PRIORITY_DEFINITIONS.essential.icon}</span>
                Essential Envelopes
              </h3>
              <div className="space-y-3">
                {essential.map((env) => (
                  <EnvelopeHealthCard key={env.envelopeId} health={env} />
                ))}
              </div>
            </div>
          )}

          {/* Important */}
          {important.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <span>{PRIORITY_DEFINITIONS.important.icon}</span>
                Important Envelopes
              </h3>
              <div className="space-y-3">
                {important.map((env) => (
                  <EnvelopeHealthCard key={env.envelopeId} health={env} />
                ))}
              </div>
            </div>
          )}

          {/* Discretionary */}
          {discretionary.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <span>{PRIORITY_DEFINITIONS.discretionary.icon}</span>
                Discretionary Envelopes
              </h3>
              <div className="space-y-3">
                {discretionary.map((env) => (
                  <EnvelopeHealthCard key={env.envelopeId} health={env} />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EnvelopeHealthCard({ health }: { health: EnvelopeHealth }) {
  const statusColor =
    health.gapStatus === "ahead"
      ? "text-green-600"
      : health.gapStatus === "behind"
        ? "text-red-600"
        : "text-blue-600";

  const bgColor =
    health.gapStatus === "ahead"
      ? "bg-green-50 border-green-200"
      : health.gapStatus === "behind"
        ? "bg-red-50 border-red-200"
        : "bg-blue-50 border-blue-200";

  return (
    <div className={`p-4 rounded-lg border ${bgColor}`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-medium">{health.name}</p>
          {health.dueDate && (
            <p className="text-xs text-muted-foreground">
              Due: {health.dueDate} ({health.daysUntilDue} days)
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold">${health.currentBalance.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">
            of ${health.shouldHaveSaved.toFixed(2)}
          </p>
        </div>
      </div>

      <Progress value={Math.min(100, health.percentComplete)} className="h-2 mb-2" />

      <div className="flex items-center justify-between text-xs">
        <span className={statusColor}>
          {health.gapStatus === "ahead" && `$${Math.abs(health.gap).toFixed(2)} ahead`}
          {health.gapStatus === "on-track" && "On track"}
          {health.gapStatus === "behind" && `$${health.gap.toFixed(2)} behind`}
        </span>
        <span className="text-muted-foreground">${health.regularPerPay.toFixed(2)}/pay</span>
      </div>
    </div>
  );
}
