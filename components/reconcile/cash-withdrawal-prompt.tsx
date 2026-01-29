"use client";

import { useState } from "react";
import { Loader2, Wallet, ArrowRight } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface CashWithdrawalPromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  description: string;
  transactionId: string;
  onAddToWallet: () => Promise<void>;
  onSkip: () => void;
}

export function CashWithdrawalPrompt({
  open,
  onOpenChange,
  amount,
  description,
  transactionId,
  onAddToWallet,
  onSkip,
}: CashWithdrawalPromptProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddToWallet = async () => {
    setIsSubmitting(true);
    try {
      await onAddToWallet();
      onOpenChange(false);
    } catch (error) {
      console.error("Error adding to wallet:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    onSkip();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[425px]">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <span className="text-xl">💵</span>
            Cash Withdrawal Detected
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                This looks like an ATM or cash withdrawal:
              </p>
              <div className="bg-silver-very-light rounded-lg p-3 space-y-1">
                <p className="font-medium text-text-dark text-lg">
                  ${amount.toFixed(2)}
                </p>
                <p className="text-sm text-text-medium truncate">
                  {description}
                </p>
              </div>
              <p>
                Would you like to add this amount to your Wallet to track your cash on hand?
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-2 mt-4">
          <Button
            onClick={handleAddToWallet}
            disabled={isSubmitting}
            className="bg-sage hover:bg-sage-dark"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Wallet className="h-4 w-4 mr-2" />
                Yes, Add ${amount.toFixed(2)} to Wallet
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={handleSkip}
            disabled={isSubmitting}
          >
            <ArrowRight className="h-4 w-4 mr-2" />
            No, Just Approve the Transaction
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
