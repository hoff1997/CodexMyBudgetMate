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
import { Loader2, Wallet, Check, Unlink } from "lucide-react";
import { toast } from "sonner";
import { formatMoney } from "@/lib/utils/format";
import { EnvelopeIcon } from "@/components/shared/envelope-icon";

interface Envelope {
  id: string;
  name: string;
  icon: string | null;
  subtype: string;
  current_balance: number;
  is_suggested: boolean;
}

interface LinkEnvelopeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listId: string;
  listName: string;
  currentEnvelopeId: string | null;
  onLinked: (envelopeId: string | null, envelopeName: string | null) => void;
}

export function LinkEnvelopeDialog({
  open,
  onOpenChange,
  listId,
  listName,
  currentEnvelopeId,
  onLinked,
}: LinkEnvelopeDialogProps) {
  const [envelopes, setEnvelopes] = useState<Envelope[]>([]);
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(currentEnvelopeId);

  useEffect(() => {
    if (open) {
      fetchEnvelopes();
      setSelectedId(currentEnvelopeId);
    }
  }, [open, currentEnvelopeId]);

  const fetchEnvelopes = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/shopping/envelopes");
      if (res.ok) {
        const data = await res.json();
        setEnvelopes(data.envelopes || []);
      }
    } catch (error) {
      console.error("Failed to fetch envelopes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLink = async () => {
    if (!selectedId) return;

    setLinking(true);
    try {
      const res = await fetch(`/api/shopping/lists/${listId}/link-envelope`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ envelope_id: selectedId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to link envelope");
      }

      const data = await res.json();
      toast.success(`Linked to ${data.envelope.name}`);
      onLinked(selectedId, data.envelope.name);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to link envelope");
    } finally {
      setLinking(false);
    }
  };

  const handleUnlink = async () => {
    setLinking(true);
    try {
      const res = await fetch(`/api/shopping/lists/${listId}/link-envelope`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to unlink envelope");
      }

      toast.success("Envelope unlinked");
      onLinked(null, null);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to unlink envelope");
    } finally {
      setLinking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-sage" />
            Link to Budget Envelope
          </DialogTitle>
          <DialogDescription>
            Track spending from &quot;{listName}&quot; in your budget by linking it to an envelope.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-sage" />
          </div>
        ) : envelopes.length === 0 ? (
          <div className="text-center py-8">
            <Wallet className="h-12 w-12 text-text-light mx-auto mb-3" />
            <p className="text-text-medium">No spending envelopes found</p>
            <p className="text-sm text-text-light mt-1">
              Create a &quot;Groceries&quot; envelope in your budget first
            </p>
          </div>
        ) : (
          <div className="space-y-4 mt-4">
            {/* Suggested envelopes */}
            {envelopes.some((e) => e.is_suggested) && (
              <div>
                <p className="text-xs font-medium text-text-medium mb-2">
                  Suggested
                </p>
                <div className="space-y-2">
                  {envelopes
                    .filter((e) => e.is_suggested)
                    .map((envelope) => (
                      <EnvelopeOption
                        key={envelope.id}
                        envelope={envelope}
                        isSelected={selectedId === envelope.id}
                        onSelect={() => setSelectedId(envelope.id)}
                      />
                    ))}
                </div>
              </div>
            )}

            {/* Other envelopes */}
            {envelopes.some((e) => !e.is_suggested) && (
              <div>
                <p className="text-xs font-medium text-text-medium mb-2">
                  Other Envelopes
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {envelopes
                    .filter((e) => !e.is_suggested)
                    .map((envelope) => (
                      <EnvelopeOption
                        key={envelope.id}
                        envelope={envelope}
                        isSelected={selectedId === envelope.id}
                        onSelect={() => setSelectedId(envelope.id)}
                      />
                    ))}
                </div>
              </div>
            )}

            <div className="bg-blue-light/30 rounded-lg p-3">
              <p className="text-sm text-blue">
                When you complete this shopping list, you can record the spending to automatically deduct from the envelope balance.
              </p>
            </div>

            <div className="flex justify-between gap-2 pt-2">
              {currentEnvelopeId && (
                <Button
                  variant="outline"
                  onClick={handleUnlink}
                  disabled={linking}
                  className="text-red-600 hover:text-red-700"
                >
                  <Unlink className="h-4 w-4 mr-2" />
                  Unlink
                </Button>
              )}
              <div className="flex gap-2 ml-auto">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleLink}
                  disabled={!selectedId || linking || selectedId === currentEnvelopeId}
                  className="bg-sage hover:bg-sage-dark"
                >
                  {linking ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Wallet className="h-4 w-4 mr-2" />
                  )}
                  Link Envelope
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function EnvelopeOption({
  envelope,
  isSelected,
  onSelect,
}: {
  envelope: Envelope;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
        isSelected
          ? "border-sage bg-sage-very-light"
          : "border-silver-light hover:border-sage-light"
      }`}
    >
      <EnvelopeIcon icon={envelope.icon || "wallet"} size={24} />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-text-dark truncate">{envelope.name}</p>
        <p className="text-sm text-text-medium">
          Balance: {formatMoney(envelope.current_balance)}
        </p>
      </div>
      {isSelected && <Check className="h-5 w-5 text-sage flex-shrink-0" />}
    </button>
  );
}
