import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useMobile } from "@/hooks/use-mobile";
import Sidebar from "@/components/layout/sidebar";
import MobileHeader from "@/components/layout/mobile-header";
import MobileBottomNav from "@/components/layout/mobile-bottom-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { 
  Target, 
  TrendingDown, 
  Clock, 
  DollarSign, 
  Zap, 
  CheckCircle, 
  AlertTriangle,
  PiggyBank,
  CreditCard,
  Calendar,
  Calculator,
  ArrowRight
} from "lucide-react";
import DebtFreedomDashboard from "@/components/debt-freedom-dashboard";
import DebtPayoffCalculator from "@/components/debt-payoff-calculator";
import type { Liability, Envelope } from "@shared/schema";

export default function DebtManagement() {
  const isMobile = useMobile();

  const { data: liabilities = [] } = useQuery<Liability[]>({
    queryKey: ['/api/liabilities'],
  });

  const { data: envelopes = [] } = useQuery<Envelope[]>({
    queryKey: ['/api/envelopes'],
  });

  // Calculate debt metrics
  const totalDebt = liabilities.reduce((sum, liability) => sum + parseFloat(liability.currentBalance), 0);
  const highestInterestDebt = liabilities.reduce((highest, current) => 
    parseFloat(current.interestRate || '0') > parseFloat(highest.interestRate || '0') ? current : highest
  , liabilities[0]);
  
  const totalMinimumPayments = liabilities.reduce((sum, liability) => 
    sum + parseFloat(liability.minimumPayment || '0'), 0
  );

  // Find debt-related envelopes
  const debtEnvelopes = envelopes.filter(env => 
    env.name.toLowerCase().includes('debt') || 
    env.name.toLowerCase().includes('payment') ||
    env.name.toLowerCase().includes('loan') ||
    env.name.toLowerCase().includes('credit')
  );

  const totalDebtBudget = debtEnvelopes.reduce((sum, env) => 
    sum + parseFloat(env.budgetedAmount || '0'), 0
  );

  const extraPaymentCapacity = Math.max(0, totalDebtBudget - totalMinimumPayments);

  // Debt freedom milestones
  const getMilestones = () => [
    {
      id: 'emergency_fund',
      title: 'Build $1,000 Emergency Fund',
      description: 'Start with a small emergency fund to avoid adding new debt',
      completed: false, // Would check savings balance
      priority: 1,
      icon: <PiggyBank className="h-4 w-4" />
    },
    {
      id: 'list_debts',
      title: 'List All Debts',
      description: 'Document every debt with balances, rates, and minimum payments',
      completed: liabilities.length > 0,
      priority: 2,
      icon: <CreditCard className="h-4 w-4" />
    },
    {
      id: 'choose_strategy',
      title: 'Choose Payoff Strategy',
      description: 'Select debt snowball or avalanche method',
      completed: false,
      priority: 3,
      icon: <Calculator className="h-4 w-4" />
    },
    {
      id: 'automate_payments',
      title: 'Automate Minimum Payments',
      description: 'Set up automatic payments to avoid late fees',
      completed: false,
      priority: 4,
      icon: <Calendar className="h-4 w-4" />
    },
    {
      id: 'extra_payments',
      title: 'Start Extra Payments',
      description: 'Apply any surplus budget to debt payoff',
      completed: extraPaymentCapacity > 0,
      priority: 5,
      icon: <Zap className="h-4 w-4" />
    }
  ];

  const milestones = getMilestones();
  const completedMilestones = milestones.filter(m => m.completed).length;
  const progressPercentage = (completedMilestones / milestones.length) * 100;

  // Quick actions for debt management
  const getQuickActions = () => [
    {
      title: 'Add Missing Debts',
      description: 'Ensure all debts are tracked in your net worth',
      href: '/net-worth',
      urgent: liabilities.length === 0
    },
    {
      title: 'Create Debt Payment Envelopes',
      description: 'Set up budget envelopes for each debt payment',
      href: '/envelopes-new',
      urgent: debtEnvelopes.length === 0
    },
    {
      title: 'Review Budget for Extra Payments',
      description: 'Find areas to cut spending and accelerate debt payoff',
      href: '/envelopes-new?tab=zero-budget',
      urgent: extraPaymentCapacity < (totalDebt * 0.02) // Less than 2% extra monthly
    },
    {
      title: 'Track Transactions',
      description: 'Monitor spending to avoid adding new debt',
      href: '/transactions',
      urgent: false
    }
  ];

  const quickActions = getQuickActions();
  const urgentActions = quickActions.filter(action => action.urgent);

  if (totalDebt === 0) {
    return (
      <div className="min-h-screen flex bg-background">
        {!isMobile && <Sidebar />}
        
        <div className="flex-1 flex flex-col h-screen md:ml-64">
          {isMobile && <MobileHeader />}
          
          <main className="flex-1 overflow-y-auto h-full">
            <div className="p-4 lg:p-6 space-y-6 min-h-full">
              <div>
                <h1 className="text-2xl font-bold mb-2">Debt Management</h1>
                <p className="text-muted-foreground">Your path to financial freedom</p>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-green-600">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Debt Freedom Achieved!
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Alert className="border-green-500 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      Congratulations! You have no outstanding debts. Focus on building wealth through savings and investments.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <Button className="flex items-center justify-center">
                      <PiggyBank className="h-4 w-4 mr-2" />
                      Build Emergency Fund
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                    <Button variant="outline" className="flex items-center justify-center">
                      <TrendingDown className="h-4 w-4 mr-2" />
                      Start Investing
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
          
          {isMobile && <MobileBottomNav />}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      {!isMobile && <Sidebar />}
      
      <div className="flex-1 flex flex-col h-screen md:ml-64">
        {isMobile && <MobileHeader />}
        
        <main className="flex-1 overflow-y-auto h-full">
          <div className="p-4 lg:p-6 space-y-6 min-h-full">
            <div>
              <h1 className="text-2xl font-bold mb-2">Debt Management</h1>
              <p className="text-muted-foreground">Your path to financial freedom</p>
            </div>

            {/* Debt Overview */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Debt</CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">${totalDebt.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">{liabilities.length} debts tracked</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Minimum Payments</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${totalMinimumPayments.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">Required monthly</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Extra Payment Power</CardTitle>
                  <Zap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">${extraPaymentCapacity.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">Available for acceleration</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Highest Rate</CardTitle>
                  <TrendingDown className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    {highestInterestDebt ? `${highestInterestDebt.interestRate}%` : 'N/A'}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {highestInterestDebt?.name || 'No debts'}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Urgent Actions */}
            {urgentActions.length > 0 && (
              <Alert className="border-orange-500 bg-orange-50">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  <strong>Action Required:</strong> You have {urgentActions.length} urgent debt management tasks.
                  <div className="mt-2 space-y-1">
                    {urgentActions.map((action, index) => (
                      <Button 
                        key={index}
                        variant="outline" 
                        size="sm" 
                        className="mr-2 mb-1"
                        onClick={() => window.location.href = action.href}
                      >
                        {action.title}
                      </Button>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Debt Freedom Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="h-5 w-5 mr-2" />
                  Debt Freedom Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Milestones Completed</span>
                  <span className="text-sm text-muted-foreground">
                    {completedMilestones} of {milestones.length}
                  </span>
                </div>
                <Progress value={progressPercentage} className="h-3" />
                
                <div className="grid gap-3 mt-4">
                  {milestones.map((milestone) => (
                    <div 
                      key={milestone.id}
                      className={`flex items-center space-x-3 p-3 rounded-lg border ${
                        milestone.completed 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className={`p-2 rounded-full ${
                        milestone.completed 
                          ? 'bg-green-100 text-green-600' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {milestone.completed ? <CheckCircle className="h-4 w-4" /> : milestone.icon}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{milestone.title}</h4>
                        <p className="text-sm text-muted-foreground">{milestone.description}</p>
                      </div>
                      <Badge variant={milestone.completed ? "default" : "secondary"}>
                        Step {milestone.priority}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Debt Payoff Calculator */}
            <DebtPayoffCalculator liabilities={liabilities} />

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2">
                  {quickActions.map((action, index) => (
                    <div 
                      key={index}
                      className={`p-4 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                        action.urgent ? 'border-orange-300 bg-orange-50' : ''
                      }`}
                      onClick={() => window.location.href = action.href}
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{action.title}</h4>
                        {action.urgent && <Badge variant="destructive">Urgent</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{action.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>

        {isMobile && <MobileBottomNav />}
      </div>
    </div>
  );
}