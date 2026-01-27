"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { EnvelopeCreateDialog } from "@/components/layout/envelopes/envelope-create-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Upload, X, Store, Plus, ChevronDown, Check } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { EnvelopeIcon } from "@/components/shared/envelope-icon";

const transactionSchema = z.object({
  amount: z.string().min(1, "Amount is required"),
  accountId: z.string().uuid("Account is required"),
  merchant: z.string().min(1, "Merchant is required"),
  description: z.string().optional(),
  envelopeId: z.string().uuid("Envelope is required"),
  date: z.string().min(1, "Date is required"),
  receipt: z.instanceof(File).optional(),
});

type TransactionForm = z.infer<typeof transactionSchema>;

interface NewTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: React.ReactNode;
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

interface MerchantSuggestion {
  suggestion: {
    envelopeId: string;
    envelopeName: string;
    merchantName: string;
    lastUsed: string;
    confidence: string;
  } | null;
}

export default function NewTransactionDialog({
  open,
  onOpenChange,
  trigger,
}: NewTransactionDialogProps) {
  const [selectedReceipt, setSelectedReceipt] = useState<File | null>(null);
  const [merchantSuggestion, setMerchantSuggestion] =
    useState<MerchantSuggestion["suggestion"]>(null);
  const [envelopeOpen, setEnvelopeOpen] = useState(false);
  const [createEnvelopeOpen, setCreateEnvelopeOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: envelopesData } = useQuery({
    queryKey: ["envelopes"],
    queryFn: async () => {
      const response = await fetch("/api/envelopes");
      if (!response.ok) throw new Error("Failed to fetch envelopes");
      const data = await response.json();
      return data.envelopes || [];
    },
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

  const envelopes: Envelope[] = envelopesData || [];
  const accounts: Account[] = accountsData || [];

  const form = useForm<TransactionForm>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      amount: "",
      accountId: "",
      merchant: "",
      description: "",
      envelopeId: "",
      date: format(new Date(), "yyyy-MM-dd"),
      receipt: undefined,
    },
  });

  // Watch merchant field for suggestions
  const watchedMerchant = form.watch("merchant");

  // Get merchant suggestion when merchant changes
  useEffect(() => {
    if (watchedMerchant && watchedMerchant.length > 2) {
      fetch(`/api/merchant-memory?merchant=${encodeURIComponent(watchedMerchant)}`)
        .then((res) => res.json())
        .then((data: MerchantSuggestion) => {
          if (data.suggestion && data.suggestion.envelopeId) {
            setMerchantSuggestion(data.suggestion);
            form.setValue("envelopeId", data.suggestion.envelopeId);
          } else {
            setMerchantSuggestion(null);
          }
        })
        .catch(() => setMerchantSuggestion(null));
    } else {
      setMerchantSuggestion(null);
    }
  }, [watchedMerchant, form]);

  const createTransactionMutation = useMutation({
    mutationFn: async (data: TransactionForm) => {
      const transactionData = {
        merchant_name: data.merchant,
        description: data.description || null,
        amount: Number.parseFloat(data.amount),
        occurred_at: data.date,
        account_id: data.accountId,
        envelope_id: data.envelopeId,
        status: "pending",
      };

      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(transactionData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create transaction");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["pending-transactions"] });

      toast.success("Transaction created", {
        description: "Your transaction has been added successfully.",
      });

      // Reset form and close dialog
      form.reset();
      setSelectedReceipt(null);
      setMerchantSuggestion(null);
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error("Error", {
        description: error.message || "Failed to create transaction",
      });
    },
  });

  const onSubmit = (data: TransactionForm) => {
    createTransactionMutation.mutate(data);
  };

  const handleReceiptUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        // 5MB limit
        toast.error("File too large", {
          description: "Receipt must be smaller than 5MB.",
        });
        return;
      }

      if (!file.type.startsWith("image/")) {
        toast.error("Invalid file type", {
          description: "Please upload an image file.",
        });
        return;
      }

      setSelectedReceipt(file);
      form.setValue("receipt", file);
    }
  };

  const removeReceipt = () => {
    setSelectedReceipt(null);
    form.setValue("receipt", undefined);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Transaction</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          {...field}
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          className="pl-8"
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
                    <FormControl>
                      <Input {...field} type="date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="merchant"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Merchant/Store</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Store className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        {...field}
                        placeholder="Store or business name..."
                        className="pl-10"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="accountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
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

              <FormField
                control={form.control}
                name="envelopeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Envelope
                      {merchantSuggestion && (
                        <span className="text-xs text-muted-foreground ml-2">
                          (suggested from {merchantSuggestion.merchantName})
                        </span>
                      )}
                    </FormLabel>
                    <Popover open={envelopeOpen} onOpenChange={setEnvelopeOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={envelopeOpen}
                            className="w-full justify-between"
                          >
                            {field.value ? (
                              (() => {
                                const selectedEnvelope = envelopes.find(
                                  (e) => e.id === field.value,
                                );
                                return selectedEnvelope ? (
                                  <span className="flex items-center gap-2">
                                    <EnvelopeIcon icon={selectedEnvelope.icon || "wallet"} size={16} />
                                    <span>{selectedEnvelope.name}</span>
                                    {merchantSuggestion &&
                                      selectedEnvelope.id ===
                                        merchantSuggestion.envelopeId && (
                                        <span className="text-xs text-blue-600">
                                          (suggested)
                                        </span>
                                      )}
                                  </span>
                                ) : (
                                  "Select envelope..."
                                );
                              })()
                            ) : (
                              "Select envelope..."
                            )}
                            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0">
                        <Command className="h-auto">
                          <CommandInput
                            placeholder="Search envelopes..."
                            className="h-9"
                          />
                          <CommandEmpty>
                            <div className="p-4 text-center">
                              <p className="text-sm text-muted-foreground mb-3">
                                No envelope found.
                              </p>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEnvelopeOpen(false);
                                  setCreateEnvelopeOpen(true);
                                }}
                                className="w-full"
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Create New Envelope
                              </Button>
                            </div>
                          </CommandEmpty>
                          <CommandGroup className="overflow-hidden">
                            <div className="max-h-48 overflow-y-auto overscroll-contain">
                              {envelopes.map((envelope) => (
                                <CommandItem
                                  key={envelope.id}
                                  value={`${envelope.name} ${envelope.icon || ""}`}
                                  onSelect={() => {
                                    field.onChange(envelope.id);
                                    setEnvelopeOpen(false);
                                  }}
                                  className="flex items-center gap-2 px-3 py-2 cursor-pointer"
                                >
                                  <Check
                                    className={`h-4 w-4 ${
                                      field.value === envelope.id
                                        ? "opacity-100"
                                        : "opacity-0"
                                    }`}
                                  />
                                  <EnvelopeIcon icon={envelope.icon || "wallet"} size={16} />
                                  <span className="flex-1 truncate">
                                    {envelope.name}
                                  </span>
                                  {merchantSuggestion &&
                                    envelope.id ===
                                      merchantSuggestion.envelopeId && (
                                      <span className="text-xs text-blue-600 font-medium">
                                        (suggested)
                                      </span>
                                    )}
                                </CommandItem>
                              ))}
                            </div>
                          </CommandGroup>
                          {/* Always visible Create New Envelope button */}
                          <div className="border-t border-border bg-background/95 backdrop-blur">
                            <CommandItem
                              onSelect={() => {
                                setEnvelopeOpen(false);
                                setCreateEnvelopeOpen(true);
                              }}
                              className="flex items-center gap-2 px-3 py-3 bg-blue-50 hover:bg-blue-100 font-medium text-blue-700 cursor-pointer"
                            >
                              <Plus className="h-4 w-4" />
                              <span>Create New Envelope</span>
                            </CommandItem>
                          </div>
                        </Command>
                      </PopoverContent>
                    </Popover>

                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Additional details..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Receipt Upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Receipt (Optional)</label>
              {selectedReceipt ? (
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Upload className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">
                      {selectedReceipt.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({(selectedReceipt.size / 1024).toFixed(1)}KB)
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
                <div className="border-2 border-dashed border-border rounded-lg p-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleReceiptUpload}
                    className="hidden"
                    id="receipt-upload"
                  />
                  <label
                    htmlFor="receipt-upload"
                    className="flex flex-col items-center cursor-pointer"
                  >
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground text-center">
                      Click to upload receipt image
                      <br />
                      <span className="text-xs">Max 5MB, images only</span>
                    </span>
                  </label>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createTransactionMutation.isPending}
              >
                {createTransactionMutation.isPending
                  ? "Adding..."
                  : "Add Transaction"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>

      {/* Create Envelope Dialog */}
      <EnvelopeCreateDialog
        open={createEnvelopeOpen}
        onOpenChange={setCreateEnvelopeOpen}
        onCreated={() => {
          // Refresh envelopes list after creating a new one
          queryClient.invalidateQueries({ queryKey: ["envelopes"] });
        }}
      />
    </Dialog>
  );
}
