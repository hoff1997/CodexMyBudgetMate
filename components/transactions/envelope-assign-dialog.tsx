"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Loader2, Wallet, Plus, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/cn";
import { toast } from "sonner";

interface Envelope {
  id: string;
  name: string;
  icon?: string | null;
  current_amount?: number;
}

interface EnvelopeAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionId: string;
  currentEnvelopeName?: string | null;
  onAssigned: (envelopeId: string, envelopeName: string) => void;
  merchantName?: string;
}

const QUICK_ICONS = ["💰", "🛒", "🍔", "🚗", "🏠", "⚡️", "💳", "✈️", "🎁", "📦"] as const;

export function EnvelopeAssignDialog({
  open,
  onOpenChange,
  transactionId,
  currentEnvelopeName,
  onAssigned,
  merchantName,
}: EnvelopeAssignDialogProps) {
  const [envelopes, setEnvelopes] = useState<Envelope[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [selectedEnvelope, setSelectedEnvelope] = useState<Envelope | null>(null);

  // Quick create state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newEnvelopeName, setNewEnvelopeName] = useState("");
  const [newEnvelopeIcon, setNewEnvelopeIcon] = useState<typeof QUICK_ICONS[number]>(QUICK_ICONS[0]);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch envelopes when dialog opens
  useEffect(() => {
    if (open) {
      setIsLoading(true);
      fetch("/api/envelopes")
        .then((res) => res.json())
        .then((data) => {
          setEnvelopes(data.envelopes || []);
        })
        .catch((error) => {
          console.error("Failed to fetch envelopes:", error);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [open]);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setSelectedEnvelope(null);
      setShowCreateForm(false);
      setNewEnvelopeName("");
      setNewEnvelopeIcon(QUICK_ICONS[0]);
      setSearchQuery("");
    }
  }, [open]);

  const handleSelect = (envelope: Envelope) => {
    setSelectedEnvelope(envelope);
  };

  const handleAssign = async () => {
    if (!selectedEnvelope) return;

    setIsAssigning(true);
    try {
      const response = await fetch(`/api/transactions/${transactionId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ envelope_id: selectedEnvelope.id }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to assign envelope");
      }

      onAssigned(selectedEnvelope.id, selectedEnvelope.name);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to assign envelope:", error);
      toast.error(error instanceof Error ? error.message : "Failed to assign envelope");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleCreateEnvelope = async () => {
    if (!newEnvelopeName.trim()) {
      toast.error("Envelope name is required");
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch("/api/envelopes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newEnvelopeName.trim(),
          icon: newEnvelopeIcon,
          subtype: "spending",
          priority: "important",
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create envelope");
      }

      // Refresh envelope list
      const refreshResponse = await fetch("/api/envelopes");
      const refreshData = await refreshResponse.json();
      const updatedEnvelopes = refreshData.envelopes || [];
      setEnvelopes(updatedEnvelopes);

      // Find the newly created envelope and auto-select it
      const newEnvelope = updatedEnvelopes.find(
        (env: Envelope) => env.name.toLowerCase() === newEnvelopeName.trim().toLowerCase()
      );

      if (newEnvelope) {
        setSelectedEnvelope(newEnvelope);
        toast.success(`Created "${newEnvelope.name}"`);
      }

      // Reset create form and go back to list
      setShowCreateForm(false);
      setNewEnvelopeName("");
      setNewEnvelopeIcon(QUICK_ICONS[0]);
    } catch (error) {
      console.error("Failed to create envelope:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create envelope");
    } finally {
      setIsCreating(false);
    }
  };

  const handleShowCreateForm = () => {
    // Pre-fill with search query if user typed something that wasn't found
    setNewEnvelopeName(searchQuery);
    setShowCreateForm(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#3D3D3D]">
            {showCreateForm ? "Create New Envelope" : "Assign Envelope"}
          </DialogTitle>
          {!showCreateForm && merchantName && (
            <p className="text-sm text-[#9CA3AF]">
              Select an envelope for &quot;{merchantName}&quot;
            </p>
          )}
        </DialogHeader>

        {showCreateForm ? (
          // Quick Create Form
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="envelope-name" className="text-[#6B6B6B]">
                Envelope Name
              </Label>
              <Input
                id="envelope-name"
                value={newEnvelopeName}
                onChange={(e) => setNewEnvelopeName(e.target.value)}
                placeholder="e.g., Groceries, Dining Out"
                className="border-[#E5E7EB] focus:border-[#7A9E9A]"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[#6B6B6B]">Icon</Label>
              <div className="flex flex-wrap gap-2">
                {QUICK_ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setNewEnvelopeIcon(icon)}
                    className={cn(
                      "w-10 h-10 rounded-lg border text-xl flex items-center justify-center transition-colors",
                      newEnvelopeIcon === icon
                        ? "border-[#7A9E9A] bg-[#E2EEEC]"
                        : "border-[#E5E7EB] hover:border-[#9CA3AF]"
                    )}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-xs text-[#9CA3AF]">
              You can add more details like budget and category later in the Allocation page.
            </p>

            <div className="flex justify-between gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={() => setShowCreateForm(false)}
                className="text-[#6B6B6B]"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleCreateEnvelope}
                disabled={!newEnvelopeName.trim() || isCreating}
                className="bg-[#7A9E9A] hover:bg-[#5A7E7A] text-white"
              >
                {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Envelope
              </Button>
            </div>
          </div>
        ) : (
          // Envelope Selection View
          <>
            <div className="py-2">
              {currentEnvelopeName && (
                <p className="text-xs text-[#9CA3AF] mb-2">
                  Current: <span className="text-[#6B6B6B]">{currentEnvelopeName}</span>
                </p>
              )}

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-[#9CA3AF]" />
                </div>
              ) : (
                <Command className="rounded-lg border border-[#E5E7EB]">
                  <CommandInput
                    placeholder="Search envelopes..."
                    className="text-[#3D3D3D] placeholder:text-[#9CA3AF]"
                    value={searchQuery}
                    onValueChange={setSearchQuery}
                  />
                  <CommandList className="max-h-64">
                    <CommandEmpty>
                      <div className="py-2 text-center">
                        <span className="text-[#9CA3AF]">No envelopes found.</span>
                        {searchQuery && (
                          <button
                            type="button"
                            onClick={handleShowCreateForm}
                            className="block w-full mt-2 text-sm text-[#5A7E7A] hover:text-[#7A9E9A]"
                          >
                            Create &quot;{searchQuery}&quot; as new envelope
                          </button>
                        )}
                      </div>
                    </CommandEmpty>
                    <CommandGroup>
                      {envelopes.map((envelope) => (
                        <CommandItem
                          key={envelope.id}
                          value={envelope.name}
                          onSelect={() => handleSelect(envelope)}
                          className="gap-2 cursor-pointer"
                        >
                          <Check
                            className={cn(
                              "h-4 w-4 text-[#7A9E9A]",
                              selectedEnvelope?.id === envelope.id
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          {envelope.icon ? (
                            <span className="text-base">{envelope.icon}</span>
                          ) : (
                            <Wallet className="h-4 w-4 text-[#7A9E9A]" />
                          )}
                          <span className="flex-1 text-[#3D3D3D]">{envelope.name}</span>
                          {envelope.current_amount !== undefined && (
                            <span className="text-xs text-[#9CA3AF]">
                              ${envelope.current_amount.toFixed(2)}
                            </span>
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                    <CommandSeparator />
                    <CommandGroup>
                      <CommandItem
                        onSelect={handleShowCreateForm}
                        className="gap-2 cursor-pointer text-[#5A7E7A]"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Create new envelope...</span>
                      </CommandItem>
                    </CommandGroup>
                  </CommandList>
                </Command>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-[#E5E7EB] text-[#6B6B6B]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAssign}
                disabled={!selectedEnvelope || isAssigning}
                className="bg-[#7A9E9A] hover:bg-[#5A7E7A] text-white"
              >
                {isAssigning && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Assign
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
