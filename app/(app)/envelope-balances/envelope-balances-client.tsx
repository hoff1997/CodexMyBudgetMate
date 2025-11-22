"use client";

import { format } from "date-fns";
import { Download, Printer, FileText, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter, useSearchParams } from "next/navigation";
import { EnvelopeSummaryCard, type SummaryEnvelope } from "@/components/layout/envelopes/envelope-summary-card";

interface Envelope {
  id: string;
  name: string;
  icon: string | null;
  current_amount: number;
  target_amount: number | null;
  pay_cycle_amount: number | null;
  category: {
    id: string;
    name: string;
    sort_order: number;
  } | null;
}

interface EnvelopeCategory {
  id: string;
  name: string;
  sort_order: number;
}

interface Props {
  envelopes: Envelope[];
  categories: EnvelopeCategory[];
}

export function EnvelopeBalancesClient({ envelopes, categories }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get the last tab from URL params or localStorage
  const getLastTab = () => {
    const fromTab = searchParams.get("from");
    if (fromTab) return fromTab;

    // Fallback to localStorage if no URL param
    if (typeof window !== "undefined") {
      return localStorage.getItem("lastEnvelopeTab") || "envelopes";
    }
    return "envelopes";
  };

  const handleBackClick = () => {
    router.push(`/envelope-summary`);
  };

  // Group envelopes by category
  const groupedEnvelopes = categories
    .map((category) => ({
      category,
      envelopes: envelopes.filter(
        (env) => env.category?.id === category.id
      ),
    }))
    .filter((group) => group.envelopes.length > 0);

  // Add uncategorized envelopes
  const uncategorizedEnvelopes = envelopes.filter((env) => !env.category);
  if (uncategorizedEnvelopes.length > 0) {
    groupedEnvelopes.push({
      category: {
        id: "uncategorized",
        name: "Uncategorized",
        sort_order: 9999,
      },
      envelopes: uncategorizedEnvelopes,
    });
  }

  // Calculate totals
  const totals = envelopes.reduce(
    (acc, envelope) => {
      const balance = parseFloat(String(envelope.current_amount ?? 0));
      if (balance >= 0) {
        acc.totalCredit += balance;
      } else {
        acc.totalDebit += Math.abs(balance);
      }
      acc.netTotal += balance;
      return acc;
    },
    { totalDebit: 0, totalCredit: 0, netTotal: 0 }
  );

  const exportToExcel = () => {
    // Prepare data for CSV export
    const csvData: string[][] = [];

    // Add header
    csvData.push([
      "Category",
      "Envelope",
      "Budget",
      "Debit",
      "Credit",
      "Balance",
    ]);

    groupedEnvelopes.forEach((group) => {
      group.envelopes.forEach((envelope, index) => {
        const balance = parseFloat(String(envelope.current_amount ?? 0));
        const budget = parseFloat(String(envelope.pay_cycle_amount ?? envelope.target_amount ?? 0));
        const debit = balance < 0 ? Math.abs(balance).toFixed(2) : "";
        const credit = balance >= 0 ? balance.toFixed(2) : "";

        csvData.push([
          index === 0 ? group.category.name : "", // Only show category name on first row
          envelope.name,
          budget.toFixed(2),
          debit,
          credit,
          balance.toFixed(2),
        ]);
      });

      // Add empty row between categories
      if (group !== groupedEnvelopes[groupedEnvelopes.length - 1]) {
        csvData.push(["", "", "", "", "", ""]);
      }
    });

    // Add totals row
    csvData.push([
      "",
      "TOTALS",
      "",
      totals.totalDebit.toFixed(2),
      totals.totalCredit.toFixed(2),
      totals.netTotal.toFixed(2),
    ]);

    // Convert to CSV
    const csvContent = csvData
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    // Download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `envelope-balances-${format(new Date(), "yyyy-MM-dd")}.csv`
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const printView = () => {
    window.print();
  };

  const savePDF = () => {
    window.print();
  };

  // Convert envelopes to SummaryEnvelope format
  const summaryEnvelopes: SummaryEnvelope[] = envelopes.map((env) => ({
    id: env.id,
    name: env.name,
    icon: env.icon,
    current_amount: env.current_amount,
    target_amount: env.target_amount ?? 0,
    pay_cycle_amount: env.pay_cycle_amount,
    category_id: env.category?.id ?? null,
    category_name: env.category?.name ?? null,
    sort_order: 0,
    is_spending: false,
    user_id: "",
    created_at: "",
    updated_at: "",
    envelope_type: "expense",
    priority: "important",
    frequency: "monthly",
    opening_balance: 0,
    is_active: true,
    notes: null,
    due_date: null,
    next_payment_due: null,
    annual_amount: null,
    is_goal: false,
    goal_type: null,
    goal_target_date: null,
    goal_completed_at: null,
    interest_rate: null,
  }));

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto p-6 max-w-6xl print:max-w-none print:p-4 print:pb-0">
        {/* Back button and header */}
        <div className="mb-6 print:hidden">
          <div className="flex items-center gap-4 mb-4">
            <Button
              onClick={handleBackClick}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Summary
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Envelope Balances Report</h1>
              <p className="text-muted-foreground">
                Complete overview of all envelope balances as at{" "}
                {format(new Date(), "dd MMMM yyyy")}
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={exportToExcel} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button onClick={savePDF} variant="default" size="sm">
                <FileText className="h-4 w-4 mr-2" />
                Save as PDF
              </Button>
            </div>
          </div>
        </div>

        {/* Print header */}
        <div className="hidden print:block mb-6">
          <h1 className="text-2xl font-bold text-center">
            Envelope Balances Report
          </h1>
          <p className="text-center text-sm text-muted-foreground">
            As at {format(new Date(), "dd MMMM yyyy")}
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 print:mb-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Total Credit</p>
                <p className="text-2xl font-bold text-green-600">
                  ${totals.totalCredit.toFixed(2)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Total Debit</p>
                <p className="text-2xl font-bold text-red-600">
                  ${totals.totalDebit.toFixed(2)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Net Balance</p>
                <p
                  className={`text-2xl font-bold ${
                    totals.netTotal >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  ${totals.netTotal.toFixed(2)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Envelopes by Category using Card Layout */}
        <div className="space-y-6">
          {groupedEnvelopes.map((group) => (
            <div key={group.category.id} className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-sm font-semibold">
                  {group.category.name}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  ({group.envelopes.length} envelope{group.envelopes.length !== 1 ? 's' : ''})
                </span>
              </div>
              <div className="space-y-2">
                {group.envelopes.map((envelope) => {
                  const summaryEnv = summaryEnvelopes.find(e => e.id === envelope.id);
                  return summaryEnv ? (
                    <EnvelopeSummaryCard
                      key={envelope.id}
                      envelope={summaryEnv}
                      onSelect={() => {}} // No-op for report view
                    />
                  ) : null;
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Print-specific styles */}
        <style jsx global>{`
          @media print {
            body {
              background: white !important;
              color: black !important;
            }
            .print\\:hidden {
              display: none !important;
            }
            .print\\:block {
              display: block !important;
            }
            .print\\:max-w-none {
              max-width: none !important;
            }
            .print\\:p-4 {
              padding: 1rem !important;
            }
            .print\\:pb-0 {
              padding-bottom: 0 !important;
            }
            .print\\:mb-4 {
              margin-bottom: 1rem !important;
            }
            .container {
              max-width: none !important;
            }
            /* Ensure cards print properly */
            button {
              pointer-events: none;
            }
            /* Hide interactive elements in print */
            button:hover {
              border-color: inherit !important;
              box-shadow: none !important;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
