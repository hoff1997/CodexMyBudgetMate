"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/cn";
import {
  DollarSign,
  Check,
  ArrowLeft,
  Receipt,
  Calendar,
  Loader2,
} from "lucide-react";
import Link from "next/link";

interface ChildProfile {
  id: string;
  name: string;
  avatar_url: string | null;
  star_balance: number;
  screen_time_balance: number;
}

interface ChoreEarning {
  id: string;
  name: string;
  icon: string;
  amount: number;
  approvedAt: string;
  weekStarting: string;
}

interface ChildEarnings {
  total: number;
  chores: ChoreEarning[];
}

interface InvoicesClientProps {
  childProfiles: ChildProfile[];
  earnings: Record<string, ChildEarnings>;
}

export function InvoicesClient({ childProfiles, earnings }: InvoicesClientProps) {
  const router = useRouter();
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [paying, setPaying] = useState(false);

  const totalOwed = Object.values(earnings).reduce(
    (sum, e) => sum + e.total,
    0
  );

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-NZ", {
      day: "numeric",
      month: "short",
    });
  };

  const formatWeek = (weekStarting: string) => {
    const start = new Date(weekStarting);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${formatDate(weekStarting)} - ${formatDate(end.toISOString())}`;
  };

  const selectedChildData = selectedChild
    ? childProfiles.find((c) => c.id === selectedChild)
    : null;
  const selectedEarnings = selectedChild ? earnings[selectedChild] : null;

  const handleMarkAsPaid = async () => {
    if (!selectedChild) return;

    setPaying(true);
    try {
      // In a real implementation, this would:
      // 1. Record the payment in a payments table
      // 2. Mark the chores as "paid"
      // 3. Optionally integrate with actual payment systems

      // For now, just close the dialog and refresh
      setPayDialogOpen(false);
      setSelectedChild(null);
      router.refresh();
    } catch (err) {
      console.error("Failed to record payment:", err);
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/kids/setup"
          className="p-2 hover:bg-silver-light rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-text-medium" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text-dark">Pocket Money Invoice</h1>
          <p className="text-text-medium">Track earnings from chores</p>
        </div>
      </div>

      {/* Summary Card */}
      <Card className="mb-6 border-sage bg-sage-very-light">
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-medium mb-1">Total Owed This Month</p>
              <p className="text-4xl font-bold text-sage-dark">
                ${totalOwed.toFixed(2)}
              </p>
            </div>
            <div className="h-16 w-16 rounded-full bg-sage flex items-center justify-center">
              <DollarSign className="h-8 w-8 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Children Cards */}
      <div className="space-y-4">
        {childProfiles.map((child) => {
          const childEarnings = earnings[child.id];
          const hasEarnings = childEarnings.total > 0;

          return (
            <Card key={child.id} className={!hasEarnings ? "opacity-60" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-sage-light flex items-center justify-center text-2xl">
                      {child.avatar_url ? (
                        <Image
                          src={child.avatar_url}
                          alt={child.name}
                          width={48}
                          height={48}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        "👤"
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{child.name}</CardTitle>
                      <p className="text-sm text-text-medium">
                        {childEarnings.chores.length} completed chore
                        {childEarnings.chores.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-sage-dark">
                      ${childEarnings.total.toFixed(2)}
                    </p>
                    {hasEarnings && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2"
                        onClick={() => {
                          setSelectedChild(child.id);
                          setPayDialogOpen(true);
                        }}
                      >
                        <Receipt className="h-4 w-4 mr-1" />
                        View Details
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              {hasEarnings && (
                <CardContent className="pt-0">
                  <div className="border-t border-silver-light pt-3">
                    <div className="space-y-2">
                      {childEarnings.chores.slice(0, 3).map((chore) => (
                        <div
                          key={chore.id}
                          className="flex items-center justify-between text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <span>{chore.icon}</span>
                            <span className="text-text-medium">{chore.name}</span>
                          </div>
                          <span className="font-medium text-sage-dark">
                            ${chore.amount.toFixed(2)}
                          </span>
                        </div>
                      ))}
                      {childEarnings.chores.length > 3 && (
                        <p className="text-xs text-text-light text-center pt-1">
                          +{childEarnings.chores.length - 3} more
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Payment Detail Dialog */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedChildData?.avatar_url ? (
                <Image
                  src={selectedChildData.avatar_url}
                  alt={selectedChildData.name}
                  width={32}
                  height={32}
                  className="rounded-full object-cover"
                />
              ) : (
                <span className="text-2xl">👤</span>
              )}
              {selectedChildData?.name}'s Earnings
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 max-h-[50vh] overflow-y-auto">
            {selectedEarnings?.chores.map((chore) => (
              <div
                key={chore.id}
                className="flex items-center justify-between py-2 border-b border-silver-light last:border-0"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{chore.icon}</span>
                    <div>
                      <p className="font-medium text-text-dark">{chore.name}</p>
                      <div className="flex items-center gap-1 text-xs text-text-light">
                        <Calendar className="h-3 w-3" />
                        {formatWeek(chore.weekStarting)}
                      </div>
                    </div>
                  </div>
                </div>
                <span className="font-bold text-sage-dark">
                  ${chore.amount.toFixed(2)}
                </span>
              </div>
            ))}

            <div className="flex items-center justify-between pt-4 mt-4 border-t-2 border-sage">
              <span className="font-bold text-text-dark">Total</span>
              <span className="text-2xl font-bold text-sage-dark">
                ${selectedEarnings?.total.toFixed(2)}
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialogOpen(false)}>
              Close
            </Button>
            <Button
              onClick={handleMarkAsPaid}
              disabled={paying}
              className="bg-sage hover:bg-sage-dark"
            >
              {paying ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Mark as Paid
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
