"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Wifi,
  WifiOff,
  AlertCircle,
  RefreshCw,
  Settings,
  Building2,
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

interface BankConnection {
  id: string;
  user_id: string;
  provider: string;
  status: "connected" | "disconnected" | "action_required" | "issues";
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

interface BankConnectionStatusWidgetProps {
  className?: string;
}

export function BankConnectionStatusWidget({
  className,
}: BankConnectionStatusWidgetProps) {
  const { data: connections = [], isLoading } = useQuery<BankConnection[]>({
    queryKey: ["bank-connections"],
    queryFn: async () => {
      const response = await fetch("/api/bank-connections");
      if (!response.ok) {
        throw new Error("Failed to fetch bank connections");
      }
      return response.json();
    },
    refetchInterval: 60000, // Refetch every minute
  });

  const getStatusInfo = (status: BankConnection["status"]) => {
    switch (status) {
      case "connected":
        return {
          icon: Wifi,
          color: "text-green-600",
          bgColor: "bg-green-100",
          label: "Connected",
        };
      case "disconnected":
        return {
          icon: WifiOff,
          color: "text-gray-600",
          bgColor: "bg-gray-100",
          label: "Disconnected",
        };
      case "action_required":
        return {
          icon: AlertCircle,
          color: "text-yellow-600",
          bgColor: "bg-yellow-100",
          label: "Action Required",
        };
      case "issues":
        return {
          icon: AlertCircle,
          color: "text-red-600",
          bgColor: "bg-red-100",
          label: "Issues",
        };
    }
  };

  const connectedCount = connections.filter(
    (c) => c.status === "connected"
  ).length;
  const needsAttention = connections.filter(
    (c) => c.status === "action_required" || c.status === "issues"
  ).length;

  const mostRecentSync = connections.reduce((latest, conn) => {
    if (!conn.last_synced_at) return latest;
    if (!latest) return conn.last_synced_at;
    return new Date(conn.last_synced_at) > new Date(latest)
      ? conn.last_synced_at
      : latest;
  }, null as string | null);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Bank Connections
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/settings#bank-connections">
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {connections.length === 0 ? (
          <div className="text-center py-6 space-y-3">
            <p className="text-sm text-muted-foreground">
              No bank connections yet
            </p>
            <Button size="sm" asChild>
              <Link href="/settings#bank-connections">Connect Bank</Link>
            </Button>
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border bg-muted/10 p-3">
                <p className="text-xs text-muted-foreground">Connected</p>
                <p className="text-2xl font-bold text-green-600">
                  {connectedCount}
                </p>
              </div>
              <div className="rounded-lg border bg-muted/10 p-3">
                <p className="text-xs text-muted-foreground">Needs Attention</p>
                <p
                  className={`text-2xl font-bold ${needsAttention > 0 ? "text-yellow-600" : "text-gray-600"}`}
                >
                  {needsAttention}
                </p>
              </div>
            </div>

            {/* Connection List */}
            <div className="space-y-2">
              {connections.slice(0, 3).map((connection) => {
                const statusInfo = getStatusInfo(connection.status);
                const StatusIcon = statusInfo.icon;

                return (
                  <div
                    key={connection.id}
                    className="flex items-center justify-between p-2 rounded-lg border bg-muted/5"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div
                        className={`p-1.5 rounded-full ${statusInfo.bgColor}`}
                      >
                        <StatusIcon
                          className={`h-3 w-3 ${statusInfo.color}`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {connection.provider}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {connection.last_synced_at
                            ? `Synced ${formatDistanceToNow(new Date(connection.last_synced_at), { addSuffix: true })}`
                            : "Never synced"}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-xs ${statusInfo.color}`}
                    >
                      {statusInfo.label}
                    </Badge>
                  </div>
                );
              })}
            </div>

            {connections.length > 3 && (
              <p className="text-xs text-muted-foreground text-center">
                +{connections.length - 3} more connection
                {connections.length - 3 !== 1 ? "s" : ""}
              </p>
            )}

            {/* Last Sync */}
            {mostRecentSync && (
              <div className="text-xs text-muted-foreground text-center pt-2 border-t">
                Last sync:{" "}
                {formatDistanceToNow(new Date(mostRecentSync), {
                  addSuffix: true,
                })}
              </div>
            )}

            {/* Action Button */}
            <Button variant="outline" size="sm" className="w-full" asChild>
              <Link href="/settings#bank-connections">Manage Connections</Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
