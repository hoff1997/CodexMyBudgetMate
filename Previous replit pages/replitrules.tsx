import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMobile } from "@/hooks/use-mobile";
import Sidebar from "@/components/layout/sidebar";
import MobileHeader from "@/components/layout/mobile-header";
import MobileBottomNav from "@/components/layout/mobile-bottom-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, GitBranch } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function RulesPage() {
  const isMobile = useMobile();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: rules = [] } = useQuery({
    queryKey: ['/api/category-rules'],
  });

  const { data: envelopes = [] } = useQuery({
    queryKey: ['/api/envelopes'],
  });

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

  const getEnvelopeName = (envelopeId: number) => {
    const envelope = envelopes.find(e => e.id === envelopeId);
    return envelope ? `${envelope.icon} ${envelope.name}` : "Unknown Envelope";
  };

  return (
    <div className="min-h-screen flex bg-background">
      {!isMobile && <Sidebar />}
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {isMobile && <MobileHeader />}
        
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6 space-y-6">
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
                {rules.length > 0 ? (
                  <div className="space-y-3">
                    {rules.map((rule) => (
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
                      Click "Create Rule" on any approved transaction to set up automatic categorization
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
                    <h3 className="font-medium mb-2">Save Time</h3>
                    <p className="text-sm text-muted-foreground">
                      No more manual envelope selection for recurring merchants like grocery stores or utilities
                    </p>
                  </div>
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