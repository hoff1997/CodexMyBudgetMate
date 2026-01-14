"use client";

import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  WifiOff,
  RefreshCw,
  ExternalLink,
  X,
} from "lucide-react";
import { useState } from "react";
import Link from "next/link";

interface BankConnection {
  id: string;
  provider: string;
  status: "connected" | "disconnected" | "action_required" | "issues";
  last_synced_at: string | null;
}

interface BankConnectionAlertProps {
  className?: string;
}

/**
 * Bank Connection Alert Component
 *
 * Displays alerts when bank connections need attention.
 * Required by Akahu accreditation to alert users when account status becomes inactive.
 */
export function BankConnectionAlert({ className }: BankConnectionAlertProps) {
  const [dismissed, setDismissed] = useState<string[]>([]);

  const { data: connections = [] } = useQuery<BankConnection[]>({
    queryKey: ["bank-connections"],
    queryFn: async () => {
      const response = await fetch("/api/bank-connections");
      if (!response.ok) {
        return [];
      }
      return response.json();
    },
    // Check every 5 minutes for connection status changes
    refetchInterval: 5 * 60 * 1000,
  });

  // Filter connections that need attention and haven't been dismissed
  const alertConnections = connections.filter(
    (c) =>
      (c.status === "action_required" || c.status === "issues") &&
      !dismissed.includes(c.id)
  );

  if (alertConnections.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      {alertConnections.map((connection) => (
        <Alert
          key={connection.id}
          variant="destructive"
          className="mb-4 border-amber-200 bg-amber-50 text-amber-900"
        >
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="flex items-center justify-between">
            <span>Bank Connection Needs Attention</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-amber-100"
              onClick={() => setDismissed([...dismissed, connection.id])}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Dismiss</span>
            </Button>
          </AlertTitle>
          <AlertDescription className="mt-2">
            {connection.status === "action_required" ? (
              <>
                <p className="mb-3">
                  Your <strong>{connection.provider}</strong> connection has
                  expired or been revoked. Please reconnect to continue syncing
                  transactions.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    asChild
                    size="sm"
                    className="bg-amber-600 hover:bg-amber-700"
                  >
                    <Link href="/settings">
                      <RefreshCw className="mr-2 h-3 w-3" />
                      Reconnect Bank
                    </Link>
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="mb-3">
                  There&apos;s an issue with your <strong>{connection.provider}</strong>{" "}
                  connection. Transactions may not be syncing correctly.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    asChild
                    size="sm"
                    className="bg-amber-600 hover:bg-amber-700"
                  >
                    <Link href="/settings">
                      <WifiOff className="mr-2 h-3 w-3" />
                      Check Connection
                    </Link>
                  </Button>
                </div>
              </>
            )}
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}

/**
 * Compact version for sidebar or header use
 */
export function BankConnectionStatusBadge() {
  const { data: connections = [] } = useQuery<BankConnection[]>({
    queryKey: ["bank-connections"],
    queryFn: async () => {
      const response = await fetch("/api/bank-connections");
      if (!response.ok) {
        return [];
      }
      return response.json();
    },
    refetchInterval: 5 * 60 * 1000,
  });

  const hasIssues = connections.some(
    (c) => c.status === "action_required" || c.status === "issues"
  );

  if (!hasIssues) {
    return null;
  }

  return (
    <Link
      href="/settings"
      className="flex items-center gap-1.5 rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-200 transition-colors"
    >
      <AlertTriangle className="h-3 w-3" />
      <span>Bank needs attention</span>
    </Link>
  );
}
