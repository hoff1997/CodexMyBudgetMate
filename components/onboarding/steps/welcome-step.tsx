"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight, FileText, AlertCircle } from "lucide-react";
import { RemyAvatar } from "@/components/onboarding/remy-tip";

interface WelcomeStepProps {
  isMobile: boolean;
  onContinue: () => void;
}

export function WelcomeStep({ isMobile, onContinue }: WelcomeStepProps) {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* Hero Section with Remy */}
      <div className="text-center">
        <RemyAvatar pose="welcome" size="lg" className="mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-text-dark">Kia ora! I'm Remy</h1>
        <p className="text-muted-foreground mt-1">
          Your paddling partner on your money journey
        </p>
      </div>

      {/* Remy's intro speech */}
      <div className="bg-sage-very-light rounded-xl p-5 border border-sage-light">
        <p className="text-sage-dark leading-relaxed">
          "Think of me as the one paddling the waka while you chart the course.
          I'll help you get your money sorted, step by step.
        </p>
        <p className="text-sage-dark leading-relaxed mt-3">
          When you tell your money where to go, you stop wondering where it went.
          Let's get started. It only takes a few minutes."
        </p>
        <p className="text-xs text-sage mt-3 font-medium">Remy</p>
      </div>

      {/* Two Column Layout */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* What is Envelope Budgeting */}
        <div className="rounded-lg border-2 border-blue bg-blue-light p-4">
          <h3 className="font-semibold text-text-dark mb-2">How It Works</h3>
          <p className="text-sm text-text-medium">
            Assign every dollar to a digital envelope before you spend it: bills, savings, groceries, fun.
            Simple, intentional, powerful.
          </p>
          <p className="text-sm text-text-medium mt-2 font-medium">
            This is the key to taking control. The time you invest now pays off every pay cycle.
          </p>
        </div>

        {/* What to Prepare - Condensed */}
        <div className="rounded-lg border bg-card p-4">
          <h3 className="flex items-center gap-2 font-semibold mb-2">
            <FileText className="h-4 w-4 text-sage" />
            Have Ready:
          </h3>
          <ul className="space-y-1 text-sm">
            <li className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-sage text-white text-xs flex items-center justify-center flex-shrink-0">1</span>
              <span>Recent bank statements (1-3 months)</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-sage text-white text-xs flex items-center justify-center flex-shrink-0">2</span>
              <span>List of bills (amounts, due dates)</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-sage text-white text-xs flex items-center justify-center flex-shrink-0">3</span>
              <span>Payslip (frequency &amp; net pay)</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-sage text-white text-xs flex items-center justify-center flex-shrink-0">4</span>
              <span>Current account balances</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Mobile Warning - Inline */}
      {isMobile && (
        <div className="flex items-center gap-2 rounded-lg border border-gold bg-gold-light p-3 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0 text-gold" />
          <span className="text-text-dark">Setup works best on a larger screen, but you can continue on mobile.</span>
        </div>
      )}

      {/* CTA - Compact */}
      <div className="flex flex-col items-center gap-2 pt-2">
        <Button
          onClick={onContinue}
          size="lg"
          className="bg-sage px-8 text-lg hover:bg-sage-dark"
        >
          Let's do this
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
        <p className="text-xs text-muted-foreground">
          You can save and come back at any time
        </p>
      </div>
    </div>
  );
}
