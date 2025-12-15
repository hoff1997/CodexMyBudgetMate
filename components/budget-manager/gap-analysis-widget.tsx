"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, TrendingUp, Lock, Unlock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface GapAnalysisWidgetProps {
  userId?: string;
  demoMode?: boolean;
}

interface GapData {
  envelope_id: string;
  envelope_name: string;
  ideal_per_pay: number;
  expected_balance: number;
  actual_balance: number;
  gap: number;
  payCyclesElapsed: number;
  status: "on_track" | "slight_deviation" | "needs_attention";
  is_locked: boolean;
}

interface GapAnalysisResponse {
  user_pay_cycle: string;
  current_date: string;
  gaps: GapData[];
}

export function GapAnalysisWidget({ userId, demoMode = false }: GapAnalysisWidgetProps) {
  const { data, isLoading, error } = useQuery<GapAnalysisResponse>({
    queryKey: ["/api/envelope-allocations/gap-analysis"],
    queryFn: async () => {
      const response = await fetch("/api/envelope-allocations/gap-analysis", {
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch gap analysis");
      }
      return response.json();
    },
    enabled: !demoMode,
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  if (demoMode) {
    return null;
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Gap Analysis
          </CardTitle>
          <CardDescription>Loading gap analysis...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            Gap Analysis Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Failed to load gap analysis"}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.gaps.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Gap Analysis
          </CardTitle>
          <CardDescription>
            No gap analysis available. Set up envelope allocations to track progress.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const getStatusIcon = (status: GapData["status"]) => {
    switch (status) {
      case "on_track":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "slight_deviation":
        return <AlertCircle className="h-4 w-4 text-amber-600" />;
      case "needs_attention":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
    }
  };

  const getStatusBadge = (status: GapData["status"]) => {
    switch (status) {
      case "on_track":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            On Track
          </Badge>
        );
      case "slight_deviation":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            Slight Gap
          </Badge>
        );
      case "needs_attention":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            Needs Attention
          </Badge>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Gap Analysis
        </CardTitle>
        <CardDescription>
          Track envelope balance progress vs. ideal steady-state allocations
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Envelope</TableHead>
                <TableHead className="text-right">Ideal/Pay</TableHead>
                <TableHead className="text-right">Expected Now</TableHead>
                <TableHead className="text-right">Current</TableHead>
                <TableHead className="text-right">Gap</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Lock</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.gaps.map((gap) => (
                <TableRow key={gap.envelope_id}>
                  <TableCell className="font-medium">{gap.envelope_name}</TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    ${gap.ideal_per_pay.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm text-muted-foreground">
                    ${gap.expected_balance.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm font-semibold">
                    ${gap.actual_balance.toFixed(2)}
                  </TableCell>
                  <TableCell
                    className={`text-right font-mono text-sm font-semibold ${
                      gap.gap >= 0
                        ? "text-green-600"
                        : gap.gap > -50
                        ? "text-amber-600"
                        : "text-red-600"
                    }`}
                  >
                    {gap.gap >= 0 ? "+" : ""}${gap.gap.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      {getStatusIcon(gap.status)}
                      {getStatusBadge(gap.status)}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {gap.is_locked ? (
                      <span title="Allocation locked">
                        <Lock className="h-4 w-4 text-blue-600 mx-auto" />
                      </span>
                    ) : (
                      <span title="Not locked">
                        <Unlock className="h-4 w-4 text-muted-foreground mx-auto" />
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Summary Stats */}
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-green-50 rounded-md border border-green-200">
            <div className="text-sm text-muted-foreground">On Track</div>
            <div className="text-2xl font-bold text-green-600">
              {data.gaps.filter((g) => g.status === "on_track").length}
            </div>
          </div>
          <div className="text-center p-3 bg-amber-50 rounded-md border border-amber-200">
            <div className="text-sm text-muted-foreground">Slight Gap</div>
            <div className="text-2xl font-bold text-amber-600">
              {data.gaps.filter((g) => g.status === "slight_deviation").length}
            </div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-md border border-red-200">
            <div className="text-sm text-muted-foreground">Needs Attention</div>
            <div className="text-2xl font-bold text-red-600">
              {data.gaps.filter((g) => g.status === "needs_attention").length}
            </div>
          </div>
        </div>

        <div className="mt-4 text-xs text-muted-foreground text-center">
          Pay cycle: {data.user_pay_cycle} • Updates every 5 minutes
        </div>
      </CardContent>
    </Card>
  );
}
