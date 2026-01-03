"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Copy, Check } from "lucide-react";
import { cn } from "@/lib/cn";

interface AddChildDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface ChildResult {
  id: string;
  name: string;
  family_access_code: string;
}

export function AddChildDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddChildDialogProps) {
  const [name, setName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [createdChild, setCreatedChild] = useState<ChildResult | null>(null);
  const [copied, setCopied] = useState(false);

  const resetForm = () => {
    setName("");
    setDateOfBirth("");
    setPin("");
    setConfirmPin("");
    setError("");
    setCreatedChild(null);
    setCopied(false);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!name.trim()) {
      setError("Please enter your child's name");
      return;
    }

    if (!/^\d{4}$/.test(pin)) {
      setError("PIN must be exactly 4 digits");
      return;
    }

    if (pin !== confirmPin) {
      setError("PINs don't match");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/kids/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          dateOfBirth: dateOfBirth || null,
          pin,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to add child");
        return;
      }

      setCreatedChild(data.data);
      onSuccess?.();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyFamilyCode = async () => {
    if (createdChild?.family_access_code) {
      await navigator.clipboard.writeText(createdChild.family_access_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {createdChild ? "🎉 Child Added!" : "Add a Child"}
          </DialogTitle>
          <DialogDescription>
            {createdChild
              ? `${createdChild.name} is all set up and ready to go!`
              : "Create a profile for your child so they can start earning and learning."}
          </DialogDescription>
        </DialogHeader>

        {createdChild ? (
          // Success view
          <div className="space-y-4 py-4">
            <div className="p-4 bg-sage-very-light rounded-lg border border-sage-light">
              <p className="text-sm text-text-medium mb-2">Family Access Code:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-2xl font-mono font-bold text-sage-dark tracking-wider">
                  {createdChild.family_access_code}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyFamilyCode}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-sage" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="text-sm text-text-medium space-y-2">
              <p>
                <strong>How {createdChild.name} can log in:</strong>
              </p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Go to the Kids login page</li>
                <li>Enter the family code above</li>
                <li>Select their avatar</li>
                <li>Enter their 4-digit PIN</li>
              </ol>
            </div>

            <DialogFooter>
              <Button onClick={handleClose} className="w-full bg-sage hover:bg-sage-dark">
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          // Form view
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-gold-light text-gold-dark rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Child's Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="e.g., Emma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dob">Date of Birth (optional)</Label>
              <Input
                id="dob"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pin">4-Digit PIN</Label>
                <Input
                  id="pin"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  placeholder="••••"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  disabled={isLoading}
                  className="text-center text-xl tracking-widest"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPin">Confirm PIN</Label>
                <Input
                  id="confirmPin"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  placeholder="••••"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                  disabled={isLoading}
                  className={cn(
                    "text-center text-xl tracking-widest",
                    confirmPin.length === 4 && pin !== confirmPin && "border-gold"
                  )}
                />
              </div>
            </div>

            <p className="text-xs text-text-light">
              This PIN will be used by your child to log in. Make sure they can remember it!
            </p>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !name.trim() || pin.length !== 4}
                className="bg-sage hover:bg-sage-dark"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Child"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
