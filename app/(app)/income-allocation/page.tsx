"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IncomeSetupWizard } from "@/components/income/income-setup-wizard";
import type { IncomeSourceWithAllocations } from "@/lib/types/income-allocation";

export default function IncomeAllocationPage() {
  const [incomeSources, setIncomeSources] = useState<IncomeSourceWithAllocations[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    fetchIncomeSources();
  }, []);

  async function fetchIncomeSources() {
    try {
      const response = await fetch("/api/income-sources");
      if (response.ok) {
        const data = await response.json();
        setIncomeSources(data);

        // Show wizard if no income sources exist
        if (data.length === 0) {
          setShowWizard(true);
        }
      }
    } catch (error) {
      console.error("Failed to fetch income sources:", error);
    } finally {
      setLoading(false);
    }
  }

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  const formatPayCycle = (cycle: string) => {
    return cycle.charAt(0).toUpperCase() + cycle.slice(1);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <p>Loading income sources...</p>
      </div>
    );
  }

  if (showWizard) {
    return (
      <div className="container mx-auto p-6">
        <IncomeSetupWizard
          onComplete={() => {
            setShowWizard(false);
            fetchIncomeSources();
          }}
          onCancel={() => setShowWizard(false)}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Income & Allocation</h1>
          <p className="text-muted-foreground mt-2">
            Manage your income sources and automatic envelope allocations
          </p>
        </div>
        <Button onClick={() => setShowWizard(true)}>
          + Add Income Source
        </Button>
      </div>

      {/* Income Sources */}
      {incomeSources.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground mb-4">
              No income sources configured yet. Add one to get started.
            </p>
            <Button onClick={() => setShowWizard(true)}>
              + Add Income Source
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {incomeSources.map((source) => (
            <Card key={source.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>
                      {source.name} ({formatPayCycle(source.pay_cycle)})
                    </CardTitle>
                    <CardDescription>
                      {source.typical_amount ? (
                        <>Typical: {formatCurrency(source.typical_amount)}</>
                      ) : (
                        <>No typical amount set</>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      Edit Allocations
                    </Button>
                    <Button variant="outline" size="sm">
                      Edit Detection Rule
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Detection Rule */}
                {source.detection_rule_id && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Detection Rule: </span>
                    <code className="bg-muted px-2 py-1 rounded">
                      &quot;{source.detection_rule?.pattern || "N/A"}&quot; in description
                    </code>
                  </div>
                )}

                {/* Auto-allocate toggle */}
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Auto-allocate:</span>
                  <span className={source.auto_allocate ? "text-green-600" : "text-gray-600"}>
                    {source.auto_allocate ? "ON" : "OFF"}
                  </span>
                </div>

                {/* Envelope Allocations */}
                {source.allocations && source.allocations.length > 0 ? (
                  <>
                    <div>
                      <p className="text-sm font-medium mb-2">Envelope Allocations:</p>
                      <div className="space-y-2">
                        {source.allocations.map((alloc) => (
                          <div
                            key={alloc.id}
                            className="flex items-center justify-between p-3 bg-muted rounded-lg text-sm"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{alloc.envelope_name}</span>
                              <span className="text-xs text-muted-foreground">
                                ({alloc.envelope_priority})
                              </span>
                            </div>
                            <span className="font-semibold">
                              {formatCurrency(Number(alloc.allocation_amount))}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="border-t pt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">Total Allocated:</span>
                        <span className="font-semibold">
                          {formatCurrency(source.total_allocated)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">Surplus to &quot;Surplus&quot;:</span>
                        <span className="font-semibold text-green-600">
                          {formatCurrency(source.surplus)}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    No allocations configured for this income source
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Envelope Funding Summary */}
      {incomeSources.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Envelope Funding Summary</CardTitle>
            <CardDescription>
              See which income sources are funding each envelope
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Funding summary feature coming soon...
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
