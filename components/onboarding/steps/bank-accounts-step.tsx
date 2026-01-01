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
import { Plus, Trash2, DollarSign, Building2, Link2, Shield, CheckCircle2, ExternalLink } from "lucide-react";
import { RemyTip } from "@/components/onboarding/remy-tip";
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
  const [showManualEntry, setShowManualEntry] = useState(false);

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

  const handleConnectAkahu = () => {
    // TODO: Implement Akahu OAuth flow
    // For now, show a message that this feature is coming soon
    alert("Akahu connection coming soon! For now, please add accounts manually.");
  };

  const accountTypeLabels = {
    checking: "Everyday/Cheque",
    savings: "Savings",
    credit_card: "Credit Card",
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-text-dark">Connect your bank</h2>
        <p className="text-muted-foreground">
          Your transactions will come through automatically
        </p>
      </div>

      {/* Remy's Tip */}
      <RemyTip pose="thinking">
        Connecting your bank accounts helps you see the full picture. It's
        optional, but it makes tracking way easier. Your data stays secure
        with Akahu - even I don't see your login details.
      </RemyTip>

      {/* Akahu Connection Option - Recommended */}
      <Card className="relative p-6 border-2 border-[#7A9E9A]">
        <div className="absolute -top-3 left-4 bg-[#7A9E9A] text-white text-xs font-medium px-3 py-1 rounded-full">
          Recommended
        </div>

        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-[#E2EEEC] rounded-xl flex items-center justify-center flex-shrink-0">
              <Link2 className="h-6 w-6 text-[#7A9E9A]" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                Connect with Akahu
                <Shield className="h-4 w-4 text-[#7A9E9A]" />
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Securely connect your NZ bank accounts for automatic transaction imports
              </p>
            </div>
          </div>

          {/* Security Points */}
          <div className="bg-[#E2EEEC] rounded-lg p-4 space-y-2">
            <div className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-[#7A9E9A] mt-0.5 flex-shrink-0" />
              <span><strong>Read-only access</strong> - We can only view transactions, never move money</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-[#7A9E9A] mt-0.5 flex-shrink-0" />
              <span><strong>Bank-level security</strong> - Your login details are never shared with us</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-[#7A9E9A] mt-0.5 flex-shrink-0" />
              <span><strong>Works with all major NZ banks</strong> - ASB, ANZ, BNZ, Kiwibank, Westpac & more</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-[#7A9E9A] mt-0.5 flex-shrink-0" />
              <span><strong>Disconnect anytime</strong> - You&apos;re always in control of your data</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Button
              onClick={handleConnectAkahu}
              className="w-full sm:w-auto bg-[#7A9E9A] hover:bg-[#5A7E7A]"
            >
              <Link2 className="mr-2 h-4 w-4" />
              Connect My Bank
            </Button>
            <a
              href="https://www.akahu.nz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[#6B9ECE] hover:underline flex items-center gap-1"
            >
              Learn more about Akahu
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </Card>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-4 text-sm text-muted-foreground">or add manually</span>
        </div>
      </div>

      {/* Manual Entry Toggle */}
      {!showManualEntry && accounts.length === 0 ? (
        <Card
          className="p-6 cursor-pointer hover:border-[#B8D4D0] transition-all"
          onClick={() => setShowManualEntry(true)}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center flex-shrink-0">
              <Plus className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Enter Accounts Manually</h3>
              <p className="text-sm text-muted-foreground">
                Add your accounts by hand, and import transactions later via CSV export from your bank
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <>
          {/* Existing Accounts */}
          {accounts.length > 0 && (
            <div className="space-y-3">
              <Label className="text-base">Your Accounts ({accounts.length})</Label>
              <div className="space-y-2">
                {accounts.map((account) => (
                  <Card key={account.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#E2EEEC] rounded-lg flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-[#7A9E9A]" />
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
                className="w-full bg-[#7A9E9A] hover:bg-[#5A7E7A]"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Account
              </Button>
            </div>

            {/* NZ Bank Suggestions */}
            {accounts.length === 0 && (
              <div className="pt-4 border-t">
                <p className="text-sm font-medium mb-2">Quick add popular NZ banks:</p>
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
        </>
      )}

      {/* Help Note */}
      <p className="text-center text-sm text-muted-foreground">
        You can always connect your bank or add more accounts later in Settings.
      </p>
    </div>
  );
}
