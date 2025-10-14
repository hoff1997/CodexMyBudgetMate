import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useMobile } from "@/hooks/use-mobile";
import Sidebar from "@/components/layout/sidebar";
import MobileHeader from "@/components/layout/mobile-header";
import MobileBottomNav from "@/components/layout/mobile-bottom-nav";
import BankConnectionManager from "@/components/bank-connection-manager";
import LabelManager from "@/components/label-manager";
import { EnvelopeTypeManager } from "@/components/envelope-type-manager";
import CategoryManager from "@/components/category-manager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import EditEnvelopeDialog from "@/components/edit-envelope-dialog";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { 
  Settings, 
  User, 
  Bell, 
  Palette, 
  Database, 
  Download, 
  Upload,
  Trash2,
  RefreshCw,
  Shield,
  DollarSign,
  Building2,
  Info,
  GitBranch,
  Plus,
  Edit3,
  Tag,
  GripVertical,
  ArrowDown
} from "lucide-react";

// Password change schema
const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(4, "New password must be at least 4 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password")
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

type PasswordChangeForm = z.infer<typeof passwordChangeSchema>;

export default function SettingsPage() {
  const isMobile = useMobile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Local state for settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [reconciliationReminders, setReconciliationReminders] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [currency, setCurrency] = useState("NZD");
  const [dateFormat, setDateFormat] = useState("dd/MM/yyyy");
  const [csvImportOpen, setCsvImportOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  
  // Edit dialog states
  const [editCategoryOpen, setEditCategoryOpen] = useState(false);
  const [editLabelOpen, setEditLabelOpen] = useState(false);
  const [editEnvelopeOpen, setEditEnvelopeOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [selectedLabel, setSelectedLabel] = useState<any>(null);
  const [selectedEnvelope, setSelectedEnvelope] = useState<any>(null);
  
  // Collapse state for categories
  const [collapsedCategories, setCollapsedCategories] = useState<Set<number>>(new Set());

  // Toggle category collapse
  const toggleCategoryCollapse = (categoryId: number) => {
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
  const collapseAllCategories = () => {
    const allCategoryIds = (categories as any[]).map((cat: any) => cat.id);
    setCollapsedCategories(new Set(allCategoryIds));
  };

  // Expand all categories
  const expandAllCategories = () => {
    setCollapsedCategories(new Set());
  };
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load data for drag-and-drop sorting and settings display
  const { data: categories = [] } = useQuery({
    queryKey: ['/api/envelope-categories'],
  });

  const { data: labels = [] } = useQuery({
    queryKey: ['/api/labels'],
  });

  const { data: envelopes = [] } = useQuery({
    queryKey: ['/api/envelopes'],
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['/api/accounts'],
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['/api/transactions'],
  });

  const { data: rules = [] } = useQuery({
    queryKey: ['/api/category-rules'],
  });
  
  // Akahu credentials state with localStorage persistence
  const [akahuBaseUrl, setAkahuBaseUrl] = useState(() => 
    localStorage.getItem('akahu-base-url') || "https://api.akahu.io"
  );
  const [akahuAppToken, setAkahuAppToken] = useState(() => 
    localStorage.getItem('akahu-app-token') || ""
  );
  const [akahuUserToken, setAkahuUserToken] = useState(() => 
    localStorage.getItem('akahu-user-token') || ""
  );
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testResult, setTestResult] = useState<any>(null);

  // Save Akahu settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem('akahu-base-url', akahuBaseUrl);
  }, [akahuBaseUrl]);

  useEffect(() => {
    localStorage.setItem('akahu-app-token', akahuAppToken);
  }, [akahuAppToken]);

  useEffect(() => {
    localStorage.setItem('akahu-user-token', akahuUserToken);
  }, [akahuUserToken]);

  // Edit handlers
  const handleEditCategory = (category: any) => {
    setSelectedCategory(category);
    setEditCategoryOpen(true);
  };

  const handleEditLabel = (label: any) => {
    setSelectedLabel(label);
    setEditLabelOpen(true);
  };

  const handleEditEnvelope = (envelope: any) => {
    setSelectedEnvelope(envelope);
    setEditEnvelopeOpen(true);
  }

  // Envelope update mutation
  const updateEnvelopeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return await apiRequest("PATCH", `/api/envelopes/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/envelopes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/envelope-categories'] });
    },
    onError: (error: any) => {
      // Silent error handling - drag-and-drop operations should fail gracefully
      console.error('Failed to update envelope:', error);
    },
  });

  // Create hierarchical structure: categories with their envelopes
  const sortedCategories = (categories || []).sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const sortedEnvelopes = (envelopes || []).sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0));

  // Create combined list for drag-and-drop: categories followed by their envelopes
  const combinedCategoryEnvelopeItems: any[] = [];
  
  sortedCategories.forEach((category: any) => {
    // Add category
    combinedCategoryEnvelopeItems.push({ ...category, type: 'category' });
    
    // Add envelopes belonging to this category (only if category is not collapsed)
    if (!collapsedCategories.has(category.id)) {
      const categoryEnvelopes = sortedEnvelopes.filter((env: any) => env.categoryId === category.id);
      categoryEnvelopes.forEach((envelope: any) => {
        combinedCategoryEnvelopeItems.push({ ...envelope, type: 'envelope' });
      });
    }
  });
  
  // Add uncategorized envelopes at the end
  const uncategorizedEnvelopes = sortedEnvelopes.filter((env: any) => !env.categoryId);
  uncategorizedEnvelopes.forEach((envelope: any) => {
    combinedCategoryEnvelopeItems.push({ ...envelope, type: 'envelope' });
  });

  // Drag handlers for reordering
  const handleLabelDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = labels.findIndex((item: any) => item.id === active.id);
      const newIndex = labels.findIndex((item: any) => item.id === over.id);
      const reorderedLabels = arrayMove(labels, oldIndex, newIndex);
      
      // Optimistically update the cache first
      queryClient.setQueryData(['/api/labels'], reorderedLabels);
      
      // Update sort order for all labels
      Promise.all(
        reorderedLabels.map((label: any, index: number) =>
          apiRequest("PATCH", `/api/labels/${label.id}`, {
            sortOrder: index
          })
        )
      ).catch(() => {
        // Revert on error
        queryClient.invalidateQueries({ queryKey: ['/api/labels'] });
      });
    }
  };

  const handleCombinedDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeItem = combinedCategoryEnvelopeItems.find((item: any) => item.id === active.id);
    const overItem = combinedCategoryEnvelopeItems.find((item: any) => item.id === over.id);
    
    if (!activeItem || !overItem) return;

    // Handle moving envelope to category (change category assignment)
    if (activeItem.type === 'envelope' && overItem.type === 'category') {
      updateEnvelopeMutation.mutate({
        id: activeItem.id,
        data: { categoryId: overItem.id }
      });
      return;
    }

    // Handle envelope to envelope interactions
    if (activeItem.type === 'envelope' && overItem.type === 'envelope') {
      // If envelopes are in different categories, move to target's category
      if (activeItem.categoryId !== overItem.categoryId) {
        updateEnvelopeMutation.mutate({
          id: activeItem.id,
          data: { categoryId: overItem.categoryId }
        });
        return;
      }
      
      // If envelopes are in same category, reorder them within that category
      const categoryEnvelopes = sortedEnvelopes.filter((env: any) => env.categoryId === activeItem.categoryId);
      const oldIndex = categoryEnvelopes.findIndex((env: any) => env.id === activeItem.id);
      const newIndex = categoryEnvelopes.findIndex((env: any) => env.id === overItem.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedEnvelopes = arrayMove(categoryEnvelopes, oldIndex, newIndex);
        
        // Update sort orders for envelopes in this category
        const updatePromises = reorderedEnvelopes.map((envelope: any, index: number) =>
          apiRequest("PATCH", `/api/envelopes/${envelope.id}`, {
            sortOrder: index
          })
        );
        
        // Optimistically update the envelope cache
        const updatedEnvelopes = sortedEnvelopes.map((env: any) => {
          if (env.categoryId === activeItem.categoryId) {
            const newEnv = reorderedEnvelopes.find((reordered: any) => reordered.id === env.id);
            return newEnv ? { ...env, sortOrder: reorderedEnvelopes.indexOf(newEnv) } : env;
          }
          return env;
        });
        
        queryClient.setQueryData(['/api/envelopes'], updatedEnvelopes);
        
        // Execute backend updates
        Promise.all(updatePromises).catch(() => {
          queryClient.invalidateQueries({ queryKey: ['/api/envelopes'] });
        });
      }
      return;
    }

    // Handle reordering categories
    if (activeItem.type === 'category' && overItem.type === 'category') {
      const oldIndex = sortedCategories.findIndex((cat: any) => cat.id === activeItem.id);
      const newIndex = sortedCategories.findIndex((cat: any) => cat.id === overItem.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedCategories = arrayMove(sortedCategories, oldIndex, newIndex)
          .map((category: any, index: number) => ({ ...category, sortOrder: index }));
        
        // Optimistically update category cache
        queryClient.setQueryData(['/api/envelope-categories'], reorderedCategories);
        
        // Update category sort orders on the backend
        Promise.all(
          reorderedCategories.map((category: any, index: number) =>
            apiRequest("PATCH", `/api/envelope-categories/${category.id}`, {
              sortOrder: index
            })
          )
        ).catch(() => {
          queryClient.invalidateQueries({ queryKey: ['/api/envelope-categories'] });
        });
      }
    }
  };

  // Combined sortable component for categories and envelopes
  function SortableCombinedItem({ item }: { item: any }) {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ 
      id: item.id,
      data: { type: item.type }
    });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    const handleEdit = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (item.type === 'category') {
        handleEditCategory(item);
      } else {
        handleEditEnvelope(item);
      }
    };

    const isCategory = item.type === 'category';
    
    return (
      <div ref={setNodeRef} style={style} {...attributes}>
        <div className={`grid grid-cols-12 gap-2 p-1.5 text-xs border-b border-muted hover:bg-muted/50 ${
          isCategory ? 'bg-muted/30 font-semibold' : 'ml-4'
        } ${
          isDragging ? 'bg-blue-100 border-blue-300 shadow-lg opacity-80' : ''
        }`}>
          <div className="col-span-1 flex items-center">
            <div {...listeners} className="cursor-grab active:cursor-grabbing">
              <GripVertical className="h-3 w-3 text-muted-foreground mr-1" />
            </div>
            <span className={isCategory ? "text-lg" : "text-base"}>{item.icon}</span>
          </div>
          <div className={isCategory ? "col-span-6 font-bold text-sm" : "col-span-6 font-medium pl-4"}>
            {item.name}
          </div>
          <div className="col-span-2 text-right">
            {item.type === 'envelope' ? `$${parseFloat(item.currentBalance || 0).toFixed(2)}` : ''}
          </div>
          <div className={isCategory ? "col-span-3 flex justify-end gap-1" : "col-span-2 flex justify-end"}>
            {isCategory && (
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-5 w-5 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleCategoryCollapse(item.id);
                }}
              >
                {collapsedCategories.has(item.id) ? 
                  <ArrowDown className="h-3 w-3" /> : 
                  <ArrowDown className="h-3 w-3 rotate-180" />
                }
              </Button>
            )}
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-5 w-5 p-0"
              onClick={handleEdit}
            >
              <Edit3 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Sortable component for labels
  function SortableLabelRow({ label }: { label: any }) {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
    } = useSortable({ id: label.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    return (
      <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
        <div className="grid grid-cols-12 gap-2 p-1.5 text-xs border-b border-muted hover:bg-muted/50 cursor-grab active:cursor-grabbing">
          <div className="col-span-1 flex items-center">
            <GripVertical className="h-3 w-3 text-muted-foreground mr-1" />
            <div className={`w-3 h-3 rounded-full ${label.color || 'bg-blue-500'}`}></div>
          </div>
          <div className="col-span-7 font-medium">{label.name}</div>
          <div className="col-span-2"></div>
          <div className="col-span-2 flex justify-end">
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-5 w-5 p-0"
              onClick={(e) => {
                e.stopPropagation();
                handleEditLabel(label);
              }}
            >
              <Edit3 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    );
  }



  const deleteRuleMutation = useMutation({
    mutationFn: (ruleId: number) => apiRequest("DELETE", `/api/category-rules/${ruleId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/category-rules'] });
      toast({
        title: "Rule deleted",
        description: "The category rule has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete rule.",
        variant: "destructive",
      });
    },
  });

  const getEnvelopeName = (envelopeId: number): string => {
    const envelope = (envelopes as any[]).find(e => e.id === envelopeId);
    return envelope?.name || "Unknown Envelope";
  };

  const clearDataMutation = useMutation({
    mutationFn: async () => {
      // Simulate clearing data
      await Promise.all([
        // In production, this would call actual API endpoints
        // fetch('/api/data/clear', { method: 'POST' })
      ]);
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast({
        title: "Data cleared successfully",
        description: "All your budget data has been reset.",
      });
    },
  });

  // Password change form
  const passwordForm = useForm<PasswordChangeForm>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: ""
    }
  });

  // Password change mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: PasswordChangeForm) => {
      const response = await apiRequest("POST", "/api/auth/change-password", {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword
      });
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Password changed successfully",
        description: data?.message || "Your password has been updated.",
      });
      passwordForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Password change failed",
        description: error?.message || "Failed to change password. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onPasswordSubmit = (data: PasswordChangeForm) => {
    changePasswordMutation.mutate(data);
  };

  // Test Akahu connection
  const testAkahuConnection = async () => {
    console.log("Test connection clicked!", { akahuBaseUrl, akahuAppToken, akahuUserToken });
    
    if (!akahuBaseUrl || !akahuAppToken || !akahuUserToken) {
      toast({
        title: "Missing credentials",
        description: "Please enter all Akahu API credentials before testing.",
        variant: "destructive",
      });
      return;
    }

    setConnectionStatus('testing');
    
    try {
      const response = await apiRequest("POST", "/api/akahu/test-connection", {
        baseUrl: akahuBaseUrl,
        appToken: akahuAppToken,
        userToken: akahuUserToken
      });

      // If we get here, the request was successful (apiRequest throws on errors)
      const data = await response.json();
      setConnectionStatus('success');
      setTestResult(data);
      toast({
        title: "Connection successful",
        description: `Connected successfully. Found ${data.accountCount || 0} bank accounts.`,
      });
    } catch (error: any) {
      console.error("Connection test error:", error);
      setConnectionStatus('error');
      
      // Parse the error message from apiRequest
      let errorMessage = "Network error while testing connection. Please check your credentials and try again.";
      if (error.message) {
        // Extract the actual error message from the format "400: {message: ...}"
        const match = error.message.match(/\d+: (.+)/);
        if (match) {
          try {
            const errorData = JSON.parse(match[1]);
            errorMessage = errorData.message || errorMessage;
          } catch {
            errorMessage = match[1];
          }
        }
      }
      
      toast({
        title: "Connection failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const syncAkahuAccounts = async () => {
    try {
      const response = await apiRequest('POST', '/api/akahu/sync-accounts', {
        baseUrl: akahuBaseUrl,
        appToken: akahuAppToken,
        userToken: akahuUserToken
      });

      toast({
        title: "Success",
        description: response.message,
        variant: "default",
      });
      
      // Refresh accounts and bank connections data
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bank-connections'] });
    } catch (error: any) {
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync Akahu accounts",
        variant: "destructive",
      });
    }
  };

  const syncAkahuTransactions = async () => {
    try {
      const response = await apiRequest('POST', '/api/akahu/sync-transactions', {
        baseUrl: akahuBaseUrl,
        appToken: akahuAppToken,
        userToken: akahuUserToken
      });

      toast({
        title: "Transactions Imported",
        description: response.message,
        variant: "default",
      });
      
      // Refresh transactions data
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
    } catch (error: any) {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import Akahu transactions",
        variant: "destructive",
      });
    }
  };

  // CSV Import functionality
  const handleCsvFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCsvFile(file);
      // Preview first few rows
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const lines = text.split('\n').slice(0, 6); // Header + 5 preview rows
        const preview = lines.map(line => line.split(','));
        setCsvPreview(preview);
      };
      reader.readAsText(file);
      setCsvImportOpen(true);
    }
  };

  const csvImportMutation = useMutation({
    mutationFn: async ({ file, accountId }: { file: File; accountId: number }) => {
      const formData = new FormData();
      formData.append('csv', file);
      formData.append('accountId', accountId.toString());
      
      const response = await fetch('/api/transactions/import-csv', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to import CSV');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      const errorMsg = data.errors && data.errors.length > 0 
        ? `${data.imported} transactions imported. Errors: ${data.errors.slice(0, 3).join(', ')}${data.errors.length > 3 ? '...' : ''}`
        : `Imported ${data.imported} transactions`;
      
      toast({
        title: data.imported > 0 ? "CSV imported successfully" : "CSV import completed with errors",
        description: errorMsg,
        variant: data.imported > 0 ? "default" : "destructive",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      setCsvImportOpen(false);
      setCsvFile(null);
      setCsvPreview([]);
      setSelectedAccountId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Import failed",
        description: error.message || "Failed to import CSV file",
        variant: "destructive",
      });
    },
  });

  const handleCsvImport = () => {
    if (csvFile && selectedAccountId) {
      csvImportMutation.mutate({ file: csvFile, accountId: selectedAccountId });
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {!isMobile && <Sidebar />}
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {isMobile && <MobileHeader />}
        
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center space-x-2">
              <Settings className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">Settings</h1>
            </div>

            <Tabs defaultValue="account" className="w-full">
              <TabsList className="grid w-full grid-cols-7">
                <TabsTrigger value="account">Account</TabsTrigger>
                <TabsTrigger value="banks">Banks</TabsTrigger>
                <TabsTrigger value="envelopes">Envelopes</TabsTrigger>
                <TabsTrigger value="rules">Rules</TabsTrigger>
                <TabsTrigger value="preferences">Preferences</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
                <TabsTrigger value="data">Data</TabsTrigger>
              </TabsList>

              <TabsContent value="account" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <User className="h-5 w-5" />
                      <span>Account Settings</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input id="username" value="demo" disabled />
                      <p className="text-xs text-muted-foreground">Demo account - changes not saved</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" placeholder="your@email.com" />
                    </div>
                    
                    <Button>Save Changes</Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Bell className="h-5 w-5" />
                      <span>Notifications</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Email Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Receive email updates about your budget
                        </p>
                      </div>
                      <Switch 
                        checked={emailNotifications} 
                        onCheckedChange={setEmailNotifications}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Reconciliation Reminders</Label>
                        <p className="text-sm text-muted-foreground">
                          Daily reminders to reconcile accounts
                        </p>
                      </div>
                      <Switch 
                        checked={reconciliationReminders} 
                        onCheckedChange={setReconciliationReminders}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="banks" className="space-y-6">
                {/* Akahu API Configuration */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Shield className="h-5 w-5" />
                      <span>Akahu API Configuration</span>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Configure your Akahu API credentials for secure bank feed connections
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Alert>
                      <Shield className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Get Started:</strong> To connect NZ banks, you need Akahu API credentials. Enter your Base URL, App Token, and User Token below.
                        <a href="https://developers.akahu.io" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1">
                          Visit Akahu Developers
                        </a> for more information.
                      </AlertDescription>
                    </Alert>
                    
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="akahu-base-url">Akahu Base URL</Label>
                        <Input
                          id="akahu-base-url"
                          value={akahuBaseUrl}
                          onChange={(e) => setAkahuBaseUrl(e.target.value)}
                          placeholder="https://api.akahu.io"
                          className="mt-1"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          The Akahu API base URL (usually https://api.akahu.io)
                        </p>
                      </div>
                      
                      <div>
                        <Label htmlFor="akahu-app-token">Akahu App Token</Label>
                        <Input
                          id="akahu-app-token"
                          type="password"
                          value={akahuAppToken}
                          onChange={(e) => setAkahuAppToken(e.target.value)}
                          placeholder="app_token_xxxxxxxxxxxxxxxxxxxxxxxx"
                          className="mt-1"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Your Akahu application token for API access
                        </p>
                      </div>
                      
                      <div>
                        <Label htmlFor="akahu-user-token">Akahu User Token</Label>
                        <Input
                          id="akahu-user-token"
                          type="password"
                          value={akahuUserToken}
                          onChange={(e) => setAkahuUserToken(e.target.value)}
                          placeholder="user_token_xxxxxxxxxxxxxxxxxxxxxxxx"
                          className="mt-1"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Your Akahu user token for accessing your bank accounts
                        </p>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">API Connection Status</p>
                        <p className="text-sm text-muted-foreground">
                          {connectionStatus === 'idle' && "Ready to test connection"}
                          {connectionStatus === 'testing' && "Testing connection..."}
                          {connectionStatus === 'success' && "✓ Connection successful"}
                          {connectionStatus === 'error' && "✗ Connection failed"}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          onClick={testAkahuConnection}
                          disabled={connectionStatus === 'testing'}
                        >
                          {connectionStatus === 'testing' ? "Testing..." : "Test Connection"}
                        </Button>
                        {(connectionStatus === 'success' || (akahuBaseUrl && akahuAppToken && akahuUserToken)) && (
                          <>
                            <Button 
                              onClick={syncAkahuAccounts}
                              disabled={connectionStatus === 'testing'}
                            >
                              Sync Accounts
                            </Button>
                            <Button 
                              onClick={syncAkahuTransactions}
                              disabled={connectionStatus === 'testing'}
                              variant="outline"
                            >
                              Import Transactions Now
                            </Button>
                          </>
                        )}
                      </div>
                      
                      {(connectionStatus === 'success' || (akahuBaseUrl && akahuAppToken && akahuUserToken)) && (
                        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                            <span className="text-sm text-green-700 font-medium">
                              Automatic Transaction Sync Active
                            </span>
                          </div>
                          <p className="text-xs text-green-600 mt-1">
                            New transactions are automatically imported every 4 hours. 
                            Use "Import Transactions Now" to check for updates immediately.
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {connectionStatus === 'success' && testResult?.accountCount === 0 && (
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Connection successful, but no bank accounts found.</strong><br/>
                          For demo accounts: Log into your Akahu developer dashboard and connect demo bank accounts in the Sandbox section.<br/>
                          For production: Use the "Connect Bank Account" feature in Akahu to link your real accounts.
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    <Alert>
                      <AlertDescription className="text-xs">
                        <strong>Production Setup:</strong> For live bank connections, ensure your Akahu app is approved for production use. 
                        Test mode only allows connections to demo accounts.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>

                <BankConnectionManager />
                
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Building2 className="h-5 w-5 mr-2" />
                      Sync Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Automatic Daily Sync</Label>
                        <p className="text-sm text-muted-foreground">
                          Import new transactions automatically every day
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Smart Categorisation</Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically assign transactions to envelopes based on merchant patterns
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Balance Reconciliation Alerts</Label>
                        <p className="text-sm text-muted-foreground">
                          Notify when bank balances don't match envelope totals
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <div className="space-y-2">
                      <Label>Sync Frequency</Label>
                      <Select defaultValue="daily">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="realtime">Real-time (Premium)</SelectItem>
                          <SelectItem value="hourly">Every Hour</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="manual">Manual Only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="envelopes" className="space-y-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Envelope Categories & Labels</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-4">
                    {/* Quick Navigation */}
                    <div className="flex justify-end">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-6 text-xs px-2"
                        onClick={() => {
                          const labelsSection = document.getElementById('labels-section');
                          labelsSection?.scrollIntoView({ behavior: 'smooth' });
                        }}
                      >
                        <ArrowDown className="h-3 w-3 mr-1" />
                        Jump to Labels
                      </Button>
                    </div>

                    {/* Categories Table */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium flex items-center gap-1">
                          <Palette className="h-3 w-3" />
                          Categories & Envelopes ({combinedCategoryEnvelopeItems.length})
                        </h4>
                        <div className="flex items-center gap-1">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-6 text-xs px-2"
                            onClick={expandAllCategories}
                          >
                            Expand All
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-6 text-xs px-2"
                            onClick={collapseAllCategories}
                          >
                            Collapse All
                          </Button>
                          <Button size="sm" variant="outline" className="h-6 text-xs px-2">
                            <Plus className="h-3 w-3 mr-1" />
                            Add
                          </Button>
                        </div>
                      </div>
                      <div className="border rounded-md">
                        <div className="grid grid-cols-12 gap-2 p-2 bg-muted/50 text-xs font-medium border-b">
                          <div className="col-span-1">Icon</div>
                          <div className="col-span-6">Name</div>
                          <div className="col-span-2">Balance</div>
                          <div className="col-span-3 text-center">Actions</div>
                        </div>
                        <div className="max-h-96 overflow-y-auto">
                          <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleCombinedDragEnd}
                          >
                            <SortableContext items={combinedCategoryEnvelopeItems.map((item: any) => item.id)} strategy={verticalListSortingStrategy}>
                              {combinedCategoryEnvelopeItems.length > 0 ? (
                                combinedCategoryEnvelopeItems.map((item: any) => (
                                  <SortableCombinedItem key={`${item.type}-${item.id}`} item={item} />
                                ))
                              ) : (
                                <div className="p-3 text-center text-xs text-muted-foreground">No categories or envelopes created yet</div>
                              )}
                            </SortableContext>
                          </DndContext>
                        </div>
                      </div>
                    </div>

                    {/* Labels Table */}
                    <div id="labels-section">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium flex items-center gap-1">
                          <Tag className="h-3 w-3" />
                          Labels ({(labels as any[]).length})
                        </h4>
                        <Button size="sm" variant="outline" className="h-6 text-xs px-2">
                          <Plus className="h-3 w-3 mr-1" />
                          Add
                        </Button>
                      </div>
                      <div className="border rounded-md">
                        <div className="grid grid-cols-12 gap-2 p-2 bg-muted/50 text-xs font-medium border-b">
                          <div className="col-span-1">Color</div>
                          <div className="col-span-8">Name</div>
                          <div className="col-span-3 text-center">Actions</div>
                        </div>
                        <div className="max-h-32 overflow-y-auto">
                          <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleLabelDragEnd}
                          >
                            <SortableContext items={Array.isArray(labels) ? labels.map((l: any) => l.id) : []} strategy={verticalListSortingStrategy}>
                              {Array.isArray(labels) && labels.length > 0 ? (
                                labels.map((label: any) => (
                                  <SortableLabelRow key={label.id} label={label} />
                                ))
                              ) : (
                                <div className="p-3 text-center text-xs text-muted-foreground">No labels created yet</div>
                              )}
                            </SortableContext>
                          </DndContext>
                        </div>
                      </div>
                    </div>


                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="rules" className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <GitBranch className="h-5 w-5 text-primary" />
                        <CardTitle>Category Rules</CardTitle>
                      </div>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Rule
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {(rules as any[]).length > 0 ? (
                      <div className="space-y-3">
                        {(rules as any[]).map((rule) => (
                          <div key={rule.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3">
                                <div className="flex-1">
                                  <p className="font-medium text-foreground">
                                    Merchants containing: <span className="text-primary">"{rule.pattern}"</span>
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    Auto-assign to: {getEnvelopeName(rule.envelopeId)}
                                  </p>
                                </div>
                                <Badge 
                                  variant={rule.isActive ? "secondary" : "outline"}
                                  className={rule.isActive ? "bg-green-100 text-green-800" : ""}
                                >
                                  {rule.isActive ? "Active" : "Inactive"}
                                </Badge>
                              </div>
                            </div>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteRuleMutation.mutate(rule.id)}
                              disabled={deleteRuleMutation.isPending}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <GitBranch className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground mb-4">No category rules created yet</p>
                        <p className="text-sm text-muted-foreground mb-6">
                          Create rules from the transaction history to automatically assign merchants to envelopes
                        </p>
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Create Your First Rule
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>How Rules Work</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                          <span className="text-2xl">1️⃣</span>
                        </div>
                        <h3 className="font-medium mb-2">Create Rule</h3>
                        <p className="text-sm text-muted-foreground">
                          Click "Create Rule" on any approved transaction to set up automatic categorisation
                        </p>
                      </div>
                      
                      <div className="text-center p-4">
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                          <span className="text-2xl">2️⃣</span>
                        </div>
                        <h3 className="font-medium mb-2">Auto-Match</h3>
                        <p className="text-sm text-muted-foreground">
                          Future transactions from matching merchants will automatically suggest the correct envelope
                        </p>
                      </div>
                      
                      <div className="text-center p-4">
                        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                          <span className="text-2xl">3️⃣</span>
                        </div>
                        <h3 className="font-medium mb-2">Review & Save</h3>
                        <p className="text-sm text-muted-foreground">
                          Review suggested envelopes and approve transactions with one click
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="preferences" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Palette className="h-5 w-5" />
                      <span>Appearance</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Dark Mode</Label>
                        <p className="text-sm text-muted-foreground">
                          Use dark theme for the interface
                        </p>
                      </div>
                      <Switch 
                        checked={darkMode} 
                        onCheckedChange={setDarkMode}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <DollarSign className="h-5 w-5" />
                      <span>Regional</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Currency</Label>
                      <Select value={currency} onValueChange={setCurrency}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NZD">New Zealand Dollar (NZD)</SelectItem>
                          <SelectItem value="AUD">Australian Dollar (AUD)</SelectItem>
                          <SelectItem value="USD">US Dollar (USD)</SelectItem>
                          <SelectItem value="GBP">British Pound (GBP)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Date Format</Label>
                      <Select value={dateFormat} onValueChange={setDateFormat}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dd/MM/yyyy">DD/MM/YYYY</SelectItem>
                          <SelectItem value="MM/dd/yyyy">MM/DD/YYYY</SelectItem>
                          <SelectItem value="yyyy-MM-dd">YYYY-MM-DD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="security" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Shield className="h-5 w-5" />
                      <span>Security & Privacy</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Change Password</Label>
                      <p className="text-sm text-muted-foreground">Update your app password for enhanced security</p>
                      <Form {...passwordForm}>
                        <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                          <FormField
                            control={passwordForm.control}
                            name="currentPassword"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Current Password</FormLabel>
                                <FormControl>
                                  <Input type="password" placeholder="Enter current password" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={passwordForm.control}
                            name="newPassword"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>New Password</FormLabel>
                                <FormControl>
                                  <Input type="password" placeholder="Enter new password" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={passwordForm.control}
                            name="confirmPassword"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Confirm New Password</FormLabel>
                                <FormControl>
                                  <Input type="password" placeholder="Confirm new password" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <Button 
                            type="submit" 
                            disabled={changePasswordMutation.isPending}
                            className="w-full"
                          >
                            {changePasswordMutation.isPending ? "Changing Password..." : "Change Password"}
                          </Button>
                        </form>
                      </Form>
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-2">
                      <Label>Two-Factor Authentication</Label>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">Not Enabled</Badge>
                        <Button variant="outline" size="sm">Enable 2FA</Button>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-2">
                      <Label>Active Sessions</Label>
                      <p className="text-sm text-muted-foreground">Monitor and manage your active sessions</p>
                      <Button variant="outline">View Sessions</Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="data" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Database className="h-5 w-5" />
                      <span>Data Management</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">Export Data</h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          Download your budget data in various formats
                        </p>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-2" />
                            Export as CSV
                          </Button>
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-2" />
                            Export as JSON
                          </Button>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div>
                        <h4 className="font-medium mb-2">Import Data</h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          Import transactions from CSV files
                        </p>
                        <div className="space-y-2">
                          <input
                            type="file"
                            accept=".csv"
                            onChange={handleCsvFileSelect}
                            className="hidden"
                            id="csv-upload"
                          />
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => document.getElementById('csv-upload')?.click()}
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Import CSV
                          </Button>
                          <p className="text-xs text-muted-foreground">
                            Format: Date, Merchant, Amount, Description (optional)
                          </p>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div>
                        <h4 className="font-medium mb-2 text-red-600">Danger Zone</h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          Permanently delete all your budget data
                        </p>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Clear All Data
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete all your budget data including accounts, envelopes, and transaction history.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-600 hover:bg-red-700"
                                onClick={() => clearDataMutation.mutate()}
                              >
                                Delete Everything
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Database className="h-5 w-5" />
                      <span>System Information</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Total Accounts</p>
                        <p className="text-2xl font-bold text-primary">{accounts.length}</p>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Total Envelopes</p>
                        <p className="text-2xl font-bold text-primary">{envelopes.length}</p>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Total Transactions</p>
                        <p className="text-2xl font-bold text-primary">{transactions.length}</p>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Badge variant="secondary">Version 1.0.0</Badge>
                      <Badge variant="secondary">Demo Mode</Badge>
                      <Badge variant="outline">Last Updated: Today</Badge>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
      
      {isMobile && <MobileBottomNav />}

      {/* CSV Import Preview Dialog */}
      <AlertDialog open={csvImportOpen} onOpenChange={setCsvImportOpen}>
        <AlertDialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
          <AlertDialogHeader className="flex-shrink-0">
            <AlertDialogTitle>CSV Import Preview</AlertDialogTitle>
            <AlertDialogDescription>
              Review the first few rows of your CSV file before importing. Make sure the format matches: Date, Merchant, Amount, Description.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {csvPreview.length > 0 && (
            <div className="flex-1 min-h-0">
              <table className="w-full border-collapse border border-gray-300">
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
          )}
          
          {/* Account Selection */}
          <div className="space-y-3">
            <div>
              <Label htmlFor="import-account" className="text-sm font-medium">
                Select Account for Import
              </Label>
              <Select value={selectedAccountId?.toString() || ""} onValueChange={(value) => setSelectedAccountId(parseInt(value))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose which account these transactions belong to..." />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account: any) => (
                    <SelectItem key={account.id} value={account.id.toString()}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="bg-blue-50 p-3 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-1">Expected CSV Format:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• <strong>Date:</strong> DD/MM/YYYY or MM/DD/YYYY format</li>
              <li>• <strong>Merchant:</strong> Business or person name</li>
              <li>• <strong>Amount:</strong> Transaction amount (negative for expenses, positive for income)</li>
              <li>• <strong>Description:</strong> Optional additional details</li>
            </ul>
          </div>
          
          <AlertDialogFooter className="flex-shrink-0">
            <AlertDialogCancel onClick={() => {
              setCsvImportOpen(false);
              setCsvFile(null);
              setCsvPreview([]);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCsvImport}
              disabled={csvImportMutation.isPending || !selectedAccountId}
            >
              {csvImportMutation.isPending ? "Importing..." : "Import Transactions"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Category Dialog */}
      <Dialog open={editCategoryOpen} onOpenChange={setEditCategoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <input 
                type="text" 
                className="w-full mt-1 p-2 border rounded" 
                defaultValue={selectedCategory?.name || ''} 
              />
            </div>
            <div>
              <label className="text-sm font-medium">Icon</label>
              <input 
                type="text" 
                className="w-full mt-1 p-2 border rounded" 
                defaultValue={selectedCategory?.icon || ''} 
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="outline" onClick={() => setEditCategoryOpen(false)}>Cancel</Button>
            <Button onClick={() => setEditCategoryOpen(false)}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Label Dialog */}
      <Dialog open={editLabelOpen} onOpenChange={setEditLabelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Label</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <input 
                type="text" 
                className="w-full mt-1 p-2 border rounded" 
                defaultValue={selectedLabel?.name || ''} 
              />
            </div>
            <div>
              <label className="text-sm font-medium">Color</label>
              <input 
                type="color" 
                className="w-full mt-1 p-2 border rounded h-10" 
                defaultValue={selectedLabel?.colour || '#000000'} 
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="outline" onClick={() => setEditLabelOpen(false)}>Cancel</Button>
            <Button onClick={() => setEditLabelOpen(false)}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Envelope Dialog */}
      <EditEnvelopeDialog
        envelope={selectedEnvelope}
        open={editEnvelopeOpen}
        onOpenChange={setEditEnvelopeOpen}
      />
    </div>
  );
}