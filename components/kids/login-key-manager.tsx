"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { Key, Copy, RefreshCw, Eye, EyeOff, QrCode, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface LoginKeyManagerProps {
  childId: string;
  childName: string;
  loginKey: string;
  createdAt?: string | null;
  lastUsedAt?: string | null;
  onKeyRegenerated?: (newKey: string) => void;
}

export function LoginKeyManager({
  childId,
  childName,
  loginKey,
  createdAt,
  lastUsedAt,
  onKeyRegenerated,
}: LoginKeyManagerProps) {
  const [showKey, setShowKey] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);

  const maskedKey = loginKey.replace(/[A-Z0-9]/g, "•");
  const displayKey = showKey ? loginKey : maskedKey;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(loginKey);
      toast.success("Login key copied to clipboard");
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      const response = await fetch(`/api/kids/profiles/${childId}/login-key`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to regenerate key");
      }

      const { data } = await response.json();
      toast.success(`New login key created for ${childName}`);
      onKeyRegenerated?.(data.loginKey);
      setShowRegenerateConfirm(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to regenerate key");
    } finally {
      setIsRegenerating(false);
    }
  };

  const getQRCodeUrl = () => {
    // Generate a QR code URL using a free API
    // The QR encodes the login key for easy scanning
    const encoded = encodeURIComponent(loginKey);
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encoded}`;
  };

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sage/10">
            <Key className="h-5 w-5 text-sage" />
          </div>
          <div>
            <h4 className="text-sm font-medium">Login Key</h4>
            <p className="text-xs text-muted-foreground">
              {lastUsedAt
                ? `Last used ${formatDistanceToNow(new Date(lastUsedAt), { addSuffix: true })}`
                : "Never used"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Key display */}
          <code className="rounded bg-muted px-3 py-1.5 font-mono text-sm tracking-wider">
            {displayKey}
          </code>

          {/* Show/hide toggle */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowKey(!showKey)}
                  className="h-8 w-8"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{showKey ? "Hide key" : "Show key"}</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Copy button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={copyToClipboard}
                  className="h-8 w-8"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy to clipboard</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* QR Code button */}
          <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <QrCode className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                </TooltipTrigger>
                <TooltipContent>Show QR code</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Login Key QR Code</DialogTitle>
                <DialogDescription>
                  Scan this QR code on {childName}&apos;s device to quickly enter the login key.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center gap-4 py-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getQRCodeUrl()}
                  alt="Login key QR code"
                  className="rounded-lg border"
                  width={200}
                  height={200}
                />
                <code className="rounded bg-muted px-3 py-1.5 font-mono text-lg tracking-wider">
                  {loginKey}
                </code>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowQRDialog(false)}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Regenerate button */}
          <Dialog open={showRegenerateConfirm} onOpenChange={setShowRegenerateConfirm}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                </TooltipTrigger>
                <TooltipContent>Regenerate key</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Regenerate Login Key?
                </DialogTitle>
                <DialogDescription>
                  This will create a new login key for {childName}. The old key will stop
                  working immediately.
                </DialogDescription>
              </DialogHeader>
              <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
                <p className="font-medium">Important:</p>
                <ul className="mt-2 list-inside list-disc space-y-1">
                  <li>Any saved passwords on {childName}&apos;s devices will no longer work</li>
                  <li>You&apos;ll need to update the login key on all their devices</li>
                  <li>This action cannot be undone</li>
                </ul>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowRegenerateConfirm(false)}
                  disabled={isRegenerating}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleRegenerate}
                  disabled={isRegenerating}
                >
                  {isRegenerating ? "Regenerating..." : "Regenerate Key"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Creation date info */}
      {createdAt && (
        <p className="mt-2 text-xs text-muted-foreground">
          Key created {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
        </p>
      )}
    </div>
  );
}
