"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useMemo } from "react";
import { useRegisterCommand } from "@/providers/command-palette-provider";
import { EnvelopeCreateDialog } from "@/components/layout/envelopes/envelope-create-dialog";
import { useRouter } from "next/navigation";

const demoEnvelopes = [
  "Groceries",
  "Rent",
  "Fuel",
  "Emergency fund",
  "Kids activities",
];

const demoAccounts = [
  "Everyday account",
  "Savings booster",
  "Westpac credit card",
  "Kiwisaver",
];

const demoLabels = ["Household", "Subscriptions", "Treat", "Work expenses"];

export function QuickActionsSheet() {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("transaction");
  const [createEnvelopeOpen, setCreateEnvelopeOpen] = useState(false);
  const router = useRouter();
  const quickAction = useMemo(
    () => ({
      id: "open-quick-actions",
      label: "Open quick actions",
      description: "Capture a transaction, envelope, or transfer",
      shortcut: "Shift + Q",
      onSelect: () => setOpen(true),
    }),
    [],
  );
  useRegisterCommand(quickAction);

  const createEnvelopeAction = useMemo(
    () => ({
      id: "quick-create-envelope",
      label: "Quick create envelope",
      description: "Open the envelope capture form",
      shortcut: "Shift + E",
      onSelect: () => {
        setActiveTab("envelope");
        setOpen(true);
      },
    }),
    [],
  );
  useRegisterCommand(createEnvelopeAction);

  const transferAction = useMemo(
    () => ({
      id: "quick-transfer",
      label: "Record envelope transfer",
      description: "Jump straight to the transfer form",
      shortcut: "Shift + T",
      onSelect: () => {
        setActiveTab("transfer");
        setOpen(true);
      },
    }),
    [],
  );
  useRegisterCommand(transferAction);

  function handleSubmit(formName: string, formData: FormData) {
    const values = Object.fromEntries(formData.entries());
    toast.success(`${formName} saved`, {
      description: "Data captured locally for now. Wire this to Supabase mutations next.",
    });
    console.table(values);
    setOpen(false);
  }

  return (
    <>
      <Button variant="secondary" className="w-full" onClick={() => setOpen(true)}>
        + Quick actions
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-10">
          <div className="relative w-full max-w-4xl rounded-2xl border bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold">Quick actions</h2>
                <p className="text-sm text-muted-foreground">
                  Rapid capture for the workflows you used most in Replit: receipts, splits, new
                  envelopes, and more.
                </p>
              </div>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Close
              </Button>
            </div>
            <div className="px-6 pb-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4">
                  <TabsTrigger value="transaction">Transaction</TabsTrigger>
                  <TabsTrigger value="envelope">Envelope</TabsTrigger>
                  <TabsTrigger value="account">Account</TabsTrigger>
                  <TabsTrigger value="transfer">Transfer</TabsTrigger>
                  <TabsTrigger value="asset">Asset/Liability</TabsTrigger>
                </TabsList>
                <TabsContent value="transaction">
                  <form
                    className="grid gap-4 md:grid-cols-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      handleSubmit("Transaction", new FormData(event.currentTarget));
                    }}
                  >
                    <Input name="merchant" placeholder="Merchant" required />
                    <Input name="amount" type="number" step="0.01" placeholder="Amount" required />
                    <Input name="occurred_at" type="date" required />
                    <Input name="account" list="quick-actions-accounts" placeholder="Account" required />
                    <Input name="envelope" list="quick-actions-envelopes" placeholder="Envelope" />
                    <Input name="labels" list="quick-actions-labels" placeholder="Labels (comma separated)" />
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-secondary">Receipt upload</label>
                      <input
                        className="mt-1 w-full rounded-md border border-dashed border-muted bg-muted/20 px-3 py-6 text-sm"
                        type="file"
                        name="receipt"
                        accept="image/png,image/jpeg,application/pdf"
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        Up to 5MB (PNG, JPG, or PDF). Auto-tagged with merchant memory when stored.
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-secondary">Notes</label>
                      <textarea
                        name="notes"
                        rows={3}
                        className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                        placeholder="Optional description or reference"
                      />
                    </div>
                    <div className="md:col-span-2 flex items-center justify-between gap-3">
                      <label className="text-xs text-muted-foreground">
                        Duplicate detection runs on amount, date, and merchant normalisation before saving.
                      </label>
                      <Button type="submit">Approve &amp; save</Button>
                    </div>
                  </form>
                </TabsContent>
                <TabsContent value="envelope">
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-primary/30 bg-primary/5 p-8">
                    <p className="mb-4 text-center text-sm text-muted-foreground">
                      Use the full envelope creation dialog for all options including pay cycle calculations and frequency settings.
                    </p>
                    <Button onClick={() => {
                      setCreateEnvelopeOpen(true);
                      setOpen(false);
                    }}>
                      <span className="text-lg mr-2">+</span>
                      Open Envelope Creator
                    </Button>
                  </div>
                </TabsContent>
                <TabsContent value="account">
                  <form
                    className="grid gap-4 md:grid-cols-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      handleSubmit("Account", new FormData(event.currentTarget));
                    }}
                  >
                    <Input name="name" placeholder="Account name" required />
                    <Input name="institution" placeholder="Bank / provider" />
                    <select
                      name="type"
                      className="h-10 w-full rounded-md border px-3 text-sm"
                      defaultValue="transaction"
                    >
                      <option value="transaction">Cheque / everyday</option>
                      <option value="savings">Savings / investment</option>
                      <option value="debt">Debt / credit</option>
                    </select>
                    <Input
                      name="current_balance"
                      type="number"
                      step="0.01"
                      placeholder="Current balance"
                    />
                    <Input
                      name="last_statement_at"
                      type="date"
                      placeholder="Last statement date"
                    />
                    <Button type="submit" className="md:col-span-2 justify-self-end">
                      Save account
                    </Button>
                  </form>
                </TabsContent>
                <TabsContent value="transfer">
                  <form
                    className="grid gap-4 md:grid-cols-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      handleSubmit("Transfer", new FormData(event.currentTarget));
                    }}
                  >
                    <Input name="from_envelope" list="quick-actions-envelopes" placeholder="From" required />
                    <Input name="to_envelope" list="quick-actions-envelopes" placeholder="To" required />
                    <Input
                      name="transfer_amount"
                      type="number"
                      step="0.01"
                      placeholder="Amount"
                      required
                    />
                    <Input name="transfer_date" type="date" required />
                    <textarea
                      name="reason"
                      rows={3}
                      className="md:col-span-2 w-full rounded-md border px-3 py-2 text-sm"
                      placeholder="Reason or note"
                    />
                    <Button type="submit" className="md:col-span-2 justify-self-end">
                      Transfer funds
                    </Button>
                  </form>
                </TabsContent>
                <TabsContent value="asset">
                  <form
                    className="grid gap-4 md:grid-cols-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      handleSubmit("Asset/Liability", new FormData(event.currentTarget));
                    }}
                  >
                    <Input name="title" placeholder="Name" required />
                    <select name="kind" className="h-10 w-full rounded-md border px-3 text-sm">
                      <option value="asset">Asset</option>
                      <option value="liability">Liability</option>
                    </select>
                    <Input name="valuation" type="number" step="0.01" placeholder="Value" required />
                    <Input name="category" placeholder="Category" />
                    <Input name="next_review" type="date" placeholder="Next review date" />
                    <textarea
                      name="notes"
                      rows={3}
                      className="md:col-span-2 w-full rounded-md border px-3 py-2 text-sm"
                      placeholder="Notes, payoff plan, or milestone"
                    />
                    <Button type="submit" className="md:col-span-2 justify-self-end">
                      Save item
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </div>
            <datalist id="quick-actions-envelopes">
              {demoEnvelopes.map((entry) => (
                <option key={entry} value={entry} />
              ))}
            </datalist>
            <datalist id="quick-actions-accounts">
              {demoAccounts.map((entry) => (
                <option key={entry} value={entry} />
              ))}
            </datalist>
            <datalist id="quick-actions-labels">
              {demoLabels.map((entry) => (
                <option key={entry} value={entry} />
              ))}
            </datalist>
          </div>
        </div>
      ) : null}
      <EnvelopeCreateDialog
        open={createEnvelopeOpen}
        onOpenChange={setCreateEnvelopeOpen}
        categories={[]}
        onCreated={() => {
          router.refresh();
        }}
      />
    </>
  );
}
