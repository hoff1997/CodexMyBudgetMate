"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft,
  PiggyBank,
  TrendingUp,
  Heart,
  ArrowRight,
  Wallet,
  Clock,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Inbox,
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow, format } from "date-fns";
import { TransferRequestApprovalDialog } from "@/components/kids/transfer-request-approval-dialog";
import type { KidTransferRequest, TransferEnvelope } from "@/lib/types/kids-invoice";

interface TransferRequestsClientProps {
  pendingRequests: (KidTransferRequest & { childName: string; childAvatar?: string })[];
  resolvedRequests: (KidTransferRequest & { childName: string; childAvatar?: string })[];
  children: { id: string; name: string; avatar_url?: string }[];
}

const ENVELOPE_CONFIG: Record<TransferEnvelope, { label: string; icon: typeof PiggyBank; color: string; bgColor: string }> = {
  save: { label: "Save", icon: PiggyBank, color: "text-blue-600", bgColor: "bg-blue-50" },
  invest: { label: "Invest", icon: TrendingUp, color: "text-green-600", bgColor: "bg-green-50" },
  give: { label: "Give", icon: Heart, color: "text-pink-600", bgColor: "bg-pink-50" },
};

export function TransferRequestsClient({
  pendingRequests,
  resolvedRequests,
  children,
}: TransferRequestsClientProps) {
  const [selectedRequest, setSelectedRequest] = useState<
    (KidTransferRequest & { childName: string }) | null
  >(null);

  // Group pending requests by child
  const pendingByChild = pendingRequests.reduce((acc, req) => {
    const childId = req.child_profile_id;
    if (!acc[childId]) {
      acc[childId] = {
        childName: req.childName,
        childAvatar: req.childAvatar,
        requests: [],
      };
    }
    acc[childId].requests.push(req);
    return acc;
  }, {} as Record<string, { childName: string; childAvatar?: string; requests: typeof pendingRequests }>);

  const totalPendingAmount = pendingRequests.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="w-full flex flex-col gap-6 px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/kids">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-secondary">Transfer Requests</h1>
          <p className="text-sm text-muted-foreground">
            Review your children&apos;s requests to move money
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-50">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingRequests.length}</p>
              <p className="text-sm text-muted-foreground">Pending Requests</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sage-very-light">
              <Wallet className="h-5 w-5 text-sage" />
            </div>
            <div>
              <p className="text-2xl font-bold">${totalPendingAmount.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">Total Pending</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50">
              <CheckCircle2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{resolvedRequests.length}</p>
              <p className="text-sm text-muted-foreground">Resolved (30 days)</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Pending Requests */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Pending Approval</h2>

        {pendingRequests.length === 0 ? (
          <Card className="p-8 text-center">
            <Inbox className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="font-medium">No pending requests</p>
            <p className="text-sm text-muted-foreground">
              When your children request transfers, they&apos;ll appear here
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {Object.entries(pendingByChild).map(([childId, { childName, childAvatar, requests }]) => (
              <Card key={childId} className="p-4">
                {/* Child Header */}
                <div className="flex items-center gap-3 mb-4 pb-3 border-b">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={childAvatar} />
                    <AvatarFallback className="bg-sage-very-light text-sage">
                      {childName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{childName}</p>
                    <p className="text-sm text-muted-foreground">
                      {requests.length} pending request{requests.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                {/* Requests List */}
                <div className="space-y-3">
                  {requests.map((request) => {
                    const config = ENVELOPE_CONFIG[request.from_envelope as TransferEnvelope];
                    const Icon = config?.icon || PiggyBank;

                    return (
                      <div
                        key={request.id}
                        className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => setSelectedRequest(request)}
                      >
                        {/* Envelope Icons */}
                        <div className="flex items-center gap-2">
                          <div className={`p-2 rounded-lg ${config?.bgColor || "bg-gray-50"}`}>
                            <Icon className={`h-4 w-4 ${config?.color || "text-gray-600"}`} />
                          </div>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <div className="p-2 rounded-lg bg-amber-50">
                            <Wallet className="h-4 w-4 text-amber-600" />
                          </div>
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">${request.amount.toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {config?.label || request.from_envelope} → Spend
                            {request.reason && ` • "${request.reason}"`}
                          </p>
                        </div>

                        {/* Time & Action */}
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                          </p>
                          <Button size="sm" className="mt-1 bg-sage hover:bg-sage-dark">
                            Review
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Resolved Requests */}
      {resolvedRequests.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Recently Resolved</h2>

          <Card className="divide-y">
            {resolvedRequests.slice(0, 10).map((request) => {
              const config = ENVELOPE_CONFIG[request.from_envelope as TransferEnvelope];
              const Icon = config?.icon || PiggyBank;
              const isApproved = request.status === "approved";

              return (
                <div key={request.id} className="flex items-center gap-4 p-4">
                  {/* Status Icon */}
                  <div
                    className={`p-2 rounded-full ${
                      isApproved ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                    }`}
                  >
                    {isApproved ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{request.childName}</p>
                      <Badge variant={isApproved ? "default" : "secondary"} className="text-xs">
                        {isApproved ? "Approved" : "Denied"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      ${request.amount.toFixed(2)} from {config?.label || request.from_envelope}
                    </p>
                    {request.parent_notes && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {request.parent_notes}
                      </p>
                    )}
                  </div>

                  {/* Date */}
                  <div className="text-right text-sm text-muted-foreground">
                    {request.responded_at
                      ? format(new Date(request.responded_at), "MMM d")
                      : format(new Date(request.created_at), "MMM d")}
                  </div>
                </div>
              );
            })}
          </Card>
        </div>
      )}

      {/* Approval Dialog */}
      {selectedRequest && (
        <TransferRequestApprovalDialog
          open={!!selectedRequest}
          onOpenChange={(open) => !open && setSelectedRequest(null)}
          request={selectedRequest}
          childId={selectedRequest.child_profile_id}
        />
      )}
    </div>
  );
}
