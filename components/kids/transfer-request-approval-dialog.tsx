"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Loader2,
  PiggyBank,
  TrendingUp,
  Heart,
  ArrowRight,
  Wallet,
  CheckCircle2,
  XCircle,
  Clock,
  MessageSquare,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { KidTransferRequest, TransferEnvelope } from "@/lib/types/kids-invoice";

interface TransferRequestApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: KidTransferRequest & { childName?: string };
  childId: string;
}

const ENVELOPE_CONFIG: Record<TransferEnvelope, { label: string; icon: typeof PiggyBank; color: string }> = {
  save: { label: "Save", icon: PiggyBank, color: "text-blue-600 bg-blue-50" },
  invest: { label: "Invest", icon: TrendingUp, color: "text-green-600 bg-green-50" },
  give: { label: "Give", icon: Heart, color: "text-pink-600 bg-pink-50" },
};

export function TransferRequestApprovalDialog({
  open,
  onOpenChange,
  request,
  childId,
}: TransferRequestApprovalDialogProps) {
  const router = useRouter();
  const [parentNotes, setParentNotes] = useState("");
  const [isApproving, setIsApproving] = useState(false);
  const [isDenying, setIsDenying] = useState(false);

  const handleRespond = async (status: "approved" | "denied") => {
    const setLoading = status === "approved" ? setIsApproving : setIsDenying;
    setLoading(true);

    try {
      const response = await fetch(
        `/api/kids/${childId}/transfer-requests/${request.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status,
            parent_notes: parentNotes.trim() || undefined,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to respond to request");
      }

      toast.success(
        status === "approved"
          ? "Transfer approved! Remember to move the money in your banking app."
          : "Transfer request denied."
      );
      onOpenChange(false);
      router.refresh();
      setParentNotes("");
    } catch (error) {
      console.error("Transfer response error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to respond");
    } finally {
      setLoading(false);
    }
  };

  const config = ENVELOPE_CONFIG[request.from_envelope as TransferEnvelope];
  const Icon = config?.icon || PiggyBank;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Transfer Request</DialogTitle>
          <DialogDescription>
            {request.childName || "Your child"} wants to move money to their Spend envelope
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Request Details */}
          <div className="bg-muted/50 rounded-xl p-4 space-y-4">
            {/* Transfer Visualization */}
            <div className="flex items-center justify-center gap-4">
              <div className={`p-3 rounded-xl ${config?.color || "bg-gray-50"}`}>
                <Icon className="h-6 w-6" />
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
              <div className="p-3 rounded-xl text-amber-600 bg-amber-50">
                <Wallet className="h-6 w-6" />
              </div>
            </div>

            {/* Amount */}
            <div className="text-center">
              <p className="text-3xl font-bold">${request.amount.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">
                From {config?.label || request.from_envelope} → Spend
              </p>
            </div>

            {/* Time */}
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Requested {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}</span>
            </div>

            {/* Reason */}
            {request.reason && (
              <div className="bg-white rounded-lg p-3 border">
                <div className="flex items-start gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Their reason:</p>
                    <p className="text-sm">{request.reason}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Parent Notes */}
          <div className="space-y-2">
            <Label htmlFor="parentNotes">
              Your message <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="parentNotes"
              placeholder="Add a note for your child about this decision..."
              value={parentNotes}
              onChange={(e) => setParentNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Important Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            <strong>Note:</strong> If you approve, you&apos;ll need to manually move the money
            between accounts in your banking app.
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={() => handleRespond("denied")}
              disabled={isApproving || isDenying}
              variant="outline"
              className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              {isDenying ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="mr-2 h-4 w-4" />
              )}
              Deny
            </Button>
            <Button
              onClick={() => handleRespond("approved")}
              disabled={isApproving || isDenying}
              className="flex-1 bg-sage hover:bg-sage-dark"
            >
              {isApproving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Approve
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
