"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CheckCircle2, Circle, X, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { getNextSteps } from "@/lib/gamification/progress-tracker";

interface NextStep {
  action: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  link?: string;
}

interface NextStepsWidgetProps {
  data: {
    envelopeCount: number;
    transactionCount: number;
    goalCount: number;
    hasRecurringIncome: boolean;
    hasBankConnected: boolean;
    lastActivity?: string;
  };
  onDismiss?: () => void;
  compact?: boolean;
}

export function NextStepsWidget({
  data,
  onDismiss,
  compact = false,
}: NextStepsWidgetProps) {
  const [dismissed, setDismissed] = useState(false);
  const router = useRouter();
  const steps = getNextSteps(data);

  // Map actions to routes
  const actionRoutes: Record<string, string> = {
    'Create your first envelope': '/envelope-planning',
    'Add more envelopes': '/envelope-planning',
    'Track your first transaction': '/transactions',
    'Set your first goal': '/goals',
    'Set up recurring income': '/recurring-income',
    'Connect your bank': '/akahu/callback',
    'Check your progress': '/goals',
    'Explore analytics': '/reports',
  };

  const handleAction = (step: NextStep) => {
    const route = actionRoutes[step.action] || '/dashboard';
    router.push(route);
  };

  const handleDismissWidget = () => {
    setDismissed(true);
    onDismiss?.();
  };

  if (dismissed || steps.length === 0) {
    return null;
  }

  const priorityColors = {
    high: 'bg-emerald-500',
    medium: 'bg-blue-500',
    low: 'bg-purple-500',
  };

  const priorityLabels = {
    high: 'Recommended',
    medium: 'Next Steps',
    low: 'Suggestions',
  };

  if (compact) {
    const topStep = steps[0];
    if (!topStep) return null;

    return (
      <div className="bg-gradient-to-r from-emerald-500 to-blue-500 text-white rounded-lg p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium">Your Next Win</span>
            </div>
            <p className="text-sm font-semibold mb-1">{topStep.action}</p>
            <p className="text-xs text-white/80">{topStep.description}</p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleAction(topStep)}
            className="bg-white/20 hover:bg-white/30 text-white border-none"
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card className="border-2 border-emerald-500/20">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-5 w-5 text-emerald-500" />
              <CardTitle>Your Next Steps</CardTitle>
            </div>
            <CardDescription>
              Keep building momentum! Here's what to focus on next.
            </CardDescription>
          </div>
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismissWidget}
              className="text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {steps.slice(0, 5).map((step, index) => {
            const isHighPriority = step.priority === 'high';

            return (
              <div
                key={index}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-all hover:shadow-md ${
                  isHighPriority
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-card border-border'
                }`}
              >
                {/* Priority indicator */}
                <div className="flex-shrink-0 mt-1">
                  {isHighPriority ? (
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className={`font-semibold text-sm ${
                      isHighPriority ? 'text-emerald-900' : ''
                    }`}>
                      {step.action}
                    </h4>
                    {isHighPriority && (
                      <Badge
                        variant="secondary"
                        className="bg-emerald-500 text-white text-xs"
                      >
                        {priorityLabels[step.priority]}
                      </Badge>
                    )}
                  </div>
                  <p className={`text-xs mb-2 ${
                    isHighPriority
                      ? 'text-emerald-700'
                      : 'text-muted-foreground'
                  }`}>
                    {step.description}
                  </p>
                  <Button
                    variant={isHighPriority ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleAction(step)}
                    className={isHighPriority ? 'bg-emerald-500 hover:bg-emerald-600' : ''}
                  >
                    {isHighPriority ? 'Do This Now' : 'Start'}
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Progress indicator */}
        {steps.length > 5 && (
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Showing top 5 of {steps.length} recommendations
          </div>
        )}

        {/* Encouragement message */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            <span className="font-medium">You're making great progress!</span> Every step you take builds better money habits.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Minimal progress indicator for sidebar or header
 */
export function NextStepsIndicator({
  remainingSteps,
  onClick,
}: {
  remainingSteps: number;
  onClick?: () => void;
}) {
  if (remainingSteps === 0) {
    return (
      <div className="flex items-center gap-2 text-green-600">
        <CheckCircle2 className="h-4 w-4" />
        <span className="text-sm font-medium">All caught up!</span>
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 transition-colors"
    >
      <Sparkles className="h-4 w-4" />
      <span className="text-sm font-medium">
        {remainingSteps} {remainingSteps === 1 ? 'step' : 'steps'} remaining
      </span>
    </button>
  );
}
