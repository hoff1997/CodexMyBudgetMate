"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/cn";
import {
  DollarSign,
  Check,
  ArrowLeft,
  Receipt,
  Calendar,
  Loader2,
  Clock,
  Send,
} from "lucide-react";
import Link from "next/link";

interface ChildProfile {
  id: string;
  name: string;
  avatar_url: string | null;
}

interface ChoreEarning {
  id: string;
  name: string;
  icon: string;
  amount: number;
  approvedAt: string;
  weekStarting: string;
}

interface ChildEarnings {
  total: number;
  invoiceId: string | null;
  invoiceNumber: string | null;
  status: string;
  submittedAt: string | null;
  paidAt: string | null;
  chores: ChoreEarning[];
}

interface InvoicesClientProps {
  childProfiles: ChildProfile[];
  earnings: Record<string, ChildEarnings>;
}

export function InvoicesClient({ childProfiles, earnings }: InvoicesClientProps) {
  const router = useRouter();
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const [togglingPaid, setTogglingPaid] = useState<string | null>(null);

  // Calculate total owed (draft + submitted invoices)
  const totalOwed = Object.values(earnings).reduce(
    (sum, e) => (e.status === "draft" || e.status === "submitted" ? sum + e.total : sum),
    0
  );

  // Count submitted invoices awaiting payment
  const submittedCount = Object.values(earnings).filter(e => e.status === "submitted").length;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-NZ", {
      day: "numeric",
      month: "short",
    });
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-NZ", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatWeek = (weekStarting: string) => {
    const start = new Date(weekStarting);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${formatDate(weekStarting)} - ${formatDate(end.toISOString())}`;
  };

  const selectedChildData = selectedChild
    ? childProfiles.find((c) => c.id === selectedChild)
    : null;
  const selectedEarnings = selectedChild ? earnings[selectedChild] : null;

  const handleTogglePaid = async (childId: string, isPaid: boolean) => {
    const childEarnings = earnings[childId];
    if (!childEarnings.invoiceId) return;

    setTogglingPaid(childId);
    try {
      const res = await fetch(`/api/kids/${childId}/invoices/${childEarnings.invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: isPaid ? "paid" : "submitted" }),
      });

      if (res.ok) {
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to update payment status:", err);
    } finally {
      setTogglingPaid(null);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!selectedChild) return;

    const childEarnings = earnings[selectedChild];
    if (!childEarnings.invoiceId) return;

    setPaying(true);
    try {
      const res = await fetch(`/api/kids/${selectedChild}/invoices/${childEarnings.invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "paid" }),
      });

      if (res.ok) {
        setPayDialogOpen(false);
        setSelectedChild(null);
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to record payment:", err);
    } finally {
      setPaying(false);
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "submitted":
        return (
          <Badge variant="outline" className="bg-gold-light text-gold-dark border-gold text-xs">
            <Send className="h-3 w-3 mr-1" />
            Awaiting Payment
          </Badge>
        );
      case "paid":
        return (
          <Badge variant="outline" className="bg-sage-very-light text-sage-dark border-sage text-xs">
            <Check className="h-3 w-3 mr-1" />
            Paid
          </Badge>
        );
      case "draft":
        return (
          <Badge variant="outline" className="bg-silver-very-light text-text-medium border-silver-light text-xs">
            <Clock className="h-3 w-3 mr-1" />
            Building
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/kids/setup"
          className="p-2 hover:bg-silver-light rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-text-medium" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text-dark">Pocket Money Invoices</h1>
          <p className="text-text-medium">Track and pay your kids' earnings</p>
        </div>
      </div>

      {/* Summary Card */}
      <Card className="mb-6 border-sage bg-sage-very-light">
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-medium mb-1">Total Owed</p>
              <p className="text-4xl font-bold text-sage-dark">
                ${totalOwed.toFixed(2)}
              </p>
              {submittedCount > 0 && (
                <p className="text-sm text-gold-dark mt-1">
                  {submittedCount} invoice{submittedCount !== 1 ? "s" : ""} awaiting payment
                </p>
              )}
            </div>
            <div className="h-16 w-16 rounded-full bg-sage flex items-center justify-center">
              <DollarSign className="h-8 w-8 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Children Cards */}
      <div className="space-y-4">
        {childProfiles.map((child) => {
          const childEarnings = earnings[child.id];
          const hasEarnings = childEarnings.total > 0;
          const isPaid = childEarnings.status === "paid";
          const isSubmitted = childEarnings.status === "submitted";
          const isDraft = childEarnings.status === "draft";
          const isToggling = togglingPaid === child.id;

          return (
            <Card
              key={child.id}
              className={cn(
                !hasEarnings && "opacity-60",
                isPaid && "border-sage bg-sage-very-light/30",
                isSubmitted && "border-gold bg-gold-light/30"
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-sage-light flex items-center justify-center text-2xl">
                      {child.avatar_url ? (
                        <Image
                          src={child.avatar_url}
                          alt={child.name}
                          width={48}
                          height={48}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        "👤"
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{child.name}</CardTitle>
                        {hasEarnings && getStatusBadge(childEarnings.status)}
                      </div>
                      <p className="text-sm text-text-medium">
                        {childEarnings.chores.length} completed chore
                        {childEarnings.chores.length !== 1 ? "s" : ""}
                        {childEarnings.invoiceNumber && (
                          <span className="text-text-light ml-1">
                            • {childEarnings.invoiceNumber}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn("text-2xl font-bold", isPaid ? "text-text-medium line-through" : "text-sage-dark")}>
                      ${childEarnings.total.toFixed(2)}
                    </p>
                    {hasEarnings && !isPaid && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2"
                        onClick={() => {
                          setSelectedChild(child.id);
                          setPayDialogOpen(true);
                        }}
                      >
                        <Receipt className="h-4 w-4 mr-1" />
                        View Details
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              {hasEarnings && (
                <CardContent className="pt-0">
                  <div className="border-t border-silver-light pt-3">
                    <div className="space-y-2">
                      {childEarnings.chores.slice(0, 3).map((chore) => (
                        <div
                          key={chore.id}
                          className="flex items-center justify-between text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <span>{chore.icon}</span>
                            <span className={cn("text-text-medium", isPaid && "line-through")}>{chore.name}</span>
                          </div>
                          <span className={cn("font-medium", isPaid ? "text-text-light line-through" : "text-sage-dark")}>
                            ${chore.amount.toFixed(2)}
                          </span>
                        </div>
                      ))}
                      {childEarnings.chores.length > 3 && (
                        <p className="text-xs text-text-light text-center pt-1">
                          +{childEarnings.chores.length - 3} more
                        </p>
                      )}
                    </div>

                    {/* Payment Section - Only for submitted or paid invoices */}
                    {(isSubmitted || isPaid) && (
                      <div className="mt-4 pt-3 border-t border-silver-light">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`paid-${child.id}`}
                              checked={isPaid}
                              disabled={isToggling}
                              onCheckedChange={(checked) => handleTogglePaid(child.id, checked as boolean)}
                              className="data-[state=checked]:bg-sage data-[state=checked]:border-sage"
                            />
                            <label
                              htmlFor={`paid-${child.id}`}
                              className="text-sm font-medium text-text-dark cursor-pointer select-none"
                            >
                              Mark as paid
                            </label>
                            {isToggling && (
                              <Loader2 className="h-3 w-3 animate-spin text-sage" />
                            )}
                          </div>
                          {isPaid && childEarnings.paidAt && (
                            <span className="text-xs text-text-light flex items-center gap-1">
                              <Check className="h-3 w-3 text-sage" />
                              Paid on {formatDateTime(childEarnings.paidAt)}
                            </span>
                          )}
                          {isSubmitted && childEarnings.submittedAt && (
                            <span className="text-xs text-text-light flex items-center gap-1">
                              <Send className="h-3 w-3 text-gold" />
                              Submitted {formatDateTime(childEarnings.submittedAt)}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Draft status info */}
                    {isDraft && (
                      <div className="mt-4 pt-3 border-t border-silver-light">
                        <p className="text-xs text-text-light flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Still building - your child can submit when ready
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Payment Detail Dialog */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedChildData?.avatar_url ? (
                <Image
                  src={selectedChildData.avatar_url}
                  alt={selectedChildData.name}
                  width={32}
                  height={32}
                  className="rounded-full object-cover"
                />
              ) : (
                <span className="text-2xl">👤</span>
              )}
              {selectedChildData?.name}'s Invoice
              {selectedEarnings?.invoiceNumber && (
                <span className="text-sm font-normal text-text-light ml-1">
                  ({selectedEarnings.invoiceNumber})
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 max-h-[50vh] overflow-y-auto">
            {selectedEarnings && getStatusBadge(selectedEarnings.status)}

            <div className="mt-4 space-y-0">
              {selectedEarnings?.chores.map((chore) => (
                <div
                  key={chore.id}
                  className="flex items-center justify-between py-2 border-b border-silver-light last:border-0"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{chore.icon}</span>
                      <div>
                        <p className="font-medium text-text-dark">{chore.name}</p>
                        <div className="flex items-center gap-1 text-xs text-text-light">
                          <Calendar className="h-3 w-3" />
                          {formatWeek(chore.weekStarting)}
                        </div>
                      </div>
                    </div>
                  </div>
                  <span className="font-bold text-sage-dark">
                    ${chore.amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 mt-4 border-t-2 border-sage">
              <span className="font-bold text-text-dark">Total</span>
              <span className="text-2xl font-bold text-sage-dark">
                ${selectedEarnings?.total.toFixed(2)}
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialogOpen(false)}>
              Close
            </Button>
            {selectedEarnings?.status !== "paid" && (
              <Button
                onClick={handleMarkAsPaid}
                disabled={paying}
                className="bg-sage hover:bg-sage-dark"
              >
                {paying ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Mark as Paid
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
