"use client";

import { RefreshCw, Check, Cloud, CloudOff } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/cn";

interface AkahuSyncStatusProps {
  lastUpdated?: number;
  cacheAge?: number;
  isCached?: boolean;
  onRefresh?: () => Promise<void>;
  className?: string;
  showRefreshButton?: boolean;
  variant?: "default" | "compact" | "minimal";
}

export function AkahuSyncStatus({
  lastUpdated,
  cacheAge,
  isCached,
  onRefresh,
  className,
  showRefreshButton = true,
  variant = "default",
}: AkahuSyncStatusProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  if (!lastUpdated) return null;

  const handleRefresh = async () => {
    if (!onRefresh) return;

    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const timeAgo = formatDistanceToNow(lastUpdated, { addSuffix: true });
  const isRecent = cacheAge !== undefined && cacheAge < 60; // Less than 1 minute

  if (variant === "minimal") {
    return (
      <div className={cn("flex items-center gap-1 text-xs", className)}>
        {isCached ? (
          <Cloud className="h-3 w-3 text-sage" />
        ) : (
          <Check className="h-3 w-3 text-sage" />
        )}
        <span className="text-text-light">{timeAgo}</span>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div
        className={cn("flex items-center gap-1.5 text-xs text-text-light", className)}
      >
        {isCached ? (
          <Cloud className="h-3 w-3 text-sage" />
        ) : (
          <Check className="h-3 w-3 text-sage" />
        )}
        <span>{isRecent ? "Just now" : timeAgo}</span>
        {showRefreshButton && onRefresh && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-5 w-5 p-0 text-text-light hover:text-sage"
          >
            <RefreshCw
              className={cn("h-3 w-3", isRefreshing && "animate-spin")}
            />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 text-xs text-text-light",
        className,
      )}
    >
      <div className="flex items-center gap-1">
        {isCached ? (
          <Cloud className="h-3.5 w-3.5 text-sage" />
        ) : (
          <Check className="h-3.5 w-3.5 text-sage" />
        )}
        <span>{isCached ? "Cached" : "Updated"}</span>
        <span>{timeAgo}</span>
      </div>

      {showRefreshButton && onRefresh && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="h-6 px-2 text-xs text-sage hover:text-sage-dark"
        >
          <RefreshCw
            className={cn("h-3 w-3 mr-1", isRefreshing && "animate-spin")}
          />
          <span>Refresh</span>
        </Button>
      )}
    </div>
  );
}

/**
 * Connection status badge for when Akahu is not connected
 */
export function AkahuConnectionStatus({
  isConnected,
  className,
}: {
  isConnected: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-xs",
        isConnected ? "text-sage" : "text-text-light",
        className,
      )}
    >
      {isConnected ? (
        <>
          <Cloud className="h-3.5 w-3.5" />
          <span>Connected</span>
        </>
      ) : (
        <>
          <CloudOff className="h-3.5 w-3.5" />
          <span>Not connected</span>
        </>
      )}
    </div>
  );
}
