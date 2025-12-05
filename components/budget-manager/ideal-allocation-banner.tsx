"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sparkles, CheckCircle2, Info, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface IdealAllocationBannerProps {
  userId?: string;
  demoMode?: boolean;
}

interface SuggestionData {
  user_pay_cycle: string;
  total_income_per_cycle: number;
  income_sources: Array<{
    id: string;
    name: string;
    amount: number;
    pay_cycle: string;
  }>;
  suggestions: Array<{
    envelope_id: string;
    envelope_name: string;
    ideal_per_pay: number;
    income_allocations: Record<string, number>;
  }>;
}

export function IdealAllocationBanner({ userId, demoMode = false }: IdealAllocationBannerProps) {
  const queryClient = useQueryClient();
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedSuggestions, setSelectedSuggestions] = useState<SuggestionData | null>(null);

  // Fetch suggestions
  const { data: suggestions, isLoading: loadingSuggestions } = useQuery<SuggestionData>({
    queryKey: ["/api/envelope-allocations/suggest"],
    queryFn: async () => {
      const response = await fetch("/api/envelope-allocations/suggest", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch suggestions");
      }
      return response.json();
    },
    enabled: !demoMode,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Adopt all suggestions
  const adoptAllMutation = useMutation({
    mutationFn: async () => {
      if (!suggestions) throw new Error("No suggestions available");

      // Lock all envelope allocations in parallel
      const promises = suggestions.suggestions.map(async (suggestion) => {
        const response = await fetch("/api/envelope-allocations/lock", {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            envelope_id: suggestion.envelope_id,
            lock: true,
            suggested_allocations: suggestion.income_allocations,
          }),
        });
        if (!response.ok) throw new Error("Failed to lock allocations");
        return response.json();
      });

      await Promise.all(promises);
    },
    onSuccess: () => {
      // Invalidate queries once after all mutations complete
      queryClient.invalidateQueries({ queryKey: ["/api/envelope-income-allocations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/envelopes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/envelope-allocations/suggest"] });
      toast.success("All suggestions adopted successfully!");
      setShowDetailsDialog(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to adopt all suggestions");
    },
  });

  if (demoMode || loadingSuggestions || !suggestions) {
    return null;
  }

  // Check if there are any suggestions
  if (!suggestions.suggestions || suggestions.suggestions.length === 0) {
    return null;
  }

  const handleViewSuggestions = () => {
    setSelectedSuggestions(suggestions);
    setShowDetailsDialog(true);
  };

  return (
    <>
      <Alert className="border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50">
        <Sparkles className="h-5 w-5 text-purple-600" />
        <AlertTitle className="text-purple-900 font-semibold">
          Ideal Allocation Suggestions Available
        </AlertTitle>
        <AlertDescription className="text-purple-800">
          <div className="flex items-center justify-between mt-2">
            <p className="text-sm">
              We&apos;ve calculated ideal allocations for {suggestions.suggestions.length} envelopes
              based on your bills and pay cycle.
            </p>
            <div className="flex gap-2 ml-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleViewSuggestions}
                className="border-purple-300 hover:bg-purple-100"
              >
                <Info className="mr-2 h-4 w-4" />
                View Details
              </Button>
              <Button
                size="sm"
                onClick={() => adoptAllMutation.mutate()}
                disabled={adoptAllMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {adoptAllMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adopting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Adopt All
                  </>
                )}
              </Button>
            </div>
          </div>
        </AlertDescription>
      </Alert>

      {/* Suggestions Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              Ideal Allocation Suggestions
            </DialogTitle>
            <DialogDescription>
              Based on your {selectedSuggestions?.user_pay_cycle} pay cycle and total income of $
              {selectedSuggestions?.total_income_per_cycle.toFixed(2)} per cycle
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {selectedSuggestions?.suggestions.map((suggestion) => (
              <Card key={suggestion.envelope_id} className="border-purple-100">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{suggestion.envelope_name}</CardTitle>
                  <CardDescription>
                    Ideal allocation: ${suggestion.ideal_per_pay.toFixed(2)} per pay cycle
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      Distribution across income sources:
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(suggestion.income_allocations).map(([incomeId, amount]) => {
                        const income = selectedSuggestions.income_sources.find(
                          (i) => i.id === incomeId
                        );
                        return (
                          <div
                            key={incomeId}
                            className="flex items-center justify-between p-2 bg-muted rounded-md"
                          >
                            <span className="text-sm">{income?.name || incomeId}</span>
                            <span className="text-sm font-semibold">${amount.toFixed(2)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Close
            </Button>
            <Button
              onClick={() => adoptAllMutation.mutate()}
              disabled={adoptAllMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {adoptAllMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adopting...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Adopt All Suggestions
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
