"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Loader2, AlertCircle } from "lucide-react";
import { formatTimeRemaining } from "@/lib/utils/mfa-session";

interface MfaSessionPromptProps {
  open: boolean;
  onVerified: () => void;
  onCancel?: () => void;
  reason?: string;
}

/**
 * MFA Re-verification Prompt
 *
 * Displayed when the user's MFA session has expired (after 2 hours)
 * and they need to re-verify to continue accessing sensitive features.
 */
export function MfaSessionPrompt({
  open,
  onVerified,
  onCancel,
  reason = "Your session requires re-verification to continue.",
}: MfaSessionPromptProps) {
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clear state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setCode("");
      setError(null);
    }
  }, [open]);

  const handleVerify = async () => {
    if (code.length !== 6) {
      setError("Please enter a 6-digit code");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/2fa/verify-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Verification failed");
        return;
      }

      onVerified();
    } catch (err) {
      setError("Failed to verify. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && code.length === 6) {
      handleVerify();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel?.()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-sage/20">
            <ShieldCheck className="h-6 w-6 text-sage-dark" />
          </div>
          <DialogTitle className="text-center">
            Verify Your Identity
          </DialogTitle>
          <DialogDescription className="text-center">
            {reason}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="mfa-code">Authentication Code</Label>
            <Input
              id="mfa-code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => {
                // Only allow digits
                const value = e.target.value.replace(/\D/g, "");
                setCode(value);
                setError(null);
              }}
              onKeyDown={handleKeyDown}
              className="text-center text-2xl tracking-widest"
              autoFocus
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground text-center">
              Enter the 6-digit code from your authenticator app
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-3">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
                className="flex-1"
              >
                Cancel
              </Button>
            )}
            <Button
              onClick={handleVerify}
              disabled={code.length !== 6 || isLoading}
              className="flex-1 bg-sage hover:bg-sage-dark"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify"
              )}
            </Button>
          </div>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          For security, we require re-verification every 2 hours for sensitive
          operations like bank connections.
        </p>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook to check MFA session status and prompt for re-verification
 */
export function useMfaSession() {
  const [sessionStatus, setSessionStatus] = useState<{
    mfaEnabled: boolean;
    sessionValid: boolean;
    timeRemaining: number;
  } | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkSession = async () => {
    try {
      const response = await fetch("/api/2fa/verify-session");
      if (response.ok) {
        const data = await response.json();
        setSessionStatus(data);
        return data;
      }
    } catch (error) {
      console.error("Failed to check MFA session:", error);
    } finally {
      setIsLoading(false);
    }
    return null;
  };

  useEffect(() => {
    checkSession();

    // Re-check every minute to update time remaining
    const interval = setInterval(checkSession, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const requireFreshSession = async (): Promise<boolean> => {
    const status = await checkSession();

    if (!status?.mfaEnabled) {
      // MFA not enabled, no verification needed
      return true;
    }

    if (status.sessionValid) {
      // Session is still fresh
      return true;
    }

    // Session expired, show prompt
    return new Promise((resolve) => {
      setShowPrompt(true);
      // The promise resolves when user verifies or cancels
      const handleVerified = () => {
        setShowPrompt(false);
        checkSession();
        resolve(true);
      };
      const handleCancel = () => {
        setShowPrompt(false);
        resolve(false);
      };

      // Store handlers for the prompt component
      (window as unknown as Record<string, unknown>).__mfaPromptHandlers = {
        onVerified: handleVerified,
        onCancel: handleCancel,
      };
    });
  };

  return {
    sessionStatus,
    isLoading,
    showPrompt,
    setShowPrompt,
    requireFreshSession,
    checkSession,
    timeRemainingFormatted: sessionStatus?.timeRemaining
      ? formatTimeRemaining(sessionStatus.timeRemaining)
      : null,
  };
}
