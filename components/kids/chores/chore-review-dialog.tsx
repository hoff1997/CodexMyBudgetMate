"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Check, X, Image as ImageIcon, DollarSign, Flame } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface ChoreReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  childId: string;
  assignmentId: string;
  onReviewed: () => void;
}

interface ChoreDetails {
  assignment: {
    id: string;
    status: string;
    proof_photo_url: string | null;
    completion_notes: string | null;
    marked_done_at: string | null;
  };
  chore: {
    name: string;
    description: string | null;
    icon: string;
    currency_type: string;
    currency_amount: number;
    requires_photo: boolean;
  };
  child: {
    id: string;
    first_name: string;
  };
}

export function ChoreReviewDialog({
  open,
  onOpenChange,
  childId,
  assignmentId,
  onReviewed,
}: ChoreReviewDialogProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [details, setDetails] = useState<ChoreDetails | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectionForm, setShowRejectionForm] = useState(false);

  useEffect(() => {
    if (open && assignmentId) {
      fetchDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, assignmentId, childId]);

  const fetchDetails = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/kids/${childId}/chores/${assignmentId}/review`
      );
      if (!res.ok) throw new Error("Failed to fetch details");

      const data = await res.json();
      setDetails(data);
    } catch (error) {
      console.error("Error fetching chore details:", error);
      toast.error("Failed to load chore details");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReview = async (approved: boolean) => {
    if (!approved && !rejectionReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(
        `/api/kids/${childId}/chores/${assignmentId}/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            approved,
            rejection_reason: approved ? null : rejectionReason.trim(),
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to review chore");
      }

      const data = await res.json();

      if (approved) {
        toast.success(
          `Approved! ${details?.child.first_name} earned ${data.reward_message}`
        );
      } else {
        toast.info("Chore rejected - child will need to redo it");
      }

      onReviewed();
      onOpenChange(false);
      setRejectionReason("");
      setShowRejectionForm(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to review chore");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if this is an Extra chore (has money reward) or Expected chore
  const isExtraChore = (type: string, amount: number) =>
    type === "money" && amount > 0;

  const getChoreTypeIndicator = (type: string, amount: number) => {
    if (isExtraChore(type, amount)) {
      return (
        <div className="flex items-center gap-1 text-sage">
          <DollarSign className="h-4 w-4" />
          <span className="font-medium">${amount.toFixed(2)}</span>
          <span className="text-xs bg-gold-light text-gold-dark px-1.5 py-0.5 rounded ml-1">
            Extra
          </span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1 text-gold">
        <Flame className="h-4 w-4" />
        <span className="text-xs bg-sage-very-light text-sage-dark px-1.5 py-0.5 rounded">
          Expected
        </span>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review Chore Completion</DialogTitle>
          <DialogDescription>
            {details?.child.first_name} completed a chore
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-sage" />
          </div>
        ) : !details ? (
          <div className="text-center py-8 text-text-medium">
            Failed to load chore details
          </div>
        ) : (
          <div className="space-y-4 mt-4">
            {/* Chore info */}
            <div className="flex items-center gap-3 p-3 bg-silver-very-light rounded-lg">
              <span className="text-3xl">{details.chore.icon}</span>
              <div>
                <p className="font-medium text-text-dark">{details.chore.name}</p>
                {details.chore.description && (
                  <p className="text-sm text-text-medium">
                    {details.chore.description}
                  </p>
                )}
                <div className="mt-1 text-sm">
                  {getChoreTypeIndicator(details.chore.currency_type, details.chore.currency_amount)}
                </div>
              </div>
            </div>

            {/* Photo proof */}
            {details.assignment.proof_photo_url && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Photo Proof
                </Label>
                <div className="relative rounded-lg overflow-hidden border border-silver-light h-48">
                  <Image
                    src={details.assignment.proof_photo_url}
                    alt="Chore proof"
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
            )}

            {/* Child's notes */}
            {details.assignment.completion_notes && (
              <div className="space-y-2">
                <Label>Notes from {details.child.first_name}</Label>
                <div className="p-3 bg-blue-light/30 rounded-lg text-sm text-text-dark">
                  {details.assignment.completion_notes}
                </div>
              </div>
            )}

            {/* Completion time */}
            {details.assignment.marked_done_at && (
              <p className="text-sm text-text-light">
                Completed{" "}
                {formatDistanceToNow(new Date(details.assignment.marked_done_at), {
                  addSuffix: true,
                })}
              </p>
            )}

            {/* Rejection form */}
            {showRejectionForm ? (
              <div className="space-y-3">
                <Label htmlFor="rejection-reason">Reason for rejection</Label>
                <Textarea
                  id="rejection-reason"
                  placeholder="Explain what needs to be done differently..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowRejectionForm(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => handleReview(false)}
                    disabled={isSubmitting || !rejectionReason.trim()}
                    variant="destructive"
                    className="flex-1"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <X className="h-4 w-4 mr-2" />
                    )}
                    Reject
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowRejectionForm(true)}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-2" />
                  Needs Redo
                </Button>
                <Button
                  onClick={() => handleReview(true)}
                  disabled={isSubmitting}
                  className="flex-1 bg-sage hover:bg-sage-dark"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Approve
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
