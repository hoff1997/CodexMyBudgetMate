"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Gift, X, Calendar, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/finance";
import { getDaysUntilText } from "@/lib/types/celebrations";
import Link from "next/link";
import { cn } from "@/lib/cn";

interface Reminder {
  id: string;
  recipient_name: string;
  celebration_date: string;
  gift_amount: number;
  envelope_name: string;
  envelope_icon: string;
  days_until: number;
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

  const getUrgencyStyle = (daysUntil: number) => {
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
        <Link href="/allocation?category=Celebrations">
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
              getUrgencyStyle(reminder.days_until)
            )}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-lg">{reminder.envelope_icon}</span>
                <p className="font-medium text-text-dark truncate">
                  {reminder.recipient_name}
                </p>
              </div>
              <div className="flex items-center gap-3 mt-1">
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
              </div>
              <p className="text-xs text-text-medium mt-1">
                {reminder.envelope_name}
              </p>
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
