"use client";

/**
 * Import Progress
 *
 * Shows import progress and final results.
 * Displays success/error counts and links to imported transactions.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  AlertCircle,
  ArrowRightLeft,
  Loader2,
  FileText,
  X,
} from "lucide-react";
import type { CSVImportCommitResponse } from "@/lib/csv";

interface ImportProgressProps {
  /** Whether import is in progress */
  isImporting: boolean;
  /** Progress percentage (0-100) */
  progress: number;
  /** Import result (when complete) */
  result: CSVImportCommitResponse | null;
  /** Error message (if failed) */
  error: string | null;
  /** Callback to close dialog */
  onClose: () => void;
  /** Callback to import more */
  onImportMore: () => void;
}

export function ImportProgress({
  isImporting,
  progress,
  result,
  error,
  onClose,
  onImportMore,
}: ImportProgressProps) {
  // Format currency
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-NZ", {
      style: "currency",
      currency: "NZD",
      minimumFractionDigits: 2,
    }).format(amount);

  // Importing state
  if (isImporting) {
    return (
      <div className="space-y-6 py-8">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <div className="text-center">
            <h3 className="text-lg font-medium">Importing Transactions</h3>
            <p className="text-sm text-muted-foreground">
              Please wait while we process your transactions...
            </p>
          </div>
        </div>
        <Progress value={progress} className="h-2" />
        <p className="text-center text-sm text-muted-foreground">
          {progress}% complete
        </p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6 py-8">
        <div className="flex flex-col items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
            <X className="h-8 w-8 text-red-600" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-medium text-red-600">Import Failed</h3>
            <p className="text-sm text-muted-foreground mt-2">{error}</p>
          </div>
        </div>
        <div className="flex justify-center gap-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={onImportMore}>Try Again</Button>
        </div>
      </div>
    );
  }

  // Success state
  if (result?.success && result.data) {
    const { imported, skipped, errors, transfersDetected } = result.data;
    const hasErrors = errors.length > 0;

    return (
      <div className="space-y-6">
        {/* Success Icon */}
        <div className="flex flex-col items-center gap-4 pt-4">
          <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-medium">Import Complete</h3>
            <p className="text-sm text-muted-foreground">
              Your transactions have been imported successfully
            </p>
          </div>
        </div>

        {/* Result Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold text-green-600">{imported}</div>
              <p className="text-sm text-muted-foreground">Imported</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold text-muted-foreground">{skipped}</div>
              <p className="text-sm text-muted-foreground">Skipped</p>
            </CardContent>
          </Card>
          {hasErrors && (
            <Card className="border-red-200">
              <CardContent className="pt-4 text-center">
                <div className="text-2xl font-bold text-red-600">{errors.length}</div>
                <p className="text-sm text-muted-foreground">Errors</p>
              </CardContent>
            </Card>
          )}
          {transfersDetected > 0 && (
            <Card className="border-blue-200">
              <CardContent className="pt-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{transfersDetected}</div>
                <p className="text-sm text-muted-foreground">Transfers</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Transfer Detection Notice */}
        {transfersDetected > 0 && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-blue-700">
                <ArrowRightLeft className="h-4 w-4" />
                Potential Transfers Detected
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-blue-700">
                We found {transfersDetected} transaction{transfersDetected !== 1 ? "s" : ""} that
                may be transfers between your accounts. You can review and link them in the
                Reconciliation page.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Errors Detail */}
        {hasErrors && (
          <Card className="border-red-200">
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-red-700">
                <AlertCircle className="h-4 w-4" />
                Import Errors
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2 max-h-[150px] overflow-y-auto">
                {errors.map((err, i) => (
                  <div key={i} className="text-sm text-red-600">
                    • {err.message}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status Badge */}
        <div className="p-4 bg-muted rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                Imported transactions are set to{" "}
                <Badge variant="secondary">Pending</Badge> status
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Review them in the Reconciliation page to approve or categorize
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-center gap-4 pt-4">
          <Button variant="outline" onClick={onImportMore}>
            Import More
          </Button>
          <Button onClick={onClose}>Done</Button>
        </div>
      </div>
    );
  }

  // Default / waiting state
  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Preparing import...</p>
    </div>
  );
}
