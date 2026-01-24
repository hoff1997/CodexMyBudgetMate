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

// Onboarding save configuration
import { USE_DIRECT_TO_MAIN, STEP_ENDPOINTS } from "@/lib/onboarding/save-config";

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

// Debt item type for debt envelopes (Debt Destroyer) - matches DebtItemInput
interface OnboardingDebtItem {
  id?: string;
  name: string;
  debt_type: string;
  linked_account_id?: string | null;
  starting_balance: number;
  current_balance: number;
  interest_rate?: number | null;
  minimum_payment?: number | null;
}

export interface EnvelopeData {
  id: string;
  name: string;
  icon: string;
  type: "bill" | "spending" | "savings" | "goal" | "tracking" | "debt";
  subtype?: "bill" | "spending" | "savings" | "goal" | "tracking" | "debt";
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
  // Debt fields (for Debt Destroyer envelope)
  isDebt?: boolean;
  debtItems?: OnboardingDebtItem[];
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

// Autosave debounce delay in ms - reduced for better data protection
const AUTOSAVE_DELAY = 500;

// LocalStorage key for emergency backup
const LOCAL_STORAGE_BACKUP_KEY = 'mybudgetmate_onboarding_backup';

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
  const lastLocalBackupRef = useRef<string>('');

  // ============================================================================
  // CRITICAL: Safe state setters that prevent accidental data wiping
  // These wrappers validate updates before applying to prevent bugs from
  // accidentally clearing user's hard work
  // ============================================================================
  const safeSetEnvelopes = useCallback((updater: EnvelopeData[] | ((prev: EnvelopeData[]) => EnvelopeData[])) => {
    setEnvelopes((prev) => {
      const newValue = typeof updater === 'function' ? updater(prev) : updater;

      // Prevent accidentally clearing all envelopes if we had many before
      // Exception: during initial load when prev is empty
      if (prev.length > 5 && newValue.length === 0) {
        console.error('[Onboarding] BLOCKED: Attempted to clear all envelopes! Previous count:', prev.length);
        toast.error("Something tried to clear your envelopes. Your data is protected.");
        return prev; // Return previous state, don't allow the wipe
      }

      // Prevent losing more than 50% of envelopes in a single operation (except during initial load)
      if (prev.length > 10 && newValue.length < prev.length * 0.5) {
        console.warn('[Onboarding] WARNING: Large envelope reduction detected. Previous:', prev.length, 'New:', newValue.length);
        // Still allow, but log for debugging
      }

      return newValue;
    });
  }, []);

  const safeSetEnvelopeAllocations = useCallback((updater: typeof envelopeAllocations | ((prev: typeof envelopeAllocations) => typeof envelopeAllocations)) => {
    setEnvelopeAllocations((prev) => {
      const newValue = typeof updater === 'function' ? updater(prev) : updater;

      // Prevent accidentally clearing all allocations if we had many before
      const prevCount = Object.keys(prev).length;
      const newCount = Object.keys(newValue).length;

      if (prevCount > 5 && newCount === 0) {
        console.error('[Onboarding] BLOCKED: Attempted to clear all allocations! Previous count:', prevCount);
        toast.error("Something tried to clear your allocations. Your data is protected.");
        return prev;
      }

      return newValue;
    });
  }, []);

  const progress = (currentStep / STEPS.length) * 100;

  // ============================================================================
  // CRITICAL: LocalStorage backup for data protection
  // This provides a secondary safety net in case the server autosave fails
  // ============================================================================
  const saveToLocalStorage = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (currentStep <= 1) return; // Don't save on welcome step

    try {
      const backupData = {
        timestamp: new Date().toISOString(),
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
        customCategories,
        categoryOrder,
        envelopeAllocations,
        openingBalances,
        creditCardOpeningAllocation,
      };

      const backupString = JSON.stringify(backupData);

      // Only save if data has changed
      if (backupString !== lastLocalBackupRef.current) {
        localStorage.setItem(LOCAL_STORAGE_BACKUP_KEY, backupString);
        lastLocalBackupRef.current = backupString;
        console.log('[Onboarding Backup] Saved to localStorage:', new Date().toISOString());
      }
    } catch (error) {
      console.error('[Onboarding Backup] Failed to save to localStorage:', error);
    }
  }, [currentStep, highestStepReached, fullName, bankAccounts, creditCardConfigs, incomeSources, useTemplate, envelopes, customCategories, categoryOrder, envelopeAllocations, openingBalances, creditCardOpeningAllocation]);

  const loadFromLocalStorage = useCallback(() => {
    if (typeof window === 'undefined') return null;

    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_BACKUP_KEY);
      if (stored) {
        const backup = JSON.parse(stored);
        console.log('[Onboarding Backup] Found localStorage backup from:', backup.timestamp);
        return backup;
      }
    } catch (error) {
      console.error('[Onboarding Backup] Failed to load from localStorage:', error);
    }
    return null;
  }, []);

  const clearLocalStorageBackup = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(LOCAL_STORAGE_BACKUP_KEY);
      lastLocalBackupRef.current = '';
      console.log('[Onboarding Backup] Cleared localStorage backup');
    } catch (error) {
      console.error('[Onboarding Backup] Failed to clear localStorage:', error);
    }
  }, []);

  // Save to localStorage on every data change (immediate, no debounce)
  useEffect(() => {
    if (isLoadingDraft) return;
    saveToLocalStorage();
  }, [saveToLocalStorage, isLoadingDraft, envelopes, envelopeAllocations, openingBalances, incomeSources, bankAccounts, creditCardConfigs, fullName, customCategories, categoryOrder]);

  // Helper function to check if draft data appears corrupted (all amounts are 0)
  // NOTE: This is primarily for the LEGACY system. With direct-to-main, data is always
  // in real tables and "corruption" is less likely. We're more lenient with direct-to-main.
  const isDraftCorrupted = useCallback((draft: any, isDirectToMain?: boolean): boolean => {
    // Direct-to-main system: data is in real tables, user can edit anytime
    // Don't flag as corrupted - user may legitimately have empty data or be early in process
    if (isDirectToMain) {
      return false;
    }

    if (!draft || !draft.envelopes || draft.envelopes.length === 0) return false;

    // Check if ALL envelopes have $0 amounts - this indicates data corruption
    const hasAnyAmount = draft.envelopes.some((env: any) => {
      const billAmount = env.billAmount || 0;
      const monthlyBudget = env.monthlyBudget || 0;
      const savingsAmount = env.savingsAmount || 0;
      return billAmount > 0 || monthlyBudget > 0 || savingsAmount > 0;
    });

    // Also check if any allocations exist
    const hasAnyAllocations = draft.envelopeAllocations &&
      Object.keys(draft.envelopeAllocations).length > 0 &&
      Object.values(draft.envelopeAllocations).some((allocs: any) =>
        Object.values(allocs || {}).some((amount: any) => (amount as number) > 0)
      );

    // If we're past the allocation step but have no amounts, data is corrupted
    // Only apply this check for LEGACY system (step 10+ means review/completion)
    const isPastAllocationStep = (draft.currentStep || 1) >= 10;

    if (isPastAllocationStep && !hasAnyAmount && !hasAnyAllocations) {
      console.warn('[Onboarding] Draft appears corrupted - no amounts found despite being past allocation step');
      return true;
    }

    return false;
  }, []);

  // Helper to apply backup data to state
  const applyBackupData = useCallback((backup: any) => {
    console.log('[Onboarding] Applying backup data from:', backup.timestamp);

    setCurrentStep(backup.currentStep || 1);
    setHighestStepReached(backup.highestStepReached || backup.currentStep || 1);
    setFullName(backup.fullName || "");
    setBankAccounts(backup.bankAccounts || []);
    setCreditCardConfigs(backup.creditCardConfigs || []);
    setIncomeSources((backup.incomeSources || []).map((source: any) => ({
      ...source,
      nextPayDate: source.nextPayDate ? new Date(source.nextPayDate) : new Date(),
    })));
    setUseTemplate(backup.useTemplate ?? true);
    setEnvelopes(backup.envelopes || []);
    setCustomCategories(backup.customCategories || []);
    setCategoryOrder(backup.categoryOrder || []);
    setEnvelopeAllocations(backup.envelopeAllocations || {});
    setOpeningBalances(backup.openingBalances || {});
    if (backup.creditCardOpeningAllocation !== undefined) {
      setCreditCardOpeningAllocation(backup.creditCardOpeningAllocation);
    }
  }, []);

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
        // First, check for localStorage backup
        const localBackup = loadFromLocalStorage();

        const response = await fetch("/api/onboarding/autosave");
        if (!response.ok) {
          // Server failed - try localStorage backup
          if (localBackup) {
            console.log('[Onboarding] Server unavailable, using localStorage backup');
            applyBackupData(localBackup);
            toast.success("Restored from local backup!");
          }
          setIsLoadingDraft(false);
          return;
        }

        const data = await response.json();

        if (data.hasDraft && data.draft) {
          const draft = data.draft;
          const isDirectToMain = data.isDirectToMain === true;

          // Check if server draft appears corrupted (only for legacy system)
          if (isDraftCorrupted(draft, isDirectToMain)) {
            // Try localStorage backup first
            if (localBackup && !isDraftCorrupted(localBackup, false)) {
              console.log('[Onboarding] Server draft corrupted, using localStorage backup');
              applyBackupData(localBackup);
              toast.warning("Restored from local backup - server data was incomplete", {
                duration: 5000,
              });
              setIsLoadingDraft(false);
              return;
            }

            // Both corrupted - warn user but continue with server data
            console.warn('[Onboarding] Both server and local data appear corrupted');
            toast.error("Your budget data may be incomplete. Please verify your amounts.", {
              duration: 8000,
            });
          }

          // Check if localStorage has MORE data (more recent or more complete)
          const serverEnvelopeCount = draft.envelopes?.length || 0;
          const localEnvelopeCount = localBackup?.envelopes?.length || 0;

          // Use localStorage if it has more envelopes and is more recent
          if (localBackup && localEnvelopeCount > serverEnvelopeCount) {
            const localTime = new Date(localBackup.timestamp).getTime();
            const serverTime = draft.lastSavedAt ? new Date(draft.lastSavedAt).getTime() : 0;

            if (localTime > serverTime) {
              console.log('[Onboarding] localStorage backup is more recent and has more data');
              applyBackupData(localBackup);
              toast.success("Restored more recent local backup!");
              setIsLoadingDraft(false);
              return;
            }
          }

          // Use server draft
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
          setCustomCategories(draft.customCategories || []);
          setCategoryOrder(draft.categoryOrder || []);
          setEnvelopeAllocations(draft.envelopeAllocations || {});
          setOpeningBalances(draft.openingBalances || {});
          setLastSaved(draft.lastSavedAt ? new Date(draft.lastSavedAt) : null);

          if (savedStep > 1) {
            toast.success("Welcome back! Your progress has been restored.");
          }
        } else if (localBackup) {
          // No server draft but have local backup
          console.log('[Onboarding] No server draft, using localStorage backup');
          applyBackupData(localBackup);
          toast.success("Restored from local backup!");
        }
      } catch (error) {
        console.error("Failed to load draft:", error);

        // Try localStorage backup on error
        const localBackup = loadFromLocalStorage();
        if (localBackup) {
          console.log('[Onboarding] Server error, using localStorage backup');
          applyBackupData(localBackup);
          toast.warning("Server unavailable - restored from local backup");
        }
      } finally {
        setIsLoadingDraft(false);
      }
    }

    loadDraft();
  }, [searchParams, loadFromLocalStorage, isDraftCorrupted, applyBackupData]);

  // Autosave function - supports both legacy and direct-to-main systems
  const saveProgress = useCallback(async () => {
    // Don't save if on welcome step or completion step
    if (currentStep <= 1 || currentStep === STEPS.length) return;

    setIsSaving(true);
    try {
      if (USE_DIRECT_TO_MAIN) {
        // =========================================================================
        // NEW SYSTEM: Direct-to-main-tables with step-specific endpoints
        // =========================================================================
        const savePromises: Promise<Response>[] = [];

        // Always update progress
        savePromises.push(
          fetch(STEP_ENDPOINTS.progress, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ currentStep, highestStepReached }),
          })
        );

        // Save step-specific data based on current step
        // Profile (step 2)
        if (currentStep >= 2 && fullName) {
          savePromises.push(
            fetch(STEP_ENDPOINTS.profile, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ fullName, currentStep, highestStepReached }),
            })
          );
        }

        // Income (step 3)
        if (currentStep >= 3 && incomeSources.length > 0) {
          savePromises.push(
            fetch(STEP_ENDPOINTS.income, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                incomeSources: incomeSources.map(source => ({
                  ...source,
                  nextPayDate: source.nextPayDate instanceof Date
                    ? source.nextPayDate.toISOString()
                    : source.nextPayDate,
                })),
                currentStep,
                highestStepReached,
              }),
            })
          );
        }

        // Accounts (step 4)
        if (currentStep >= 4 && bankAccounts.length > 0) {
          savePromises.push(
            fetch(STEP_ENDPOINTS.accounts, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ bankAccounts, currentStep, highestStepReached }),
            })
          );
        }

        // Envelopes (step 8+)
        if (currentStep >= 8 && envelopes.length > 0) {
          // Transform envelope data for API
          const transformedEnvelopes = envelopes.map(env => ({
            id: env.id,
            name: env.name,
            icon: env.icon,
            type: env.type,
            category: env.category,
            sortOrder: env.sortOrder,
            billAmount: env.billAmount,
            frequency: env.frequency,
            dueDate: env.dueDate,
            priority: env.priority,
            monthlyBudget: env.monthlyBudget,
            savingsAmount: env.savingsAmount,
            payCycleAmount: env.payCycleAmount,
            is_leveled: env.isLeveled,
            leveling_data: env.levelingData,
            seasonal_pattern: env.seasonalPattern,
            is_celebration: env.isCelebration,
            giftRecipients: env.giftRecipients?.map(r => ({
              ...r,
              celebration_date: r.celebration_date instanceof Date
                ? r.celebration_date.toISOString()
                : r.celebration_date,
            })),
            is_debt: env.isDebt,
            debtItems: env.debtItems,
          }));

          savePromises.push(
            fetch(STEP_ENDPOINTS.envelopes, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                envelopes: transformedEnvelopes,
                customCategories,
                categoryOrder,
                currentStep,
                highestStepReached,
              }),
            })
          );
        }

        // Allocations (step 9+)
        if (currentStep >= 9 && Object.keys(envelopeAllocations).length > 0) {
          savePromises.push(
            fetch(STEP_ENDPOINTS.allocations, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                envelopeAllocations,
                currentStep,
                highestStepReached,
              }),
            })
          );
        }

        // Opening balances (step 11)
        if (currentStep >= 11 && Object.keys(openingBalances).length > 0) {
          savePromises.push(
            fetch(STEP_ENDPOINTS.openingBalances, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                openingBalances,
                currentStep,
                highestStepReached,
              }),
            })
          );
        }

        // Execute all saves in parallel
        const results = await Promise.allSettled(savePromises);
        const anyFailed = results.some(r => r.status === "rejected" || (r.status === "fulfilled" && !r.value.ok));

        if (!anyFailed) {
          setLastSaved(new Date());
          console.log('[Onboarding] Saved to main tables:', new Date().toISOString());
        } else {
          console.error('[Onboarding] Some saves failed:', results);
          // localStorage backup already happened via useEffect, so data is safe
        }
      } else {
        // =========================================================================
        // LEGACY SYSTEM: Single autosave endpoint with JSONB storage
        // =========================================================================
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
            customCategories,
            categoryOrder,
            envelopeAllocations,
            openingBalances,
            creditCardOpeningAllocation,
          }),
        });

        if (response.ok) {
          setLastSaved(new Date());
          console.log('[Onboarding] Saved to server:', new Date().toISOString());
        } else {
          console.error('[Onboarding] Server save failed:', response.status);
          // localStorage backup already happened via useEffect, so data is safe
        }
      }
    } catch (error) {
      console.error("Autosave failed:", error);
      // localStorage backup already happened via useEffect, so data is safe
    } finally {
      setIsSaving(false);
    }
  }, [currentStep, highestStepReached, fullName, bankAccounts, creditCardConfigs, incomeSources, useTemplate, envelopes, customCategories, categoryOrder, envelopeAllocations, openingBalances, creditCardOpeningAllocation]);

  // Debounced autosave on data changes - CRITICAL for data protection
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
  }, [currentStep, fullName, bankAccounts, creditCardConfigs, incomeSources, useTemplate, envelopes, customCategories, categoryOrder, envelopeAllocations, openingBalances, creditCardOpeningAllocation, isLoadingDraft, saveProgress]);

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
        useDirectToMain: USE_DIRECT_TO_MAIN,
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

      if (USE_DIRECT_TO_MAIN) {
        // =========================================================================
        // NEW SYSTEM: Data is already in main tables with draft flag
        // Just call complete endpoint to flip the flags
        // =========================================================================
        const response = await fetch("/api/onboarding/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            completedAt: new Date().toISOString(),
            useDirectToMain: true,
          }),
        });

        const data = await response.json();
        console.log("Complete API response:", data);

        if (!response.ok) {
          throw new Error(data.error || "Failed to complete onboarding");
        }
      } else {
        // =========================================================================
        // LEGACY SYSTEM: Migrate data from draft to main tables
        // =========================================================================
        const response = await fetch("/api/onboarding/unified", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName,
            bankAccounts,
            creditCardConfigs,
            incomeSources: incomeSources.map(source => ({
              ...source,
              nextPayDate: source.nextPayDate instanceof Date
                ? source.nextPayDate.toISOString()
                : new Date(source.nextPayDate).toISOString()
            })),
            envelopes,
            envelopeAllocations,
            openingBalances,
            creditCardOpeningAllocation,
            customCategories,
            categoryOrder,
            completedAt: new Date().toISOString(),
          }),
        });

        const data = await response.json();
        console.log("API response:", data);

        if (!response.ok) {
          throw new Error(data.error || "Failed to save onboarding data");
        }

        // Delete the legacy draft since onboarding is complete
        try {
          await fetch("/api/onboarding/autosave", { method: "DELETE" });
        } catch (error) {
          console.warn("Failed to delete draft (non-critical):", error);
        }
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

      // Clear localStorage backup since onboarding is complete
      clearLocalStorageBackup();

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
            onEnvelopesChange={safeSetEnvelopes}
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
            onAllocationsChange={safeSetEnvelopeAllocations}
            onEnvelopesChange={safeSetEnvelopes}
            categoryOrder={categoryOrder}
            onCategoryOrderChange={setCategoryOrder}
            customCategories={customCategories}
            onCustomCategoriesChange={setCustomCategories}
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
              {/* Autosave indicator - more prominent for user confidence */}
              {currentStep > 1 && currentStep < STEPS.length && (
                <div className="flex items-center gap-1.5 text-xs bg-sage-very-light px-2 py-1 rounded-md">
                  {isSaving ? (
                    <>
                      <Save className="h-3.5 w-3.5 animate-pulse text-sage" />
                      <span className="text-sage-dark">Saving...</span>
                    </>
                  ) : lastSaved ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-sage" />
                      <span className="text-sage-dark">Auto-saved</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Waiting...</span>
                    </>
                  )}
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
