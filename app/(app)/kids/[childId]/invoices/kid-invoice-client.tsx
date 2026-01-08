"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import {
  ArrowLeft,
  Receipt,
  Calendar,
  DollarSign,
  PartyPopper,
  Send,
  Check,
  Clock,
  Loader2,
  ChevronDown,
  ChevronUp,
  History,
} from "lucide-react";

interface ChildProfile {
  id: string;
  name: string;
  avatar_url: string | null;
}

interface InvoiceItem {
  id: string;
  name: string;
  icon: string;
  amount: number;
  approvedAt: string;
  weekStarting: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  submittedAt: string | null;
  paidAt: string | null;
  items: InvoiceItem[];
}

interface KidInvoiceClientProps {
  child: ChildProfile;
  currentInvoice: Invoice | null;
  invoiceHistory: Invoice[];
}

export function KidInvoiceClient({
  child,
  currentInvoice,
  invoiceHistory,
}: KidInvoiceClientProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

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

  const handleSubmitInvoice = async () => {
    if (!currentInvoice || currentInvoice.status !== "draft") return;

    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/kids/${child.id}/invoices/${currentInvoice.id}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (res.ok) {
        router.refresh();
      } else {
        const error = await res.json();
        console.error("Failed to submit invoice:", error);
        alert(error.error || "Failed to submit invoice");
      }
    } catch (err) {
      console.error("Failed to submit invoice:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "submitted":
        return (
          <Badge variant="outline" className="bg-gold-light text-gold-dark border-gold text-xs">
            <Send className="h-3 w-3 mr-1" />
            Sent to Parent
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

  const isDraft = currentInvoice?.status === "draft";
  const isSubmitted = currentInvoice?.status === "submitted";

  return (
    <div className="min-h-screen bg-gradient-to-b from-sage-very-light to-white">
      <div className="w-full max-w-2xl mx-auto px-4 py-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link
            href={`/kids/${child.id}/dashboard`}
            className="p-2 hover:bg-silver-light rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-text-medium" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-sage-light flex items-center justify-center text-xl">
              {child.avatar_url ? (
                <Image
                  src={child.avatar_url}
                  alt={child.name}
                  width={40}
                  height={40}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                "👤"
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold text-text-dark">My Invoice</h1>
              <p className="text-sm text-text-medium">
                {currentInvoice ? currentInvoice.invoiceNumber : "No current invoice"}
              </p>
            </div>
          </div>
        </div>

        {/* Current Invoice Section */}
        {!currentInvoice || currentInvoice.items.length === 0 ? (
          /* Empty State */
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-sage-very-light flex items-center justify-center mx-auto mb-4">
                <Receipt className="h-8 w-8 text-sage" />
              </div>
              <h2 className="text-lg font-semibold text-text-dark mb-2">
                No earnings yet
              </h2>
              <p className="text-text-medium text-sm mb-4">
                Complete extra chores to start building your invoice!
              </p>
              <Link href={`/kids/${child.id}/chores`}>
                <Button variant="outline" size="sm">
                  View Chores
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Status Badge */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {getStatusBadge(currentInvoice.status)}
                {currentInvoice.invoiceNumber && (
                  <span className="text-sm text-text-light">
                    {currentInvoice.invoiceNumber}
                  </span>
                )}
              </div>
              {isSubmitted && currentInvoice.submittedAt && (
                <span className="text-xs text-text-light">
                  Sent {formatDateTime(currentInvoice.submittedAt)}
                </span>
              )}
            </div>

            {/* Total Card */}
            <Card className={cn(
              "mb-4",
              isSubmitted ? "border-gold bg-gold-light/30" : "border-sage bg-sage-very-light"
            )}>
              <CardContent className="py-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-text-medium mb-1">
                      {isSubmitted ? "Awaiting Payment" : "Total Earnings"}
                    </p>
                    <p className={cn(
                      "text-4xl font-bold",
                      isSubmitted ? "text-gold-dark" : "text-sage-dark"
                    )}>
                      ${currentInvoice.totalAmount.toFixed(2)}
                    </p>
                    <p className="text-xs text-text-light mt-1">
                      {currentInvoice.items.length} completed chore
                      {currentInvoice.items.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className={cn(
                    "h-16 w-16 rounded-full flex items-center justify-center",
                    isSubmitted ? "bg-gold" : "bg-sage"
                  )}>
                    {isSubmitted ? (
                      <Send className="h-8 w-8 text-white" />
                    ) : (
                      <DollarSign className="h-8 w-8 text-white" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Items List */}
            <Card>
              <CardContent className="py-4">
                <h3 className="font-semibold text-text-dark mb-3 flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-sage" />
                  Completed Chores
                </h3>
                <div className="space-y-3">
                  {currentInvoice.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between py-2 border-b border-silver-light last:border-0"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{item.icon}</span>
                          <div>
                            <p className="font-medium text-text-dark">{item.name}</p>
                            <div className="flex items-center gap-1 text-xs text-text-light">
                              <Calendar className="h-3 w-3" />
                              {formatWeek(item.weekStarting)}
                            </div>
                          </div>
                        </div>
                      </div>
                      <span className="font-bold text-sage-dark">
                        ${item.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Total Row */}
                <div className="flex items-center justify-between pt-4 mt-4 border-t-2 border-sage">
                  <span className="font-bold text-text-dark">Total</span>
                  <span className="text-2xl font-bold text-sage-dark">
                    ${currentInvoice.totalAmount.toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Submit Button for Draft */}
            {isDraft && (
              <div className="mt-4">
                <Button
                  onClick={handleSubmitInvoice}
                  disabled={submitting}
                  className="w-full bg-sage hover:bg-sage-dark"
                  size="lg"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5 mr-2" />
                      Send to Parent for Payment
                    </>
                  )}
                </Button>
                <p className="text-xs text-text-light text-center mt-2">
                  Once submitted, your parent will see this invoice and can mark it as paid.
                </p>
              </div>
            )}

            {/* Info Card for Draft */}
            {isDraft && (
              <Card className="mt-4 bg-gold-light border-gold">
                <CardContent className="py-4">
                  <div className="flex items-start gap-3">
                    <PartyPopper className="h-5 w-5 text-gold shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-text-dark text-sm">
                        You're doing great!
                      </p>
                      <p className="text-xs text-text-medium mt-1">
                        Keep completing chores to build up your invoice, then send it when you're ready!
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Info Card for Submitted */}
            {isSubmitted && (
              <Card className="mt-4 bg-gold-light border-gold">
                <CardContent className="py-4">
                  <div className="flex items-start gap-3">
                    <Send className="h-5 w-5 text-gold shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-text-dark text-sm">
                        Invoice sent!
                      </p>
                      <p className="text-xs text-text-medium mt-1">
                        Your parent can see this invoice and will pay you soon. You're doing awesome!
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Invoice History Section */}
        {invoiceHistory.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-text-dark mb-4 flex items-center gap-2">
              <History className="h-5 w-5 text-text-medium" />
              Paid Invoices
            </h2>
            <div className="space-y-3">
              {invoiceHistory.map((invoice) => (
                <Card
                  key={invoice.id}
                  className="border-sage-light bg-sage-very-light/30"
                >
                  <CardHeader className="py-3 pb-0">
                    <button
                      onClick={() =>
                        setExpandedHistoryId(
                          expandedHistoryId === invoice.id ? null : invoice.id
                        )
                      }
                      className="w-full"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-sage flex items-center justify-center">
                            <Check className="h-5 w-5 text-white" />
                          </div>
                          <div className="text-left">
                            <CardTitle className="text-base">
                              {invoice.invoiceNumber}
                            </CardTitle>
                            <p className="text-xs text-text-light">
                              Paid {invoice.paidAt ? formatDateTime(invoice.paidAt) : ""}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sage-dark text-lg">
                            ${invoice.totalAmount.toFixed(2)}
                          </span>
                          {expandedHistoryId === invoice.id ? (
                            <ChevronUp className="h-5 w-5 text-text-medium" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-text-medium" />
                          )}
                        </div>
                      </div>
                    </button>
                  </CardHeader>

                  {expandedHistoryId === invoice.id && (
                    <CardContent className="pt-3">
                      <div className="border-t border-silver-light pt-3 space-y-2">
                        {invoice.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between text-sm"
                          >
                            <div className="flex items-center gap-2">
                              <span>{item.icon}</span>
                              <span className="text-text-medium">{item.name}</span>
                            </div>
                            <span className="text-sage-dark font-medium">
                              ${item.amount.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Total Earnings Summary (if history exists) */}
        {invoiceHistory.length > 0 && (
          <Card className="mt-4 border-sage bg-sage-very-light">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-medium">Total Earned (All Time)</p>
                  <p className="text-2xl font-bold text-sage-dark">
                    $
                    {(
                      invoiceHistory.reduce((sum, inv) => sum + inv.totalAmount, 0) +
                      (currentInvoice?.status === "paid" ? currentInvoice.totalAmount : 0)
                    ).toFixed(2)}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-sage flex items-center justify-center">
                  <PartyPopper className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
