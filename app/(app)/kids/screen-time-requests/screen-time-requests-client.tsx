"use client";

import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScreenTimeApprovalDialog } from "@/components/kids/screen-time-approval-dialog";
import { Tv, Clock, RefreshCw, Loader2 } from "lucide-react";

interface ScreenTimeRequest {
  id: string;
  minutes_requested: number;
  created_at: string;
  status: string;
  child_profile: {
    id: string;
    name: string;
    avatar?: string;
  } | null;
}

interface ScreenTimeRequestsClientProps {
  initialRequests: ScreenTimeRequest[];
}

export function ScreenTimeRequestsClient({
  initialRequests,
}: ScreenTimeRequestsClientProps) {
  const [requests, setRequests] =
    useState<ScreenTimeRequest[]>(initialRequests);
  const [selectedRequest, setSelectedRequest] =
    useState<ScreenTimeRequest | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refreshRequests = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/kids/screen-time/requests?status=pending");
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
      }
    } finally {
      setRefreshing(false);
    }
  }, []);

  const handleApproved = () => {
    refreshRequests();
    setSelectedRequest(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-light flex items-center justify-center">
              <Tv className="h-6 w-6 text-blue" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-dark">
                Screen Time Requests
              </h1>
              <p className="text-text-medium">
                {requests.length} pending request
                {requests.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshRequests}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Requests */}
        {requests.length === 0 ? (
          <Card className="p-12 text-center">
            <Tv className="h-12 w-12 text-text-light mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-text-dark mb-2">
              No pending requests
            </h2>
            <p className="text-text-medium">
              When your kids request screen time, it will appear here.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => (
              <Card
                key={request.id}
                className="p-4 hover:bg-sage-very-light cursor-pointer transition-colors"
                onClick={() => setSelectedRequest(request)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-blue-light flex items-center justify-center text-2xl">
                      {request.child_profile?.avatar || "👤"}
                    </div>
                    <div>
                      <h3 className="font-semibold text-text-dark">
                        {request.child_profile?.name || "Unknown"}
                      </h3>
                      <div className="flex items-center gap-1 text-sm text-text-medium">
                        <Clock className="h-3 w-3" />
                        {getTimeAgo(new Date(request.created_at))}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue">
                      {request.minutes_requested}
                    </div>
                    <div className="text-xs text-text-medium">minutes</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Approval Dialog */}
      {selectedRequest && (
        <ScreenTimeApprovalDialog
          request={selectedRequest}
          open={!!selectedRequest}
          onOpenChange={(open) => !open && setSelectedRequest(null)}
          onApproved={handleApproved}
        />
      )}
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}
