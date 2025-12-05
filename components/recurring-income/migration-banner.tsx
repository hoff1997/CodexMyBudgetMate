"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowRight, Info } from "lucide-react";
import Link from "next/link";

/**
 * Migration Banner for Recurring Income Page
 *
 * Informs users that the Recurring Income page is now read-only
 * and directs them to use Budget Manager for income management.
 */
export function RecurringIncomeMigrationBanner() {
  return (
    <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-900/20 mb-6">
      <Info className="h-5 w-5 text-blue-600" />
      <div className="flex-1">
        <AlertTitle className="text-blue-800 dark:text-blue-200 mb-2">
          📢 Income Management Has Moved to Budget Manager
        </AlertTitle>
        <AlertDescription className="text-blue-700 dark:text-blue-300 space-y-2">
          <p>
            <strong>This page is now read-only.</strong> We've upgraded our income system to support
            multiple income sources with individual pay frequencies.
          </p>

          <div className="mt-3">
            <strong>What's new:</strong>
            <ul className="list-disc list-inside mt-1 space-y-1 text-sm">
              <li>Manage multiple income streams with different pay cycles (weekly, fortnightly, monthly)</li>
              <li>Allocate different amounts from each income source to each envelope</li>
              <li>Real-time zero-based budget validation</li>
              <li>Enhanced income tracking and reporting</li>
            </ul>
          </div>

          <p className="text-sm mt-3">
            <strong>Your data is safe:</strong> All your income and allocation information has been preserved.
            Use Budget Manager to view and edit your income sources and allocations.
          </p>
        </AlertDescription>
      </div>

      <div className="ml-auto flex-shrink-0">
        <Link href="/budget-manager">
          <Button
            variant="default"
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Open Budget Manager
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>
    </Alert>
  );
}

/**
 * Read-Only Notice for Individual Income Streams
 *
 * Displayed next to each income stream with a link to edit in Budget Manager
 */
interface ReadOnlyNoticeProps {
  incomeSourceName: string;
}

export function ReadOnlyIncomeNotice({ incomeSourceName }: ReadOnlyNoticeProps) {
  return (
    <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
      <AlertCircle className="h-4 w-4" />
      <span>Read-only</span>
      <Link href="/budget-manager" className="text-blue-600 hover:underline inline-flex items-center gap-1">
        Edit in Budget Manager
        <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
