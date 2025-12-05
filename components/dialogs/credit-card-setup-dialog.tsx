"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { CreditCard, Loader2, Info, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { formatStrategyName, getStrategyDescription, type PaymentStrategy } from "@/lib/services/payment-strategy";

interface CreditCardSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  accountName: string;
  currentBalance: number;
  onSuccess?: () => void;
}

interface FormData {
  apr: string;
  creditLimit: string;
  minimumPaymentAmount: string;
  minimumPaymentPercentage: string;
  paymentDueDay: string;
  statementClosingDay: string;
  paymentStrategy: PaymentStrategy;
  amountDueNextStatement: string;
}

export function CreditCardSetupDialog({
  open,
  onOpenChange,
  accountId,
  accountName,
  currentBalance,
  onSuccess,
}: CreditCardSetupDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    apr: "",
    creditLimit: "",
    minimumPaymentAmount: "",
    minimumPaymentPercentage: "2.00",
    paymentDueDay: "1",
    statementClosingDay: "1",
    paymentStrategy: "pay_off",
    amountDueNextStatement: Math.abs(currentBalance).toFixed(2),
  });

  const [useFixedMinimum, setUseFixedMinimum] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate APR
      const aprValue = parseFloat(formData.apr);
      if (isNaN(aprValue) || aprValue < 0 || aprValue > 100) {
        toast.error("Please enter a valid APR between 0 and 100");
        setIsLoading(false);
        return;
      }

      // Prepare update data
      const updateData: Record<string, any> = {
        apr: aprValue,
        credit_limit: formData.creditLimit ? parseFloat(formData.creditLimit) : null,
        payment_due_day: parseInt(formData.paymentDueDay),
        statement_closing_day: parseInt(formData.statementClosingDay),
        payment_strategy: formData.paymentStrategy,
        amount_due_next_statement: formData.amountDueNextStatement
          ? parseFloat(formData.amountDueNextStatement)
          : null,
      };

      // Handle minimum payment (either fixed amount or percentage)
      if (useFixedMinimum && formData.minimumPaymentAmount) {
        updateData.minimum_payment_amount = parseFloat(formData.minimumPaymentAmount);
        updateData.minimum_payment_percentage = null;
      } else if (formData.minimumPaymentPercentage) {
        updateData.minimum_payment_percentage = parseFloat(formData.minimumPaymentPercentage);
        updateData.minimum_payment_amount = null;
      }

      // Update account via API
      const response = await fetch(`/api/accounts/${accountId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update credit card settings");
      }

      toast.success("Credit card settings updated successfully");
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating credit card:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update credit card");
    } finally {
      setIsLoading(false);
    }
  };

  const selectedStrategy = formData.paymentStrategy;
  const strategyDescription = getStrategyDescription(selectedStrategy);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Configure Credit Card: {accountName}
          </DialogTitle>
          <DialogDescription>
            Set up interest tracking, payment strategy, and due dates for this credit card.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Interest Rate */}
          <div className="space-y-2">
            <Label htmlFor="apr" className="flex items-center gap-2">
              APR (Annual Percentage Rate)
              <span className="text-red-500">*</span>
            </Label>
            <div className="flex gap-2 items-center">
              <Input
                id="apr"
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="18.99"
                value={formData.apr}
                onChange={(e) => setFormData({ ...formData, apr: e.target.value })}
                required
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
            <p className="text-xs text-muted-foreground">
              The annual interest rate charged on balances (e.g., 18.99 for 18.99%)
            </p>
          </div>

          {/* Credit Limit */}
          <div className="space-y-2">
            <Label htmlFor="creditLimit">Credit Limit</Label>
            <div className="flex gap-2 items-center">
              <span className="text-sm text-muted-foreground">$</span>
              <Input
                id="creditLimit"
                type="number"
                step="0.01"
                min="0"
                placeholder="5000.00"
                value={formData.creditLimit}
                onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
                className="flex-1"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Your total credit limit for utilization tracking
            </p>
          </div>

          {/* Amount Due Next Statement */}
          <div className="space-y-2">
            <Label htmlFor="amountDue">Amount Due on Next Statement</Label>
            <div className="flex gap-2 items-center">
              <span className="text-sm text-muted-foreground">$</span>
              <Input
                id="amountDue"
                type="number"
                step="0.01"
                min="0"
                placeholder={Math.abs(currentBalance).toFixed(2)}
                value={formData.amountDueNextStatement}
                onChange={(e) => setFormData({ ...formData, amountDueNextStatement: e.target.value })}
                className="flex-1"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Total amount due to pay off the card completely on next statement
            </p>
          </div>

          {/* Minimum Payment */}
          <div className="space-y-2">
            <Label>Minimum Payment Requirement</Label>
            <div className="flex items-center gap-4 mb-2">
              <button
                type="button"
                onClick={() => setUseFixedMinimum(false)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  !useFixedMinimum
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                Percentage
              </button>
              <button
                type="button"
                onClick={() => setUseFixedMinimum(true)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  useFixedMinimum
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                Fixed Amount
              </button>
            </div>

            {!useFixedMinimum ? (
              <div className="flex gap-2 items-center">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="2.00"
                  value={formData.minimumPaymentPercentage}
                  onChange={(e) =>
                    setFormData({ ...formData, minimumPaymentPercentage: e.target.value })
                  }
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground">% of balance</span>
              </div>
            ) : (
              <div className="flex gap-2 items-center">
                <span className="text-sm text-muted-foreground">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="25.00"
                  value={formData.minimumPaymentAmount}
                  onChange={(e) =>
                    setFormData({ ...formData, minimumPaymentAmount: e.target.value })
                  }
                  className="flex-1"
                />
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              The minimum payment required each month
            </p>
          </div>

          {/* Payment Due Day */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="paymentDueDay">Payment Due Day</Label>
              <Select
                value={formData.paymentDueDay}
                onValueChange={(value) => setFormData({ ...formData, paymentDueDay: value })}
              >
                <SelectTrigger id="paymentDueDay">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <SelectItem key={day} value={day.toString()}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Day of month (1-31)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="statementClosingDay">Statement Closing Day</Label>
              <Select
                value={formData.statementClosingDay}
                onValueChange={(value) =>
                  setFormData({ ...formData, statementClosingDay: value })
                }
              >
                <SelectTrigger id="statementClosingDay">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <SelectItem key={day} value={day.toString()}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Day of month (1-31)</p>
            </div>
          </div>

          {/* Payment Strategy */}
          <div className="space-y-2">
            <Label htmlFor="paymentStrategy" className="flex items-center gap-2">
              Payment Strategy
              <Info className="h-3 w-3 text-muted-foreground" />
            </Label>
            <Select
              value={formData.paymentStrategy}
              onValueChange={(value) =>
                setFormData({ ...formData, paymentStrategy: value as PaymentStrategy })
              }
            >
              <SelectTrigger id="paymentStrategy">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pay_off">{formatStrategyName("pay_off")}</SelectItem>
                <SelectItem value="avalanche">{formatStrategyName("avalanche")}</SelectItem>
                <SelectItem value="snowball">{formatStrategyName("snowball")}</SelectItem>
                <SelectItem value="minimum_only">{formatStrategyName("minimum_only")}</SelectItem>
                <SelectItem value="custom">{formatStrategyName("custom")}</SelectItem>
              </SelectContent>
            </Select>

            {/* Strategy Description */}
            <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3">
              <p className="text-xs text-blue-800 dark:text-blue-200">{strategyDescription}</p>
            </div>

            {/* Educational Message for Debt */}
            {formData.paymentStrategy !== "pay_off" && currentBalance < 0 && (
              <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-amber-800 dark:text-amber-200">
                    <strong>Tip:</strong> If carrying a balance, consider switching to debit or cash
                    for daily expenses until this card is paid off. Only use credit cards for
                    budgeted items, not as a loan from the bank.
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Settings
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
