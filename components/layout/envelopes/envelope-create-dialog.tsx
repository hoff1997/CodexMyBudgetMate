"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PlannerFrequency, calculateAnnualFromTarget, calculateRequiredContribution, frequencyOptions } from "@/lib/planner/calculations";
import { formatCurrency } from "@/lib/finance";
import { cn } from "@/lib/cn";
import { CalendarIcon, X, Info, Plus, DollarSign, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { FluentEmojiPicker } from "@/components/ui/fluent-emoji-picker";

type CategoryOption = { id: string; name: string };

type EnvelopeSubtype = "bill" | "spending" | "savings" | "goal" | "tracking" | "debt";

type FormState = {
  name: string;
  icon: string;
  subtype: EnvelopeSubtype;
  categoryId: string;
  openingBalance: string;
  notes: string;
  isSpending: boolean;
  isMonitored: boolean;
  dueAmount: string;
  dueFrequency: PlannerFrequency;
  dueDate: string;
  priority: "essential" | "important" | "discretionary" | "";
};

const SUBTYPE_OPTIONS: { value: EnvelopeSubtype; label: string; description: string }[] = [
  { value: "bill", label: "Bill", description: "Recurring bills with due dates" },
  { value: "spending", label: "Spending", description: "Day-to-day spending categories" },
  { value: "savings", label: "Savings", description: "Savings goals to build up over time" },
  { value: "goal", label: "Goal", description: "One-time goals with a target date" },
  { value: "tracking", label: "Tracking", description: "Track spending without a budget" },
  { value: "debt", label: "Debt", description: "Track and pay off debts (credit cards, loans)" },
];

const DEFAULT_FORM: FormState = {
  name: "",
  icon: "💰",
  subtype: "bill",
  categoryId: "",
  openingBalance: "0.00",
  notes: "",
  isSpending: false,
  isMonitored: false,
  dueAmount: "0.00",
  dueFrequency: "monthly",
  dueDate: "",
  priority: "",
};

// Income reality from API
interface IncomeReality {
  id: string;
  name: string;
  payFrequency: string;
  nextPayDate: string | null;
  incomeAmount: number;
  totalCommittedPerPay: number;
  surplusAmount: number;
}

// Per-income impact calculation
interface PerIncomeImpact {
  incomeId: string;
  incomeName: string;
  payFrequency: string;
  amountPerPay: number;
  surplusAmount: number;
  shortfall: number;
  coversIt: boolean;
}

// Pay frequency multipliers for conversion
const PAY_FREQUENCY_CYCLES: Record<string, number> = {
  weekly: 52,
  fortnightly: 26,
  twice_monthly: 24,
  monthly: 12,
  quarterly: 4,
  '6_monthly': 2,
  annually: 1,
};

// Calculate amount per pay cycle based on bill frequency and pay frequency
function calculatePayCycleAmount(
  targetAmount: number,
  billFrequency: string,
  payFrequency: string
): number {
  const billCyclesPerYear = PAY_FREQUENCY_CYCLES[billFrequency] || 12;
  const payCyclesPerYear = PAY_FREQUENCY_CYCLES[payFrequency] || 26;
  const annualAmount = targetAmount * billCyclesPerYear;
  return annualAmount / payCyclesPerYear;
}

export function EnvelopeCreateDialog({
  open,
  onOpenChange,
  categories: initialCategories = [],
  onCreated,
  defaultPriority,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  categories?: CategoryOption[];
  onCreated?: () => void;
  defaultPriority?: "essential" | "important" | "discretionary";
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => ({
    ...DEFAULT_FORM,
    priority: defaultPriority || "",
  }));
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState<CategoryOption[]>(initialCategories);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [priorityError, setPriorityError] = useState(false);

  // Income reality state
  const [incomeReality, setIncomeReality] = useState<IncomeReality[]>([]);
  const [totalSurplus, setTotalSurplus] = useState<number>(0);
  const [loadingIncome, setLoadingIncome] = useState(false);

  // Income selection for multi-income users
  const [selectedIncomeId, setSelectedIncomeId] = useState<string>("split");

  // Post-creation prompt state
  const [showPostCreationPrompt, setShowPostCreationPrompt] = useState(false);
  const [createdEnvelope, setCreatedEnvelope] = useState<{ id: string; name: string; icon: string } | null>(null);

  // Track previous categories to avoid unnecessary updates
  const prevCategoriesRef = useRef<string>('');

  // Sync categories when prop changes (only if content actually changed)
  useEffect(() => {
    const newIds = initialCategories.map(c => c.id).sort().join(',');
    if (prevCategoriesRef.current !== newIds) {
      prevCategoriesRef.current = newIds;
      setCategories(initialCategories);
    }
  }, [initialCategories]);

  // Fetch income reality when dialog opens
  const fetchIncomeReality = useCallback(async () => {
    setLoadingIncome(true);
    try {
      const response = await fetch("/api/budget/income-reality", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setIncomeReality(data.incomes || []);
        setTotalSurplus(data.totalSurplus || 0);
      }
    } catch (error) {
      console.error("Failed to fetch income reality:", error);
    } finally {
      setLoadingIncome(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchIncomeReality();
    }
  }, [open, fetchIncomeReality]);

  // Reset form with default priority when dialog opens
  useEffect(() => {
    if (open) {
      setForm({
        ...DEFAULT_FORM,
        priority: defaultPriority || "",
      });
    }
  }, [open, defaultPriority]);

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    setCreatingCategory(true);
    try {
      const response = await fetch("/api/envelope-categories", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });
      if (!response.ok) throw new Error("Failed to create category");
      const { category } = await response.json();
      setCategories((prev) => [...prev, { id: category.id, name: category.name }]);
      setForm((prev) => ({ ...prev, categoryId: category.id }));
      setNewCategoryName("");
      setShowNewCategory(false);
      toast.success("Category created");
    } catch (error) {
      toast.error("Failed to create category");
    } finally {
      setCreatingCategory(false);
    }
  };

  const dueAmountNumber = parseFloat(form.dueAmount || "0") || 0;
  const annualAmount = calculateAnnualFromTarget(dueAmountNumber, form.dueFrequency);
  const perPayAmount = calculateRequiredContribution(annualAmount, form.dueFrequency);

  // Calculate per-income impact
  const incomeImpacts = useMemo((): PerIncomeImpact[] => {
    if (!dueAmountNumber || incomeReality.length === 0) return [];

    return incomeReality.map((income) => {
      const amountPerPay = calculatePayCycleAmount(
        dueAmountNumber,
        form.dueFrequency,
        income.payFrequency
      );
      const shortfall = Math.max(0, amountPerPay - income.surplusAmount);
      const coversIt = income.surplusAmount >= amountPerPay;

      return {
        incomeId: income.id,
        incomeName: income.name,
        payFrequency: income.payFrequency,
        amountPerPay: Math.round(amountPerPay * 100) / 100,
        surplusAmount: income.surplusAmount,
        shortfall: Math.round(shortfall * 100) / 100,
        coversIt,
      };
    });
  }, [dueAmountNumber, form.dueFrequency, incomeReality]);

  // Filter and adjust impacts based on selected income for display
  const displayImpacts = useMemo((): PerIncomeImpact[] => {
    if (selectedIncomeId === "split") {
      // When splitting, divide the amount evenly across all incomes
      const numIncomes = incomeImpacts.length;
      if (numIncomes === 0) return [];

      return incomeImpacts.map((impact) => {
        const splitAmount = Math.round((impact.amountPerPay / numIncomes) * 100) / 100;
        const shortfall = Math.max(0, splitAmount - impact.surplusAmount);
        return {
          ...impact,
          amountPerPay: splitAmount,
          shortfall: Math.round(shortfall * 100) / 100,
          coversIt: impact.surplusAmount >= splitAmount,
        };
      });
    }
    return incomeImpacts.filter((impact) => impact.incomeId === selectedIncomeId);
  }, [incomeImpacts, selectedIncomeId]);

  // Check if selected income(s) have a shortfall
  const hasShortfall = displayImpacts.some((impact) => impact.shortfall > 0);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name.trim()) {
      toast.error("Envelope name is required");
      return;
    }
    if (!form.priority) {
      setPriorityError(true);
      toast.error("Please select a priority level");
      return;
    }
    setPriorityError(false);
    setSubmitting(true);
    try {
      const response = await fetch("/api/envelopes", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          subtype: form.subtype,
          categoryId: form.categoryId || undefined,
          priority: form.priority,
          targetAmount: dueAmountNumber,
          payCycleAmount: perPayAmount,
          frequency: form.dueFrequency,
          nextDue: form.dueDate || undefined,
          openingBalance: parseFloat(form.openingBalance || "0") || 0,
          notes: form.notes.trim() || undefined,
          icon: form.icon,
          isSpending: form.isSpending || form.subtype === "spending",
          isMonitored: form.isMonitored,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: "Unable to create envelope" }));
        throw new Error(payload.error ?? "Unable to create envelope");
      }

      const result = await response.json();

      // Store created envelope info for post-creation prompt
      setCreatedEnvelope({
        id: result.id || "new",
        name: form.name.trim(),
        icon: form.icon,
      });

      // Show post-creation prompt
      setShowPostCreationPrompt(true);

    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create envelope");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = (value: boolean) => {
    if (!value) {
      setForm(DEFAULT_FORM);
      setShowPostCreationPrompt(false);
      setCreatedEnvelope(null);
    }
    onOpenChange(value);
  };

  const handleBalanceBudgetNow = () => {
    setShowPostCreationPrompt(false);
    onOpenChange(false);
    setForm(DEFAULT_FORM);
    toast.success("Envelope created");
    router.push(`/budgetallocation?highlight=${createdEnvelope?.id || "new"}`);
  };

  const handleBalanceLater = () => {
    setShowPostCreationPrompt(false);
    onOpenChange(false);
    setForm(DEFAULT_FORM);
    toast.success("Envelope created");
    onCreated?.();
  };

  // Format pay frequency for display
  const formatPayFrequency = (freq: string) => {
    const labels: Record<string, string> = {
      weekly: "weekly",
      fortnightly: "fortnightly",
      twice_monthly: "twice monthly",
      monthly: "monthly",
    };
    return labels[freq] || freq;
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-full max-w-xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-3xl border border-border/60 bg-background shadow-2xl focus:outline-none">

          {/* Post-Creation Prompt Overlay */}
          {showPostCreationPrompt && createdEnvelope && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-3xl bg-background p-6">
              <div className="w-full max-w-md space-y-6">
                {/* Success Header */}
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sage-very-light border-2 border-sage text-3xl">
                    {createdEnvelope.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-text-dark">
                      {createdEnvelope.name} is ready!
                    </h3>
                    <p className="text-sm text-text-medium">
                      Now let's balance your budget
                    </p>
                  </div>
                </div>

                {/* Per-Pay Commitment Summary */}
                {displayImpacts.length > 0 && dueAmountNumber > 0 && (
                  <div className="rounded-xl border border-blue-light bg-blue-light/30 p-4">
                    <div className="text-xs uppercase tracking-wide text-text-medium mb-2">
                      Your new pay cycle commitment
                    </div>
                    {displayImpacts.map((impact) => (
                      <div key={impact.incomeId} className="flex items-center justify-between py-1">
                        <span className="text-sm text-text-dark">{impact.incomeName}:</span>
                        <span className="font-semibold text-blue">
                          {formatCurrency(impact.amountPerPay)} per pay
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Budget Balancing Warning */}
                {hasShortfall && (
                  <div className="rounded-xl border border-gold bg-gold-light/30 p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-gold flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-text-dark mb-1">
                          Budget Needs Balancing
                        </h4>
                        {displayImpacts
                          .filter((i) => i.shortfall > 0)
                          .map((impact) => (
                            <p key={impact.incomeId} className="text-sm text-text-dark">
                              {impact.incomeName}: Still to find{" "}
                              <strong>{formatCurrency(impact.shortfall)}</strong>
                            </p>
                          ))}
                        <p className="text-sm text-text-medium mt-2">
                          You'll need to adjust other envelopes to make room for {createdEnvelope.name}.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Success Message (if surplus covers it) */}
                {!hasShortfall && dueAmountNumber > 0 && (
                  <div className="rounded-xl border border-sage-light bg-sage-very-light p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-sage flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-text-dark mb-1">
                          Surplus covers this!
                        </h4>
                        <p className="text-sm text-text-medium">
                          Your current surplus can fund this envelope. Confirm the allocation now?
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-2">
                  <Button
                    onClick={handleBalanceBudgetNow}
                    className="w-full bg-sage hover:bg-sage-dark text-white"
                  >
                    Balance Budget Now
                  </Button>
                  <Button
                    onClick={handleBalanceLater}
                    variant="outline"
                    className="w-full"
                  >
                    I'll Balance It Later
                  </Button>
                </div>

                {/* Remy's Tip */}
                <div className="rounded-xl border border-sage-light bg-sage-very-light p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-xl">🌊</span>
                    <p className="text-sm text-text-dark">
                      <strong>Remy says:</strong> Adding an envelope means making room for it.
                      Think of it like rearranging furniture - something's gotta move!
                      Head to Budget Allocation and we'll figure out which envelopes can spare a bit.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Main Dialog Content */}
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border/40 px-6 py-5">
            <div>
              <Dialog.Title className="text-2xl font-semibold text-secondary">Add New Envelope</Dialog.Title>
              <Dialog.Description className="text-sm text-muted-foreground">
                Create an envelope and we'll help you balance your budget.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-full p-2 text-muted-foreground transition hover:bg-muted/50 hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">

              {/* Income Reality Banner */}
              {!loadingIncome && incomeReality.length > 0 && (
                <div className="rounded-xl border border-blue-light bg-blue-light/30 p-4">
                  <div className="flex items-start gap-3">
                    <DollarSign className="h-5 w-5 text-blue flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-text-dark mb-2">
                        Your Pay Cycle Reality
                      </h3>

                      {incomeReality.length === 1 ? (
                        <div className="space-y-1">
                          <p className="text-sm text-text-dark">
                            <strong>{incomeReality[0].name}</strong> ({formatPayFrequency(incomeReality[0].payFrequency)})
                          </p>
                          {incomeReality[0].nextPayDate && (
                            <p className="text-xs text-text-medium">
                              Next pay: {new Date(incomeReality[0].nextPayDate).toLocaleDateString()}
                            </p>
                          )}
                          <p className="text-sm text-text-dark mt-2">
                            Surplus available:{" "}
                            <strong className="text-sage">{formatCurrency(incomeReality[0].surplusAmount)}</strong>
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-sm text-text-dark mb-2">
                            You have {incomeReality.length} income sources:
                          </p>
                          {incomeReality.map((income) => (
                            <div key={income.id} className="pl-3 border-l-2 border-blue py-1">
                              <p className="text-sm text-text-dark font-medium">
                                {income.name} ({formatPayFrequency(income.payFrequency)})
                              </p>
                              <p className="text-sm text-text-dark">
                                Surplus: <strong className="text-sage">{formatCurrency(income.surplusAmount)}</strong>
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="mt-3 pt-3 border-t border-blue/30">
                        <p className="text-xs text-text-medium">
                          Adding this envelope is a budget change. You'll use surplus or adjust other envelopes to make room.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Basic Info Section */}
              <div className="space-y-4 rounded-2xl border border-border/60 bg-muted/30 p-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="envelope-name" className="text-sm font-medium text-secondary">
                      Name
                    </Label>
                    <Input
                      id="envelope-name"
                      placeholder="Envelope name"
                      value={form.name}
                      onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="envelope-type" className="text-sm font-medium text-secondary">
                      Type
                    </Label>
                    <select
                      id="envelope-type"
                      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      value={form.subtype}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, subtype: event.target.value as EnvelopeSubtype }))
                      }
                    >
                      {SUBTYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-secondary">Icon</Label>
                  <FluentEmojiPicker
                    selectedEmoji={form.icon}
                    onEmojiSelect={(emoji) => setForm((prev) => ({ ...prev, icon: emoji }))}
                    insideDialog
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="envelope-category" className="text-sm font-medium text-secondary">
                    Category
                  </Label>
                  {!showNewCategory ? (
                    <select
                      id="envelope-category"
                      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      value={form.categoryId}
                      onChange={(event) => {
                        if (event.target.value === "__create_new__") {
                          setShowNewCategory(true);
                        } else {
                          setForm((prev) => ({ ...prev, categoryId: event.target.value }));
                        }
                      }}
                    >
                      <option value="">Select a category (optional)</option>
                      {categories.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.name}
                        </option>
                      ))}
                      <option value="__create_new__">+ Create New Category</option>
                    </select>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        placeholder="New category name"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        disabled={creatingCategory}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleCreateCategory}
                        disabled={!newCategoryName.trim() || creatingCategory}
                        className="bg-sage hover:bg-sage-dark text-white"
                      >
                        {creatingCategory ? "..." : <Plus className="h-4 w-4" />}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setShowNewCategory(false);
                          setNewCategoryName("");
                        }}
                        disabled={creatingCategory}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="envelope-priority" className="text-sm font-medium text-secondary">
                    Priority <span className="text-[#6B9ECE]">*</span>
                  </Label>
                  <select
                    id="envelope-priority"
                    className={cn(
                      "h-10 w-full rounded-lg border bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      priorityError ? "border-[#6B9ECE] ring-1 ring-[#6B9ECE]" : "border-border",
                      !form.priority && "text-muted-foreground"
                    )}
                    value={form.priority}
                    onChange={(event) => {
                      setPriorityError(false);
                      setForm((prev) => ({
                        ...prev,
                        priority: event.target.value as "essential" | "important" | "discretionary" | "",
                      }));
                    }}
                  >
                    <option value="" disabled>Select a priority level</option>
                    <option value="essential">🔴 Essential (Must pay)</option>
                    <option value="important">🟡 Important (Should pay)</option>
                    <option value="discretionary">🔵 Extras (Nice to have)</option>
                  </select>
                  {priorityError && (
                    <p className="text-xs text-[#6B9ECE]">Please select a priority level</p>
                  )}
                </div>
              </div>

              {/* Amount & Frequency Section */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="opening-balance" className="text-sm font-medium text-secondary">
                      Opening Balance
                    </Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-text-medium cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs bg-sage-very-light border-sage-light text-text-dark">
                          <p className="text-sm">
                            Only add an opening balance if you already have money set aside for this.
                            No worries if it's zero – we'll help you build it up through your pay cycle allocations!
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input
                    id="opening-balance"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={form.openingBalance}
                    onChange={(event) => setForm((prev) => ({ ...prev, openingBalance: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="due-amount" className="text-sm font-medium text-secondary">
                    Due Amount
                  </Label>
                  <Input
                    id="due-amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={form.dueAmount}
                    onChange={(event) => setForm((prev) => ({ ...prev, dueAmount: event.target.value }))}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="due-frequency" className="text-sm font-medium text-secondary">
                    Due Frequency
                  </Label>
                  <select
                    id="due-frequency"
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    value={form.dueFrequency}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        dueFrequency: event.target.value as PlannerFrequency,
                      }))
                    }
                  >
                    {frequencyOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="due-date" className="text-sm font-medium text-secondary">
                    Due Date
                  </Label>
                  <Popover modal={true}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "flex h-10 w-full items-center justify-between rounded-lg border border-border bg-background px-3 text-sm font-medium",
                          !form.dueDate && "text-muted-foreground",
                        )}
                      >
                        {form.dueDate ? form.dueDate : "Pick a date"}
                        <CalendarIcon className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="p-0 z-[100]"
                      sideOffset={8}
                      align="start"
                      side="bottom"
                      avoidCollisions={true}
                      collisionPadding={16}
                    >
                      <Calendar
                        mode="single"
                        selected={form.dueDate ? new Date(form.dueDate) : undefined}
                        onSelect={(date) =>
                          setForm((prev) => ({ ...prev, dueDate: date ? date.toISOString().slice(0, 10) : "" }))
                        }
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Per-Pay Impact Display */}
              {dueAmountNumber > 0 && incomeImpacts.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-text-dark text-sm">Per Pay Commitment</h3>
                  {incomeImpacts.map((impact) => (
                    <div
                      key={impact.incomeId}
                      className={cn(
                        "rounded-xl border p-4",
                        impact.shortfall > 0
                          ? "border-gold bg-gold-light/30"
                          : "border-sage-light bg-sage-very-light"
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-text-dark">
                          {impact.incomeName} ({formatPayFrequency(impact.payFrequency)})
                        </span>
                        <span className="text-lg font-bold text-blue">
                          {formatCurrency(impact.amountPerPay)} / pay
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-sm py-1 border-t border-current/10">
                        <span className="text-text-medium">Current surplus:</span>
                        <span className="font-semibold text-sage">
                          {formatCurrency(impact.surplusAmount)}
                        </span>
                      </div>

                      {impact.shortfall > 0 ? (
                        <div className="pt-2 mt-2 border-t border-gold/30">
                          <p className="text-sm font-medium text-text-dark">
                            ⚠️ Still to find: {formatCurrency(impact.shortfall)}
                          </p>
                          <p className="text-xs text-text-medium mt-1">
                            You'll need to adjust other envelopes
                          </p>
                        </div>
                      ) : (
                        <div className="pt-2 mt-2 border-t border-sage/30">
                          <p className="text-sm font-medium text-sage-dark">
                            ✓ Surplus covers this
                          </p>
                          <p className="text-xs text-text-medium mt-1">
                            {formatCurrency(impact.surplusAmount - impact.amountPerPay)} will remain in surplus
                          </p>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Income Selection for Multi-Income Users */}
                  {incomeReality.length > 1 && (
                    <div className="pt-3 border-t border-border/60">
                      <Label className="text-sm font-medium text-secondary mb-3 block">
                        Which income will fund this?
                      </Label>
                      <div className="space-y-2">
                        {incomeImpacts.map((impact) => (
                          <label
                            key={impact.incomeId}
                            className={cn(
                              "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                              selectedIncomeId === impact.incomeId
                                ? "border-sage bg-sage-very-light"
                                : "border-border hover:bg-muted/30"
                            )}
                          >
                            <input
                              type="radio"
                              name="income_source"
                              value={impact.incomeId}
                              checked={selectedIncomeId === impact.incomeId}
                              onChange={(e) => setSelectedIncomeId(e.target.value)}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <div className="font-medium text-text-dark text-sm">
                                {impact.incomeName} ({formatPayFrequency(impact.payFrequency)})
                              </div>
                              <div className="text-xs text-text-medium">
                                {impact.coversIt
                                  ? "Surplus covers it"
                                  : `Still to find: ${formatCurrency(impact.shortfall)}`}
                              </div>
                            </div>
                          </label>
                        ))}

                        <label
                          className={cn(
                            "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                            selectedIncomeId === "split"
                              ? "border-sage bg-sage-very-light"
                              : "border-border hover:bg-muted/30"
                          )}
                        >
                          <input
                            type="radio"
                            name="income_source"
                            value="split"
                            checked={selectedIncomeId === "split"}
                            onChange={(e) => setSelectedIncomeId(e.target.value)}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-text-dark text-sm">
                              Split across both (recommended)
                            </div>
                            <div className="text-xs text-text-medium">
                              Distribute proportionally across income sources
                            </div>
                          </div>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="envelope-notes" className="text-sm font-medium text-secondary">
                  Notes (Optional)
                </Label>
                <Textarea
                  id="envelope-notes"
                  rows={3}
                  placeholder="Add any notes about this envelope..."
                  value={form.notes}
                  onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                />
              </div>

              {/* Options */}
              <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/20 p-4">
                <label className="flex items-start gap-3 text-sm text-secondary">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border border-border"
                    checked={form.isSpending}
                    onChange={(event) => setForm((prev) => ({ ...prev, isSpending: event.target.checked }))}
                  />
                  <span>
                    <span className="font-medium">Spending Account</span>{" "}
                    <span className="text-muted-foreground">(No predicted spend budget)</span>
                  </span>
                </label>
                <label className="flex items-start gap-3 text-sm text-secondary cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border border-border"
                    checked={form.isMonitored}
                    onChange={(event) => setForm((prev) => ({ ...prev, isMonitored: event.target.checked }))}
                  />
                  <span>
                    <span className="font-medium">Monitor on Dashboard</span>
                    <span className="block text-xs text-muted-foreground">Show this envelope in the dashboard monitoring widget.</span>
                  </span>
                </label>
              </div>

              {/* Summary */}
              <div className="grid gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm text-muted-foreground md:grid-cols-2">
                <div>
                  <p className="uppercase tracking-wide text-xs text-muted-foreground">Required per pay</p>
                  <p className="text-lg font-semibold text-secondary">
                    {formatCurrency(perPayAmount)} / {form.dueFrequency}
                  </p>
                </div>
                <div>
                  <p className="uppercase tracking-wide text-xs text-muted-foreground">Annual funding</p>
                  <p className="text-lg font-semibold text-secondary">{formatCurrency(annualAmount)}</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex shrink-0 justify-end gap-2 border-t border-border/40 px-6 py-4">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" className="gap-2 bg-sage hover:bg-sage-dark text-white" disabled={submitting}>
                {submitting && <span className="h-2 w-2 animate-ping rounded-full bg-primary-foreground" />}
                Create & Adjust Budget
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
