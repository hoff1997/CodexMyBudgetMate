import { useQuery } from "@tanstack/react-query";
import { useMobile } from "@/hooks/use-mobile";
import Sidebar from "@/components/layout/sidebar";
import MobileHeader from "@/components/layout/mobile-header";
import MobileBottomNav from "@/components/layout/mobile-bottom-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import HelpTooltip from "@/components/help-tooltip";
import { AlertTriangle, CheckCircle, DollarSign, TrendingUp, TrendingDown, Scale } from "lucide-react";

export default function ReconciliationPage() {
  const isMobile = useMobile();

  const { data: accounts = [] } = useQuery({
    queryKey: ['/api/accounts'],
  });

  const { data: envelopes = [] } = useQuery({
    queryKey: ['/api/envelopes'],
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['/api/transactions'],
  });

  // Calculate reconciliation data
  const calculateReconciliation = () => {
    // Total bank balances (positive for assets, negative for liabilities)
    const totalBankBalance = accounts.reduce((sum, account) => {
      const balance = parseFloat(account.balance);
      return sum + balance;
    }, 0);

    // Total envelope balances (should match bank balance)
    const totalEnvelopeBalance = envelopes.reduce((sum, envelope) => {
      return sum + parseFloat(envelope.currentBalance);
    }, 0);

    // Difference (should be zero if reconciled)
    const difference = totalBankBalance - totalEnvelopeBalance;

    // Account breakdown
    const accountBreakdown = accounts.map(account => {
      const balance = parseFloat(account.balance);
      return {
        ...account,
        balance,
        status: balance >= 0 ? 'positive' : 'negative',
        type: account.type === 'credit' ? 'liability' : 'asset'
      };
    });

    // Envelope breakdown
    const envelopeBreakdown = envelopes.map(envelope => {
      const balance = parseFloat(envelope.currentBalance);
      return {
        ...envelope,
        balance,
        status: balance >= 0 ? 'positive' : 'overspent'
      };
    });

    return {
      totalBankBalance,
      totalEnvelopeBalance,
      difference,
      isReconciled: Math.abs(difference) < 0.01, // Allow for rounding
      accountBreakdown,
      envelopeBreakdown
    };
  };

  const reconciliation = calculateReconciliation();

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'checking':
        return <DollarSign className="h-5 w-5 text-blue-600" />;
      case 'savings':
        return <TrendingUp className="h-5 w-5 text-green-600" />;
      case 'credit':
        return <TrendingDown className="h-5 w-5 text-red-600" />;
      default:
        return <DollarSign className="h-5 w-5 text-gray-600" />;
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {!isMobile && <Sidebar />}
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {isMobile && <MobileHeader />}
        
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6 space-y-6">
            {/* Reconciliation Status */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Scale className="h-5 w-5 text-primary" />
                    <CardTitle>Account Reconciliation</CardTitle>
                    <HelpTooltip 
                      title="Understanding Reconciliation"
                      content={[
                        "Reconciliation ensures your bank balances match your envelope totals.",
                        "Differences indicate missing transactions, errors, or untracked spending.",
                        "A balanced system means every dollar is properly allocated to envelopes."
                      ]}
                      tips={[
                        "Check reconciliation daily for accuracy",
                        "Green badge means everything matches",
                        "Red differences need investigation",
                        "Add missing transactions to fix gaps"
                      ]}
                    />
                  </div>
                  <Badge 
                    variant={reconciliation.isReconciled ? "secondary" : "destructive"}
                    className={reconciliation.isReconciled ? "bg-green-100 text-green-800" : ""}
                  >
                    {reconciliation.isReconciled ? (
                      <>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Reconciled
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Out of Balance
                      </>
                    )}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-1">Total Bank Balance</p>
                    <p className={`text-2xl font-bold ${reconciliation.totalBankBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${reconciliation.totalBankBalance.toFixed(2)}
                    </p>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-1">Total Envelope Balance</p>
                    <p className={`text-2xl font-bold ${reconciliation.totalEnvelopeBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${reconciliation.totalEnvelopeBalance.toFixed(2)}
                    </p>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-1">Difference</p>
                    <p className={`text-2xl font-bold ${Math.abs(reconciliation.difference) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                      ${reconciliation.difference.toFixed(2)}
                    </p>
                  </div>
                </div>

                {!reconciliation.isReconciled && (
                  <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-yellow-800 dark:text-yellow-200">Reconciliation Required</p>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                          Your bank balances don't match your envelope totals. This could indicate missing transactions, 
                          incorrect envelope assignments, or manual balance adjustments needed.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Bank Accounts */}
              <Card>
                <CardHeader>
                  <CardTitle>Bank Accounts</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {reconciliation.accountBreakdown.map((account) => (
                    <div key={account.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getAccountIcon(account.type)}
                        <div>
                          <p className="font-medium text-foreground">{account.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {account.type} • {account.type === 'asset' ? 'Asset' : 'Liability'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${account.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${account.balance.toFixed(2)}
                        </p>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${account.status === 'positive' ? 'border-green-300 text-green-700' : 'border-red-300 text-red-700'}`}
                        >
                          {account.status === 'positive' ? 'Positive' : 'Negative'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Envelope Balances */}
              <Card>
                <CardHeader>
                  <CardTitle>Envelope Balances</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 max-h-96 overflow-y-auto">
                  {reconciliation.envelopeBreakdown.map((envelope) => (
                    <div key={envelope.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <span className="text-lg">{envelope.icon}</span>
                        <div>
                          <p className="font-medium text-foreground">{envelope.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Budget: ${parseFloat(envelope.budgetedAmount).toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${envelope.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${envelope.balance.toFixed(2)}
                        </p>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${envelope.status === 'positive' ? 'border-green-300 text-green-700' : 'border-red-300 text-red-700'}`}
                        >
                          {envelope.status === 'positive' ? 'Available' : 'Overspent'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Reconciliation Tips */}
            <Card>
              <CardHeader>
                <CardTitle>Reconciliation Tips</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h3 className="font-medium">Common Issues:</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li>• Missing transactions from bank statements</li>
                      <li>• Unapproved transactions in the queue</li>
                      <li>• Manual balance adjustments needed</li>
                      <li>• Transfer transactions counted incorrectly</li>
                    </ul>
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="font-medium">How to Fix:</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li>• Review and approve pending transactions</li>
                      <li>• Add missing transactions from bank statements</li>
                      <li>• Check for duplicate entries</li>
                      <li>• Verify envelope assignments are correct</li>
                    </ul>
                  </div>
                </div>
                
                <div className="mt-4 flex space-x-3">
                  <Button>Review Pending Transactions</Button>
                  <Button variant="outline">Add Missing Transaction</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {isMobile && <MobileBottomNav />}
    </div>
  );
}