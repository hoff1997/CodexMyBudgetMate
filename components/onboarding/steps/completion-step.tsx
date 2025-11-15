"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Loader2, Trophy, CheckCircle2 } from "lucide-react";

interface CompletionStepProps {
  isLoading: boolean;
  onComplete: () => void;
}

export function CompletionStep({ isLoading, onComplete }: CompletionStepProps) {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Success Animation */}
      <div className="text-center space-y-4">
        <div className="text-8xl mb-4 animate-bounce">🎉</div>
        <h1 className="text-4xl font-bold">You&apos;re All Set!</h1>
        <p className="text-xl text-muted-foreground">
          Congratulations! Your envelope budget is ready to go.
        </p>
      </div>

      {/* Achievement Badge */}
      <Card className="p-8 bg-gradient-to-r from-emerald-500 to-blue-500 text-white">
        <div className="flex flex-col items-center text-center gap-4">
          <Trophy className="h-16 w-16" />
          <div>
            <h3 className="font-bold text-2xl mb-1">Achievement Unlocked!</h3>
            <h4 className="text-lg font-semibold">Budget Builder</h4>
            <p className="text-sm text-white/90 mt-2">
              You've completed your budget setup! You&apos;re on the path to financial freedom.
            </p>
          </div>
          <div className="bg-white/20 rounded-full px-4 py-1 text-sm font-semibold">
            +10 points
          </div>
        </div>
      </Card>

      {/* What Happens Next */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg text-center">What Happens Next?</h3>

        <div className="grid md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 bg-emerald-100 rounded-full mx-auto flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
              <div>
                <p className="font-semibold">Your Dashboard Awaits</p>
                <p className="text-sm text-muted-foreground">
                  View your envelopes, track spending, and monitor your budget
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full mx-auto flex items-center justify-center">
                <span className="text-2xl">💳</span>
              </div>
              <div>
                <p className="font-semibold">Start Logging Transactions</p>
                <p className="text-sm text-muted-foreground">
                  Record your spending to track envelope balances
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 bg-purple-100 rounded-full mx-auto flex items-center justify-center">
                <span className="text-2xl">🎯</span>
              </div>
              <div>
                <p className="font-semibold">Follow Next Steps</p>
                <p className="text-sm text-muted-foreground">
                  Complete guided actions to build your financial system
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Deferred Features */}
      <Card className="p-6 bg-muted/50">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          Available in Your Dashboard
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
            <p><strong>Set up debt payoff plans</strong> - Track and eliminate debt strategically</p>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
            <p><strong>Create savings goals</strong> - Save toward specific targets with milestones</p>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
            <p><strong>Connect your bank</strong> - Import transactions automatically</p>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
            <p><strong>Set up bill reminders</strong> - Never miss a payment</p>
          </div>
        </div>
      </Card>

      {/* Motivational Message */}
      <div className="bg-gradient-to-br from-emerald-50 to-blue-50 border-2 border-emerald-200 rounded-lg p-6 text-center">
        <p className="text-lg font-medium text-gray-800 mb-2">
          You've just taken the most important step toward financial control 💪
        </p>
        <p className="text-sm text-gray-600">
          Remember: budgeting isn&apos;t about restriction - it&apos;s about <strong>giving yourself permission</strong> to spend
          within your plan. You've got this!
        </p>
      </div>

      {/* CTA */}
      <div className="flex flex-col items-center gap-4 pt-4">
        {isLoading ? (
          <Button size="lg" disabled className="bg-emerald-500 text-lg px-8">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Setting up your dashboard...
          </Button>
        ) : (
          <Button
            onClick={onComplete}
            size="lg"
            className="bg-emerald-500 hover:bg-emerald-600 text-lg px-8"
          >
            Go to Dashboard
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        )}

        <p className="text-sm text-muted-foreground">
          Your data is saved - you can explore at your own pace
        </p>
      </div>
    </div>
  );
}
