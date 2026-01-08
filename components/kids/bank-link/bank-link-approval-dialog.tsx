"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/lib/hooks/use-toast";
import { ShieldCheck, ShieldX, AlertTriangle } from "lucide-react";

interface BankLinkApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  childId: string;
  childName: string;
  requestId: string;
  onSuccess: () => void;
}

export function BankLinkApprovalDialog({
  open,
  onOpenChange,
  childId,
  childName,
  requestId,
  onSuccess,
}: BankLinkApprovalDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notes, setNotes] = useState("");

  const handleResponse = async (approved: boolean) => {
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/kids/${childId}/bank-link/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          approved,
          notes: notes.trim() || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to respond");
      }

      const data = await response.json();

      toast({
        title: approved ? "Request Approved" : "Request Denied",
        description: data.message,
      });

      setNotes("");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to respond",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Bank Account Link Request</DialogTitle>
          <DialogDescription>
            {childName} has requested to link their bank account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-800">Important Information</p>
                <ul className="mt-2 space-y-1 text-amber-700">
                  <li>• This will allow {childName} to connect their real bank account</li>
                  <li>• You will be able to see their account balances and transactions</li>
                  <li>• They will not be able to make transfers through the app</li>
                  <li>• You can revoke access at any time</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this decision..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button
            type="button"
            variant="destructive"
            onClick={() => handleResponse(false)}
            disabled={isSubmitting}
            className="flex-1 sm:flex-none"
          >
            <ShieldX className="h-4 w-4 mr-1" />
            Deny
          </Button>
          <Button
            type="button"
            onClick={() => handleResponse(true)}
            disabled={isSubmitting}
            className="flex-1 sm:flex-none"
          >
            <ShieldCheck className="h-4 w-4 mr-1" />
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
