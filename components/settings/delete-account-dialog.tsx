"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import * as Dialog from "@radix-ui/react-dialog";
import {
  AlertTriangle,
  X,
  Download,
  Trash2,
  Loader2,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { clearReturningUserStatus } from "@/components/landing/returning-user-cta";

interface DeleteAccountDialogProps {
  open: boolean;
  onClose: () => void;
  userEmail: string | null;
  onExportData: () => Promise<void>;
}

type Step = "warning" | "export" | "reason" | "confirm";

const DELETION_REASONS = [
  { id: "not-using", label: "I'm not using the app anymore" },
  { id: "privacy", label: "Privacy concerns" },
  { id: "switching", label: "Switching to another app" },
  { id: "too-complex", label: "Too complicated to use" },
  { id: "missing-features", label: "Missing features I need" },
  { id: "other", label: "Other reason" },
];

export function DeleteAccountDialog({
  open,
  onClose,
  userEmail,
  onExportData,
}: DeleteAccountDialogProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("warning");
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [otherReason, setOtherReason] = useState("");
  const [confirmationText, setConfirmationText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [hasExported, setHasExported] = useState(false);
  const prevOpenRef = useRef(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setStep("warning");
      setSelectedReason("");
      setOtherReason("");
      setConfirmationText("");
      setIsDeleting(false);
      setIsExporting(false);
      setHasExported(false);
    }
    prevOpenRef.current = open;
  }, [open]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onExportData();
      setHasExported(true);
      toast.success("Data exported successfully");
    } catch {
      toast.error("Failed to export data");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDelete = async () => {
    if (confirmationText !== "DELETE MY ACCOUNT") {
      toast.error("Please type 'DELETE MY ACCOUNT' exactly to confirm");
      return;
    }

    setIsDeleting(true);

    try {
      const reason = selectedReason === "other" ? otherReason : selectedReason;

      const response = await fetch("/api/user/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmation: "DELETE MY ACCOUNT",
          reason,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete account");
      }

      toast.success("Your account has been deleted. Goodbye!");

      // Clear returning user status since account is deleted
      clearReturningUserStatus();

      // Redirect to homepage after a short delay
      setTimeout(() => {
        router.push("/");
      }, 1500);
    } catch (error) {
      console.error("Delete account error:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to delete account. Please contact support."
      );
      setIsDeleting(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case "warning":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
              <AlertTriangle className="h-8 w-8 text-red-500 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-red-800">
                  This action cannot be undone
                </h3>
                <p className="text-sm text-red-700 mt-1">
                  Deleting your account will permanently remove all your data,
                  including budgets, transactions, and settings.
                </p>
              </div>
            </div>

            <div className="space-y-2 text-sm text-[#6B6B6B]">
              <p className="font-medium text-[#3D3D3D]">
                What will be deleted:
              </p>
              <ul className="space-y-1 ml-4">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  All envelopes and budget allocations
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  Transaction history
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  Income sources and financial data
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  Meal plans and recipes
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  Bank connections (Akahu link will be removed)
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  Achievements and progress
                </li>
              </ul>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={() => setStep("export")}
                className="bg-red-600 hover:bg-red-700"
              >
                I understand, continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        );

      case "export":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <Download className="h-8 w-8 text-blue-500 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-blue-800">
                  Export your data first
                </h3>
                <p className="text-sm text-blue-700 mt-1">
                  We recommend downloading a copy of your data before deleting
                  your account. You won&apos;t be able to recover it later.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-[#F3F4F6] rounded-lg">
              <div className="flex items-center gap-2">
                {hasExported ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <Download className="h-5 w-5 text-[#6B6B6B]" />
                )}
                <span className="text-sm">
                  {hasExported
                    ? "Data exported successfully"
                    : "Export all your data as ZIP"}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={isExporting}
              >
                {isExporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : hasExported ? (
                  "Export again"
                ) : (
                  "Export data"
                )}
              </Button>
            </div>

            <div className="flex justify-between gap-3 pt-2">
              <Button variant="ghost" onClick={() => setStep("warning")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={() => setStep("reason")}
                className="bg-red-600 hover:bg-red-700"
              >
                {hasExported ? "Continue" : "Skip export"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        );

      case "reason":
        return (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-[#3D3D3D] mb-1">
                Help us improve (optional)
              </h3>
              <p className="text-sm text-[#6B6B6B]">
                Why are you leaving? Your feedback helps us make My Budget Mate
                better.
              </p>
            </div>

            <div className="space-y-2">
              {DELETION_REASONS.map((reason) => (
                <label
                  key={reason.id}
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedReason === reason.id
                      ? "border-[#7A9E9A] bg-[#E2EEEC]"
                      : "border-[#E5E7EB] hover:bg-[#F3F4F6]"
                  }`}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={reason.id}
                    checked={selectedReason === reason.id}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="accent-[#7A9E9A]"
                  />
                  <span className="text-sm text-[#3D3D3D]">{reason.label}</span>
                </label>
              ))}
            </div>

            {selectedReason === "other" && (
              <div>
                <Input
                  placeholder="Please tell us more..."
                  value={otherReason}
                  onChange={(e) => setOtherReason(e.target.value)}
                  className="text-sm"
                />
              </div>
            )}

            <div className="flex justify-between gap-3 pt-2">
              <Button variant="ghost" onClick={() => setStep("export")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={() => setStep("confirm")}
                className="bg-red-600 hover:bg-red-700"
              >
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        );

      case "confirm":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
              <Trash2 className="h-8 w-8 text-red-500 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-red-800">Final confirmation</h3>
                <p className="text-sm text-red-700 mt-1">
                  This is your last chance to cancel. After this, your account
                  and all data will be permanently deleted.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#3D3D3D]">
                Type <span className="font-mono bg-[#F3F4F6] px-1 py-0.5 rounded">DELETE MY ACCOUNT</span> to confirm:
              </label>
              <Input
                type="text"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder="DELETE MY ACCOUNT"
                className={`font-mono ${
                  confirmationText === "DELETE MY ACCOUNT"
                    ? "border-red-500 focus:border-red-500"
                    : ""
                }`}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
              />
            </div>

            {userEmail && (
              <p className="text-xs text-[#9CA3AF]">
                Deleting account for: {userEmail}
              </p>
            )}

            <div className="flex justify-between gap-3 pt-2">
              <Button variant="ghost" onClick={() => setStep("reason")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={handleDelete}
                disabled={confirmationText !== "DELETE MY ACCOUNT" || isDeleting}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete my account
                  </>
                )}
              </Button>
            </div>
          </div>
        );
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case "warning":
        return "Delete your account?";
      case "export":
        return "Export your data";
      case "reason":
        return "Before you go...";
      case "confirm":
        return "Confirm deletion";
    }
  };

  const stepNumber = {
    warning: 1,
    export: 2,
    reason: 3,
    confirm: 4,
  };

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div className="p-4 border-b border-[#E5E7EB] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Dialog.Title className="text-lg font-semibold text-[#3D3D3D]">
                {getStepTitle()}
              </Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="p-1 hover:bg-[#F3F4F6] rounded"
                disabled={isDeleting}
              >
                <X className="w-5 h-5 text-[#9CA3AF]" />
              </button>
            </Dialog.Close>
          </div>

          {/* Step indicators */}
          <div className="px-4 py-3 border-b border-[#E5E7EB] bg-[#F9FAFB]">
            <div className="flex items-center justify-between">
              {(["warning", "export", "reason", "confirm"] as Step[]).map(
                (s, index) => (
                  <div key={s} className="flex items-center">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                        stepNumber[step] >= stepNumber[s]
                          ? "bg-red-500 text-white"
                          : "bg-[#E5E7EB] text-[#9CA3AF]"
                      }`}
                    >
                      {index + 1}
                    </div>
                    {index < 3 && (
                      <div
                        className={`w-12 h-0.5 mx-1 ${
                          stepNumber[step] > stepNumber[s]
                            ? "bg-red-500"
                            : "bg-[#E5E7EB]"
                        }`}
                      />
                    )}
                  </div>
                )
              )}
            </div>
          </div>

          <div className="p-4">{renderStep()}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
