"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Landmark,
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Link2,
  ShieldCheck,
} from "lucide-react";
import { useToast } from "@/lib/hooks/use-toast";
import { BankLinkApprovalDialog } from "./bank-link-approval-dialog";

interface BankLinkStatusCardProps {
  childId: string;
  childName: string;
}

interface BankLinkStatus {
  childName: string;
  age: number | null;
  minAge: number;
  isEligible: boolean;
  bankLinkingEnabled: boolean;
  overallStatus: string;
  pendingRequest: { id: string } | null;
  connection: { connection_status: string; last_sync_at: string } | null;
  linkedAccounts: Array<{
    id: string;
    account_name: string;
    institution_name: string;
    current_balance: number;
  }>;
  statusMessages: Record<string, string>;
}

export function BankLinkStatusCard({ childId, childName }: BankLinkStatusCardProps) {
  const { toast } = useToast();
  const [status, setStatus] = useState<BankLinkStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [approvalOpen, setApprovalOpen] = useState(false);

  const fetchStatus = async () => {
    try {
      const response = await fetch(`/api/kids/${childId}/bank-link/status`);
      if (!response.ok) throw new Error("Failed to fetch status");

      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error("Error fetching bank link status:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [childId]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await fetch(`/api/kids/${childId}/bank-link/sync`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Sync failed");
      }

      toast({
        title: "Sync complete",
        description: "Bank accounts have been updated",
      });

      fetchStatus();
    } catch (error) {
      toast({
        title: "Sync failed",
        description: error instanceof Error ? error.message : "Failed to sync",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleRequestLink = async () => {
    try {
      const response = await fetch(`/api/kids/${childId}/bank-link/request`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to request");
      }

      toast({
        title: "Request sent",
        description: "Bank linking request has been created",
      });

      fetchStatus();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to request",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-5 bg-gray-200 rounded w-1/3" />
            <div className="h-20 bg-gray-200 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!status) return null;

  const getStatusIcon = () => {
    switch (status.overallStatus) {
      case "connected":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "pending_approval":
        return <Clock className="h-5 w-5 text-amber-500" />;
      case "approved_pending_link":
        return <Link2 className="h-5 w-5 text-blue-500" />;
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Landmark className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = () => {
    switch (status.overallStatus) {
      case "connected":
        return <Badge className="bg-green-100 text-green-700">Connected</Badge>;
      case "pending_approval":
        return <Badge className="bg-amber-100 text-amber-700">Pending Approval</Badge>;
      case "approved_pending_link":
        return <Badge className="bg-blue-100 text-blue-700">Ready to Link</Badge>;
      case "not_eligible":
        return <Badge variant="secondary">Not Eligible</Badge>;
      case "error":
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="secondary">Not Linked</Badge>;
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Landmark className="h-5 w-5 text-sage" />
            Bank Account
          </CardTitle>
          {getStatusBadge()}
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            {getStatusIcon()}
            <div className="flex-1">
              <p className="text-sm text-text-dark">
                {status.statusMessages[status.overallStatus]}
              </p>
              {status.age !== null && (
                <p className="text-xs text-muted-foreground mt-1">
                  Age: {status.age} years (minimum: {status.minAge})
                </p>
              )}
            </div>
          </div>

          {/* Connected Accounts */}
          {status.linkedAccounts.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Linked Accounts</h4>
              {status.linkedAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex justify-between items-center p-2 border rounded"
                >
                  <div>
                    <p className="text-sm font-medium">{account.account_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {account.institution_name}
                    </p>
                  </div>
                  <span className="font-semibold">
                    ${account.current_balance.toFixed(2)}
                  </span>
                </div>
              ))}
              {status.connection?.last_sync_at && (
                <p className="text-xs text-muted-foreground">
                  Last synced: {new Date(status.connection.last_sync_at).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {status.overallStatus === "not_requested" && status.isEligible && (
              <Button onClick={handleRequestLink} className="flex-1">
                <Link2 className="h-4 w-4 mr-1" />
                Request Bank Link
              </Button>
            )}

            {status.overallStatus === "pending_approval" && (
              <Button onClick={() => setApprovalOpen(true)} className="flex-1">
                <ShieldCheck className="h-4 w-4 mr-1" />
                Review Request
              </Button>
            )}

            {status.overallStatus === "approved_pending_link" && (
              <Button
                className="flex-1"
                onClick={() => {
                  const akahuAuthUrl = process.env.NEXT_PUBLIC_AKAHU_AUTH_URL;
                  if (!akahuAuthUrl) {
                    toast({
                      title: "Configuration missing",
                      description: "Akahu is not configured. Please check settings.",
                      variant: "destructive",
                    });
                    return;
                  }
                  // Add child context to callback
                  const url = new URL(akahuAuthUrl);
                  url.searchParams.set("child_id", childId);
                  window.location.href = url.toString();
                }}
              >
                <Link2 className="h-4 w-4 mr-1" />
                Connect via Akahu
              </Button>
            )}

            {status.overallStatus === "connected" && (
              <Button
                onClick={handleSync}
                disabled={syncing}
                variant="outline"
                className="flex-1"
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Syncing..." : "Sync Now"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Approval Dialog */}
      {status.pendingRequest && (
        <BankLinkApprovalDialog
          open={approvalOpen}
          onOpenChange={setApprovalOpen}
          childId={childId}
          childName={childName}
          requestId={status.pendingRequest.id}
          onSuccess={fetchStatus}
        />
      )}
    </>
  );
}
