"use client";

import { useState } from "react";
import { Archive, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface ArchiveEnvelopeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  envelope: {
    id: string;
    name: string;
    icon?: string;
  } | null;
  onArchive: (envelopeId: string, reason?: string) => Promise<void>;
}

export function ArchiveEnvelopeDialog({
  open,
  onOpenChange,
  envelope,
  onArchive,
}: ArchiveEnvelopeDialogProps) {
  const [reason, setReason] = useState("");
  const [isArchiving, setIsArchiving] = useState(false);

  const handleArchive = async () => {
    if (!envelope) return;

    setIsArchiving(true);
    try {
      await onArchive(envelope.id, reason.trim() || undefined);
      setReason("");
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to archive envelope:", error);
    } finally {
      setIsArchiving(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setReason("");
    }
    onOpenChange(newOpen);
  };

  if (!envelope) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5 text-blue" />
            Archive Envelope
          </DialogTitle>
          <DialogDescription>
            Archive <strong>{envelope.icon} {envelope.name}</strong>? This will hide it from your active
            budget but keep all transaction history.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-blue-light bg-[#DDEAF5]/30 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-blue flex-shrink-0 mt-0.5" />
            <div className="text-sm text-text-dark">
              <p className="font-medium mb-1">What happens when you archive:</p>
              <ul className="list-disc list-inside space-y-1 text-text-medium">
                <li>Envelope hidden from budget views</li>
                <li>All transactions preserved</li>
                <li>Can be restored anytime from Settings</li>
                <li>Income allocations removed</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="archive-reason">
            Reason for archiving (optional)
          </Label>
          <Textarea
            id="archive-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., No longer needed, switched to different account..."
            maxLength={200}
            rows={3}
            className="resize-none"
          />
          <p className="text-xs text-text-light">
            This helps you remember why you archived this envelope
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isArchiving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleArchive}
            disabled={isArchiving}
            className="bg-blue hover:bg-[#5A8DBE] text-white"
          >
            {isArchiving ? (
              "Archiving..."
            ) : (
              <>
                <Archive className="h-4 w-4 mr-2" />
                Archive Envelope
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
