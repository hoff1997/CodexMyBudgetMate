"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";
import { X, Check, RotateCcw, DollarSign, Star, Clock, Image as ImageIcon } from "lucide-react";
import Image from "next/image";

interface ChoreAssignment {
  id: string;
  child_profile_id: string;
  status: string;
  currency_type: string;
  currency_amount: number;
  marked_done_at?: string | null;
  proof_photo_url?: string | null;
  completion_notes?: string | null;
  chore_template: {
    id: string;
    name: string;
    icon: string | null;
    is_expected?: boolean;
  } | null;
  child: {
    id: string;
    name: string;
    avatar_url?: string | null;
  } | null;
}

interface InlineApprovalCardProps {
  assignment: ChoreAssignment;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string, reason?: string) => Promise<void>;
  onClose: () => void;
  className?: string;
}

export function InlineApprovalCard({
  assignment,
  onApprove,
  onReject,
  onClose,
  className,
}: InlineApprovalCardProps) {
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const formatTimeAgo = (dateString: string | null | undefined) => {
    if (!dateString) return "Just now";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffMins > 0) return `${diffMins} min${diffMins > 1 ? "s" : ""} ago`;
    return "Just now";
  };

  const handleApprove = async () => {
    setIsLoading(true);
    try {
      await onApprove(assignment.id);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    setIsLoading(true);
    try {
      await onReject(assignment.id, rejectionReason || undefined);
    } finally {
      setIsLoading(false);
    }
  };

  const isExpected = assignment.chore_template?.is_expected;
  const CurrencyIcon = assignment.currency_type === "money"
    ? DollarSign
    : assignment.currency_type === "stars"
    ? Star
    : Clock;

  return (
    <div
      className={cn(
        "absolute z-50 bg-white rounded-lg shadow-lg border-2 border-gold p-4 w-72",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{assignment.chore_template?.icon || "📋"}</span>
          <div>
            <h4 className="font-semibold text-text-dark">
              {assignment.chore_template?.name}
            </h4>
            <p className="text-sm text-text-medium">{assignment.child?.name}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-silver-very-light rounded-full transition-colors"
        >
          <X className="h-4 w-4 text-text-medium" />
        </button>
      </div>

      {/* Time & Value */}
      <div className="flex items-center justify-between text-sm text-text-medium mb-3">
        <span>Marked done {formatTimeAgo(assignment.marked_done_at)}</span>
        {!isExpected && assignment.currency_amount > 0 && (
          <span className="flex items-center gap-1 font-medium text-sage">
            <CurrencyIcon className="h-3.5 w-3.5" />
            {assignment.currency_type === "money" && "$"}
            {assignment.currency_amount}
          </span>
        )}
      </div>

      {/* Photo Proof */}
      {assignment.proof_photo_url && (
        <div className="mb-3">
          <div className="relative w-full h-32 rounded-lg overflow-hidden bg-silver-very-light">
            <Image
              src={assignment.proof_photo_url}
              alt="Proof photo"
              fill
              className="object-cover"
            />
          </div>
        </div>
      )}

      {/* Completion Notes */}
      {assignment.completion_notes && (
        <div className="mb-3 p-2 bg-silver-very-light rounded text-sm text-text-medium">
          "{assignment.completion_notes}"
        </div>
      )}

      {/* Rejection Reason Input */}
      {isRejecting && (
        <div className="mb-3">
          <Textarea
            placeholder="Why does this need to be redone? (optional)"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            className="text-sm"
            rows={2}
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {isRejecting ? (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRejecting(false)}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleReject}
              disabled={isLoading}
              className="flex-1"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Send Back
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRejecting(true)}
              disabled={isLoading}
              className="flex-1"
            >
              Send Back
            </Button>
            <Button
              size="sm"
              onClick={handleApprove}
              disabled={isLoading}
              className="flex-1 bg-sage hover:bg-sage-dark"
            >
              <Check className="h-4 w-4 mr-1" />
              Approve
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
