"use client";

/**
 * Envelope Status Overview
 *
 * HORIZONTAL layout showing envelope status breakdown.
 * Each stat is clickable and navigates to envelope-summary with the appropriate filter.
 */

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";

export interface EnvelopeStatusData {
  id: string;
  name: string;
  current: number;
  target: number;
  isTracking?: boolean;
}

interface EnvelopeStatusOverviewProps {
  envelopes: EnvelopeStatusData[];
}

type StatusBucket = "on_track" | "attention" | "no_target" | "surplus";

interface StatusConfig {
  label: string;
  filter: string;
  dotColor: string;
}

const STATUS_CONFIG: Record<StatusBucket, StatusConfig> = {
  on_track: {
    label: "On Track",
    filter: "healthy",
    dotColor: "bg-[#7A9E9A]", // sage
  },
  attention: {
    label: "Needs Attention",
    filter: "attention",
    dotColor: "bg-[#6B9ECE]", // blue
  },
  no_target: {
    label: "No Target",
    filter: "no-target",
    dotColor: "bg-[#9CA3AF]", // silver
  },
  surplus: {
    label: "Surplus",
    filter: "surplus",
    dotColor: "bg-[#5A7E7A]", // sage-dark
  },
};

function getEnvelopeStatus(envelope: EnvelopeStatusData): StatusBucket {
  if (envelope.isTracking || envelope.target <= 0) return "no_target";

  const ratio = envelope.current / envelope.target;

  if (ratio >= 1.05) return "surplus";
  if (ratio >= 0.8) return "on_track";
  return "attention"; // Combines attention + underfunded
}

export function EnvelopeStatusOverview({
  envelopes,
}: EnvelopeStatusOverviewProps) {
  const router = useRouter();

  const statusCounts = useMemo(() => {
    const counts: Record<StatusBucket, number> = {
      on_track: 0,
      attention: 0,
      no_target: 0,
      surplus: 0,
    };

    envelopes.forEach((envelope) => {
      const status = getEnvelopeStatus(envelope);
      counts[status]++;
    });

    return counts;
  }, [envelopes]);

  const totalEnvelopes = envelopes.length;

  const handleStatClick = (filter: string) => {
    router.push(`/budgetallocation?filter=${filter}`);
  };

  if (envelopes.length === 0) {
    return (
      <Card className="bg-white border border-silver-light rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-text-dark flex items-center justify-between">
            Envelope Status
            <Link
              href="/budgetallocation"
              className="flex items-center text-sm font-normal text-sage hover:text-sage-dark"
            >
              View All <ChevronRight className="h-4 w-4 ml-0.5" />
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-text-medium">
            <p>No envelopes yet</p>
            <Link
              href="/onboarding"
              className="text-sm text-sage hover:underline mt-2 inline-block"
            >
              Set up your budget
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border border-silver-light rounded-xl">
      {/* Header */}
      <CardHeader className="py-2 px-4 border-b border-silver-light">
        <CardTitle className="text-sm font-semibold text-text-dark flex items-center justify-between">
          <span>Envelope Status</span>
          <Link
            href="/budgetallocation"
            className="flex items-center text-xs font-normal text-sage hover:text-sage-dark"
          >
            View All <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
          </Link>
        </CardTitle>
      </CardHeader>

      <CardContent className="py-2 px-4">
        {/* Horizontal Stats Row */}
        <div className="grid grid-cols-5 gap-1">
          {(["on_track", "attention", "no_target", "surplus"] as StatusBucket[]).map((status) => {
            const config = STATUS_CONFIG[status];
            const count = statusCounts[status];

            return (
              <button
                key={status}
                onClick={() => handleStatClick(config.filter)}
                className={cn(
                  "flex flex-col items-center py-2 px-1 rounded-lg transition-colors",
                  "hover:bg-[#F3F4F6] focus:outline-none focus:ring-2 focus:ring-sage/50"
                )}
              >
                <span className={cn("w-2 h-2 rounded-full mb-1", config.dotColor)} />
                <span className="text-lg font-semibold text-text-dark">{count}</span>
                <span className="text-[9px] text-text-medium text-center leading-tight">
                  {config.label}
                </span>
              </button>
            );
          })}

          {/* Total - separated with border */}
          <div className="flex flex-col items-center py-2 px-1 border-l border-silver-light">
            <span className="text-lg font-semibold text-text-dark">{totalEnvelopes}</span>
            <span className="text-[9px] text-text-medium">Total</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
