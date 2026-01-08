"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Clock, CheckCircle, XCircle, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatDistanceToNow } from "date-fns";

interface SpendingTransaction {
  id: string;
  amount: number;
  description: string | null;
  category: string | null;
  merchant_name: string | null;
  from_envelope_type: string | null;
  requires_approval: boolean;
  approval_status: "pending" | "approved" | "denied";
  denial_reason: string | null;
  created_at: string;
}

interface SpendingTransactionCardProps {
  transaction: SpendingTransaction;
  showApprovalStatus?: boolean;
}

const CATEGORY_ICONS: Record<string, string> = {
  snacks: "🍿",
  toys: "🧸",
  games: "🎮",
  clothes: "👕",
  books: "📚",
  other: "📦",
};

export function SpendingTransactionCard({
  transaction,
  showApprovalStatus = true,
}: SpendingTransactionCardProps) {
  const isPending = transaction.approval_status === "pending";
  const isApproved = transaction.approval_status === "approved";
  const isDenied = transaction.approval_status === "denied";

  return (
    <Card
      className={cn(
        "transition-all",
        isPending && "border-gold-light bg-gold-light/20",
        isDenied && "border-red-200 bg-red-50/50"
      )}
    >
      <CardContent className="py-3 px-4">
        <div className="flex items-center gap-3">
          {/* Category Icon */}
          <div
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center text-lg",
              isPending
                ? "bg-gold-light"
                : isDenied
                ? "bg-red-100"
                : "bg-sage-very-light"
            )}
          >
            {transaction.category
              ? CATEGORY_ICONS[transaction.category] || "📦"
              : "💰"}
          </div>

          {/* Transaction Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-text-dark truncate">
                {transaction.description || "Spending"}
              </span>
              {transaction.merchant_name && (
                <Badge variant="outline" className="text-xs hidden sm:inline-flex">
                  <ShoppingBag className="h-3 w-3 mr-1" />
                  {transaction.merchant_name}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-text-light">
              <span>
                {formatDistanceToNow(new Date(transaction.created_at), {
                  addSuffix: true,
                })}
              </span>
              {transaction.from_envelope_type && (
                <>
                  <span>•</span>
                  <span className="capitalize">{transaction.from_envelope_type}</span>
                </>
              )}
            </div>
            {isDenied && transaction.denial_reason && (
              <p className="text-xs text-red-600 mt-1">
                Denied: {transaction.denial_reason}
              </p>
            )}
          </div>

          {/* Amount */}
          <div className="text-right">
            <p
              className={cn(
                "font-bold",
                isDenied ? "text-red-600 line-through" : "text-text-dark"
              )}
            >
              ${transaction.amount.toFixed(2)}
            </p>
            {showApprovalStatus && (
              <div className="flex items-center justify-end gap-1 mt-0.5">
                {isPending && (
                  <Badge
                    variant="outline"
                    className="text-xs bg-gold-light text-gold-dark border-gold"
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    Pending
                  </Badge>
                )}
                {isApproved && !transaction.requires_approval && (
                  <span className="text-xs text-sage">
                    <CheckCircle className="h-3 w-3 inline mr-1" />
                    Approved
                  </span>
                )}
                {isDenied && (
                  <Badge variant="outline" className="text-xs bg-red-50 text-red-600 border-red-200">
                    <XCircle className="h-3 w-3 mr-1" />
                    Denied
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
