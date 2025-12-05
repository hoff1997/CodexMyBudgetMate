"use client";

import { AlertCircle, ChevronRight } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useState } from "react";

interface UnbudgetedEnvelopesWarningProps {
  unbudgetedCount: number;
  envelopeNames?: string[];
  showResolveButton?: boolean;
  onResolve?: () => void;
}

/**
 * Persistent warning banner for unbudgeted envelopes
 *
 * This banner appears across the app when users have envelopes without budget allocation.
 * It cannot be dismissed - only resolved by allocating budget or marking envelopes as
 * spending/goal/tracking-only.
 */
export function UnbudgetedEnvelopesWarning({
  unbudgetedCount,
  envelopeNames = [],
  showResolveButton = true,
  onResolve,
}: UnbudgetedEnvelopesWarningProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (unbudgetedCount === 0) return null;

  const displayNames = envelopeNames.slice(0, 3);
  const remainingCount = Math.max(0, unbudgetedCount - 3);

  return (
    <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-900/20 mb-4">
      <AlertCircle className="h-5 w-5 text-amber-600" />
      <div className="flex-1">
        <AlertTitle className="text-amber-800 dark:text-amber-200 mb-1">
          {unbudgetedCount} {unbudgetedCount === 1 ? 'Envelope Needs' : 'Envelopes Need'} Budget Allocation
        </AlertTitle>
        <AlertDescription className="text-amber-700 dark:text-amber-300">
          <p className="mb-2">
            You have {unbudgetedCount === 1 ? 'an envelope' : 'envelopes'} without budget allocation.
            Your budget system requires all regular envelopes to have allocated amounts.
          </p>

          {envelopeNames.length > 0 && (
            <div className="mt-2">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-sm font-medium text-amber-800 dark:text-amber-200 hover:underline inline-flex items-center gap-1"
              >
                {isExpanded ? 'Hide' : 'Show'} affected envelopes
                <ChevronRight className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
              </button>

              {isExpanded && (
                <ul className="mt-2 space-y-1 text-sm">
                  {displayNames.map((name, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <span className="h-1 w-1 rounded-full bg-amber-600"></span>
                      {name}
                    </li>
                  ))}
                  {remainingCount > 0 && (
                    <li className="text-amber-600 dark:text-amber-400 italic">
                      ...and {remainingCount} more
                    </li>
                  )}
                </ul>
              )}
            </div>
          )}

          <div className="mt-3 text-sm">
            <strong>To resolve:</strong>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Allocate budget to each envelope, or</li>
              <li>Mark as Spending/Goal envelope, or</li>
              <li>Mark as Tracking Only (e.g., reimbursements)</li>
            </ul>
          </div>
        </AlertDescription>
      </div>

      {showResolveButton && (
        <div className="ml-auto flex-shrink-0">
          {onResolve ? (
            <Button
              onClick={onResolve}
              variant="outline"
              size="sm"
              className="border-amber-600 text-amber-800 hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-900/40"
            >
              Resolve Now
            </Button>
          ) : (
            <Link href="/budget-manager">
              <Button
                variant="outline"
                size="sm"
                className="border-amber-600 text-amber-800 hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-900/40"
              >
                Go to Budget Manager
              </Button>
            </Link>
          )}
        </div>
      )}
    </Alert>
  );
}

/**
 * Compact version for navigation badge
 */
export function UnbudgetedEnvelopesBadge({ count }: { count: number }) {
  if (count === 0) return null;

  return (
    <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 text-xs font-medium text-white bg-amber-500 rounded-full">
      {count}
    </span>
  );
}
