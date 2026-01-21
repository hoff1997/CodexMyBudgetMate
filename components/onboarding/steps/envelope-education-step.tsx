"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, ArrowLeft, Zap, ShoppingBag, Target, PlayCircle } from "lucide-react";
import { RemyTip } from "@/components/onboarding/remy-tip";

interface EnvelopeEducationStepProps {
  onContinue: () => void;
  onBack?: () => void;
}

export function EnvelopeEducationStep({ onContinue, onBack }: EnvelopeEducationStepProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Remy's explanation */}
      <RemyTip pose="thinking">
        Envelopes are how you tell your money where to go. Each envelope has
        a job - rent, groceries, savings, whatever matters to you. When money
        comes in, you decide which envelopes it fills. That's it. Simple,
        intentional, and you're always in control.
      </RemyTip>

      {/* What is Envelope Budgeting */}
      <Card className="p-6 bg-gradient-to-br from-sage-very-light to-blue-light border-sage-light">
        <h3 className="text-xl font-semibold mb-4 text-text-dark">You Tell Your Money Where to Go</h3>
        <div className="space-y-3 text-text-medium">
          <p>
            Envelope budgeting is a proven method where <strong>you decide where your money goes once</strong>,
            then the system handles allocations automatically each pay cycle.
          </p>
          <p>
            You only need to revisit your setup if your expenses or income change.
            <strong> We use digital "envelopes"</strong> instead of cash, but the principle is the same:
            your money is organised, intentional, and always accounted for.
          </p>
        </div>
      </Card>

      {/* Video Placeholder */}
      <Card className="p-6 bg-gradient-to-r from-[#7A9E9A] to-[#6B9ECE] text-white">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
            <PlayCircle className="h-10 w-10" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold mb-1">Watch: How Envelope Budgeting Works</h3>
            <p className="text-sm text-white/90">
              2-minute video explaining the envelope budgeting method (Coming Soon)
            </p>
          </div>
        </div>
      </Card>

      {/* Three Types of Envelopes */}
      <div className="space-y-4">
        <h3 className="text-2xl font-semibold text-center mb-6">Three Types of Envelopes</h3>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Bills */}
          <Card className="p-6 border-2 border-[#5A7E7A] bg-[#5A7E7A]/10">
            <div className="w-12 h-12 bg-[#5A7E7A] rounded-lg flex items-center justify-center mb-4">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <h4 className="text-lg font-semibold mb-2">Bills</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Regular payments with due dates
            </p>
            <div className="space-y-1 text-sm">
              <p className="font-medium">Examples:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Rent or mortgage</li>
                <li>Power & internet</li>
                <li>Insurance payments</li>
                <li>Phone bill</li>
              </ul>
            </div>
          </Card>

          {/* Spending */}
          <Card className="p-6 border-2 border-[#5A7E7A] bg-[#5A7E7A]/10">
            <div className="w-12 h-12 bg-[#5A7E7A] rounded-lg flex items-center justify-center mb-4">
              <ShoppingBag className="h-6 w-6 text-white" />
            </div>
            <h4 className="text-lg font-semibold mb-2">Spending</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Budget limits for categories
            </p>
            <div className="space-y-1 text-sm">
              <p className="font-medium">Examples:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Groceries</li>
                <li>Takeaways & dining</li>
                <li>Entertainment</li>
                <li>Personal care</li>
              </ul>
            </div>
          </Card>

          {/* Savings */}
          <Card className="p-6 border-2 border-[#5A7E7A] bg-[#5A7E7A]/10">
            <div className="w-12 h-12 bg-[#5A7E7A] rounded-lg flex items-center justify-center mb-4">
              <Target className="h-6 w-6 text-white" />
            </div>
            <h4 className="text-lg font-semibold mb-2">Savings</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Money you&apos;re setting aside
            </p>
            <div className="space-y-1 text-sm">
              <p className="font-medium">Examples:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Emergency fund</li>
                <li>Holiday savings</li>
                <li>House deposit</li>
                <li>Surplus/buffer</li>
              </ul>
            </div>
          </Card>
        </div>
      </div>

      {/* How It Works */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">How Your Budget Will Work</h3>
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-[#7A9E9A] text-white flex items-center justify-center flex-shrink-0 font-semibold">
              1
            </div>
            <div>
              <p className="font-medium mb-1">Create envelopes for your expenses</p>
              <p className="text-sm text-muted-foreground">
                You&apos;ll set up envelopes for bills, spending categories, and savings goals. You will determine if the envelope is Essential, Important or Flexible
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-[#7A9E9A] text-white flex items-center justify-center flex-shrink-0 font-semibold">
              2
            </div>
            <div>
              <p className="font-medium mb-1">We calculate how much per paycheck</p>
              <p className="text-sm text-muted-foreground">
                Based on your pay frequency, we&apos;ll show exactly how much to allocate to each envelope every payday
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-[#7A9E9A] text-white flex items-center justify-center flex-shrink-0 font-semibold">
              3
            </div>
            <div>
              <p className="font-medium mb-1">Remy remembers and allocates</p>
              <p className="text-sm text-muted-foreground">
                Each pay cycle, Remy automatically allocates your income to your envelopes. You just confirm.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-[#7A9E9A] text-white flex items-center justify-center flex-shrink-0 font-semibold">
              4
            </div>
            <div>
              <p className="font-medium mb-1">You&apos;re in control of your spending</p>
              <p className="text-sm text-muted-foreground">
                Track your spending against each envelope. You decide how to use your allocated funds.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Remy's encouragement */}
      <RemyTip pose="encouraging">
        Don&apos;t stress about getting this perfect. Start with your essentials -
        the must-pays. You can add more envelopes anytime. Future you will thank
        you for keeping it simple.
      </RemyTip>

      {/* CTA */}
      <div className="flex flex-col items-center gap-4 pt-4">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button
              onClick={onBack}
              variant="outline"
              size="lg"
            >
              <ArrowLeft className="mr-2 h-5 w-5" />
              Back
            </Button>
          )}
          <Button
            onClick={onContinue}
            size="lg"
            className="bg-[#7A9E9A] hover:bg-[#5A7E7A] text-lg px-8"
          >
            I Understand - Let&apos;s Create My Envelopes
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>

        <p className="text-sm text-muted-foreground text-center">
          Take your time and be thorough - this is where the magic happens
        </p>
      </div>
    </div>
  );
}
