"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { CheckSquare, ArrowRight, Clock } from "lucide-react";
import Link from "next/link";

export interface ChildChoreProgress {
  childId: string;
  childName: string;
  avatarEmoji?: string | null;
  totalChores: number;
  completedChores: number;
  pendingApproval: number;
}

interface KidsChoresWidgetProps {
  childProgress: ChildChoreProgress[];
  totalPendingApproval: number;
}

export function KidsChoresWidget({
  childProgress,
  totalPendingApproval,
}: KidsChoresWidgetProps) {
  // Don't show if no kids
  if (childProgress.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-sage" />
            <CardTitle className="text-lg">Kids Chores This Week</CardTitle>
          </div>
          <Link href="/kids/chores">
            <Button variant="ghost" size="sm" className="text-sage hover:text-sage-dark gap-1">
              Manage
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
        {totalPendingApproval > 0 && (
          <div className="flex items-center gap-2 mt-2 p-2 rounded-lg bg-gold-light border border-gold">
            <Clock className="h-4 w-4 text-gold" />
            <span className="text-sm font-medium text-gold-dark">
              {totalPendingApproval} chore{totalPendingApproval !== 1 ? "s" : ""} waiting for approval
            </span>
            <Link href="/kids/chores" className="ml-auto">
              <Button size="sm" variant="outline" className="h-7 text-xs border-gold text-gold-dark hover:bg-gold-light">
                Review
              </Button>
            </Link>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {childProgress.map((child) => {
          const progressPercent = child.totalChores > 0
            ? (child.completedChores / child.totalChores) * 100
            : 0;

          return (
            <div key={child.childId} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{child.avatarEmoji || "👤"}</span>
                  <span className="font-medium text-text-dark text-sm">
                    {child.childName}
                  </span>
                </div>
                <span className="text-xs text-text-medium">
                  {child.completedChores}/{child.totalChores} done
                </span>
              </div>
              <div className="h-2 bg-silver-very-light rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    progressPercent >= 100
                      ? "bg-sage"
                      : progressPercent >= 50
                      ? "bg-sage-light"
                      : "bg-gold"
                  )}
                  style={{ width: `${Math.min(progressPercent, 100)}%` }}
                />
              </div>
              {child.pendingApproval > 0 && (
                <p className="text-xs text-gold">
                  {child.pendingApproval} awaiting approval
                </p>
              )}
            </div>
          );
        })}

        {childProgress.every(c => c.totalChores === 0) && (
          <div className="text-center py-4">
            <p className="text-sm text-text-medium mb-2">No chores assigned this week</p>
            <Link href="/kids/chores">
              <Button variant="outline" size="sm">
                Assign Chores
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
