import { useQuery } from "@tanstack/react-query";
import { useMobile } from "@/hooks/use-mobile";
import Sidebar from "@/components/layout/sidebar";
import MobileHeader from "@/components/layout/mobile-header";
import MobileBottomNav from "@/components/layout/mobile-bottom-nav";
import StatsCards from "@/components/stats-cards-new";
import MonitoredEnvelopesWidget from "@/components/monitored-envelopes-widget";
import ZeroBudgetStatusWidget from "@/components/zero-budget-status-widget";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const isMobile = useMobile();
  const [, setLocation] = useLocation();

  const { data: transactions = [] } = useQuery({
    queryKey: ['/api/transactions'],
  });

  const { data: pendingTransactions = [] } = useQuery({
    queryKey: ['/api/transactions/pending'],
  });

  const { data: stats } = useQuery({
    queryKey: ['/api/dashboard/stats'],
  });

  const recentTransactions = transactions.slice(0, 3);

  return (
    <div className="min-h-screen flex bg-background">
      {!isMobile && <Sidebar />}
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {isMobile && <MobileHeader />}
        
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6 space-y-4 pb-20">
            {/* Zero Budget Status - Full width */}
            <ZeroBudgetStatusWidget />
            
            {/* Stats Cards - Hidden on mobile */}
            <div className="hidden md:block">
              <StatsCards stats={stats} showReconciliation={true} />
            </div>
            
            {/* Pending Transactions Alert - Hidden on mobile */}
            {pendingTransactions.length > 0 && (
              <Card 
                className="hidden md:block border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10 cursor-pointer hover:shadow-md transition-all duration-200" 
                onClick={() => setLocation("/reconciliation-main")}
              >
                <CardContent className="py-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">Pending Transactions</span>
                      <Badge variant="outline" className="text-xs px-1 py-0">{pendingTransactions.length}</Badge>
                    </div>
                    <div className="flex items-center space-x-2 text-right">
                      <span className="text-sm font-bold text-yellow-600">
                        {pendingTransactions.length} Require Attention
                      </span>
                      <span className="text-xs text-muted-foreground">
                        • Click to review
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            <MonitoredEnvelopesWidget />
          </div>
        </main>
      </div>

      {isMobile && <MobileBottomNav />}
    </div>
  );
}
