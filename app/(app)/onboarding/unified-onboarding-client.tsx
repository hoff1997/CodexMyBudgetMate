"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Loader2, Save, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

// Step components
import { WelcomeStep } from "@/components/onboarding/steps/welcome-step";
import { ProfileStep } from "@/components/onboarding/steps/profile-step";
import { BankAccountsStep } from "@/components/onboarding/steps/bank-accounts-step";
import { CreditCardForkStep } from "@/components/onboarding/credit-card";
import { IncomeStep } from "@/components/onboarding/steps/income-step";
import { BudgetingApproachStep } from "@/components/onboarding/steps/budgeting-approach-step";
import { EnvelopeEducationStep } from "@/components/onboarding/steps/envelope-education-step";
import { EnvelopeCreationStepV2 as EnvelopeCreationStep } from "@/components/onboarding/steps/envelope-creation-step-v2";
import { EnvelopeAllocationStep } from "@/components/onboarding/steps/envelope-allocation-step";
import { OpeningBalanceStep } from "@/components/onboarding/steps/opening-balance-step";
import { BudgetReviewStep } from "@/components/onboarding/steps/budget-review-step";
import { CompletionStep } from "@/components/onboarding/steps/completion-step";

// Credit card types
import type { CreditCardConfig } from "@/lib/types/credit-card-onboarding";

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
  type: "bill" | "spending" | "savings" | "goal" | "tracking";
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
  // Category and ordering
  category?: string; // Category ID (built-in or custom)
  sortOrder?: number; // Order within category for drag-and-drop
}

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
}

const STEPS: OnboardingStep[] = [
  { id: 1, title: "Welcome", description: "Set expectations" },
  { id: 2, title: "About You", description: "Your name" },
  { id: 3, title: "Bank Accounts", description: "Connect accounts" },
  { id: 4, title: "Credit Cards", description: "Configure cards" },
  { id: 5, title: "Income", description: "Set up pay cycle" },
  { id: 6, title: "Approach", description: "Template or custom" },
  { id: 7, title: "Learn", description: "Envelope budgeting" },
  { id: 8, title: "Envelopes", description: "Create your budget" },
  { id: 9, title: "Budget Manager", description: "Set targets & allocate" },
  { id: 10, title: "Opening Balance", description: "Initial funds" },
  { id: 11, title: "Review", description: "Validate & adjust" },
  { id: 12, title: "Complete", description: "You're all set!" },
];

interface UnifiedOnboardingClientProps {
  isMobile: boolean;
}

// Autosave debounce delay in ms
const AUTOSAVE_DELAY = 2000;

export function UnifiedOnboardingClient({ isMobile }: UnifiedOnboardingClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDraft, setIsLoadingDraft] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  // Step data state
  const [fullName, setFullName] = useState("");
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [creditCardConfigs, setCreditCardConfigs] = useState<CreditCardConfig[]>([]);
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [useTemplate, setUseTemplate] = useState<boolean | undefined>(true);
  const [envelopes, setEnvelopes] = useState<EnvelopeData[]>([]);
  const [customCategories, setCustomCategories] = useState<{ id: string; label: string; icon: string }[]>([]);
  const [categoryOrder, setCategoryOrder] = useState<string[]>([]);
  const [envelopeAllocations, setEnvelopeAllocations] = useState<{ [envelopeId: string]: { [incomeId: string]: number } }>({});
  const [openingBalances, setOpeningBalances] = useState<{ [envelopeId: string]: number }>({});
  const [creditCardOpeningAllocation, setCreditCardOpeningAllocation] = useState(0);

  // Ref for debouncing autosave
  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasLoadedDraft = useRef(false);

  const progress = (currentStep / STEPS.length) * 100;

  // Load existing draft on mount OR handle preview mode
  useEffect(() => {
    if (hasLoadedDraft.current) return;
    hasLoadedDraft.current = true;

    // Check for preview mode via URL parameter: /onboarding?step=7
    const stepParam = searchParams.get("step");
    if (stepParam) {
      const stepNum = parseInt(stepParam, 10);
      if (stepNum >= 1 && stepNum <= STEPS.length) {
        setPreviewMode(true);
        setCurrentStep(stepNum);
        // Set some dummy data for preview
        setFullName("Preview User");
        setBankAccounts([{ id: "preview-1", name: "Preview Account", type: "checking", balance: 5000 }]);
        setIncomeSources([{
          id: "preview-income",
          name: "Preview Salary",
          amount: 3000,
          frequency: "fortnightly",
          nextPayDate: new Date(),
          irregularIncome: false,
        }]);
        setIsLoadingDraft(false);
        toast.info(`Preview mode: Step ${stepNum} of ${STEPS.length}`);
        return;
      }
    }

    async function loadDraft() {
      try {
        const response = await fetch("/api/onboarding/autosave");
        if (!response.ok) {
          setIsLoadingDraft(false);
          return;
        }

        const data = await response.json();
        if (data.hasDraft && data.draft) {
          const draft = data.draft;
          setCurrentStep(draft.currentStep || 1);
          setFullName(draft.fullName || "");
          setBankAccounts(draft.bankAccounts || []);
          setCreditCardConfigs(draft.creditCardConfigs || []);
          // Convert date strings back to Date objects for income sources
          setIncomeSources((draft.incomeSources || []).map((source: any) => ({
            ...source,
            nextPayDate: source.nextPayDate ? new Date(source.nextPayDate) : new Date(),
          })));
          setUseTemplate(draft.useTemplate ?? true);
          setEnvelopes(draft.envelopes || []);
          setEnvelopeAllocations(draft.envelopeAllocations || {});
          setOpeningBalances(draft.openingBalances || {});
          setLastSaved(draft.lastSavedAt ? new Date(draft.lastSavedAt) : null);

          if (draft.currentStep > 1) {
            toast.success("Welcome back! Your progress has been restored.");
          }
        }
      } catch (error) {
        console.error("Failed to load draft:", error);
      } finally {
        setIsLoadingDraft(false);
      }
    }

    loadDraft();
  }, [searchParams]);

  // Autosave function
  const saveProgress = useCallback(async () => {
    // Don't save if on welcome step or completion step
    if (currentStep <= 1 || currentStep === STEPS.length) return;

    setIsSaving(true);
    try {
      const response = await fetch("/api/onboarding/autosave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentStep,
          fullName,
          bankAccounts,
          creditCardConfigs,
          incomeSources: incomeSources.map(source => ({
            ...source,
            nextPayDate: source.nextPayDate instanceof Date
              ? source.nextPayDate.toISOString()
              : source.nextPayDate,
          })),
          useTemplate,
          envelopes,
          envelopeAllocations,
          openingBalances,
        }),
      });

      if (response.ok) {
        setLastSaved(new Date());
      }
    } catch (error) {
      console.error("Autosave failed:", error);
    } finally {
      setIsSaving(false);
    }
  }, [currentStep, fullName, bankAccounts, creditCardConfigs, incomeSources, useTemplate, envelopes, envelopeAllocations, openingBalances]);

  // Debounced autosave on data changes
  useEffect(() => {
    if (isLoadingDraft || currentStep <= 1) return;

    // Clear existing timeout
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }

    // Set new timeout for autosave
    autosaveTimeoutRef.current = setTimeout(() => {
      saveProgress();
    }, AUTOSAVE_DELAY);

    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, [currentStep, fullName, bankAccounts, creditCardConfigs, incomeSources, useTemplate, envelopes, envelopeAllocations, openingBalances, isLoadingDraft, saveProgress]);

  // Save immediately when changing steps
  useEffect(() => {
    if (!isLoadingDraft && currentStep > 1 && currentStep < STEPS.length) {
      saveProgress();
    }
  }, [currentStep, isLoadingDraft, saveProgress]);

  // Check if there are any credit cards to configure
  const creditCardAccounts = bankAccounts.filter(acc => acc.type === "credit_card");
  const hasCreditCards = creditCardAccounts.length > 0;

  const handleNext = async () => {
    // Validation for each step
    if (currentStep === 2 && !fullName) {
      toast.error("Please enter your name");
      return;
    }

    if (currentStep === 3 && bankAccounts.length === 0) {
      toast.error("Please add at least one bank account");
      return;
    }

    // Step 4: Credit Cards - skip if no credit cards
    if (currentStep === 4 && !hasCreditCards) {
      // Auto-skip to Income step if no credit cards
      setCurrentStep(5);
      return;
    }

    if (currentStep === 5 && incomeSources.length === 0) {
      toast.error("Please add at least one income source");
      return;
    }

    if (currentStep === 6 && useTemplate === undefined) {
      toast.error("Please choose how you'd like to set up your budget");
      return;
    }

    if (currentStep === 8 && envelopes.length === 0) {
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
        bankAccounts: bankAccounts.length,
        incomeSources: incomeSources.length,
        envelopes: envelopes.length,
      });

      // Validate required data
      if (!fullName || fullName.trim() === "") {
        throw new Error("Please enter your name");
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
          bankAccounts,
          creditCardConfigs, // Credit card configurations
          incomeSources: incomeSources.map(source => ({
            ...source,
            nextPayDate: source.nextPayDate instanceof Date
              ? source.nextPayDate.toISOString()
              : new Date(source.nextPayDate).toISOString()
          })),
          envelopes,
          envelopeAllocations,
          openingBalances,
          creditCardOpeningAllocation, // Amount set aside for CC holding
          customCategories, // Pass custom categories
          categoryOrder, // Pass category order for sorting
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
            achievementKey: "onboarding_complete",
          }),
        });
      } catch (error) {
        console.warn("Achievement award failed (non-critical):", error);
      }

      // Delete the draft since onboarding is complete
      try {
        await fetch("/api/onboarding/autosave", { method: "DELETE" });
      } catch (error) {
        console.warn("Failed to delete draft (non-critical):", error);
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

  // Handle credit card config completion
  const handleCreditCardConfigComplete = (configs: CreditCardConfig[]) => {
    setCreditCardConfigs(configs);
    setCurrentStep(5); // Move to Income step
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <WelcomeStep isMobile={isMobile} onContinue={handleNext} />;

      case 2:
        return (
          <ProfileStep
            fullName={fullName}
            onFullNameChange={setFullName}
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
        // Credit Cards step - only shown if there are credit cards
        if (!hasCreditCards) {
          // Auto-advance if no credit cards (shouldn't reach here due to handleNext logic)
          return null;
        }
        return (
          <CreditCardForkStep
            creditCards={creditCardAccounts.map(acc => ({
              id: acc.id,
              name: acc.name,
              current_balance: acc.balance,
            }))}
            onComplete={handleCreditCardConfigComplete}
            onBack={handleBack}
          />
        );

      case 5:
        return (
          <IncomeStep
            incomeSources={incomeSources}
            onIncomeSourcesChange={setIncomeSources}
          />
        );

      case 6:
        return (
          <BudgetingApproachStep
            useTemplate={useTemplate}
            onUseTemplateChange={setUseTemplate}
          />
        );

      case 7:
        return <EnvelopeEducationStep onContinue={handleNext} />;

      case 8:
        return (
          <EnvelopeCreationStep
            envelopes={envelopes}
            onEnvelopesChange={setEnvelopes}
            customCategories={customCategories}
            onCustomCategoriesChange={setCustomCategories}
            categoryOrder={categoryOrder}
            onCategoryOrderChange={setCategoryOrder}
            useTemplate={useTemplate}
            incomeSources={incomeSources}
          />
        );

      case 9:
        return (
          <EnvelopeAllocationStep
            envelopes={envelopes}
            incomeSources={incomeSources}
            onAllocationsChange={setEnvelopeAllocations}
          />
        );

      case 10:
        return (
          <OpeningBalanceStep
            envelopes={envelopes}
            incomeSources={incomeSources}
            bankAccounts={bankAccounts}
            envelopeAllocations={envelopeAllocations}
            onOpeningBalancesChange={setOpeningBalances}
            onCreditCardAllocationChange={setCreditCardOpeningAllocation}
          />
        );

      case 11:
        return (
          <BudgetReviewStep
            envelopes={envelopes}
            incomeSources={incomeSources}
            onEditEnvelopes={() => setCurrentStep(8)}
          />
        );

      case 12:
        return <CompletionStep isLoading={isLoading} onComplete={handleNext} />;

      default:
        return null;
    }
  };

  // Determine if "Continue" button should be shown
  // Steps with their own continue buttons: Welcome (1), Credit Cards (4), Envelope Education (7), Complete (12)
  const showContinueButton = ![1, 4, 7, 12].includes(currentStep);

  // Show loading state while fetching draft
  if (isLoadingDraft) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-[#7A9E9A]" />
          <p className="text-muted-foreground">Loading your progress...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="container max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">My Budget Mate</h1>
            <div className="flex items-center gap-4">
              {/* Autosave indicator */}
              {currentStep > 1 && currentStep < STEPS.length && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {isSaving ? (
                    <>
                      <Save className="h-3.5 w-3.5 animate-pulse" />
                      <span>Saving...</span>
                    </>
                  ) : lastSaved ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-[#7A9E9A]" />
                      <span>Saved</span>
                    </>
                  ) : null}
                </div>
              )}
              {currentStep > 1 && (
                <span className="text-sm text-muted-foreground">
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
              className="bg-[#7A9E9A] hover:bg-[#5A7E7A] ml-auto"
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
