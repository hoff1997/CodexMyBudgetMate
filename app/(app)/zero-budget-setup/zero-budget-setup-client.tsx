"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EnvelopeCreateDialog } from "@/components/layout/envelopes/envelope-create-dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import HelpTooltip from "@/components/ui/help-tooltip";
import { format, addDays, addWeeks, addMonths, addQuarters, addYears } from "date-fns";
import {
  CalendarIcon,
  Plus,
  Edit,
  Trash2,
  Target,
  BarChart3,
  ArrowUpCircle,
  ArrowDownCircle,
} from "lucide-react";
import "./zero-budget-setup.css";

interface EditingField {
  envelopeId: string;
  field: string;
  value: string;
  relatedValue?: string;
}

interface Envelope {
  id: string;
  name: string;
  envelope_type?: string;
  target_amount?: string | number;
  annual_amount?: string | number;
  pay_cycle_amount?: string | number;
  opening_balance?: string | number;
  current_amount?: string | number;
  frequency?: string;
  next_payment_due?: string;
  notes?: string | null;
}

interface ZeroBudgetSetupClientProps {
  userId?: string;
  initialPayCycle?: string;
}

export function ZeroBudgetSetupClient({
  userId,
  initialPayCycle = "monthly",
}: ZeroBudgetSetupClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editingField, setEditingField] = useState<EditingField | null>(null);
  const [focusedField, setFocusedField] = useState<{
    envelopeId: string;
    field: string;
  } | null>(null);
  const [payCycle, setPayCycle] = useState(initialPayCycle);
  const [createOpen, setCreateOpen] = useState(false);

  // Get envelopes data
  const { data: envelopes = [] } = useQuery<Envelope[]>({
    queryKey: ["/api/envelopes"],
    queryFn: async () => {
      const response = await fetch("/api/envelopes");
      if (!response.ok) throw new Error("Failed to fetch envelopes");
      const data = await response.json();
      return Array.isArray(data) ? data : data.envelopes || [];
    },
  });

  // Mutations
  const updateEnvelopeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await fetch(`/api/envelopes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update envelope");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/envelopes"] });
    },
  });

  const deleteEnvelopeMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/envelopes/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete envelope");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/envelopes"] });
      toast.success("Envelope deleted successfully");
    },
  });

  // Handle inline editing
  const handleInlineEdit = async (
    envelopeId: string,
    field: string,
    value: string,
    relatedValue?: string
  ) => {
    try {
      const data: any = { [field]: value };

      // Handle special cases for related field updates
      if (field === "pay_cycle_amount" && relatedValue) {
        data.annual_amount = relatedValue;
      } else if (field === "annual_amount" && relatedValue) {
        data.pay_cycle_amount = relatedValue;
      } else if (field === "target_amount") {
        // When target amount is set for expense envelopes, calculate the per-cycle saving amount
        const targetAmount = parseFloat(value);
        const cycleDays =
          payCycle === "weekly" ? 7 : payCycle === "fortnightly" ? 14 : 30;

        // Calculate how much to save per cycle to reach target by due date
        const envelope = envelopes.find((env) => env.id === envelopeId);
        if (
          envelope?.next_payment_due &&
          envelope.envelope_type === "expense"
        ) {
          const dueDate = new Date(envelope.next_payment_due);
          const now = new Date();
          const daysUntilDue = Math.max(
            1,
            Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          );
          const cyclesUntilDue = Math.max(1, Math.ceil(daysUntilDue / cycleDays));

          const currentBalance = parseFloat(String(envelope.current_amount || "0"));
          const amountNeeded = Math.max(0, targetAmount - currentBalance);
          const perCycleAmount = amountNeeded / cyclesUntilDue;

          data.pay_cycle_amount = perCycleAmount.toFixed(2);
        }
      }

      await updateEnvelopeMutation.mutateAsync({ id: envelopeId, data });
    } catch (error) {
      console.error("Failed to update envelope:", error);
      toast.error("Failed to update envelope. Please try again.");
    }
  };

  // Handle pay cycle update
  const handlePayCycleChange = async (value: string) => {
    try {
      const response = await fetch("/api/user/pay-cycle", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payCycle: value }),
      });

      if (response.ok) {
        setPayCycle(value);
        queryClient.invalidateQueries({ queryKey: ["/api/envelopes"] });
        toast.success("Pay cycle updated");
      } else {
        throw new Error("Failed to update pay cycle");
      }
    } catch (error) {
      console.error("Failed to update pay cycle:", error);
      toast.error("Failed to update pay cycle");
    }
  };

  // Calculate expected balance based on budget frequency and due date
  const calculateExpectedBalance = (envelope: Envelope) => {
    const openingBalance = parseFloat(String(envelope.opening_balance || "0"));

    if (
      !envelope.frequency ||
      envelope.frequency === "none" ||
      !envelope.next_payment_due
    ) {
      return openingBalance;
    }

    const now = new Date();
    const dueDate = new Date(envelope.next_payment_due);

    // For expense envelopes, use target amount; for income, use budget amount
    const targetAmount =
      envelope.envelope_type === "expense"
        ? parseFloat(String(envelope.target_amount || "0"))
        : parseFloat(String(envelope.pay_cycle_amount || "0"));

    // Calculate cycle length in days based on frequency
    let cycleDays = 30; // Default to monthly
    switch (envelope.frequency) {
      case "weekly":
        cycleDays = 7;
        break;
      case "fortnightly":
        cycleDays = 14;
        break;
      case "monthly":
        cycleDays = 30;
        break;
      case "quarterly":
        cycleDays = 91;
        break;
      case "annually":
        cycleDays = 365;
        break;
    }

    // Calculate the start of the current cycle (working backwards from due date)
    const cycleStart = new Date(
      dueDate.getTime() - cycleDays * 24 * 60 * 60 * 1000
    );

    // If we're past the due date, we should have the full target amount
    if (now >= dueDate) {
      return openingBalance + targetAmount;
    }

    // If we're before the cycle started, just return opening balance
    if (now < cycleStart) {
      return openingBalance;
    }

    // Calculate progress through the current cycle
    const daysSinceCycleStart = Math.floor(
      (now.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24)
    );
    const progressRatio = Math.min(daysSinceCycleStart / cycleDays, 1);

    // Expected balance = opening balance + (target amount * progress through cycle)
    return openingBalance + targetAmount * progressRatio;
  };

  // Calculate totals (including opening balances for startup allocation)
  const incomeEnvelopes = envelopes.filter(
    (env) => env.envelope_type === "income"
  );
  const expenseEnvelopes = envelopes.filter(
    (env) => env.envelope_type === "expense"
  );

  const totalIncome = incomeEnvelopes.reduce(
    (sum, env) =>
      sum +
      parseFloat(String(env.pay_cycle_amount || "0")) +
      parseFloat(String(env.opening_balance || "0")),
    0
  );
  const totalExpenses = expenseEnvelopes.reduce(
    (sum, env) =>
      sum +
      parseFloat(String(env.pay_cycle_amount || "0")) +
      parseFloat(String(env.opening_balance || "0")),
    0
  );
  const difference = totalIncome - totalExpenses;

  // Render envelope row
  const renderEnvelopeRow = (envelope: Envelope, index: number) => {
    const payCycleAmount = parseFloat(String(envelope.pay_cycle_amount || "0"));
    const annualAmount = parseFloat(String(envelope.annual_amount || "0"));
    const openingBalance = parseFloat(String(envelope.opening_balance || "0"));
    const currentBalance = parseFloat(String(envelope.current_amount || "0"));
    const expectedBalance = calculateExpectedBalance(envelope);
    const balanceDifference = currentBalance - expectedBalance;

    return (
      <tr key={envelope.id || index} className="text-sm hover:bg-muted/50">
        <td className="font-medium w-32 p-2">
          {/* Envelope name */}
          {editingField?.envelopeId === envelope.id &&
          editingField?.field === "name" ? (
            <Input
              value={editingField.value}
              onChange={(e) =>
                setEditingField({ ...editingField, value: e.target.value })
              }
              onBlur={() => {
                handleInlineEdit(envelope.id!, "name", editingField.value);
                setEditingField(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleInlineEdit(envelope.id!, "name", editingField.value);
                  setEditingField(null);
                }
                if (e.key === "Escape") {
                  setEditingField(null);
                }
              }}
              className="h-8"
              autoFocus
            />
          ) : (
            <div className="space-y-1">
              <div
                className="cursor-pointer text-blue-600 hover:text-blue-800 text-sm"
                onClick={() =>
                  setEditingField({
                    envelopeId: envelope.id!,
                    field: "name",
                    value: envelope.name,
                  })
                }
              >
                {envelope.name}
              </div>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-1">
                  {/* Type Icon */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0"
                    onClick={() => {
                      const newType =
                        envelope.envelope_type === "income" ? "expense" : "income";
                      updateEnvelopeMutation.mutate({
                        id: envelope.id!,
                        data: { envelope_type: newType },
                      });
                    }}
                    title={`Toggle to ${
                      envelope.envelope_type === "income" ? "expense" : "income"
                    }`}
                  >
                    {envelope.envelope_type === "income" ? (
                      <ArrowUpCircle className="h-3 w-3 text-green-600" />
                    ) : (
                      <ArrowDownCircle className="h-3 w-3 text-red-600" />
                    )}
                  </Button>

                  {editingField?.envelopeId === envelope.id &&
                  editingField?.field === "notes" ? (
                    <Input
                      value={editingField.value}
                      onChange={(e) =>
                        setEditingField({ ...editingField, value: e.target.value })
                      }
                      onBlur={() => {
                        handleInlineEdit(envelope.id!, "notes", editingField.value);
                        setEditingField(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleInlineEdit(
                            envelope.id!,
                            "notes",
                            editingField.value
                          );
                          setEditingField(null);
                        }
                        if (e.key === "Escape") {
                          setEditingField(null);
                        }
                      }}
                      className="h-5 text-xs italic flex-1"
                      placeholder="Add notes..."
                      autoFocus
                    />
                  ) : (
                    <div
                      className="text-xs italic text-muted-foreground cursor-pointer hover:text-blue-600 flex-1 truncate"
                      onClick={() =>
                        setEditingField({
                          envelopeId: envelope.id!,
                          field: "notes",
                          value: envelope.notes || "",
                        })
                      }
                      title={envelope.notes || "Add notes..."}
                    >
                      {envelope.notes || "Add notes..."}
                    </div>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0"
                  onClick={() =>
                    setEditingField({
                      envelopeId: envelope.id!,
                      field: "notes",
                      value: envelope.notes || "",
                    })
                  }
                  title="Edit notes"
                >
                  <Edit className="h-2 w-2" />
                </Button>
              </div>
            </div>
          )}
        </td>

        {/* Schedule Column */}
        <td className="w-24 p-2">
          <div className="space-y-1">
            <Select
              value={envelope.frequency || "monthly"}
              onValueChange={(value) => {
                updateEnvelopeMutation.mutate({
                  id: envelope.id!,
                  data: { frequency: value },
                });
              }}
            >
              <SelectTrigger className="h-6 w-full text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[9999]">
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="fortnightly">Fortnight</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="annually">Annual</SelectItem>
              </SelectContent>
            </Select>

            {/* Target Amount for Expense Envelopes */}
            {envelope.frequency &&
              envelope.frequency !== "none" &&
              envelope.envelope_type === "expense" && (
                <div className="text-xs mb-1">
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={
                      focusedField?.envelopeId === envelope.id &&
                      focusedField?.field === "target_amount"
                        ? editingField?.envelopeId === envelope.id &&
                          editingField?.field === "target_amount"
                          ? editingField.value
                          : ""
                        : parseFloat(String(envelope.target_amount || "0")).toFixed(2)
                    }
                    onChange={(e) => {
                      setEditingField({
                        envelopeId: envelope.id!,
                        field: "target_amount",
                        value: e.target.value,
                      });
                      // Real-time save on each keystroke
                      handleInlineEdit(envelope.id!, "target_amount", e.target.value);
                    }}
                    onFocus={() => {
                      setFocusedField({
                        envelopeId: envelope.id!,
                        field: "target_amount",
                      });
                      setEditingField({
                        envelopeId: envelope.id!,
                        field: "target_amount",
                        value: "",
                      });
                    }}
                    onBlur={() => {
                      if (
                        editingField?.envelopeId === envelope.id &&
                        editingField?.field === "target_amount"
                      ) {
                        handleInlineEdit(
                          envelope.id!,
                          "target_amount",
                          editingField.value
                        );
                      }
                      setFocusedField(null);
                      setEditingField(null);
                    }}
                    className="h-6 w-full text-xs text-center border-0 bg-transparent focus:bg-white focus:border-gray-200 rounded-none focus:rounded text-blue-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="Bill amount"
                  />
                </div>
              )}

            {/* Due Date Calendar Selector */}
            {envelope.frequency && envelope.frequency !== "none" && (
              <div className="text-xs">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 w-full text-xs justify-start font-normal"
                    >
                      <CalendarIcon className="mr-1 h-3 w-3" />
                      {envelope.next_payment_due
                        ? new Date(envelope.next_payment_due).toLocaleDateString(
                            "en-NZ",
                            {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            }
                          )
                        : "Set next due date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[9999]">
                    <Calendar
                      mode="single"
                      selected={
                        envelope.next_payment_due
                          ? new Date(envelope.next_payment_due)
                          : undefined
                      }
                      onSelect={(date) => {
                        if (date) {
                          updateEnvelopeMutation.mutate({
                            id: envelope.id!,
                            data: { next_payment_due: date.toISOString() },
                          });
                        }
                      }}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>
        </td>

        {/* Pay Cycle Amount */}
        <td className="w-24 p-2">
          <Input
            type="text"
            inputMode="decimal"
            value={
              focusedField?.envelopeId === envelope.id &&
              focusedField?.field === "pay_cycle_amount"
                ? editingField?.envelopeId === envelope.id &&
                  editingField?.field === "pay_cycle_amount"
                  ? editingField.value
                  : ""
                : payCycleAmount.toFixed(2)
            }
            onChange={(e) => {
              const newValue = e.target.value;
              const newAnnual = (
                parseFloat(newValue || "0") *
                (payCycle === "weekly" ? 52 : payCycle === "fortnightly" ? 26 : 12)
              ).toFixed(2);
              setEditingField({
                envelopeId: envelope.id!,
                field: "pay_cycle_amount",
                value: newValue,
                relatedValue: newAnnual,
              });
              // Real-time save on each keystroke
              handleInlineEdit(
                envelope.id!,
                "pay_cycle_amount",
                newValue,
                newAnnual
              );
            }}
            onFocus={() => {
              setFocusedField({
                envelopeId: envelope.id!,
                field: "pay_cycle_amount",
              });
              setEditingField({
                envelopeId: envelope.id!,
                field: "pay_cycle_amount",
                value: "",
                relatedValue: "",
              });
            }}
            onBlur={() => {
              if (
                editingField?.envelopeId === envelope.id &&
                editingField?.field === "pay_cycle_amount"
              ) {
                handleInlineEdit(
                  envelope.id!,
                  "pay_cycle_amount",
                  editingField.value,
                  editingField.relatedValue
                );
              }
              setFocusedField(null);
              setEditingField(null);
            }}
            className="h-6 w-full text-xs text-right border-0 bg-transparent focus:bg-white focus:border-gray-200 rounded-none focus:rounded text-blue-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            placeholder="0.00"
          />
        </td>

        {/* Annual Amount */}
        <td className="w-24 p-2">
          <Input
            type="text"
            inputMode="decimal"
            value={
              focusedField?.envelopeId === envelope.id &&
              focusedField?.field === "annual_amount"
                ? editingField?.envelopeId === envelope.id &&
                  editingField?.field === "annual_amount"
                  ? editingField.value
                  : ""
                : annualAmount.toFixed(2)
            }
            onChange={(e) => {
              const newValue = e.target.value;
              const newPayCycle = (
                parseFloat(newValue || "0") /
                (payCycle === "weekly" ? 52 : payCycle === "fortnightly" ? 26 : 12)
              ).toFixed(2);
              setEditingField({
                envelopeId: envelope.id!,
                field: "annual_amount",
                value: newValue,
                relatedValue: newPayCycle,
              });
              // Real-time save on each keystroke
              handleInlineEdit(
                envelope.id!,
                "annual_amount",
                newValue,
                newPayCycle
              );
            }}
            onFocus={() => {
              setFocusedField({
                envelopeId: envelope.id!,
                field: "annual_amount",
              });
              setEditingField({
                envelopeId: envelope.id!,
                field: "annual_amount",
                value: "",
                relatedValue: "",
              });
            }}
            onBlur={() => {
              if (
                editingField?.envelopeId === envelope.id &&
                editingField?.field === "annual_amount"
              ) {
                handleInlineEdit(
                  envelope.id!,
                  "annual_amount",
                  editingField.value,
                  editingField.relatedValue
                );
              }
              setFocusedField(null);
              setEditingField(null);
            }}
            className="h-6 w-full text-xs text-right border-0 bg-transparent focus:bg-white focus:border-gray-200 rounded-none focus:rounded text-blue-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            placeholder="0.00"
          />
        </td>

        {/* Opening Balance */}
        <td className="w-24 p-2">
          <Input
            type="text"
            inputMode="decimal"
            value={
              focusedField?.envelopeId === envelope.id &&
              focusedField?.field === "opening_balance"
                ? editingField?.envelopeId === envelope.id &&
                  editingField?.field === "opening_balance"
                  ? editingField.value
                  : ""
                : Number(openingBalance || 0).toFixed(2)
            }
            onChange={(e) => {
              setEditingField({
                envelopeId: envelope.id!,
                field: "opening_balance",
                value: e.target.value,
              });
              // Real-time save on each keystroke
              handleInlineEdit(envelope.id!, "opening_balance", e.target.value);
            }}
            onFocus={() => {
              setFocusedField({
                envelopeId: envelope.id!,
                field: "opening_balance",
              });
              setEditingField({
                envelopeId: envelope.id!,
                field: "opening_balance",
                value: "",
              });
            }}
            onBlur={() => {
              if (
                editingField?.envelopeId === envelope.id &&
                editingField?.field === "opening_balance"
              ) {
                handleInlineEdit(
                  envelope.id!,
                  "opening_balance",
                  editingField.value
                );
              }
              setFocusedField(null);
              setEditingField(null);
            }}
            className="h-6 w-full text-xs text-right border-0 bg-transparent focus:bg-white focus:border-gray-200 rounded-none focus:rounded text-blue-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            placeholder="0.00"
          />
        </td>

        {/* Current Balance */}
        <td className="w-16 text-right text-xs p-2">
          ${currentBalance.toFixed(2)}
        </td>

        {/* Expected Balance */}
        <td className="w-16 text-right text-xs p-2">
          ${expectedBalance.toFixed(2)}
        </td>

        {/* Status */}
        <td className="w-12 p-2">
          {(() => {
            if (Math.abs(balanceDifference) < 1) {
              return (
                <Badge
                  variant="secondary"
                  className="bg-green-100 text-green-800 text-xs px-1 py-0"
                >
                  ✓
                </Badge>
              );
            } else if (balanceDifference > 0) {
              return (
                <Badge
                  variant="default"
                  className="bg-blue-100 text-blue-800 text-xs px-1 py-0"
                >
                  +${balanceDifference.toFixed(0)}
                </Badge>
              );
            } else {
              return (
                <Badge variant="destructive" className="text-xs px-1 py-0">
                  -${Math.abs(balanceDifference).toFixed(0)}
                </Badge>
              );
            }
          })()}
        </td>

        {/* Delete Button */}
        <td className="w-6 text-center p-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-4 w-4 p-0 text-red-500 hover:text-red-700"
            onClick={() => {
              if (
                confirm(`Are you sure you want to delete "${envelope.name}"?`)
              ) {
                deleteEnvelopeMutation.mutate(envelope.id!);
              }
            }}
            title="Delete envelope"
          >
            <Trash2 className="h-2 w-2" />
          </Button>
        </td>
      </tr>
    );
  };

  return (
    <div className="p-4 space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Zero-Based Budget Setup</h1>
            <HelpTooltip
              title="Zero-Based Budget Setup"
              content={[
                "Build a complete zero-based budget where every dollar is assigned to either income or expense envelopes. This ensures your income minus expenses equals zero, giving you full control over your finances.",
                "Create income envelopes to track paychecks and other earnings. Create expense envelopes for bills, savings goals, and discretionary spending. The dashboard shows whether you have unallocated funds or are over budget."
              ]}
              tips={[
                "Start with income envelopes: add all expected income sources",
                "Create expense envelopes for fixed bills, then variable expenses",
                "Use 'Add Envelope' to quickly create new budget categories",
                "Aim for zero difference (income = expenses) for a balanced budget"
              ]}
            />
          </div>
          <p className="text-muted-foreground">
            Plan and organize your complete budget system
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Envelope
        </Button>
      </div>

      {/* Pay Cycle Configuration */}
      <div className="bg-card p-4 rounded-lg border">
        <h3 className="text-lg font-semibold mb-3">Pay Cycle Configuration</h3>
        <div className="flex items-center gap-4">
          <label htmlFor="payCycle" className="text-sm font-medium">
            How often do you get paid?
          </label>
          <Select value={payCycle} onValueChange={handlePayCycleChange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="fortnightly">Fortnightly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          This determines how the &quot;Per&quot; column calculates budget amounts from your
          annual totals.
        </p>
      </div>

      {/* Budget Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ArrowUpCircle className="h-4 w-4 text-green-600" />
              Total Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${totalIncome.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">
              per {payCycle === "fortnightly" ? "fortnight" : payCycle}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ArrowDownCircle className="h-4 w-4 text-red-600" />
              Total Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ${totalExpenses.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">
              per {payCycle === "fortnightly" ? "fortnight" : payCycle}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4" />
              Difference
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                difference >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              ${Math.abs(difference).toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">
              {difference >= 0 ? "Surplus" : "Overspent"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Income & Expense Tables */}
      {envelopes.length === 0 ? (
        <p className="text-muted-foreground text-center py-4">
          No envelopes created yet. Click &quot;Add Envelope&quot; to start building your
          budget.
        </p>
      ) : (
        <div className="space-y-8">
          {/* Income Section */}
          {incomeEnvelopes.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <ArrowUpCircle className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-semibold text-green-600">
                  Income Envelopes
                </h3>
              </div>
              <div className="budget-table-container">
                <table className="budget-table">
                  <thead>
                    <tr>
                      <th className="w-32 text-sm">
                        Envelope
                        <br />
                        Name
                      </th>
                      <th className="w-24 text-sm">Schedule</th>
                      <th className="w-24 text-sm">
                        Per
                        <br />
                        <span className="text-blue-600 font-semibold">
                          {payCycle === "fortnightly"
                            ? "Fortnight"
                            : payCycle === "weekly"
                            ? "Week"
                            : "Month"}
                        </span>
                      </th>
                      <th className="w-24 text-sm">Annual</th>
                      <th className="w-24 text-sm">Opening</th>
                      <th className="w-16 text-sm">Current</th>
                      <th className="w-16 text-sm">Expected</th>
                      <th className="w-12 text-sm">Status</th>
                      <th className="w-6 text-sm">Del</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incomeEnvelopes.map((envelope, index) =>
                      renderEnvelopeRow(envelope, index)
                    )}
                    {/* Income Subtotal Row */}
                    <tr className="bg-green-50 border-t-2 border-green-200">
                      <td className="font-bold text-green-700 p-2" colSpan={2}>
                        Income Subtotal
                      </td>
                      <td className="font-bold text-green-700 text-right p-2">
                        $
                        {incomeEnvelopes
                          .reduce(
                            (sum, env) =>
                              sum + parseFloat(String(env.pay_cycle_amount || "0")),
                            0
                          )
                          .toFixed(2)}
                      </td>
                      <td className="font-bold text-green-700 text-right p-2">
                        $
                        {incomeEnvelopes
                          .reduce(
                            (sum, env) =>
                              sum + parseFloat(String(env.annual_amount || "0")),
                            0
                          )
                          .toFixed(2)}
                      </td>
                      <td className="font-bold text-green-700 text-right p-2">
                        $
                        {incomeEnvelopes
                          .reduce(
                            (sum, env) =>
                              sum + parseFloat(String(env.opening_balance || "0")),
                            0
                          )
                          .toFixed(2)}
                      </td>
                      <td className="font-bold text-green-700 text-right p-2">
                        $
                        {incomeEnvelopes
                          .reduce(
                            (sum, env) =>
                              sum + parseFloat(String(env.current_amount || "0")),
                            0
                          )
                          .toFixed(2)}
                      </td>
                      <td colSpan={3}></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Expense Section */}
          {expenseEnvelopes.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <ArrowDownCircle className="h-5 w-5 text-red-600" />
                <h3 className="text-lg font-semibold text-red-600">
                  Expense Envelopes
                </h3>
              </div>
              <div className="budget-table-container">
                <table className="budget-table">
                  <thead>
                    <tr>
                      <th className="w-32 text-sm">
                        Envelope
                        <br />
                        Name
                      </th>
                      <th className="w-24 text-sm">Schedule</th>
                      <th className="w-24 text-sm">
                        Per
                        <br />
                        <span className="text-blue-600 font-semibold">
                          {payCycle === "fortnightly"
                            ? "Fortnight"
                            : payCycle === "weekly"
                            ? "Week"
                            : "Month"}
                        </span>
                      </th>
                      <th className="w-24 text-sm">Annual</th>
                      <th className="w-24 text-sm">Opening</th>
                      <th className="w-16 text-sm">Current</th>
                      <th className="w-16 text-sm">Expected</th>
                      <th className="w-12 text-sm">Status</th>
                      <th className="w-6 text-sm">Del</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenseEnvelopes.map((envelope, index) =>
                      renderEnvelopeRow(envelope, index)
                    )}
                    {/* Expense Subtotal Row */}
                    <tr className="bg-red-50 border-t-2 border-red-200">
                      <td className="font-bold text-red-700 p-2" colSpan={2}>
                        Expense Subtotal
                      </td>
                      <td className="font-bold text-red-700 text-right p-2">
                        $
                        {expenseEnvelopes
                          .reduce(
                            (sum, env) =>
                              sum + parseFloat(String(env.pay_cycle_amount || "0")),
                            0
                          )
                          .toFixed(2)}
                      </td>
                      <td className="font-bold text-red-700 text-right p-2">
                        $
                        {expenseEnvelopes
                          .reduce(
                            (sum, env) =>
                              sum + parseFloat(String(env.annual_amount || "0")),
                            0
                          )
                          .toFixed(2)}
                      </td>
                      <td className="font-bold text-red-700 text-right p-2">
                        $
                        {expenseEnvelopes
                          .reduce(
                            (sum, env) =>
                              sum + parseFloat(String(env.opening_balance || "0")),
                            0
                          )
                          .toFixed(2)}
                      </td>
                      <td className="font-bold text-red-700 text-right p-2">
                        $
                        {expenseEnvelopes
                          .reduce(
                            (sum, env) =>
                              sum + parseFloat(String(env.current_amount || "0")),
                            0
                          )
                          .toFixed(2)}
                      </td>
                      <td colSpan={3}></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Grand Total Row */}
          <div className="bg-slate-100 p-4 rounded-lg">
            <div className="grid grid-cols-6 gap-4 text-sm font-bold">
              <div className="col-span-2">
                Net Difference (Income - Expenses)
              </div>
              <div
                className={`text-right ${
                  difference >= 0 ? "text-green-700" : "text-red-700"
                }`}
              >
                ${difference.toFixed(2)}
              </div>
              <div
                className={`text-right ${
                  difference >= 0 ? "text-green-700" : "text-red-700"
                }`}
              >
                $
                {(
                  difference *
                  (payCycle === "weekly"
                    ? 52
                    : payCycle === "fortnightly"
                    ? 26
                    : 12)
                ).toFixed(2)}{" "}
                annual
              </div>
              <div className="col-span-2"></div>
            </div>
          </div>
        </div>
      )}

      <EnvelopeCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        categories={[]}
        onCreated={() => {
          queryClient.invalidateQueries({ queryKey: ["/api/envelopes"] });
        }}
      />
    </div>
  );
}
