"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Clock, Check, X } from "lucide-react";

interface ScreenTimeApprovalDialogProps {
  request: {
    id: string;
    minutes_requested: number;
    created_at: string;
    child_profile: {
      name: string;
      avatar?: string;
    } | null;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApproved?: () => void;
}

export function ScreenTimeApprovalDialog({
  request,
  open,
  onOpenChange,
  onApproved,
}: ScreenTimeApprovalDialogProps) {
  const [minutesGranted, setMinutesGranted] = useState(
    request.minutes_requested.toString()
  );
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<"approve" | "deny" | null>(null);

  const handleApprove = async () => {
    setLoading(true);
    setAction("approve");
    try {
      const res = await fetch(
        `/api/kids/screen-time/requests/${request.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "approved",
            minutes_granted: parseInt(minutesGranted),
          }),
        }
      );

      if (res.ok) {
        onApproved?.();
        onOpenChange(false);
      }
    } finally {
      setLoading(false);
      setAction(null);
    }
  };

  const handleDeny = async () => {
    setLoading(true);
    setAction("deny");
    try {
      const res = await fetch(
        `/api/kids/screen-time/requests/${request.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "denied" }),
        }
      );

      if (res.ok) {
        onApproved?.();
        onOpenChange(false);
      }
    } finally {
      setLoading(false);
      setAction(null);
    }
  };

  const requestTime = new Date(request.created_at);
  const timeAgo = getTimeAgo(requestTime);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue" />
            Screen Time Request
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-sage-very-light p-4 rounded-lg text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              {request.child_profile?.avatar && (
                <span className="text-2xl">{request.child_profile.avatar}</span>
              )}
              <span className="font-semibold text-text-dark">
                {request.child_profile?.name || "Unknown"}
              </span>
            </div>
            <div className="text-sm text-text-medium mb-1">is requesting</div>
            <div className="text-3xl font-bold text-sage">
              {request.minutes_requested} minutes
            </div>
            <div className="text-xs text-text-light mt-2">{timeAgo}</div>
          </div>

          <div>
            <Label htmlFor="granted">Grant (in minutes)</Label>
            <Input
              id="granted"
              type="number"
              min="1"
              max={request.minutes_requested}
              value={minutesGranted}
              onChange={(e) => setMinutesGranted(e.target.value)}
              className="text-center text-lg"
            />
            <p className="text-xs text-text-medium mt-1">
              You can grant less time than requested
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleDeny}
              disabled={loading}
              className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
            >
              {loading && action === "deny" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <X className="h-4 w-4 mr-1" />
                  Deny
                </>
              )}
            </Button>
            <Button
              onClick={handleApprove}
              disabled={loading}
              className="flex-1 bg-sage hover:bg-sage-dark"
            >
              {loading && action === "approve" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Approve
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24)
    return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
}
