"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { RemyAvatar } from "@/components/onboarding/remy-tip";
import confetti from "canvas-confetti";

interface CompletionStepProps {
  isLoading: boolean;
  onComplete: () => void;
}

export function CompletionStep({ isLoading, onComplete }: CompletionStepProps) {
  // Fire confetti on mount
  useEffect(() => {
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: ["#7A9E9A", "#D4A853", "#6B9ECE"],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: ["#7A9E9A", "#D4A853", "#6B9ECE"],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Remy celebrating */}
      <div className="text-center">
        <RemyAvatar pose="celebrating" size="xl" className="mx-auto mb-6 border-gold" />
        <h1 className="text-3xl font-bold text-text-dark mb-2">You legend!</h1>
        <p className="text-muted-foreground text-lg">
          You've just done something most people put off forever
        </p>
      </div>

      {/* Remy's celebration message */}
      <div className="bg-sage-very-light rounded-xl p-6 border border-sage-light">
        <p className="text-sage-dark leading-relaxed">
          "You've told your money where to go. That's huge!
        </p>
        <p className="text-sage-dark leading-relaxed mt-3">
          Now comes the practice part - sticking with it, adjusting as you
          learn, and building the habit. I'll be here every step of the way.
        </p>
        <p className="text-sage-dark leading-relaxed mt-3">
          You've got this. Seriously."
        </p>
        <p className="text-xs text-sage mt-3 font-medium">- Remy, your financial coach</p>
      </div>

      {/* First goal hint */}
      <Card className="p-4 bg-gold-light border border-gold">
        <p className="text-sm text-gold-dark font-medium">
          🛡️ Your first goal: Save $1,000 in your Starter Emergency Fund
        </p>
        <p className="text-xs text-gold-dark mt-1">
          This unlocks your first achievement badge!
        </p>
      </Card>

      {/* What Happens Next */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg text-center text-text-dark">What Happens Next?</h3>

        <div className="grid md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 bg-sage-very-light rounded-full mx-auto flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
              <div>
                <p className="font-semibold text-text-dark">Your Dashboard Awaits</p>
                <p className="text-sm text-muted-foreground">
                  View your envelopes, track spending, and monitor your budget
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 bg-blue-light rounded-full mx-auto flex items-center justify-center">
                <span className="text-2xl">💳</span>
              </div>
              <div>
                <p className="font-semibold text-text-dark">Start Logging Transactions</p>
                <p className="text-sm text-muted-foreground">
                  Record your spending to track envelope balances
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 bg-gold-light rounded-full mx-auto flex items-center justify-center">
                <span className="text-2xl">🎯</span>
              </div>
              <div>
                <p className="font-semibold text-text-dark">Follow Next Steps</p>
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
        <h3 className="font-semibold mb-3 flex items-center gap-2 text-text-dark">
          <CheckCircle2 className="h-5 w-5 text-sage" />
          Available in Your Dashboard
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-sage mt-0.5 flex-shrink-0" />
            <p><strong>Set up debt payoff plans</strong> - Track and eliminate debt strategically</p>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-sage mt-0.5 flex-shrink-0" />
            <p><strong>Create savings goals</strong> - Save toward specific targets with milestones</p>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-sage mt-0.5 flex-shrink-0" />
            <p><strong>Connect your bank</strong> - Import transactions automatically</p>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-sage mt-0.5 flex-shrink-0" />
            <p><strong>Set up bill reminders</strong> - Never miss a payment</p>
          </div>
        </div>
      </Card>

      {/* Motivational Message */}
      <div className="bg-gradient-to-br from-sage-very-light to-blue-light border-2 border-sage-light rounded-lg p-6 text-center">
        <p className="text-lg font-medium text-text-dark mb-2">
          You've just taken the most important step toward financial control 💪
        </p>
        <p className="text-sm text-text-medium">
          Remember: budgeting isn't about restriction, it's about <strong>giving yourself permission</strong> to spend
          within your plan. You've got this!
        </p>
      </div>

      {/* CTA */}
      <div className="flex flex-col items-center gap-4 pt-4">
        {isLoading ? (
          <Button size="lg" disabled className="bg-sage text-lg px-8">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Setting up your dashboard...
          </Button>
        ) : (
          <Button
            onClick={onComplete}
            size="lg"
            className="bg-sage hover:bg-sage-dark text-lg px-8"
          >
            Go to Dashboard
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        )}

        <p className="text-sm text-muted-foreground">
          Your data is saved, you can explore at your own pace
        </p>
      </div>
    </div>
  );
}
