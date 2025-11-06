"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface Envelope {
  id: string;
  name: string;
  current_amount: number;
  budgeted_amount: number;
  icon?: string;
}

interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
}

interface CondensedEnvelopeOverviewProps {
  selectedAccountId?: string;
}

export default function CondensedEnvelopeOverview({
  selectedAccountId,
}: CondensedEnvelopeOverviewProps) {
  const [showAllEnvelopes, setShowAllEnvelopes] = useState(false);

  const { data: envelopesData } = useQuery<{ envelopes: Envelope[] }>({
    queryKey: ["/api/envelopes"],
    queryFn: async () => {
      const response = await fetch("/api/envelopes");
      if (!response.ok) throw new Error("Failed to fetch envelopes");
      return response.json();
    },
  });

  const { data: accountsData } = useQuery<{ accounts: Account[] }>({
    queryKey: ["/api/accounts"],
    queryFn: async () => {
      const response = await fetch("/api/accounts");
      if (!response.ok) throw new Error("Failed to fetch accounts");
      return response.json();
    },
  });

  const envelopes = envelopesData?.envelopes ?? [];
  const accounts = accountsData?.accounts ?? [];

  // Filter envelopes based on spending patterns and account selection
  const getFilteredEnvelopes = () => {
    let filtered = envelopes;

    // For now, show all envelopes since we don't have account-specific envelope tracking
    // In a real app, you'd filter based on which account is typically used for each envelope

    if (!showAllEnvelopes) {
      // Show only top 6 envelopes with activity or low balances
      filtered = filtered
        .sort((a, b) => {
          const aBalance = a.current_amount;
          const aBudget = a.budgeted_amount;
          const bBalance = b.current_amount;
          const bBudget = b.budgeted_amount;

          // Prioritize overspent or low balance envelopes
          const aUrgency =
            aBalance < 0 ? 3 : aBalance < aBudget * 0.2 ? 2 : 1;
          const bUrgency =
            bBalance < 0 ? 3 : bBalance < bBudget * 0.2 ? 2 : 1;

          return bUrgency - aUrgency;
        })
        .slice(0, 6);
    }

    return filtered;
  };

  const filteredEnvelopes = getFilteredEnvelopes();

  const getEnvelopeStatus = (envelope: Envelope) => {
    const balance = envelope.current_amount;
    const budget = envelope.budgeted_amount;

    if (balance < 0)
      return {
        color: "text-red-600",
        bg: "bg-red-100 dark:bg-red-900/20",
        label: "Overspent",
      };
    if (balance < budget * 0.2)
      return {
        color: "text-yellow-600",
        bg: "bg-yellow-100 dark:bg-yellow-900/20",
        label: "Low",
      };
    return {
      color: "text-green-600",
      bg: "bg-green-100 dark:bg-green-900/20",
      label: "Good",
    };
  };

  const getProgressValue = (envelope: Envelope) => {
    const budget = envelope.budgeted_amount;
    const balance = envelope.current_amount;
    const spent = budget - balance;
    return budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Envelope Overview</CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAllEnvelopes(!showAllEnvelopes)}
              className="h-8 px-2"
            >
              {showAllEnvelopes ? (
                <>
                  <EyeOff className="h-3 w-3 mr-1" />
                  <span className="text-xs">Less</span>
                </>
              ) : (
                <>
                  <Eye className="h-3 w-3 mr-1" />
                  <span className="text-xs">All</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredEnvelopes.map((envelope) => {
            const status = getEnvelopeStatus(envelope);
            const balance = envelope.current_amount;
            const budget = envelope.budgeted_amount;
            const progress = getProgressValue(envelope);

            return (
              <div
                key={envelope.id}
                className="p-3 bg-muted/30 rounded-lg border border-border/50"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">{envelope.icon || "💰"}</span>
                    <span className="font-medium text-sm text-foreground truncate">
                      {envelope.name}
                    </span>
                  </div>
                  <Badge
                    variant="secondary"
                    className={`text-xs px-1.5 py-0.5 ${status.bg} ${status.color} border-0`}
                  >
                    {status.label}
                  </Badge>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Balance</span>
                    <span className={`font-medium ${status.color}`}>
                      ${balance.toFixed(2)}
                    </span>
                  </div>

                  <Progress value={progress} className="h-1.5" />

                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Budget</span>
                    <span className="text-muted-foreground">
                      ${budget.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {!showAllEnvelopes && envelopes.length > 6 && (
          <div className="mt-3 text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAllEnvelopes(true)}
              className="text-xs text-muted-foreground"
            >
              Show {envelopes.length - 6} more envelopes
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
