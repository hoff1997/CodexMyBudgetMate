"use client";

import { useState } from "react";
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
import { Card } from "@/components/ui/card";
import { Plus, Trash2, DollarSign, Building2 } from "lucide-react";
import type { BankAccount } from "@/app/(app)/onboarding/unified-onboarding-client";

interface BankAccountsStepProps {
  accounts: BankAccount[];
  onAccountsChange: (accounts: BankAccount[]) => void;
}

export function BankAccountsStep({ accounts, onAccountsChange }: BankAccountsStepProps) {
  const [newAccount, setNewAccount] = useState({
    name: "",
    type: "checking" as "checking" | "savings" | "credit_card",
    balance: 0,
  });

  const handleAddAccount = () => {
    if (!newAccount.name.trim()) {
      return;
    }

    const account: BankAccount = {
      id: Math.random().toString(36).substring(7),
      ...newAccount,
    };

    onAccountsChange([...accounts, account]);

    // Reset form
    setNewAccount({
      name: "",
      type: "checking",
      balance: 0,
    });
  };

  const handleRemoveAccount = (id: string) => {
    onAccountsChange(accounts.filter((acc) => acc.id !== id));
  };

  const accountTypeLabels = {
    checking: "Everyday/Cheque",
    savings: "Savings",
    credit_card: "Credit Card",
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="text-5xl mb-2">🏦</div>
        <h2 className="text-3xl font-bold">Connect Your Bank Accounts</h2>
        <p className="text-muted-foreground">
          Add all accounts where you receive income or pay bills
        </p>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <strong>Why we need this:</strong> Connecting your accounts helps us track where your money lives
          and moves. You&apos;ll need at least one account to get started.
        </p>
      </div>

      {/* Existing Accounts */}
      {accounts.length > 0 && (
        <div className="space-y-3">
          <Label className="text-base">Your Accounts ({accounts.length})</Label>
          <div className="space-y-2">
            {accounts.map((account) => (
              <Card key={account.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-medium">{account.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {accountTypeLabels[account.type]} • ${account.balance.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveAccount(account.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Add New Account Form */}
      <div className="space-y-4 bg-muted/50 rounded-lg p-6">
        <h3 className="font-semibold flex items-center gap-2">
          <Plus className="h-5 w-5" />
          {accounts.length === 0 ? "Add Your First Account" : "Add Another Account"}
        </h3>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="accountName">Account Name *</Label>
            <Input
              id="accountName"
              type="text"
              placeholder="e.g., ASB Everyday, Kiwibank Savings"
              value={newAccount.name}
              onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleAddAccount();
                }
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="accountType">Account Type *</Label>
              <Select
                value={newAccount.type}
                onValueChange={(value: any) => setNewAccount({ ...newAccount, type: value })}
              >
                <SelectTrigger id="accountType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="checking">Everyday/Cheque</SelectItem>
                  <SelectItem value="savings">Savings</SelectItem>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountBalance">Current Balance (optional)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="accountBalance"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newAccount.balance || ""}
                  onChange={(e) =>
                    setNewAccount({ ...newAccount, balance: parseFloat(e.target.value) || 0 })
                  }
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          <Button
            onClick={handleAddAccount}
            disabled={!newAccount.name.trim()}
            className="w-full"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Account
          </Button>
        </div>
      </div>

      {/* NZ Bank Suggestions */}
      {accounts.length === 0 && (
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm font-medium mb-2">Popular NZ Banks:</p>
          <div className="flex flex-wrap gap-2">
            {["ASB", "ANZ", "BNZ", "Kiwibank", "Westpac"].map((bank) => (
              <Button
                key={bank}
                variant="outline"
                size="sm"
                onClick={() => setNewAccount({ ...newAccount, name: `${bank} Everyday` })}
              >
                {bank}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
