"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface OpeningBalanceDialogProps {
  childId: string;
  childName: string;
  distribution: {
    spend_pct: number;
    save_pct: number;
    invest_pct: number;
    give_pct: number;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function OpeningBalanceDialog({
  childId,
  childName,
  distribution,
  open,
  onOpenChange,
  onSaved,
}: OpeningBalanceDialogProps) {
  const [balances, setBalances] = useState({
    spend: "",
    save: "",
    invest: "",
    give: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/kids/money/opening-balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          child_id: childId,
          balances: {
            spend: parseFloat(balances.spend) || 0,
            save: parseFloat(balances.save) || 0,
            invest: parseFloat(balances.invest) || 0,
            give: parseFloat(balances.give) || 0,
          },
        }),
      });

      if (res.ok) {
        onSaved();
        onOpenChange(false);
        // Reset form
        setBalances({ spend: "", save: "", invest: "", give: "" });
      }
    } catch (error) {
      console.error("Failed to set opening balance:", error);
    } finally {
      setLoading(false);
    }
  };

  const total = Object.values(balances).reduce(
    (sum, val) => sum + (parseFloat(val) || 0),
    0
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Set Opening Balance for {childName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-text-medium">
            Enter how much money {childName} currently has in each envelope.
          </p>

          <div className="space-y-3">
            <div>
              <Label htmlFor="spend">
                💰 Spending ({distribution.spend_pct}%)
              </Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-medium">
                  $
                </span>
                <Input
                  id="spend"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={balances.spend}
                  onChange={(e) =>
                    setBalances({ ...balances, spend: e.target.value })
                  }
                  className="pl-7"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="save">
                🏦 Saving ({distribution.save_pct}%)
              </Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-medium">
                  $
                </span>
                <Input
                  id="save"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={balances.save}
                  onChange={(e) =>
                    setBalances({ ...balances, save: e.target.value })
                  }
                  className="pl-7"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="invest">
                📈 Investing ({distribution.invest_pct}%)
              </Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-medium">
                  $
                </span>
                <Input
                  id="invest"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={balances.invest}
                  onChange={(e) =>
                    setBalances({ ...balances, invest: e.target.value })
                  }
                  className="pl-7"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="give">
                💝 Giving ({distribution.give_pct}%)
              </Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-medium">
                  $
                </span>
                <Input
                  id="give"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={balances.give}
                  onChange={(e) =>
                    setBalances({ ...balances, give: e.target.value })
                  }
                  className="pl-7"
                />
              </div>
            </div>
          </div>

          <div className="bg-sage-very-light p-4 rounded-lg">
            <div className="text-sm text-text-medium">Total Opening Balance:</div>
            <div className="text-2xl font-bold text-sage">${total.toFixed(2)}</div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-sage hover:bg-sage-dark"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Set Opening Balance"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
