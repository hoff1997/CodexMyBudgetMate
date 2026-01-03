"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, Merge, Eye } from "lucide-react";
import { toast } from "sonner";

interface Transaction {
  id: string;
  merchant_name: string;
  description?: string | null;
  amount: number;
  occurred_at: string;
  status: string;
  source?: string;
}

interface DuplicateReviewDialogProps {
  transaction: Transaction | null;
  potentialDuplicate: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DuplicateReviewDialog({
  transaction,
  potentialDuplicate,
  open,
  onOpenChange,
}: DuplicateReviewDialogProps) {
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleAction = async (decision: "merge" | "ignore") => {
    if (!transaction || !potentialDuplicate) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/transactions/${transaction.id}/duplicates`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            duplicateId: potentialDuplicate.id,
            decision,
            note: decision === "merge" ? "Merged via duplicate review dialog" : "Kept as separate transactions",
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to resolve duplicate");
      }

      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });

      let message = "";
      if (decision === "merge") {
        message = "Transactions merged successfully";
      } else {
        message = "Both transactions kept as separate entries";
      }

      toast.success("Duplicate Resolved", {
        description: message,
      });
      onOpenChange(false);
    } catch (error) {
      toast.error("Error", {
        description:
          error instanceof Error
            ? error.message
            : "Failed to resolve duplicate transaction",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!transaction || !potentialDuplicate) return null;

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("en-NZ", {
      style: "currency",
      currency: "NZD",
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-NZ", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const calculateDateDifference = () => {
    const diff = Math.abs(
      new Date(transaction.occurred_at).getTime() -
        new Date(potentialDuplicate.occurred_at).getTime(),
    );
    return Math.round(diff / (1000 * 60 * 60 * 24));
  };

  const amountMatch =
    Math.abs(transaction.amount - potentialDuplicate.amount) < 0.01;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <span>Potential Duplicate Transaction</span>
          </DialogTitle>
          <DialogDescription>
            We found a transaction that might be a duplicate. Please review and
            choose how to handle it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Primary Transaction */}
          <div>
            <h4 className="font-medium mb-2 flex items-center">
              <Badge variant="outline" className="mr-2">
                Primary
              </Badge>
              Transaction #{transaction.id.slice(0, 8)}
            </h4>
            <Card>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="font-medium">{transaction.merchant_name}</p>
                    {transaction.description && (
                      <p className="text-sm text-muted-foreground">
                        {transaction.description}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {formatDate(transaction.occurred_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold">
                      {formatAmount(transaction.amount)}
                    </p>
                    <Badge
                      variant={
                        transaction.status === "approved" ? "default" : "secondary"
                      }
                    >
                      {transaction.status === "approved" ? "Approved" : "Pending"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Separator />

          {/* Potential Duplicate */}
          <div>
            <h4 className="font-medium mb-2 flex items-center">
              <Badge variant="outline" className="mr-2">
                Duplicate
              </Badge>
              Transaction #{potentialDuplicate.id.slice(0, 8)}
            </h4>
            <Card>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="font-medium">
                      {potentialDuplicate.merchant_name}
                    </p>
                    {potentialDuplicate.description && (
                      <p className="text-sm text-muted-foreground">
                        {potentialDuplicate.description}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {formatDate(potentialDuplicate.occurred_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold">
                      {formatAmount(potentialDuplicate.amount)}
                    </p>
                    <Badge
                      variant={
                        potentialDuplicate.status === "approved"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {potentialDuplicate.status === "approved"
                        ? "Approved"
                        : "Pending"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Comparison */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <h5 className="font-medium mb-2">Quick Comparison</h5>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Amount Match</p>
                <p
                  className={
                    amountMatch ? "text-green-600 font-medium" : "text-yellow-600"
                  }
                >
                  {amountMatch ? "Exact Match" : "Different"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Date Difference</p>
                <p className="font-medium">
                  {calculateDateDifference()} {calculateDateDifference() === 1 ? "day" : "days"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Amount Difference</p>
                <p className="font-medium">
                  {formatAmount(
                    Math.abs(transaction.amount - potentialDuplicate.amount),
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 pt-4">
            <Button
              onClick={() => handleAction("merge")}
              disabled={loading}
              className="flex-1"
            >
              <Merge className="h-4 w-4 mr-2" />
              Merge Transactions
            </Button>

            <Button
              variant="outline"
              onClick={() => handleAction("ignore")}
              disabled={loading}
              className="flex-1"
            >
              <Eye className="h-4 w-4 mr-2" />
              Keep Both Separate
            </Button>
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>
              <strong>Merge:</strong> Marks one transaction as a duplicate of the
              other. The duplicate will be hidden from your transaction list but
              preserved in the database.
            </p>
            <p>
              <strong>Keep Both Separate:</strong> Marks both transactions as
              reviewed and keeps them as separate, legitimate transactions.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
