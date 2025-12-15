"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight, FileText, AlertCircle } from "lucide-react";

interface WelcomeStepProps {
  isMobile: boolean;
  onContinue: () => void;
}

export function WelcomeStep({ isMobile, onContinue }: WelcomeStepProps) {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* Hero Section - Compact */}
      <div className="text-center">
        <div className="text-5xl mb-2">💰</div>
        <h1 className="text-3xl font-bold">Welcome to My Budget Mate</h1>
        <p className="text-muted-foreground mt-1">
          Envelope budgeting: <strong>tell your money where to go</strong> instead of wondering where it went.
        </p>
      </div>

      {/* Two Column Layout */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* What is Envelope Budgeting */}
        <div className="rounded-lg border-2 border-[#6B9ECE] bg-[#DDEAF5] p-4">
          <h3 className="font-semibold text-text-dark mb-2">💡 How It Works</h3>
          <p className="text-sm text-text-medium">
            Assign every dollar to a digital envelope before you spend it: bills, savings, groceries, fun.
            Simple, intentional, powerful.
          </p>
          <p className="text-sm text-text-medium mt-2 font-medium">
            This is THE key to taking control. The time you invest now pays off every pay cycle.
          </p>
        </div>

        {/* What to Prepare - Condensed */}
        <div className="rounded-lg border bg-card p-4">
          <h3 className="flex items-center gap-2 font-semibold mb-2">
            <FileText className="h-4 w-4 text-[#7A9E9A]" />
            Have Ready:
          </h3>
          <ul className="space-y-1 text-sm">
            <li className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#7A9E9A] text-white text-xs flex items-center justify-center flex-shrink-0">1</span>
              <span>Recent bank statements (1-3 months)</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#7A9E9A] text-white text-xs flex items-center justify-center flex-shrink-0">2</span>
              <span>List of bills (amounts, due dates)</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#7A9E9A] text-white text-xs flex items-center justify-center flex-shrink-0">3</span>
              <span>Payslip (frequency &amp; net pay)</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#7A9E9A] text-white text-xs flex items-center justify-center flex-shrink-0">4</span>
              <span>Current account balances</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Mobile Warning - Inline */}
      {isMobile && (
        <div className="flex items-center gap-2 rounded-lg border border-[#D4A853] bg-[#F5E6C4] p-3 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0 text-[#D4A853]" />
          <span className="text-text-dark">Setup works best on a larger screen, but you can continue on mobile.</span>
        </div>
      )}

      {/* CTA - Compact */}
      <div className="flex flex-col items-center gap-2 pt-2">
        <Button
          onClick={onContinue}
          size="lg"
          className="bg-[#7A9E9A] px-8 text-lg hover:bg-[#5A7E7A]"
        >
          I&apos;m Ready - Let&apos;s Begin
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
        <p className="text-xs text-muted-foreground">
          You can save and come back at any time
        </p>
      </div>
    </div>
  );
}
