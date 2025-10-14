import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMobile } from "@/hooks/use-mobile";
import Sidebar from "@/components/layout/sidebar";
import MobileHeader from "@/components/layout/mobile-header";
import MobileBottomNav from "@/components/layout/mobile-bottom-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, DollarSign, RotateCcw, Settings, Play, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import CreateRecurringIncomeDialog from "@/components/create-recurring-income-dialog";
import ProcessRecurringIncomeDialog from "@/components/process-recurring-income-dialog";
import { format, addDays, addWeeks, addMonths } from "date-fns";

export default function RecurringIncomePage() {
  const isMobile = useMobile();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showProcessDialog, setShowProcessDialog] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: recurringTransactions = [] } = useQuery({
    queryKey: ['/api/recurring-transactions'],
  });

  const { data: envelopes = [] } = useQuery({
    queryKey: ['/api/envelopes'],
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['/api/accounts'],
  });

  const deleteRecurringTransactionMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/recurring-transactions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/recurring-transactions'] });
      toast({
        title: "Recurring transaction deleted",
        description: "The recurring income has been removed successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete recurring transaction.",
        variant: "destructive",
      });
    },
  });

  const getFrequencyIcon = (frequency: string) => {
    switch (frequency) {
      case "weekly":
        return <Calendar className="h-4 w-4" />;
      case "fortnightly":
        return <RotateCcw className="h-4 w-4" />;
      case "monthly":
        return <Calendar className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  const getFrequencyColor = (frequency: string) => {
    switch (frequency) {
      case "weekly":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
      case "fortnightly":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      case "monthly":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
    }
  };

  const getAccountName = (accountId: number) => {
    const account = accounts.find(a => a.id === accountId);
    return account ? account.name : "Unknown Account";
  };

  const getEnvelopeName = (envelopeId: number) => {
    const envelope = envelopes.find(e => e.id === envelopeId);
    return envelope ? `${envelope.icon} ${envelope.name}` : "Unknown Envelope";
  };

  const isOverdue = (nextDate: string) => {
    return new Date(nextDate) < new Date();
  };

  const handleProcessTransaction = (transaction: any) => {
    setSelectedTransaction(transaction);
    setShowProcessDialog(true);
  };

  return (
    <div className="min-h-screen flex bg-background">
      {!isMobile && <Sidebar />}
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {isMobile && <MobileHeader />}
        
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Recurring Income</h1>
                <p className="text-muted-foreground">Manage salary splits and automatic envelope allocation</p>
              </div>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Recurring Income
              </Button>
            </div>

            {/* Recurring Transactions */}
            <div className="space-y-4">
              {recurringTransactions.length > 0 ? (
                recurringTransactions.map((transaction: any) => {
                  const totalSplits = transaction.splits?.reduce((sum: number, split: any) => 
                    sum + parseFloat(split.amount), 0) || 0;
                  const isOverdueTransaction = isOverdue(transaction.nextDate);
                  
                  return (
                    <Card key={transaction.id} className={isOverdueTransaction ? "border-orange-300 bg-orange-50/50 dark:bg-orange-900/10" : ""}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                              <DollarSign className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-foreground">{transaction.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {getAccountName(transaction.accountId)} • ${parseFloat(transaction.amount).toFixed(2)}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Badge className={getFrequencyColor(transaction.frequency)}>
                              {getFrequencyIcon(transaction.frequency)}
                              <span className="ml-1 capitalize">{transaction.frequency}</span>
                            </Badge>
                            
                            {isOverdueTransaction && (
                              <Badge variant="destructive">
                                <Calendar className="h-3 w-3 mr-1" />
                                Overdue
                              </Badge>
                            )}
                            
                            <Button
                              size="sm"
                              onClick={() => handleProcessTransaction(transaction)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Play className="h-4 w-4 mr-1" />
                              Process
                            </Button>
                            
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deleteRecurringTransactionMutation.mutate(transaction.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      
                      <CardContent>
                        <div className="space-y-4">
                          {/* Next Date */}
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Next Payment:</span>
                            <span className={`font-medium ${isOverdueTransaction ? 'text-orange-600' : 'text-foreground'}`}>
                              {format(new Date(transaction.nextDate), 'MMM dd, yyyy')}
                            </span>
                          </div>
                          
                          {/* Splits */}
                          {transaction.splits && transaction.splits.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium text-foreground">Envelope Splits:</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {transaction.splits.map((split: any) => (
                                  <div key={split.id} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                                    <span className="text-sm text-foreground">
                                      {getEnvelopeName(split.envelopeId)}
                                    </span>
                                    <span className="text-sm font-medium text-foreground">
                                      ${parseFloat(split.amount).toFixed(2)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Surplus */}
                          <div className="flex items-center justify-between text-sm pt-2 border-t">
                            <span className="text-muted-foreground">
                              Surplus goes to: {transaction.surplusEnvelopeId ? getEnvelopeName(transaction.surplusEnvelopeId) : "None"}
                            </span>
                            <div className="text-right">
                              <div className="text-xs text-muted-foreground">Allocated: ${totalSplits.toFixed(2)}</div>
                              <div className="font-medium text-foreground">
                                Available for surplus: ${(parseFloat(transaction.amount) - totalSplits).toFixed(2)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No Recurring Income</h3>
                    <p className="text-muted-foreground mb-6">
                      Set up salary splits to automatically distribute income to your envelopes
                    </p>
                    <Button onClick={() => setShowCreateDialog(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Recurring Income
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </main>
      </div>

      {isMobile && <MobileBottomNav />}
      
      <CreateRecurringIncomeDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
      
      <ProcessRecurringIncomeDialog
        open={showProcessDialog}
        onOpenChange={setShowProcessDialog}
        transaction={selectedTransaction}
      />
    </div>
  );
}