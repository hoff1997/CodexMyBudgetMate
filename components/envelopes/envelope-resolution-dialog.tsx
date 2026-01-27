"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, CheckCircle2, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { EnvelopeIcon } from "@/components/shared/envelope-icon";

interface UnbudgetedEnvelope {
  id: string;
  name: string;
  icon?: string;
  pay_cycle_amount: number;
  is_goal?: boolean;
  is_spending?: boolean;
  is_tracking_only?: boolean;
}

interface EnvelopeResolutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  envelopes: UnbudgetedEnvelope[];
  onResolve: () => void;
}

type ResolutionAction = 'allocate' | 'mark_spending' | 'mark_goal' | 'mark_tracking' | 'delete';

interface EnvelopeResolution {
  action: ResolutionAction;
  amount?: number;
}

export function EnvelopeResolutionDialog({
  open,
  onOpenChange,
  envelopes,
  onResolve,
}: EnvelopeResolutionDialogProps) {
  const [resolutions, setResolutions] = useState<Record<string, EnvelopeResolution>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleResolutionChange = (envelopeId: string, action: ResolutionAction, amount?: number) => {
    setResolutions(prev => ({
      ...prev,
      [envelopeId]: { action, amount },
    }));
  };

  const handleSubmit = async () => {
    setIsLoading(true);

    try {
      const updates = Object.entries(resolutions).map(async ([envelopeId, resolution]) => {
        const envelope = envelopes.find(e => e.id === envelopeId);
        if (!envelope) return;

        if (resolution.action === 'delete') {
          // Delete envelope
          const response = await fetch(`/api/envelopes/${envelopeId}`, {
            method: 'DELETE',
            credentials: 'include',
          });

          if (!response.ok) {
            throw new Error(`Failed to delete ${envelope.name}`);
          }
        } else {
          // Update envelope
          const updateData: Record<string, any> = {};

          if (resolution.action === 'allocate' && resolution.amount !== undefined) {
            updateData.pay_cycle_amount = resolution.amount;
          } else if (resolution.action === 'mark_spending') {
            updateData.is_spending = true;
          } else if (resolution.action === 'mark_goal') {
            updateData.is_goal = true;
          } else if (resolution.action === 'mark_tracking') {
            updateData.is_tracking_only = true;
          }

          const response = await fetch(`/api/envelopes/${envelopeId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(updateData),
          });

          if (!response.ok) {
            throw new Error(`Failed to update ${envelope.name}`);
          }
        }
      });

      await Promise.all(updates);

      toast.success('All envelopes resolved successfully!');
      onResolve();
      onOpenChange(false);
      setResolutions({});
    } catch (error) {
      console.error('Error resolving envelopes:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to resolve envelopes');
    } finally {
      setIsLoading(false);
    }
  };

  const resolvedCount = Object.keys(resolutions).length;
  const canSubmit = resolvedCount > 0 && !isLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            Resolve Unbudgeted Envelopes
          </DialogTitle>
          <DialogDescription>
            Choose how to handle each envelope without budget allocation. Let&apos;s resolve each
            one to remove the warning.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {envelopes.map((envelope) => {
            const resolution = resolutions[envelope.id];
            const isResolved = !!resolution;

            return (
              <div
                key={envelope.id}
                className={`rounded-lg border p-4 transition-colors ${
                  isResolved
                    ? 'border-green-200 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700'
                }`}
              >
                <div className="flex items-start gap-3">
                  <EnvelopeIcon icon={envelope.icon || "wallet"} size={28} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium">{envelope.name}</h4>
                      {isResolved && (
                        <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                      )}
                    </div>

                    <div className="space-y-2">
                      {/* Allocate Budget Option */}
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={resolution?.action === 'allocate'}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              handleResolutionChange(envelope.id, 'allocate', 0);
                            } else {
                              setResolutions(prev => {
                                const { [envelope.id]: _, ...rest } = prev;
                                return rest;
                              });
                            }
                          }}
                        />
                        <div className="flex-1">
                          <Label className="cursor-pointer">Allocate budget amount</Label>
                          {resolution?.action === 'allocate' && (
                            <div className="mt-2 flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">$</span>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                value={resolution.amount || ''}
                                onChange={(e) => {
                                  const value = parseFloat(e.target.value) || 0;
                                  handleResolutionChange(envelope.id, 'allocate', value);
                                }}
                                className="max-w-32"
                              />
                              <span className="text-sm text-muted-foreground">per pay cycle</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Mark as Spending */}
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={resolution?.action === 'mark_spending'}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              handleResolutionChange(envelope.id, 'mark_spending');
                            } else {
                              setResolutions(prev => {
                                const { [envelope.id]: _, ...rest } = prev;
                                return rest;
                              });
                            }
                          }}
                        />
                        <Label className="cursor-pointer">
                          Mark as Spending envelope (tracks spending only)
                        </Label>
                      </div>

                      {/* Mark as Goal */}
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={resolution?.action === 'mark_goal'}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              handleResolutionChange(envelope.id, 'mark_goal');
                            } else {
                              setResolutions(prev => {
                                const { [envelope.id]: _, ...rest } = prev;
                                return rest;
                              });
                            }
                          }}
                        />
                        <Label className="cursor-pointer">
                          Mark as Goal envelope (optional allocation)
                        </Label>
                      </div>

                      {/* Mark as Tracking Only */}
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={resolution?.action === 'mark_tracking'}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              handleResolutionChange(envelope.id, 'mark_tracking');
                            } else {
                              setResolutions(prev => {
                                const { [envelope.id]: _, ...rest } = prev;
                                return rest;
                              });
                            }
                          }}
                        />
                        <Label className="cursor-pointer">
                          Mark as Tracking Only (e.g., reimbursements)
                        </Label>
                      </div>

                      {/* Delete Option */}
                      <div className="flex items-center gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <Checkbox
                          checked={resolution?.action === 'delete'}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              handleResolutionChange(envelope.id, 'delete');
                            } else {
                              setResolutions(prev => {
                                const { [envelope.id]: _, ...rest } = prev;
                                return rest;
                              });
                            }
                          }}
                        />
                        <Label className="cursor-pointer text-destructive flex items-center gap-1">
                          <Trash2 className="h-3 w-3" />
                          Delete this envelope
                        </Label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {resolvedCount} of {envelopes.length} resolved
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!canSubmit}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Apply Changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
