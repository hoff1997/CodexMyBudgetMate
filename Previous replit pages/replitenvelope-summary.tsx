import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useMobile } from "@/hooks/use-mobile";
import Sidebar from "@/components/layout/sidebar";
import MobileHeader from "@/components/layout/mobile-header";
import MobileBottomNav from "@/components/layout/mobile-bottom-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Edit, Calendar, DollarSign } from "lucide-react";
import { format, isValid } from "date-fns";
import { useLocation } from "wouter";

interface EnvelopeSummaryData {
  id: number;
  name: string;
  icon: string;
  categoryId: number;
  categoryName: string;
  nextPaymentDue: Date | null;
  budgetFrequency: string;
  budgetedAmount: string;
  currentBalance: string;
  status: 'on-track' | 'over' | 'under' | 'due-soon';
}

// Helper function to calculate days between dates
const daysBetween = (date1: Date, date2: Date): number => {
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Helper function to get frequency display text
const getFrequencyDisplayText = (frequency: string): string => {
  switch (frequency) {
    case 'weekly': return 'weekly';
    case 'fortnightly': return 'fortnightly';
    case 'monthly': return 'monthly';
    case 'quarterly': return 'quarterly';
    case 'annually': return 'annually';
    default: return 'pay';
  }
};

// Helper function to calculate required amount per pay cycle
const calculateRequiredPerPay = (
  currentBalance: string, 
  budgetedAmount: string, 
  nextDueDate: Date | null,
  payCycle: string = 'fortnightly'
): number => {
  if (!nextDueDate || !isValid(nextDueDate)) return 0;
  
  const current = parseFloat(currentBalance || '0');
  const target = parseFloat(budgetedAmount || '0');
  const needed = Math.max(0, target - current);
  
  const today = new Date();
  const daysUntilDue = daysBetween(today, nextDueDate);
  
  // Calculate pay cycles until due
  let daysPerCycle = 14; // fortnightly default
  switch (payCycle) {
    case 'weekly':
      daysPerCycle = 7;
      break;
    case 'monthly':
      daysPerCycle = 30;
      break;
    case 'fortnightly':
    default:
      daysPerCycle = 14;
      break;
  }
  
  const paysUntilDue = Math.max(1, Math.ceil(daysUntilDue / daysPerCycle));
  return needed / paysUntilDue;
};

// Helper function to determine envelope status
const getEnvelopeStatus = (
  currentBalance: string, 
  budgetedAmount: string, 
  nextDue: Date | null
): 'on-track' | 'over' | 'under' | 'due-soon' => {
  const balance = parseFloat(currentBalance || '0');
  const budget = parseFloat(budgetedAmount || '0');
  
  // Check if due soon (within 3 days)
  if (nextDue && isValid(nextDue)) {
    const daysUntilDue = Math.ceil((nextDue.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntilDue <= 3 && daysUntilDue >= 0) {
      return 'due-soon';
    }
  }
  
  const tolerance = 5;
  if (balance > budget + tolerance) return 'over';
  if (balance < budget - tolerance) return 'under';
  return 'on-track';
};

// Helper function to get status badge styling
const getStatusBadge = (status: string) => {
  switch (status) {
    case 'on-track':
      return { text: 'On Track', className: 'bg-green-100 text-green-800 border-green-200' };
    case 'over':
      return { text: 'Surplus', className: 'bg-purple-100 text-purple-800 border-purple-200' };
    case 'under':
      return { text: 'Under', className: 'bg-red-100 text-red-800 border-red-200' };
    case 'due-soon':
      return { text: 'Due Soon', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
    default:
      return { text: 'Unknown', className: 'bg-gray-100 text-gray-800 border-gray-200' };
  }
};

export default function EnvelopeSummary() {
  const isMobile = useMobile();
  const [, setLocation] = useLocation();
  const [collapsedCategories, setCollapsedCategories] = useState<Set<number>>(new Set());

  // Load envelopes and categories
  const { data: envelopes = [] } = useQuery({
    queryKey: ["/api/envelopes"],
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["/api/envelope-categories"],
  });

  // Transform envelope data for summary
  const summaryData = useMemo(() => {
    return (envelopes as any[]).map((envelope): EnvelopeSummaryData => {
      const category = (categories as any[]).find((cat: any) => cat.id === envelope.categoryId);
      const status = getEnvelopeStatus(
        envelope.currentBalance, 
        envelope.budgetedAmount, 
        envelope.nextPaymentDue ? new Date(envelope.nextPaymentDue) : null
      );

      return {
        id: envelope.id,
        name: envelope.name,
        icon: envelope.icon || '📋',
        categoryId: envelope.categoryId || 0,
        categoryName: category?.name || 'Uncategorised',
        nextPaymentDue: envelope.nextPaymentDue ? new Date(envelope.nextPaymentDue) : null,
        budgetFrequency: envelope.budgetFrequency || 'monthly',
        budgetedAmount: envelope.budgetedAmount || '0',
        currentBalance: envelope.currentBalance || '0',
        status
      };
    });
  }, [envelopes, categories]);

  // Group envelopes by category
  const groupedEnvelopes = useMemo(() => {
    const groups: { [categoryName: string]: { categoryId: number; envelopes: EnvelopeSummaryData[] } } = {};
    
    summaryData.forEach(envelope => {
      const category = envelope.categoryName;
      if (!groups[category]) {
        groups[category] = {
          categoryId: envelope.categoryId,
          envelopes: []
        };
      }
      groups[category].envelopes.push(envelope);
    });

    // Sort envelopes within each category by name
    Object.values(groups).forEach(group => {
      group.envelopes.sort((a, b) => a.name.localeCompare(b.name));
    });

    return groups;
  }, [summaryData]);

  // Toggle category collapse
  const toggleCategory = (categoryId: number) => {
    setCollapsedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  // Collapse all categories
  const collapseAll = () => {
    const allCategoryIds = Object.values(groupedEnvelopes).map(group => group.categoryId);
    setCollapsedCategories(new Set(allCategoryIds));
  };

  // Expand all categories
  const expandAll = () => {
    setCollapsedCategories(new Set());
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      {!isMobile && <Sidebar />}
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        {isMobile && <MobileHeader />}
        
        {/* Page Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-1 md:p-4 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl md:text-2xl font-bold">Envelope Summary</h1>
                <p className="text-sm text-muted-foreground">Quick glance view of all envelope status</p>
              </div>
              <Button 
                onClick={() => setLocation('/envelope-planning')}
                size="sm" 
                className="flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                <span className="hidden sm:inline">Edit Envelopes</span>
                <span className="sm:hidden">Edit</span>
              </Button>
            </div>

            {/* Collapse Controls */}
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={expandAll}
                className="text-xs px-2 py-1"
              >
                Expand All
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={collapseAll}
                className="text-xs px-2 py-1"
              >
                Collapse All
              </Button>
            </div>

            {/* Envelope Categories */}
            <div className="space-y-2">
              {Object.entries(groupedEnvelopes).map(([categoryName, group]) => {
                const isCollapsed = collapsedCategories.has(group.categoryId);
                
                return (
                  <Card key={categoryName} className="overflow-hidden">
                    {/* Category Header */}
                    <CardHeader 
                      className="p-2 cursor-pointer bg-muted/50 hover:bg-muted/70 transition-colors"
                      onClick={() => toggleCategory(group.categoryId)}
                    >
                      <CardTitle className="flex items-center justify-between text-sm font-medium">
                        <div className="flex items-center gap-2">
                          {isCollapsed ? (
                            <ChevronRight className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                          <span>{categoryName}</span>
                          <Badge variant="secondary" className="text-xs">
                            {group.envelopes.length}
                          </Badge>
                        </div>
                      </CardTitle>
                    </CardHeader>

                    {/* Envelope List */}
                    {!isCollapsed && (
                      <CardContent className="p-0">

                        
                        <div className="divide-y divide-border/30">
                          {group.envelopes.map((envelope) => {
                            const statusBadge = getStatusBadge(envelope.status);
                            const requiredPerPay = calculateRequiredPerPay(
                              envelope.currentBalance,
                              envelope.budgetedAmount, 
                              envelope.nextPaymentDue,
                              'fortnightly' // user?.payCycle || 'fortnightly'
                            );
                            const frequencyText = getFrequencyDisplayText(envelope.budgetFrequency);

                            return (
                              <div key={envelope.id} className="pl-6 pr-2 py-1">
                                {/* Mobile Layout - Current Balance Focus */}
                                <div className="block md:hidden">
                                  {/* Line 1: Envelope Name + Current Balance */}
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm">{envelope.icon}</span>
                                      <span className="font-medium text-sm">{envelope.name}</span>
                                    </div>
                                    <div className="text-sm font-bold">
                                      ${parseFloat(envelope.currentBalance).toFixed(2)}
                                    </div>
                                  </div>

                                  {/* Line 2: Progress Bar (only if due date set) */}
                                  <div className="space-y-0.5">
                                    {envelope.nextPaymentDue && isValid(envelope.nextPaymentDue) && (
                                      <div className="w-full bg-muted rounded-full h-2">
                                        <div 
                                          className={`h-2 rounded-full transition-all ${
                                            envelope.status === 'on-track' || envelope.status === 'over'
                                              ? 'bg-green-500'
                                              : 'bg-red-500'
                                          }`}
                                          style={{ 
                                            width: `${Math.min(100, Math.max(0, 
                                              (parseFloat(envelope.currentBalance) / Math.max(parseFloat(envelope.budgetedAmount), 0.01)) * 100
                                            ))}%` 
                                          }}
                                        />
                                      </div>
                                    )}
                                    
                                    {/* Target + Date + Contribution Info */}
                                    <div className="flex items-center justify-between text-xs">
                                      <div className="flex items-center gap-2 text-muted-foreground">
                                        <span>Target: ${parseFloat(envelope.budgetedAmount || '0').toFixed(2)}</span>
                                        {envelope.nextPaymentDue && isValid(envelope.nextPaymentDue) && (
                                          <span>Due: {format(envelope.nextPaymentDue, 'dd/MM/yyyy')}</span>
                                        )}
                                      </div>
                                      <div className="text-xs font-medium text-blue-600">
                                        {requiredPerPay > 0 
                                          ? `$${requiredPerPay.toFixed(0)}/${frequencyText}`
                                          : envelope.nextPaymentDue && isValid(envelope.nextPaymentDue)
                                          ? 'Ready'
                                          : ''
                                        }
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Desktop Layout - Current Balance Focus */}
                                <div className="hidden md:block">
                                  {/* Line 1: Envelope Name + Current Balance */}
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                      <span>{envelope.icon}</span>
                                      <span className="font-medium">{envelope.name}</span>
                                    </div>
                                    <div className="text-sm font-bold">
                                      ${parseFloat(envelope.currentBalance).toFixed(2)}
                                    </div>
                                  </div>
                                  
                                  {/* Line 2: Progress Bar (only if due date set) */}
                                  <div className="space-y-0.5">
                                    {envelope.nextPaymentDue && isValid(envelope.nextPaymentDue) && (
                                      <div className="w-full bg-muted rounded-full h-2">
                                        <div 
                                          className={`h-2 rounded-full transition-all ${
                                            envelope.status === 'on-track' || envelope.status === 'over'
                                              ? 'bg-green-500'
                                              : 'bg-red-500'
                                          }`}
                                          style={{ 
                                            width: `${Math.min(100, Math.max(0, 
                                              (parseFloat(envelope.currentBalance) / Math.max(parseFloat(envelope.budgetedAmount), 0.01)) * 100
                                            ))}%` 
                                          }}
                                        />
                                      </div>
                                    )}
                                    
                                    {/* Target + Date + Contribution Info */}
                                    <div className="flex items-center justify-between text-xs">
                                      <div className="flex items-center gap-2 text-muted-foreground">
                                        <span>Target: ${parseFloat(envelope.budgetedAmount || '0').toFixed(2)}</span>
                                        {envelope.nextPaymentDue && isValid(envelope.nextPaymentDue) && (
                                          <span>Due: {format(envelope.nextPaymentDue, 'dd/MM/yyyy')}</span>
                                        )}
                                      </div>
                                      <div className="text-xs font-medium text-blue-600">
                                        {requiredPerPay > 0 
                                          ? `$${requiredPerPay.toFixed(0)}/${frequencyText}`
                                          : envelope.nextPaymentDue && isValid(envelope.nextPaymentDue)
                                          ? 'Ready'
                                          : ''
                                        }
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>

            {/* Empty State */}
            {summaryData.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="text-muted-foreground">
                    <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No envelopes found</p>
                    <p className="text-sm mt-2">
                      Create your first envelope to get started
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Mobile Bottom Navigation */}
        {isMobile && <MobileBottomNav />}
      </div>
    </div>
  );
}