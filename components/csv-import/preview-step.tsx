"use client";

/**
 * Preview Step
 *
 * Shows parsed transactions with validation status and duplicates.
 * Allows user to review before committing the import.
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Copy,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { ParsedTransaction, CSVImportPreviewResponse } from "@/lib/csv";

interface PreviewStepProps {
  /** Preview response from API */
  previewData: NonNullable<CSVImportPreviewResponse["data"]>;
  /** Callback when user proceeds to import */
  onImport: (skipDuplicates: boolean, duplicatesToImport: string[]) => void;
  /** Callback to go back */
  onBack: () => void;
  /** Whether currently loading */
  isLoading: boolean;
}

export function PreviewStep({
  previewData,
  onImport,
  onBack,
  isLoading,
}: PreviewStepProps) {
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [duplicatesToImport, setDuplicatesToImport] = useState<string[]>([]);
  const [showErrors, setShowErrors] = useState(false);
  const [showDuplicates, setShowDuplicates] = useState(false);

  const { transactions, validCount, duplicateCount, errorCount, totalAmount, dateRange } =
    previewData;

  // Format currency
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-NZ", {
      style: "currency",
      currency: "NZD",
      minimumFractionDigits: 2,
    }).format(amount);

  // Toggle a duplicate for import
  const toggleDuplicateImport = (tempId: string) => {
    setDuplicatesToImport((prev) =>
      prev.includes(tempId) ? prev.filter((id) => id !== tempId) : [...prev, tempId]
    );
  };

  // Filter transactions
  const errorTransactions = transactions.filter((t) => !t.isValid);
  const duplicateTransactions = transactions.filter((t) => t.isValid && t.isDuplicate);
  const validTransactions = transactions.filter((t) => t.isValid && !t.isDuplicate);

  // Calculate what will be imported
  const toImportCount = skipDuplicates
    ? validCount - duplicateCount + duplicatesToImport.length
    : validCount;

  // Calculate import totals
  const importTotal = transactions
    .filter((t) => {
      if (!t.isValid) return false;
      if (t.isDuplicate && skipDuplicates && !duplicatesToImport.includes(t.tempId)) {
        return false;
      }
      return true;
    })
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{validCount}</div>
            <p className="text-sm text-muted-foreground">Valid</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-amber-600">{duplicateCount}</div>
            <p className="text-sm text-muted-foreground">Duplicates</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-600">{errorCount}</div>
            <p className="text-sm text-muted-foreground">Errors</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{formatCurrency(importTotal)}</div>
            <p className="text-sm text-muted-foreground">Net Amount</p>
          </CardContent>
        </Card>
      </div>

      {/* Date Range */}
      {dateRange.earliest && dateRange.latest && (
        <p className="text-sm text-muted-foreground">
          Transactions from{" "}
          <span className="font-medium">{dateRange.earliest}</span> to{" "}
          <span className="font-medium">{dateRange.latest}</span>
        </p>
      )}

      {/* Error Section */}
      {errorCount > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader
            className="py-3 cursor-pointer"
            onClick={() => setShowErrors(!showErrors)}
          >
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span className="flex items-center gap-2 text-red-700">
                <AlertCircle className="h-4 w-4" />
                {errorCount} Transaction{errorCount !== 1 ? "s" : ""} with Errors
              </span>
              {showErrors ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </CardTitle>
          </CardHeader>
          {showErrors && (
            <CardContent className="pt-0">
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {errorTransactions.map((t) => (
                    <div
                      key={t.tempId}
                      className="p-2 bg-white rounded border border-red-200"
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-medium">Row {t.rowIndex + 1}</span>
                        <Badge variant="destructive" className="text-xs">
                          Invalid
                        </Badge>
                      </div>
                      <div className="text-sm text-red-600 mt-1">
                        {t.errors.map((e, i) => (
                          <div key={i}>• {e.message}</div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          )}
        </Card>
      )}

      {/* Duplicate Section */}
      {duplicateCount > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader
            className="py-3 cursor-pointer"
            onClick={() => setShowDuplicates(!showDuplicates)}
          >
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span className="flex items-center gap-2 text-amber-700">
                <Copy className="h-4 w-4" />
                {duplicateCount} Potential Duplicate{duplicateCount !== 1 ? "s" : ""}
              </span>
              {showDuplicates ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </CardTitle>
          </CardHeader>
          {showDuplicates && (
            <CardContent className="pt-0">
              <div className="flex items-center gap-2 mb-3 pb-3 border-b border-amber-200">
                <Checkbox
                  id="skip-duplicates"
                  checked={skipDuplicates}
                  onCheckedChange={(checked) => setSkipDuplicates(checked as boolean)}
                />
                <label htmlFor="skip-duplicates" className="text-sm">
                  Skip all duplicates (recommended)
                </label>
              </div>
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {duplicateTransactions.map((t) => (
                    <div
                      key={t.tempId}
                      className="p-2 bg-white rounded border border-amber-200"
                    >
                      <div className="flex items-start gap-2">
                        {skipDuplicates && (
                          <Checkbox
                            checked={duplicatesToImport.includes(t.tempId)}
                            onCheckedChange={() => toggleDuplicateImport(t.tempId)}
                            className="mt-1"
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <span className="font-medium">{t.merchantName}</span>
                            <span
                              className={`font-medium ${
                                t.amount >= 0 ? "text-green-600" : "text-red-600"
                              }`}
                            >
                              {formatCurrency(t.amount)}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {t.occurredAt}
                          </div>
                          {t.duplicateMatch && (
                            <div className="text-xs text-amber-700 mt-1 flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              {t.duplicateMatch.confidence}% match with existing transaction
                              <span className="text-muted-foreground">
                                ({t.duplicateMatch.matchReasons.join(", ")})
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          )}
        </Card>
      )}

      {/* Preview Table */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            {validTransactions.length} Transaction{validTransactions.length !== 1 ? "s" : ""} to
            Import
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[300px]">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50 sticky top-0">
                  <th className="px-4 py-2 text-left text-xs font-medium">Date</th>
                  <th className="px-4 py-2 text-left text-xs font-medium">Description</th>
                  <th className="px-4 py-2 text-right text-xs font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {validTransactions.slice(0, 100).map((t) => (
                  <tr key={t.tempId} className="border-b last:border-0">
                    <td className="px-4 py-2 text-sm">{t.occurredAt}</td>
                    <td className="px-4 py-2 text-sm">
                      <div className="max-w-[300px] truncate">{t.merchantName}</div>
                      {t.bankReference && (
                        <div className="text-xs text-muted-foreground">
                          Ref: {t.bankReference}
                        </div>
                      )}
                    </td>
                    <td
                      className={`px-4 py-2 text-sm text-right font-medium ${
                        t.amount >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {formatCurrency(t.amount)}
                    </td>
                  </tr>
                ))}
                {validTransactions.length > 100 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-sm text-muted-foreground text-center">
                      ... and {validTransactions.length - 100} more transactions
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Import Summary */}
      <div className="p-4 bg-muted rounded-lg">
        <div className="flex justify-between items-center">
          <div>
            <p className="font-medium">Ready to import {toImportCount} transactions</p>
            <p className="text-sm text-muted-foreground">
              Net amount: {formatCurrency(importTotal)}
            </p>
          </div>
          <Badge variant="secondary">
            Status: Pending
          </Badge>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack} disabled={isLoading}>
          Back to Mapping
        </Button>
        <Button
          onClick={() => onImport(skipDuplicates, duplicatesToImport)}
          disabled={isLoading || toImportCount === 0}
        >
          {isLoading ? "Importing..." : `Import ${toImportCount} Transactions`}
        </Button>
      </div>
    </div>
  );
}
