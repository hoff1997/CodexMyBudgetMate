"use client";

/**
 * Transfer Badge Component
 *
 * A small badge that indicates a transaction is a transfer.
 * Can show linked account name, pending status, or just the transfer icon.
 */

import { ArrowRightLeft, Clock, Link as LinkIcon, Unlink } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

interface TransferBadgeProps {
  /** The type of transfer status */
  status: "linked" | "pending" | "detected";
  /** Name of the linked account (for linked transfers) */
  linkedAccountName?: string;
  /** Callback when clicking to unlink */
  onUnlink?: () => void;
  /** Callback when clicking to link (for detected) */
  onLink?: () => void;
  /** Whether to show compact version */
  compact?: boolean;
}

export function TransferBadge({
  status,
  linkedAccountName,
  onUnlink,
  onLink,
  compact = false,
}: TransferBadgeProps) {
  if (status === "linked") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 ${
                onUnlink ? "cursor-pointer hover:bg-blue-200" : ""
              }`}
              onClick={onUnlink}
            >
              <LinkIcon className="h-3 w-3" />
              {!compact && (linkedAccountName ? `→ ${linkedAccountName}` : "Transfer")}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              Transfer{linkedAccountName ? ` to/from ${linkedAccountName}` : ""}
              {onUnlink && (
                <span className="block text-xs text-muted-foreground mt-1">
                  Click to unlink
                </span>
              )}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (status === "pending") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
              <Clock className="h-3 w-3" />
              {!compact && "Pending"}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              Pending transfer
              <span className="block text-xs text-muted-foreground mt-1">
                Waiting for matching transaction
              </span>
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Detected potential transfer
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 ${
              onLink ? "cursor-pointer hover:bg-purple-200" : ""
            }`}
            onClick={onLink}
          >
            <ArrowRightLeft className="h-3 w-3" />
            {!compact && "Link?"}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            Possible transfer detected
            {onLink && (
              <span className="block text-xs text-muted-foreground mt-1">
                Click to review and link
              </span>
            )}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Transfer Unlink Button
 *
 * A button to unlink a transfer, used in transaction detail views.
 */
interface TransferUnlinkButtonProps {
  linkedAccountName?: string;
  onUnlink: () => void;
  isLoading?: boolean;
}

export function TransferUnlinkButton({
  linkedAccountName,
  onUnlink,
  isLoading,
}: TransferUnlinkButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onUnlink}
      disabled={isLoading}
      className="text-red-600 hover:text-red-700 hover:bg-red-50"
    >
      <Unlink className="h-4 w-4 mr-2" />
      Unlink Transfer
      {linkedAccountName && (
        <span className="text-muted-foreground ml-1">
          (from {linkedAccountName})
        </span>
      )}
    </Button>
  );
}
