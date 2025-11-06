"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CalendarIcon,
  Check,
  ChevronsUpDown,
  Plus,
  Minus,
  Upload,
  X,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { toast } from "sonner";

const transactionSchema = z.object({
  accountId: z.string().uuid("Account is required"),
  amount: z.string().min(1, "Amount is required"),
  merchant: z.string().min(1, "Merchant is required"),
  description: z.string().optional(),
  date: z.date(),
  status: z.enum(["pending", "approved"]).default("pending"),
  splits: z
    .array(
      z.object({
        envelopeId: z.string().uuid("Envelope is required"),
        amount: z.string().min(1, "Amount is required"),
      }),
    )
    .min(1, "At least one envelope is required"),
});

type TransactionForm = z.infer<typeof transactionSchema>;

interface EnhancedTransactionDialogProps {
  children: React.ReactNode;
  defaultValues?: Partial<TransactionForm>;
  transactionId?: string | null;
  title?: string;
  onSuccess?: () => void;
}

interface Envelope {
  id: string;
  name: string;
  icon?: string | null;
}

interface Account {
  id: string;
  name: string;
  type: string;
}

export function EnhancedTransactionDialog({
  children,
  defaultValues,
  transactionId = null,
  title = "Add Transaction",
  onSuccess,
}: EnhancedTransactionDialogProps) {
  const [open, setOpen] = useState(false);
  const [envelopeSearchOpen, setEnvelopeSearchOpen] = useState<number | null>(
    null,
  );
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const queryClient = useQueryClient();

  const form = useForm<TransactionForm>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      date: new Date(),
      status: "pending",
      splits: [{ envelopeId: "", amount: "" }],
      ...defaultValues,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "splits",
  });

  const { data: accountsData } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const response = await fetch("/api/accounts");
      if (!response.ok) throw new Error("Failed to fetch accounts");
      const data = await response.json();
      return data.accounts || [];
    },
  });

  const { data: envelopesData } = useQuery({
    queryKey: ["envelopes"],
    queryFn: async () => {
      const response = await fetch("/api/envelopes");
      if (!response.ok) throw new Error("Failed to fetch envelopes");
      const data = await response.json();
      return data.envelopes || [];
    },
  });

  const accounts: Account[] = accountsData || [];
  const envelopes: Envelope[] = envelopesData || [];

  const watchAmount = form.watch("amount");
  const watchSplits = form.watch("splits");

  // Calculate envelope allocation
  const totalAllocated = watchSplits.reduce((sum, split) => {
    return sum + (Number.parseFloat(split.amount) || 0);
  }, 0);
  const transactionAmount = Number.parseFloat(watchAmount) || 0;
  const remaining = transactionAmount - totalAllocated;
  const isFullyAllocated = Math.abs(remaining) < 0.01; // Allow for floating point errors

  const createOrUpdateMutation = useMutation({
    mutationFn: async (data: TransactionForm) => {
      const transactionData = {
        merchant_name: data.merchant,
        description: data.description || null,
        amount: Number.parseFloat(data.amount),
        occurred_at: format(data.date, "yyyy-MM-dd"),
        account_id: data.accountId,
        status: data.status,
        // For now, assign first envelope (splitting comes next via split API)
        envelope_id: data.splits[0]?.envelopeId || null,
      };

      let transactionResponse;

      if (transactionId) {
        // Update existing transaction
        const response = await fetch(`/api/transactions/${transactionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(transactionData),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to update transaction");
        }

        transactionResponse = await response.json();
      } else {
        // Create new transaction
        const response = await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(transactionData),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to create transaction");
        }

        transactionResponse = await response.json();
      }

      const createdTransactionId =
        transactionResponse.transaction?.id || transactionId;

      // Handle splits if there are multiple envelopes
      if (data.splits.length > 1 && createdTransactionId) {
        const splitsData = {
          splits: data.splits.map((split) => ({
            envelopeId: split.envelopeId,
            amount: Number.parseFloat(split.amount),
          })),
        };

        const splitResponse = await fetch(
          `/api/transactions/${createdTransactionId}/split`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(splitsData),
          },
        );

        if (!splitResponse.ok) {
          const error = await splitResponse.json();
          throw new Error(error.error || "Failed to save splits");
        }
      }

      return transactionResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["pending-transactions"] });

      toast.success(
        transactionId ? "Transaction updated" : "Transaction created",
        {
          description: transactionId
            ? "Your transaction has been updated successfully."
            : "Your transaction has been created successfully.",
        },
      );

      setOpen(false);
      form.reset();
      setReceiptFile(null);
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error("Error", {
        description: error.message || "Failed to save transaction",
      });
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        // 5MB limit
        toast.error("File too large", {
          description: "Please select a file smaller than 5MB",
        });
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast.error("Invalid file type", {
          description: "Please select an image file",
        });
        return;
      }
      setReceiptFile(file);
    }
  };

  const removeReceipt = () => {
    setReceiptFile(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) =>
              createOrUpdateMutation.mutate(data),
            )}
            className="space-y-4"
          >
            {/* Account Selection */}
            <FormField
              control={form.control}
              name="accountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Amount, Date, Status */}
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                          $
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          className="pl-8"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground",
                            )}
                          >
                            {field.value ? (
                              format(field.value, "dd/MM/yyyy")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Merchant */}
            <FormField
              control={form.control}
              name="merchant"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Merchant</FormLabel>
                  <FormControl>
                    <Input placeholder="Store or merchant name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional details about this transaction"
                      className="min-h-[60px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Envelope Splits */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <FormLabel>Envelope Allocation</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ envelopeId: "", amount: "" })}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Split
                </Button>
              </div>

              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-2 items-end">
                  <FormField
                    control={form.control}
                    name={`splits.${index}.envelopeId`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel className={index > 0 ? "sr-only" : ""}>
                          Envelope
                        </FormLabel>
                        <Popover
                          open={envelopeSearchOpen === index}
                          onOpenChange={(open) =>
                            setEnvelopeSearchOpen(open ? index : null)
                          }
                        >
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between"
                              >
                                {field.value
                                  ? envelopes.find(
                                      (env) => env.id === field.value,
                                    )?.name
                                  : "Select envelope..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0">
                            <Command>
                              <CommandInput placeholder="Search envelopes..." />
                              <CommandEmpty>No envelope found.</CommandEmpty>
                              <CommandGroup className="max-h-48 overflow-y-auto">
                                {envelopes.map((envelope) => (
                                  <CommandItem
                                    key={envelope.id}
                                    value={envelope.name}
                                    onSelect={() => {
                                      field.onChange(envelope.id);
                                      setEnvelopeSearchOpen(null);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        field.value === envelope.id
                                          ? "opacity-100"
                                          : "opacity-0",
                                      )}
                                    />
                                    {envelope.icon && (
                                      <span className="mr-2">
                                        {envelope.icon}
                                      </span>
                                    )}
                                    {envelope.name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`splits.${index}.amount`}
                    render={({ field }) => (
                      <FormItem className="w-32">
                        <FormLabel className={index > 0 ? "sr-only" : ""}>
                          Amount
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => remove(index)}
                      className="mb-2"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}

              {/* Allocation Summary */}
              {watchAmount && (
                <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Transaction Amount:</span>
                    <span>${transactionAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Allocated:</span>
                    <span>${totalAllocated.toFixed(2)}</span>
                  </div>
                  <Separator className="my-2" />
                  <div
                    className={cn(
                      "flex justify-between font-medium items-center",
                      isFullyAllocated
                        ? "text-green-600"
                        : remaining > 0
                          ? "text-blue-600"
                          : "text-red-600",
                    )}
                  >
                    <span className="flex items-center gap-1">
                      {!isFullyAllocated && (
                        <AlertCircle className="h-4 w-4" />
                      )}
                      {isFullyAllocated
                        ? "Fully Allocated"
                        : remaining > 0
                          ? "Remaining"
                          : "Over Allocated"}
                      :
                    </span>
                    <span>${Math.abs(remaining).toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Receipt Upload */}
            <div className="space-y-2">
              <FormLabel>Receipt (Optional)</FormLabel>
              {receiptFile ? (
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Upload className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">
                      {receiptFile.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({(receiptFile.size / 1024).toFixed(1)}KB)
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removeReceipt}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-sm file:font-medium"
                  />
                  <Upload className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  createOrUpdateMutation.isPending || !isFullyAllocated
                }
              >
                {createOrUpdateMutation.isPending
                  ? transactionId
                    ? "Updating..."
                    : "Creating..."
                  : transactionId
                    ? "Update Transaction"
                    : "Create Transaction"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
