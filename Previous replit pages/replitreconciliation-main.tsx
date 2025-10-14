import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMobile } from "@/hooks/use-mobile";
import Sidebar from "@/components/layout/sidebar";
import MobileHeader from "@/components/layout/mobile-header";
import MobileBottomNav from "@/components/layout/mobile-bottom-nav";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { 
  Scale, 
  Search, 
  AlertTriangle, 
  Clock,
  FileText,
  Check,
  CheckCircle,
  Edit3,
  Plus,
  Minus,
  X,
  Tag,
  ChevronDown,
  Split,
  Upload,
  Trash2,
  ChevronLeft,
  ChevronRight,
  CalendarIcon,
  Download
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type { Transaction, Account, Envelope, Label as LabelType } from "@shared/schema";

export default function ReconciliationMainPage() {
  const isMobile = useMobile();
  const [showCelebration, setShowCelebration] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingEnvelope, setEditingEnvelope] = useState<number | null>(null);
  const [showApprovedWarning, setShowApprovedWarning] = useState(false);
  const [pendingEnvelopeChange, setPendingEnvelopeChange] = useState<{ transactionId: number; envelopeId: number } | null>(null);
  const [accountFilter, setAccountFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [expandedTransaction, setExpandedTransaction] = useState<number | null>(null);
  const [transactionEnvelopes, setTransactionEnvelopes] = useState<{[key: number]: {envelopeId: number; amount: string}[]}>({});
  const [transactionDescriptions, setTransactionDescriptions] = useState<{[key: number]: string}>({});
  const [transactionLabels, setTransactionLabels] = useState<{[key: number]: number[]}>({});
  const [labelSearch, setLabelSearch] = useState("");
  const [labelDialogOpen, setLabelDialogOpen] = useState<number | null>(null);
  const [newLabelName, setNewLabelName] = useState("");
  const [showCreateLabel, setShowCreateLabel] = useState(false);
  const [splitMode, setSplitMode] = useState<{[key: number]: boolean}>({});
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear() - 1, 0, 1), // Start of last year to capture all demo data
    to: new Date(new Date().getFullYear() + 1, 11, 31) // End of next year
  });
  const [selectedEnvelopes, setSelectedEnvelopes] = useState<string[]>([]);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvAccountId, setCsvAccountId] = useState<string>("");
  const [csvPreview, setCsvPreview] = useState<string[][]>([]);
  
  const transactionListRef = useRef<HTMLDivElement>(null);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updateTransactionMutation = useMutation({
    mutationFn: async ({ transactionId, envelopeId }: { transactionId: number; envelopeId: number }) => {
      // First clear existing envelope assignments
      await apiRequest('DELETE', `/api/transactions/${transactionId}/envelopes`);
      
      // Get transaction amount
      const transaction = transactions.find(t => t.id === transactionId);
      if (!transaction) throw new Error('Transaction not found');
      
      // Add new envelope assignment
      await apiRequest('POST', `/api/transactions/${transactionId}/envelopes`, {
        envelopeId,
        amount: transaction.amount
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      setEditingEnvelope(null);
      setPendingEnvelopeChange(null);
      setShowApprovedWarning(false);
      toast({
        title: "Transaction updated",
        description: "Envelope assignment has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update transaction.",
        variant: "destructive",
      });
    },
  });

  const handleEnvelopeEdit = (transactionId: number, envelopeId: number) => {
    const transaction = transactions.find(t => t.id === transactionId);
    if (transaction?.isApproved) {
      setPendingEnvelopeChange({ transactionId, envelopeId });
      setShowApprovedWarning(true);
    } else {
      updateTransactionMutation.mutate({ transactionId, envelopeId });
    }
  };

  const confirmApprovedChange = () => {
    if (pendingEnvelopeChange) {
      updateTransactionMutation.mutate(pendingEnvelopeChange);
    }
  };

  const { data: transactions = [] } = useQuery<Transaction[]>({
    queryKey: ['/api/transactions'],
  });

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ['/api/accounts'],
  });

  const { data: envelopes = [] } = useQuery<Envelope[]>({
    queryKey: ['/api/envelopes'],
  });

  const { data: labels = [] } = useQuery<LabelType[]>({
    queryKey: ['/api/labels'],
  });

  // Calculate reconciliation summary
  const reconciliationSummary = useMemo(() => {
    const totalBankBalance = accounts
      .filter(acc => acc.type !== "credit")
      .reduce((sum, acc) => sum + parseFloat(acc.balance), 0);

    const totalEnvelopeBalance = envelopes.reduce((sum, env) => sum + parseFloat(env.currentBalance), 0);
    const difference = totalBankBalance - totalEnvelopeBalance;
    const isReconciled = Math.abs(difference) < 0.01;

    const unmatched = transactions.filter(tx => 
      !tx.isApproved && 
      (!tx.transactionEnvelopes || tx.transactionEnvelopes.length === 0)
    ).length;

    const pendingApproval = transactions.filter(tx => 
      !tx.isApproved && 
      tx.transactionEnvelopes && 
      tx.transactionEnvelopes.length > 0
    ).length;

    const approved = transactions.filter(tx => 
      tx.isApproved
    ).length;

    return {
      totalBankBalance,
      totalEnvelopeBalance,
      difference,
      isReconciled,
      unmatched,
      pendingApproval,
      approved,
      total: transactions.length
    };
  }, [transactions, accounts, envelopes]);

  // Filter transactions - show only unapproved (unmatched and pending)
  const filteredTransactions = useMemo(() => {
    let filtered = transactions;

    // Apply status filter
    switch (statusFilter) {
      case 'unmatched':
        filtered = filtered.filter(tx => 
          !tx.isApproved && 
          (!tx.transactionEnvelopes || tx.transactionEnvelopes.length === 0)
        );
        break;
      case 'pending':
        filtered = filtered.filter(tx => 
          !tx.isApproved && 
          tx.transactionEnvelopes && 
          tx.transactionEnvelopes.length > 0
        );
        break;
      case 'approved':
        filtered = filtered.filter(tx => tx.isApproved);
        break;
      default:
        // Show only unmatched and pending (exclude approved)
        filtered = filtered.filter(tx => !tx.isApproved);
        break;
    }

    return filtered;
  }, [transactions, statusFilter]);

  // Paginate results
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredTransactions.slice(startIndex, endIndex);
  }, [filteredTransactions, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredTransactions.length / pageSize);

  // Check if reconciliation is complete and show celebration
  useEffect(() => {
    if (reconciliationSummary.unmatched === 0 && reconciliationSummary.pending === 0 && reconciliationSummary.total > 0) {
      setShowCelebration(true);
    }
  }, [reconciliationSummary.unmatched, reconciliationSummary.pending, reconciliationSummary.total]);

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: 'NZD',
    }).format(parseFloat(amount));
  };

  const getAccountName = (accountId: number) => {
    const account = accounts.find(acc => acc.id === accountId);
    return account?.name || 'Unknown Account';
  };

  const getEnvelopeInfo = (transactionId: number) => {
    // This is simplified - in a real app you'd fetch transaction envelopes
    // For demo, just return empty array
    return [];
  };

  const getTransactionHash = (transaction: Transaction) => {
    return transaction.transactionHash;
  };

  const getTransactionStatus = (transaction: Transaction) => {
    if (transaction.isApproved) {
      return {
        label: "Approved",
        variant: "default" as const,
        icon: CheckCircle
      };
    } else if (transaction.transactionEnvelopes && transaction.transactionEnvelopes.length > 0) {
      return {
        label: "Pending",
        variant: "secondary" as const,
        icon: Clock
      };
    } else {
      return {
        label: "Unmatched",
        variant: "destructive" as const,
        icon: AlertTriangle
      };
    }
  };

  const updateDescriptionMutation = useMutation({
    mutationFn: async ({ transactionId, description }: { transactionId: number; description: string }) => {
      console.log('Updating description:', { transactionId, description, isBlank: description === '' });
      return apiRequest('PATCH', `/api/transactions/${transactionId}`, { description });
    },
    onSuccess: async (_, { transactionId }) => {
      await queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      // Clear the local state since it's now saved and fresh data is loaded
      setTransactionDescriptions(prev => {
        const updated = { ...prev };
        delete updated[transactionId];
        return updated;
      });
      toast({
        title: "Description updated",
        description: "Transaction description has been saved.",
        duration: 2000,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update description.",
        variant: "destructive",
      });
    },
  });

  const approveTransactionMutation = useMutation({
    mutationFn: async (data: { transactionId: number; envelopes: Array<{ envelopeId: number; amount: string }>; description?: string; labelIds: number[] }) => {
      console.log("Approve mutation data:", data);
      return apiRequest('POST', `/api/transactions/${data.transactionId}/approve`, {
        envelopes: data.envelopes,
        description: data.description,
        labelIds: data.labelIds
      });
    },
    onSuccess: (_, variables) => {
      console.log("Approve success:", variables);
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/envelopes'] });
      
      // Clear local state for this transaction since it's now saved
      const transactionId = variables.transactionId;
      setTransactionEnvelopes(prev => {
        const updated = { ...prev };
        delete updated[transactionId];
        return updated;
      });
      setTransactionDescriptions(prev => {
        const updated = { ...prev };
        delete updated[transactionId];
        return updated;
      });
      setTransactionLabels(prev => {
        const updated = { ...prev };
        delete updated[transactionId];
        return updated;
      });
      
      toast({
        title: "Transaction updated",
        description: "Transaction changes have been saved successfully.",
      });
    },
    onError: (error: any) => {
      console.error("Approve error:", error);
      const errorMessage = error?.message || "Failed to approve transaction";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const deleteTransactionMutation = useMutation({
    mutationFn: async (transactionId: number) => {
      return apiRequest('DELETE', `/api/transactions/${transactionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/envelopes'] });
      setDeleteConfirmOpen(null);
      toast({
        title: "Transaction deleted",
        description: "Transaction has been permanently removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete transaction.",
        variant: "destructive",
      });
    },
  });

  const handleEnvelopeChange = (transactionId: number, index: number, field: 'envelopeId' | 'amount', value: string) => {
    setTransactionEnvelopes(prev => {
      const current = prev[transactionId] || [];
      const updated = [...current];
      if (field === 'envelopeId') {
        updated[index] = { ...updated[index], envelopeId: parseInt(value) };
      } else {
        updated[index] = { ...updated[index], amount: value };
      }
      return { ...prev, [transactionId]: updated };
    });
  };

  const addEnvelopeAllocation = (transactionId: number) => {
    setTransactionEnvelopes(prev => {
      const current = prev[transactionId] || [];
      return { ...prev, [transactionId]: [...current, { envelopeId: 0, amount: "0.00" }] };
    });
  };

  const removeEnvelopeAllocation = (transactionId: number, index: number) => {
    setTransactionEnvelopes(prev => {
      const current = prev[transactionId] || [];
      const updated = current.filter((_, i) => i !== index);
      return { ...prev, [transactionId]: updated };
    });
  };



  const initializeEnvelopes = (transaction: Transaction) => {
    if (!transactionEnvelopes[transaction.id]) {
      // If transaction has existing envelopes, use them; otherwise start with empty envelope
      const existingEnvelopes = transaction.transactionEnvelopes || [];
      const transactionAmount = Math.abs(parseFloat(transaction.amount)).toFixed(2);
      const initialEnvelopes = existingEnvelopes.length > 0 
        ? existingEnvelopes.map((te: any) => ({
            envelopeId: te.envelopeId || 0,
            amount: Math.abs(parseFloat(te.amount || transactionAmount)).toFixed(2)
          }))
        : [{ envelopeId: 0, amount: transactionAmount }];
      
      setTransactionEnvelopes(prev => ({
        ...prev,
        [transaction.id]: initialEnvelopes
      }));
    }
    if (!transactionDescriptions[transaction.id]) {
      setTransactionDescriptions(prev => ({
        ...prev,
        [transaction.id]: transaction.description || ""
      }));
    }
    if (!transactionLabels[transaction.id]) {
      const existingLabels = transaction.transactionLabels?.map(tl => tl.labelId) || [];
      setTransactionLabels(prev => ({
        ...prev,
        [transaction.id]: existingLabels
      }));
    }
  };

  const toggleLabel = (transactionId: number, labelId: number) => {
    setTransactionLabels(prev => {
      const current = prev[transactionId] || [];
      const isSelected = current.includes(labelId);
      
      if (isSelected) {
        return {
          ...prev,
          [transactionId]: current.filter(id => id !== labelId)
        };
      } else {
        return {
          ...prev,
          [transactionId]: [...current, labelId]
        };
      }
    });
  };



  const filteredLabels = labels.filter(label =>
    label.name.toLowerCase().includes(labelSearch.toLowerCase())
  );

  const createLabelMutation = useMutation({
    mutationFn: async (data: { name: string; colour: string }) => {
      return apiRequest('POST', '/api/labels', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/labels'] });
      setNewLabelName("");
      setShowCreateLabel(false);
      toast({
        title: "Label created",
        description: "New label has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create label.",
        variant: "destructive",
      });
    },
  });

  const handleCreateLabel = () => {
    if (newLabelName.trim()) {
      const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      createLabelMutation.mutate({
        name: newLabelName.trim(),
        colour: randomColor
      });
    }
  };

  const toggleSplitMode = (transactionId: number) => {
    setSplitMode(prev => {
      const newSplitMode = { ...prev, [transactionId]: !prev[transactionId] };
      
      // If enabling split mode, ensure we have at least 2 envelope entries with empty amounts
      if (newSplitMode[transactionId]) {
        const currentEnvelopes = transactionEnvelopes[transactionId] || [];
        if (currentEnvelopes.length < 2) {
          setTransactionEnvelopes(prev => ({
            ...prev,
            [transactionId]: [
              { envelopeId: 0, amount: "" },
              { envelopeId: 0, amount: "" }
            ]
          }));
        }
      } else {
        // When exiting split mode, keep only the first envelope if it exists
        const currentEnvelopes = transactionEnvelopes[transactionId] || [];
        if (currentEnvelopes.length > 1) {
          setTransactionEnvelopes(prev => ({
            ...prev,
            [transactionId]: currentEnvelopes.slice(0, 1)
          }));
        }
      }
      
      return newSplitMode;
    });
  };

  const addEnvelopeSplit = (transactionId: number) => {
    const transaction = transactions.find(t => t.id === transactionId);
    if (!transaction) return;
    
    setTransactionEnvelopes(prev => {
      const current = prev[transactionId] || [];
      return {
        ...prev,
        [transactionId]: [...current, { envelopeId: 0, amount: "" }]
      };
    });
  };

  const removeEnvelopeSplit = (transactionId: number, index: number) => {
    setTransactionEnvelopes(prev => {
      const current = prev[transactionId] || [];
      const newEnvelopes = current.filter((_, i) => i !== index);
      
      // If we only have one envelope left, exit split mode
      if (newEnvelopes.length <= 1) {
        setSplitMode(prevSplit => ({ ...prevSplit, [transactionId]: false }));
      }
      
      return {
        ...prev,
        [transactionId]: newEnvelopes
      };
    });
  };

  const canApproveTransaction = (transactionId: number) => {
    const envelopes = transactionEnvelopes[transactionId] || [];
    const hasValidEnvelopes = envelopes.length > 0 && envelopes.every(env => env.envelopeId > 0);
    const totalAmount = Math.abs(envelopes.reduce((sum, env) => sum + parseFloat(env.amount || '0'), 0));
    const transaction = transactions.find(t => t.id === transactionId);
    const transactionAmount = Math.abs(parseFloat(transaction?.amount || '0'));
    
    console.log(`canApproveTransaction(${transactionId}):`, {
      envelopes,
      hasValidEnvelopes,
      totalAmount,
      transactionAmount,
      amountMatch: Math.abs(totalAmount - transactionAmount) < 0.01,
      result: hasValidEnvelopes && Math.abs(totalAmount - transactionAmount) < 0.01
    });
    
    return hasValidEnvelopes && Math.abs(totalAmount - transactionAmount) < 0.01;
  };

  const hasTransactionBeenEdited = (transactionId: number) => {
    const transaction = transactions.find(t => t.id === transactionId);
    if (!transaction) return false;

    // Check if description has been changed
    const currentDescription = transactionDescriptions[transactionId];
    if (currentDescription !== undefined && currentDescription !== (transaction.description || "")) {
      return true;
    }

    // Check if envelope assignments have been changed
    const currentEnvelopes = transactionEnvelopes[transactionId];
    if (currentEnvelopes && currentEnvelopes.length > 0) {
      // If transaction originally had no envelopes and now has some, it's been edited
      if (!transaction.transactionEnvelopes || transaction.transactionEnvelopes.length === 0) {
        return true;
      }
      // If the envelope assignments are different, it's been edited
      const originalEnvelopes = transaction.transactionEnvelopes || [];
      if (currentEnvelopes.length !== originalEnvelopes.length) {
        return true;
      }
      // Check if any envelope assignment has changed
      for (let i = 0; i < currentEnvelopes.length; i++) {
        const current = currentEnvelopes[i];
        const original = originalEnvelopes[i];
        if (!original || current.envelopeId !== original.envelopeId || current.amount !== original.amount) {
          return true;
        }
      }
    }

    // Check if labels have been changed
    const currentLabels = transactionLabels[transactionId] || [];
    const originalLabels = []; // We don't have original labels in the transaction object yet
    if (currentLabels.length !== originalLabels.length) {
      return currentLabels.length > 0; // Only consider it edited if labels were added
    }

    return false;
  };

  // CSV Import Mutation
  const csvImportMutation = useMutation({
    mutationFn: async ({ file, accountId }: { file: File; accountId: string }) => {
      const formData = new FormData();
      formData.append('csv', file);
      formData.append('accountId', accountId);
      
      const response = await fetch('/api/transactions/import-csv', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        try {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to import CSV');
        } catch (e) {
          throw new Error(`Failed to import CSV: ${response.status} ${response.statusText}`);
        }
      }
      
      try {
        const responseText = await response.text();
        console.log('CSV Import Response:', responseText);
        return JSON.parse(responseText);
      } catch (e) {
        console.error('JSON Parse Error:', e);
        throw new Error('Invalid response from server');
      }
    },
    onSuccess: (data) => {
      toast({
        title: "CSV Import Successful",
        description: `Imported ${data.imported} transactions successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      setShowCsvImport(false);
      setCsvFile(null);
      setCsvAccountId("");
      setCsvPreview([]);
    },
    onError: (error) => {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCsvFile(file);
      setShowCsvImport(true);
      // Read and preview file
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const rows = text.split('\n').slice(0, 6); // Show first 5 rows + header
        const parsedRows = rows.map(row => {
          const result = [];
          let current = '';
          let inQuotes = false;
          
          for (let i = 0; i < row.length; i++) {
            const char = row[i];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              result.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          result.push(current.trim());
          return result;
        });
        setCsvPreview(parsedRows);
      };
      reader.readAsText(file);
    }
  };

  const handleCsvImport = () => {
    if (csvFile && csvAccountId) {
      csvImportMutation.mutate({ file: csvFile, accountId: csvAccountId });
    }
  };

  const scrollToTransactions = () => {
    setTimeout(() => {
      if (transactionListRef.current) {
        transactionListRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }
    }, 100);
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setActiveSearchQuery("");
    setStatusFilter("all");
    setAccountFilter("all");
    setSelectedEnvelopes([]);
    setDateRange({
      from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      to: new Date()
    });
  };

  const handleSearch = () => {
    setActiveSearchQuery(searchQuery);
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };



  return (
    <div className="min-h-screen flex bg-background">
      {!isMobile && <Sidebar />}
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {isMobile && <MobileHeader />}
        
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="p-1 md:p-4 space-y-3 max-w-full pb-20 lg:pb-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl md:text-2xl font-bold">Reconcile Transactions</h1>
                <p className="text-sm text-muted-foreground">Match and approve bank transactions</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('csv-file-input')?.click()}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Import CSV</span>
                <span className="sm:hidden">Import</span>
              </Button>
              <input
                id="csv-file-input"
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-2">
              <Card className={`border ${reconciliationSummary.isReconciled 
                ? 'border-green-200 bg-green-50' 
                : 'border-yellow-200 bg-yellow-50'
              }`}>
                <CardContent className="p-2">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">Status</p>
                      <p className={`text-sm font-bold ${reconciliationSummary.isReconciled ? 'text-green-700' : 'text-yellow-700'}`}>
                        {reconciliationSummary.isReconciled ? 'Reconciled' : 'Out of Balance'}
                      </p>
                      {!reconciliationSummary.isReconciled && (
                        <p className="text-xs text-muted-foreground">
                          Diff: {formatCurrency(Math.abs(reconciliationSummary.difference).toString())}
                        </p>
                      )}
                    </div>
                    {reconciliationSummary.isReconciled ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card 
                className={`cursor-pointer transition-colors hover:bg-muted/50 ${statusFilter === 'unmatched' ? 'ring-2 ring-primary' : ''}`}
                onClick={() => {
                  setStatusFilter('unmatched');
                  scrollToTransactions();
                }}
              >
                <CardContent className="p-2">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">Unmatched</p>
                      <p className="text-sm font-bold text-red-700">{reconciliationSummary.unmatched}</p>
                    </div>
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  </div>
                </CardContent>
              </Card>

              <Card 
                className={`cursor-pointer transition-colors hover:bg-muted/50 ${statusFilter === 'pending' ? 'ring-2 ring-primary' : ''}`}
                onClick={() => {
                  setStatusFilter('pending');
                  scrollToTransactions();
                }}
              >
                <CardContent className="p-2">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">Pending</p>
                      <p className="text-sm font-bold text-yellow-700">{reconciliationSummary.pendingApproval}</p>
                    </div>
                    <Clock className="h-4 w-4 text-yellow-600" />
                  </div>
                </CardContent>
              </Card>
            </div>



            {/* Transaction List */}
            <Card ref={transactionListRef} className="overflow-hidden">
              <CardHeader className="p-2 bg-muted/50">
                <CardTitle className="flex items-center justify-between text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span>Transactions</span>
                    <Badge variant="secondary" className="text-xs">
                      {filteredTransactions.length} of {reconciliationSummary.total}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {paginatedTransactions.map((transaction) => {
                    const status = getTransactionStatus(transaction);
                    
                    return (
                      <div key={transaction.id} className="border-b border-border/30">
                        <div className="py-1 px-2 transition-colors hover:bg-muted/20">
                          {/* Two-line condensed layout */}
                          <div className="space-y-0.5">
                            {/* Line 1: Merchant + Description Input + Date + Account + Amount */}
                            <div className="flex items-center gap-1 md:gap-2">
                              <div className="flex items-center gap-1 flex-1 min-w-0">
                                <span className="font-medium text-xs truncate max-w-[80px] md:max-w-[120px]">{transaction.merchant}</span>
                                <span className="text-xs text-muted-foreground">-</span>
                                <div className="relative flex items-center">
                                  <Input
                                    value={transactionDescriptions[transaction.id] !== undefined 
                                      ? transactionDescriptions[transaction.id] 
                                      : transaction.description || ""}
                                    onChange={(e) => setTransactionDescriptions(prev => ({
                                      ...prev,
                                      [transaction.id]: e.target.value
                                    }))}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        const newDescription = transactionDescriptions[transaction.id] !== undefined 
                                          ? transactionDescriptions[transaction.id] 
                                          : "";
                                        updateDescriptionMutation.mutate({
                                          transactionId: transaction.id,
                                          description: newDescription
                                        });
                                        // Blur the input to close editing mode
                                        e.target.blur();
                                      }
                                    }}
                                    onBlur={() => {
                                      // Auto-save when clicking away from field
                                      if (transactionDescriptions[transaction.id] !== undefined) {
                                        const newDescription = transactionDescriptions[transaction.id];
                                        const originalDescription = transaction.description || "";
                                        // Save if the value has changed, including blank overrides
                                        if (newDescription !== originalDescription) {
                                          updateDescriptionMutation.mutate({
                                            transactionId: transaction.id,
                                            description: newDescription
                                          });
                                        }
                                      }
                                    }}
                                    className="h-4 text-xs border border-dashed border-muted-foreground/30 bg-muted/20 hover:bg-muted/40 focus:bg-background focus:border-primary px-1 pr-5 rounded-sm w-[80px] md:w-[120px]"
                                    placeholder="notes..."
                                  />
                                  {(transactionDescriptions[transaction.id] || transaction.description) && (
                                    <button
                                      onClick={() => {
                                        setTransactionDescriptions(prev => ({
                                          ...prev,
                                          [transaction.id]: ""
                                        }));
                                        updateDescriptionMutation.mutate({
                                          transactionId: transaction.id,
                                          description: ""
                                        });
                                      }}
                                      className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-sm hover:bg-muted"
                                      type="button"
                                    >
                                      <X className="h-2.5 w-2.5" />
                                    </button>
                                  )}
                                </div>
                                {/* Date and Account */}
                                <span className="text-xs text-muted-foreground">{format(new Date(transaction.date), "dd/MM")}</span>
                                <span className="text-xs text-muted-foreground truncate max-w-[60px] md:max-w-[80px]">{getAccountName(transaction.accountId)}</span>
                              </div>
                              {/* Amount */}
                              <div className="flex items-center">
                                <span className="font-semibold text-xs whitespace-nowrap">
                                  {formatCurrency(transaction.amount)}
                                </span>
                              </div>
                            </div>

                            {/* Line 2: Envelope selector + Labels + Action Buttons */}
                            <div className="flex items-center gap-1">
                              {/* Envelope Selector */}
                              <div className="flex-1 min-w-0 max-w-[120px] md:max-w-[160px]">
                              {(() => {
                                // Initialize transaction state if not exists
                                if (!transactionEnvelopes[transaction.id]) {
                                  initializeEnvelopes(transaction);
                                }
                                return null;
                              })()}
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    className="h-5 text-xs justify-between w-full"
                                    onClick={() => initializeEnvelopes(transaction)}
                                  >
                                    {(() => {
                                      const selectedEnvelopeId = transactionEnvelopes[transaction.id]?.[0]?.envelopeId || 0;
                                      const selectedEnvelope = envelopes.find(e => e.id === selectedEnvelopeId);
                                      return selectedEnvelope ? (
                                        <span className="flex items-center gap-1">
                                          <span className="text-xs">{selectedEnvelope.icon}</span>
                                          <span className="truncate text-xs">{selectedEnvelope.name}</span>
                                        </span>
                                      ) : <span className="text-xs">Select...</span>;
                                    })()}
                                    <ChevronDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[280px] p-0">
                                  <Command>
                                    <CommandInput placeholder="Search envelopes..." className="h-9" />
                                    <CommandEmpty>No envelope found.</CommandEmpty>
                                    <CommandGroup className="max-h-60 overflow-auto">
                                      {envelopes.map((envelope) => (
                                        <CommandItem
                                          key={envelope.id}
                                          value={envelope.name}
                                          onSelect={() => handleEnvelopeChange(transaction.id, 0, 'envelopeId', envelope.id.toString())}
                                        >
                                          <span className="flex items-center gap-2">
                                            <span>{envelope.icon}</span>
                                            <span>{envelope.name}</span>
                                          </span>
                                          <Check
                                            className={`ml-auto h-4 w-4 ${
                                              (transactionEnvelopes[transaction.id]?.[0]?.envelopeId || 0) === envelope.id
                                                ? "opacity-100"
                                                : "opacity-0"
                                            }`}
                                          />
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                            </div>

                              {/* Labels */}
                              {transactionLabels[transaction.id] && transactionLabels[transaction.id].length > 0 && (
                                <div className="flex items-center gap-1">
                                  {transactionLabels[transaction.id].slice(0, 1).map((labelId) => {
                                    const label = labels.find(l => l.id === labelId);
                                    if (!label) return null;
                                    return (
                                      <span key={labelId} className="text-xs px-1 py-0 rounded" style={{ backgroundColor: label.colour, color: 'white' }}>
                                        {label.name}
                                      </span>
                                    );
                                  })}
                                  {transactionLabels[transaction.id].length > 1 && (
                                    <span className="text-xs text-muted-foreground">+{transactionLabels[transaction.id].length - 1}</span>
                                  )}
                                </div>
                              )}

                              {/* Action Buttons */}
                              <div className="flex items-center gap-0.5 shrink-0 ml-auto">
                              <Button
                                variant="outline"
                                size="sm"
                                className={`h-5 md:h-6 text-xs px-1 md:px-2 border transition-colors ${
                                  splitMode[transaction.id] 
                                    ? "bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100" 
                                    : "hover:bg-muted"
                                }`}
                                onClick={() => toggleSplitMode(transaction.id)}
                              >
                                {splitMode[transaction.id] ? "Done" : "Split"}
                              </Button>
                              
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-5 md:h-6 text-xs px-1 md:px-2 border hover:bg-muted transition-colors"
                                onClick={() => setLabelDialogOpen(transaction.id)}
                              >
                                <span className="md:hidden">🏷️</span>
                                <span className="hidden md:inline">Labels</span>
                              </Button>
                              
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-5 md:h-6 text-xs px-1 md:px-2 border hover:bg-destructive hover:text-destructive-foreground transition-colors"
                                onClick={() => setDeleteConfirmOpen(transaction.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                              
                              {/* Status Badge - Hidden on mobile to save space */}
                              <Badge 
                                variant={status.label === "Approved" ? "default" : status.variant} 
                                className={`text-xs px-2 h-5 md:h-6 shrink-0 ml-0.5 md:ml-1 hidden md:flex w-28 justify-center ${
                                  status.label === "Approved" 
                                    ? "bg-blue-100 text-blue-800 border-blue-200" 
                                    : status.label === "Pending"
                                    ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                                    : ""
                                }`}
                              >
                                {status.label}
                              </Badge>
                              
                              {/* Only show approve button for unapproved transactions OR if edits have been made to approved ones */}
                              {(!transaction.isApproved || hasTransactionBeenEdited(transaction.id)) && (
                                <Button
                                  size="sm"
                                  className={`h-5 md:h-6 text-xs px-2 ml-0.5 md:ml-1 w-12 md:w-16 text-center shrink-0 justify-center ${
                                    transaction.isApproved && hasTransactionBeenEdited(transaction.id)
                                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                                      : "bg-blue-600 hover:bg-blue-700 md:bg-green-600 md:hover:bg-green-700 text-white"
                                  }`}
                                  disabled={!canApproveTransaction(transaction.id) || approveTransactionMutation.isPending}
                                  onClick={() => {
                                    approveTransactionMutation.mutate({
                                      transactionId: transaction.id,
                                      envelopes: transactionEnvelopes[transaction.id] || [],
                                      description: transactionDescriptions[transaction.id],
                                      labelIds: transactionLabels[transaction.id] || []
                                    });
                                  }}
                                >
                                  {approveTransactionMutation.isPending ? "..." : (transaction.isApproved ? "Edit" : 
                                  <><span className="md:hidden">✓</span><span className="hidden md:inline">Approve</span></>)}
                                </Button>
                              )}
                              </div>
                              
                            </div>
                          </div>


                          {/* Expandable split interface - positioned underneath the transaction row */}
                          {splitMode[transaction.id] && (
                            <div className="mt-1 md:mt-2 mx-1 md:mx-4 p-1 md:p-3 bg-muted/10 border-t md:border md:rounded-lg space-y-1 md:space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-muted-foreground">Split Transaction</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-xs px-2"
                                  onClick={() => addEnvelopeSplit(transaction.id)}
                                >
                                  + Add Split
                                </Button>
                              </div>
                              
                              {transactionEnvelopes[transaction.id]?.map((allocation, index) => (
                                <div key={index} className="flex items-center gap-2 bg-background p-2 rounded border">
                                  <div className="flex-1">
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <Button
                                          variant="outline"
                                          role="combobox"
                                          className="h-7 text-xs justify-between w-full"
                                        >
                                          {(() => {
                                            const selectedEnvelope = envelopes.find(e => e.id === allocation.envelopeId);
                                            return selectedEnvelope ? (
                                              <span className="flex items-center gap-1">
                                                <span className="text-xs">{selectedEnvelope.icon}</span>
                                                <span className="truncate text-xs">{selectedEnvelope.name}</span>
                                              </span>
                                            ) : <span className="text-xs">Select envelope...</span>;
                                          })()}
                                          <ChevronDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-[280px] p-0">
                                        <Command>
                                          <CommandInput placeholder="Search envelopes..." className="h-9" />
                                          <CommandEmpty>No envelope found.</CommandEmpty>
                                          <CommandGroup className="max-h-60 overflow-auto">
                                            {envelopes.map((envelope) => (
                                              <CommandItem
                                                key={envelope.id}
                                                value={envelope.name}
                                                onSelect={() => handleEnvelopeChange(transaction.id, index, 'envelopeId', envelope.id.toString())}
                                              >
                                                <span className="flex items-center gap-2">
                                                  <span>{envelope.icon}</span>
                                                  <span>{envelope.name}</span>
                                                </span>
                                                <Check
                                                  className={`ml-auto h-4 w-4 ${
                                                    allocation.envelopeId === envelope.id
                                                      ? "opacity-100"
                                                      : "opacity-0"
                                                  }`}
                                                />
                                              </CommandItem>
                                            ))}
                                          </CommandGroup>
                                        </Command>
                                      </PopoverContent>
                                    </Popover>
                                  </div>
                                  
                                  <div className="w-24">
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={allocation.amount}
                                      onChange={(e) => handleEnvelopeChange(transaction.id, index, 'amount', e.target.value)}
                                      className="h-7 text-xs"
                                      placeholder="0.00"
                                    />
                                  </div>
                                  
                                  {transactionEnvelopes[transaction.id]?.length > 1 && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                      onClick={() => removeEnvelopeSplit(transaction.id, index)}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              ))}
                              
                              {/* Balance to allocate indicator - always show in split mode */}
                              {(() => {
                                const transaction_data = transactions.find(t => t.id === transaction.id);
                                if (!transaction_data) return null;
                                
                                const totalAllocated = transactionEnvelopes[transaction.id]?.reduce(
                                  (sum, env) => sum + Math.abs(parseFloat(env.amount || '0')), 0
                                ) || 0;
                                const transactionAmount = Math.abs(parseFloat(transaction_data.amount));
                                const remaining = transactionAmount - totalAllocated;
                                
                                return (
                                  <div className={`text-sm text-center py-2 rounded border ${
                                    Math.abs(remaining) < 0.01 
                                      ? 'text-green-700 bg-green-50 border-green-200' 
                                      : remaining > 0 
                                        ? 'text-blue-700 bg-blue-50 border-blue-200' 
                                        : 'text-red-700 bg-red-50 border-red-200'
                                  }`}>
                                    <div className="font-medium">
                                      Transaction Amount: ${transactionAmount.toFixed(2)}
                                    </div>
                                    <div className="text-xs mt-1">
                                      {Math.abs(remaining) < 0.01 ? (
                                        '✓ Fully allocated'
                                      ) : remaining > 0 ? (
                                        `Remaining to allocate: $${remaining.toFixed(2)}`
                                      ) : (
                                        `Over allocated by: $${Math.abs(remaining).toFixed(2)}`
                                      )}
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="p-2 border-t bg-muted/30 flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredTransactions.length)} of {filteredTransactions.length}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="h-6 text-xs px-2"
                      >
                        Previous
                      </Button>
                      <span className="text-xs">
                        {currentPage} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="h-6 text-xs px-2"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}

                {paginatedTransactions.length === 0 && (
                  <div className="p-4 text-center text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No transactions found matching your filters</p>
                    <p className="text-xs mt-1">Try adjusting your search or filter criteria</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
      
      {isMobile && <MobileBottomNav />}

      {/* Delete Transaction Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen !== null} onOpenChange={() => setDeleteConfirmOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Transaction</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this transaction? This action cannot be reversed and will permanently remove the transaction and all associated data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                if (deleteConfirmOpen) {
                  deleteTransactionMutation.mutate(deleteConfirmOpen);
                }
              }}
              disabled={deleteTransactionMutation.isPending}
            >
              {deleteTransactionMutation.isPending ? "Deleting..." : "Delete Transaction"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Labels Selection Dialog */}
      {labelDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 max-w-sm w-full mx-4 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">Select Labels</h3>
              <Button
                variant="default"
                size="sm"
                className="h-7 text-xs px-3"
                onClick={() => {
                  setLabelDialogOpen(null);
                  setLabelSearch("");
                  setShowCreateLabel(false);
                  setNewLabelName("");
                }}
              >
                OK
              </Button>
            </div>
            
            <div className="mb-3">
              <Input
                placeholder="Search labels..."
                value={labelSearch}
                onChange={(e) => setLabelSearch(e.target.value)}
                className="h-8 text-xs"
              />
              
              {/* Create new label option */}
              {labelSearch && !filteredLabels.some(l => l.name.toLowerCase() === labelSearch.toLowerCase()) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2 h-7 text-xs"
                  onClick={() => {
                    setNewLabelName(labelSearch);
                    setShowCreateLabel(true);
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Create "{labelSearch}"
                </Button>
              )}
              
              {/* Manual create label button */}
              {!showCreateLabel && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-1 h-6 text-xs text-muted-foreground"
                  onClick={() => setShowCreateLabel(true)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add new label
                </Button>
              )}
              
              {/* Create label input */}
              {showCreateLabel && (
                <div className="mt-2 space-y-2">
                  <Input
                    placeholder="Label name..."
                    value={newLabelName}
                    onChange={(e) => setNewLabelName(e.target.value)}
                    className="h-7 text-xs"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newLabelName.trim()) {
                        handleCreateLabel();
                      }
                      if (e.key === 'Escape') {
                        setShowCreateLabel(false);
                        setNewLabelName("");
                      }
                    }}
                  />
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      className="h-6 text-xs flex-1"
                      onClick={handleCreateLabel}
                      disabled={!newLabelName.trim() || createLabelMutation.isPending}
                    >
                      {createLabelMutation.isPending ? "Creating..." : "Create"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => {
                        setShowCreateLabel(false);
                        setNewLabelName("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
            
            <div className="space-y-1">
              {filteredLabels.map(label => {
                const isSelected = (transactionLabels[labelDialogOpen] || []).includes(label.id);
                return (
                  <div
                    key={label.id}
                    className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-gray-50 ${
                      isSelected ? 'bg-blue-50 border border-blue-200' : ''
                    }`}
                    onClick={() => toggleLabel(labelDialogOpen, label.id)}
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: label.colour }}
                    />
                    <span className="text-xs flex-1">{label.name}</span>
                    {isSelected && <Check className="h-4 w-4 text-green-600" />}
                  </div>
                );
              })}
              
              {filteredLabels.length === 0 && !showCreateLabel && (
                <div className="text-center text-gray-500 text-sm py-4">
                  {labelSearch ? `No labels matching "${labelSearch}"` : 'No labels created yet'}
                </div>
              )}
            </div>
            
            {/* Selected labels preview */}
            {(transactionLabels[labelDialogOpen] || []).length > 0 && (
              <div className="mt-3 pt-3 border-t">
                <div className="text-xs text-gray-600 mb-2">Selected ({(transactionLabels[labelDialogOpen] || []).length}):</div>
                <div className="flex flex-wrap gap-1">
                  {(transactionLabels[labelDialogOpen] || []).map(labelId => {
                    const label = labels.find(l => l.id === labelId);
                    if (!label) return null;
                    return (
                      <Badge
                        key={labelId}
                        variant="secondary"
                        className="text-xs h-5 px-2 cursor-pointer"
                        style={{ backgroundColor: label.colour + '20', color: label.colour }}
                        onClick={() => toggleLabel(labelDialogOpen, label.id)}
                        title="Click to remove"
                      >
                        {label.name}
                        <X className="h-2 w-2 ml-1" />
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Approved Transaction Warning Dialog */}
      <Dialog open={showApprovedWarning} onOpenChange={setShowApprovedWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Approved Transaction</DialogTitle>
            <DialogDescription>
              This transaction has already been approved and may affect your account balances. 
              Are you sure you want to change the envelope assignment?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowApprovedWarning(false);
                setPendingEnvelopeChange(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={confirmApprovedChange}>
              Yes, Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Celebration Dialog */}
      <Dialog open={showCelebration} onOpenChange={setShowCelebration}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-green-600 flex items-center justify-center space-x-2">
              <CheckCircle className="h-6 w-6" />
              <span>Well Done!</span>
            </DialogTitle>
          </DialogHeader>
          <div className="text-center space-y-4 py-4">
            <p className="text-lg">Your reconciliation is up to date!</p>
            <p className="text-sm text-muted-foreground">
              Remember to check back soon to keep up to date with new transactions.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowCelebration(false)} className="w-full">
              Perfect!
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CSV Import Dialog */}
      {showCsvImport && csvFile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-5xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <h3 className="font-semibold text-lg">Import CSV Transactions</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowCsvImport(false);
                  setCsvFile(null);
                  setCsvAccountId("");
                  setCsvPreview([]);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-4 flex-1 min-h-0 flex flex-col">
              <div className="flex-shrink-0">
                <label className="block text-sm font-medium mb-2">
                  Select Account for Import
                </label>
                <Select value={csvAccountId} onValueChange={setCsvAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose account..." />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id.toString()}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {csvPreview.length > 0 && (
                <div className="flex-1 min-h-0">
                  <p className="text-sm font-medium mb-2">CSV Preview:</p>
                  <div className="border rounded-lg overflow-auto max-h-full">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-50">
                          {csvPreview[0]?.map((header, index) => (
                            <th key={index} className="border border-gray-300 p-2 text-left font-medium text-sm">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {csvPreview.slice(1).map((row, rowIndex) => (
                          <tr key={rowIndex} className="hover:bg-gray-50">
                            {row.map((cell, cellIndex) => (
                              <td key={cellIndex} className="border border-gray-300 p-2 text-sm">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex-shrink-0">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800 font-medium mb-1">Required CSV Format:</p>
                  <p className="text-sm text-blue-700">
                    Date, Merchant, Amount, Description (optional columns: Type, Memo, Reference)
                  </p>
                </div>
              </div>

              <div className="flex gap-3 flex-shrink-0">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCsvImport(false);
                    setCsvFile(null);
                    setCsvAccountId("");
                    setCsvPreview([]);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCsvImport}
                  disabled={!csvAccountId || csvImportMutation.isPending}
                  className="flex-1"
                >
                  {csvImportMutation.isPending ? "Importing..." : "Import Transactions"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}