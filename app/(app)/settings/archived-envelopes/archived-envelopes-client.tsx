"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Archive, RotateCcw, Calendar, FileText, AlertCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EnvelopeIcon } from "@/components/shared/envelope-icon";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Link from "next/link";

interface ArchivedEnvelope {
  id: string;
  name: string;
  icon: string | null;
  subtype: string | null;
  current_amount: number | null;
  target_amount: number | null;
  is_archived: boolean;
  archived_at: string | null;
  archive_reason: string | null;
}

export function ArchivedEnvelopesClient() {
  const router = useRouter();
  const [archivedEnvelopes, setArchivedEnvelopes] = useState<ArchivedEnvelope[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [envelopeToRestore, setEnvelopeToRestore] = useState<ArchivedEnvelope | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  // Fetch archived envelopes
  const fetchArchivedEnvelopes = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/envelopes/archived");
      const data = await res.json();
      setArchivedEnvelopes(data.envelopes || []);
    } catch (error) {
      console.error("Failed to fetch archived envelopes:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArchivedEnvelopes();
  }, [fetchArchivedEnvelopes]);

  const handleRestoreClick = (envelope: ArchivedEnvelope) => {
    setEnvelopeToRestore(envelope);
    setRestoreDialogOpen(true);
  };

  const handleRestore = async () => {
    if (!envelopeToRestore) return;

    setIsRestoring(true);
    try {
      const res = await fetch(`/api/envelopes/${envelopeToRestore.id}/restore`, {
        method: "POST",
      });

      if (res.ok) {
        // Remove from local state
        setArchivedEnvelopes(prev => prev.filter(e => e.id !== envelopeToRestore.id));
        setRestoreDialogOpen(false);
        setEnvelopeToRestore(null);
      }
    } catch (error) {
      console.error("Failed to restore envelope:", error);
    } finally {
      setIsRestoring(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-8 text-center">
        <div className="flex items-center justify-center gap-2">
          <RefreshCw className="h-5 w-5 animate-spin text-text-medium" />
          <span className="text-text-medium">Loading archived envelopes...</span>
        </div>
      </Card>
    );
  }

  if (archivedEnvelopes.length === 0) {
    return (
      <Card className="p-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="rounded-full bg-sage-very-light p-4">
            <Archive className="h-8 w-8 text-sage" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-text-dark">
              No archived envelopes
            </h3>
            <p className="text-sm text-text-medium mt-1">
              Envelopes you archive will appear here
            </p>
          </div>
          <Link href="/budgetallocation">
            <Button variant="outline" className="mt-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Budget
            </Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-silver-very-light border-b border-silver-light">
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-medium uppercase tracking-wide">
                  Envelope
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-medium uppercase tracking-wide">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-medium uppercase tracking-wide">
                  Archived
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-medium uppercase tracking-wide">
                  Reason
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-text-medium uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-silver-very-light">
              {archivedEnvelopes.map((envelope) => (
                <tr key={envelope.id} className="hover:bg-silver-very-light/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <EnvelopeIcon icon={envelope.icon || "wallet"} size={20} />
                      <span className="font-medium text-text-dark">
                        {envelope.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="capitalize text-xs">
                      {envelope.subtype || "envelope"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 text-sm text-text-medium">
                      <Calendar className="h-4 w-4" />
                      {envelope.archived_at
                        ? format(new Date(envelope.archived_at), "dd MMM yyyy")
                        : "Unknown"}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {envelope.archive_reason ? (
                      <div className="flex items-start gap-2 text-sm text-text-medium max-w-[300px]">
                        <FileText className="h-4 w-4 flex-shrink-0 mt-0.5" />
                        <span className="line-clamp-2">
                          {envelope.archive_reason}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-text-light italic">
                        No reason provided
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestoreClick(envelope)}
                      className="border-sage text-sage hover:bg-sage-very-light"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Restore
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-sage" />
              Restore Envelope
            </AlertDialogTitle>
            <AlertDialogDescription>
              Restore <strong>{envelopeToRestore?.icon} {envelopeToRestore?.name}</strong> to your active budget?
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="rounded-lg border border-sage-light bg-sage-very-light p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-sage flex-shrink-0 mt-0.5" />
              <div className="text-sm text-text-dark">
                <p className="font-medium mb-1">What happens when you restore:</p>
                <ul className="list-disc list-inside space-y-1 text-text-medium">
                  <li>Envelope returns to active budget views</li>
                  <li>All transaction history intact</li>
                  <li>You'll need to set up income allocations</li>
                  <li>Current balance preserved</li>
                </ul>
              </div>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRestoring}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestore}
              disabled={isRestoring}
              className="bg-sage hover:bg-sage-dark text-white"
            >
              {isRestoring ? (
                "Restoring..."
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Restore Envelope
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
