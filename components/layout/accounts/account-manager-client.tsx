"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AccountRow } from "@/lib/types/accounts";
import { formatCurrency } from "@/lib/finance";

const typeLabels: Record<string, string> = {
  transaction: "Cheque / everyday",
  savings: "Savings & investments",
  debt: "Loans & credit",
  investment: "Investment",
  cash: "Cash",
  liability: "Liability",
};

interface Props {
  accounts: AccountRow[];
  canEdit: boolean;
}

export function AccountManagerClient({ accounts, canEdit }: Props) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedAccount, setSelectedAccount] = useState<AccountRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newAccount, setNewAccount] = useState({ name: "", type: "transaction", balance: "" });

  const filtered = useMemo(() => {
    return accounts.filter((account) => {
      if (typeFilter !== "all" && account.type !== typeFilter) return false;
      if (search && !account.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [accounts, typeFilter, search]);

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, account) => {
        const balance = Number(account.current_balance ?? 0);
        if (balance >= 0) acc.assets += balance;
        else acc.liabilities += Math.abs(balance);
        return acc;
      },
      { assets: 0, liabilities: 0 },
    );
  }, [filtered]);

  async function handleCreate() {
    try {
      setCreating(true);
      await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newAccount.name,
          type: newAccount.type,
          balance: Number(newAccount.balance ?? 0),
        }),
      });
      setNewAccount({ name: "", type: "transaction", balance: "" });
      setDrawerOpen(false);
    } finally {
      setCreating(false);
    }
  }

  async function handleSave(payload: AccountRow) {
    await fetch(`/api/accounts/${payload.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: payload.name,
        type: payload.type,
        institution: payload.institution,
        balance: payload.current_balance,
        reconciled: payload.reconciled,
      }),
    });
    setDrawerOpen(false);
    setSelectedAccount(null);
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 pb-20 pt-6 md:px-6 md:pb-8 md:gap-5">
      <header className="space-y-1.5">
        <h1 className="text-3xl font-semibold text-secondary">Accounts</h1>
        <p className="text-base text-muted-foreground">
          Manage every account feeding your budget. Balances sync with the planner, dashboard, and reconciliation tools.
        </p>
      </header>

      <section className="grid gap-3 md:grid-cols-3">
        <MetricCard title="Assets" value={formatCurrency(totals.assets)} />
        <MetricCard title="Liabilities" value={formatCurrency(totals.liabilities)} />
        <MetricCard title="Net position" value={formatCurrency(totals.assets - totals.liabilities)} />
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2 md:gap-3">
        <div className="flex flex-wrap gap-2">
          <select
            className="h-9 rounded-md border px-3 text-sm"
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
          >
            <option value="all">All types</option>
            {Object.entries(typeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <Input
            className="h-9"
            placeholder="Search accounts"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/envelope-planning">Planner</Link>
          </Button>
          <Button
            onClick={() => {
              setSelectedAccount(null);
              setDrawerOpen(true);
            }}
            disabled={!canEdit}
          >
            Add account
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-3xl border">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2.5 md:px-4">Account</th>
              <th className="px-3 py-2.5 md:px-4">Type</th>
              <th className="px-3 py-2.5 md:px-4">Institution</th>
              <th className="px-3 py-2.5 md:px-4">Balance</th>
              <th className="px-3 py-2.5 md:px-4">Reconciled</th>
              <th className="px-3 py-2.5 md:px-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((account) => (
              <tr key={account.id} className="text-sm">
                <td className="px-3 py-2.5 md:px-4">
                  <div className="font-medium text-secondary">{account.name}</div>
                  <p className="text-xs text-muted-foreground">
                    {account.updated_at ? new Date(account.updated_at).toLocaleDateString("en-NZ") : ""}
                  </p>
                </td>
                <td className="px-3 py-2.5 md:px-4 text-muted-foreground">
                  {typeLabels[account.type] ?? account.type}
                </td>
                <td className="px-3 py-2.5 md:px-4 text-muted-foreground">{account.institution ?? "—"}</td>
                <td className="px-3 py-2.5 md:px-4 font-medium">
                  {formatCurrency(Number(account.current_balance ?? 0))}
                </td>
                <td className="px-3 py-2.5 md:px-4 text-muted-foreground">{account.reconciled ? "Yes" : "No"}</td>
                <td className="px-3 py-2.5 md:px-4">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedAccount(account);
                        setDrawerOpen(true);
                      }}
                      disabled={!canEdit}
                    >
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" disabled>
                      Sync
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td className="px-4 py-8 text-center text-sm text-muted-foreground" colSpan={6}>
                  No accounts match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AccountDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        account={selectedAccount}
        creating={creating}
        newAccount={newAccount}
        onNewAccountChange={setNewAccount}
        onCreate={handleCreate}
        onSave={handleSave}
      />
      <MobileNav />
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold text-secondary">{value}</p>
      </CardContent>
    </Card>
  );
}

type AccountDrawerProps = {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  account: AccountRow | null;
  creating: boolean;
  newAccount: { name: string; type: string; balance: string };
  onNewAccountChange: (values: { name: string; type: string; balance: string }) => void;
  onCreate: () => Promise<void>;
  onSave: (payload: AccountRow) => Promise<void>;
};

function AccountDrawer({
  open,
  onOpenChange,
  account,
  creating,
  newAccount,
  onNewAccountChange,
  onCreate,
  onSave,
}: AccountDrawerProps) {
  const [localAccount, setLocalAccount] = useState<AccountRow | null>(account);

  useEffect(() => {
    setLocalAccount(account);
  }, [account, open]);

  function handleOpenChange(value: boolean) {
    onOpenChange(value);
    if (!value) {
      setLocalAccount(account);
    }
  }

  async function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!localAccount) return;
    await onSave(localAccount);
  }

  async function handleCreateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onCreate();
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40" />
        <Dialog.Content className="fixed inset-y-0 right-0 flex w-full max-w-lg flex-col gap-4 bg-background p-5 shadow-xl">
          <Dialog.Title className="text-lg font-semibold text-secondary">
            {account ? "Edit account" : "Add account"}
          </Dialog.Title>
          {localAccount ? (
            <form className="flex flex-1 flex-col gap-3" onSubmit={handleEditSubmit}>
              <Input
                placeholder="Name"
                value={localAccount.name}
                onChange={(event) =>
                  setLocalAccount((prev) => (prev ? { ...prev, name: event.target.value } : prev))
                }
              />
              <select
                className="h-10 rounded-md border px-3 text-sm"
                value={localAccount.type}
                onChange={(event) =>
                  setLocalAccount((prev) => (prev ? { ...prev, type: event.target.value } : prev))
                }
              >
                {Object.keys(typeLabels).map((type) => (
                  <option key={type} value={type}>
                    {typeLabels[type]}
                  </option>
                ))}
              </select>
              <Input
                placeholder="Institution"
                value={localAccount.institution ?? ""}
                onChange={(event) =>
                  setLocalAccount((prev) => (prev ? { ...prev, institution: event.target.value } : prev))
                }
              />
              <Input
                placeholder="Current balance"
                type="number"
                step="0.01"
                value={localAccount.current_balance ?? 0}
                onChange={(event) =>
                  setLocalAccount((prev) =>
                    prev ? { ...prev, current_balance: Number(event.target.value) } : prev,
                  )
                }
              />
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={Boolean(localAccount.reconciled)}
                  onChange={(event) =>
                    setLocalAccount((prev) => (prev ? { ...prev, reconciled: event.target.checked } : prev))
                  }
                />
                Reconciled
              </label>
              <div className="mt-auto flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit">Save changes</Button>
              </div>
            </form>
          ) : (
            <form className="flex flex-1 flex-col gap-3" onSubmit={handleCreateSubmit}>
              <Input
                placeholder="Name"
                required
                value={newAccount.name}
                onChange={(event) => onNewAccountChange({ ...newAccount, name: event.target.value })}
              />
              <select
                className="h-10 rounded-md border px-3 text-sm"
                value={newAccount.type}
                onChange={(event) => onNewAccountChange({ ...newAccount, type: event.target.value })}
              >
                {Object.keys(typeLabels).map((type) => (
                  <option key={type} value={type}>
                    {typeLabels[type]}
                  </option>
                ))}
              </select>
              <Input
                placeholder="Opening balance"
                type="number"
                step="0.01"
                value={newAccount.balance}
                onChange={(event) => onNewAccountChange({ ...newAccount, balance: event.target.value })}
              />
              <div className="mt-auto flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating ? "Creating…" : "Add account"}
                </Button>
              </div>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function MobileNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 border-t bg-background/95 shadow-lg backdrop-blur md:hidden">
      <div className="flex items-center justify-around px-4 py-2.5 text-xs">
        <Link href="/dashboard" className="text-muted-foreground transition hover:text-primary">
          Dashboard
        </Link>
        <Link href="/envelope-summary" className="text-muted-foreground transition hover:text-primary">
          Summary
        </Link>
        <Link href="/accounts" className="text-primary font-semibold">
          Accounts
        </Link>
        <Link href="/envelope-planning" className="text-muted-foreground transition hover:text-primary">
          Planner
        </Link>
      </div>
    </nav>
  );
}
