import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useMobile } from "@/hooks/use-mobile";
import Sidebar from "@/components/layout/sidebar";
import MobileHeader from "@/components/layout/mobile-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Landmark, CreditCard, Wallet, PiggyBank, ExternalLink, TrendingUp, AlertCircle, Banknote, RefreshCw } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import HelpTooltip from "@/components/help-tooltip";

interface Account {
  id: number;
  userId: number;
  name: string;
  type: string;
  balance: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export default function AccountsPage() {
  const isMobile = useMobile();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [newAccount, setNewAccount] = useState({
    name: "",
    type: "bank",
    balance: "0.00"
  });

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ['/api/accounts'],
  });

  const createAccountMutation = useMutation({
    mutationFn: async (accountData: { name: string; type: string; balance: string }) => {
      return apiRequest('/api/accounts', {
        method: 'POST',
        body: JSON.stringify(accountData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      setIsCreateDialogOpen(false);
      setNewAccount({ name: "", type: "bank", balance: "0.00" });
      toast({
        title: "Account created",
        description: "Your new account has been added successfully.",
      });
    },
  });

  const updateAccountMutation = useMutation({
    mutationFn: async ({ id, ...updates }: { id: number; name?: string; type?: string; balance?: string }) => {
      return apiRequest(`/api/accounts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      setIsEditDialogOpen(false);
      setEditingAccount(null);
      toast({
        title: "Account updated",
        description: "Account details have been saved successfully.",
      });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/accounts/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      toast({
        title: "Account deleted",
        description: "The account has been removed successfully.",
      });
    },
  });

  const syncAllAccountsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/akahu/sync-accounts', {
        method: 'POST'
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bank-connections'] });
      toast({
        title: "Sync Completed",
        description: data.message || "Successfully synced all connected bank accounts.",
      });
    },
    onError: () => {
      toast({
        title: "Sync Failed",
        description: "Failed to sync bank accounts. Please check your connection and try again.",
        variant: "destructive",
      });
    }
  });

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'bank': return <Landmark className="h-5 w-5" />;
      case 'main': return <Landmark className="h-5 w-5" />; // Keep for backwards compatibility
      case 'checking': return <Landmark className="h-5 w-5" />; // Keep for backwards compatibility
      case 'savings': return <PiggyBank className="h-5 w-5" />;
      case 'credit': return <CreditCard className="h-5 w-5" />;
      case 'investment': return <TrendingUp className="h-5 w-5" />;
      case 'liability': return <AlertCircle className="h-5 w-5" />;
      case 'cash': return <Banknote className="h-5 w-5" />;
      default: return <Wallet className="h-5 w-5" />;
    }
  };

  const getAccountTypeLabel = (type: string) => {
    switch (type) {
      case 'bank': return 'Bank';
      case 'main': return 'Bank'; // Keep for backwards compatibility
      case 'checking': return 'Bank'; // Keep for backwards compatibility
      case 'savings': return 'Bank'; // Keep for backwards compatibility
      case 'credit': return 'Credit Card';
      case 'investment': return 'Investment';
      case 'liability': return 'Liability';
      case 'cash': return 'Cash';
      default: return type;
    }
  };

  const handleCreateAccount = () => {
    if (!newAccount.name.trim()) {
      toast({
        title: "Error",
        description: "Please enter an account name.",
        variant: "destructive",
      });
      return;
    }
    createAccountMutation.mutate(newAccount);
  };

  const handleEditAccount = (account: Account) => {
    setEditingAccount(account);
    setIsEditDialogOpen(true);
  };

  const handleUpdateAccount = () => {
    if (!editingAccount || !editingAccount.name.trim()) {
      toast({
        title: "Error",
        description: "Please enter an account name.",
        variant: "destructive",
      });
      return;
    }
    updateAccountMutation.mutate({
      id: editingAccount.id,
      name: editingAccount.name,
      type: editingAccount.type,
      balance: editingAccount.balance,
    });
  };

  const handleDeleteAccount = (id: number) => {
    if (confirm("Are you sure you want to delete this account? This action cannot be undone.")) {
      deleteAccountMutation.mutate(id);
    }
  };

  const totalBalance = accounts.reduce((sum, account) => {
    return sum + parseFloat(account.balance);
  }, 0);

  return (
    <div className="min-h-screen flex bg-background">
      {!isMobile && <Sidebar />}
      
      <div className="flex-1 flex flex-col overflow-hidden md:ml-64">
        {isMobile && <MobileHeader />}
        
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Accounts</h1>
                  <p className="text-muted-foreground">Manage your bank accounts and opening balances</p>
                </div>
                <HelpTooltip 
                  title="Managing Your Accounts"
                  content={[
                    "Set up all your bank accounts with opening balances to track your complete financial picture.",
                    "Add checking accounts, savings accounts, and credit cards to monitor cash flow.",
                    "Opening balances should match your actual account balances when you start using the app."
                  ]}
                  tips={[
                    "Use accurate opening balances for proper reconciliation",
                    "Add accounts as you connect them to your budget",
                    "Credit card balances should be entered as negative amounts"
                  ]}
                />
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => syncAllAccountsMutation.mutate()}
                  disabled={syncAllAccountsMutation.isPending}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${syncAllAccountsMutation.isPending ? 'animate-spin' : ''}`} />
                  {syncAllAccountsMutation.isPending ? "Syncing..." : "Sync All"}
                </Button>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Account
                </Button>
              </div>
            </div>

            {/* Summary Card */}
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Total Account Balance</p>
                  <p className={`text-3xl font-bold ${totalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${totalBalance.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Across {accounts.length} account{accounts.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Accounts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {accounts.map((account) => (
                <Card key={account.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getAccountIcon(account.type)}
                        <div>
                          <CardTitle className="text-lg">{account.name}</CardTitle>
                          <Badge variant="outline" className="text-xs">
                            {getAccountTypeLabel(account.type)}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditAccount(account)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteAccount(account.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Current Balance</p>
                      <p className={`text-2xl font-bold ${parseFloat(account.balance) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${parseFloat(account.balance).toFixed(2)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Bank Connection Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ExternalLink className="h-5 w-5 mr-2" />
                  Bank Connection Setup
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    To connect your bank accounts for automatic transaction import, you'll need to set up bank connections 
                    through your banking provider's API or use a service like Plaid, Yodlee, or similar.
                  </p>
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Steps to connect your bank:</h4>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                      <li>Contact your bank about API access or open banking features</li>
                      <li>Set up a connection service (Plaid, Akahu for NZ banks, etc.)</li>
                      <li>Configure automatic transaction import in Settings</li>
                      <li>Review and categorise imported transactions</li>
                    </ol>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Manual transaction entry is also supported if automatic import is not available.
                  </p>
                </div>
              </CardContent>
            </Card>

          </div>
        </main>
      </div>

      {/* Edit Account Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Account</DialogTitle>
          </DialogHeader>
          {editingAccount && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-account-name">Account Name</Label>
                <Input
                  id="edit-account-name"
                  value={editingAccount.name}
                  onChange={(e) => setEditingAccount(prev => prev ? { ...prev, name: e.target.value } : null)}
                  placeholder="Account name"
                />
              </div>
              <div>
                <Label htmlFor="edit-account-type">Account Type</Label>
                <Select
                  value={editingAccount.type}
                  onValueChange={(value) => setEditingAccount(prev => prev ? { ...prev, type: value } : null)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank">Bank</SelectItem>
                    <SelectItem value="credit">Credit Card</SelectItem>
                    <SelectItem value="investment">Investment</SelectItem>
                    <SelectItem value="liability">Liability</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-balance">Current Balance</Label>
                <Input
                  id="edit-balance"
                  type="number"
                  step="0.01"
                  value={editingAccount.balance}
                  onChange={(e) => setEditingAccount(prev => prev ? { ...prev, balance: e.target.value } : null)}
                  placeholder="0.00"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateAccount}
                  disabled={updateAccountMutation.isPending}
                >
                  {updateAccountMutation.isPending ? "Updating..." : "Update Account"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Account Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="account-name">Account Name</Label>
              <Input
                id="account-name"
                value={newAccount.name}
                onChange={(e) => setNewAccount(prev => ({ ...prev, name: e.target.value }))}
                placeholder=""
              />
            </div>
            <div>
              <Label htmlFor="account-type">Account Type</Label>
              <Select
                value={newAccount.type}
                onValueChange={(value) => setNewAccount(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">Bank</SelectItem>
                  <SelectItem value="credit">Credit Card</SelectItem>
                  <SelectItem value="investment">Investment</SelectItem>
                  <SelectItem value="liability">Liability</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="opening-balance">Opening Balance</Label>
              <Input
                id="opening-balance"
                type="number"
                step="0.01"
                value={newAccount.balance}
                onChange={(e) => setNewAccount(prev => ({ ...prev, balance: e.target.value }))}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter the current balance in your account. For credit cards, use negative amounts.
              </p>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateAccount}
                disabled={createAccountMutation.isPending}
              >
                {createAccountMutation.isPending ? "Creating..." : "Create Account"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}