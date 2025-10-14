import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useMobile } from "@/hooks/use-mobile";
import Sidebar from "@/components/layout/sidebar";
import MobileHeader from "@/components/layout/mobile-header";
import MobileBottomNav from "@/components/layout/mobile-bottom-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Plus, TrendingUp, TrendingDown, Minus, ArrowRightLeft } from "lucide-react";
import EnvelopeTransferDialog from "@/components/envelope-transfer-dialog";
import HelpTooltip from "@/components/help-tooltip";
import type { Envelope } from "@shared/schema";

export default function Envelopes() {
  const isMobile = useMobile();
  const [showTransferDialog, setShowTransferDialog] = useState(false);

  const { data: envelopes = [] } = useQuery({
    queryKey: ['/api/envelopes'],
  });

  const getEnvelopeStatus = (envelope: Envelope) => {
    const budget = parseFloat(envelope.budgetedAmount);
    const balance = parseFloat(envelope.currentBalance);
    const spent = budget - balance;
    
    if (balance < 0) {
      return {
        status: 'overspent',
        amount: Math.abs(balance),
        color: 'text-red-600',
        bgColor: 'bg-red-50 dark:bg-red-900/10',
        borderColor: 'border-red-200 dark:border-red-800',
        icon: TrendingDown,
        label: 'Overspent'
      };
    }
    
    if (spent < budget) {
      const remaining = budget - spent;
      return {
        status: 'under',
        amount: remaining,
        color: 'text-green-600',
        bgColor: 'bg-green-50 dark:bg-green-900/10',
        borderColor: 'border-green-200 dark:border-green-800',
        icon: TrendingUp,
        label: 'Under Budget'
      };
    }
    
    return {
      status: 'on-track',
      amount: 0,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/10',
      borderColor: 'border-blue-200 dark:border-blue-800',
      icon: Minus,
      label: 'On Track'
    };
  };

  const getProgressValue = (envelope: Envelope) => {
    const budget = parseFloat(envelope.budgetedAmount);
    const balance = parseFloat(envelope.currentBalance);
    const spent = budget - balance;
    return budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  };

  // Calculate totals
  const totals = envelopes.reduce((acc, envelope) => {
    const budget = parseFloat(envelope.budgetedAmount);
    const balance = parseFloat(envelope.currentBalance);
    
    acc.totalBudget += budget;
    acc.totalBalance += balance;
    
    if (balance < 0) {
      acc.totalOverspent += Math.abs(balance);
    }
    
    return acc;
  }, { totalBudget: 0, totalBalance: 0, totalOverspent: 0 });

  return (
    <div className="min-h-screen flex bg-background">
      {!isMobile && <Sidebar />}
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {isMobile && <MobileHeader />}
        
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6 space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Total Budgeted</p>
                    <p className="text-2xl font-bold text-foreground">${totals.totalBudget.toFixed(2)}</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Total Available</p>
                    <p className={`text-2xl font-bold ${totals.totalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${totals.totalBalance.toFixed(2)}
                    </p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Total Overspent</p>
                    <p className="text-2xl font-bold text-red-600">${totals.totalOverspent.toFixed(2)}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CardTitle>All Envelopes</CardTitle>
                    <HelpTooltip 
                      title="Managing Your Envelopes"
                      content={[
                        "Each envelope represents a spending category with a budget and current balance.",
                        "Green indicates available funds, red shows overspending that needs attention.",
                        "Use transfers to move money between envelopes when needed."
                      ]}
                      tips={[
                        "Progress bars show spending vs budget",
                        "Over/Under column shows exact amounts",
                        "Transfer button helps rebalance funds",
                        "Red envelopes need immediate funding"
                      ]}
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setShowTransferDialog(true)}
                    >
                      <ArrowRightLeft className="h-4 w-4 mr-2" />
                      Transfer
                    </Button>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Envelope
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {envelopes.length > 0 ? (
                  <div className="space-y-2">
                    {/* Header Row */}
                    <div className="grid grid-cols-12 gap-4 px-4 py-2 text-sm font-medium text-muted-foreground border-b">
                      <div className="col-span-3">Envelope</div>
                      <div className="col-span-2 text-right">Budget</div>
                      <div className="col-span-2 text-right">Available</div>
                      <div className="col-span-2 text-center">Progress</div>
                      <div className="col-span-2 text-right">Over/Under</div>
                      <div className="col-span-1 text-center">Status</div>
                    </div>
                    
                    {/* Envelope Rows */}
                    {envelopes.map((envelope) => {
                      const status = getEnvelopeStatus(envelope);
                      const progress = getProgressValue(envelope);
                      const budget = parseFloat(envelope.budgetedAmount);
                      const balance = parseFloat(envelope.currentBalance);
                      const StatusIcon = status.icon;
                      
                      return (
                        <div 
                          key={envelope.id} 
                          className={`grid grid-cols-12 gap-4 px-4 py-3 rounded-lg border ${status.bgColor} ${status.borderColor} hover:shadow-sm transition-shadow`}
                        >
                          {/* Envelope Name */}
                          <div className="col-span-3 flex items-center space-x-3">
                            <span className="text-lg">{envelope.icon}</span>
                            <div>
                              <p className="font-medium text-foreground">{envelope.name}</p>
                            </div>
                          </div>
                          
                          {/* Budget */}
                          <div className="col-span-2 text-right">
                            <p className="font-medium text-foreground">${budget.toFixed(2)}</p>
                          </div>
                          
                          {/* Available */}
                          <div className="col-span-2 text-right">
                            <p className={`font-medium ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ${balance.toFixed(2)}
                            </p>
                          </div>
                          
                          {/* Progress */}
                          <div className="col-span-2 flex items-center">
                            <div className="w-full">
                              <Progress 
                                value={progress} 
                                className="h-2"
                              />
                              <p className="text-xs text-muted-foreground mt-1 text-center">
                                {progress.toFixed(0)}%
                              </p>
                            </div>
                          </div>
                          
                          {/* Over/Under Amount */}
                          <div className="col-span-2 text-right">
                            {status.amount > 0 && (
                              <p className={`font-semibold ${status.color}`}>
                                {status.status === 'overspent' ? '-' : '+'}${status.amount.toFixed(2)}
                              </p>
                            )}
                            {status.amount === 0 && (
                              <p className="text-muted-foreground">-</p>
                            )}
                          </div>
                          
                          {/* Status */}
                          <div className="col-span-1 flex items-center justify-center">
                            <Badge 
                              variant="outline" 
                              className={`${status.color} border-current`}
                            >
                              <StatusIcon className="h-3 w-3" />
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground mb-4">No envelopes created yet</p>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Envelope
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {isMobile && <MobileBottomNav />}
      
      <EnvelopeTransferDialog
        open={showTransferDialog}
        onOpenChange={setShowTransferDialog}
      />
    </div>
  );
}
