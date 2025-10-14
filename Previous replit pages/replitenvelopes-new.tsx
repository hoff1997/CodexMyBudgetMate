import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMobile } from "@/hooks/use-mobile";
import { format } from "date-fns";
import Sidebar from "@/components/layout/sidebar";
import MobileHeader from "@/components/layout/mobile-header";
import MobileBottomNav from "@/components/layout/mobile-bottom-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, TrendingUp, TrendingDown, Minus, ArrowRightLeft, ChevronDown, ChevronRight, Edit, Trash2, FolderPlus, GripVertical, Settings, Minimize2, Maximize2, PlusCircle, FileSpreadsheet, ExternalLink, List, Target, FolderOpen, AlertTriangle } from "lucide-react";
import EnvelopeTransferDialog from "@/components/envelope-transfer-dialog";
import HelpTooltip from "@/components/help-tooltip";
import EditEnvelopeDialog from "@/components/edit-envelope-dialog";

import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Envelope, EnvelopeCategory } from "@shared/schema";

// Helper function to get budgeted amount by frequency
function getBudgetedAmountByFrequency(envelope: Envelope) {
  const annual = parseFloat(envelope.budgetedAmount);
  if (!envelope.budgetFrequency || envelope.budgetFrequency === 'none' || annual === 0) {
    return null;
  }
  
  let amount = 0;
  let period = '';
  
  switch (envelope.budgetFrequency) {
    case 'weekly':
      amount = annual / 52;
      period = 'per week';
      break;
    case 'fortnightly':
      amount = annual / 26;
      period = 'per fortnight';
      break;
    case 'monthly':
      amount = annual / 12;
      period = 'per month';
      break;
    case 'quarterly':
      amount = annual / 4;
      period = 'per quarter';
      break;
    case 'annually':
      amount = annual;
      period = 'per year';
      break;
    default:
      return null;
  }
  
  return `$${amount.toFixed(2)} ${period}`;
}

// Sortable category header component
function SortableCategoryHeader({ category, envelopes, isCollapsed, onToggle, onEdit }: {
  category: any;
  envelopes: any[];
  isCollapsed: boolean;
  onToggle: () => void;
  onEdit: (category: any) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `category-${category.id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const totalBudget = envelopes.reduce((sum, env) => sum + parseFloat(env.budgetedAmount || '0'), 0);
  const totalBalance = envelopes.reduce((sum, env) => sum + parseFloat(env.currentBalance || '0'), 0);

  return (
    <CardHeader 
      ref={setNodeRef}
      style={style}
      className={`py-2 px-3 cursor-pointer hover:bg-muted/50 transition-colors border-b group ${
        isDragging ? 'shadow-lg bg-muted' : ''
      }`}
      onClick={onToggle}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div
            {...attributes}
            {...listeners}
            className="flex items-center justify-center w-4 h-4 text-muted-foreground hover:text-foreground cursor-grab"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-3 w-3" />
          </div>
          <div className="text-sm">{category.icon}</div>
          <CardTitle className="text-sm font-medium">{category.name}</CardTitle>
          <Badge variant="secondary" className="text-xs px-1.5 py-0">
            {envelopes.length}
          </Badge>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-muted-foreground">
            ${totalBudget.toFixed(0)} • ${totalBalance.toFixed(0)}
          </span>
          {/* Hide cog icon on mobile */}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(category);
            }}
            className="hidden md:block h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Settings className="h-3 w-3" />
          </Button>
          {/* Enhanced dropdown arrow for mobile responsiveness */}
          <div 
            className="p-2 -m-2 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
          >
            <ChevronDown className={`h-4 w-4 md:h-3 md:w-3 transition-transform ${isCollapsed ? '' : 'rotate-180'}`} />
          </div>
        </div>
      </div>
    </CardHeader>
  );
}

// Sortable envelope item component
function SortableEnvelopeItem({ envelope, onEdit, onDelete, canDeleteEnvelope }: { 
  envelope: Envelope; 
  onEdit: (envelope: Envelope) => void;
  onDelete: (envelope: Envelope) => void;
  canDeleteEnvelope: (envelope: Envelope) => boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: envelope.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getEnvelopeStatus = (envelope: Envelope) => {
    const budget = parseFloat(envelope.budgetedAmount);
    const balance = parseFloat(envelope.currentBalance);
    const spent = budget - balance;
    
    if (balance < 0) return "overspent";
    if (spent < budget * 0.8) return "good";
    if (spent < budget) return "warning";
    return "spent";
  };

  const getProgressValue = (envelope: Envelope) => {
    if (envelope.isSpendingAccount) {
      // For spending accounts, show opening balance vs current balance
      const current = parseFloat(envelope.currentBalance);
      const opening = parseFloat(envelope.openingBalance || "0");
      if (opening === 0) return 0;
      return Math.min((current / opening) * 100, 100);
    }
    
    // For bill envelopes, show budget accuracy
    const balance = parseFloat(envelope.currentBalance);
    const budget = parseFloat(envelope.budgetedAmount);
    if (budget === 0) return 0;
    return Math.min((balance / budget) * 100, 100);
  };

  const budget = parseFloat(envelope.budgetedAmount);
  const balance = parseFloat(envelope.currentBalance);
  const spent = budget - balance;
  const status = getEnvelopeStatus(envelope);
  const progress = getProgressValue(envelope);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group"
    >
      <div className="bg-card border-b hover:bg-muted/20 transition-colors">
        {/* Desktop Layout - Single Line */}
        <div className="hidden md:flex md:items-center px-2 py-1.5">
          <div
            {...attributes}
            {...listeners}
            className="flex items-center justify-center w-4 h-4 text-muted-foreground hover:text-foreground cursor-grab mr-2"
          >
            <GripVertical className="h-3 w-3" />
          </div>
          
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <div className="text-sm flex-shrink-0">{envelope.icon}</div>
            <div className="flex-1 min-w-0 mr-2">
              <h3 className="font-medium text-sm truncate">{envelope.name}</h3>
              <div className="text-xs text-muted-foreground mt-0.5 space-y-0.5">
                {envelope.nextPaymentDue && envelope.budgetFrequency && envelope.budgetFrequency !== 'none' && (
                  <div>Next Due: {format(new Date(envelope.nextPaymentDue), 'dd/MM/yyyy')}</div>
                )}
                {getBudgetedAmountByFrequency(envelope) && (
                  <div>{getBudgetedAmountByFrequency(envelope)}</div>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-3 text-xs flex-shrink-0">
              <span className="w-16 text-right">${budget.toFixed(0)}</span>
              <span className={`w-16 text-right ${balance < 0 ? 'text-red-600 font-medium' : ''}`}>
                ${balance.toFixed(0)}
              </span>
              <span className={`w-12 text-right ${
                status === "overspent" ? 'text-red-600' : 'text-green-600'
              }`}>
                {budget > 0 ? `${progress.toFixed(0)}%` : '-'}
              </span>
            </div>
          </div>
          
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1 ml-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.href = `/transactions?envelope=${encodeURIComponent(envelope.name)}`}
              className="h-5 w-5 p-0"
              title="View transactions"
            >
              <List className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(envelope)}
              className="h-5 w-5 p-0"
              title="Edit envelope"
            >
              <Edit className="h-3 w-3" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0"
                  title="Delete envelope"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Delete Envelope
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {canDeleteEnvelope(envelope) ? (
                      <>
                        Are you sure you want to delete the envelope "<strong>{envelope.name}</strong>"? 
                        This action cannot be undone.
                      </>
                    ) : (
                      <>
                        Cannot delete envelope "<strong>{envelope.name}</strong>" because it has a balance of <strong>${parseFloat(envelope.currentBalance).toFixed(2)}</strong>.
                        <br /><br />
                        You must transfer all funds to another envelope first to bring the balance to zero before deletion.
                      </>
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  {canDeleteEnvelope(envelope) && (
                    <AlertDialogAction
                      onClick={() => onDelete(envelope)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete Envelope
                    </AlertDialogAction>
                  )}
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Mobile Layout - Two Lines */}
        <div className="md:hidden px-2 py-1">
          {/* Line 1: Drag Handle, Icon, Name, Action Buttons */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              <div
                {...attributes}
                {...listeners}
                className="flex items-center justify-center w-3 h-3 text-muted-foreground hover:text-foreground cursor-grab"
              >
                <GripVertical className="h-2 w-2" />
              </div>
              <div className="text-sm flex-shrink-0">{envelope.icon}</div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm truncate">{envelope.name}</h3>
                <div className="text-xs text-muted-foreground mt-0.5 space-y-0.5">
                  {envelope.nextPaymentDue && envelope.budgetFrequency && envelope.budgetFrequency !== 'none' && (
                    <div>Next Due: {format(new Date(envelope.nextPaymentDue), 'dd/MM/yyyy')}</div>
                  )}
                  {getBudgetedAmountByFrequency(envelope) && (
                    <div>{getBudgetedAmountByFrequency(envelope)}</div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Action Buttons - Hard Right */}
            <div className="flex space-x-1 ml-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.href = `/transactions?envelope=${encodeURIComponent(envelope.name)}`}
                className="h-8 w-8 p-0 md:h-5 md:w-5"
                title="View transactions"
              >
                <List className="h-4 w-4 md:h-2 md:w-2" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(envelope)}
                className="h-8 w-8 p-0 md:h-5 md:w-5"
                title="Edit envelope"
              >
                <Edit className="h-4 w-4 md:h-2 md:w-2" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 md:h-5 md:w-5"
                    title="Delete envelope"
                  >
                    <Trash2 className="h-4 w-4 md:h-2 md:w-2" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      Delete Envelope
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {canDeleteEnvelope(envelope) ? (
                        <>
                          Are you sure you want to delete the envelope "<strong>{envelope.name}</strong>"? 
                          This action cannot be undone.
                        </>
                      ) : (
                        <>
                          Cannot delete envelope "<strong>{envelope.name}</strong>" because it has a balance of <strong>${parseFloat(envelope.currentBalance).toFixed(2)}</strong>.
                          <br /><br />
                          You must transfer all funds to another envelope first to bring the balance to zero before deletion.
                        </>
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    {canDeleteEnvelope(envelope) && (
                      <AlertDialogAction
                        onClick={() => onDelete(envelope)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete Envelope
                      </AlertDialogAction>
                    )}
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
          
          {/* Line 2: Progress and Balance */}
          <div className="flex items-center justify-between ml-5">
            <div className="text-xs">
              <span className={`font-medium ${
                status === "overspent" ? 'text-red-600' : 'text-green-600'
              }`}>
                {budget > 0 ? `${progress.toFixed(0)}%` : '-'}
              </span>
            </div>
            
            {/* Balance - Hard Right */}
            <div className="text-right">
              <div className={`text-base font-bold ${balance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                ${balance.toFixed(0)}
              </div>
            </div>
          </div>
        </div>
        
        {budget > 0 && (
          <div className="px-8 pb-1">
            <div className="w-full bg-muted rounded-full h-0.5">
              <div 
                className={`h-0.5 rounded-full transition-all ${
                  status === "overspent" ? 'bg-red-500' : 
                  status === "warning" ? 'bg-yellow-500' : 
                  'bg-green-500'
                }`}
                style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
              />
            </div>
          </div>
        )}
      </div>


    </div>
  );
}

export default function EnvelopesNew() {
  const isMobile = useMobile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Check for tab parameter in URL



  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [showEditEnvelope, setShowEditEnvelope] = useState(false);
  const [selectedEnvelope, setSelectedEnvelope] = useState<Envelope | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState("📁");
  const [collapsedCategories, setCollapsedCategories] = useState<Set<number>>(new Set());
  const [allCategoriesCollapsed, setAllCategoriesCollapsed] = useState(false);

  const toggleAllCategories = () => {
    if (allCategoriesCollapsed) {
      // Expand all
      setCollapsedCategories(new Set());
      setAllCategoriesCollapsed(false);
    } else {
      // Collapse all
      const allCategoryIds = new Set(categories.map(cat => cat.id));
      setCollapsedCategories(allCategoryIds);
      setAllCategoriesCollapsed(true);
    }
  };
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showNewEnvelope, setShowNewEnvelope] = useState(false);
  const [newEnvelopeName, setNewEnvelopeName] = useState("");
  const [newEnvelopeIcon, setNewEnvelopeIcon] = useState("💰");
  const [newEnvelopeBudget, setNewEnvelopeBudget] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    if (active.id !== over.id) {
      // Handle category reordering
      if (active.id.toString().startsWith('category-') && over.id.toString().startsWith('category-')) {
        const activeId = parseInt(active.id.toString().replace('category-', ''));
        const overId = parseInt(over.id.toString().replace('category-', ''));
        
        const activeIndex = categories.findIndex(cat => cat.id === activeId);
        const overIndex = categories.findIndex(cat => cat.id === overId);
        
        if (activeIndex !== -1 && overIndex !== -1) {
          const newCategories = arrayMove(categories, activeIndex, overIndex);
          
          // Update sort orders
          newCategories.forEach((cat, index) => {
            cat.sortOrder = index;
          });
          
          // Categories will be updated via query invalidation
          console.log('Reordered categories:', newCategories.map(c => ({ id: c.id, name: c.name, sortOrder: c.sortOrder })));
        }
      }
      // Handle envelope reordering within same category
      else if (!active.id.toString().startsWith('category-') && !over.id.toString().startsWith('category-')) {
        const activeEnvelope = envelopes.find(env => env.id === active.id);
        const overEnvelope = envelopes.find(env => env.id === over.id);
        
        if (activeEnvelope && overEnvelope) {
          const activeIndex = envelopes.findIndex(env => env.id === active.id);
          const overIndex = envelopes.findIndex(env => env.id === over.id);
          
          const newEnvelopes = arrayMove(envelopes, activeIndex, overIndex);
          
          // Update sort orders
          newEnvelopes.forEach((env, index) => {
            env.sortOrder = index;
          });
          
          // Envelopes will be updated via query invalidation
          console.log('Reordered envelopes:', newEnvelopes.map(e => ({ id: e.id, name: e.name, sortOrder: e.sortOrder })));
        }
      }
    }
  };

  const { data: envelopes = [], isLoading: envelopesLoading } = useQuery<Envelope[]>({
    queryKey: ['/api/envelopes'],
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<EnvelopeCategory[]>({
    queryKey: ['/api/envelope-categories'],
  });

  console.log('Envelopes data:', envelopes?.length || 0, 'envelopes');
  console.log('Categories data:', categories?.length || 0, 'categories');

  const createCategoryMutation = useMutation({
    mutationFn: async (data: { name: string; icon: string; color: string }) => {
      return await apiRequest("POST", "/api/envelope-categories", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/envelopes'] });
      setShowNewCategory(false);
      setNewCategoryName("");
      setNewCategoryIcon("📁");
      toast({
        title: "Category created",
        description: "New envelope category has been added.",
      });
    },
  });

  const createEnvelopeMutation = useMutation({
    mutationFn: async (data: { name: string; icon: string; budgetedAmount: string; categoryId: number | null }) => {
      return await apiRequest("POST", "/api/envelopes", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/envelopes'] });
      setShowNewEnvelope(false);
      setNewEnvelopeName("");
      setNewEnvelopeIcon("💰");
      setNewEnvelopeBudget("");
      setSelectedCategoryId(null);
      toast({
        title: "Envelope created",
        description: "New envelope has been added.",
      });
    },
  });

  const updateEnvelopeCategoryMutation = useMutation({
    mutationFn: async ({ envelopeId, categoryId, sortOrder }: { envelopeId: number; categoryId: number | null; sortOrder: number }) => {
      return await apiRequest("PUT", `/api/envelopes/${envelopeId}/category`, { categoryId, sortOrder });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/envelopes'] });
    },
  });

  const deleteEnvelopeMutation = useMutation({
    mutationFn: async (envelopeId: number) => {
      return await apiRequest("DELETE", `/api/envelopes/${envelopeId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/envelopes'] });
      toast({
        title: "Envelope deleted",
        description: "The envelope has been successfully deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete envelope.",
        variant: "destructive",
      });
    },
  });



  const handleCreateCategory = () => {
    if (newCategoryName.trim()) {
      createCategoryMutation.mutate({
        name: newCategoryName.trim(),
        icon: newCategoryIcon,
        color: "#3b82f6",
      });
    }
  };

  const handleCreateEnvelope = () => {
    if (newEnvelopeName.trim()) {
      createEnvelopeMutation.mutate({
        name: newEnvelopeName.trim(),
        icon: newEnvelopeIcon,
        budgetedAmount: newEnvelopeBudget || "0",
        categoryId: selectedCategoryId,
      });
    }
  };

  const canDeleteEnvelope = (envelope: Envelope) => {
    const balance = parseFloat(envelope.currentBalance);
    return balance === 0;
  };

  const handleDeleteEnvelope = (envelope: Envelope) => {
    if (!canDeleteEnvelope(envelope)) {
      toast({
        title: "Cannot delete envelope",
        description: "Envelope must have a zero balance before deletion. Please transfer any remaining funds to another envelope first.",
        variant: "destructive",
      });
      return;
    }
    
    deleteEnvelopeMutation.mutate(envelope.id);
  };

  // Group envelopes by category
  const groupedEnvelopes = categories.reduce((acc: any, category: EnvelopeCategory) => {
    acc[category.id] = {
      category,
      envelopes: envelopes.filter((env: Envelope) => env.categoryId === category.id),
    };
    return acc;
  }, {});

  // Uncategorized envelopes
  const uncategorizedEnvelopes = envelopes.filter((env: Envelope) => !env.categoryId);

  return (
    <div className="min-h-screen flex bg-background">
      {!isMobile && <Sidebar />}
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {isMobile && <MobileHeader />}
        
        <main className="flex-1 overflow-y-auto">
          <div className="px-4 lg:px-6 pt-4 space-y-4 pb-24">
            {/* Header */}
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  <div>
                    <h1 className="text-2xl font-bold text-foreground">Envelopes</h1>
                  </div>
                  <HelpTooltip 
                    title="Managing Your Envelopes"
                    content={[
                      "Drag and drop envelopes between categories to organise them.",
                      "Create new categories to group related expenses together.",
                      "Green indicates available funds, red shows overspending that needs attention."
                    ]}
                    tips={[
                      "Use the grip handle to drag envelopes",
                      "Create categories for better organisation",
                      "Collapse categories to save space",
                      "Transfer funds between overspent envelopes"
                    ]}
                  />
                </div>
              </div>
              

            </div>

            <div className="w-full">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5 text-blue-600" />
                  <h1 className="text-2xl font-bold text-foreground">Envelope Management</h1>
                </div>
                <Button
                  onClick={() => window.location.href = '/zero-budget-setup'}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                >
                  <Target className="h-4 w-4" />
                  Budget Setup
                </Button>
              </div>
              
              <div className="space-y-6">

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <Button onClick={() => setShowNewEnvelope(true)} className="flex items-center gap-2 h-8">
                    <Plus className="h-3 w-3" />
                    New Envelope
                  </Button>
                  
                  <Button onClick={() => setShowNewCategory(true)} variant="outline" className="flex items-center gap-2 h-8">
                    <FolderPlus className="h-3 w-3" />
                    New Category
                  </Button>
                  
                  <Button onClick={() => setIsTransferOpen(true)} variant="outline" className="flex items-center gap-2 h-8">
                    <ArrowRightLeft className="h-3 w-3" />
                    Move Balances
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      // Store current tab before navigating
                      localStorage.setItem('lastEnvelopeTab', 'envelopes');
                      window.open(`/envelope-balances?from=envelopes`, '_blank');
                    }}
                    className="flex items-center gap-2 h-8"
                  >
                    <FileSpreadsheet className="h-3 w-3" />
                    Balance Report
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                  
                  <Button
                    onClick={toggleAllCategories}
                    variant="ghost"
                    className="flex items-center gap-1 h-8 px-2 text-xs text-muted-foreground"
                  >
                    {allCategoriesCollapsed ? (
                      <>
                        <Maximize2 className="h-2.5 w-2.5" />
                        Expand All
                      </>
                    ) : (
                      <>
                        <Minimize2 className="h-2.5 w-2.5" />
                        Collapse All
                      </>
                    )}
                  </Button>

                </div>

            {/* New Envelope Form */}
            {showNewEnvelope && (
              <Card>
                <CardHeader>
                  <CardTitle>Create New Envelope</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex space-x-4">
                    <Input
                      placeholder="Envelope name"
                      value={newEnvelopeName}
                      onChange={(e) => setNewEnvelopeName(e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      placeholder="💰"
                      value={newEnvelopeIcon}
                      onChange={(e) => setNewEnvelopeIcon(e.target.value)}
                      className="w-20"
                    />
                    <Input
                      placeholder="Budget amount"
                      type="number"
                      value={newEnvelopeBudget}
                      onChange={(e) => setNewEnvelopeBudget(e.target.value)}
                      className="w-32"
                    />
                    <select
                      value={selectedCategoryId || ""}
                      onChange={(e) => setSelectedCategoryId(e.target.value ? parseInt(e.target.value) : null)}
                      className="px-3 py-2 border rounded-md bg-background"
                    >
                      <option value="">No Category</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.icon} {cat.name}
                        </option>
                      ))}
                    </select>
                    <Button onClick={handleCreateEnvelope} disabled={createEnvelopeMutation.isPending}>
                      {createEnvelopeMutation.isPending ? "Creating..." : "Create"}
                    </Button>
                    <Button variant="outline" onClick={() => setShowNewEnvelope(false)}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* New Category Form */}
            {showNewCategory && (
              <Card>
                <CardHeader>
                  <CardTitle>Create New Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex space-x-4">
                    <Input
                      placeholder="Category name"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      placeholder="📁"
                      value={newCategoryIcon}
                      onChange={(e) => setNewCategoryIcon(e.target.value)}
                      className="w-20"
                    />
                    <Button onClick={handleCreateCategory} disabled={createCategoryMutation.isPending}>
                      {createCategoryMutation.isPending ? "Creating..." : "Create"}
                    </Button>
                    <Button variant="outline" onClick={() => setShowNewCategory(false)}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {envelopesLoading || categoriesLoading ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">Loading envelopes...</p>
                </CardContent>
              </Card>
            ) : envelopes.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">No envelopes found</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">


                <DndContext 
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <div className="space-y-6">
                    {/* Categorized Envelopes */}
                  <SortableContext 
                    items={categories.map(cat => `category-${cat.id}`)}
                    strategy={verticalListSortingStrategy}
                  >
                    {Object.values(groupedEnvelopes)
                      .filter((group: any) => group.envelopes.length > 0)
                      .map((group: any) => {
                        const isCollapsed = collapsedCategories.has(group.category.id);
                        return (
                          <Collapsible 
                            key={group.category.id} 
                            open={!isCollapsed}
                            onOpenChange={(open) => {
                              const newCollapsed = new Set(collapsedCategories);
                              if (open) {
                                newCollapsed.delete(group.category.id);
                              } else {
                                newCollapsed.add(group.category.id);
                              }
                              setCollapsedCategories(newCollapsed);
                            }}
                          >
                            <Card>
                              <SortableCategoryHeader
                                category={group.category}
                                envelopes={group.envelopes}
                                isCollapsed={isCollapsed}
                                onToggle={() => {
                                  const newCollapsed = new Set(collapsedCategories);
                                  if (isCollapsed) {
                                    newCollapsed.delete(group.category.id);
                                  } else {
                                    newCollapsed.add(group.category.id);
                                  }
                                  setCollapsedCategories(newCollapsed);
                                }}
                                onEdit={(category) => {
                                  console.log('Edit category:', category);
                                  toast({
                                    title: "Category Edit",
                                    description: `Editing ${category.name} - feature coming soon!`,
                                  });
                                }}
                              />
                        <CollapsibleContent>
                          <CardContent className="p-0">
                            <SortableContext 
                              items={group.envelopes.map((env: any) => env.id)}
                              strategy={verticalListSortingStrategy}
                            >
                              <div className="space-y-0 border rounded-lg overflow-hidden">
                                {group.envelopes.map((envelope: any) => (
                                  <SortableEnvelopeItem
                                    key={envelope.id}
                                    envelope={envelope}
                                    onEdit={(env) => {
                                      setSelectedEnvelope(env);
                                      setShowEditEnvelope(true);
                                    }}
                                    onDelete={handleDeleteEnvelope}
                                    canDeleteEnvelope={canDeleteEnvelope}
                                  />
                                ))}
                              </div>
                            </SortableContext>
                          </CardContent>
                        </CollapsibleContent>
                            </Card>
                          </Collapsible>
                        );
                      })}
                  </SortableContext>

                  {/* Uncategorized Envelopes */}
                  {uncategorizedEnvelopes.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <span>📦</span>
                          <span>Uncategorized</span>
                          <Badge variant="secondary">{uncategorizedEnvelopes.length}</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <SortableContext 
                          items={uncategorizedEnvelopes.map((env: any) => env.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="space-y-0 border rounded-lg overflow-hidden">
                            {uncategorizedEnvelopes.map((envelope: any) => (
                              <SortableEnvelopeItem
                                key={envelope.id}
                                envelope={envelope}
                                onEdit={(env) => {
                                  setSelectedEnvelope(env);
                                  setShowEditEnvelope(true);
                                }}
                                onDelete={handleDeleteEnvelope}
                                canDeleteEnvelope={canDeleteEnvelope}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </CardContent>
                    </Card>
                  )}
                  </div>
                </DndContext>
              </div>
            )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {isMobile && <MobileBottomNav />}
      
      <EnvelopeTransferDialog 
        open={isTransferOpen} 
        onOpenChange={setIsTransferOpen} 
      />

      {/* Edit Envelope Dialog */}
      <EditEnvelopeDialog
        envelope={selectedEnvelope}
        open={showEditEnvelope}
        onOpenChange={(open) => {
          setShowEditEnvelope(open);
          if (!open) setSelectedEnvelope(null);
        }}
      />
    </div>
  );
}