"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Gift, X, ChevronRight, CheckCircle, AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/finance";
import { getDaysUntilText } from "@/lib/types/celebrations";
import Link from "next/link";
import { cn } from "@/lib/cn";

type ReadinessStatus = 'on_track' | 'slightly_behind' | 'needs_attention' | 'no_events';

interface Reminder {
  id: string;
  recipient_name: string;
  celebration_date: string;
  gift_amount: number;
  envelope_id: string;
  envelope_name: string;
  envelope_icon: string;
  envelope_balance: number;
  days_until: number;
  // Readiness data
  readiness_status: ReadinessStatus;
  readiness_message: string | null;
  shortfall: number;
  per_pay_catch_up: number;
}

function ReadinessIndicator({ status, shortfall }: { status: ReadinessStatus; shortfall: number }) {
  if (status === 'on_track') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-sage-dark">
        <CheckCircle className="h-3 w-3" />
        Ready
      </span>
    );
  }

  if (status === 'slightly_behind') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-blue">
        <ArrowRight className="h-3 w-3" />
        Need {formatCurrency(shortfall)}
      </span>
    );
  }

  if (status === 'needs_attention') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-gold-dark">
        <AlertCircle className="h-3 w-3" />
        Short {formatCurrency(shortfall)}
      </span>
    );
  }

  return null;
}

export function CelebrationRemindersWidget() {
  const queryClient = useQueryClient();

  const { data: reminders = [], isLoading } = useQuery<Reminder[]>({
    queryKey: ["celebration-reminders"],
    queryFn: async () => {
      const res = await fetch("/api/celebrations/reminders");
      if (!res.ok) throw new Error("Failed to fetch reminders");
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const dismissMutation = useMutation({
    mutationFn: async (reminderId: string) => {
      const res = await fetch(`/api/celebrations/reminders/${reminderId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to dismiss reminder");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["celebration-reminders"] });
    },
  });

  // Don't render if loading or no reminders
  if (isLoading) {
    return null;
  }

  if (reminders.length === 0) {
    return null;
  }

  const getUrgencyStyle = (daysUntil: number, readinessStatus: ReadinessStatus) => {
    // If needs attention, always show warning style
    if (readinessStatus === 'needs_attention') {
      return "bg-gold-light border-gold";
    }

    // Otherwise base on time
    if (daysUntil <= 3) {
      return "bg-gold-light border-gold";
    }
    if (daysUntil <= 7) {
      return "bg-blue-light border-blue-light";
    }
    return "bg-sage-very-light border-sage-light";
  };

  return (
    <div className="bg-white rounded-xl border border-sage-light p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-sage" />
          <h3 className="font-semibold text-text-dark">Upcoming Celebrations</h3>
        </div>
        <Link href="/budgetallocation?category=Celebrations">
          <Button variant="ghost" size="sm" className="text-sage hover:text-sage-dark">
            View All
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </div>

      <div className="space-y-3">
        {reminders.slice(0, 5).map((reminder) => (
          <div
            key={reminder.id}
            className={cn(
              "flex items-start justify-between p-3 rounded-lg border",
              getUrgencyStyle(reminder.days_until, reminder.readiness_status)
            )}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-lg">{reminder.envelope_icon}</span>
                <p className="font-medium text-text-dark truncate">
                  {reminder.recipient_name}
                </p>
              </div>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <span
                  className={cn(
                    "text-sm font-medium",
                    reminder.days_until <= 3
                      ? "text-gold-dark"
                      : reminder.days_until <= 7
                      ? "text-blue"
                      : "text-sage-dark"
                  )}
                >
                  {getDaysUntilText(reminder.days_until)}
                </span>
                <span className="text-sm text-text-medium">
                  {formatCurrency(reminder.gift_amount)} budgeted
                </span>
                {/* Readiness indicator */}
                <ReadinessIndicator
                  status={reminder.readiness_status}
                  shortfall={reminder.shortfall}
                />
              </div>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-text-medium">
                  {reminder.envelope_name}
                </p>
                <span className="text-xs text-text-medium">
                  ({formatCurrency(reminder.envelope_balance)} in envelope)
                </span>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => dismissMutation.mutate(reminder.id)}
              disabled={dismissMutation.isPending}
              className="text-text-medium hover:text-text-dark flex-shrink-0"
              title="Dismiss reminder"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      {reminders.length > 5 && (
        <p className="text-xs text-text-medium text-center mt-3">
          +{reminders.length - 5} more upcoming
        </p>
      )}
    </div>
  );
}
