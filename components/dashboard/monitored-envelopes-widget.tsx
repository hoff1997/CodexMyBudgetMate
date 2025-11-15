"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

interface Envelope {
  id: string;
  name: string;
  current_amount: number;
  is_monitored: boolean;
  icon?: string;
}

interface MonitoredEnvelopesWidgetProps {
  monitoredEnvelopeIds?: string[];
}

export default function MonitoredEnvelopesWidget({ monitoredEnvelopeIds = [] }: MonitoredEnvelopesWidgetProps) {
  const [showAll, setShowAll] = useState(false);
  const router = useRouter();

  const { data: envelopesData } = useQuery<{ envelopes: Envelope[] }>({
    queryKey: ["/api/envelopes"],
    queryFn: async () => {
      const response = await fetch("/api/envelopes");
      if (!response.ok) throw new Error("Failed to fetch envelopes");
      return response.json();
    },
  });

  const envelopes = envelopesData?.envelopes ?? [];

  // Filter by user-selected envelopes if any, otherwise fall back to is_monitored flag
  const monitoredEnvelopes = monitoredEnvelopeIds.length > 0
    ? envelopes.filter((env) => monitoredEnvelopeIds.includes(env.id))
    : envelopes.filter((env) => env.is_monitored);

  const displayedEnvelopes = showAll
    ? monitoredEnvelopes
    : monitoredEnvelopes.slice(0, 4);

  if (monitoredEnvelopes.length === 0) {
    return null;
  }

  const handleEnvelopeClick = (envelopeId: string) => {
    router.push(`/transactions?envelope=${envelopeId}`);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base font-semibold">
              Monitored Envelopes
            </CardTitle>
            <Badge variant="secondary" className="ml-2">
              {monitoredEnvelopes.length}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {displayedEnvelopes.map((envelope) => (
            <div
              key={envelope.id}
              onClick={() => handleEnvelopeClick(envelope.id)}
              className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <span className="text-lg">{envelope.icon || "📊"}</span>
                </div>
                <div>
                  <p className="font-medium text-sm">{envelope.name}</p>
                </div>
              </div>
              <div className="text-right">
                <p
                  className={`text-sm font-semibold ${
                    envelope.current_amount < 0
                      ? "text-red-600"
                      : "text-green-600"
                  }`}
                >
                  ${Math.abs(envelope.current_amount).toFixed(2)}
                </p>
              </div>
            </div>
          ))}

          {monitoredEnvelopes.length > 4 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAll(!showAll)}
              className="w-full mt-2"
            >
              {showAll ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Show All ({monitoredEnvelopes.length - 4} more)
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
