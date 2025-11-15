"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight, Clock, FileText, CreditCard, Calendar, AlertCircle } from "lucide-react";

interface WelcomeStepProps {
  isMobile: boolean;
  onContinue: () => void;
}

export function WelcomeStep({ isMobile, onContinue }: WelcomeStepProps) {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <div className="text-6xl mb-4">💰</div>
        <h1 className="text-4xl font-bold">Welcome to My Budget Mate</h1>
        <p className="text-xl text-muted-foreground">
          You're about to set up your complete envelope budgeting system
        </p>
      </div>

      {/* Time Commitment Warning */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <Clock className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold text-blue-900 text-lg mb-2">Time Required: 20-30 minutes</h3>
            <p className="text-blue-700">
              This is a focused planning exercise that will set you up for budgeting success.
              Take your time to do it right - it's worth the investment!
            </p>
          </div>
        </div>
      </div>

      {/* What to Prepare */}
      <div className="bg-card border rounded-lg p-6 space-y-4">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <FileText className="h-5 w-5 text-emerald-600" />
          Before You Begin - Gather These Documents:
        </h3>

        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
            <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">
              1
            </div>
            <div>
              <p className="font-medium">Recent Bank Statements</p>
              <p className="text-sm text-muted-foreground">Last 1-3 months to understand your spending patterns</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
            <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">
              2
            </div>
            <div>
              <p className="font-medium">List of Regular Bills</p>
              <p className="text-sm text-muted-foreground">
                Bill amounts, due dates, and frequency (electricity, internet, insurance, etc.)
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
            <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">
              3
            </div>
            <div>
              <p className="font-medium">Payslip Information</p>
              <p className="text-sm text-muted-foreground">
                Your pay frequency (weekly, fortnightly, monthly) and net pay amount
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
            <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">
              4
            </div>
            <div>
              <p className="font-medium">Current Account Balances (Optional)</p>
              <p className="text-sm text-muted-foreground">
                For an accurate starting point, but not required
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* What is Envelope Budgeting? */}
      <div className="bg-gradient-to-br from-emerald-50 to-blue-50 border border-emerald-200 rounded-lg p-6">
        <h3 className="font-semibold text-lg mb-3">💡 What is Envelope Budgeting?</h3>
        <p className="text-sm text-gray-700 mb-4">
          Envelope budgeting is a proven method where <strong>every dollar has a job</strong>. You decide where your money goes
          before you spend it - just like putting cash into labeled envelopes. We'll help you create digital envelopes
          for your bills, spending, and savings goals.
        </p>
        <p className="text-sm text-gray-700">
          <strong>This is THE key to taking control of your money.</strong> The time you invest now will pay off every single pay cycle.
        </p>
      </div>

      {/* Mobile Warning */}
      {isMobile && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900">
            <p className="font-medium mb-1">Heads up!</p>
            <p>Setup works best on a larger screen, but you can continue on mobile if needed.</p>
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="flex flex-col items-center gap-4 pt-4">
        <Button
          onClick={onContinue}
          size="lg"
          className="bg-emerald-500 hover:bg-emerald-600 text-lg px-8"
        >
          I'm Ready - Let's Begin
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>

        <p className="text-sm text-muted-foreground">
          You can save and come back at any time
        </p>
      </div>
    </div>
  );
}
