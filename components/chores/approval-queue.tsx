"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/cn";
import Image from "next/image";
import {
  Check,
  X,
  Star,
  Clock,
  DollarSign,
  ChevronRight,
  Loader2,
} from "lucide-react";

interface ChoreAssignment {
  id: string;
  child_profile_id: string;
  status: string;
  currency_type: string;
  currency_amount: number;
  marked_done_at: string | null;
  chore_template: {
    id: string;
    name: string;
    description: string | null;
    icon: string | null;
    category: string;
  } | null;
  child: {
    id: string;
    name: string;
    avatar_url: string | null;
  } | null;
}

interface ApprovalQueueProps {
  assignments: ChoreAssignment[];
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string, reason?: string) => Promise<void>;
}

const CURRENCY_ICONS = {
  stars: { icon: Star, color: "text-gold", label: "stars" },
  screen_time: { icon: Clock, color: "text-blue", label: "min" },
  money: { icon: DollarSign, color: "text-sage", label: "" },
};

export function ApprovalQueue({
  assignments,
  onApprove,
  onReject,
}: ApprovalQueueProps) {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<ChoreAssignment | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const handleApprove = async (assignment: ChoreAssignment) => {
    setProcessingId(assignment.id);
    try {
      await onApprove(assignment.id);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectClick = (assignment: ChoreAssignment) => {
    setSelectedAssignment(assignment);
    setRejectReason("");
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!selectedAssignment) return;

    setProcessingId(selectedAssignment.id);
    try {
      await onReject(selectedAssignment.id, rejectReason || undefined);
      setRejectDialogOpen(false);
      setSelectedAssignment(null);
    } finally {
      setProcessingId(null);
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (assignments.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="text-6xl mb-4">✨</div>
          <h2 className="text-xl font-bold text-text-dark mb-2">
            All caught up!
          </h2>
          <p className="text-text-medium">
            No chores waiting for approval. Check back later.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group by child
  const byChild: Record<string, ChoreAssignment[]> = {};
  for (const assignment of assignments) {
    const childId = assignment.child_profile_id;
    if (!byChild[childId]) {
      byChild[childId] = [];
    }
    byChild[childId].push(assignment);
  }

  return (
    <>
      <div className="space-y-6">
        {Object.entries(byChild).map(([childId, childAssignments]) => {
          const child = childAssignments[0].child;
          const totalReward = childAssignments.reduce(
            (sum, a) =>
              a.currency_type === "stars" ? sum + a.currency_amount : sum,
            0
          );

          return (
            <Card key={childId}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-sage-light flex items-center justify-center text-xl">
                      {child?.avatar_url ? (
                        <Image
                          src={child.avatar_url}
                          alt={child.name}
                          width={40}
                          height={40}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        "👤"
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{child?.name}</CardTitle>
                      <p className="text-sm text-text-medium">
                        {childAssignments.length} chore{childAssignments.length > 1 ? "s" : ""} to review
                      </p>
                    </div>
                  </div>
                  {totalReward > 0 && (
                    <Badge variant="secondary" className="bg-gold-light text-gold-dark">
                      <Star className="h-3 w-3 mr-1" />
                      {totalReward} stars pending
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {childAssignments.map((assignment) => {
                    const currency = CURRENCY_ICONS[assignment.currency_type as keyof typeof CURRENCY_ICONS];
                    const CurrencyIcon = currency?.icon || Star;
                    const isProcessing = processingId === assignment.id;

                    return (
                      <div
                        key={assignment.id}
                        className="flex items-center gap-4 p-3 bg-silver-very-light rounded-lg"
                      >
                        {/* Chore Info */}
                        <div className="text-2xl">
                          {assignment.chore_template?.icon || "📋"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-text-dark">
                            {assignment.chore_template?.name || "Unknown Chore"}
                          </p>
                          <div className="flex items-center gap-3 text-sm text-text-medium">
                            {assignment.marked_done_at && (
                              <span>
                                Marked done {formatTimeAgo(assignment.marked_done_at)}
                              </span>
                            )}
                            <div className={cn("flex items-center gap-1", currency?.color)}>
                              <CurrencyIcon className="h-3 w-3" />
                              <span>
                                {assignment.currency_type === "money" && "$"}
                                {assignment.currency_amount}
                                {currency?.label && ` ${currency.label}`}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleRejectClick(assignment)}
                            disabled={isProcessing}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            className="bg-sage hover:bg-sage-dark"
                            onClick={() => handleApprove(assignment)}
                            disabled={isProcessing}
                          >
                            {isProcessing ? (
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
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Send Back for Redo</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-text-medium mb-4">
              Let {selectedAssignment?.child?.name} know why this needs another go:
            </p>
            <Input
              placeholder="e.g., Bed needs to be made neater"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={processingId === selectedAssignment?.id}
            >
              {processingId === selectedAssignment?.id ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <X className="h-4 w-4 mr-2" />
              )}
              Send Back
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
