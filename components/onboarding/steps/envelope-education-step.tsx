"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Zap, ShoppingBag, PiggyBank, CheckCircle2, PlayCircle } from "lucide-react";

interface EnvelopeEducationStepProps {
  onContinue: () => void;
}

export function EnvelopeEducationStep({ onContinue }: EnvelopeEducationStepProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="text-6xl mb-2">📬</div>
        <h2 className="text-4xl font-bold">Understanding Envelope Budgeting</h2>
        <p className="text-xl text-muted-foreground">
          This is THE key to taking control of your money
        </p>
      </div>

      {/* What is Envelope Budgeting */}
      <Card className="p-6 bg-gradient-to-br from-emerald-50 to-blue-50 border-emerald-200">
        <h3 className="text-2xl font-semibold mb-4">Every Dollar Has a Job</h3>
        <div className="space-y-3 text-gray-700">
          <p className="text-lg">
            Envelope budgeting is a proven method where <strong>you decide where your money goes before you spend it</strong>.
          </p>
          <p>
            Think of it like the old-school method: putting cash into labeled envelopes for different expenses.
            When the envelope is empty, you stop spending in that category until the next pay cycle.
          </p>
          <p>
            <strong>We use digital "envelopes"</strong> instead of cash, but the principle is the same:
            your money is organized, intentional, and always accounted for.
          </p>
        </div>
      </Card>

      {/* Video Placeholder */}
      <Card className="p-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white">
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
          <Card className="p-6 border-2 border-amber-200 bg-amber-50/50">
            <div className="w-12 h-12 bg-amber-500 rounded-lg flex items-center justify-center mb-4">
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
          <Card className="p-6 border-2 border-blue-200 bg-blue-50/50">
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mb-4">
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
          <Card className="p-6 border-2 border-emerald-200 bg-emerald-50/50">
            <div className="w-12 h-12 bg-emerald-500 rounded-lg flex items-center justify-center mb-4">
              <PiggyBank className="h-6 w-6 text-white" />
            </div>
            <h4 className="text-lg font-semibold mb-2">Savings</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Money you're setting aside
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
            <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 font-semibold">
              1
            </div>
            <div>
              <p className="font-medium mb-1">Create envelopes for your expenses</p>
              <p className="text-sm text-muted-foreground">
                You'll set up envelopes for bills, spending categories, and savings goals
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 font-semibold">
              2
            </div>
            <div>
              <p className="font-medium mb-1">We calculate how much per paycheck</p>
              <p className="text-sm text-muted-foreground">
                Based on your pay frequency, we'll show exactly how much to allocate to each envelope every payday
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 font-semibold">
              3
            </div>
            <div>
              <p className="font-medium mb-1">Each pay cycle, allocate money to envelopes</p>
              <p className="text-sm text-muted-foreground">
                When you get paid, you'll fund your envelopes according to the plan
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 font-semibold">
              4
            </div>
            <div>
              <p className="font-medium mb-1">Spend only from the envelope's available amount</p>
              <p className="text-sm text-muted-foreground">
                Track your spending and stay within each envelope's balance. No overspending!
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Why This Takes Time */}
      <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-6">
        <h3 className="font-semibold text-amber-900 text-lg mb-3">
          Why This Step Takes 10-15 Minutes
        </h3>
        <div className="space-y-2 text-sm text-amber-800">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p>
              <strong>You're building a complete financial plan</strong> - not just a rough estimate
            </p>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p>
              <strong>Accuracy now = better budgeting later</strong> - getting the details right saves time down the road
            </p>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p>
              <strong>This is THE measure of your success</strong> - envelope budgeting is how you take control
            </p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="flex flex-col items-center gap-4 pt-4">
        <Button
          onClick={onContinue}
          size="lg"
          className="bg-emerald-500 hover:bg-emerald-600 text-lg px-8"
        >
          I Understand - Let's Create My Envelopes
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>

        <p className="text-sm text-muted-foreground text-center">
          Take your time and be thorough - this is where the magic happens ✨
        </p>
      </div>
    </div>
  );
}
