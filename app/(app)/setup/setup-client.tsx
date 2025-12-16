"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Calculator,
  DollarSign,
  Landmark,
  CreditCard,
  CheckCircle,
  ArrowRight,
  Plus,
  Trash2,
  TrendingUp,
  Home,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

const accountSchema = z.object({
  name: z.string().min(1, "Account name is required"),
  type: z.enum(["transaction", "savings", "debt", "investment", "cash", "liability"]),
  balance: z.string().min(1, "Balance is required"),
});

const envelopeSchema = z.object({
  name: z.string().min(1, "Envelope name is required"),
  icon: z.string().min(1, "Icon is required"),
  budgetedAmount: z.string().min(1, "Budget amount is required"),
});

type AccountForm = z.infer<typeof accountSchema>;
type EnvelopeForm = z.infer<typeof envelopeSchema>;

interface SetupClientProps {
  userId?: string;
}

export function SetupClient({ userId }: SetupClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [accounts, setAccounts] = useState<AccountForm[]>([]);
  const [envelopes, setEnvelopes] = useState<EnvelopeForm[]>([]);
  const [payFrequency, setPayFrequency] = useState<
    "weekly" | "fortnightly" | "monthly"
  >("fortnightly");
  const [periodIncome, setPeriodIncome] = useState("");

  const accountForm = useForm<AccountForm>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: "",
      type: "transaction",
      balance: "",
    },
  });

  const envelopeForm = useForm<EnvelopeForm>({
    resolver: zodResolver(envelopeSchema),
    defaultValues: {
      name: "",
      icon: "💰",
      budgetedAmount: "",
    },
  });

  const commonEnvelopes = [
    { name: "Housing", icon: "🏠", suggested: 30 },
    { name: "Food & Groceries", icon: "🍽️", suggested: 15 },
    { name: "Transportation", icon: "🚗", suggested: 15 },
    { name: "Utilities", icon: "⚡", suggested: 10 },
    { name: "Insurance", icon: "🛡️", suggested: 10 },
    { name: "Savings", icon: "💰", suggested: 10 },
    { name: "Entertainment", icon: "🎬", suggested: 5 },
    { name: "Miscellaneous", icon: "📦", suggested: 5 },
  ];

  const addAccount = (data: AccountForm) => {
    setAccounts([...accounts, data]);
    accountForm.reset();
    toast.success(`${data.name} added to setup`);
  };

  const removeAccount = (index: number) => {
    setAccounts(accounts.filter((_, i) => i !== index));
    toast.info("Account removed");
  };

  const addEnvelope = (data: EnvelopeForm) => {
    setEnvelopes([...envelopes, data]);
    envelopeForm.reset();
    toast.success(`${data.name} envelope added`);
  };

  const addCommonEnvelope = (envelope: (typeof commonEnvelopes)[0]) => {
    const income = parseFloat(periodIncome) || 0;
    const suggestedAmount = ((income * envelope.suggested) / 100).toFixed(2);

    setEnvelopes([
      ...envelopes,
      {
        name: envelope.name,
        icon: envelope.icon,
        budgetedAmount: suggestedAmount,
      },
    ]);
    toast.success(`${envelope.name} envelope added`);
  };

  const removeEnvelope = (index: number) => {
    setEnvelopes(envelopes.filter((_, i) => i !== index));
    toast.info("Envelope removed");
  };

  const calculateTotalBudget = () => {
    return envelopes.reduce(
      (sum, env) => sum + parseFloat(env.budgetedAmount || "0"),
      0
    );
  };

  const calculateRemaining = () => {
    const income = parseFloat(periodIncome) || 0;
    return income - calculateTotalBudget();
  };

  const finishSetupMutation = useMutation({
    mutationFn: async () => {
      // Create accounts
      for (const account of accounts) {
        const response = await fetch("/api/accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: account.name,
            type: account.type,
            current_balance: account.balance,
          }),
        });
        if (!response.ok) throw new Error("Failed to create account");
      }

      // Create envelopes
      for (const envelope of envelopes) {
        const response = await fetch("/api/envelopes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: envelope.name,
            icon: envelope.icon,
            pay_cycle_amount: envelope.budgetedAmount,
            current_amount: envelope.budgetedAmount, // Start with full budget
            envelope_type: "expense", // Default to expense
          }),
        });
        if (!response.ok) throw new Error("Failed to create envelope");
      }

      // Save pay frequency
      await fetch("/api/user/pay-cycle", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payCycle: payFrequency }),
      });

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success("Setup complete! Your budget system is ready to use.");
      router.push("/dashboard");
    },
    onError: (error) => {
      console.error("Setup error:", error);
      toast.error("Setup failed. Please try again.");
    },
  });

  const steps = [
    { title: "Accounts", description: "Add your bank accounts" },
    { title: "Income", description: "Set your income details" },
    { title: "Envelopes", description: "Create budget categories" },
    { title: "Review", description: "Confirm your setup" },
  ];

  const getAccountTypeIcon = (type: string) => {
    switch (type) {
      case "transaction":
        return <DollarSign className="h-5 w-5 text-blue-600" />;
      case "savings":
        return <Landmark className="h-5 w-5 text-green-600" />;
      case "debt":
      case "credit":
        return <CreditCard className="h-5 w-5 text-red-600" />;
      case "investment":
        return <TrendingUp className="h-5 w-5 text-purple-600" />;
      default:
        return <Wallet className="h-5 w-5 text-gray-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome to My Budget Mate
          </h1>
          <p className="text-muted-foreground">
            Let&apos;s set up your personal finance system in a few easy steps
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    index + 1 <= currentStep
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {index + 1 < currentStep ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    index + 1
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-12 md:w-20 h-0.5 mx-2 transition-colors ${
                      index + 1 < currentStep ? "bg-primary" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="text-center">
            <h2 className="text-xl font-semibold text-foreground">
              {steps[currentStep - 1].title}
            </h2>
            <p className="text-muted-foreground">
              {steps[currentStep - 1].description}
            </p>
          </div>
        </div>

        {/* Step Content */}
        <Card className="mb-6">
          <CardContent className="p-6">
            {/* Step 1: Accounts */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <Landmark className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    Add Your Bank Accounts
                  </h3>
                  <p className="text-muted-foreground">
                    Enter the current balances for all your accounts to get
                    started
                  </p>
                </div>

                <Form {...accountForm}>
                  <form
                    onSubmit={accountForm.handleSubmit(addAccount)}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <FormField
                        control={accountForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Account Name</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="ANZ Cheque" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={accountForm.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Account Type</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="transaction">
                                  Transaction
                                </SelectItem>
                                <SelectItem value="savings">Savings</SelectItem>
                                <SelectItem value="debt">Credit Card</SelectItem>
                                <SelectItem value="investment">
                                  Investment
                                </SelectItem>
                                <SelectItem value="liability">
                                  Liability
                                </SelectItem>
                                <SelectItem value="cash">Cash</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={accountForm.control}
                        name="balance"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Current Balance</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                step="0.01"
                                placeholder="1500.00"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex items-end">
                        <Button type="submit" className="w-full">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Account
                        </Button>
                      </div>
                    </div>
                  </form>
                </Form>

                {accounts.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Added Accounts:</h4>
                    {accounts.map((account, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          {getAccountTypeIcon(account.type)}
                          <div>
                            <p className="font-medium">{account.name}</p>
                            <p className="text-sm text-muted-foreground capitalize">
                              {account.type}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold">
                            ${parseFloat(account.balance).toFixed(2)}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAccount(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Income */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <TrendingUp className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Set Your Income</h3>
                  <p className="text-muted-foreground">
                    Tell us about your income to help calculate envelope budgets
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <Label>Pay Frequency</Label>
                    <Select
                      value={payFrequency}
                      onValueChange={(value: any) => setPayFrequency(value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="fortnightly">Fortnightly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-4">
                    <Label>
                      {payFrequency === "weekly"
                        ? "Weekly Income"
                        : payFrequency === "fortnightly"
                        ? "Fortnightly Income"
                        : "Monthly Income"}
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="4000.00"
                      value={periodIncome}
                      onChange={(e) => setPeriodIncome(e.target.value)}
                    />
                  </div>
                </div>

                {periodIncome && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <h4 className="font-medium mb-2">Income Breakdown:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">
                          Per {payFrequency === "weekly"
                            ? "Week"
                            : payFrequency === "fortnightly"
                            ? "Fortnight"
                            : "Month"}
                        </p>
                        <p className="font-semibold">
                          ${parseFloat(periodIncome).toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Monthly</p>
                        <p className="font-semibold">
                          $
                          {payFrequency === "weekly"
                            ? (parseFloat(periodIncome) * 4.33).toFixed(2)
                            : payFrequency === "fortnightly"
                            ? (parseFloat(periodIncome) * 2.17).toFixed(2)
                            : parseFloat(periodIncome).toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Annual</p>
                        <p className="font-semibold">
                          $
                          {payFrequency === "weekly"
                            ? (parseFloat(periodIncome) * 52).toFixed(2)
                            : payFrequency === "fortnightly"
                            ? (parseFloat(periodIncome) * 26).toFixed(2)
                            : (parseFloat(periodIncome) * 12).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Envelopes */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <Calculator className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    Create Your Envelopes
                  </h3>
                  <p className="text-muted-foreground">
                    Set up budget categories based on your spending patterns
                  </p>
                </div>

                {periodIncome && (
                  <div className="mb-6">
                    <h4 className="font-medium mb-4">
                      Quick Start - Common Envelopes:
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {commonEnvelopes.map((envelope, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          className="justify-between p-4 h-auto"
                          onClick={() => addCommonEnvelope(envelope)}
                        >
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">{envelope.icon}</span>
                            <span>{envelope.name}</span>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">
                              {envelope.suggested}%
                            </p>
                            <p className="font-semibold">
                              $
                              {(
                                (parseFloat(periodIncome) * envelope.suggested) /
                                100
                              ).toFixed(2)}
                            </p>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                <Form {...envelopeForm}>
                  <form
                    onSubmit={envelopeForm.handleSubmit(addEnvelope)}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <FormField
                        control={envelopeForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Envelope Name</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Custom Category" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={envelopeForm.control}
                        name="icon"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Icon</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="💰" maxLength={2} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={envelopeForm.control}
                        name="budgetedAmount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {payFrequency === "weekly"
                                ? "Weekly"
                                : payFrequency === "fortnightly"
                                ? "Fortnightly"
                                : "Monthly"}{" "}
                              Budget
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                step="0.01"
                                placeholder="500.00"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex items-end">
                        <Button type="submit" className="w-full">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Envelope
                        </Button>
                      </div>
                    </div>
                  </form>
                </Form>

                {envelopes.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="font-medium">Your Envelopes:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {envelopes.map((envelope, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                        >
                          <div className="flex items-center space-x-3">
                            <span className="text-lg">{envelope.icon}</span>
                            <span className="font-medium">{envelope.name}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold">
                              ${parseFloat(envelope.budgetedAmount).toFixed(2)}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeEnvelope(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {periodIncome && (
                      <div className="p-4 bg-muted/30 rounded-lg space-y-2">
                        <div className="flex justify-between items-center">
                          <span>Total Budgeted:</span>
                          <span className="font-semibold">
                            ${calculateTotalBudget().toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Income per Period:</span>
                          <span className="font-semibold">
                            ${parseFloat(periodIncome).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center border-t pt-2">
                          <span className="font-medium">Remaining:</span>
                          <span
                            className={`font-semibold ${
                              calculateRemaining() >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            ${calculateRemaining().toFixed(2)}
                          </span>
                        </div>
                        <Progress
                          value={
                            (calculateTotalBudget() /
                              parseFloat(periodIncome)) *
                            100
                          }
                          className="mt-2"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Review */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    Review Your Setup
                  </h3>
                  <p className="text-muted-foreground">
                    Confirm your configuration before we create your personal
                    budget system
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        Accounts ({accounts.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {accounts.map((account, index) => (
                          <div
                            key={index}
                            className="flex justify-between text-sm"
                          >
                            <span className="truncate mr-2">{account.name}</span>
                            <span className="font-semibold whitespace-nowrap">
                              ${parseFloat(account.balance).toFixed(2)}
                            </span>
                          </div>
                        ))}
                        <div className="border-t pt-2">
                          <div className="flex justify-between font-semibold">
                            <span>Total Assets:</span>
                            <span>
                              $
                              {accounts
                                .reduce(
                                  (sum, acc) =>
                                    sum +
                                    (acc.type !== "debt" &&
                                    acc.type !== "liability"
                                      ? parseFloat(acc.balance)
                                      : 0),
                                  0
                                )
                                .toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        Envelopes ({envelopes.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {envelopes.slice(0, 5).map((envelope, index) => (
                          <div
                            key={index}
                            className="flex justify-between text-sm"
                          >
                            <span className="truncate mr-2">
                              {envelope.icon} {envelope.name}
                            </span>
                            <span className="font-semibold whitespace-nowrap">
                              ${parseFloat(envelope.budgetedAmount).toFixed(2)}
                            </span>
                          </div>
                        ))}
                        {envelopes.length > 5 && (
                          <p className="text-sm text-muted-foreground">
                            ... and {envelopes.length - 5} more
                          </p>
                        )}
                        <div className="border-t pt-2">
                          <div className="flex justify-between font-semibold">
                            <span>Total Budget:</span>
                            <span>${calculateTotalBudget().toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h4 className="font-medium mb-2">What happens next?</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Your accounts and envelopes will be created</li>
                    <li>
                      • Envelopes will start with their full budget amounts
                    </li>
                    <li>
                      • You can start adding transactions and tracking spending
                    </li>
                    <li>
                      • Use the transfer feature to rebalance envelopes as
                      needed
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
          >
            Previous
          </Button>

          {currentStep < 4 ? (
            <Button
              onClick={() => setCurrentStep(Math.min(4, currentStep + 1))}
              disabled={
                (currentStep === 1 && accounts.length === 0) ||
                (currentStep === 2 && !periodIncome) ||
                (currentStep === 3 && envelopes.length === 0)
              }
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={() => finishSetupMutation.mutate()}
              disabled={finishSetupMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {finishSetupMutation.isPending
                ? "Setting up..."
                : "Complete Setup"}
              <CheckCircle className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
