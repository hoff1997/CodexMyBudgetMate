"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Loader2, Save, CheckCircle2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
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

// Leveling data for seasonal bills
export interface LevelingData {
  monthlyAmounts: number[]; // 12 values, Jan=0 to Dec=11
  yearlyAverage: number;
  bufferPercent: number;
  estimationType: '12-month' | 'quick-estimate';
  highSeasonEstimate?: number;
  lowSeasonEstimate?: number;
  lastUpdated: string;
}

// Seasonal patterns are for bills that vary by season (power, gas, water)
// Celebrations (birthdays, Christmas) are handled separately via GiftAllocationDialog
export type SeasonalPatternType = 'winter-peak' | 'summer-peak' | 'custom';

// Gift recipient type for celebration envelopes
interface OnboardingGiftRecipient {
  id?: string;
  recipient_name: string;
  gift_amount: number;
  party_amount?: number;
  celebration_date?: Date | null;
  notes?: string;
}

export interface EnvelopeData {
  id: string;
  name: string;
  icon: string;
  type: "bill" | "spending" | "savings" | "goal" | "tracking" | "debt";
  // Bill fields
  billAmount?: number;
  frequency?: "monthly" | "quarterly" | "annual" | "custom" | "weekly" | "fortnightly" | "annually" | "custom_weeks";
  customWeeks?: number; // Number of weeks for custom_weeks frequency (e.g., 8 for every 8 weeks)
  dueDate?: number | string; // day of month or ISO date string
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
  // Notes
  notes?: string;
  // Income allocation
  fundedBy?: string; // Income source ID or "split" for multiple
  // Leveled bill fields (for seasonal expenses like power, gas, water)
  isLeveled?: boolean;
  levelingData?: LevelingData;
  seasonalPattern?: SeasonalPatternType;
  // Celebration fields (for birthdays, Christmas, etc.)
  isCelebration?: boolean;
  giftRecipients?: OnboardingGiftRecipient[];
}

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
}

const STEPS: OnboardingStep[] = [
  { id: 1, title: "Welcome", description: "Set expectations" },
  { id: 2, title: "About You", description: "Your name" },
  { id: 3, title: "Income", description: "Set up pay cycle" },
  { id: 4, title: "Bank Accounts", description: "Connect accounts" },
  { id: 5, title: "Credit Cards", description: "Configure cards" },
  { id: 6, title: "Approach", description: "Template or custom" },
  { id: 7, title: "Learn", description: "Envelope budgeting" },
  { id: 8, title: "Envelopes", description: "Create your budget" },
  { id: 9, title: "Budget Manager", description: "Set targets & allocate" },
  { id: 10, title: "Review", description: "Validate & adjust" },
  { id: 11, title: "Opening Balance", description: "Initial funds" },
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
  const [highestStepReached, setHighestStepReached] = useState(1); // Track furthest progress for navigation
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
          const savedStep = draft.currentStep || 1;
          const savedHighest = draft.highestStepReached || savedStep;
          setCurrentStep(savedStep);
          setHighestStepReached(savedHighest);
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

          if (savedStep > 1) {
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
          highestStepReached,
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
  }, [currentStep, highestStepReached, fullName, bankAccounts, creditCardConfigs, incomeSources, useTemplate, envelopes, envelopeAllocations, openingBalances]);

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

  // Check if user has credit card debt (paying_down or minimum_only usage type)
  const hasCreditCardDebt = useMemo(() => {
    return creditCardConfigs.some(
      config => config.usageType === 'paying_down' || config.usageType === 'minimum_only'
    );
  }, [creditCardConfigs]);

  // Auto-skip step 5 (Credit Cards) if user lands on it with no credit cards
  useEffect(() => {
    if (!isLoadingDraft && currentStep === 5 && !hasCreditCards) {
      setCurrentStep(6); // Skip to Approach
    }
  }, [currentStep, hasCreditCards, isLoadingDraft]);

  const handleNext = async () => {
    // Validation for each step
    if (currentStep === 2 && !fullName) {
      toast.error("Please enter your name");
      return;
    }

    // Step 3: Income
    if (currentStep === 3 && incomeSources.length === 0) {
      toast.error("Please add at least one income source");
      return;
    }

    // Step 4: Bank Accounts - optional, can proceed without
    // (User can skip bank connection and add manually later)

    // Step 5: Credit Cards - skip if no credit cards
    if (currentStep === 5 && !hasCreditCards) {
      // Auto-skip to Approach step if no credit cards
      setCurrentStep(6);
      return;
    }

    // Step 6: Approach
    if (currentStep === 6 && useTemplate === undefined) {
      toast.error("Please choose how you'd like to set up your budget");
      return;
    }

    // Step 8: Envelopes
    if (currentStep === 8 && envelopes.length === 0) {
      toast.error("Please create at least one envelope");
      return;
    }

    // Handle final step
    if (currentStep === STEPS.length) {
      await completeOnboarding();
      return;
    }

    // Move to next step and update highest reached
    const nextStep = Math.min(currentStep + 1, STEPS.length);
    setCurrentStep(nextStep);
    setHighestStepReached((prev) => Math.max(prev, nextStep));
  };

  const handleBack = () => {
    setCurrentStep((prev) => {
      const newStep = Math.max(prev - 1, 1);
      // Skip step 5 (Credit Cards) if going backward and no credit cards
      if (newStep === 5 && !hasCreditCards) {
        return 4; // Go to Bank Accounts step instead
      }
      return newStep;
    });
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
    setCurrentStep(6); // Move to Approach step
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
          <IncomeStep
            incomeSources={incomeSources}
            onIncomeSourcesChange={setIncomeSources}
          />
        );

      case 4:
        // Bank Accounts step (moved from step 9)
        return (
          <BankAccountsStep
            accounts={bankAccounts}
            onAccountsChange={setBankAccounts}
          />
        );

      case 5:
        // Credit Cards step - only shown if there are credit cards (moved from step 10)
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

      case 6:
        return (
          <BudgetingApproachStep
            useTemplate={useTemplate}
            onUseTemplateChange={setUseTemplate}
          />
        );

      case 7:
        return <EnvelopeEducationStep onContinue={handleNext} onBack={handleBack} />;

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
            hasCreditCardDebt={hasCreditCardDebt}
            bankAccounts={bankAccounts}
          />
        );

      case 9:
        return (
          <EnvelopeAllocationStep
            envelopes={envelopes}
            incomeSources={incomeSources}
            onAllocationsChange={setEnvelopeAllocations}
            onEnvelopesChange={setEnvelopes}
          />
        );

      case 10:
        return (
          <BudgetReviewStep
            envelopes={envelopes}
            incomeSources={incomeSources}
            onEditEnvelopes={() => setCurrentStep(8)}
          />
        );

      case 11:
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

      case 12:
        return <CompletionStep isLoading={isLoading} onComplete={handleNext} onBack={handleBack} />;

      default:
        return null;
    }
  };

  // Determine if "Continue" button should be shown
  // Steps with their own continue buttons: Welcome (1), Credit Cards (5), Envelope Education (7), Complete (12)
  const showContinueButton = ![1, 5, 7, 12].includes(currentStep);

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

      {/* Clickable Step Navigation */}
      {currentStep > 1 && (
        <div className="border-b bg-muted/30">
          <div className="container max-w-5xl mx-auto px-4 py-3">
            {/* Step Indicators */}
            <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1">
              {STEPS.map((step, index) => {
                const stepNumber = index + 1;
                const isVisited = stepNumber <= highestStepReached; // Has been reached before
                const isCurrent = stepNumber === currentStep;
                const isClickable = stepNumber <= highestStepReached && stepNumber !== currentStep; // Can navigate to any visited step
                const isSkipped = stepNumber === 5 && !hasCreditCards; // Skip CC step if no cards

                if (isSkipped) return null;

                return (
                  <button
                    key={step.id}
                    onClick={() => {
                      if (isClickable) {
                        // Handle skipping step 5 if no credit cards
                        if (stepNumber === 5 && !hasCreditCards) {
                          // If trying to go to step 5, go to step 4 or 6 depending on direction
                          setCurrentStep(currentStep > 5 ? 4 : 6);
                        } else {
                          setCurrentStep(stepNumber);
                        }
                      }
                    }}
                    disabled={!isClickable}
                    className={cn(
                      "flex flex-col items-center min-w-[60px] p-1.5 rounded-lg transition-all",
                      isClickable && "hover:bg-[#E2EEEC] cursor-pointer",
                      !isClickable && !isCurrent && "opacity-50 cursor-not-allowed"
                    )}
                    title={isClickable ? `Go to ${step.title}` : step.title}
                  >
                    {/* Step Circle */}
                    <div
                      className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-all",
                        isVisited && !isCurrent && "bg-[#7A9E9A] text-white",
                        isCurrent && "bg-[#7A9E9A] text-white ring-2 ring-[#B8D4D0] ring-offset-1",
                        !isVisited && !isCurrent && "bg-muted text-muted-foreground"
                      )}
                    >
                      {isVisited && !isCurrent ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        stepNumber
                      )}
                    </div>
                    {/* Step Label (hidden on mobile, shown on larger screens) */}
                    <span
                      className={cn(
                        "text-[10px] mt-1 text-center leading-tight hidden sm:block",
                        isCurrent && "font-medium text-[#5A7E7A]",
                        isVisited && !isCurrent && "text-[#7A9E9A]",
                        !isVisited && !isCurrent && "text-muted-foreground"
                      )}
                    >
                      {step.title}
                    </span>
                  </button>
                );
              })}
            </div>
            {/* Current step description for mobile */}
            <div className="sm:hidden text-center mt-2 text-sm">
              <span className="font-medium text-[#5A7E7A]">{STEPS[currentStep - 1].title}</span>
              <span className="text-muted-foreground"> - {STEPS[currentStep - 1].description}</span>
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
