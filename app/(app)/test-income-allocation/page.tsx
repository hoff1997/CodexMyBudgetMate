"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IncomeAllocationPreview } from "@/components/income/income-allocation-preview";
import { IncomeAllocationDialog } from "@/components/income/income-allocation-dialog";

export default function TestIncomeAllocationPage() {
  const [showPreview, setShowPreview] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [transactionData, setTransactionData] = useState({
    id: crypto.randomUUID(),
    description: "",
    amount: 0,
  });

  function handleTest() {
    setShowPreview(true);
  }

  function handleReset() {
    setShowPreview(false);
    setTransactionData({
      id: crypto.randomUUID(),
      description: "",
      amount: 0,
    });
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Test Income Allocation</h1>
        <p className="text-muted-foreground mt-2">
          Test the auto-allocation preview component
        </p>
      </div>

      {!showPreview ? (
        <Card>
          <CardHeader>
            <CardTitle>Simulate Income Transaction</CardTitle>
            <CardDescription>
              Enter transaction details to test income detection and allocation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="description">Transaction Description</Label>
              <Input
                id="description"
                placeholder="ACME CORP - SALARY"
                value={transactionData.description}
                onChange={(e) =>
                  setTransactionData({ ...transactionData, description: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                Use the detection pattern from your income source (e.g., &quot;ACME CORP&quot;)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Transaction Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="amount"
                  type="number"
                  placeholder="2100.00"
                  value={transactionData.amount || ""}
                  onChange={(e) =>
                    setTransactionData({
                      ...transactionData,
                      amount: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="pl-6"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Button
                onClick={handleTest}
                disabled={!transactionData.description || !transactionData.amount}
                variant="outline"
              >
                Test Inline Preview
              </Button>
              <Button
                onClick={() => setShowDialog(true)}
                disabled={!transactionData.description || !transactionData.amount}
              >
                Test Dialog Preview
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <IncomeAllocationPreview
            transactionId={transactionData.id}
            transactionDescription={transactionData.description}
            transactionAmount={transactionData.amount}
            onApprove={() => {
              alert("Allocation approved! In production, this would create envelope transactions.");
              handleReset();
            }}
            onSkip={() => {
              alert("Allocation skipped.");
              handleReset();
            }}
          />

          <Button variant="outline" onClick={handleReset} className="w-full">
            Test Another Transaction
          </Button>
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle>How to Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>1. Go to Income & Allocation and set up an income source with allocations</p>
          <p>2. Use the detection pattern from your income source in the description field above</p>
          <p>3. Enter an amount (try using different amounts to see variance calculation)</p>
          <p>4. Click &quot;Test Dialog Preview&quot; to see how it would appear in transactions (recommended)</p>
          <p>5. Try editing the allocation amounts and see how surplus updates in real-time</p>
          <p>6. Toggle &quot;Save changes to allocation plan&quot; to see the difference</p>
        </CardContent>
      </Card>

      <IncomeAllocationDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        transactionId={transactionData.id}
        transactionDescription={transactionData.description}
        transactionAmount={transactionData.amount}
        onComplete={() => {
          alert("Allocation approved! Transaction would be allocated to envelopes.");
        }}
      />
    </div>
  );
}
