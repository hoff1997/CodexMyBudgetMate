"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/finance";
import { cn } from "@/lib/cn";
import { getProgressColor } from "@/lib/utils/progress-colors";
import { EnvelopeTransferDialog } from "@/components/layout/envelopes/envelope-transfer-dialog";
import {
  ArrowLeft,
  Wallet,
  Target,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  MoreVertical,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

// Priority configuration
const PRIORITY_CONFIG = {
  essential: { label: "Essential", dotColor: "bg-[#5A7E7A]", textColor: "text-sage-dark" },
  important: { label: "Important", dotColor: "bg-[#9CA3AF]", textColor: "text-text-medium" },
  discretionary: { label: "Flexible", dotColor: "bg-[#6B9ECE]", textColor: "text-blue" },
};

interface Envelope {
  id: string;
  name: string;
  target_amount: number | null;
  current_amount: number | null;
  frequency: string | null;
  due_date: string | number | null;
  icon: string | null;
  notes: string | null;
  priority: "essential" | "important" | "discretionary" | null;
  subtype: string | null;
  is_spending: boolean | null;
  is_tracking_only: boolean | null;
  is_suggested: boolean | null;
  suggestion_type: string | null;
  category_id: string | null;
  created_at: string;
  updated_at: string;
  category: {
    id: string;
    name: string;
    icon: string | null;
  } | null;
}

interface Transaction {
  id: string;
  merchant_name: string;
  description: string | null;
  amount: number;
  occurred_at: string;
  status: string;
  account: { id: string; name: string } | null;
}

interface Transfer {
  id: string;
  amount: number;
  note: string | null;
  created_at: string;
  from_envelope?: { id: string; name: string } | null;
  to_envelope?: { id: string; name: string } | null;
}

interface SimpleEnvelope {
  id: string;
  name: string;
  current_amount: number | null;
  target_amount: number | null;
  icon: string | null;
}

interface Props {
  envelope: Envelope;
  transactions: Transaction[];
  transfersIn: Transfer[];
  transfersOut: Transfer[];
  allEnvelopes: SimpleEnvelope[];
  insights: {
    thisMonthSpending: number;
    lastMonthSpending: number;
  };
}

export function EnvelopeDetailClient({
  envelope,
  transactions,
  transfersIn,
  transfersOut,
  allEnvelopes,
  insights,
}: Props) {
  const router = useRouter();
  const [transferOpen, setTransferOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const current = Number(envelope.current_amount ?? 0);
  const target = Number(envelope.target_amount ?? 0);
  const percentage = target > 0 ? Math.min(100, Math.max(0, Math.round((current / target) * 100))) : 0;
  const gap = target - current;
  const isSpending = Boolean(envelope.is_spending);
  const isTracking = Boolean(envelope.is_tracking_only);
  const priority = envelope.priority ?? "discretionary";
  const priorityConfig = PRIORITY_CONFIG[priority];

  // Get status
  const getStatus = () => {
    if (isSpending || isTracking) return { label: "Tracking", color: "text-text-medium", icon: Clock };
    if (target === 0) return { label: "No target", color: "text-text-medium", icon: AlertCircle };
    if (current >= target) return { label: "Fully funded", color: "text-sage", icon: CheckCircle2 };
    if (percentage >= 80) return { label: "Almost there", color: "text-sage-dark", icon: TrendingUp };
    return { label: "Needs funding", color: "text-blue", icon: AlertCircle };
  };

  const status = getStatus();
  const StatusIcon = status.icon;

  // Combine and sort all activity (transactions + transfers)
  const allActivity = useMemo(() => {
    const items: Array<{
      id: string;
      type: "transaction" | "transfer_in" | "transfer_out";
      date: string;
      description: string;
      amount: number;
      subtext?: string;
    }> = [];

    // Add transactions
    transactions.forEach(t => {
      items.push({
        id: t.id,
        type: "transaction",
        date: t.occurred_at,
        description: t.merchant_name || t.description || "Transaction",
        amount: t.amount,
        subtext: t.account?.name,
      });
    });

    // Add transfers in
    transfersIn.forEach(t => {
      items.push({
        id: t.id,
        type: "transfer_in",
        date: t.created_at,
        description: `Transfer from ${t.from_envelope?.name || "Unknown"}`,
        amount: t.amount,
        subtext: t.note || undefined,
      });
    });

    // Add transfers out
    transfersOut.forEach(t => {
      items.push({
        id: t.id,
        type: "transfer_out",
        date: t.created_at,
        description: `Transfer to ${t.to_envelope?.name || "Unknown"}`,
        amount: -t.amount,
        subtext: t.note || undefined,
      });
    });

    // Sort by date (most recent first)
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, transfersIn, transfersOut]);

  // Handle delete
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/envelopes/${envelope.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete envelope");
      }

      toast.success("Envelope deleted");
      router.push("/envelope-summary");
      router.refresh();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete envelope");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  // Spending comparison
  const spendingDiff = insights.lastMonthSpending > 0
    ? ((insights.thisMonthSpending - insights.lastMonthSpending) / insights.lastMonthSpending) * 100
    : 0;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Back Button */}
      <Link
        href="/envelope-summary"
        className="inline-flex items-center gap-2 text-sage-dark hover:text-sage transition-colors text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Envelope Summary
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-sage-very-light border border-sage-light flex items-center justify-center text-3xl">
            {envelope.icon || "📁"}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-dark">{envelope.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              <div className="flex items-center gap-1.5">
                <div className={cn("w-2.5 h-2.5 rounded-full", priorityConfig.dotColor)} />
                <span className={cn("text-sm", priorityConfig.textColor)}>{priorityConfig.label}</span>
              </div>
              {envelope.category && (
                <>
                  <span className="text-text-light">·</span>
                  <span className="text-sm text-text-medium">
                    {envelope.category.icon} {envelope.category.name}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-red-600"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Envelope
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Status Card */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* Current Balance */}
            <div className="text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                <Wallet className="w-4 h-4 text-text-medium" />
                <span className="text-xs font-medium text-text-medium uppercase tracking-wide">Current</span>
              </div>
              <p className="text-3xl font-bold text-sage">{formatCurrency(current)}</p>
            </div>

            {/* Target */}
            {!isSpending && !isTracking && target > 0 && (
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Target className="w-4 h-4 text-text-medium" />
                  <span className="text-xs font-medium text-text-medium uppercase tracking-wide">Target</span>
                </div>
                <p className="text-3xl font-bold text-text-dark">{formatCurrency(target)}</p>
              </div>
            )}

            {/* Status */}
            <div className="text-center sm:text-right">
              <div className="flex items-center justify-center sm:justify-end gap-2 mb-1">
                <StatusIcon className={cn("w-4 h-4", status.color)} />
                <span className="text-xs font-medium text-text-medium uppercase tracking-wide">Status</span>
              </div>
              <p className={cn("text-xl font-semibold", status.color)}>{status.label}</p>
            </div>
          </div>

          {/* Progress Bar */}
          {!isSpending && !isTracking && target > 0 && (
            <div className="mt-6 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-medium">Progress</span>
                <span className="font-semibold text-text-dark">{percentage}%</span>
              </div>
              <div className="h-3 bg-silver-very-light rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(percentage, 100)}%`,
                    backgroundColor: getProgressColor(percentage),
                  }}
                />
              </div>
              {gap > 0 && (
                <p className="text-sm text-text-medium">
                  Need <span className="font-semibold text-blue">{formatCurrency(gap)}</span> more to reach target
                </p>
              )}
              {gap < 0 && (
                <p className="text-sm text-text-medium">
                  <span className="font-semibold text-sage-dark">{formatCurrency(Math.abs(gap))}</span> over target
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Button
          className="bg-sage hover:bg-sage-dark text-white"
          onClick={() => setTransferOpen(true)}
        >
          <ArrowUpRight className="w-4 h-4 mr-1.5" />
          Transfer Funds
        </Button>
      </div>

      {/* Insights (if has spending) */}
      {(insights.thisMonthSpending > 0 || insights.lastMonthSpending > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Spending Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-text-medium uppercase tracking-wide mb-1">This Month</p>
                <p className="text-xl font-bold text-text-dark">{formatCurrency(insights.thisMonthSpending)}</p>
              </div>
              <div>
                <p className="text-xs text-text-medium uppercase tracking-wide mb-1">Last Month</p>
                <p className="text-xl font-bold text-text-dark">{formatCurrency(insights.lastMonthSpending)}</p>
              </div>
            </div>
            {insights.lastMonthSpending > 0 && (
              <div className={cn(
                "flex items-center gap-2 text-sm p-2 rounded-lg",
                spendingDiff <= 0 ? "bg-sage-very-light text-sage-dark" : "bg-gold-light text-gold"
              )}>
                {spendingDiff <= 0 ? (
                  <>
                    <TrendingDown className="w-4 h-4" />
                    <span>Spending {Math.abs(spendingDiff).toFixed(0)}% less than last month</span>
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-4 h-4" />
                    <span>Spending {spendingDiff.toFixed(0)}% more than last month</span>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Transaction History */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Activity History</CardTitle>
            <span className="text-xs text-text-medium">{allActivity.length} items</span>
          </div>
        </CardHeader>
        <CardContent>
          {allActivity.length === 0 ? (
            <p className="text-center text-text-medium py-8">No activity yet</p>
          ) : (
            <div className="space-y-1">
              {allActivity.map((item) => (
                <div
                  key={`${item.type}-${item.id}`}
                  className="flex items-center justify-between py-3 border-b border-silver-very-light last:border-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                      item.amount > 0 ? "bg-sage-very-light" : "bg-silver-very-light"
                    )}>
                      {item.type === "transfer_in" ? (
                        <ArrowDownLeft className="w-4 h-4 text-sage" />
                      ) : item.type === "transfer_out" ? (
                        <ArrowUpRight className="w-4 h-4 text-text-medium" />
                      ) : item.amount > 0 ? (
                        <ArrowDownLeft className="w-4 h-4 text-sage" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4 text-text-medium" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-text-dark truncate">{item.description}</p>
                      <div className="flex items-center gap-2 text-xs text-text-medium">
                        <span>{format(new Date(item.date), "MMM d, yyyy")}</span>
                        {item.subtext && (
                          <>
                            <span>·</span>
                            <span className="truncate">{item.subtext}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className={cn(
                      "font-semibold",
                      item.amount > 0 ? "text-sage" : "text-text-dark"
                    )}>
                      {item.amount > 0 ? "+" : ""}{formatCurrency(item.amount)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      {envelope.notes && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-text-medium whitespace-pre-wrap">{envelope.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Transfer Dialog */}
      <EnvelopeTransferDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
        envelopes={allEnvelopes.map(e => ({
          id: e.id,
          name: e.name,
          icon: e.icon,
          current_amount: e.current_amount,
          target_amount: e.target_amount,
          // Required by SummaryEnvelope type
          due_date: null,
          frequency: null,
        })) as any}
        history={[]}
        defaultFromId={envelope.id}
        onTransferComplete={() => {
          router.refresh();
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {envelope.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this envelope
              and remove all associated data.
              {current > 0 && (
                <span className="block mt-2 text-gold font-medium">
                  This envelope has {formatCurrency(current)} that will be unassigned.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
