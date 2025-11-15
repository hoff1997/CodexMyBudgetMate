"use client";

import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Eye, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface Envelope {
  id: string;
  name: string;
  icon?: string;
  current_amount: number;
}

interface EnvelopeMonitorSelectorProps {
  monitoredEnvelopeIds: string[];
  onToggle: (envelopeId: string) => void;
}

export function EnvelopeMonitorSelector({
  monitoredEnvelopeIds,
  onToggle,
}: EnvelopeMonitorSelectorProps) {
  const { data: envelopesData, isLoading } = useQuery<{ envelopes: Envelope[] }>({
    queryKey: ["/api/envelopes"],
    queryFn: async () => {
      const response = await fetch("/api/envelopes");
      if (!response.ok) throw new Error("Failed to fetch envelopes");
      return response.json();
    },
  });

  const envelopes = envelopesData?.envelopes ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (envelopes.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No envelopes found. Create your first envelope to start monitoring!
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Eye className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-semibold text-sm">Select Envelopes to Monitor</h3>
        <Badge variant="secondary" className="ml-auto">
          {monitoredEnvelopeIds.length} selected
        </Badge>
      </div>

      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
        {envelopes.map((envelope) => {
          const isMonitored = monitoredEnvelopeIds.includes(envelope.id);

          return (
            <div
              key={envelope.id}
              className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <Checkbox
                id={`envelope-${envelope.id}`}
                checked={isMonitored}
                onCheckedChange={() => onToggle(envelope.id)}
              />
              <div className="flex items-center gap-3 flex-1">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <span className="text-lg">{envelope.icon || "📊"}</span>
                </div>
                <Label
                  htmlFor={`envelope-${envelope.id}`}
                  className="flex-1 cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{envelope.name}</span>
                    <span
                      className={`text-sm font-semibold ml-4 ${
                        envelope.current_amount < 0
                          ? "text-red-600"
                          : "text-green-600"
                      }`}
                    >
                      ${Math.abs(envelope.current_amount).toFixed(2)}
                    </span>
                  </div>
                </Label>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground mt-4">
        Selected envelopes will appear in your Monitored Envelopes widget on the dashboard.
      </p>
    </div>
  );
}
