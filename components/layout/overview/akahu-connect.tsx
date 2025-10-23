"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Props {
  hasConnection: boolean;
  connectUrl?: string;
  statusLabel?: string;
  lastSyncedAt?: string | null;
  manageHref?: string;
}

export function AkahuConnect({ hasConnection, connectUrl, statusLabel, lastSyncedAt, manageHref = "/settings#bank-connections" }: Props) {
  const [loading, setLoading] = useState(false);
  const lastSyncText = useMemo(() => {
    if (!lastSyncedAt) return null;
    try {
      return formatDistanceToNow(new Date(lastSyncedAt), { addSuffix: true });
    } catch (error) {
      console.error("Failed to format last sync", error);
      return null;
    }
  }, [lastSyncedAt]);

  const handleConnect = () => {
    if (!connectUrl) {
      toast.error("Akahu link unavailable. Check environment variables.");
      return;
    }
    setLoading(true);
    window.location.href = connectUrl;
  };

  if (hasConnection) {
    return (
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm text-primary">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-secondary">Bank connection active</p>
              <p className="text-xs text-muted-foreground">
                {statusLabel ?? "Connected"}
                {lastSyncText ? ` · Last sync ${lastSyncText}` : ""}
              </p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href={manageHref}>Manage</Link>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Background jobs reconcile transactions automatically. You can trigger a manual refresh from Settings if new activity is delayed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Button onClick={handleConnect} disabled={loading}>
      {loading ? "Redirecting to Akahu…" : "Connect your bank with Akahu"}
    </Button>
  );
}
