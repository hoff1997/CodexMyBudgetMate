"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Check, X, ChevronDown, ChevronUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Transaction {
  id: string;
  merchant: string;
  description: string | null;
  amount: number;
  date: string;
  status: string;
  envelope_id: string | null;
}

interface Envelope {
  id: string;
  name: string;
  icon?: string;
}

export default function PendingApprovalWidget() {
  const [showAll, setShowAll] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: transactionsData } = useQuery<{ transactions: Transaction[] }>({
    queryKey: ["/api/transactions", { status: "pending" }],
    queryFn: async () => {
      const response = await fetch("/api/transactions?status=pending");
      if (!response.ok) throw new Error("Failed to fetch pending transactions");
      return response.json();
    },
  });

  const { data: envelopesData } = useQuery<{ envelopes: Envelope[] }>({
    queryKey: ["/api/envelopes"],
    queryFn: async () => {
      const response = await fetch("/api/envelopes");
      if (!response.ok) throw new Error("Failed to fetch envelopes");
      return response.json();
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (transactionId: string) => {
      const response = await fetch(`/api/transactions/${transactionId}/approve`, {
        method: "PATCH",
      });
      if (!response.ok) throw new Error("Failed to approve transaction");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/envelopes"] });
      toast.success("Transaction approved", {
        description: "The transaction has been approved and envelope balances updated.",
      });
    },
    onError: () => {
      toast.error("Error", {
        description: "Failed to approve transaction.",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (transactionId: string) => {
      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to reject transaction");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      toast.success("Transaction rejected", {
        description: "The transaction has been deleted.",
      });
    },
    onError: () => {
      toast.error("Error", {
        description: "Failed to reject transaction.",
      });
    },
  });

  const transactions = transactionsData?.transactions ?? [];
  const envelopes = envelopesData?.envelopes ?? [];
  const displayedTransactions = showAll
    ? transactions
    : transactions.slice(0, 3);

  if (transactions.length === 0) {
    return null;
  }

  const handleViewAll = () => {
    router.push("/reconcile");
  };

  return (
    <Card className="border-yellow-200 bg-yellow-50/50 dark:border-yellow-900/50 dark:bg-yellow-900/10">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-yellow-600" />
            <CardTitle className="text-base font-semibold">
              Pending Approval
            </CardTitle>
            <Badge variant="secondary" className="ml-2 bg-yellow-100 text-yellow-800">
              {transactions.length}
            </Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleViewAll}
            className="text-xs"
          >
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {displayedTransactions.map((transaction) => (
            <div
              key={transaction.id}
              className="border border-yellow-200 bg-white dark:bg-yellow-900/5 dark:border-yellow-900/30 rounded-lg p-3"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex-1">
                  <p className="font-medium text-sm text-foreground">
                    {transaction.merchant}
                  </p>
                  {transaction.description && (
                    <p className="text-xs text-muted-foreground">
                      {transaction.description}
                    </p>
                  )}
                  <p className="text-sm font-semibold text-foreground mt-1">
                    ${Math.abs(transaction.amount).toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                    onClick={() => approveMutation.mutate(transaction.id)}
                    disabled={approveMutation.isPending}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => rejectMutation.mutate(transaction.id)}
                    disabled={rejectMutation.isPending}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {transactions.length > 3 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAll(!showAll)}
              className="w-full mt-2"
            >
              {showAll ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Show All ({transactions.length - 3} more)
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
