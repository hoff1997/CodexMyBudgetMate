"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { PersonaType } from "@/lib/onboarding/personas";

// Step components
import { WelcomeStep } from "@/components/onboarding/steps/welcome-step";
import { ProfileStep } from "@/components/onboarding/steps/profile-step";
import { BankAccountsStep } from "@/components/onboarding/steps/bank-accounts-step";
import { IncomeStep } from "@/components/onboarding/steps/income-step";
import { BudgetingApproachStep } from "@/components/onboarding/steps/budgeting-approach-step";
import { EnvelopeEducationStep } from "@/components/onboarding/steps/envelope-education-step";
import { EnvelopeCreationStepV2 as EnvelopeCreationStep } from "@/components/onboarding/steps/envelope-creation-step-v2";
import { EnvelopeAllocationStep } from "@/components/onboarding/steps/envelope-allocation-step";
import { OpeningBalanceStep } from "@/components/onboarding/steps/opening-balance-step";
import { BudgetReviewStep } from "@/components/onboarding/steps/budget-review-step";
import { CompletionStep } from "@/components/onboarding/steps/completion-step";

// Types
export interface BankAccount {
  id: string;
  name: string;
  type: "checking" | "savings" | "credit_card";
  balance: number;
}

export interface IncomeSource {
  id: string;
  name: string;
  amount: number;
  frequency: "weekly" | "fortnightly" | "twice_monthly" | "monthly";
  nextPayDate: Date;
  irregularIncome: boolean;
}

export interface EnvelopeData {
  id: string;
  name: string;
  icon: string;
  type: "bill" | "spending" | "savings";
  // Bill fields
  billAmount?: number;
  frequency?: "monthly" | "quarterly" | "annual" | "custom";
  dueDate?: number; // day of month
  priority?: "essential" | "important" | "discretionary";
  // Spending fields
  monthlyBudget?: number;
  // Savings fields
  savingsAmount?: number;
  goalType?: "savings" | "emergency_fund" | "purchase" | "other";
  targetDate?: Date;
  // Calculated
  payCycleAmount?: number;
}

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
}

const STEPS: OnboardingStep[] = [
  { id: 1, title: "Welcome", description: "Set expectations" },
  { id: 2, title: "About You", description: "Profile & persona" },
  { id: 3, title: "Bank Accounts", description: "Connect accounts" },
  { id: 4, title: "Income", description: "Set up pay cycle" },
  { id: 5, title: "Approach", description: "Template or custom" },
  { id: 6, title: "Learn", description: "Envelope budgeting" },
  { id: 7, title: "Envelopes", description: "Create your budget" },
  { id: 8, title: "Allocate", description: "Fund your envelopes" },
  { id: 9, title: "Opening Balance", description: "Initial funds" },
  { id: 10, title: "Review", description: "Validate & adjust" },
  { id: 11, title: "Complete", description: "You're all set!" },
];

interface UnifiedOnboardingClientProps {
  isMobile: boolean;
}

export function UnifiedOnboardingClient({ isMobile }: UnifiedOnboardingClientProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Step data state
  const [fullName, setFullName] = useState("");
  const [persona, setPersona] = useState<PersonaType | undefined>();
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [useTemplate, setUseTemplate] = useState<boolean | undefined>();
  const [envelopes, setEnvelopes] = useState<EnvelopeData[]>([]);
  const [envelopeAllocations, setEnvelopeAllocations] = useState<{ [envelopeId: string]: { [incomeId: string]: number } }>({});
  const [openingBalances, setOpeningBalances] = useState<{ [envelopeId: string]: number }>({});

  const progress = (currentStep / STEPS.length) * 100;

  const handleNext = async () => {
    // Validation for each step
    if (currentStep === 2 && (!fullName || !persona)) {
      toast.error("Please enter your name and select a persona");
      return;
    }

    if (currentStep === 3 && bankAccounts.length === 0) {
      toast.error("Please add at least one bank account");
      return;
    }

    if (currentStep === 4 && incomeSources.length === 0) {
      toast.error("Please add at least one income source");
      return;
    }

    if (currentStep === 5 && useTemplate === undefined) {
      toast.error("Please choose how you'd like to set up your budget");
      return;
    }

    if (currentStep === 7 && envelopes.length === 0) {
      toast.error("Please create at least one envelope");
      return;
    }

    // Handle final step
    if (currentStep === STEPS.length) {
      await completeOnboarding();
      return;
    }

    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const completeOnboarding = async () => {
    setIsLoading(true);

    try {
      console.log("Starting onboarding completion...", {
        fullName,
        persona,
        bankAccounts: bankAccounts.length,
        incomeSources: incomeSources.length,
        envelopes: envelopes.length,
      });

      // Validate required data
      if (!fullName || fullName.trim() === "") {
        throw new Error("Please enter your name");
      }
      if (!persona) {
        throw new Error("Please select a persona");
      }
      if (envelopes.length === 0) {
        throw new Error("Please create at least one envelope");
      }
      if (incomeSources.length === 0) {
        throw new Error("Please add at least one income source");
      }

      // Save all onboarding data
      const response = await fetch("/api/onboarding/unified", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          persona,
          bankAccounts,
          incomeSources: incomeSources.map(source => ({
            ...source,
            nextPayDate: source.nextPayDate instanceof Date
              ? source.nextPayDate.toISOString()
              : new Date(source.nextPayDate).toISOString()
          })),
          envelopes,
          envelopeAllocations,
          openingBalances,
          completedAt: new Date().toISOString(),
        }),
      });

      const data = await response.json();
      console.log("API response:", data);

      if (!response.ok) {
        throw new Error(data.error || "Failed to save onboarding data");
      }

      // Award achievement (non-blocking)
      try {
        await fetch("/api/achievements/award", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            achievementKey: "budget_builder",
          }),
        });
      } catch (error) {
        console.warn("Achievement award failed (non-critical):", error);
      }

      toast.success("Your budget is ready!");

      // Small delay to ensure state is updated
      await new Promise(resolve => setTimeout(resolve, 500));

      console.log("Redirecting to dashboard...");
      router.push("/dashboard");
    } catch (error) {
      console.error("Onboarding completion error:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <WelcomeStep isMobile={isMobile} onContinue={handleNext} />;

      case 2:
        return (
          <ProfileStep
            fullName={fullName}
            persona={persona}
            onFullNameChange={setFullName}
            onPersonaChange={setPersona}
          />
        );

      case 3:
        return (
          <BankAccountsStep
            accounts={bankAccounts}
            onAccountsChange={setBankAccounts}
          />
        );

      case 4:
        return (
          <IncomeStep
            incomeSources={incomeSources}
            onIncomeSourcesChange={setIncomeSources}
          />
        );

      case 5:
        return (
          <BudgetingApproachStep
            useTemplate={useTemplate}
            onUseTemplateChange={setUseTemplate}
            persona={persona}
          />
        );

      case 6:
        return <EnvelopeEducationStep onContinue={handleNext} />;

      case 7:
        return (
          <EnvelopeCreationStep
            envelopes={envelopes}
            onEnvelopesChange={setEnvelopes}
            persona={persona}
            useTemplate={useTemplate}
            incomeSources={incomeSources}
          />
        );

      case 8:
        return (
          <EnvelopeAllocationStep
            envelopes={envelopes}
            incomeSources={incomeSources}
            onAllocationsChange={setEnvelopeAllocations}
          />
        );

      case 9:
        return (
          <OpeningBalanceStep
            envelopes={envelopes}
            incomeSources={incomeSources}
            bankAccounts={bankAccounts}
            onOpeningBalancesChange={setOpeningBalances}
          />
        );

      case 10:
        return (
          <BudgetReviewStep
            envelopes={envelopes}
            incomeSources={incomeSources}
            onEditEnvelopes={() => setCurrentStep(7)}
          />
        );

      case 11:
        return <CompletionStep isLoading={isLoading} onComplete={handleNext} />;

      default:
        return null;
    }
  };

  // Determine if "Continue" button should be shown
  const showContinueButton = ![1, 6, 11].includes(currentStep); // Steps with their own continue buttons

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="container max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">My Budget Mate</h1>
            <div className="text-sm text-muted-foreground">
              {currentStep > 1 && (
                <span>
                  Step {currentStep} of {STEPS.length}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {currentStep > 1 && (
        <div className="border-b bg-muted/30">
          <div className="container max-w-5xl mx-auto px-4 py-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{STEPS[currentStep - 1].description}</span>
                <span className="font-medium">{STEPS[currentStep - 1].title}</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="container max-w-5xl mx-auto px-4 py-12">
        <div className="mb-8">{renderStep()}</div>

        {/* Navigation */}
        {showContinueButton && (
          <div className="flex items-center justify-between max-w-2xl mx-auto mt-8">
            {currentStep > 1 && (
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            )}

            <Button
              onClick={handleNext}
              className="bg-emerald-500 hover:bg-emerald-600 ml-auto"
              disabled={isLoading}
            >
              {currentStep === STEPS.length ? "Finish" : "Continue"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
