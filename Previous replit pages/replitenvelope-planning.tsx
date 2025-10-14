import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, Trash2, Save, X, AlertTriangle, ChevronDown, ChevronRight, ArrowLeft, ArrowRightLeft, Download, Printer, FileBarChart, Edit } from "lucide-react";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AddEnvelopeDialog } from "@/components/add-envelope-dialog";
import EditEnvelopeDialog from "@/components/edit-envelope-dialog";
import EnvelopeTransferDialog from "@/components/envelope-transfer-dialog";
import MobileHeader from "@/components/layout/mobile-header";

interface PlanningEnvelope {
  id?: number;
  name: string;
  category?: string;
  openingBalance: number;
  dueAmount: number; // maps to targetAmount in schema
  dueDate: Date | null; // maps to nextPaymentDue in schema
  dueFrequency: 'none' | 'weekly' | 'monthly' | 'quarterly' | 'annually'; // maps to budgetFrequency in schema
  contributionAmount: number; // maps to payCycleAmount in schema
  contributionFrequency: 'weekly' | 'fortnightly' | 'monthly';
  actualBalance: number; // calculated from openingBalance + currentBalance
  transactionBalance: number; // maps to currentBalance in schema
  expected: number;
  status: 'under' | 'on-track' | 'over';
  notes?: string; // maps to notes in schema
}

const frequencyMultipliers = {
  weekly: 52,
  fortnightly: 26,
  monthly: 12
};

const statusLabels = {
  'under': 'Under Budget',
  'on-track': 'On Track',
  'over': 'Over Budget'
};

// Calculate required contribution amount based on due amount and frequencies
const calculateRequiredContribution = (dueAmount: number, dueFrequency: string, payFrequency: string): number => {
  if (dueAmount === 0 || dueFrequency === 'none') return 0;
  
  // Convert due frequency to weeks
  let dueWeeks = 0;
  switch (dueFrequency) {
    case 'weekly': dueWeeks = 1; break;
    case 'monthly': dueWeeks = 4.33; break;
    case 'quarterly': dueWeeks = 13; break;
    case 'annually': dueWeeks = 52; break;
  }
  
  // Convert pay frequency to weeks
  let payWeeks = 0;
  switch (payFrequency) {
    case 'weekly': payWeeks = 1; break;
    case 'fortnightly': payWeeks = 2; break;
    case 'monthly': payWeeks = 4.33; break;
  }
  
  if (dueWeeks === 0 || payWeeks === 0) return 0;
  
  // Calculate how many pay periods until due
  const payPeriods = dueWeeks / payWeeks;
  
  return dueAmount / payPeriods;
};

const calculateExpectedBalance = (envelope: PlanningEnvelope, payCycleStartDate: Date | null, payFrequency: string): number => {
  if (!envelope.contributionAmount || !envelope.dueDate || !payCycleStartDate) {
    return envelope.openingBalance;
  }

  const now = new Date();
  const dueDate = new Date(envelope.dueDate);
  const startDate = new Date(payCycleStartDate);
  
  // If due date is in the past, expected balance should be the due amount
  if (dueDate <= now) {
    return envelope.dueAmount;
  }
  
  // If we haven't reached the start date yet, return opening balance
  if (now < startDate) {
    return envelope.openingBalance;
  }
  
  // Calculate how many pay periods have occurred since start date
  const payPeriodDays = payFrequency === 'weekly' ? 7 : payFrequency === 'fortnightly' ? 14 : 30; // approximate for monthly
  const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const payPeriodsElapsed = Math.floor(daysSinceStart / payPeriodDays);
  
  // Expected balance = opening balance + (pay periods elapsed × contribution amount)
  const expectedBalance = envelope.openingBalance + (payPeriodsElapsed * envelope.contributionAmount);
  
  // Don't exceed the due amount
  return Math.min(expectedBalance, envelope.dueAmount);
};

const getStatus = (actual: number, expected: number): 'under' | 'on-track' | 'over' => {
  const tolerance = 5; // $5 tolerance
  if (actual < expected - tolerance) return 'under';
  if (actual > expected + tolerance) return 'over';
  return 'on-track';
};

// Helper function to calculate progress value for progress bar
const getProgressValue = (actualBalance: number = 0, dueAmount: number = 0) => {
  if (dueAmount <= 0) return 0;
  const progress = (actualBalance / dueAmount) * 100;
  return Math.min(Math.max(progress, 0), 100);
};

const getStatusDisplay = (actual: number, expected: number, dueAmount: number, dueFrequency: string, openingBalance: number) => {
  // Ensure all values are valid numbers
  const safeActual = actual || 0;
  const safeExpected = expected || 0;
  const safeDueAmount = dueAmount || 0;
  const safeOpeningBalance = openingBalance || 0;
  
  // For envelopes with no payment schedule, show simple over/under comparison
  if (dueFrequency === 'none') {
    const difference = safeActual - safeOpeningBalance;
    if (Math.abs(difference) < 0.01) {
      return {
        text: 'Even',
        className: 'bg-gray-100 text-gray-800 border-gray-200'
      };
    } else if (difference > 0) {
      return {
        text: `+$${difference.toFixed(2)} Over`,
        className: 'bg-green-100 text-green-800 border-green-200'
      };
    } else {
      return {
        text: `-$${Math.abs(difference).toFixed(2)} Under`,
        className: 'bg-red-100 text-red-800 border-red-200'
      };
    }
  }

  // For scheduled envelopes, use the existing logic
  const tolerance = 5;
  const difference = safeActual - safeExpected;
  
  // Check if envelope is fully funded and has surplus
  if (safeActual >= safeDueAmount + tolerance) {
    const surplus = safeActual - safeDueAmount;
    return {
      text: `+$${surplus.toFixed(2)}`,
      className: 'bg-purple-100 text-purple-800 border-purple-200'
    };
  }
  // Check if under budget
  else if (safeActual < safeExpected - tolerance) {
    return {
      text: `-$${Math.abs(difference).toFixed(2)}`,
      className: 'bg-red-100 text-red-800 border-red-200'
    };
  } 
  // Check if ahead of schedule but not fully funded
  else if (safeActual > safeExpected + tolerance) {
    return {
      text: `+$${difference.toFixed(2)}`,
      className: 'bg-blue-100 text-blue-800 border-blue-200'
    };
  } 
  // On track
  else {
    return {
      text: 'On Track',
      className: 'bg-green-100 text-green-800 border-green-200'
    };
  }
};

export default function EnvelopePlanning() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
  // Load existing envelopes from the main system
  const { data: existingEnvelopes = [] } = useQuery({
    queryKey: ["/api/envelopes"],
  });

  // Load envelope categories
  const { data: categories = [] } = useQuery({
    queryKey: ["/api/envelope-categories"],
  });

  // Load user data for pay cycle settings
  const { data: userData } = useQuery({
    queryKey: ["/api/user"],
  });

  const [planningEnvelopes, setPlanningEnvelopes] = useState<PlanningEnvelope[]>([]);
  const [editingCell, setEditingCell] = useState<{ rowIndex: number; field: string } | null>(null);
  const [payFrequency, setPayFrequency] = useState<'weekly' | 'fortnightly' | 'monthly'>('monthly');
  const [payCycleStartDate, setPayCycleStartDate] = useState<Date | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [showEnvelopeDialog, setShowEnvelopeDialog] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [editingEnvelope, setEditingEnvelope] = useState<any>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);


  // Mutation to update envelope data via API
  const updateEnvelopeMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<PlanningEnvelope> }) => {
      const envelopeData: any = {};
      
      // Map planning envelope fields to actual envelope schema fields
      if (updates.name !== undefined) envelopeData.name = updates.name;
      if (updates.openingBalance !== undefined) envelopeData.openingBalance = updates.openingBalance.toString();
      if (updates.dueAmount !== undefined) envelopeData.targetAmount = updates.dueAmount.toString();
      if (updates.dueDate !== undefined) envelopeData.nextPaymentDue = updates.dueDate?.toISOString() || null;
      if (updates.dueFrequency !== undefined) {
        envelopeData.budgetFrequency = updates.dueFrequency;
      }
      if (updates.contributionAmount !== undefined) envelopeData.payCycleAmount = updates.contributionAmount.toString();
      if (updates.notes !== undefined) envelopeData.notes = updates.notes;

      return apiRequest("PATCH", `/api/envelopes/${id}`, envelopeData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/envelopes'] });
      toast({
        title: "Success",
        description: "Envelope updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update envelope",
        variant: "destructive",
      });
    },
  });

  // Mutation to update user settings (including pay cycle start date)
  const updateUserSettingsMutation = useMutation({
    mutationFn: async (updates: { payCycleStartDate?: Date }) => {
      const userData: any = {};
      if (updates.payCycleStartDate !== undefined) {
        userData.payCycleStartDate = updates.payCycleStartDate?.toISOString() || null;
      }
      return apiRequest("PATCH", "/api/user/settings", userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      toast({
        title: "Success", 
        description: "Pay cycle settings updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update pay cycle settings",
        variant: "destructive",
      });
    },
  });

  // Initialize pay cycle start date from user data
  useEffect(() => {
    if (userData?.payCycleStartDate) {
      setPayCycleStartDate(new Date(userData.payCycleStartDate));
    } else {
      // Default to first of current month if not set
      const firstOfMonth = new Date();
      firstOfMonth.setDate(1);
      setPayCycleStartDate(firstOfMonth);
    }
    
    if (userData?.payCycle) {
      setPayFrequency(userData.payCycle as 'weekly' | 'fortnightly' | 'monthly');
    }
  }, [userData]);

  // Load from localStorage on mount and refresh when API data changes
  useEffect(() => {
    if (!existingEnvelopes?.length || !categories?.length) return;
    
    // Always refresh from API data to ensure sync with edit dialog changes
    initializeFromExistingEnvelopes();
  }, [existingEnvelopes, categories]);

  const initializeFromExistingEnvelopes = () => {
    if (!existingEnvelopes.length) return;
    
    const initialized = existingEnvelopes.map((env: any) => {
      const openingBalance = parseFloat(env.openingBalance || '0');
      const transactionBalance = parseFloat(env.currentBalance || '0');
      
      // Find category name from categoryId
      const category = categories.find((cat: any) => cat.id === env.categoryId);
      const categoryName = category?.name || 'Uncategorised';
      
      return {
        id: env.id,
        name: env.name,
        category: categoryName,
        openingBalance: openingBalance,
        dueAmount: parseFloat(env.targetAmount || '0'),
        dueDate: env.nextPaymentDue ? new Date(env.nextPaymentDue) : null,
        dueFrequency: env.budgetFrequency === 'weekly' ? 'weekly' : 
                     env.budgetFrequency === 'monthly' ? 'monthly' : 
                     env.budgetFrequency === 'quarterly' ? 'quarterly' :
                     env.budgetFrequency === 'annually' ? 'annually' : 
                     env.budgetFrequency === 'none' ? 'none' : 'none' as const,
        contributionAmount: parseFloat(env.payCycleAmount || '0'),
        contributionFrequency: env.budgetFrequency === 'weekly' ? 'weekly' : 
                             env.budgetFrequency === 'fortnightly' ? 'fortnightly' : 'monthly' as const,
        actualBalance: openingBalance + transactionBalance, // Opening balance + transaction activity
        transactionBalance: transactionBalance, // Store original transaction balance
        expected: 0,
        status: 'on-track' as const
      };
    });
    
    recalculateAll(initialized);
    setPlanningEnvelopes(initialized);
  };

  // Save to localStorage whenever planningEnvelopes changes
  useEffect(() => {
    if (planningEnvelopes.length > 0) {
      localStorage.setItem('envelope-planning-data', JSON.stringify(planningEnvelopes));
    }
  }, [planningEnvelopes]);

  // Auto-recalculate when pay frequency or pay cycle start date changes
  useEffect(() => {
    if (planningEnvelopes.length > 0 && payCycleStartDate) {
      recalculateAll();
    }
  }, [payFrequency, payCycleStartDate]);

  const recalculateAll = (envelopes: PlanningEnvelope[] = planningEnvelopes) => {
    const updated = envelopes.map(env => {
      const requiredContribution = calculateRequiredContribution(env.dueAmount, env.dueFrequency, payFrequency);
      const expected = calculateExpectedBalance({ ...env, contributionAmount: requiredContribution }, payCycleStartDate, payFrequency);
      const status = getStatus(env.actualBalance, expected);
      return { 
        ...env, 
        contributionAmount: requiredContribution,
        contributionFrequency: payFrequency,
        expected, 
        status 
      };
    });
    setPlanningEnvelopes(updated);
  };

  // Group envelopes by category
  const groupedEnvelopes = useMemo(() => {
    const groups: { [category: string]: PlanningEnvelope[] } = {};
    planningEnvelopes.forEach(envelope => {
      const category = envelope.category || 'Uncategorised';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(envelope);
    });
    return groups;
  }, [planningEnvelopes]);

  // Toggle category collapse/expand
  const toggleCategory = (categoryName: string) => {
    const newCollapsed = new Set(collapsedCategories);
    if (newCollapsed.has(categoryName)) {
      newCollapsed.delete(categoryName);
    } else {
      newCollapsed.add(categoryName);
    }
    setCollapsedCategories(newCollapsed);
  };

  const handleOpenEnvelopeDialog = () => {
    setShowEnvelopeDialog(true);
  };

  const handleEnvelopeCreated = () => {
    setShowEnvelopeDialog(false);
    // Refresh envelopes data to include new envelope
    queryClient.invalidateQueries({ queryKey: ["/api/envelopes"] });
    toast({
      title: "Success",
      description: "Envelope created successfully",
    });
  };



  const removeRow = (index: number) => {
    const updated = planningEnvelopes.filter((_, i) => i !== index);
    setPlanningEnvelopes(updated);
  };

  const updateEnvelope = (index: number, field: string, value: any) => {
    const updated = [...planningEnvelopes];
    const envelope = { ...updated[index], [field]: value };
    
    // If opening balance changes, recalculate actual balance
    if (field === 'openingBalance') {
      const openingBalance = parseFloat(value) || 0;
      const transactionBalance = envelope.transactionBalance || 0;
      envelope.actualBalance = openingBalance + transactionBalance;
    }
    
    // If frequency changes, recalculate contribution amount
    if (field === 'dueFrequency') {
      const requiredContribution = calculateRequiredContribution(envelope.dueAmount, value, payFrequency);
      envelope.contributionAmount = requiredContribution;
      envelope.contributionFrequency = payFrequency;
      
      // Recalculate expected balance and status
      const expected = calculateExpectedBalance({ ...envelope, contributionAmount: requiredContribution });
      envelope.expected = expected;
      envelope.status = getStatus(envelope.actualBalance, expected);
    }
    
    updated[index] = envelope;
    setPlanningEnvelopes(updated);
    
    // Sync changes to API if envelope has an ID
    if (envelope.id) {
      console.log(`Frontend updateEnvelope: field=${field}, value=${value}`);
      
      // Create updates object with planning envelope field names (not database field names)
      const updateData: any = {};
      updateData[field] = value;
      
      // If opening balance changed, also include the new actual balance calculation
      if (field === 'openingBalance') {
        updateData.actualBalance = envelope.actualBalance;
      }
      
      // If frequency changed, also include the recalculated contribution amount
      if (field === 'dueFrequency') {
        updateData.contributionAmount = envelope.contributionAmount;
      }
      
      console.log(`Sending planning envelope updates:`, updateData);
      
      updateEnvelopeMutation.mutate({ 
        id: envelope.id, 
        updates: updateData 
      });
    }
  };

  const handleCellEdit = (rowIndex: number, field: string, value: string | number | Date) => {
    updateEnvelope(rowIndex, field, value);
    setEditingCell(null);
  };



  const exportToCSV = () => {
    const headers = ['Name', 'Opening Balance', 'Due Amount', 'Due Date', 'Due Frequency', 'Contribution Amount', 'Frequency', 'Actual Balance', 'Expected', 'Status'];
    const rows = planningEnvelopes.map(env => [
      env.name,
      env.openingBalance.toFixed(2),
      env.dueAmount.toFixed(2),
      env.dueDate ? format(env.dueDate, 'dd/MM/yyyy') : '',
      env.dueFrequency,
      env.contributionAmount.toFixed(2),
      env.contributionFrequency,
      env.actualBalance.toFixed(2),
      env.expected.toFixed(2),
      statusLabels[env.status]
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'envelope-planning.csv';
    a.click();
    URL.revokeObjectURL(url);
  };



  return (
    <div>
      {/* Mobile Header */}
      <div className="md:hidden">
        <MobileHeader />
      </div>
      
      <div className="p-4 space-y-6">
      {/* Back Button */}
      <div className="mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/envelopes-new")}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Envelope Planning</h1>
          <p className="text-gray-600 mt-1">Plan and track your envelope contributions with detailed calculations</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleOpenEnvelopeDialog} size="sm" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Envelope
          </Button>
          <Button onClick={() => setIsTransferOpen(true)} variant="outline" size="sm" className="flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4" />
            Move Balances
          </Button>

          <Button onClick={() => window.open('/envelope-balances', '_blank')} variant="outline" size="sm" className="flex items-center gap-2">
            <FileBarChart className="h-4 w-4" />
            Balance Report
          </Button>

          <Button onClick={exportToCSV} variant="outline" size="sm">
            Export CSV
          </Button>
        </div>
      </div>

      {/* Status Boxes - 3 Column Layout */}
      {(() => {
        const offTrackEnvelopes = planningEnvelopes.filter(env => env.status === 'under');
        const surplusEnvelopes = planningEnvelopes.filter(env => env.status === 'over');
        const onTrackEnvelopes = planningEnvelopes.filter(env => env.status === 'on-track');
        
        const totalOffTrackAmount = offTrackEnvelopes.reduce((sum, env) => {
          const shortfall = Math.abs(env.actualBalance - env.expected);
          return sum + shortfall;
        }, 0);
        
        const totalSurplusAmount = surplusEnvelopes.reduce((sum, env) => {
          const surplus = env.actualBalance - env.expected;
          return sum + surplus;
        }, 0);
        
        // Calculate total variance as net amount (positive surplus minus negative shortfall)
        const totalVariance = surplusEnvelopes.reduce((sum, env) => {
          return sum + (env.actualBalance - env.expected);
        }, 0) + offTrackEnvelopes.reduce((sum, env) => {
          return sum + (env.actualBalance - env.expected); // This will be negative
        }, 0);
        
        // Only show status boxes if there are relevant envelopes
        if (offTrackEnvelopes.length === 0 && surplusEnvelopes.length === 0) return null;

        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Off-Track Status Box */}
            {offTrackEnvelopes.length > 0 && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="pt-3 pb-2 px-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1 bg-red-100 rounded">
                      <AlertTriangle className="h-3 w-3 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xs font-medium text-red-800">Off-Track</h3>
                      <p className="text-xs text-red-600">
                        {offTrackEnvelopes.length} envelope{offTrackEnvelopes.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-red-800">
                        ${totalOffTrackAmount.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Surplus Status Box */}
            {surplusEnvelopes.length > 0 && (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="pt-3 pb-2 px-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1 bg-green-100 rounded">
                      <Plus className="h-3 w-3 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xs font-medium text-green-800">Surplus</h3>
                      <p className="text-xs text-green-600">
                        {surplusEnvelopes.length} envelope{surplusEnvelopes.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-green-800">
                        +${totalSurplusAmount.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Total Variance Status Box */}
            <Card className={`border-2 ${
              totalVariance > 0 
                ? 'border-green-300 bg-green-50' 
                : totalVariance < 0 
                  ? 'border-red-300 bg-red-50'
                  : 'border-blue-300 bg-blue-50'
            }`}>
              <CardContent className="pt-3 pb-2 px-3">
                <div className="flex items-center gap-2">
                  <div className={`p-1 rounded ${
                    totalVariance > 0 
                      ? 'bg-green-100' 
                      : totalVariance < 0 
                        ? 'bg-red-100'
                        : 'bg-blue-100'
                  }`}>
                    <ChevronRight className={`h-3 w-3 ${
                      totalVariance > 0 
                        ? 'text-green-600' 
                        : totalVariance < 0 
                          ? 'text-red-600'
                          : 'text-blue-600'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <h3 className={`text-xs font-medium ${
                      totalVariance > 0 
                        ? 'text-green-800' 
                        : totalVariance < 0 
                          ? 'text-red-800'
                          : 'text-blue-800'
                    }`}>
                      Total Variance
                    </h3>
                    <p className={`text-xs ${
                      totalVariance > 0 
                        ? 'text-green-600' 
                        : totalVariance < 0 
                          ? 'text-red-600'
                          : 'text-blue-600'
                    }`}>
                      Net difference
                    </p>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-bold ${
                      totalVariance > 0 
                        ? 'text-green-800' 
                        : totalVariance < 0 
                          ? 'text-red-800'
                          : 'text-blue-800'
                    }`}>
                      {totalVariance > 0 ? '+' : ''}${totalVariance.toFixed(2)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })()}

      <Card>
        <CardContent>
          <div className="mb-4 mt-6 space-y-4">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium">Pay Frequency:</label>
              <Select value={payFrequency} onValueChange={(value: 'weekly' | 'fortnightly' | 'monthly') => setPayFrequency(value)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="fortnightly">Fortnightly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium">Pay Cycle Start Date:</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-48 justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {payCycleStartDate ? format(payCycleStartDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={payCycleStartDate || undefined}
                    onSelect={(date) => {
                      if (date) {
                        setPayCycleStartDate(date);
                        updateUserSettingsMutation.mutate({ payCycleStartDate: date });
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="text-xs text-gray-600 space-y-1">
              <div>Pay frequency determines how the 'Required' column calculates amounts from your due amount</div>
              <div>Pay cycle start date is used to calculate expected balances based on actual payment periods since this date</div>
            </div>
          </div>
          
          {/* Collapse/Expand All Toggle Control */}
          <div className="mb-2 flex justify-start">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const allCategories = new Set(Object.keys(groupedEnvelopes));
                if (collapsedCategories.size === 0) {
                  // If all expanded, collapse all
                  setCollapsedCategories(allCategories);
                } else {
                  // If some or all collapsed, expand all
                  setCollapsedCategories(new Set());
                }
              }}
              className="text-xs px-2 py-1 h-6"
            >
              {collapsedCategories.size === 0 ? 'Collapse All' : 'Expand All'}
            </Button>
          </div>
          
          <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b bg-white sticky top-0 z-10 shadow-sm">
                  <th className="text-left p-2 font-medium text-sm bg-white">Name</th>
                  <th className="text-left p-2 font-medium text-sm bg-white">Opening Balance</th>
                  <th className="text-left p-2 font-medium text-sm bg-white">Due Amount</th>
                  <th className="text-left p-2 font-medium text-sm bg-white">Due Date</th>
                  <th className="text-left p-2 font-medium text-sm bg-white">Due Frequency</th>
                  <th className="text-left p-2 font-medium text-sm bg-white">
                    Required {payFrequency.charAt(0).toUpperCase() + payFrequency.slice(1)} Amount
                  </th>
                  <th className="text-left p-2 font-medium text-sm bg-white">Frequency</th>
                  <th className="text-left p-2 font-medium text-sm bg-white">Actual Balance*</th>
                  <th className="text-left p-2 font-medium text-sm bg-white">Expected</th>
                  <th className="text-left p-2 font-medium text-sm bg-white">Status</th>
                  <th className="text-left p-2 font-medium text-sm bg-white">Actions</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(groupedEnvelopes).map(([categoryName, categoryEnvelopes]) => (
                  <React.Fragment key={categoryName}>
                    {/* Category Header Row */}
                    <tr className="bg-gray-100 border-b-2 border-gray-300">
                      <td colSpan={11} className="p-2">
                        <button
                          onClick={() => toggleCategory(categoryName)}
                          className="flex items-center gap-2 w-full text-left font-medium text-gray-700 hover:text-gray-900"
                        >
                          {collapsedCategories.has(categoryName) ? (
                            <ChevronRight className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                          <span className="text-sm font-semibold">{categoryName}</span>
                          <span className="text-xs text-gray-500">
                            ({categoryEnvelopes.length} envelope{categoryEnvelopes.length !== 1 ? 's' : ''})
                          </span>
                        </button>
                      </td>
                    </tr>
                    
                    {/* Category Envelopes (only show if not collapsed) */}
                    {!collapsedCategories.has(categoryName) && categoryEnvelopes.map((envelope, categoryIndex) => {
                      const originalRowIndex = planningEnvelopes.findIndex(e => e.id === envelope.id || 
                        (e.name === envelope.name && e.openingBalance === envelope.openingBalance));
                      return (
                  <tr key={`${categoryName}-${envelope.id || `${envelope.name}-${categoryIndex}`}`} className="border-b hover:bg-gray-50">
                    {/* Name */}
                    <td className="p-2">
                      {editingCell?.rowIndex === originalRowIndex && editingCell?.field === 'name' ? (
                        <Input
                          value={envelope.name}
                          onChange={(e) => updateEnvelope(originalRowIndex, 'name', e.target.value)}
                          onBlur={() => setEditingCell(null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') setEditingCell(null);
                          }}
                          autoFocus
                          className="h-8 text-sm"
                        />
                      ) : (
                        <div 
                          onClick={() => setEditingCell({ rowIndex: originalRowIndex, field: 'name' })}
                          className="cursor-pointer hover:bg-gray-100 p-1 rounded min-h-6"
                        >
                          <div className="text-sm">{envelope.name}</div>
                          <div className="mt-1 space-y-1">
                            <Progress 
                              value={getProgressValue(envelope.actualBalance, envelope.dueAmount)} 
                              className="h-2"
                            />
                            <div className="text-xs text-gray-500 text-center">
                              {envelope.dueAmount > 0 ? `${Math.round(getProgressValue(envelope.actualBalance, envelope.dueAmount))}%` : '-'}
                            </div>
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Opening Balance */}
                    <td className="p-2">
                      {editingCell?.rowIndex === originalRowIndex && editingCell?.field === 'openingBalance' ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={envelope.openingBalance}
                          onChange={(e) => updateEnvelope(originalRowIndex, 'openingBalance', parseFloat(e.target.value) || 0)}
                          onBlur={() => setEditingCell(null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') setEditingCell(null);
                          }}
                          onFocus={(e) => e.target.select()}
                          autoFocus
                          className="h-8 text-sm"
                        />
                      ) : (
                        <div 
                          onClick={() => setEditingCell({ rowIndex: originalRowIndex, field: 'openingBalance' })}
                          className="cursor-pointer hover:bg-gray-100 p-1 rounded min-h-6 text-sm"
                        >
                          ${(envelope.openingBalance || 0).toFixed(2)}
                        </div>
                      )}
                    </td>

                    {/* Due Amount */}
                    <td className="p-2">
                      {editingCell?.rowIndex === originalRowIndex && editingCell?.field === 'dueAmount' ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={envelope.dueAmount}
                          onChange={(e) => updateEnvelope(originalRowIndex, 'dueAmount', parseFloat(e.target.value) || 0)}
                          onBlur={() => setEditingCell(null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') setEditingCell(null);
                          }}
                          onFocus={(e) => e.target.select()}
                          autoFocus
                          className="h-8 text-sm"
                        />
                      ) : (
                        <div 
                          onClick={() => setEditingCell({ rowIndex: originalRowIndex, field: 'dueAmount' })}
                          className="cursor-pointer hover:bg-gray-100 p-1 rounded min-h-6 text-sm"
                        >
                          ${(envelope.dueAmount || 0).toFixed(2)}
                        </div>
                      )}
                    </td>

                    {/* Due Date */}
                    <td className="p-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-full justify-start text-left font-normal text-sm"
                          >
                            <CalendarIcon className="mr-2 h-3 w-3" />
                            {envelope.dueDate ? format(envelope.dueDate, 'dd/MM/yyyy') : 'Select date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <div className="relative">
                            <Calendar
                              mode="single"
                              selected={envelope.dueDate || undefined}
                              onSelect={(date) => updateEnvelope(originalRowIndex, 'dueDate', date || null)}
                              initialFocus
                            />
                            {envelope.dueDate && (
                              <div className="p-3 border-t">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full"
                                  onClick={() => updateEnvelope(originalRowIndex, 'dueDate', null)}
                                >
                                  <X className="mr-2 h-3 w-3" />
                                  Clear Date
                                </Button>
                              </div>
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </td>

                    {/* Due Frequency */}
                    <td className="p-2">
                      <Select
                        value={envelope.dueFrequency}
                        onValueChange={(value) => updateEnvelope(originalRowIndex, 'dueFrequency', value)}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                          <SelectItem value="annually">Annually</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>

                    {/* Contribution Amount */}
                    <td className="p-2">
                      <div className="p-1 bg-gray-50 text-gray-700 rounded min-h-6 text-sm font-medium">
                        ${(envelope.contributionAmount || 0).toFixed(2)}
                      </div>
                    </td>

                    {/* Frequency */}
                    <td className="p-2">
                      <div className="p-1 bg-gray-50 text-gray-700 rounded min-h-6 text-sm capitalize">
                        {envelope.contributionFrequency}
                      </div>
                    </td>

                    {/* Actual Balance */}
                    <td className="p-2">
                      <button
                        onClick={() => window.open(`/transactions?envelope=${envelope.id}&noDateFilter=true`, '_blank')}
                        className="p-1 bg-gray-50 hover:bg-blue-50 text-blue-600 hover:text-blue-700 rounded min-h-6 text-sm font-medium cursor-pointer transition-colors w-full text-left underline decoration-transparent hover:decoration-current"
                      >
                        ${(envelope.actualBalance || 0).toFixed(2)}
                      </button>
                    </td>

                    {/* Expected */}
                    <td className="p-2">
                      <div className="text-sm font-medium">
                        ${(envelope.expected || 0).toFixed(2)}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="p-2">
                      {(() => {
                        const statusDisplay = getStatusDisplay(envelope.actualBalance, envelope.expected, envelope.dueAmount, envelope.dueFrequency, envelope.openingBalance);
                        return (
                          <Badge className={statusDisplay.className}>
                            {statusDisplay.text}
                          </Badge>
                        );
                      })()}
                    </td>

                    {/* Actions */}
                    <td className="p-2">
                      <div className="flex gap-1">
                        <Button
                          onClick={() => {
                            // Find the matching envelope from existingEnvelopes
                            const matchingEnvelope = Array.isArray(existingEnvelopes) 
                              ? existingEnvelopes.find((e: any) => e.id === envelope.id) 
                              : null;
                            
                            if (matchingEnvelope) {
                              setEditingEnvelope(matchingEnvelope);
                              setShowEditDialog(true);
                            }
                          }}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          onClick={() => removeRow(originalRowIndex)}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                      )
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {planningEnvelopes.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Plus className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No envelopes added yet. Click "Add Row" to start planning.</p>
            </div>
          )}
          
          {planningEnvelopes.length > 0 && (
            <div className="mt-2 text-xs text-gray-500">
              * Actual Balance is calculated from transaction data
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      {planningEnvelopes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">
                {planningEnvelopes.filter(e => e.status === 'on-track').length}
              </div>
              <p className="text-sm text-gray-600">On Track</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600">
                {planningEnvelopes.filter(e => e.status === 'under').length}
              </div>
              <p className="text-sm text-gray-600">Under Target</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">
                {planningEnvelopes.filter(e => e.status === 'over').length}
              </div>
              <p className="text-sm text-gray-600">Over Target</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                ${planningEnvelopes.reduce((sum, e) => sum + (e.expected - e.actualBalance), 0).toFixed(2)}
              </div>
              <p className="text-sm text-gray-600">Total Variance</p>
            </CardContent>
          </Card>
        </div>
      )}



      {/* Add Envelope Dialog */}
      <AddEnvelopeDialog
        open={showEnvelopeDialog}
        onOpenChange={setShowEnvelopeDialog}
        onEnvelopeCreated={handleEnvelopeCreated}
      />

      {/* Envelope Transfer Dialog */}
      <EnvelopeTransferDialog
        open={isTransferOpen}
        onOpenChange={setIsTransferOpen}
      />

      {/* Edit Envelope Dialog */}
      <EditEnvelopeDialog
        envelope={editingEnvelope}
        open={showEditDialog}
        onOpenChange={(open) => {
          setShowEditDialog(open);
          if (!open) {
            setEditingEnvelope(null);
            // Refresh envelope data after edit
            queryClient.invalidateQueries({ queryKey: ["/api/envelopes"] });
          }
        }}
      />
    </div>
    </div>
  );
}